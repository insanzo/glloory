<?php
// ─────────────────────────────────────────────────────────────
// GUILD GLORY - HOSTINGER PROXY BRIDGE, SESSIONS, CREDITS,
// DEVELOPER API (/api/v1/*), MODERATION & AUDIT LOG
// ─────────────────────────────────────────────────────────────

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, X-Operator, X-Token");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$aws_base = rtrim(getenv('GG_AWS_BASE') ?: "http://13.204.30.18/api", '/');
$api_key  = getenv('GG_API_KEY') ?: "gg_sec_7e346869318c140f43f442560743b19304db3488a61c1bd2903981d7ce862f3b";

// ── Database file paths ──
$data_root = getenv('DATA_DIR');
if ($data_root) {
    $users_file = rtrim($data_root, '/') . '/users.json';
} else {
    $users_file = __DIR__ . '/users.json';
    if (!file_exists($users_file)) {
        $users_file = dirname(__DIR__) . '/users.json';
    }
}
$data_dir      = dirname($users_file);
$audit_file    = $data_dir . '/activity_logs.json';
$sessions_file = $data_dir . '/sessions.json';
$attempts_file = $data_dir . '/login_attempts.json';

const SESSION_TTL            = 604800;   // 7 days
const MAX_AUDIT_ROWS         = 800;
const LOGIN_MAX_FAILS        = 8;        // per ip+username
const LOGIN_FAIL_WINDOW      = 600;      // 10 minutes
const MATCH_DURATION_SECONDS = 36000;    // 10 Hours Nonstop (36,000s)

// ── Small JSON store helpers ──
function read_json($file, $default) {
    if (!file_exists($file)) return $default;
    $raw = @file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function write_json($file, $data) {
    @file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function respond($payload, $code = 200) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function client_ip() {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (strpos($ip, ',') !== false) {
        $ip = trim(explode(',', $ip)[0]);
    }
    return $ip;
}

// ── Audit Logger ──
function log_activity($operator, $action, $details, $meta = []) {
    global $audit_file;
    $logs = read_json($audit_file, []);
    $entry = [
        "id"        => "log_" . bin2hex(random_bytes(4)),
        "timestamp" => date("Y-m-d H:i:s"),
        "operator"  => !empty($operator) ? $operator : 'System',
        "action"    => $action,
        "details"   => $details,
        "ip"        => client_ip(),
        "meta"      => $meta
    ];
    array_unshift($logs, $entry);
    if (count($logs) > MAX_AUDIT_ROWS) {
        $logs = array_slice($logs, 0, MAX_AUDIT_ROWS);
    }
    write_json($audit_file, $logs);
}

// ── Users / Roles / Credits / API Keys ──
function load_users() {
    global $users_file;
    $db = read_json($users_file, ['users' => []]);
    if (!isset($db['users']) || !is_array($db['users'])) $db['users'] = [];
    return $db;
}

function save_users($db) {
    global $users_file;
    write_json($users_file, $db);
}

function is_super_user($u) {
    if (!$u) return false;
    return ($u['role'] ?? '') === 'Super Commander'
        && (strcasecmp($u['username'], 'Rohan') === 0 || strcasecmp($u['username'], 'admin') === 0);
}

function generate_personal_api_key() {
    return "tx999_live_" . bin2hex(random_bytes(16));
}

function user_credits($u) {
    if (is_super_user($u)) return 999999;
    return max(0, intval($u['credits'] ?? 0));
}

function user_api_enabled($u) {
    if (is_super_user($u)) return true;
    return !empty($u['api_enabled']);
}

function adjust_user_credits($username, $delta) {
    $db = load_users();
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $username) === 0) {
            if (is_super_user($u)) {
                return 999999;
            }
            $cur = max(0, intval($u['credits'] ?? 0));
            $next = max(0, $cur + intval($delta));
            $db['users'][$i]['credits'] = $next;
            save_users($db);
            return $next;
        }
    }
    return 0;
}

function user_public_profile($u, $include_token = null) {
    $super = is_super_user($u);
    $profile = [
        "id"          => $u['id'] ?? '',
        "username"    => $u['username'] ?? '',
        "email"       => $u['email'] ?? '',
        "role"        => $u['role'] ?? 'Member',
        "credits"     => user_credits($u),
        "unlimited"   => $super,
        "api_enabled" => user_api_enabled($u),
        "api_key"     => user_api_enabled($u) ? ($u['api_key'] ?? '') : ''
    ];
    if ($include_token !== null) {
        $profile["token"] = $include_token;
    }
    return $profile;
}

// Returns [isBanned, reason, until(ts|0)] and auto-lifts expired temporary bans
function ban_state(&$u) {
    if (empty($u['banned'])) return [false, '', 0];
    $until = intval($u['ban_until'] ?? 0);
    if ($until > 0 && $until <= time()) {
        $u['banned'] = false;
        unset($u['ban_reason'], $u['ban_until'], $u['banned_at'], $u['banned_by']);
        return [false, '', 0];
    }
    return [true, $u['ban_reason'] ?? 'Violation of platform rules', $until];
}

function ban_message($reason, $until) {
    $msg = "This account has been banned. Reason: {$reason}.";
    $msg .= $until > 0 ? " Ban expires " . date("Y-m-d H:i", $until) . "." : " Ban is permanent.";
    return $msg;
}

// ── Internal Engine Caller (Sanitized — never exposes backend IP) ──
function call_engine($path, $method, $operator, $is_super, $body_str = null, $query_params = []) {
    global $aws_base, $api_key;
    $url = rtrim($aws_base, '/') . '/' . ltrim($path, '/');
    if (!empty($query_params)) {
        $qs = http_build_query($query_params);
        if (!empty($qs)) {
            $url .= (strpos($url, '?') === false ? '?' : '&') . $qs;
        }
    }
    $op_role = $is_super ? 'Super Commander' : 'Member';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-API-Key: " . $api_key,
        "X-Operator: " . $operator,
        "X-Operator-Role: " . $op_role,
        "Content-Type: application/json",
        "Accept: application/json"
    ]);
    if ($body_str !== null && ($method === 'POST' || $method === 'PATCH' || $method === 'PUT')) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body_str);
    }
    $response  = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        return [502, ["success" => false, "error" => "TX999 Engine node is temporarily unreachable. Please retry shortly."], null];
    }
    $decoded = json_decode($response, true);
    return [$http_code, is_array($decoded) ? $decoded : null, $response];
}

// ── Sessions ──
function issue_session($username) {
    global $sessions_file;
    $sessions = read_json($sessions_file, []);
    $now = time();
    foreach ($sessions as $t => $s) {
        if (($s['exp'] ?? 0) < $now) unset($sessions[$t]);
    }
    $token = "tok_" . bin2hex(random_bytes(24));
    $sessions[$token] = ["u" => $username, "iat" => $now, "exp" => $now + SESSION_TTL, "ip" => client_ip()];
    write_json($sessions_file, $sessions);
    return $token;
}

function revoke_sessions_for($username) {
    global $sessions_file;
    $sessions = read_json($sessions_file, []);
    foreach ($sessions as $t => $s) {
        if (strcasecmp($s['u'] ?? '', $username) === 0) unset($sessions[$t]);
    }
    write_json($sessions_file, $sessions);
}

function request_token() {
    $t = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!$t && isset($_SERVER['HTTP_AUTHORIZATION']) && stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') === 0) {
        $t = trim(substr($_SERVER['HTTP_AUTHORIZATION'], 7));
    }
    return trim($t);
}

// Resolve the authenticated user from session token or X-Operator header, and enforce bans
function require_session() {
    global $sessions_file;
    $token = request_token();
    $sessions = read_json($sessions_file, []);
    $s = ($token !== '' && isset($sessions[$token])) ? $sessions[$token] : null;
    $username = '';
    if ($s && ($s['exp'] ?? 0) >= time()) {
        $username = $s['u'] ?? '';
    }
    if ($username === '') {
        $username = trim($_SERVER['HTTP_X_OPERATOR'] ?? $_GET['operator'] ?? '');
    }
    if ($username === '') {
        respond(["success" => false, "code" => "AUTH_REQUIRED", "error" => "Session expired. Please sign in again."], 401);
    }
    $db = load_users();
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $username) === 0) {
            $changed = false;
            $wasBanned = !empty($u['banned']);
            list($banned, $reason, $until) = ban_state($db['users'][$i]);
            if ($wasBanned && !$banned) $changed = true;
            if (is_super_user($db['users'][$i]) && empty($db['users'][$i]['api_key'])) {
                $db['users'][$i]['api_key'] = generate_personal_api_key();
                $db['users'][$i]['api_enabled'] = true;
                $changed = true;
            }
            if ($changed) save_users($db);
            if ($banned) {
                respond(["success" => false, "code" => "BANNED", "banned" => true,
                         "reason" => $reason, "until" => $until, "error" => ban_message($reason, $until)], 403);
            }
            return [$db['users'][$i], $token];
        }
    }
    respond(["success" => false, "code" => "AUTH_REQUIRED", "error" => "Account no longer exists."], 401);
}

// ── Developer API Key Authentication (/api/v1/*) ──
function require_developer_api_key() {
    $provided = trim($_SERVER['HTTP_X_API_KEY'] ?? '');
    if ($provided === '' && isset($_SERVER['HTTP_AUTHORIZATION']) && stripos($_SERVER['HTTP_AUTHORIZATION'], 'Bearer ') === 0) {
        $provided = trim(substr($_SERVER['HTTP_AUTHORIZATION'], 7));
    }
    if ($provided === '' && isset($_GET['api_key'])) {
        $provided = trim($_GET['api_key']);
    }
    if ($provided === '' || strpos($provided, 'tx999_live_') !== 0) {
        respond([
            "success" => false,
            "code"    => "INVALID_API_KEY",
            "error"   => "Missing or invalid Developer API Key. Pass 'X-API-Key: tx999_live_...' or 'Authorization: Bearer tx999_live_...'."
        ], 401);
    }
    $db = load_users();
    foreach ($db['users'] as $i => $u) {
        $stored = $u['api_key'] ?? '';
        if ($stored !== '' && hash_equals($stored, $provided)) {
            list($banned, $reason, $until) = ban_state($db['users'][$i]);
            if ($banned) {
                respond(["success" => false, "code" => "BANNED", "error" => ban_message($reason, $until)], 403);
            }
            if (!user_api_enabled($db['users'][$i])) {
                respond([
                    "success" => false,
                    "code"    => "API_ACCESS_DISABLED",
                    "error"   => "Developer API access is disabled for your account. Contact Super Commander to enable API access."
                ], 403);
            }
            $db['users'][$i]['last_active'] = date("Y-m-d H:i:s");
            save_users($db);
            return $db['users'][$i];
        }
    }
    respond([
        "success" => false,
        "code"    => "INVALID_API_KEY",
        "error"   => "Unrecognized Developer API Key."
    ], 401);
}

// ── Login throttling ──
function login_throttled($key) {
    global $attempts_file;
    $a = read_json($attempts_file, []);
    $now = time();
    $recent = array_filter($a[$key] ?? [], function($t) use ($now) { return $t > $now - LOGIN_FAIL_WINDOW; });
    return count($recent) >= LOGIN_MAX_FAILS;
}

function login_fail($key) {
    global $attempts_file;
    $a = read_json($attempts_file, []);
    $now = time();
    foreach ($a as $k => $list) {
        $a[$k] = array_values(array_filter($list, function($t) use ($now) { return $t > $now - LOGIN_FAIL_WINDOW; }));
        if (!$a[$k]) unset($a[$k]);
    }
    $a[$key][] = $now;
    write_json($attempts_file, $a);
}

function login_clear($key) {
    global $attempts_file;
    $a = read_json($attempts_file, []);
    unset($a[$key]);
    write_json($attempts_file, $a);
}

// ── Endpoint resolution ──
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';
if (empty($endpoint)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $endpoint = preg_replace('#^/api/#', '', $uri);
}
$endpoint = trim(ltrim($endpoint, '/'));
$method = $_SERVER['REQUEST_METHOD'];

// ─────────────────────────────────────────────────────────────
// PUBLIC DEVELOPER REST API (/api/v1/*)
// Authenticated via X-API-Key: tx999_live_...
// Completely hides backend VPS IP and internal credentials
// ─────────────────────────────────────────────────────────────
if (strpos($endpoint, 'v1/') === 0) {
    $dev_user   = require_developer_api_key();
    $dev_op     = $dev_user['username'];
    $dev_super  = is_super_user($dev_user);
    $sub_route  = substr($endpoint, 3); // strip 'v1/'
    $raw_body   = file_get_contents('php://input');
    $json_body  = json_decode($raw_body, true) ?: [];

    // 1. GET /api/v1/account -> Account profile & credit balance
    if ($sub_route === 'account' && $method === 'GET') {
        respond([
            "success" => true,
            "data"    => [
                "username"               => $dev_op,
                "email"                  => $dev_user['email'] ?? '',
                "role"                   => $dev_user['role'] ?? 'Member',
                "credits"                => user_credits($dev_user),
                "unlimited_credits"      => $dev_super,
                "api_enabled"            => true,
                "session_duration_hours" => 10,
                "pricing_rules"          => [
                    "launch_squad_10h_credits" => 1,
                    "generate_bots_credits"    => 1
                ]
            ],
            "message" => "Developer account details retrieved."
        ]);
    }

    // 2. GET /api/v1/bots -> List operator's bot accounts
    if ($sub_route === 'bots' && $method === 'GET') {
        $q = [];
        if (!empty($_GET['clan_id'])) $q['clan_id'] = $_GET['clan_id'];
        if (!empty($_GET['status_filter'])) $q['status_filter'] = $_GET['status_filter'];
        list($code, $dec, $raw) = call_engine('accounts', 'GET', $dev_op, $dev_super, null, $q);
        respond($dec ?: ["success" => false, "error" => "Unable to fetch bots."], $code);
    }

    // 3. POST /api/v1/bots/generate -> Generate bot accounts (Requires clan_id & 1 Credit)
    if ($sub_route === 'bots/generate' && $method === 'POST') {
        $clan_id = trim(strval($json_body['clan_id'] ?? ''));
        if ($clan_id === '' || !ctype_digit($clan_id)) {
            respond([
                "success" => false,
                "code"    => "CLAN_ID_REQUIRED",
                "error"   => "A valid numeric Guild ID ('clan_id') is mandatory to generate bot accounts."
            ], 400);
        }
        $credits_now = user_credits($dev_user);
        if (!$dev_super && $credits_now < 1) {
            respond([
                "success"           => false,
                "code"              => "INSUFFICIENT_CREDITS",
                "credits_remaining" => $credits_now,
                "credits_required"  => 1,
                "error"             => "Insufficient credits. Generating bot accounts requires 1 Credit."
            ], 402);
        }
        $payload = json_encode([
            "count"       => max(1, min(20, intval($json_body['count'] ?? 4))),
            "region"      => strtoupper(trim($json_body['region'] ?? 'IND')),
            "clan_id"     => $clan_id,
            "name_prefix" => trim($json_body['name_prefix'] ?? 'TX999')
        ]);
        list($code, $dec, $raw) = call_engine('accounts/generate', 'POST', $dev_op, $dev_super, $payload);
        if ($code >= 200 && $code < 300 && !empty($dec['success'])) {
            $rem = adjust_user_credits($dev_op, -1);
            $dec['credits_deducted']  = $dev_super ? 0 : 1;
            $dec['credits_remaining'] = $rem;
            log_activity($dev_op, 'API_FORGE_ACCOUNTS', "Developer API: Forging bots for Guild {$clan_id} (-1 Credit)");
        }
        respond($dec ?: ["success" => false, "error" => "Bot generation request failed."], $code);
    }

    // 4. GET /api/v1/bots/generate/progress -> Live bot generation progress
    if ($sub_route === 'bots/generate/progress' && $method === 'GET') {
        list($code, $dec, $raw) = call_engine('accounts/generate/progress', 'GET', $dev_op, $dev_super);
        respond($dec ?: ["success" => false, "error" => "Unable to fetch generation progress."], $code);
    }

    // 5. DELETE /api/v1/bots/{uid} -> Delete a bot account
    if (preg_match('#^bots/([A-Za-z0-9_\-]+)$#', $sub_route, $m) && $method === 'DELETE') {
        $uid = $m[1];
        list($code, $dec, $raw) = call_engine('accounts/' . urlencode($uid), 'DELETE', $dev_op, $dev_super);
        if ($code >= 200 && $code < 300) {
            log_activity($dev_op, 'API_DELETE_BOT', "Developer API: Deleted bot UID {$uid}");
        }
        respond($dec ?: ["success" => false, "error" => "Unable to delete bot account."], $code);
    }

    // 6. GET /api/v1/guilds -> List active guilds & glory analytics
    if ($sub_route === 'guilds' && $method === 'GET') {
        list($code, $dec, $raw) = call_engine('clans', 'GET', $dev_op, $dev_super);
        respond($dec ?: ["success" => false, "error" => "Unable to fetch guilds."], $code);
    }

    // 7. GET /api/v1/guilds/{clan_id} -> Inspect specific guild glory summary
    if (preg_match('#^guilds/(\d+)$#', $sub_route, $m) && $method === 'GET') {
        $cid = $m[1];
        list($code, $dec, $raw) = call_engine("clans/{$cid}/summary", 'GET', $dev_op, $dev_super);
        respond($dec ?: ["success" => false, "error" => "Unable to inspect guild {$cid}."], $code);
    }

    // 8. POST /api/v1/match/start -> Start 10-Hour Nonstop Squad Matchmaking (Requires clan_id & 1 Credit/Squad)
    if ($sub_route === 'match/start' && $method === 'POST') {
        $clan_id = trim(strval($json_body['clan_id'] ?? ''));
        if ($clan_id === '' || !ctype_digit($clan_id)) {
            respond([
                "success" => false,
                "code"    => "CLAN_ID_REQUIRED",
                "error"   => "A valid numeric Guild ID ('clan_id') is required. Bots must belong to a guild to start matchmaking."
            ], 400);
        }
        $credits_now = user_credits($dev_user);
        if (!$dev_super && $credits_now < 1) {
            respond([
                "success"           => false,
                "code"              => "INSUFFICIENT_CREDITS",
                "credits_remaining" => $credits_now,
                "credits_required"  => 1,
                "error"             => "Insufficient credits. Launching a 10-Hour Nonstop Squad requires 1 Credit per squad."
            ], 402);
        }
        $payload = json_encode([
            "clan_id"              => $clan_id,
            "rounds"               => 0,
            "use_duo"              => !empty($json_body['use_duo']),
            "max_duration_seconds" => MATCH_DURATION_SECONDS
        ]);
        list($code, $dec, $raw) = call_engine('bot/start-clan', 'POST', $dev_op, $dev_super, $payload);
        if ($code >= 200 && $code < 300 && !empty($dec['success'])) {
            $sq_cnt = max(1, intval($dec['data']['squad_count'] ?? 1));
            $rem    = adjust_user_credits($dev_op, -$sq_cnt);
            $dec['credits_deducted']         = $dev_super ? 0 : $sq_cnt;
            $dec['credits_remaining']        = $rem;
            $dec['session_duration_seconds'] = MATCH_DURATION_SECONDS;
            $dec['session_duration_hours']   = 10;
            log_activity($dev_op, 'API_START_MATCH', "Developer API: Launched {$sq_cnt} squad(s) for Guild {$clan_id} (10h Nonstop, -{$sq_cnt} Credit)");
        }
        respond($dec ?: ["success" => false, "error" => "Unable to start matchmaking."], $code);
    }

    // 9. POST /api/v1/match/stop -> Stop active matchmaking
    if ($sub_route === 'match/stop' && $method === 'POST') {
        list($code, $dec, $raw) = call_engine('bot/stop', 'POST', $dev_op, $dev_super, "{}");
        if ($code >= 200 && $code < 300) {
            log_activity($dev_op, 'API_STOP_MATCH', "Developer API: Stopped active squad session");
        }
        respond($dec ?: ["success" => false, "error" => "Unable to stop matchmaking."], $code);
    }

    // 10. GET /api/v1/match/status -> Live squad telemetry & 10-Hour countdown timer
    if ($sub_route === 'match/status' && $method === 'GET') {
        list($code, $dec, $raw) = call_engine('bot/status', 'GET', $dev_op, $dev_super);
        respond($dec ?: ["success" => false, "error" => "Unable to fetch match status."], $code);
    }

    respond([
        "success" => false,
        "code"    => "ENDPOINT_NOT_FOUND",
        "error"   => "Unknown Developer API endpoint '/api/{$endpoint}' ({$method}). Refer to the API & Docs tab in your dashboard."
    ], 404);
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: REGISTER / LOGIN
// ─────────────────────────────────────────────────────────────
if ($endpoint === 'user/register' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($data['email'] ?? ''));
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(["success" => false, "error" => "Please enter a valid email address (e.g. name@gmail.com)."], 400);
    }
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        respond(["success" => false, "error" => "Username must be 3-20 characters long (letters, numbers, underscore only)."], 400);
    }
    if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        respond(["success" => false, "error" => "Password must be at least 8 characters long and contain both letters and numbers."], 400);
    }

    $db = load_users();
    foreach ($db['users'] as $u) {
        if (strcasecmp($u['username'], $username) === 0) {
            respond(["success" => false, "error" => "Username '{$username}' is already taken. Please choose another."], 409);
        }
        if (isset($u['email']) && strcasecmp($u['email'], $email) === 0) {
            respond(["success" => false, "error" => "An account with email '{$email}' already exists. Please Sign In."], 409);
        }
    }

    $new_user = [
        "id"            => "usr_" . bin2hex(random_bytes(6)),
        "email"         => $email,
        "username"      => $username,
        "password_hash" => hash('sha512', $password . "gg_salt_999"),
        "role"          => "Member",
        "credits"       => 0,
        "api_enabled"   => false,
        "api_key"       => "",
        "created_at"    => date("Y-m-d H:i:s"),
        "last_active"   => date("Y-m-d H:i:s")
    ];
    $db['users'][] = $new_user;
    save_users($db);

    log_activity($username, 'REGISTER', "New operator registered with email {$email} (0 Credits)");
    $token = issue_session($username);
    respond([
        "success" => true,
        "message" => "Account created successfully!",
        "user"    => user_public_profile($new_user, $token)
    ]);
}

if ($endpoint === 'user/login' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $identifier = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if ($identifier === '' || $password === '') {
        respond(["success" => false, "error" => "Please enter username and password."], 400);
    }

    $throttleKey = client_ip() . '|' . strtolower($identifier);
    if (login_throttled($throttleKey)) {
        respond(["success" => false, "error" => "Too many failed attempts. Try again in a few minutes."], 429);
    }

    $db = load_users();
    $hashed_salted = hash('sha512', $password . "gg_salt_999");
    $hashed_plain = hash('sha512', $password);
    $found_idx = -1;

    foreach ($db['users'] as $idx => $u) {
        $matchUser = strcasecmp($u['username'], $identifier) === 0;
        $matchEmail = isset($u['email']) && strcasecmp($u['email'], $identifier) === 0;
        if ($matchUser || $matchEmail) {
            if (hash_equals($u['password_hash'], $hashed_salted) || hash_equals($u['password_hash'], $hashed_plain)) {
                $found_idx = $idx;
                break;
            }
        }
    }

    if ($found_idx < 0) {
        login_fail($throttleKey);
        respond(["success" => false, "error" => "Invalid username or password. Check credentials and retry."], 401);
    }

    login_clear($throttleKey);
    list($banned, $reason, $until) = ban_state($db['users'][$found_idx]);
    if ($banned) {
        $found = $db['users'][$found_idx];
        save_users($db);
        log_activity($found['username'], 'LOGIN_BLOCKED', "Banned account attempted to sign in (reason: {$reason})");
        respond(["success" => false, "code" => "BANNED", "banned" => true, "reason" => $reason,
                 "until" => $until, "error" => ban_message($reason, $until)], 403);
    }

    if (is_super_user($db['users'][$found_idx]) && empty($db['users'][$found_idx]['api_key'])) {
        $db['users'][$found_idx]['api_key'] = generate_personal_api_key();
        $db['users'][$found_idx]['api_enabled'] = true;
    }
    $db['users'][$found_idx]['last_active'] = date("Y-m-d H:i:s");
    $found = $db['users'][$found_idx];
    save_users($db);

    log_activity($found['username'], 'LOGIN', "Operator authenticated successfully ({$found['role']})");
    $token = issue_session($found['username']);
    respond([
        "success" => true,
        "message" => "Sign in successful",
        "user"    => user_public_profile($found, $token)
    ]);
}

// ─────────────────────────────────────────────────────────────
// EVERYTHING BELOW REQUIRES A VALID, NON-BANNED SESSION
// ─────────────────────────────────────────────────────────────
list($current_user, $current_token) = require_session();
$current_operator = $current_user['username'];
$is_super = is_super_user($current_user);

if ($endpoint === 'user/logout' && $method === 'POST') {
    $sessions = read_json($sessions_file, []);
    unset($sessions[$current_token]);
    write_json($sessions_file, $sessions);
    log_activity($current_operator, 'LOGOUT', "Operator signed out");
    respond(["success" => true]);
}

if ($endpoint === 'user/me' && $method === 'GET') {
    respond([
        "success" => true,
        "user"    => user_public_profile($current_user)
    ]);
}

if ($endpoint === 'user/api-key/regenerate' && $method === 'POST') {
    if (!user_api_enabled($current_user)) {
        respond(["success" => false, "error" => "Developer API access is not enabled on your account."], 403);
    }
    $db = load_users();
    $new_key = generate_personal_api_key();
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $current_operator) === 0) {
            $db['users'][$i]['api_key'] = $new_key;
            $db['users'][$i]['api_enabled'] = true;
            break;
        }
    }
    save_users($db);
    log_activity($current_operator, 'API_KEY_ROTATED', "Regenerated personal Developer API key");
    respond(["success" => true, "api_key" => $new_key, "message" => "Developer API key regenerated."]);
}

// ── SUPER COMMANDER ADMIN ENDPOINTS (GATED) ──
$is_admin_route = (strpos($endpoint, 'admin/') === 0) || (strpos($endpoint, 'bot/logs') !== false);
if ($is_admin_route && !$is_super) {
    respond(["success" => false, "error" => "Access Denied: Super Commander authorization required."], 403);
}

if ($endpoint === 'admin/audit-logs' && $method === 'GET') {
    $logs = read_json($audit_file, []);
    $limit = isset($_GET['limit']) ? max(1, min(MAX_AUDIT_ROWS, intval($_GET['limit']))) : 300;
    $logs = array_slice($logs, 0, $limit);
    respond(["success" => true, "data" => $logs, "count" => count($logs)]);
}

if ($endpoint === 'admin/users' && $method === 'GET') {
    $db = load_users();
    $changed = false;
    $safe = [];
    foreach ($db['users'] as $i => $u) {
        $was = !empty($u['banned']);
        list($banned, $reason, $until) = ban_state($db['users'][$i]);
        if ($was && !$banned) $changed = true;
        if (is_super_user($db['users'][$i]) && empty($db['users'][$i]['api_key'])) {
            $db['users'][$i]['api_key'] = generate_personal_api_key();
            $db['users'][$i]['api_enabled'] = true;
            $changed = true;
        }
        $u = $db['users'][$i];
        $safe[] = [
            "id"          => $u['id'] ?? '',
            "username"    => $u['username'] ?? '',
            "email"       => $u['email'] ?? '',
            "role"        => $u['role'] ?? 'Member',
            "credits"     => user_credits($u),
            "unlimited"   => is_super_user($u),
            "api_enabled" => user_api_enabled($u),
            "api_key"     => $u['api_key'] ?? '',
            "created_at"  => $u['created_at'] ?? '',
            "last_active" => $u['last_active'] ?? ($u['created_at'] ?? ''),
            "banned"      => $banned,
            "ban_reason"  => $banned ? $reason : '',
            "ban_until"   => $banned ? $until : 0,
            "banned_at"   => $banned ? ($u['banned_at'] ?? '') : '',
            "banned_by"   => $banned ? ($u['banned_by'] ?? '') : '',
            "protected"   => is_super_user($u)
        ];
    }
    if ($changed) save_users($db);
    respond(["success" => true, "data" => $safe, "count" => count($safe)]);
}

if ($endpoint === 'admin/overview' && $method === 'GET') {
    $db = load_users();
    $logs = read_json($audit_file, []);
    $total = count($db['users']);
    $banned = 0; $new_today = 0; $active_24h = 0;
    $today = date("Y-m-d"); $since = time() - 86400;
    foreach ($db['users'] as $u) {
        if (!empty($u['banned'])) $banned++;
        if (strpos($u['created_at'] ?? '', $today) === 0) $new_today++;
        $la = strtotime($u['last_active'] ?? '');
        if ($la && $la >= $since) $active_24h++;
    }
    $actions_24h = 0; $logins_24h = 0; $blocked_24h = 0;
    foreach ($logs as $l) {
        $ts = strtotime($l['timestamp'] ?? '');
        if (!$ts || $ts < $since) continue;
        $actions_24h++;
        if (($l['action'] ?? '') === 'LOGIN') $logins_24h++;
        if (($l['action'] ?? '') === 'LOGIN_BLOCKED') $blocked_24h++;
    }
    respond(["success" => true, "data" => [
        "total_users" => $total, "banned_users" => $banned, "new_today" => $new_today,
        "active_24h" => $active_24h, "actions_24h" => $actions_24h,
        "logins_24h" => $logins_24h, "blocked_24h" => $blocked_24h
    ]]);
}

if ($endpoint === 'admin/credits' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $target = trim($data['username'] ?? '');
    $action = strtolower(trim($data['action'] ?? 'add')); // 'add' | 'set' | 'deduct'
    $amount = intval($data['amount'] ?? 0);

    if ($target === '') respond(["success" => false, "error" => "Username is required."], 400);
    if ($amount < 0) respond(["success" => false, "error" => "Credit amount must be 0 or greater."], 400);

    $db = load_users();
    $idx = -1;
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $target) === 0) { $idx = $i; break; }
    }
    if ($idx < 0) respond(["success" => false, "error" => "Operator not found."], 404);

    $name = $db['users'][$idx]['username'];
    $prev = max(0, intval($db['users'][$idx]['credits'] ?? 0));
    if ($action === 'set') {
        $next = max(0, $amount);
    } elseif ($action === 'deduct') {
        $next = max(0, $prev - $amount);
    } else {
        $next = max(0, $prev + $amount);
    }
    $db['users'][$idx]['credits'] = $next;
    save_users($db);

    log_activity($current_operator, 'ADMIN_CREDITS', "Updated credits for {$name}: {$prev} -> {$next} ({$action} {$amount})",
                 ["target" => $name, "previous" => $prev, "credits" => $next, "action" => $action]);
    respond([
        "success"  => true,
        "username" => $name,
        "credits"  => $next,
        "message"  => "Credits for {$name} updated to {$next}."
    ]);
}

if ($endpoint === 'admin/api-access' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $target     = trim($data['username'] ?? '');
    $enabled    = !empty($data['enabled']);
    $regenerate = !empty($data['regenerate']);

    if ($target === '') respond(["success" => false, "error" => "Username is required."], 400);

    $db = load_users();
    $idx = -1;
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $target) === 0) { $idx = $i; break; }
    }
    if ($idx < 0) respond(["success" => false, "error" => "Operator not found."], 404);

    $name = $db['users'][$idx]['username'];
    $db['users'][$idx]['api_enabled'] = $enabled;
    if (($enabled && empty($db['users'][$idx]['api_key'])) || $regenerate) {
        $db['users'][$idx]['api_key'] = generate_personal_api_key();
    }
    $key_now = $db['users'][$idx]['api_key'] ?? '';
    save_users($db);

    $state_lbl = $enabled ? ($regenerate ? "regenerated API key" : "granted Developer API access") : "revoked Developer API access";
    log_activity($current_operator, 'ADMIN_API_ACCESS', "Super Commander {$state_lbl} for {$name}",
                 ["target" => $name, "api_enabled" => $enabled]);
    respond([
        "success"     => true,
        "username"    => $name,
        "api_enabled" => $enabled,
        "api_key"     => $key_now,
        "message"     => "Developer API access " . ($enabled ? "enabled" : "disabled") . " for {$name}."
    ]);
}

if ($endpoint === 'admin/ban' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $target = trim($data['username'] ?? '');
    $reason = trim($data['reason'] ?? '');
    $hours  = max(0, intval($data['duration_hours'] ?? 0));   // 0 = permanent

    if ($target === '') respond(["success" => false, "error" => "Username is required."], 400);
    if (strlen($reason) < 3) respond(["success" => false, "error" => "A ban reason (min 3 characters) is required."], 400);
    if (strlen($reason) > 200) $reason = substr($reason, 0, 200);
    if (strcasecmp($target, $current_operator) === 0) respond(["success" => false, "error" => "You cannot ban yourself."], 400);

    $db = load_users();
    $idx = -1;
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $target) === 0) { $idx = $i; break; }
    }
    if ($idx < 0) respond(["success" => false, "error" => "User not found."], 404);
    if (is_super_user($db['users'][$idx]) || ($db['users'][$idx]['role'] ?? '') === 'Super Commander') {
        respond(["success" => false, "error" => "Super Commander accounts are protected and cannot be banned."], 403);
    }

    $until = $hours > 0 ? time() + $hours * 3600 : 0;
    $name = $db['users'][$idx]['username'];
    $db['users'][$idx]['banned'] = true;
    $db['users'][$idx]['ban_reason'] = $reason;
    $db['users'][$idx]['ban_until'] = $until;
    $db['users'][$idx]['banned_at'] = date("Y-m-d H:i:s");
    $db['users'][$idx]['banned_by'] = $current_operator;
    save_users($db);
    revoke_sessions_for($name);

    $dur = $hours > 0 ? ($hours >= 24 ? round($hours / 24) . " day(s)" : "{$hours} hour(s)") : "permanent";
    log_activity($current_operator, 'BAN_USER', "Banned {$name} ({$dur}) - Reason: {$reason}",
                 ["target" => $name, "reason" => $reason, "until" => $until]);
    respond(["success" => true, "message" => "{$name} has been banned ({$dur})."]);
}

if ($endpoint === 'admin/unban' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $target = trim($data['username'] ?? '');
    $db = load_users();
    $idx = -1;
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $target) === 0) { $idx = $i; break; }
    }
    if ($idx < 0) respond(["success" => false, "error" => "User not found."], 404);

    $name = $db['users'][$idx]['username'];
    $db['users'][$idx]['banned'] = false;
    unset($db['users'][$idx]['ban_reason'], $db['users'][$idx]['ban_until'],
          $db['users'][$idx]['banned_at'], $db['users'][$idx]['banned_by']);
    save_users($db);
    log_activity($current_operator, 'UNBAN_USER', "Lifted ban on {$name}", ["target" => $name]);
    respond(["success" => true, "message" => "{$name} has been unbanned."]);
}

if ($endpoint === 'admin/delete-user' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $target = trim($data['username'] ?? '');
    if ($target === '') respond(["success" => false, "error" => "Target username is required."], 400);

    $db = load_users();
    $idx = -1;
    foreach ($db['users'] as $i => $u) {
        if (strcasecmp($u['username'], $target) === 0) { $idx = $i; break; }
    }
    if ($idx < 0) respond(["success" => false, "error" => "Operator '{$target}' not found."], 404);

    $target_user = $db['users'][$idx];
    if (is_super_user($target_user)) {
        respond(["success" => false, "error" => "Cannot delete Super Commander account."], 403);
    }
    if (strcasecmp($target_user['username'], $current_operator) === 0) {
        respond(["success" => false, "error" => "You cannot delete your own active account."], 403);
    }

    $name = $target_user['username'];
    array_splice($db['users'], $idx, 1);
    save_users($db);
    revoke_sessions_for($name);
    log_activity($current_operator, 'DELETE_USER', "Permanently deleted operator '{$name}'", ["target" => $name]);
    respond(["success" => true, "message" => "Operator '{$name}' has been permanently deleted."]);
}

// ── ENFORCE MANDATORY GUILD ID & CREDITS BEFORE PROXYING ──
$body = file_get_contents('php://input');
$credits_cost_Action = null;

if ($method === 'POST') {
    // 1. Bot Account Generation: Requires valid numeric clan_id + 1 Credit
    if ($endpoint === 'accounts/generate') {
        $bdata = json_decode($body, true) ?: [];
        $cid   = trim(strval($bdata['clan_id'] ?? ''));
        if ($cid === '' || !ctype_digit($cid)) {
            respond([
                "success" => false,
                "code"    => "CLAN_ID_REQUIRED",
                "error"   => "Guild ID (Clan ID) is mandatory! Every bot must be created inside a Guild."
            ], 400);
        }
        $cur_credits = user_credits($current_user);
        if (!$is_super && $cur_credits < 1) {
            respond([
                "success"           => false,
                "code"              => "INSUFFICIENT_CREDITS",
                "credits_remaining" => $cur_credits,
                "error"             => "Insufficient Credits (0 available). Generating bot IDs requires 1 Credit. Visit the Pricing & Credits tab."
            ], 402);
        }
        $credits_cost_Action = 'generate_bots';
    }

    // 2. Start Matchmaking: Requires valid numeric clan_id + 1 Credit per Squad + 10 Hours Nonstop (36,000s)
    if ($endpoint === 'bot/start-clan' || $endpoint === 'bot/start-all') {
        $bdata = json_decode($body, true) ?: [];
        $cid   = trim(strval($bdata['clan_id'] ?? ''));
        if ($cid === '' || !ctype_digit($cid)) {
            respond([
                "success" => false,
                "code"    => "CLAN_ID_REQUIRED",
                "error"   => "Guild ID is mandatory! Bots must belong to an Active Guild to start matchmaking."
            ], 400);
        }
        $cur_credits = user_credits($current_user);
        if (!$is_super && $cur_credits < 1) {
            respond([
                "success"           => false,
                "code"              => "INSUFFICIENT_CREDITS",
                "credits_remaining" => $cur_credits,
                "error"             => "Insufficient Credits ({$cur_credits} available). Launching a 10-Hour Nonstop Squad requires 1 Credit per squad."
            ], 402);
        }
        // Force 10-Hour Nonstop session (rounds = 0 continuous, max_duration_seconds = 36000)
        $bdata['clan_id']              = $cid;
        $bdata['rounds']               = 0;
        $bdata['max_duration_seconds'] = MATCH_DURATION_SECONDS;
        $body                          = json_encode($bdata);
        $endpoint                      = 'bot/start-clan';
        $credits_cost_Action           = 'start_match';
    }
}

// ── PROXY TO ENGINE ──
$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
$params = [];
if (!empty($query)) {
    parse_str($query, $params);
    unset($params['endpoint']);
}

list($http_code, $decoded, $raw_response) = call_engine($endpoint, $method, $current_operator, $is_super, $body, $params);

// Deduct credits & record audit logs after successful engine execution
if ($method === 'POST') {
    if ($credits_cost_Action === 'start_match' && $http_code >= 200 && $http_code < 300 && !empty($decoded['success'])) {
        $bdata  = json_decode($body, true) ?: [];
        $cid    = $bdata['clan_id'] ?? 'Unknown';
        $duo    = !empty($bdata['use_duo']) ? 'DUO (2P)' : 'SQUAD (4P)';
        $sq_cnt = max(1, intval($decoded['data']['squad_count'] ?? 1));
        $rem    = adjust_user_credits($current_operator, -$sq_cnt);
        $decoded['credits_deducted']         = $is_super ? 0 : $sq_cnt;
        $decoded['credits_remaining']        = $rem;
        $decoded['session_duration_seconds'] = MATCH_DURATION_SECONDS;
        log_activity($current_operator, 'START_MATCH_CLAN', "Launched {$sq_cnt} {$duo} squad(s) for Guild: {$cid} (10 Hours Nonstop · -{$sq_cnt} Credit)");
        respond($decoded, $http_code);
    } elseif ($credits_cost_Action === 'generate_bots' && $http_code >= 200 && $http_code < 300 && !empty($decoded['success'])) {
        $bdata = json_decode($body, true) ?: [];
        $cnt   = $bdata['count'] ?? 4;
        $reg   = $bdata['region'] ?? 'IND';
        $cid   = $bdata['clan_id'] ?? '';
        $rem   = adjust_user_credits($current_operator, -1);
        $decoded['credits_deducted']  = $is_super ? 0 : 1;
        $decoded['credits_remaining'] = $rem;
        log_activity($current_operator, 'FORGE_ACCOUNTS', "Dispatched creation of {$cnt} bots in {$reg} (Guild: {$cid} · -1 Credit)");
        respond($decoded, $http_code);
    } elseif (strpos($endpoint, 'bot/stop') !== false && $http_code >= 200 && $http_code < 300) {
        log_activity($current_operator, 'STOP_MATCH', "Issued match session cancellation");
    }
} elseif ($method === 'DELETE') {
    if (strpos($endpoint, 'accounts/') !== false && $http_code >= 200 && $http_code < 300) {
        $del_uid = basename($endpoint);
        log_activity($current_operator, 'DELETE_BOT', "Purged bot UID {$del_uid} from matrix");
    }
}

if (is_array($decoded)) {
    respond($decoded, $http_code);
}
http_response_code($http_code);
echo $raw_response;

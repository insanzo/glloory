<?php
$path = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// block data/config files
if (preg_match('#\.(json|md|log)$#i', $path) || stripos($path, 'Dockerfile') !== false || stripos($path, 'router.php') !== false) {
    http_response_code(403);
    exit('Forbidden');
}

// /api and /api/* -> api.php
if ($path === '/api' || strpos($path, '/api/') === 0) {
    $_GET['endpoint'] = ltrim(substr($path, 5), '/');
    $_SERVER['SCRIPT_NAME'] = '/api.php';
    require __DIR__ . '/api.php';
    return true;
}

// real files (css, js, index.php) are served as-is
if ($path !== '/' && is_file(__DIR__ . $path)) {
    return false;
}

require __DIR__ . '/index.php';
return true;

<?php
// ─────────────────────────────────────────────────────────────
// TX999GLORY — SECURE OPERATIONS STATION
// Server-Side Rendered shell · sidebar console · skeleton loaders
// Credits · 10-Hour Nonstop Squads · Developer API (/api/v1/*)
// ─────────────────────────────────────────────────────────────

header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

// Tiny inline icon set (feather-style, 24x24 stroke icons)
function icon($name, $size = 16) {
    static $paths = [
        'grid'     => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
        'shield'   => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'users'    => '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        'play'     => '<polygon points="6 3 20 12 6 21 6 3"/>',
        'bot'      => '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/>',
        'sliders'  => '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
        'star'     => '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        'terminal' => '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
        'refresh'  => '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
        'stop'     => '<rect x="5" y="5" width="14" height="14" rx="2"/>',
        'plus'     => '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        'trash'    => '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        'search'   => '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
        'logout'   => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
        'menu'     => '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
        'save'     => '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
        'file'     => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
        'user'     => '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'ban'      => '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
        'pause'    => '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
        'alert'    => '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'zap'      => '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        'code'     => '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
        'key'      => '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
        'clock'    => '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        'copy'     => '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        'check'    => '<polyline points="20 6 9 17 4 12"/>',
    ];
    $p = $paths[$name] ?? '';
    return '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' . $p . '</svg>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TX999 GLORY — Operations Station</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css?v=<?php echo time(); ?>">
  <style>
    /* Global anti-selection (inputs & code blocks stay selectable) */
    *, body, html { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }
    input, textarea, pre, code { -webkit-user-select: text !important; user-select: text !important; }
    .dash-only { display: none; }
    body.in-dashboard .dash-only { display: flex; }
    .engine-pill { display: inline-flex; }
  </style>
</head>
<body oncontextmenu="return false;" ondragstart="return false;" onselectstart="return false;">

  <div id="toast-container"></div>

  <!-- ═══════════════ TOP BAR ═══════════════ -->
  <header class="app-header">
    <div class="header-container">
      <div class="header-left">
        <button class="menu-toggle" onclick="toggleSidebar()" aria-label="Toggle navigation"><?= icon('menu', 16) ?></button>
        <div class="brand" onclick="navigateTo('landing')">
          <svg class="brand-glyph-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <div class="brand-text-block">
            <div class="brand-title">TX999 GLORY</div>
            <div class="brand-subtitle">Guild Glory Suite</div>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <!-- Landing: auth + pricing buttons -->
        <div id="auth-buttons-container" style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn-header-login" onclick="scrollToLandingPricing()">Pricing</button>
          <button class="btn-header-login" onclick="openAuthModal('login')">Login</button>
          <button class="btn-header-signup" onclick="openAuthModal('register')">Sign Up</button>
        </div>

        <!-- Landing: operator box -->
        <div id="operator-profile-box" style="display: none; align-items: center; gap: 0.6rem;">
          <button class="btn-header-login" onclick="scrollToLandingPricing()">Pricing</button>
          <span class="badge emerald plain"><span class="pulse-dot online"></span> <span id="operator-username">Admin</span></span>
          <button class="btn" onclick="navigateTo('dashboard')">Open Console</button>
          <button class="btn btn-outline" onclick="logoutOperator()">Sign Out</button>
        </div>

        <!-- Dashboard: status + credits + actions -->
        <div class="header-actions dash-only">
          <button class="engine-pill credit-pill" onclick="switchConsoleTab('pricing')" title="Available operator credits — click to view Pricing &amp; Credits">
            <?= icon('zap', 12) ?>
            <span class="txt" id="header-credits-txt">CREDITS: 0</span>
          </button>
          <span class="engine-pill" title="Cluster gateway status"><span id="header-conn-dot" class="pulse-dot"></span><span class="txt" id="header-conn-txt">NODE</span></span>
          <span class="engine-pill" title="Match engine"><span id="header-bot-dot" class="pulse-dot"></span><span class="txt" id="header-bot-txt">ENGINE: IDLE</span></span>
          <button class="btn btn-danger" id="dash-killswitch" onclick="stopBotExecution()" style="display: none;"><?= icon('stop', 12) ?><span>Stop Match</span></button>
          <button class="btn" onclick="refreshAll(true)"><?= icon('refresh', 13) ?><span>Sync</span></button>
        </div>
      </div>
    </div>
  </header>

  <!-- ═══════════════ 1. LANDING ═══════════════ -->
  <div id="view-landing">
    <section class="hero-wrapper">
      <div class="watermark-container">
        <svg class="watermark-svg" viewBox="0 0 1750 260" preserveAspectRatio="xMidYMid meet">
          <text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle" class="svg-wm-base">TERMINALX999</text>
          <text x="50%" y="65%" text-anchor="middle" dominant-baseline="middle" class="svg-wm-tracer">TERMINALX999</text>
        </svg>
      </div>

      <div class="hero-content">
        <div class="quantum-badge-container">
          <div class="rocket-launch-zone">
            <div class="nasa-rocket">
              <svg class="rocket-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
                <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
              </svg>
              <div class="rocket-fire-plume"></div>
            </div>
          </div>
          <div class="quantum-pill">
            <span class="quantum-pulse-dot"></span>
            <span class="quantum-badge-text">TX999 GLORY CORE · 10H NONSTOP ENGINE</span>
            <span class="quantum-latency">0.4ms</span>
          </div>
        </div>

        <h1 class="hero-headline">Ready to begin?</h1>
        <p class="hero-subtext">High-density automation station for Bermuda Clash Squad. 10-hour nonstop squad sessions, automatic backup bot swap, real-time guild glory analytics, and full Developer API.</p>

        <div class="hero-buttons">
          <button class="btn-hero-action" onclick="toggleInstructionsModal()"><?= icon('file', 16) ?><span>Instructions</span></button>
          <button class="btn-hero-action" onclick="scrollToLandingPricing()"><?= icon('zap', 16) ?><span>Pricing &amp; Credits</span></button>
          <button class="btn-hero-action" onclick="launchConsoleAction()"><?= icon('user', 16) ?><span id="hero-action-text">User Sign In</span></button>
        </div>
      </div>
      <div class="scroll-indicator">↓</div>
    </section>

    <section class="spec-section">
      <div class="section-head">
        <div class="section-tag">ARCHITECTURE &amp; PROTOCOLS</div>
        <h2 class="section-title">Automated Clash Squad Infrastructure</h2>
      </div>
      <div class="spec-grid">
        <div class="spec-card"><span class="spec-badge">10H_NONSTOP_SQUAD</span><h3 class="spec-title">10-Hour Nonstop Sessions</h3><p class="spec-desc">1 Credit launches 1 Squad for 10 continuous hours (10:00:00) with a live countdown timer and automatic shutoff on completion.</p></div>
        <div class="spec-card"><span class="spec-badge">AUTO_BACKUP_SWAP</span><h3 class="spec-title">Instant Backup Replacement</h3><p class="spec-desc">If any bot disconnects, goes offline, or reaches its glory limit during a 10h run, a backup bot joins your guild and squad automatically.</p></div>
        <div class="spec-card"><span class="spec-badge">GLORY_HARVEST</span><h3 class="spec-title">Guild Glory Analytics</h3><p class="spec-desc">Dedicated per-guild cards with collapsible member rosters showing your bots' glory next to the guild's real total.</p></div>
        <div class="spec-card"><span class="spec-badge">DEVELOPER_API_V1</span><h3 class="spec-title">Private Developer API</h3><p class="spec-desc">Operators granted API access can control their entire account, bots, guilds, and 10h squad launches from their own frontend website.</p></div>
      </div>
    </section>

    <!-- ═══════════════ LANDING PRICING SECTION ═══════════════ -->
    <section class="spec-section" id="landing-pricing-section" style="padding-top: 1rem; padding-bottom: 5rem;">
      <div class="section-head">
        <div class="section-tag">CREDITS &amp; SESSION PRICING</div>
        <h2 class="section-title">Simple Credit-Based Squad Operations</h2>
        <p style="color: var(--text-2); font-size: 0.9rem; max-width: 640px; margin: 0.6rem auto 0;">New accounts start with <b style="color:#fff;">0 Credits</b>. Top up credits anytime — <b style="color:var(--emerald);">1 Credit = 1 Squad for 10 Hours Nonstop</b> and <b style="color:var(--cyan);">1 Credit = Generate Bot IDs</b>.</p>
      </div>

      <div class="pricing-rules-strip">
        <div class="pricing-rule-item">
          <span class="badge amber">NEW ACCOUNT</span>
          <div>
            <div class="pr-title">0 Credits on Sign Up</div>
            <div class="pr-sub">Create your operator account for free and purchase credits when ready to deploy.</div>
          </div>
        </div>
        <div class="pricing-rule-item">
          <span class="badge emerald">1 CREDIT / SQUAD</span>
          <div>
            <div class="pr-title">10 Hours Nonstop Matchmaking</div>
            <div class="pr-sub">Runs continuously for 10 hours (10:00:00) with auto-backup bot replacement &amp; auto-stop.</div>
          </div>
        </div>
        <div class="pricing-rule-item">
          <span class="badge cyan">1 CREDIT / BATCH</span>
          <div>
            <div class="pr-title">Generate Guild Bot IDs</div>
            <div class="pr-sub">Forges new guest bot accounts and binds them directly to your mandatory Guild ID.</div>
          </div>
        </div>
      </div>

      <div class="pricing-grid">
        <div class="pricing-card">
          <div class="pc-head">
            <span class="pc-tier">STARTER PACK</span>
            <div class="pc-price">5 Credits</div>
            <div class="pc-sub">50 Hours of Nonstop Squad Runtime</div>
          </div>
          <ul class="pc-features">
            <li><?= icon('check', 14) ?> <b>5 Credits</b> added to your operator balance</li>
            <li><?= icon('check', 14) ?> Launch up to <b>5 × 10-Hour Nonstop Squads</b></li>
            <li><?= icon('check', 14) ?> Or generate fresh Guild-bound Bot IDs (1 Credit)</li>
            <li><?= icon('check', 14) ?> Automatic dead/offline bot replacement via backup pool</li>
            <li><?= icon('check', 14) ?> Live 10-Hour countdown timer on every squad card</li>
          </ul>
          <button class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;" onclick="handleBuyCreditsClick('Starter Pack — 5 Credits')">Buy 5 Credits</button>
        </div>

        <div class="pricing-card featured">
          <div class="pc-popular-ribbon">MOST POPULAR</div>
          <div class="pc-head">
            <span class="pc-tier" style="color: var(--emerald);">COMMANDER PACK</span>
            <div class="pc-price">15 Credits</div>
            <div class="pc-sub">150 Hours of Nonstop Squad Runtime</div>
          </div>
          <ul class="pc-features">
            <li><?= icon('check', 14) ?> <b>15 Credits</b> added to your operator balance</li>
            <li><?= icon('check', 14) ?> Launch up to <b>15 × 10-Hour Nonstop Squads</b></li>
            <li><?= icon('check', 14) ?> Multi-Squad parallel execution for fast Guild Glory</li>
            <li><?= icon('check', 14) ?> Auto-backup bot inheritance &amp; Homer AI skill</li>
            <li><?= icon('check', 14) ?> Full Guild Analytics with collapsible member rosters</li>
          </ul>
          <button class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;" onclick="handleBuyCreditsClick('Commander Pack — 15 Credits')">Buy 15 Credits</button>
        </div>

        <div class="pricing-card">
          <div class="pc-head">
            <span class="pc-tier" style="color: var(--amber);">SYNDICATE + API</span>
            <div class="pc-price">50 Credits</div>
            <div class="pc-sub">500 Hours Runtime + Developer API Access</div>
          </div>
          <ul class="pc-features">
            <li><?= icon('check', 14) ?> <b>50 Credits</b> added to your operator balance</li>
            <li><?= icon('check', 14) ?> Launch up to <b>50 × 10-Hour Nonstop Squads</b></li>
            <li><?= icon('check', 14) ?> Eligible for <b>Developer REST API Access (`/api/v1/*`)</b></li>
            <li><?= icon('check', 14) ?> Build your own custom frontend website &amp; automation</li>
            <li><?= icon('check', 14) ?> Direct Super Commander priority support</li>
          </ul>
          <button class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;" onclick="handleBuyCreditsClick('Syndicate Pack — 50 Credits')">Buy 50 Credits</button>
        </div>
      </div>
    </section>
  </div>

  <!-- ═══════════════ 2. CONSOLE (SIDEBAR + MAIN) ═══════════════ -->
  <div id="view-dashboard" class="dashboard-root" style="display: none;">
    <div class="shell">

      <!-- ── SIDEBAR ── -->
      <aside class="sidebar" id="sidebar">
        <div class="nav-section">
          <div class="nav-label">Workspace</div>
          <button class="nav-item active" data-tab="overview" onclick="switchConsoleTab('overview')"><?= icon('grid') ?><span>Overview</span></button>
          <button class="nav-item" data-tab="clan" onclick="switchConsoleTab('clan')"><?= icon('shield') ?><span>Guild Analytics</span></button>
          <button class="nav-item" data-tab="bot" onclick="switchConsoleTab('bot')"><?= icon('play') ?><span>Matchmaking</span><span class="nav-badge hidden" id="nav-live-badge">LIVE</span></button>
          <button class="nav-item" data-tab="accounts" onclick="switchConsoleTab('accounts')"><?= icon('bot') ?><span>Bot Accounts</span><span class="nav-badge" id="nav-bot-count">–</span></button>
          <button class="nav-item" data-tab="pricing" onclick="switchConsoleTab('pricing')"><?= icon('zap') ?><span>Pricing &amp; Credits</span><span class="nav-badge" id="nav-credits-badge">0</span></button>
          <button class="nav-item" data-tab="apidocs" onclick="switchConsoleTab('apidocs')"><?= icon('code') ?><span>API &amp; Docs</span><span class="nav-badge" id="nav-api-badge">LOCKED</span></button>
          <button class="nav-item" data-tab="settings" onclick="switchConsoleTab('settings')"><?= icon('sliders') ?><span>Configuration</span></button>
        </div>

        <!-- Injected for Super Commander only -->
        <div id="nav-admin-slot"></div>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="avatar" id="side-avatar">U</div>
            <div class="user-meta">
              <div class="user-name" id="side-username">Operator</div>
              <div class="user-role" id="side-role">Member</div>
            </div>
          </div>
          <button class="nav-item" onclick="logoutOperator()"><?= icon('logout') ?><span>Sign out</span></button>
        </div>
      </aside>

      <!-- ── MAIN ── -->
      <main class="main">
        <div class="main-inner">

          <!-- ░░ OVERVIEW ░░ -->
          <div class="console-pane" id="cpane-overview">
            <div class="page-head">
              <div>
                <h1 class="page-title">Overview</h1>
                <p class="page-sub">Fleet health, credit balance, 10-hour engine state and tracked guilds at a glance.</p>
              </div>
              <div class="page-actions">
                <button class="btn" onclick="switchConsoleTab('pricing')"><?= icon('zap', 13) ?><span>Top Up Credits</span></button>
                <button class="btn btn-primary" onclick="switchConsoleTab('bot')"><?= icon('play', 13) ?><span>Launch 10h Squad</span></button>
              </div>
            </div>

            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-label">Available credits</div>
                <div class="stat-value" id="m-user-credits" style="color: var(--amber);">0</div>
                <div class="stat-sub">1 Credit = 1 Squad (10h) or Bot Gen</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Bot roster</div>
                <div class="stat-value is-loading" id="m-total-acc">00</div>
                <div class="stat-sub"><b id="m-active-acc">0</b> active · <span id="m-offline-acc">0</span> offline</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Guild assignment</div>
                <div class="stat-value is-loading" id="m-in-clans">00</div>
                <div class="stat-sub"><span id="m-avail-acc">0</span> backup / unassigned</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Homer drone AI</div>
                <div class="stat-value sm is-loading" id="m-homer-status">ACTIVE</div>
                <div class="stat-sub">Recast every <span id="m-homer-cd">90s</span> · <span id="m-chase-status">ENGAGED</span></div>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title">10-Hour Nonstop Match Engine</span>
                <span class="badge dim" id="m-live-state-badge">IDLE</span>
              </div>
              <div class="card-body">
                <div class="kv-big">
                  <div><div class="k">Active guild</div><div class="v" id="m-live-target">None</div></div>
                  <div><div class="k">Current round</div><div class="v" id="m-live-rounds">0</div></div>
                  <div><div class="k">Matches completed</div><div class="v" id="m-live-completed" style="color: var(--emerald);">0</div></div>
                  <div><div class="k">10h session remaining</div><div class="v" id="m-live-uptime" style="color: var(--amber);">--:--:--</div></div>
                </div>
              </div>
            </div>

            <div class="grid-2">
              <div class="card">
                <div class="card-head"><span class="card-title">Tracked guilds</span></div>
                <div class="card-body" id="overview-clan-list-box"></div>
              </div>
              <div class="card">
                <div class="card-head"><span class="card-title">Operations policy</span></div>
                <div class="card-body">
                  <div class="kv">
                    <div class="kv-row"><span class="k">Gateway node</span><span class="v">TX999-IND-CLUSTER (Encrypted)</span></div>
                    <div class="kv-row"><span class="k">Squad session duration</span><span class="badge emerald">10 Hours Nonstop (1 Credit)</span></div>
                    <div class="kv-row"><span class="k">Mandatory guild rule</span><span class="badge cyan">Guild ID required</span></div>
                    <div class="kv-row"><span class="k">Developer API</span><span class="badge dim" id="ov-api-status-badge">Check API &amp; Docs</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ░░ GUILD ANALYTICS ░░ -->
          <div class="console-pane" id="cpane-clan" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title">Guild Analytics</h1>
                <p class="page-sub">Each guild is displayed in its own card. Click <b>Show Members</b> on any guild card to expand its bot roster.</p>
              </div>
              <div class="page-actions">
                <input type="text" class="form-control" id="input-clan-id" placeholder="Inspect any Guild ID" style="width: 175px;" />
                <button class="btn" onclick="fetchLiveClanInfo()" id="btn-fetch-clan">Query ID</button>
                <button class="btn btn-primary" onclick="syncAllActiveGuilds()" id="btn-sync-all-clans"><?= icon('refresh', 13) ?><span>Refresh all guilds</span></button>
              </div>
            </div>

            <div id="clan-result-box" style="display: none;" class="card"></div>
            <div id="auto-guilds-container"></div>
          </div>

          <!-- ░░ MATCHMAKING ░░ -->
          <div class="console-pane" id="cpane-bot" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title">Matchmaking</h1>
                <p class="page-sub">Select an active guild to launch a <b>10-Hour Nonstop Squad Session</b> (costs 1 Credit per squad). Bots must belong to a guild.</p>
              </div>
            </div>

            <div class="card">
              <div class="toolbar">
                <input type="hidden" id="bot-target-mode" value="clan" />
                <input type="hidden" id="bot-rounds-select" value="0" />

                <div class="field grow" id="group-clan-select" style="min-width: 240px;">
                  <label class="form-label">Active Guild (Mandatory *)</label>
                  <select class="form-control" id="bot-select-clan" onchange="saveOperatorPreferences()"></select>
                </div>
                <div class="field" style="min-width: 175px;">
                  <label class="form-label">Formation</label>
                  <select class="form-control" id="bot-mode-duo" onchange="saveOperatorPreferences(); pollBotStatus();">
                    <option value="false">SQUAD (4 bots)</option>
                    <option value="true">DUO (2 bots)</option>
                  </select>
                </div>
                <div class="field" style="min-width: 230px;">
                  <label class="form-label">Session Duration &amp; Cost</label>
                  <div class="session-rule-pill">
                    <?= icon('clock', 14) ?>
                    <span><b>10 Hours Nonstop</b> · 1 Credit / Squad</span>
                  </div>
                </div>
                <div class="field" style="min-width: 0;">
                  <button class="btn btn-primary btn-lg" id="btn-start-bot" onclick="startBotExecution()"><?= icon('play', 13) ?><span>Start matchmaking (10h)</span></button>
                  <button class="btn btn-danger btn-lg" id="btn-stop-bot" onclick="stopBotExecution()" style="display: none;"><?= icon('stop', 13) ?><span>Stop match</span></button>
                </div>
              </div>
              <div class="match-policy-strip">
                <span><?= icon('shield', 13) ?> <b>Guild Required:</b> Bots without a Guild ID cannot start matchmaking.</span>
                <span><?= icon('clock', 13) ?> <b>10-Hour Auto-Stop:</b> Runs nonstop for 10:00:00 and stops automatically when time expires.</span>
                <span><?= icon('refresh', 13) ?> <b>Auto-Backup Swap:</b> Offline or capped bots are seamlessly replaced by backup bots.</span>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title">Live squad &amp; bot matrix <span class="badge dim" id="match-live-pulse-badge">STANDBY</span></span>
                <div style="display: flex; gap: 1.1rem; align-items: center; font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-3); flex-wrap: wrap;">
                  <span>⏳ 10h Timer <b id="match-stat-timer" style="color: var(--amber); font-weight: 700;">10:00:00</b></span>
                  <span>Round <b id="match-stat-round" style="color: #fff; font-weight: 600;">0</b></span>
                  <span>Uptime <b id="match-stat-uptime" style="color: #fff; font-weight: 600;">0s</b></span>
                  <span>Bots <b id="match-stat-bots" style="color: var(--cyan); font-weight: 600;">0</b></span>
                </div>
              </div>
              <div class="card-body" id="live-squads-container"></div>
            </div>
          </div>

          <!-- ░░ BOT ACCOUNTS ░░ -->
          <div class="console-pane" id="cpane-accounts" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title">Bot Accounts</h1>
                <p class="page-sub">Guest bot accounts bound to your guilds. Generating bot accounts requires a mandatory <b>Guild ID</b> and costs <b>1 Credit</b>.</p>
              </div>
              <div class="page-actions">
                <button class="btn btn-danger" id="btn-bulk-delete" onclick="bulkDeleteAccounts()" style="display: none;"><?= icon('trash', 13) ?><span id="bulk-delete-count">Delete selected (0)</span></button>
                <button class="btn btn-primary" onclick="toggleGenerateModal()"><?= icon('plus', 13) ?><span>Generate accounts (1 Credit)</span></button>
              </div>
            </div>

            <div class="card" id="card-generator" style="display: none;">
              <div class="card-head">
                <span class="card-title">Generate guild bot accounts</span>
                <span class="badge amber"><?= icon('zap', 12) ?> Cost: 1 Credit · Guild ID Mandatory</span>
              </div>
              <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 0.85rem;">
                  <div class="field"><label class="form-label">Target Guild ID (Required *)</label><input type="text" class="form-control" id="gen-clan-id" placeholder="Required e.g. 3055983375" required /></div>
                  <div class="field"><label class="form-label">Count (1–10)</label><input type="number" class="form-control" id="gen-count" value="4" min="1" max="10" /></div>
                  <div class="field"><label class="form-label">Region</label>
                    <select class="form-control" id="gen-region"><option value="IND">IND (India)</option><option value="BD">BD (Bangladesh)</option><option value="SG">SG (Singapore)</option></select>
                  </div>
                  <div class="field"><label class="form-label">Name prefix</label><input type="text" class="form-control" id="gen-prefix" value="TX999" maxlength="10" /></div>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                  <button class="btn btn-primary" onclick="submitGenerateAccounts()" id="btn-submit-gen"><?= icon('zap', 13) ?><span>Generate &amp; Join Guild (1 Credit)</span></button>
                  <button class="btn" onclick="toggleGenerateModal()">Cancel</button>
                  <span style="font-size: 0.74rem; color: var(--text-3); margin-left: 0.4rem;">Every generated bot will automatically join the specified Guild ID.</span>
                </div>

                <div id="gen-progress-panel" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--line);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.8rem;">
                    <span style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600;"><span class="pulse-dot online"></span><span id="gen-progress-title">Generating…</span></span>
                    <span class="mono" style="color: var(--cyan);" id="gen-progress-ratio">0 / 0</span>
                  </div>
                  <div class="progress-track" style="margin-bottom: 0.75rem;"><div class="progress-fill" id="gen-progress-bar-fill"></div></div>
                  <div class="terminal" id="gen-logs-terminal" style="height: 130px; border: 1px solid var(--line); border-radius: var(--r-sm);"><div>[STATUS] Ready…</div></div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th style="width: 36px;"><input type="checkbox" id="select-all-bots" onchange="toggleSelectAllBots(this)" /></th>
                      <th>Nickname</th>
                      <th>UID</th>
                      <th>In-game ID</th>
                      <th>Region</th>
                      <th>Guild</th>
                      <th>Status</th>
                      <th class="ta-r">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="accounts-tbody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ░░ PRICING & CREDITS ░░ -->
          <div class="console-pane" id="cpane-pricing" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title"><?= icon('zap', 20) ?> Pricing &amp; Credits</h1>
                <p class="page-sub">Manage your operator credit balance. 1 Credit launches 1 Squad for 10 Hours Nonstop or generates Guild Bot IDs.</p>
              </div>
              <div class="page-actions">
                <button class="btn" onclick="refreshUserCredits()"><?= icon('refresh', 13) ?><span>Refresh Balance</span></button>
              </div>
            </div>

            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-label">Your credit balance</div>
                <div class="stat-value" id="pricing-balance-val" style="color: var(--amber);">0</div>
                <div class="stat-sub" id="pricing-balance-sub">New accounts start with 0 credits</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Squad launch cost</div>
                <div class="stat-value sm" style="color: var(--emerald);">1 Credit / Squad</div>
                <div class="stat-sub">Runs 10 Hours Nonstop (10:00:00)</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Bot generation cost</div>
                <div class="stat-value sm" style="color: var(--cyan);">1 Credit / Batch</div>
                <div class="stat-sub">Requires valid Guild ID (clan_id)</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Auto-backup protection</div>
                <div class="stat-value sm">INCLUDED</div>
                <div class="stat-sub">Dead/offline bots swapped automatically</div>
              </div>
            </div>

            <div class="pricing-grid" style="margin-top: 1rem;">
              <div class="pricing-card">
                <div class="pc-head">
                  <span class="pc-tier">STARTER PACK</span>
                  <div class="pc-price">5 Credits</div>
                  <div class="pc-sub">50 Hours of Nonstop Squad Runtime</div>
                </div>
                <ul class="pc-features">
                  <li><?= icon('check', 14) ?> <b>5 Credits</b> instant operator top-up</li>
                  <li><?= icon('check', 14) ?> Launch <b>5 × 10-Hour Nonstop Squads</b></li>
                  <li><?= icon('check', 14) ?> Or forge Guild-bound Bot IDs (1 Credit)</li>
                  <li><?= icon('check', 14) ?> Automatic dead/offline backup bot replacement</li>
                  <li><?= icon('check', 14) ?> Live 10-Hour countdown timer on squad cards</li>
                </ul>
                <button class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;" onclick="openBuyCreditsModal('Starter Pack — 5 Credits', 5)">Select 5 Credits</button>
              </div>

              <div class="pricing-card featured">
                <div class="pc-popular-ribbon">MOST POPULAR</div>
                <div class="pc-head">
                  <span class="pc-tier" style="color: var(--emerald);">COMMANDER PACK</span>
                  <div class="pc-price">15 Credits</div>
                  <div class="pc-sub">150 Hours of Nonstop Squad Runtime</div>
                </div>
                <ul class="pc-features">
                  <li><?= icon('check', 14) ?> <b>15 Credits</b> instant operator top-up</li>
                  <li><?= icon('check', 14) ?> Launch <b>15 × 10-Hour Nonstop Squads</b></li>
                  <li><?= icon('check', 14) ?> Multi-Squad parallel Guild Glory farming</li>
                  <li><?= icon('check', 14) ?> Auto-backup bot inheritance &amp; Homer AI skill</li>
                  <li><?= icon('check', 14) ?> Full Guild Analytics with collapsible rosters</li>
                </ul>
                <button class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;" onclick="openBuyCreditsModal('Commander Pack — 15 Credits', 15)">Select 15 Credits</button>
              </div>

              <div class="pricing-card">
                <div class="pc-head">
                  <span class="pc-tier" style="color: var(--amber);">SYNDICATE + API</span>
                  <div class="pc-price">50 Credits</div>
                  <div class="pc-sub">500 Hours Runtime + Developer API Access</div>
                </div>
                <ul class="pc-features">
                  <li><?= icon('check', 14) ?> <b>50 Credits</b> instant operator top-up</li>
                  <li><?= icon('check', 14) ?> Launch <b>50 × 10-Hour Nonstop Squads</b></li>
                  <li><?= icon('check', 14) ?> Includes <b>Developer REST API Access (`/api/v1/*`)</b></li>
                  <li><?= icon('check', 14) ?> Control your account from your own website</li>
                  <li><?= icon('check', 14) ?> Priority Super Commander support</li>
                </ul>
                <button class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;" onclick="openBuyCreditsModal('Syndicate Pack — 50 Credits', 50)">Select 50 Credits</button>
              </div>
            </div>
          </div>

          <!-- ░░ DEVELOPER API & DOCS ░░ -->
          <div class="console-pane" id="cpane-apidocs" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title"><?= icon('code', 20) ?> Developer API &amp; Documentation</h1>
                <p class="page-sub">Control your entire operator account, bots, guilds and 10-hour squad launches from your own frontend website or scripts via our secure proxy API.</p>
              </div>
              <div class="page-actions">
                <button class="btn" onclick="refreshUserCredits()"><?= icon('refresh', 13) ?><span>Sync API Status</span></button>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title"><?= icon('key', 14) ?> Your Personal Developer API Credentials</span>
                <span class="badge dim" id="apidocs-access-badge">LOCKED</span>
              </div>
              <div class="card-body">
                <div id="apidocs-locked-banner" class="ban-banner" style="display: none; margin-bottom: 1rem;">
                  <?= icon('alert', 16) ?>
                  <span><b>Developer API Access Not Enabled:</b> Only operators authorized by the <b>Super Commander</b> can call `/api/v1/*` endpoints. Contact Super Commander to enable API access on your account.</span>
                </div>

                <div class="grid-2" style="gap: 1rem;">
                  <div class="field" style="margin-bottom: 0;">
                    <label class="form-label">Frontend API Gateway Base URL (Public Proxy)</label>
                    <div style="display: flex; gap: 0.5rem;">
                      <input type="text" class="form-control mono" id="apidocs-base-url" readonly value="https://guildglory.prtvshow.online/api/v1" />
                      <button class="btn" onclick="copyTextValue('apidocs-base-url', 'Gateway URL copied!')"><?= icon('copy', 13) ?><span>Copy</span></button>
                    </div>
                  </div>
                  <div class="field" style="margin-bottom: 0;">
                    <label class="form-label">Personal Secret API Key (`X-API-Key`)</label>
                    <div style="display: flex; gap: 0.5rem;">
                      <input type="text" class="form-control mono" id="apidocs-key-input" readonly value="Locked — Request API Access from Super Commander" />
                      <button class="btn" id="btn-copy-apikey" onclick="copyTextValue('apidocs-key-input', 'API Key copied!')" disabled><?= icon('copy', 13) ?><span>Copy Key</span></button>
                      <button class="btn btn-outline" id="btn-regen-apikey" onclick="regeneratePersonalApiKey()" disabled><?= icon('refresh', 13) ?><span>Rotate</span></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title">REST API Endpoints Reference (`/api/v1/*`)</span>
                <span class="badge emerald">Header: X-API-Key: tx999_live_...</span>
              </div>
              <div class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Endpoint</th>
                      <th>Credit Cost</th>
                      <th>Description &amp; Parameters</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span class="badge emerald">GET</span></td>
                      <td class="mono">/api/v1/account</td>
                      <td>Free</td>
                      <td>Returns your operator username, role, live credit balance, and 10-hour session pricing rules.</td>
                    </tr>
                    <tr>
                      <td><span class="badge emerald">GET</span></td>
                      <td class="mono">/api/v1/bots</td>
                      <td>Free</td>
                      <td>Lists all bot accounts owned by your account. Optional query: <code class="mono">?clan_id=3055983375</code>.</td>
                    </tr>
                    <tr>
                      <td><span class="badge cyan">POST</span></td>
                      <td class="mono">/api/v1/bots/generate</td>
                      <td><span class="badge amber">1 Credit</span></td>
                      <td>Forges new bots in your guild. JSON body: <code class="mono">{"clan_id": "3055983375", "count": 4, "region": "IND", "name_prefix": "TX999"}</code>.</td>
                    </tr>
                    <tr>
                      <td><span class="badge emerald">GET</span></td>
                      <td class="mono">/api/v1/bots/generate/progress</td>
                      <td>Free</td>
                      <td>Returns real-time generation progress, completed count, and live logs.</td>
                    </tr>
                    <tr>
                      <td><span class="badge rose">DELETE</span></td>
                      <td class="mono">/api/v1/bots/{uid}</td>
                      <td>Free</td>
                      <td>Deletes a specific bot account owned by your operator profile.</td>
                    </tr>
                    <tr>
                      <td><span class="badge emerald">GET</span></td>
                      <td class="mono">/api/v1/guilds</td>
                      <td>Free</td>
                      <td>Lists all guilds synced with your bots, including bot glory and total guild glory.</td>
                    </tr>
                    <tr>
                      <td><span class="badge emerald">GET</span></td>
                      <td class="mono">/api/v1/guilds/{clan_id}</td>
                      <td>Free</td>
                      <td>Fetches live guild glory summary and member contribution breakdown for <code class="mono">clan_id</code>.</td>
                    </tr>
                    <tr>
                      <td><span class="badge cyan">POST</span></td>
                      <td class="mono">/api/v1/match/start</td>
                      <td><span class="badge amber">1 Credit / Squad</span></td>
                      <td>Launches a <b>10-Hour Nonstop Squad Session</b>. JSON body: <code class="mono">{"clan_id": "3055983375", "use_duo": false}</code>.</td>
                    </tr>
                    <tr>
                      <td><span class="badge emerald">GET</span></td>
                      <td class="mono">/api/v1/match/status</td>
                      <td>Free</td>
                      <td>Returns live squad matrix, bot states, <code class="mono">remaining_seconds</code> (10h countdown), and <code class="mono">expires_at</code>.</td>
                    </tr>
                    <tr>
                      <td><span class="badge cyan">POST</span></td>
                      <td class="mono">/api/v1/match/stop</td>
                      <td>Free</td>
                      <td>Immediately stops your active matchmaking session.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="grid-2">
              <div class="card">
                <div class="card-head"><span class="card-title">Example 1 — Launch 10-Hour Squad (cURL)</span></div>
                <div class="card-body">
                  <pre class="code-block" id="apidocs-curl-example">curl -X POST "https://guildglory.prtvshow.online/api/v1/match/start" \
  -H "X-API-Key: tx999_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "clan_id": "3055983375",
    "use_duo": false
  }'</pre>
                </div>
              </div>
              <div class="card">
                <div class="card-head"><span class="card-title">Example 2 — Connect Your Own Website (JavaScript)</span></div>
                <div class="card-body">
                  <pre class="code-block" id="apidocs-js-example">const API_BASE = "https://guildglory.prtvshow.online/api/v1";
const API_KEY  = "tx999_live_YOUR_API_KEY";

// Check live 10-hour squad countdown &amp; bot status
const res = await fetch(`${API_BASE}/match/status`, {
  headers: { "X-API-Key": API_KEY }
});
const { data } = await res.json();
console.log("Remaining 10h seconds:", data.remaining_seconds, data.squads);</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- ░░ CONFIGURATION ░░ -->
          <div class="console-pane" id="cpane-settings" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title">Configuration</h1>
                <p class="page-sub">Combat behaviour for your bots. Saved to your profile and synced to the engine.</p>
              </div>
              <div class="page-actions">
                <button class="btn btn-primary" onclick="saveBotConfig()"><?= icon('save', 13) ?><span>Save configuration</span></button>
              </div>
            </div>
            <div class="grid-2">
              <div class="card">
                <div class="card-head"><span class="card-title">Homer drone skill</span></div>
                <div class="card-body">
                  <div class="field"><label class="form-label">Auto-cast</label>
                    <select class="form-control" id="cfg-homer-enable"><option value="true">Enabled — cast at nearest enemy</option><option value="false">Disabled</option></select>
                  </div>
                  <div class="field" style="margin-bottom: 0;"><label class="form-label">Cooldown interval (15–120 s)</label>
                    <input type="number" class="form-control" id="cfg-homer-cd" value="90" min="15" max="120" step="5" />
                  </div>
                </div>
              </div>
              <div class="card">
                <div class="card-head"><span class="card-title">Movement &amp; interception</span></div>
                <div class="card-body">
                  <div class="field"><label class="form-label">Enemy interception</label>
                    <select class="form-control" id="cfg-chase-enable"><option value="true">Enabled — bots chase closest enemy</option><option value="false">Disabled — hold spawn</option></select>
                  </div>
                  <div class="field" style="margin-bottom: 0;"><label class="form-label">Stop distance (50–500 units)</label>
                    <input type="number" class="form-control" id="cfg-chase-dist" value="150" min="50" max="500" step="10" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ░░ COMMAND CENTER (SUPER COMMANDER) ░░ -->
          <div class="console-pane" id="cpane-superadmin" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title" style="color: var(--amber);"><?= icon('star', 20) ?> Command Center</h1>
                <p class="page-sub">Manage operator credits, grant or revoke Developer API access, issue bans with reasons and review moderation activity.</p>
              </div>
              <div class="page-actions">
                <button class="btn" onclick="refreshSuperAdminData(true)"><?= icon('refresh', 13) ?><span>Refresh</span></button>
              </div>
            </div>

            <div class="stat-grid cols-5">
              <div class="stat-card"><div class="stat-label">Operators</div><div class="stat-value is-loading" id="ov-total-users">00</div><div class="stat-sub"><b id="ov-new-today">0</b> new today</div></div>
              <div class="stat-card"><div class="stat-label">Active 24h</div><div class="stat-value is-loading" id="ov-active">00</div><div class="stat-sub"><b id="ov-logins">0</b> sign-ins</div></div>
              <div class="stat-card"><div class="stat-label">Banned</div><div class="stat-value is-loading" id="ov-banned" style="color: var(--rose);">00</div><div class="stat-sub">Currently restricted</div></div>
              <div class="stat-card"><div class="stat-label">Blocked sign-ins</div><div class="stat-value is-loading" id="ov-blocked">00</div><div class="stat-sub">Last 24 hours</div></div>
              <div class="stat-card"><div class="stat-label">Actions logged</div><div class="stat-value is-loading" id="ov-actions">00</div><div class="stat-sub">Last 24 hours</div></div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title">Operators <span class="sub" id="users-count-sub"></span></span>
                <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
                  <div class="chips" id="user-filter-chips">
                    <button class="chip active" data-f="all" onclick="setUserFilter('all')">All <span class="count" id="uf-all">0</span></button>
                    <button class="chip" data-f="active" onclick="setUserFilter('active')">Active <span class="count" id="uf-active">0</span></button>
                    <button class="chip" data-f="banned" onclick="setUserFilter('banned')">Banned <span class="count" id="uf-banned">0</span></button>
                  </div>
                  <div class="search-box"><?= icon('search', 14) ?><input type="text" class="form-control" id="user-search" placeholder="Search operators" oninput="renderOperators()" style="width: 190px;" /></div>
                </div>
              </div>
              <div class="table-wrap" style="max-height: 460px; overflow-y: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Role</th>
                      <th>Credits</th>
                      <th>Developer API</th>
                      <th>Last active</th>
                      <th>Status</th>
                      <th class="ta-r">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="operators-tbody"></tbody>
                </table>
              </div>
            </div>

            <div class="card">
              <div class="card-head"><span class="card-title">Recent moderation &amp; access changes <span class="sub">credits, API grants &amp; bans</span></span></div>
              <div class="table-wrap" style="max-height: 280px; overflow-y: auto;">
                <table class="table">
                  <thead><tr><th>Time</th><th>By</th><th>Action</th><th>Details</th></tr></thead>
                  <tbody id="mod-logs-tbody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- ░░ ACTIVITY LOGS (SUPER COMMANDER) ░░ -->
          <div class="console-pane" id="cpane-logs" style="display: none;">
            <div class="page-head">
              <div>
                <h1 class="page-title"><?= icon('terminal', 20) ?> Activity Logs</h1>
                <p class="page-sub">Operator audit trail and the live engine stream.</p>
              </div>
              <div class="page-actions">
                <button class="btn" onclick="refreshLogsPane()"><?= icon('refresh', 13) ?><span>Refresh</span></button>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title">Audit trail <span class="sub" id="audit-count-sub"></span></span>
                <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
                  <div class="chips" id="audit-filter-chips">
                    <button class="chip active" data-f="all" onclick="setAuditFilter('all')">All</button>
                    <button class="chip" data-f="auth" onclick="setAuditFilter('auth')">Auth</button>
                    <button class="chip" data-f="match" onclick="setAuditFilter('match')">Matches</button>
                    <button class="chip" data-f="bots" onclick="setAuditFilter('bots')">Bots</button>
                    <button class="chip" data-f="mod" onclick="setAuditFilter('mod')">Moderation</button>
                  </div>
                  <div class="search-box"><?= icon('search', 14) ?><input type="text" class="form-control" id="audit-search" placeholder="Search logs" oninput="renderAuditLogs()" style="width: 180px;" /></div>
                </div>
              </div>
              <div class="table-wrap" style="max-height: 420px; overflow-y: auto;">
                <table class="table">
                  <thead><tr><th>Time</th><th>Operator</th><th>Action</th><th>Details</th><th>IP</th></tr></thead>
                  <tbody id="audit-logs-tbody"></tbody>
                </table>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <span class="card-title">Engine stream <span class="badge emerald">LIVE</span> <span class="sub mono" id="vps-log-timestamp">Connecting…</span></span>
                <div style="display: flex; gap: 0.6rem; align-items: center;">
                  <div class="chips" id="engine-filter-chips">
                    <button class="chip active" data-f="all" onclick="setEngineFilter('all')">All</button>
                    <button class="chip" data-f="err" onclick="setEngineFilter('err')">Errors</button>
                    <button class="chip" data-f="ok" onclick="setEngineFilter('ok')">Success</button>
                    <button class="chip" data-f="sys" onclick="setEngineFilter('sys')">System</button>
                  </div>
                  <button class="btn btn-sm" id="btn-engine-pause" onclick="toggleEnginePause()"><?= icon('pause', 11) ?><span>Pause</span></button>
                </div>
              </div>
              <div class="terminal tall" id="vps-engine-terminal"></div>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>

  <!-- ═══════════════ MODALS ═══════════════ -->
  <!-- Auth -->
  <div class="modal-overlay" id="modal-auth" style="display: none;" onclick="closeModalOnOverlay(event)">
    <div class="modal-box auth-modal-custom">
      <div class="modal-head">
        <span class="modal-head-title" id="auth-modal-title">Sign In</span>
        <button class="btn btn-sm modal-x" onclick="closeAuthModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <button class="auth-tab active" id="atab-login" onclick="setAuthMode('login')">Sign In</button>
          <button class="auth-tab" id="atab-register" onclick="setAuthMode('register')">Register</button>
        </div>
        <div id="auth-ban-notice" class="ban-banner" style="display: none;"></div>
        <form onsubmit="handleAuthSubmit(event)">
          <div class="form-group" id="group-email" style="display: none;">
            <label class="form-label">Email address</label>
            <input type="email" class="form-control" id="auth-email" placeholder="name@gmail.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="form-control" id="auth-username" required minlength="3" placeholder="Enter username" autocomplete="username" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" id="auth-password" required minlength="8" placeholder="Min. 8 characters" autocomplete="current-password" />
            <div id="password-strength-hint" style="display: none; font-size: 0.7rem; color: var(--text-3); margin-top: 0.35rem;">At least 8 characters with letters and numbers. New accounts start with 0 Credits.</div>
          </div>
          <div class="form-group" id="group-confirm-pass" style="display: none;">
            <label class="form-label">Confirm password</label>
            <input type="password" class="form-control" id="auth-confirm-password" placeholder="Repeat password" />
          </div>
          <button type="submit" class="btn-auth-submit" id="btn-auth-submit">Sign In</button>
        </form>
      </div>
    </div>
  </div>

  <!-- 10-Hour Squad Launch Confirmation Modal -->
  <div class="modal-overlay" id="modal-launch-confirm" style="display: none;" onclick="if (event.target.id === 'modal-launch-confirm') closeLaunchConfirmModal()">
    <div class="modal-box" style="max-width: 480px;">
      <div class="modal-head">
        <span class="modal-head-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--emerald);"><?= icon('clock', 16) ?> Confirm 10-Hour Nonstop Squad Launch</span>
        <button class="btn btn-sm modal-x" onclick="closeLaunchConfirmModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="launch-summary-banner">
          <div class="lsb-timer">10:00:00</div>
          <div class="lsb-caption">Nonstop Automated Clash Squad Session · Auto-Stops at 10 Hours</div>
        </div>
        <div class="kv" style="margin-top: 0.9rem;">
          <div class="kv-row"><span class="k">Target Guild</span><span class="v mono" id="lc-guild-label">—</span></div>
          <div class="kv-row"><span class="k">Formation &amp; Squads</span><span class="v" id="lc-formation-label">SQUAD (4 Bots)</span></div>
          <div class="kv-row"><span class="k">Session Duration</span><span class="badge emerald">10 Hours Nonstop (36,000s)</span></div>
          <div class="kv-row"><span class="k">Backup Bot Protection</span><span class="badge cyan">Auto-Replace Offline / Capped Bots</span></div>
          <div class="kv-row"><span class="k">Credit Deduction</span><span class="badge amber" id="lc-credit-cost">1 Credit / Squad</span></div>
          <div class="kv-row"><span class="k">Your Available Credits</span><span class="v mono" id="lc-user-credits">0</span></div>
        </div>
        <p style="font-size: 0.76rem; color: var(--text-3); margin-top: 0.85rem; line-height: 1.55;">
          Once launched, your squad will run nonstop for <b>10 hours</b>. A live countdown timer (`HH:MM:SS left`) will appear on your squad card, and the session will automatically shut down when 10 hours complete.
        </p>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeLaunchConfirmModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-confirm-launch-10h" onclick="confirmAndExecuteLaunch()"><?= icon('play', 13) ?><span>Launch 10-Hour Squad (1 Credit)</span></button>
      </div>
    </div>
  </div>

  <!-- Super Commander: Manage Credits Modal -->
  <div class="modal-overlay" id="modal-credits" style="display: none;" onclick="if (event.target.id === 'modal-credits') closeCreditsModal()">
    <div class="modal-box" style="max-width: 440px;">
      <div class="modal-head">
        <span class="modal-head-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--amber);"><?= icon('zap', 15) ?> Manage Operator Credits</span>
        <button class="btn btn-sm modal-x" onclick="closeCreditsModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size: 0.82rem; color: var(--text-2); margin-bottom: 0.85rem;">
          Operator: <strong id="cred-target-name" style="color: #fff;">user</strong> · Current Balance: <span class="badge amber" id="cred-current-val">0 Credits</span>
        </div>
        <div class="field">
          <label class="form-label">Operation</label>
          <select class="form-control" id="cred-action">
            <option value="add">Add Credits (+)</option>
            <option value="set">Set Exact Credit Balance (=)</option>
            <option value="deduct">Deduct Credits (-)</option>
          </select>
        </div>
        <div class="field" style="margin-bottom: 0;">
          <label class="form-label">Credit Amount</label>
          <div class="reason-presets" style="margin-bottom: 0.5rem;">
            <button type="button" onclick="document.getElementById('cred-amount').value='1'">1 Credit</button>
            <button type="button" onclick="document.getElementById('cred-amount').value='5'">5 Credits</button>
            <button type="button" onclick="document.getElementById('cred-amount').value='10'">10 Credits</button>
            <button type="button" onclick="document.getElementById('cred-amount').value='15'">15 Credits</button>
            <button type="button" onclick="document.getElementById('cred-amount').value='50'">50 Credits</button>
          </div>
          <input type="number" class="form-control" id="cred-amount" value="5" min="0" max="100000" />
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeCreditsModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-cred-submit" onclick="submitCreditsUpdate()"><?= icon('zap', 13) ?><span>Update Credits</span></button>
      </div>
    </div>
  </div>

  <!-- Buy / Top-Up Credits Modal -->
  <div class="modal-overlay" id="modal-buy-credits" style="display: none;" onclick="if (event.target.id === 'modal-buy-credits') closeBuyCreditsModal()">
    <div class="modal-box" style="max-width: 460px;">
      <div class="modal-head">
        <span class="modal-head-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--amber);"><?= icon('zap', 15) ?> Top Up Operator Credits</span>
        <button class="btn btn-sm modal-x" onclick="closeBuyCreditsModal()">✕</button>
      </div>
      <div class="modal-body" style="font-size: 0.82rem; color: var(--text-2); line-height: 1.6;">
        <div class="kv" style="margin-bottom: 0.9rem;">
          <div class="kv-row"><span class="k">Selected Package</span><span class="v" id="buy-pkg-name" style="color: var(--emerald);">Commander Pack — 15 Credits</span></div>
          <div class="kv-row"><span class="k">Your Operator ID</span><span class="v mono" id="buy-op-username">—</span></div>
          <div class="kv-row"><span class="k">Squad Runtime Value</span><span class="badge amber" id="buy-pkg-hours">150 Hours Nonstop</span></div>
        </div>
        <p style="margin-bottom: 0.7rem;">
          Send your <b>Operator Username</b> and selected package to the <b>Super Commander</b> to have your credits credited to your account immediately.
        </p>
        <div style="display: flex; gap: 0.5rem;">
          <input type="text" class="form-control mono" id="buy-order-summary" readonly />
          <button class="btn btn-primary" onclick="copyTextValue('buy-order-summary', 'Order message copied!')"><?= icon('copy', 13) ?><span>Copy</span></button>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeBuyCreditsModal()">Close</button>
      </div>
    </div>
  </div>

  <!-- Ban user -->
  <div class="modal-overlay" id="modal-ban" style="display: none;" onclick="if (event.target.id === 'modal-ban') closeBanModal()">
    <div class="modal-box" style="max-width: 460px;">
      <div class="modal-head">
        <span class="modal-head-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--rose);"><?= icon('ban', 15) ?> Ban operator</span>
        <button class="btn btn-sm modal-x" onclick="closeBanModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="ban-banner"><?= icon('alert', 15) ?><span>You are about to ban <strong id="ban-target-name" style="color: #fff;">user</strong>. They will be signed out immediately and cannot sign in until the ban ends.</span></div>
        <div class="field">
          <label class="form-label">Reason</label>
          <div class="reason-presets" id="ban-presets">
            <button type="button" onclick="pickBanReason(this)">Abusing the system</button>
            <button type="button" onclick="pickBanReason(this)">Account sharing</button>
            <button type="button" onclick="pickBanReason(this)">Payment issue</button>
            <button type="button" onclick="pickBanReason(this)">Spam / bot creation</button>
            <button type="button" onclick="pickBanReason(this)">Security violation</button>
          </div>
          <textarea class="form-control" id="ban-reason" maxlength="200" placeholder="Describe why this operator is being banned (shown to the user)"></textarea>
        </div>
        <div class="field" style="margin-bottom: 0;">
          <label class="form-label">Duration</label>
          <select class="form-control" id="ban-duration">
            <option value="0">Permanent</option>
            <option value="1">1 hour</option>
            <option value="24">24 hours</option>
            <option value="72">3 days</option>
            <option value="168">7 days</option>
            <option value="720">30 days</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" onclick="closeBanModal()">Cancel</button>
        <button class="btn btn-danger" id="btn-ban-confirm" onclick="submitBan()"><?= icon('ban', 13) ?><span>Ban operator</span></button>
      </div>
    </div>
  </div>

  <!-- Generic confirm -->
  <div class="modal-overlay" id="modal-confirm" style="display: none;">
    <div class="modal-box" style="max-width: 400px;">
      <div class="modal-head"><span class="modal-head-title" id="confirm-title">Confirm</span></div>
      <div class="modal-body" style="font-size: 0.82rem; color: var(--text-2); line-height: 1.55;" id="confirm-message"></div>
      <div class="modal-foot">
        <button class="btn" id="confirm-cancel">Cancel</button>
        <button class="btn btn-primary" id="confirm-ok">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Instructions -->
  <div class="modal-overlay" id="modal-instructions" style="display: none;" onclick="closeInstructionsOnOverlay(event)">
    <div class="modal-box" style="max-width: 520px;">
      <div class="modal-head">
        <span class="modal-head-title">How TX999 Glory Works</span>
        <button class="btn btn-sm modal-x" onclick="toggleInstructionsModal()">✕</button>
      </div>
      <div class="modal-body" style="font-size: 0.82rem; color: var(--text-2); line-height: 1.7;">
        <p style="margin-bottom: 0.7rem;"><strong style="color: #fff;">1. Account &amp; Credits:</strong> New operator accounts start with <b>0 Credits</b>. Top up credits in the <em>Pricing &amp; Credits</em> tab.</p>
        <p style="margin-bottom: 0.7rem;"><strong style="color: #fff;">2. Generate Guild Bots (1 Credit):</strong> In <em>Bot Accounts</em>, enter your mandatory <b>Guild ID</b> to forge guest bots that automatically join your guild.</p>
        <p style="margin-bottom: 0.7rem;"><strong style="color: #fff;">3. 10-Hour Nonstop Matchmaking (1 Credit / Squad):</strong> Select your Active Guild and launch. Each squad runs nonstop for <b>10 Hours (10:00:00)</b> with a live countdown timer, automatic dead/offline backup bot replacement, and automatic stop at 10 hours.</p>
        <p><strong style="color: #fff;">4. Guild Analytics &amp; Developer API:</strong> Expand any guild card's member roster on demand, or request <em>Developer API Access</em> from the Super Commander to control your account from your own website.</p>
      </div>
    </div>
  </div>

  <script src="js/dashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>

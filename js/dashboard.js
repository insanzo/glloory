// ─────────────────────────────────────────────────────────────
// GUILD GLORY — OPERATIONS CONSOLE ENGINE
// Sidebar console · skeleton loaders · session-token auth · moderation
// ─────────────────────────────────────────────────────────────

let currentView = 'landing'; // 'landing' | 'dashboard'
let activeConsoleTab = 'overview';
let botPollTimer = null;
let currentAuthMode = 'login'; // 'login' | 'register'
let trackedClansCache = [];
let apiBridgeMode = 'auto'; // 'auto' -> falls back to /api.php on 404
let cachedAccountsList = [];
let vpsLogPollingInterval = null;
let auditPollInterval = null;
let authFailureHandled = false;
let countdownTickTimer = null;
let liveMatchExpiresAt = null;
let liveMatchRunning = false;
const expandedGuildMembers = new Set();

const ADMIN_TABS = ['superadmin', 'logs'];
const loaded = { stats: false, clans: false, accounts: false, status: false, users: false, audit: false };
const guildInfoCache = {}; // clan_id -> { data, ts }
const GUILD_REFRESH_MS = 25000;

const $ = (id) => document.getElementById(id);

// ── ICONS (for dynamic markup) ──
const ICON = {
  star: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  terminal: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  ban: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  pause: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  play: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  trash: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

// ── HELPERS ──
function setText(id, text) {
  const el = $(id);
  if (el) el.innerText = text;
}

// Set a stat value and drop its skeleton shimmer
function setStat(id, text) {
  const el = $(id);
  if (!el) return;
  el.innerText = text;
  el.classList.remove('is-loading');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString();
}

function fmtUntil(ts) {
  const t = Number(ts) || 0;
  return t > 0 ? new Date(t * 1000).toLocaleString() : '';
}

function fmtCountdownHMS(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function tickSquadCountdowns() {
  if (!liveMatchRunning || !liveMatchExpiresAt) {
    setText('match-stat-timer', '10h 00m 00s');
    return;
  }
  const nowSec = Date.now() / 1000;
  const rem = Math.max(0, Math.round(liveMatchExpiresAt - nowSec));
  if (rem <= 0) {
    liveMatchRunning = false;
    liveMatchExpiresAt = null;
    setText('match-stat-timer', '10h 00m 00s (EXPIRED)');
    setText('m-live-uptime', 'SESSION EXPIRED');
    document.querySelectorAll('.js-squad-countdown').forEach(el => {
      el.innerText = `⏱️ 10H EXPIRED`;
    });
    const stateBadge = $('m-live-state-badge');
    if (stateBadge) {
      stateBadge.className = 'badge rose';
      stateBadge.innerText = '10H EXPIRED';
    }
    return;
  }
  const formatted = `${fmtCountdownHMS(rem)} left`;
  setText('match-stat-timer', formatted);
  setText('m-live-uptime', formatted);
  document.querySelectorAll('.js-squad-countdown').forEach(el => {
    const exp = Number(el.dataset.expires) || 0;
    if (exp > 0) {
      const sRem = Math.max(0, Math.round(exp - nowSec));
      if (sRem <= 0) {
        el.innerText = `⏱️ 10H EXPIRED`;
      } else {
        el.innerText = `⏳ ${fmtCountdownHMS(sRem)} left`;
      }
    }
  });
}

// ── SKELETON TEMPLATES ──
function skTableRows(cols, rows = 4) {
  const widths = ['w-60', 'w-75', 'w-50', 'w-40', 'w-60', 'w-30'];
  let html = '';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td><div class="sk sk-line ${widths[(c + r) % widths.length]}"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

function skListRows(n = 3) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="sk-row"><div class="sk sk-line w-40"></div><div style="flex:1"></div><div class="sk sk-pill"></div></div>`;
  }
  return html;
}

function skGuildCardInner() {
  return `
    <div class="guild-head">
      <div style="flex: 1; min-width: 200px;">
        <div class="sk sk-line w-30"></div>
        <div class="sk sk-line xl w-50" style="margin-top: 12px;"></div>
      </div>
      <div class="glory-boxes">
        <div class="sk" style="width: 170px; height: 64px; border-radius: 6px;"></div>
        <div class="sk" style="width: 170px; height: 64px; border-radius: 6px;"></div>
      </div>
    </div>
    <div class="table-wrap"><table class="table"><tbody>${skTableRows(5, 3)}</tbody></table></div>`;
}

function skSquads(n = 1) {
  let html = '';
  for (let s = 0; s < n; s++) {
    html += `
      <div class="squad">
        <div class="squad-head">
          <div class="squad-title"><div class="sk sk-line lg" style="width: 150px;"></div><div class="sk sk-pill"></div><div class="sk sk-pill"></div></div>
          <div class="sk sk-pill"></div>
        </div>
        <div class="bot-list">
          ${[0, 1, 2, 3].map(() => `
            <div class="bot-row">
              <div class="bot-id"><div class="sk sk-pill" style="width: 54px;"></div><div class="sk sk-line w-50"></div></div>
              <div class="sk sk-line w-60"></div>
              <div class="sk sk-line w-60"></div>
              <div class="sk sk-pill" style="justify-self: end; width: 96px;"></div>
            </div>`).join('')}
        </div>
      </div>`;
  }
  return html;
}

// Fill every data container with skeletons until its first payload arrives
function showSkeletons() {
  if (!loaded.stats) {
    ['m-total-acc', 'm-in-clans', 'm-homer-status', 'm-chase-status'].forEach(id => $(id)?.classList.add('is-loading'));
  }
  if (!loaded.clans) {
    const ov = $('overview-clan-list-box');
    if (ov) ov.innerHTML = skListRows(3);
    const ag = $('auto-guilds-container');
    if (ag) ag.innerHTML = `<div class="card">${skGuildCardInner()}</div>`;
  }
  if (!loaded.accounts) {
    const tb = $('accounts-tbody');
    if (tb) tb.innerHTML = skTableRows(8, 5);
    const sq = $('live-squads-container');
    if (sq) sq.innerHTML = skSquads(1);
  }
}

// ── API LAYER ──
function phpUrl(cleanPath) {
  const idx = cleanPath.indexOf('?');
  const base = idx === -1 ? cleanPath : cleanPath.slice(0, idx);
  const qs = idx === -1 ? '' : cleanPath.slice(idx + 1);
  return `/api.php?endpoint=${base}${qs ? '&' + qs : ''}`;
}

// Smart API request: session token + operator header, Hostinger fallback
async function apiRequest(path, options = {}) {
  const cleanPath = path.replace(/^\/?api\/?/, '');
  const op = getLoggedInOperator();
  options.headers = Object.assign({}, options.headers || {});
  if (op && op.username) options.headers['X-Operator'] = op.username;
  if (op && op.token) options.headers['X-Token'] = op.token;

  let res;
  if (apiBridgeMode === 'php') {
    res = await fetch(phpUrl(cleanPath), options);
  } else {
    try {
      res = await fetch(`/api/${cleanPath}`, options);
      if (res.status === 404) {
        apiBridgeMode = 'php';
        res = await fetch(phpUrl(cleanPath), options);
      }
    } catch (err) {
      apiBridgeMode = 'php';
      res = await fetch(phpUrl(cleanPath), options);
    }
  }
  return guardResponse(res, cleanPath);
}

// Expired session / ban detected on any authenticated call -> sign out cleanly
async function guardResponse(res, path) {
  if (res.status !== 401 && res.status !== 403) return res;
  if (path.startsWith('user/login') || path.startsWith('user/register')) return res;
  try {
    const j = await res.clone().json();
    if (j && j.code === 'BANNED') forceLogout(j);
    else if (j && j.code === 'AUTH_REQUIRED') forceLogout({ code: 'AUTH_REQUIRED' });
  } catch (e) {}
  return res;
}

function banMessageFrom(info) {
  const until = fmtUntil(info.until);
  return `Reason: ${info.reason || 'Violation of platform rules'}. ` + (until ? `Ban expires ${until}.` : 'This ban is permanent.');
}

function forceLogout(info) {
  if (authFailureHandled) return;
  authFailureHandled = true;
  localStorage.removeItem('gg_operator');
  cachedAccountsList = [];
  Object.keys(loaded).forEach(k => (loaded[k] = false));
  initOperatorSession();
  navigateTo('landing');
  if (info && info.code === 'BANNED') {
    confirmDialog({ title: 'Account banned', message: banMessageFrom(info), okLabel: 'Understood', danger: true, hideCancel: true });
  } else {
    showToast('Session expired — please sign in again', 'error');
  }
  setTimeout(() => { authFailureHandled = false; }, 1500);
}

// ── DOM READY ──
let lastStatusPollTimestamp = Date.now();

document.addEventListener('DOMContentLoaded', () => {
  initFeedbackTrain();
  initOperatorSession();
  restoreOperatorPreferences();
  botPollTimer = setInterval(() => {
    if (currentView === 'dashboard' && !document.hidden && getLoggedInOperator()) pollBotStatus();
  }, 1500);
  countdownTickTimer = setInterval(() => {
    if (currentView === 'dashboard' && !document.hidden) tickSquadCountdowns();
  }, 1000);
  if (getLoggedInOperator()) {
    refreshUserCredits();
    navigateTo('dashboard');
  }
});

// ── PER-OPERATOR FRONTEND PERSISTENCE (BOT OWNERSHIP, SETTINGS, SQUAD MATCHES) ──
function getOperatorStorageKey(prefix) {
  const op = getLoggedInOperator();
  const uname = (op && op.username) ? op.username.trim().toLowerCase() : 'guest';
  return `${prefix}_${uname}`;
}

function saveOperatorPreferences() {
  const op = getLoggedInOperator();
  if (!op || !op.username) return;
  const prefs = {
    targetMode: $('bot-target-mode')?.value || 'clan',
    selectedClan: $('bot-select-clan')?.value || '',
    modeDuo: $('bot-mode-duo')?.value || 'false',
    rounds: $('bot-rounds-select')?.value || '1',
    homerEnable: $('cfg-homer-enable')?.value || 'true',
    homerCd: $('cfg-homer-cd')?.value || '90.0',
    chaseEnable: $('cfg-chase-enable')?.value || 'true',
    chaseDist: $('cfg-chase-dist')?.value || '150.0'
  };
  try {
    localStorage.setItem(getOperatorStorageKey('gg_prefs'), JSON.stringify(prefs));
  } catch (e) {}
}

function restoreOperatorPreferences() {
  const op = getLoggedInOperator();
  if (!op || !op.username) return;
  try {
    const raw = localStorage.getItem(getOperatorStorageKey('gg_prefs'));
    if (!raw) return;
    const prefs = JSON.parse(raw);
    const tm = $('bot-target-mode');
    if (tm && prefs.targetMode) {
      tm.value = prefs.targetMode;
      toggleBotTargetMode();
    }
    const md = $('bot-mode-duo');
    if (md && prefs.modeDuo !== undefined) md.value = prefs.modeDuo;
    const rnd = $('bot-rounds-select');
    if (rnd && prefs.rounds !== undefined) rnd.value = prefs.rounds;
    const he = $('cfg-homer-enable');
    if (he && prefs.homerEnable !== undefined) he.value = prefs.homerEnable;
    const hc = $('cfg-homer-cd');
    if (hc && prefs.homerCd !== undefined) hc.value = prefs.homerCd;
    const ce = $('cfg-chase-enable');
    if (ce && prefs.chaseEnable !== undefined) ce.value = prefs.chaseEnable;
    const cd = $('cfg-chase-dist');
    if (cd && prefs.chaseDist !== undefined) cd.value = prefs.chaseDist;
  } catch (e) {}
}

function saveBotOwnershipCache(accounts) {
  try {
    const map = {};
    (accounts || []).forEach(a => {
      if (a.uid) {
        map[a.uid] = {
          uid: a.uid,
          name: a.name || 'Bot',
          owner: a.owner || (getLoggedInOperator()?.username || 'Operator'),
          clan_id: a.clan_id || null
        };
      }
    });
    localStorage.setItem(getOperatorStorageKey('gg_bot_owners'), JSON.stringify(map));
  } catch (e) {}
}

function syncSquadMatchCounts(serverCounts) {
  try {
    const key = getOperatorStorageKey('gg_squad_matches');
    const localRaw = localStorage.getItem(key);
    const merged = localRaw ? JSON.parse(localRaw) : {};
    if (serverCounts && typeof serverCounts === 'object') {
      Object.keys(serverCounts).forEach(uid => {
        const srvVal = parseInt(serverCounts[uid]) || 0;
        if (srvVal > (merged[uid] || 0)) {
          merged[uid] = srvVal;
        }
      });
    }
    localStorage.setItem(key, JSON.stringify(merged));
    return merged;
  } catch (e) {
    return serverCounts || {};
  }
}

function getSquadMatchCount(masterUid) {
  try {
    const raw = localStorage.getItem(getOperatorStorageKey('gg_squad_matches'));
    if (!raw) return 0;
    const map = JSON.parse(raw);
    return parseInt(map[String(masterUid)]) || 0;
  } catch (e) {
    return 0;
  }
}

// ── TOASTS & DIALOGS ──
function showToast(message, type = 'success') {
  const container = $('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-sharp ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '!'}</span><div>${escapeHtml(message)}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function confirmDialog({ title = 'Confirm', message = '', okLabel = 'Confirm', danger = false, hideCancel = false } = {}) {
  return new Promise(resolve => {
    const modal = $('modal-confirm');
    const ok = $('confirm-ok');
    const cancel = $('confirm-cancel');
    $('confirm-title').innerText = title;
    $('confirm-message').innerText = message;
    ok.innerText = okLabel;
    ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    cancel.style.display = hideCancel ? 'none' : '';
    const done = (v) => {
      modal.style.display = 'none';
      ok.onclick = null;
      cancel.onclick = null;
      resolve(v);
    };
    ok.onclick = () => done(true);
    cancel.onclick = () => done(false);
    modal.style.display = 'flex';
  });
}

// ── NAVIGATION & VIEWS ──
function toggleSidebar() {
  $('sidebar')?.classList.toggle('open');
}

function closeSidebar() {
  $('sidebar')?.classList.remove('open');
}

function navigateTo(view) {
  if (view === 'features') {
    $('view-landing').style.display = 'block';
    $('view-dashboard').style.display = 'none';
    document.body.classList.remove('in-dashboard');
    const el = $('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (view === 'dashboard' && !getLoggedInOperator()) {
    openAuthModal('login');
    return;
  }

  currentView = view;
  const landing = $('view-landing');
  const dash = $('view-dashboard');

  if (view === 'dashboard') {
    landing.style.display = 'none';
    dash.style.display = 'block';
    document.body.classList.add('in-dashboard');
    if (ADMIN_TABS.includes(activeConsoleTab) && !isSuperCommander()) activeConsoleTab = 'overview';
    showSkeletons();
    switchConsoleTab(activeConsoleTab, true);
    refreshAll();
    if (ADMIN_TABS.includes(activeConsoleTab)) loadTabData(activeConsoleTab);
  } else {
    landing.style.display = 'block';
    dash.style.display = 'none';
    document.body.classList.remove('in-dashboard');
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggleInstructionsModal() {
  const modal = $('modal-instructions');
  if (modal) modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

function closeInstructionsOnOverlay(e) {
  if (e.target.id === 'modal-instructions') toggleInstructionsModal();
}

function launchConsoleAction() {
  if (!getLoggedInOperator()) openAuthModal('login');
  else navigateTo('dashboard');
}

function scrollToLandingPricing() {
  if (currentView === 'dashboard') {
    switchConsoleTab('pricing');
    return;
  }
  const el = $('landing-pricing-section');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function handleBuyCreditsClick(pkgLabel) {
  const op = getLoggedInOperator();
  if (!op || !op.username) {
    openAuthModal('login');
    showToast('Please sign in to your account first to purchase credits.', 'error');
    return;
  }
  navigateTo('dashboard');
  switchConsoleTab('pricing');
  const m = String(pkgLabel || '').match(/(\d+)/);
  const creditsAmt = m ? parseInt(m[1], 10) : 15;
  openBuyCreditsModal(pkgLabel || 'Commander Pack — 15 Credits', creditsAmt);
}

function openBuyCreditsModal(pkgLabel, creditsAmt = 15) {
  const op = getLoggedInOperator();
  if (!op || !op.username) {
    openAuthModal('login');
    showToast('Please sign in first to purchase credits.', 'error');
    return;
  }
  setText('buy-pkg-name', pkgLabel);
  setText('buy-op-username', op.username);
  setText('buy-pkg-hours', `${creditsAmt * 10} Hours Nonstop (${creditsAmt} Squads)`);
  const summaryEl = $('buy-order-summary');
  if (summaryEl) {
    summaryEl.value = `TX999 CREDIT TOP-UP | Operator: ${op.username} | Package: ${pkgLabel} (${creditsAmt} Credits)`;
  }
  const modal = $('modal-buy-credits');
  if (modal) modal.style.display = 'flex';
}

function closeBuyCreditsModal() {
  const modal = $('modal-buy-credits');
  if (modal) modal.style.display = 'none';
}

function copyTextValue(inputId, msg = 'Copied to clipboard!') {
  const el = $(inputId);
  if (!el || !el.value) return;
  try {
    navigator.clipboard.writeText(el.value);
    showToast(msg, 'success');
  } catch (e) {
    el.select();
    document.execCommand('copy');
    showToast(msg, 'success');
  }
}

function stopTabTimers() {
  if (vpsLogPollingInterval) { clearInterval(vpsLogPollingInterval); vpsLogPollingInterval = null; }
  if (auditPollInterval) { clearInterval(auditPollInterval); auditPollInterval = null; }
}

function loadTabData(tabId) {
  if (tabId === 'bot') pollBotStatus();
  if (tabId === 'clan') loadTrackedClans();
  if (tabId === 'accounts') loadAccounts();
  if (tabId === 'pricing' || tabId === 'apidocs') refreshUserCredits();
  if (tabId === 'settings') loadConfig();
  if (tabId === 'superadmin') refreshSuperAdminData();
  if (tabId === 'logs') {
    refreshLogsPane();
    vpsLogPollingInterval = setInterval(() => { if (!enginePaused && !document.hidden) fetchVPSEngineLogs(); }, 2500);
    auditPollInterval = setInterval(() => { if (!document.hidden) fetchAuditLogs(); }, 15000);
  }
}

function switchConsoleTab(tabId, skipLoad = false) {
  if (ADMIN_TABS.includes(tabId) && !isSuperCommander()) {
    showToast('Access denied: Super Commander authorization required', 'error');
    tabId = 'overview';
  }
  activeConsoleTab = tabId;
  stopTabTimers();

  document.querySelectorAll('.nav-item[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.console-pane').forEach(p => (p.style.display = 'none'));
  const pane = $(`cpane-${tabId}`);
  if (pane) pane.style.display = 'block';

  closeSidebar();
  window.scrollTo({ top: 0 });
  if (!skipLoad) loadTabData(tabId);
}

// ── AUTHENTICATION & USER SESSIONS ──
function getLoggedInOperator() {
  try {
    const raw = localStorage.getItem('gg_operator');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isSuperCommander() {
  const op = getLoggedInOperator();
  if (!op || !op.username) return false;
  const u = op.username.toLowerCase();
  return op.role === 'Super Commander' && (u === 'rohan' || u === 'admin');
}

function getOperatorCredits() {
  if (isSuperCommander()) return 999999;
  const op = getLoggedInOperator();
  return Math.max(0, parseInt(op?.credits ?? 0, 10) || 0);
}

function setOperatorCredits(newCredits) {
  const op = getLoggedInOperator();
  if (!op) return;
  if (!isSuperCommander() && newCredits !== undefined && newCredits !== null) {
    op.credits = Math.max(0, parseInt(newCredits, 10) || 0);
    localStorage.setItem('gg_operator', JSON.stringify(op));
  }
  updateOperatorCreditsUI();
}

function updateOperatorCreditsUI() {
  const op = getLoggedInOperator();
  if (!op || !op.username) return;
  const isSuper = isSuperCommander();
  const credits = isSuper ? '∞' : String(Math.max(0, parseInt(op.credits ?? 0, 10) || 0));
  const apiEnabled = isSuper || !!op.api_enabled;
  const apiKey = op.api_key || '';

  setText('header-credits-txt', `CREDITS: ${credits}`);
  setText('nav-credits-badge', credits);
  setText('m-user-credits', credits);
  setText('pricing-balance-val', isSuper ? '∞ UNLIMITED' : `${credits} Credits`);
  setText('pricing-balance-sub', isSuper ? 'Super Commander account has unlimited credits' : '1 Credit = 1 Squad (10h Nonstop) or Generate Bot IDs');

  const navApiBadge = $('nav-api-badge');
  if (navApiBadge) {
    navApiBadge.innerText = apiEnabled ? 'ACTIVE' : 'LOCKED';
    navApiBadge.style.color = apiEnabled ? 'var(--emerald)' : '';
  }

  const ovApiBadge = $('ov-api-status-badge');
  if (ovApiBadge) {
    ovApiBadge.className = `badge ${apiEnabled ? 'emerald' : 'dim'}`;
    ovApiBadge.innerText = apiEnabled ? 'API ENABLED' : 'LOCKED';
  }

  // Developer API & Docs pane: show ONLY lock card when locked; show full docs ONLY when enabled
  setText('apidocs-locked-username', op.username);
  const lockedCard = $('apidocs-locked-card');
  const unlockedWrap = $('apidocs-unlocked-wrap');
  const baseUrlInput = $('apidocs-base-url');
  const keyInput = $('apidocs-key-input');
  const copyBtn = $('btn-copy-apikey');
  const regenBtn = $('btn-regen-apikey');
  const originBase = `${window.location.origin}/api/v1`;

  if (apiEnabled) {
    if (lockedCard) lockedCard.style.display = 'none';
    if (unlockedWrap) unlockedWrap.style.display = 'block';
    if (baseUrlInput) baseUrlInput.value = originBase;
    if (keyInput) keyInput.value = apiKey || 'Click Rotate to generate your key';
    if (copyBtn) copyBtn.disabled = !apiKey;
    if (regenBtn) regenBtn.disabled = false;

    const sampleKey = apiKey || 'tx999_live_YOUR_API_KEY';
    const curlEl = $('apidocs-curl-example');
    if (curlEl) {
      curlEl.innerText = `curl -X POST "${originBase}/match/start" \\\n  -H "X-API-Key: ${sampleKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "clan_id": "3055983375",\n    "use_duo": false\n  }'`;
    }
    const jsEl = $('apidocs-js-example');
    if (jsEl) {
      jsEl.innerText = `const API_BASE = "${originBase}";\nconst API_KEY  = "${sampleKey}";\n\n// Check live 10-hour squad countdown & bot status\nconst res = await fetch(\`\${API_BASE}/match/status\`, {\n  headers: { "X-API-Key": API_KEY }\n});\nconst { data } = await res.json();\nconsole.log("Remaining 10h seconds:", data.remaining_seconds, data.squads);`;
    }
  } else {
    if (lockedCard) lockedCard.style.display = 'block';
    if (unlockedWrap) unlockedWrap.style.display = 'none';
    if (baseUrlInput) baseUrlInput.value = '';
    if (keyInput) keyInput.value = '';
    const curlEl = $('apidocs-curl-example');
    if (curlEl) curlEl.innerText = '';
    const jsEl = $('apidocs-js-example');
    if (jsEl) jsEl.innerText = '';
  }
}

async function refreshUserCredits() {
  const op = getLoggedInOperator();
  if (!op || !op.username) return;
  try {
    const res = await apiRequest('user/me');
    const json = await res.json();
    if (json.success && json.user) {
      const merged = Object.assign({}, op, json.user);
      localStorage.setItem('gg_operator', JSON.stringify(merged));
      updateOperatorCreditsUI();
    }
  } catch (e) {}
}

async function regeneratePersonalApiKey() {
  const ok = await confirmDialog({
    title: 'Rotate Developer API Key',
    message: 'Generating a new API key will immediately invalidate your previous key. Continue?',
    okLabel: 'Rotate Key'
  });
  if (!ok) return;
  try {
    const res = await apiRequest('user/api-key/regenerate', { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to rotate API key');
    const op = getLoggedInOperator() || {};
    op.api_key = json.api_key;
    op.api_enabled = true;
    localStorage.setItem('gg_operator', JSON.stringify(op));
    updateOperatorCreditsUI();
    showToast('New Developer API Key generated!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAdminNav(show) {
  const slot = $('nav-admin-slot');
  if (!slot) return;
  if (!show) {
    slot.innerHTML = '';
    delete slot.dataset.ready;
    return;
  }
  if (slot.dataset.ready) return;
  slot.innerHTML = `
    <div class="nav-section">
      <div class="nav-label">Administration</div>
      <button class="nav-item admin ${activeConsoleTab === 'superadmin' ? 'active' : ''}" data-tab="superadmin" onclick="switchConsoleTab('superadmin')">${ICON.star}<span>Command Center</span></button>
      <button class="nav-item admin ${activeConsoleTab === 'logs' ? 'active' : ''}" data-tab="logs" onclick="switchConsoleTab('logs')">${ICON.terminal}<span>Activity Logs</span></button>
    </div>`;
  slot.dataset.ready = '1';
}

function initOperatorSession() {
  const op = getLoggedInOperator();
  const authContainer = $('auth-buttons-container');
  const profileBox = $('operator-profile-box');
  const heroText = $('hero-action-text');

  if (op && op.username) {
    if (authContainer) authContainer.style.display = 'none';
    if (profileBox) profileBox.style.display = 'flex';
    setText('operator-username', op.username);
    setText('side-username', op.username);
    setText('side-avatar', op.username.charAt(0));
    const isSuper = isSuperCommander();
    const roleEl = $('side-role');
    if (roleEl) {
      roleEl.innerText = isSuper ? 'Super Commander' : (op.role || 'Member');
      roleEl.className = `user-role ${isSuper ? 'super' : ''}`;
    }
    if (heroText) heroText.innerText = 'Open Console';
    renderAdminNav(isSuper);
    updateOperatorCreditsUI();
    if (!isSuper && ADMIN_TABS.includes(activeConsoleTab)) switchConsoleTab('overview', true);
  } else {
    if (authContainer) authContainer.style.display = 'flex';
    if (profileBox) profileBox.style.display = 'none';
    if (heroText) heroText.innerText = 'User Sign In';
    renderAdminNav(false);
    if (ADMIN_TABS.includes(activeConsoleTab)) activeConsoleTab = 'overview';
  }
}

function openAuthModal(mode = 'login') {
  setAuthMode(mode);
  $('modal-auth').style.display = 'flex';
}

function closeAuthModal() {
  $('modal-auth').style.display = 'none';
}

function closeModalOnOverlay(e) {
  if (e.target.id === 'modal-auth') closeAuthModal();
}

function setAuthMode(mode) {
  currentAuthMode = mode;
  const isReg = mode === 'register';
  $('atab-login').classList.toggle('active', !isReg);
  $('atab-register').classList.toggle('active', isReg);
  $('group-email').style.display = isReg ? 'block' : 'none';
  $('auth-email').required = isReg;
  $('group-confirm-pass').style.display = isReg ? 'block' : 'none';
  $('password-strength-hint').style.display = isReg ? 'block' : 'none';
  $('auth-modal-title').innerText = isReg ? 'Create account' : 'Sign in';
  $('btn-auth-submit').innerText = isReg ? 'Register' : 'Sign In';
  const notice = $('auth-ban-notice');
  if (notice) notice.style.display = 'none';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const username = $('auth-username').value.trim();
  const password = $('auth-password').value.trim();
  const notice = $('auth-ban-notice');
  if (notice) notice.style.display = 'none';
  let email = '';

  if (currentAuthMode === 'register') {
    email = $('auth-email')?.value.trim() || '';
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address (e.g. name@gmail.com)', 'error');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      showToast('Password must be at least 8 characters with letters & numbers', 'error');
      return;
    }
    if (password !== $('auth-confirm-password').value.trim()) {
      showToast('Passwords do not match', 'error');
      return;
    }
  }

  const endpoint = currentAuthMode === 'register' ? 'user/register' : 'user/login';
  const submitBtn = $('btn-auth-submit');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Verifying…';

  try {
    const payload = currentAuthMode === 'register' ? { email, username, password } : { username, password };
    const res = await apiRequest(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (!json.success) {
      if (json.banned && notice) {
        notice.innerHTML = `<span>${escapeHtml(json.error)}</span>`;
        notice.style.display = 'flex';
        return;
      }
      throw new Error(json.error || 'Authentication failed');
    }

    localStorage.setItem('gg_operator', JSON.stringify(json.user));
    cachedAccountsList = [];
    Object.keys(loaded).forEach(k => (loaded[k] = false));
    initOperatorSession();
    restoreOperatorPreferences();
    closeAuthModal();
    showToast(`Welcome, ${json.user.username}`, 'success');
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = currentAuthMode === 'register' ? 'Register' : 'Sign In';
  }
}

async function logoutOperator() {
  try { await apiRequest('user/logout', { method: 'POST' }); } catch (e) {}
  localStorage.removeItem('gg_operator');
  cachedAccountsList = [];
  Object.keys(loaded).forEach(k => (loaded[k] = false));
  stopTabTimers();
  initOperatorSession();
  showToast('Signed out');
  navigateTo('landing');
}

// ── MASTER DATA REFRESH ──
async function refreshAll(force = false) {
  if (!getLoggedInOperator()) return;
  await Promise.allSettled([
    refreshUserCredits(),
    loadStats(),
    pollBotStatus(),
    loadTrackedClans(force),
    loadAccounts()
  ]);
}

// ── 1. STATS TELEMETRY ──
async function loadStats() {
  try {
    const res = await apiRequest('stats');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed');

    const d = json.data;
    loaded.stats = true;
    setStat('m-total-acc', d.total_accounts);
    setText('m-active-acc', d.active_accounts);
    setText('m-offline-acc', d.offline_accounts);
    setStat('m-in-clans', d.accounts_in_clans);
    setText('m-avail-acc', d.available_accounts);
    setStat('m-homer-status', d.homer_skill_enabled ? 'ACTIVE' : 'OFFLINE');
    setText('m-homer-cd', `${d.homer_cooldown}s`);
    setStat('m-chase-status', d.chase_enemies ? 'ENGAGED' : 'STANDBY');

    const dot = $('header-conn-dot');
    if (dot) dot.className = 'pulse-dot online';
    setText('header-conn-txt', 'NODE ONLINE');
  } catch (err) {
    const dot = $('header-conn-dot');
    if (dot) dot.className = 'pulse-dot rose';
    setText('header-conn-txt', 'NODE OFFLINE');
    ['m-total-acc', 'm-in-clans', 'm-homer-status', 'm-chase-status'].forEach(id => {
      const el = $(id);
      if (el && el.classList.contains('is-loading')) setStat(id, '—');
    });
  }
}

// ── 2. BOT RUNNER & LIVE EXECUTION ──
async function pollBotStatus() {
  if (!getLoggedInOperator()) return;
  try {
    const res = await apiRequest('bot/status');
    const json = await res.json();
    if (!json.success) return;

    const b = json.data;
    const isRunning = b.is_running;
    loaded.status = true;

    const bDot = $('header-bot-dot');
    const killBtn = $('dash-killswitch');
    const startBtn = $('btn-start-bot');
    const stopBtn = $('btn-stop-bot');
    const lockedPill = $('bot-running-locked-pill');
    const liveBadge = $('nav-live-badge');
    const isSuper = isSuperCommander();

    if (isRunning) {
      if (bDot) bDot.className = 'pulse-dot busy';
      setText('header-bot-txt', `ENGINE · R${b.current_round}`);
      if (killBtn) killBtn.style.display = isSuper ? 'inline-flex' : 'none';
      if (startBtn) {
        startBtn.style.display = isSuper ? 'inline-flex' : 'none';
        startBtn.innerHTML = `<span>+ Launch Additional Squad</span>`;
      }
      if (stopBtn) {
        stopBtn.style.display = isSuper ? 'inline-flex' : 'none';
        stopBtn.innerHTML = `<span>Stop All Squads</span>`;
      }
      if (lockedPill) lockedPill.style.display = isSuper ? 'none' : 'inline-flex';
      if (liveBadge) liveBadge.classList.remove('hidden');
    } else {
      if (bDot) bDot.className = 'pulse-dot';
      setText('header-bot-txt', 'ENGINE: IDLE');
      if (killBtn) killBtn.style.display = 'none';
      if (startBtn) {
        startBtn.style.display = 'inline-flex';
        startBtn.innerHTML = `<span>▶ Launch Automated Loop</span>`;
      }
      if (stopBtn) stopBtn.style.display = 'none';
      if (lockedPill) lockedPill.style.display = 'none';
      if (liveBadge) liveBadge.classList.add('hidden');
    }

    const livePulseBadge = $('match-live-pulse-badge');
    if (livePulseBadge) {
      if (isRunning) {
        const st = (b.state || 'LOGGING IN').toUpperCase();
        const badgeColor = st.includes('IN GAME') ? 'emerald' : (st.includes('TEAM') || st.includes('MATCH') || st.includes('UDP') || st.includes('ARENA') ? 'cyan' : 'amber');
        livePulseBadge.className = `badge ${badgeColor}`;
        livePulseBadge.innerHTML = `<span class="pulse-dot ${badgeColor === 'emerald' ? 'online' : 'busy'}"></span> ${escapeHtml(b.state || 'LOGGING IN')}`;
      } else {
        livePulseBadge.className = 'badge dim';
        livePulseBadge.innerText = 'STANDBY';
      }
    }

    const roundTxt = `${b.current_round}`;
    setText('match-stat-round', roundTxt);
    setText('match-stat-uptime', `${b.uptime_seconds}s`);
    setText('match-stat-bots', b.active_accounts_count || 0);

    liveMatchRunning = !!isRunning;
    if (isRunning) {
      if (b.expires_at) {
        liveMatchExpiresAt = Number(b.expires_at);
      } else if (b.remaining_seconds) {
        liveMatchExpiresAt = (Date.now() / 1000) + Number(b.remaining_seconds);
      } else {
        liveMatchExpiresAt = (Date.now() / 1000) + Math.max(0, 36000 - Number(b.uptime_seconds || 0));
      }
      if (liveMatchExpiresAt && (Date.now() / 1000) >= liveMatchExpiresAt) {
        liveMatchRunning = false;
        liveMatchExpiresAt = null;
        setText('match-stat-timer', '10h 00m 00s (EXPIRED)');
        setText('m-live-uptime', 'SESSION EXPIRED');
      } else {
        tickSquadCountdowns();
      }
    } else {
      liveMatchExpiresAt = null;
      setText('match-stat-timer', '10h 00m 00s');
      setText('m-live-uptime', '--:--:--');
    }

    const stateBadge = $('m-live-state-badge');
    if (stateBadge) {
      stateBadge.className = isRunning ? 'badge emerald' : 'badge dim';
      stateBadge.innerText = isRunning ? (b.state || 'MATCH RUNNING') : 'IDLE';
    }

    setText('m-live-target', isRunning ? `Guild ${b.clan_id || 'Active'} (${b.clan_name || '10h Squad'})` : 'None');
    setText('m-live-rounds', roundTxt);
    setText('m-live-completed', b.rounds_completed);

    lastStatusPollTimestamp = Date.now();
    if (b.squad_match_counts) syncSquadMatchCounts(b.squad_match_counts);

    renderLiveSquadsMatrix(b);
  } catch (err) {}
}

function getBotBadgeClass(stateStr) {
  const s = (stateStr || '').toUpperCase();
  if (s.includes('GUILD FULL') || s.includes('LIMIT REACHED') || s.includes('CANNOT JOIN') || s.includes('MAX GUILD')) return 'rose';
  if (s.includes('IN GAME') || s.includes('IN MATCH')) return 'emerald';
  if (s.includes('DOWN') || s.includes('REJECTED') || s.includes('ERROR') || s.includes('ELIMINATED')) return 'rose';
  if (s.includes('TEAM') || s.includes('MATCH') || s.includes('UDP') || s.includes('ARENA') || s.includes('SQUAD')) return 'cyan';
  return 'amber';
}

function formatBotDisplayState(rawState) {
  const s = (rawState || 'LOGGING IN').toUpperCase();
  if (s.includes('GUILD FULL') || s.includes('LIMIT REACHED')) return 'GUILD FULL (LIMIT REACHED)';
  if (s.includes('CANNOT JOIN')) return 'CANNOT JOIN: GUILD MAX';
  if (s.includes('IN GAME')) {
    if (s.includes('HUNTING')) return 'IN MATCH · HUNTING';
    if (s.includes('BUY')) return 'IN MATCH · BUY';
    return 'IN MATCH';
  }
  return rawState || 'LOGGING IN';
}

const BOT_HEAD_ROW = `<div class="bot-head-row"><span>Bot</span><span>Target</span><span>Last check</span><span class="ta-r">State</span></div>`;

function botRowHtml(bot, bIndex, live) {
  const role = bIndex === 0
    ? '<span class="bot-role master">★ MASTER</span>'
    : `<span class="bot-role">SLAVE ${bIndex}</span>`;

  let targetCell, pingCell, stateCell;
  if (live) {
    const rawState = bot.state || 'LOGGING IN';
    const isInMatch = rawState.toUpperCase().includes('IN GAME') || rawState.toUpperCase().includes('IN MATCH');
    const bBadge = getBotBadgeClass(rawState);
    const hasTarget = !!bot.target_enemy;
    const targetLabel = hasTarget
      ? `${bot.target_enemy}${bot.target_dist ? ' · ' + bot.target_dist : ''}`
      : (isInMatch ? 'Scanning arena…' : '—');
    const hasPing = bot.last_ping_sec !== undefined && bot.last_ping_sec !== null;
    const pingVal = hasPing ? `${Number(bot.last_ping_sec).toFixed(1)}s ago` : 'no data';
    const stale = hasPing && Number(bot.last_ping_sec) > 12;
    targetCell = `<div class="bot-cell"><span class="lbl">Target</span><span class="val ${hasTarget ? 'hot' : ''}">${escapeHtml(targetLabel)}</span></div>`;
    pingCell = `<div class="bot-cell"><span class="lbl">Check</span><span class="val ${stale ? 'hot' : ''}">${pingVal}</span></div>`;
    stateCell = `<span class="badge ${bBadge} bot-state"><span class="pulse-dot ${bBadge === 'emerald' ? 'online' : (bBadge === 'rose' ? 'rose' : 'busy')}"></span>${escapeHtml(formatBotDisplayState(rawState))}</span>`;
  } else {
    targetCell = `<div class="bot-cell"><span class="lbl">Target</span><span class="val dim">—</span></div>`;
    pingCell = `<div class="bot-cell"><span class="lbl">Check</span><span class="val dim">—</span></div>`;
    stateCell = `<span class="badge dim bot-state">NOT IN MATCH</span>`;
  }

  return `
    <div class="bot-row">
      <div class="bot-id">
        ${role}
        <div style="min-width: 0;">
          <div class="bot-name">${escapeHtml(bot.name || 'Bot')}</div>
          <div class="bot-uid">UID ${escapeHtml(bot.uid)}</div>
        </div>
      </div>
      ${targetCell}
      ${pingCell}
      ${stateCell}
    </div>`;
}

function renderLiveSquadsMatrix(b) {
  const container = $('live-squads-container');
  if (!container) return;

  const isRunning = b.is_running;
  const squads = b.squads || [];

  if (isRunning && squads.length > 0) {
    const nowSec = Date.now() / 1000;
    const remSec = liveMatchExpiresAt ? Math.max(0, Math.round(liveMatchExpiresAt - nowSec)) : (b.remaining_seconds || 36000);
    const countdownText = `${fmtCountdownHMS(remSec)} left`;

    container.innerHTML = squads.map((sq, sqIdx) => {
      const sqBadgeClass = getBotBadgeClass(sq.status);
      const masterUid = sq.master_uid || (sq.bots && sq.bots[0] ? sq.bots[0].uid : `sq_${sqIdx + 1}`);
      const matchesPlayed = Math.max(sq.matches_completed || 0, getSquadMatchCount(masterUid));
      const displaySqStatus = (sq.status || '').toUpperCase().includes('IN GAME') ? 'IN MATCH' : (sq.status || 'LOGGING IN');
      const sqNumber = sq.squad_id || (sqIdx + 1);
      const bots = sq.bots || [];
      const clanName = sq.clan_name || sq.name || 'Guild';
      const clanId = sq.clan_id || '';
      const owner = sq.started_by || b.started_by || 'Admin';

      // Independent per-squad 10-hour countdown timer
      const sqExp = Number(sq.expires_at) || 0;
      const sqRemSec = sqExp > 0
        ? Math.max(0, Math.round(sqExp - nowSec))
        : (sq.remaining_seconds !== undefined ? Number(sq.remaining_seconds) : (liveMatchExpiresAt ? Math.max(0, Math.round(liveMatchExpiresAt - nowSec)) : 36000));
      const countdownText = `${fmtCountdownHMS(sqRemSec)} left`;

      const stopSquadBtn = isSuperCommander() ? `
        <button class="btn btn-sm" style="background: rgba(244, 63, 94, 0.15); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.35); padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s;" onmouseover="this.style.background='rgba(244,63,94,0.3)'" onmouseout="this.style.background='rgba(244,63,94,0.15)'" onclick="stopSpecificSquad('${escapeHtml(clanId)}', '${escapeHtml(clanName)}')">
          <i data-lucide="square" style="width: 12px; height: 12px;"></i> Stop Squad
        </button>` : '';

      return `
      <div class="squad" style="margin-bottom: 22px;">
        <div class="squad-head" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div class="squad-title" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span>Squad #${sqNumber}: <strong style="color: var(--text);">${escapeHtml(clanName)}</strong> ${clanId ? `<span class="count">(${escapeHtml(clanId)})</span>` : ''} <span class="count">· ${bots.length} bots</span></span>
            <span class="badge cyan">${escapeHtml(sq.mode || 'SQUAD')}</span>
            <span class="badge emerald">MATCHES ${matchesPlayed}</span>
            <span class="squad-timer-pill js-squad-countdown" data-expires="${sqExp || ''}" title="10-Hour Nonstop Session Countdown">⏳ ${countdownText}</span>
            ${(sq.attempts && sq.attempts > 1) ? `<span class="badge amber">ATTEMPT ${sq.attempts}</span>` : ''}
            ${sq.team_code ? `<span class="badge amber">CODE ${escapeHtml(sq.team_code)}</span>` : ''}
            ${sq.cs_round > 0 ? `<span class="badge cyan">CS R${sq.cs_round}</span>` : ''}
            <span class="badge violet">@${escapeHtml(owner)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge ${sqBadgeClass}"><span class="pulse-dot ${sqBadgeClass === 'emerald' ? 'online' : (sqBadgeClass === 'rose' ? 'rose' : 'busy')}"></span>${escapeHtml(displaySqStatus)}</span>
            ${stopSquadBtn}
          </div>
        </div>
        ${BOT_HEAD_ROW}
        <div class="bot-list">${bots.map((bot, i) => botRowHtml(bot, i, true)).join('')}</div>
      </div>`;
    }).join('');
    return;
  }

  // Idle: still waiting for first accounts payload -> skeleton
  if (!loaded.accounts) {
    container.innerHTML = skSquads(1);
    return;
  }

  const selectedClan = $('bot-select-clan')?.value || '';
  const activeBots = (cachedAccountsList || []).filter(a => a.status !== 'offline');
  const guildBots = activeBots.filter(a => selectedClan ? String(a.clan_id || '') === String(selectedClan) : !!a.clan_id);

  if (activeBots.length === 0) {
    container.innerHTML = `
      <div class="empty dashed">
        <strong>No active bot accounts</strong>
        Generate guest bots with your mandatory Guild ID in the Bot Accounts tab to begin matchmaking.
      </div>`;
    return;
  }

  if (guildBots.length < 2) {
    container.innerHTML = `
      <div class="empty dashed" style="border-color: rgba(251, 191, 36, 0.35);">
        <strong style="color: var(--amber);">Bots must belong to an Active Guild to start matchmaking</strong>
        ${selectedClan
          ? `Found ${guildBots.length} active bot(s) in Guild ${escapeHtml(selectedClan)} (minimum 2 required). Generate bots with Guild ID ${escapeHtml(selectedClan)} in Bot Accounts.`
          : 'None of your active bots are assigned to a Guild ID yet. Generate bots with a mandatory Guild ID in the Bot Accounts tab.'}
      </div>`;
    return;
  }

  const isDuoSelected = $('bot-mode-duo')?.value === 'true';
  const chunkSize = isDuoSelected ? 2 : 4;
  const formation = [];
  for (let i = 0; i < guildBots.length; i += chunkSize) {
    formation.push(guildBots.slice(i, i + chunkSize));
  }
  if (formation.length >= 2 && formation[formation.length - 1].length === 1 && formation[formation.length - 2].length > 2) {
    formation[formation.length - 1].unshift(formation[formation.length - 2].pop());
  }

  container.innerHTML = formation.map((sq, sqIdx) => {
    const masterUid = sq[0] ? sq[0].uid : `sq_${sqIdx + 1}`;
    const matchesPlayed = getSquadMatchCount(masterUid);
    const sqClan = sq[0]?.clan_id || selectedClan || 'Guild';
    return `
    <div class="squad">
      <div class="squad-head">
        <div class="squad-title">
          <span>Squad #${sqIdx + 1} <span class="count">· ${sq.length} bots</span></span>
          <span class="badge cyan">GUILD ${escapeHtml(sqClan)}</span>
          <span class="badge dim">${isDuoSelected ? 'DUO READY' : 'SQUAD READY'}</span>
          <span class="badge ${matchesPlayed > 0 ? 'emerald' : 'dim'}">MATCHES ${matchesPlayed}</span>
          <span class="squad-timer-pill" style="opacity: 0.85;">⏳ 10h 00m 00s SESSION · 1 CREDIT</span>
        </div>
        <span class="badge dim">READY TO LAUNCH</span>
      </div>
      ${BOT_HEAD_ROW}
      <div class="bot-list">${sq.map((bot, i) => botRowHtml(bot, i, false)).join('')}</div>
    </div>`;
  }).join('');
}

function toggleBotTargetMode() {
  const grp = $('group-clan-select');
  if (grp) grp.style.display = 'block';
}

let pendingLaunchConfig = null;

function closeLaunchConfirmModal() {
  const modal = $('modal-launch-confirm');
  if (modal) modal.style.display = 'none';
  pendingLaunchConfig = null;
}

async function startBotExecution() {
  saveOperatorPreferences();
  const clanId = ($('bot-select-clan')?.value || '').trim();
  const useDuo = $('bot-mode-duo')?.value === 'true';

  if (!clanId || !/^\d+$/.test(clanId)) {
    showToast('Guild ID is mandatory! Select an Active Guild before starting matchmaking.', 'error');
    return;
  }

  const trackedObj = (trackedClansCache || []).find(c => String(c.clan_id) === String(clanId));
  const guildBots = (cachedAccountsList || []).filter(a => a.status !== 'offline' && String(a.clan_id || '') === String(clanId));
  const botCount = Math.max(guildBots.length, trackedObj?.account_count || 0);

  if (botCount < 2) {
    showToast(`Bots must be in a Guild to start a match! Need at least 2 active bots in Guild ${clanId}.`, 'error');
    return;
  }

  const batchSize = useDuo ? 2 : 4;
  const sqCount = Math.max(1, Math.ceil(botCount / batchSize));
  const isSuper = isSuperCommander();
  const curCredits = getOperatorCredits();

  if (!isSuper && curCredits < sqCount) {
    showToast(`Insufficient Credits (${curCredits} available, ${sqCount} required for ${sqCount} squad). Visit Pricing & Credits.`, 'error');
    switchConsoleTab('pricing');
    return;
  }

  const clanName = trackedObj?.clan_name || `Guild ${clanId}`;
  pendingLaunchConfig = { clanId, clanName, useDuo, botCount, sqCount };

  setText('lc-guild-label', `${clanName} (${clanId})`);
  setText('lc-formation-label', `${sqCount} ${useDuo ? 'DUO' : 'SQUAD'}(S) · ${botCount} Guild Bots`);
  setText('lc-credit-cost', isSuper ? '0 Credits (Super Commander)' : `${sqCount} Credit${sqCount > 1 ? 's' : ''} (${sqCount} Squad × 10 Hours)`);
  setText('lc-user-credits', isSuper ? '∞ UNLIMITED' : `${curCredits} Credit${curCredits === 1 ? '' : 's'}`);

  const confirmBtn = $('btn-confirm-launch-10h');
  if (confirmBtn) {
    confirmBtn.innerHTML = `${ICON.play}<span>Launch 10-Hour Squad (${isSuper ? '0' : sqCount} Credit${sqCount > 1 ? 's' : ''})</span>`;
  }

  const modal = $('modal-launch-confirm');
  if (modal) modal.style.display = 'flex';
}

async function confirmAndExecuteLaunch() {
  if (!pendingLaunchConfig) return;
  const { clanId, useDuo } = pendingLaunchConfig;
  const btn = $('btn-confirm-launch-10h');
  if (btn) btn.disabled = true;

  showToast('Launching 10-Hour Nonstop Squad Session…');
  try {
    const res = await apiRequest('bot/start-clan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clan_id: clanId,
        rounds: 0,
        use_duo: useDuo,
        max_duration_seconds: 36000
      })
    });
    const json = await res.json();
    if (json.success) {
      if (json.credits_remaining !== undefined) {
        setOperatorCredits(json.credits_remaining);
      } else {
        refreshUserCredits();
      }
      closeLaunchConfirmModal();
      showToast(json.message || '10-Hour Nonstop Squad launched!', 'success');
      pollBotStatus();
    } else {
      showToast(json.detail || json.error || 'Failed to launch squad', 'error');
      if (json.code === 'INSUFFICIENT_CREDITS') {
        closeLaunchConfirmModal();
        switchConsoleTab('pricing');
      }
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function stopSpecificSquad(clanId, squadName) {
  if (!isSuperCommander()) {
    showToast('Only Super Commander can stop individual squads.', 'error');
    return;
  }
  const ok = await confirmDialog({
    title: `Stop ${squadName || 'Squad'}`,
    message: `This will halt matchmaking for ${squadName || 'this squad'} (Clan: ${clanId}) while leaving other running squads active. Continue?`,
    okLabel: 'Stop Squad',
    danger: true
  });
  if (!ok) return;
  showToast(`Stopping ${squadName}...`);
  try {
    const res = await apiRequest(`bot/stop?clan_id=${encodeURIComponent(clanId)}`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message || `Squad stopped successfully.`, 'success');
      pollBotStatus();
    } else {
      showToast(json.detail || json.message || 'Failed to stop squad.', 'error');
    }
  } catch (e) {
    showToast(`Network error: ${e.message}`, 'error');
  }
}

async function stopBotExecution() {
  if (!isSuperCommander()) {
    showToast('Access Denied: Match runs for 10 hours nonstop. Only the Super Commander can cancel matchmaking.', 'error');
    return;
  }
  const ok = await confirmDialog({
    title: 'Stop match loop',
    message: 'This halts all running squads immediately. Continue?',
    okLabel: 'Stop match',
    danger: true
  });
  if (!ok) return;
  try {
    const res = await apiRequest('bot/stop', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast('Match loop stopped', 'success');
      pollBotStatus();
    } else {
      showToast(json.message || 'Error stopping', 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ── 3. AUTO-SYNCED GUILD ANALYTICS (COLLAPSIBLE MEMBERS BY DEFAULT) ──
function toggleGuildMembers(keyId, totalCount) {
  const wrap = $(`guild-members-wrap-${keyId}`);
  const btn = $(`btn-toggle-members-${keyId}`);
  if (!wrap) return;
  const isNowOpen = wrap.style.display === 'none';
  wrap.style.display = isNowOpen ? 'block' : 'none';
  if (isNowOpen) expandedGuildMembers.add(String(keyId));
  else expandedGuildMembers.delete(String(keyId));
  if (btn) {
    btn.innerText = isNowOpen ? `Hide Members (${totalCount})` : `Show Members (${totalCount})`;
  }
}

function renderGuildCardHtml(d, isManualQuery = false) {
  const realTotal = fmtNum(d.total_real_guild_glory ?? d.total_guild_glory ?? 0);
  const realWeekly = fmtNum(d.total_real_weekly_glory ?? 0);
  const realMembers = d.total_guild_members ?? (d.members ? d.members.length : (d.member_count ?? 0));

  const botTotal = fmtNum(d.bot_total_glory ?? 0);
  const botWeekly = fmtNum(d.bot_weekly_glory ?? d.total_weekly_glory ?? 0);
  const botCount = d.bot_member_count ?? (d.members ? d.members.filter(x => x.is_bot).length : 0);
  const clanId = escapeHtml(d.clan_id);
  const keyId = isManualQuery ? `query_${clanId}` : clanId;
  const isExpanded = expandedGuildMembers.has(String(keyId));
  const maxCap = d.max_members || 50;
  const freeSlots = Math.max(0, maxCap - realMembers);

  // Guild capacity badge
  let spaceBadge = `<span class="badge ${freeSlots >= 8 ? 'emerald' : (freeSlots > 0 ? 'amber' : 'rose')}">${realMembers}/${maxCap} MEMBERS</span>`;
  if (freeSlots === 0) {
    spaceBadge += ` <span class="badge rose">GUILD FULL (MAX 50)</span>`;
  } else if (freeSlots < 8) {
    spaceBadge += ` <span class="badge amber" title="Need 8 open slots for 1 squad + standby backups">⚠️ LOW SPACE: ${freeSlots} SLOTS LEFT (NEED 8 FOR SQUAD+BACKUP)</span>`;
  }

  const rowsHtml = (d.members && d.members.length > 0)
    ? d.members.map((m, idx) => {
        const isBot = !!m.is_bot;
        const tag = isBot
          ? `<span class="badge cyan" style="margin-left: 6px; font-size: 0.62rem;">OUR BOT</span>`
          : `<span class="badge dim" style="margin-left: 6px; font-size: 0.62rem;">MEMBER</span>`;
        return `
        <tr class="${isBot ? 'row-our-bot' : ''}">
          <td><span class="rank-pill ${idx < 3 ? 'r' + (idx + 1) : ''}">${idx + 1}</span></td>
          <td><strong style="color: ${isBot ? 'var(--cyan)' : '#fff'};">${escapeHtml(m.name)}</strong>${tag}</td>
          <td class="mono" style="color: var(--text);">${escapeHtml(m.account_id || '—')}</td>
          <td class="mono" style="color: var(--cyan);">+${fmtNum(m.weekly_glory)}</td>
          <td class="mono" style="color: var(--emerald); font-weight: 600;">${fmtNum(m.total_glory)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="5"><div class="empty" style="padding: 1.25rem;">No members recorded for this guild.</div></td></tr>`;

  const actions = !isManualQuery
    ? `<div class="guild-actions" style="flex-direction: row; align-items: center; flex-wrap: wrap;">
         <button class="btn btn-sm btn-primary" id="btn-toggle-members-${keyId}" onclick="toggleGuildMembers('${keyId}', ${realMembers})">${isExpanded ? `Hide Members (${realMembers})` : `Show Members (${realMembers})`}</button>
         <button class="btn btn-sm" onclick="refreshSingleGuildCard('${clanId}')">Sync live</button>
         <button class="btn btn-sm btn-danger" onclick="deleteClanMapping('${clanId}')">Remove</button>
       </div>`
    : `<div class="guild-actions" style="flex-direction: row; align-items: center; flex-wrap: wrap;">
         <button class="btn btn-sm btn-primary" id="btn-toggle-members-${keyId}" onclick="toggleGuildMembers('${keyId}', ${realMembers})">${isExpanded ? `Hide Members (${realMembers})` : `Show Members (${realMembers})`}</button>
         <button class="btn btn-sm" onclick="$('clan-result-box').style.display='none'">Close</button>
       </div>`;

  return `
    <div class="guild-head" style="border-bottom: 0;">
      <div>
        <div class="guild-meta">
          <span class="badge cyan">GUILD ID ${clanId}</span>
          <span class="badge emerald">${botCount} OUR BOTS</span>
          ${spaceBadge}
        </div>
        <div class="guild-name">${escapeHtml(d.clan_name || 'Guild ' + d.clan_id)}</div>
      </div>
      <div class="glory-boxes">
        <div class="glory-box ours">
          <div class="gl">Our bots glory (${botCount} bots)</div>
          <div class="gv">${botTotal}</div>
          <div class="gs">Weekly +${botWeekly}</div>
        </div>
        <div class="glory-box real">
          <div class="gl">Total real guild glory</div>
          <div class="gv">${realTotal}</div>
          <div class="gs">Weekly +${realWeekly}</div>
        </div>
        ${actions}
      </div>
    </div>
    <div class="guild-members-collapse" id="guild-members-wrap-${keyId}" style="display: ${isExpanded ? 'block' : 'none'};">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th style="width: 60px;">Rank</th><th>Member / Nickname</th><th>In-game ID</th><th>Weekly glory</th><th>Total glory</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

function guildErrorInner(c, note) {
  return `
    <div class="guild-head">
      <div>
        <div class="guild-meta"><span class="badge cyan">ID ${escapeHtml(c.clan_id)}</span><span class="badge dim">${c.account_count} BOTS</span></div>
        <div class="guild-name">${escapeHtml(c.clan_name || 'Guild ' + c.clan_id)}</div>
        <p style="font-size: 0.76rem; color: var(--rose); margin-top: 0.3rem;">Live query: ${escapeHtml(note)}</p>
      </div>
      <div class="guild-actions" style="flex-direction: row;">
        <button class="btn btn-sm" onclick="refreshSingleGuildCard('${escapeHtml(c.clan_id)}')">Retry</button>
        <button class="btn btn-sm btn-danger" onclick="deleteClanMapping('${escapeHtml(c.clan_id)}')">Remove</button>
      </div>
    </div>`;
}

async function fetchLiveClanInfo() {
  const clanId = $('input-clan-id').value.trim();
  if (!clanId) {
    showToast('Enter a numeric Clan ID', 'error');
    return;
  }

  const btn = $('btn-fetch-clan');
  btn.disabled = true;
  btn.innerText = 'Querying…';
  const box = $('clan-result-box');
  if (box) {
    box.style.display = 'block';
    box.innerHTML = skGuildCardInner();
  }

  try {
    const res = await apiRequest(`clan/${encodeURIComponent(clanId)}/info`);
    const json = await res.json();
    if (!json.success) throw new Error(json.detail || json.error || 'Failed to query guild info');

    const d = json.data;
    if (box) box.innerHTML = renderGuildCardHtml(d, true);
    showToast(`Synced ${d.clan_name} · real glory ${fmtNum(d.total_real_guild_glory || d.total_guild_glory || 0)}`, 'success');
  } catch (err) {
    if (box) box.style.display = 'none';
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Query ID';
  }
}

async function fetchGuildInto(c) {
  const cardEl = $(`auto-guild-card-${c.clan_id}`);
  try {
    const infoRes = await apiRequest(`clan/${encodeURIComponent(c.clan_id)}/info`);
    const infoJson = await infoRes.json();
    const target = $(`auto-guild-card-${c.clan_id}`) || cardEl;
    if (infoJson.success && infoJson.data) {
      guildInfoCache[c.clan_id] = { data: infoJson.data, ts: Date.now() };
      if (target) target.innerHTML = renderGuildCardHtml(infoJson.data, false);
      return true;
    }
    if (target && !guildInfoCache[c.clan_id]) {
      target.innerHTML = guildErrorInner(c, infoJson.detail || infoJson.error || 'Could not reach game server');
    }
  } catch (err) {
    const target = $(`auto-guild-card-${c.clan_id}`);
    if (target && !guildInfoCache[c.clan_id]) target.innerHTML = guildErrorInner(c, 'Network error');
  }
  return false;
}

async function refreshSingleGuildCard(clanId) {
  const c = trackedClansCache.find(x => String(x.clan_id) === String(clanId)) || { clan_id: clanId, account_count: 0 };
  const cardEl = $(`auto-guild-card-${clanId}`);
  if (cardEl) cardEl.innerHTML = skGuildCardInner();
  const ok = await fetchGuildInto(c);
  if (ok) showToast(`Refreshed ${guildInfoCache[clanId]?.data?.clan_name || clanId}`, 'success');
}

async function syncAllActiveGuilds() {
  await loadTrackedClans(true);
}

async function loadTrackedClans(force = false) {
  try {
    const res = await apiRequest('clan/list');
    const json = await res.json();
    if (!json.success) return;

    trackedClansCache = json.data || [];
    loaded.clans = true;
    Object.keys(guildInfoCache).forEach(id => {
      if (!trackedClansCache.some(c => String(c.clan_id) === String(id))) delete guildInfoCache[id];
    });

    // Dropdown in matchmaking (restore operator's saved clan)
    const select = $('bot-select-clan');
    if (select) {
      const savedPrefsRaw = localStorage.getItem(getOperatorStorageKey('gg_prefs'));
      const savedClan = savedPrefsRaw ? (JSON.parse(savedPrefsRaw).selectedClan || '') : '';
      const current = select.value;
      select.innerHTML = '';
      if (trackedClansCache.length === 0) {
        select.innerHTML = '<option value="">No tracked clans</option>';
      } else {
        trackedClansCache.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.clan_id;
          opt.innerText = `${c.clan_name || 'Clan'} (${c.clan_id}) · ${c.account_count} bots`;
          const want = current || savedClan;
          if (want && String(c.clan_id) === String(want)) opt.selected = true;
          select.appendChild(opt);
        });
      }
    }

    // Overview list
    const ovBox = $('overview-clan-list-box');
    if (ovBox) {
      ovBox.innerHTML = trackedClansCache.length === 0
        ? '<div class="empty" style="padding: 1rem;">No guilds tracked yet.</div>'
        : `<div class="kv">${trackedClansCache.map(c => `
            <div class="kv-row">
              <div><strong style="color: #fff; font-weight: 600;">${escapeHtml(c.clan_name || 'Guild ' + c.clan_id)}</strong>
              <div class="mono dim" style="font-size: 0.68rem;">ID ${escapeHtml(c.clan_id)}</div></div>
              <span class="badge cyan">${c.account_count} bots</span>
            </div>`).join('')}</div>`;
    }

    // Guild analytics cards
    const autoContainer = $('auto-guilds-container');
    if (!autoContainer) return;

    if (trackedClansCache.length === 0) {
      autoContainer.innerHTML = `
        <div class="card"><div class="empty">
          <strong>No active bot guilds</strong>
          When your bots join a guild (or you generate bots with an auto-join clan ID) it appears here with live glory.
          Deleting every bot in a guild removes the guild automatically.
        </div></div>`;
      return;
    }

    autoContainer.innerHTML = trackedClansCache.map(c => {
      const cached = guildInfoCache[c.clan_id];
      return `<div class="card guild-card-item" id="auto-guild-card-${escapeHtml(c.clan_id)}">${cached ? renderGuildCardHtml(cached.data, false) : skGuildCardInner()}</div>`;
    }).join('');

    trackedClansCache.forEach(c => {
      const cached = guildInfoCache[c.clan_id];
      if (!cached || force || Date.now() - cached.ts > GUILD_REFRESH_MS) fetchGuildInto(c);
    });
  } catch (err) {}
}

function inspectClan(clanId) {
  $('input-clan-id').value = clanId;
  fetchLiveClanInfo();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteClanMapping(clanId) {
  const ok = await confirmDialog({
    title: 'Remove guild',
    message: `Remove guild ${clanId} from tracked guilds? Bot accounts are not deleted.`,
    okLabel: 'Remove',
    danger: true
  });
  if (!ok) return;
  try {
    const res = await apiRequest(`clan/${encodeURIComponent(clanId)}/local`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Guild removed from tracker', 'success');
      delete guildInfoCache[clanId];
      loadTrackedClans();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ── 4. ACCOUNTS ROSTER & BULK SELECTION ──
let selectedAccountUids = new Set();

async function loadAccounts() {
  if (!getLoggedInOperator()) return;
  try {
    const res = await apiRequest('accounts');
    const json = await res.json();
    if (!json.success) return;

    const accounts = json.data || [];
    cachedAccountsList = accounts;
    loaded.accounts = true;
    saveBotOwnershipCache(accounts);
    setText('nav-bot-count', accounts.length);

    const tbody = $('accounts-tbody');
    if (!tbody) return;

    selectedAccountUids.clear();
    updateBulkDeleteUI();
    const selectAll = $('select-all-bots');
    if (selectAll) selectAll.checked = false;

    if (accounts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><strong>No bot accounts yet</strong>Use “Generate accounts” to create your first squad.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = accounts.map(a => {
      const isOnline = a.status === 'active';
      const ownerTag = (isSuperCommander() && a.owner)
        ? `<span class="badge violet" style="margin-left: 0.4rem;">@${escapeHtml(a.owner)}</span>`
        : '';
      const uid = escapeHtml(a.uid);
      return `
        <tr>
          <td><input type="checkbox" class="bot-row-checkbox" value="${uid}" onchange="toggleBotRowCheckbox(this, this.value)" /></td>
          <td><strong style="color: #fff;">${escapeHtml(a.name || 'Unknown')}</strong>${ownerTag}</td>
          <td class="mono dim">${uid}</td>
          <td class="mono">${escapeHtml(a.ingame_id || '—')}</td>
          <td><span class="badge dim">${escapeHtml(a.region || 'IND')}</span></td>
          <td>${a.clan_id ? `<span class="badge cyan">${escapeHtml(a.clan_id)}</span>` : '<span class="dim">None</span>'}</td>
          <td><span class="badge ${isOnline ? 'emerald' : 'dim'}"><span class="pulse-dot ${isOnline ? 'online' : ''}"></span>${isOnline ? 'ACTIVE' : 'OFFLINE'}</span></td>
          <td>
            <div class="row-actions">
              <button class="btn btn-sm" data-uid="${uid}" data-status="${escapeHtml(a.status)}" onclick="toggleStatus(this.dataset.uid, this.dataset.status)">${isOnline ? 'Set offline' : 'Set active'}</button>
              <button class="btn btn-sm btn-danger" data-uid="${uid}" onclick="deleteAccount(this.dataset.uid)">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {}
}

function toggleBotRowCheckbox(checkbox, uid) {
  if (checkbox.checked) selectedAccountUids.add(uid);
  else selectedAccountUids.delete(uid);
  updateBulkDeleteUI();
}

function toggleSelectAllBots(selectAllCheckbox) {
  const isChecked = selectAllCheckbox.checked;
  document.querySelectorAll('.bot-row-checkbox').forEach(cb => {
    cb.checked = isChecked;
    if (isChecked) selectedAccountUids.add(cb.value);
    else selectedAccountUids.delete(cb.value);
  });
  updateBulkDeleteUI();
}

function updateBulkDeleteUI() {
  const bulkBtn = $('btn-bulk-delete');
  const count = selectedAccountUids.size;
  if (!bulkBtn) return;
  if (count > 0) {
    bulkBtn.style.display = 'inline-flex';
    setText('bulk-delete-count', `Delete selected (${count})`);
  } else {
    bulkBtn.style.display = 'none';
  }
}

async function bulkDeleteAccounts() {
  const count = selectedAccountUids.size;
  if (count === 0) return;

  const ok = await confirmDialog({
    title: 'Delete bot accounts',
    message: `Permanently delete ${count} selected bot account${count > 1 ? 's' : ''}? This cannot be undone.`,
    okLabel: `Delete ${count}`,
    danger: true
  });
  if (!ok) return;

  const bulkBtn = $('btn-bulk-delete');
  if (bulkBtn) bulkBtn.disabled = true;

  showToast(`Deleting ${count} bot accounts…`);
  let successCount = 0;
  for (const uid of Array.from(selectedAccountUids)) {
    try {
      const res = await apiRequest(`accounts/${encodeURIComponent(uid)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) successCount++;
    } catch (e) {}
  }

  selectedAccountUids.clear();
  if (bulkBtn) bulkBtn.disabled = false;
  showToast(`Deleted ${successCount} accounts`, 'success');
  await loadAccounts();
  await loadTrackedClans();
  loadStats();
}

function toggleGenerateModal() {
  const card = $('card-generator');
  if (card) card.style.display = card.style.display === 'none' ? 'block' : 'none';
}

let genPollInterval = null;

async function submitGenerateAccounts() {
  const count = parseInt($('gen-count').value) || 4;
  const region = $('gen-region').value;
  const name_prefix = $('gen-prefix').value.trim() || 'TX999';
  const clan_id = ($('gen-clan-id')?.value || '').trim();

  if (!clan_id || !/^\d+$/.test(clan_id)) {
    showToast('Guild ID is mandatory! Enter a valid numeric Guild ID so bots join your guild.', 'error');
    $('gen-clan-id')?.focus();
    return;
  }

  const requiredCredits = Math.ceil(count / 4);
  if (!isSuperCommander() && getOperatorCredits() < requiredCredits) {
    showToast(`Insufficient Credits: You have ${getOperatorCredits()} credit(s). Generating ${count} bots requires ${requiredCredits} Credit(s) (1 Credit per squad of 4 bots). Credits will be deducted when launching matchmaking.`, 'error');
    switchConsoleTab('pricing');
    return;
  }

  const btn = $('btn-submit-gen');
  const progressPanel = $('gen-progress-panel');
  const progressBarFill = $('gen-progress-bar-fill');
  const progressRatio = $('gen-progress-ratio');
  const progressTitle = $('gen-progress-title');
  const logsTerminal = $('gen-logs-terminal');

  btn.disabled = true;
  btn.innerText = 'Starting…';

  if (progressPanel) progressPanel.style.display = 'block';
  if (progressBarFill) progressBarFill.style.width = '0%';
  if (progressRatio) progressRatio.innerText = `0 / ${count}`;
  if (progressTitle) progressTitle.innerText = `Initializing ${count} bots for Guild ${clan_id}…`;
  if (logsTerminal) logsTerminal.innerHTML = `<div>[${new Date().toLocaleTimeString()}] Dispatching generation job for Guild ${escapeHtml(clan_id)}…</div>`;

  try {
    const res = await apiRequest('accounts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, region, name_prefix, clan_id })
    });
    const json = await res.json();
    if (!json.success) {
      if (json.code === 'INSUFFICIENT_CREDITS') {
        switchConsoleTab('pricing');
      }
      throw new Error(json.detail || json.error || 'Failed to start generation');
    }

    if (json.credits_remaining !== undefined) {
      setOperatorCredits(json.credits_remaining);
    } else {
      refreshUserCredits();
    }

    showToast(`Creating ${count} bots in Guild ${clan_id} (Credits preserved until match start)`, 'success');
    btn.innerText = 'Generating…';

    if (genPollInterval) clearInterval(genPollInterval);

    genPollInterval = setInterval(async () => {
      try {
        const pRes = await apiRequest('accounts/generate/progress');
        const pJson = await pRes.json();
        if (!pJson.success) return;

        const p = pJson.data;
        const comp = p.completed_count || 0;
        const total = p.target_count || count;
        const pct = Math.min(Math.round((comp / total) * 100), 100);

        if (progressBarFill) progressBarFill.style.width = `${pct}%`;
        if (progressRatio) progressRatio.innerText = `${comp} / ${total} (${pct}%)`;
        if (progressTitle) progressTitle.innerText = p.current_step || 'Generating bots…';

        if (logsTerminal && p.logs && p.logs.length > 0) {
          logsTerminal.innerHTML = p.logs.map(line => `<div>▸ ${escapeHtml(line)}</div>`).join('');
          logsTerminal.scrollTop = logsTerminal.scrollHeight;
        }

        if (comp > 0) {
          loadAccounts();
          loadTrackedClans();
          loadStats();
        }

        if (!p.is_generating && (comp >= total || p.current_step === 'Completed' || p.current_step === 'Error')) {
          clearInterval(genPollInterval);
          genPollInterval = null;
          btn.disabled = false;
          btn.innerText = 'Generate & Join Guild';

          if (p.error) {
            showToast(`Generation stopped: ${p.error}`, 'error');
          } else {
            showToast(`${comp} accounts created successfully`, 'success');
            loadAccounts();
            loadTrackedClans();
            loadStats();
          }
        }
      } catch (pollErr) {}
    }, 2500);
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    btn.disabled = false;
    btn.innerText = 'Generate & Join Guild';
  }
}

async function toggleStatus(uid, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'offline' : 'active';
  try {
    const res = await apiRequest(`accounts/${encodeURIComponent(uid)}/status?new_status=${nextStatus}`, { method: 'PATCH' });
    const json = await res.json();
    if (json.success) {
      showToast(`Account set ${nextStatus}`, 'success');
      loadAccounts();
      loadStats();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteAccount(uid) {
  const ok = await confirmDialog({
    title: 'Delete account',
    message: `Permanently delete bot account ${uid}?`,
    okLabel: 'Delete',
    danger: true
  });
  if (!ok) return;
  try {
    const res = await apiRequest(`accounts/${encodeURIComponent(uid)}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Account deleted', 'success');
      await loadAccounts();
      await loadTrackedClans();
      loadStats();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ── 5. BOT CONFIGURATION ──
async function loadConfig() {
  try {
    const res = await apiRequest('bot/config');
    const json = await res.json();
    if (json.success && json.data) {
      const c = json.data;
      $('cfg-homer-enable').value = c.homer_skill_enabled ? 'true' : 'false';
      $('cfg-homer-cd').value = c.homer_skill_cooldown || 90;
      $('cfg-chase-enable').value = c.chase_enemies ? 'true' : 'false';
      $('cfg-chase-dist').value = c.chase_stop_dist || 150;
    }
  } catch (err) {}
  restoreOperatorPreferences();
}

async function saveBotConfig() {
  const homer_skill = $('cfg-homer-enable').value === 'true';
  const homer_cooldown = parseFloat($('cfg-homer-cd').value) || 90.0;
  const chase_enemies = $('cfg-chase-enable').value === 'true';
  const chase_stop_dist = parseFloat($('cfg-chase-dist').value) || 150.0;

  saveOperatorPreferences();

  try {
    const res = await apiRequest('bot/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homer_skill, homer_cooldown, chase_enemies, chase_stop_dist })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Configuration saved & synced', 'success');
      loadStats();
    } else {
      showToast(json.detail || json.error || 'Failed to update config', 'error');
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// 7. COMMAND CENTER (SUPER COMMANDER) — USERS, BANS, AUDIT, ENGINE LOGS
// ─────────────────────────────────────────────────────────────
let operatorsCache = [];
let userFilter = 'all';
let auditCache = [];
let auditFilter = 'all';
let engineFilter = 'all';
let enginePaused = false;
let engineLines = [];
let banTarget = null;

function setChipActive(containerId, f) {
  document.querySelectorAll(`#${containerId} .chip`).forEach(c => c.classList.toggle('active', c.dataset.f === f));
}

async function refreshSuperAdminData(force = false) {
  if (!isSuperCommander()) return;
  if (!loaded.users || force) {
    ['ov-total-users', 'ov-active', 'ov-banned', 'ov-blocked', 'ov-actions'].forEach(id => $(id)?.classList.add('is-loading'));
    const tb = $('operators-tbody');
    if (tb) tb.innerHTML = skTableRows(7, 5);
    const mb = $('mod-logs-tbody');
    if (mb) mb.innerHTML = skTableRows(4, 3);
  }
  await Promise.allSettled([fetchAdminOverview(), fetchRegisteredOperators(), fetchAuditLogs()]);
}

async function fetchAdminOverview() {
  try {
    const res = await apiRequest('admin/overview');
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;
    setStat('ov-total-users', d.total_users);
    setText('ov-new-today', d.new_today);
    setStat('ov-active', d.active_24h);
    setText('ov-logins', d.logins_24h);
    setStat('ov-banned', d.banned_users);
    setStat('ov-blocked', d.blocked_24h);
    setStat('ov-actions', d.actions_24h);
  } catch (e) {}
}

async function fetchRegisteredOperators() {
  try {
    const res = await apiRequest('admin/users');
    const json = await res.json();
    if (!json.success) return;
    operatorsCache = json.data || [];
    loaded.users = true;
    renderOperators();
  } catch (e) {}
}

function setUserFilter(f) {
  userFilter = f;
  setChipActive('user-filter-chips', f);
  renderOperators();
}

function renderOperators() {
  const tbody = $('operators-tbody');
  if (!tbody) return;

  const q = ($('user-search')?.value || '').trim().toLowerCase();
  const total = operatorsCache.length;
  const banned = operatorsCache.filter(u => u.banned).length;
  setText('uf-all', total);
  setText('uf-banned', banned);
  setText('uf-active', total - banned);

  const me = (getLoggedInOperator()?.username || '').toLowerCase();
  const rows = operatorsCache.filter(u => {
    if (userFilter === 'banned' && !u.banned) return false;
    if (userFilter === 'active' && u.banned) return false;
    if (q && !`${u.username} ${u.email}`.toLowerCase().includes(q)) return false;
    return true;
  });

  setText('users-count-sub', `${rows.length} shown`);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty" style="padding: 1.5rem;">No operators match this view.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(u => {
    const isMe = u.username.toLowerCase() === me;
    const isSuperOp = !!u.unlimited || u.role === 'Super Commander';
    const until = u.banned && u.ban_until ? ` · until ${escapeHtml(fmtUntil(u.ban_until))}` : (u.banned ? ' · permanent' : '');
    const statusCell = u.banned
      ? `<span class="badge rose">BANNED</span>
         <div class="muted" style="font-size: 0.7rem; margin-top: 0.25rem; max-width: 260px;" title="${escapeHtml(u.ban_reason)}">${escapeHtml(u.ban_reason)}<span class="dim">${until}</span></div>
         <div class="dim" style="font-size: 0.66rem;">by ${escapeHtml(u.banned_by || 'system')}${u.banned_at ? ' · ' + escapeHtml(u.banned_at) : ''}</div>`
      : `<span class="badge emerald"><span class="pulse-dot online"></span>ACTIVE</span>`;

    const creditsCell = isSuperOp
      ? `<span class="badge amber">∞ UNLIMITED</span>`
      : `<div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
           <span class="badge amber mono">${Number(u.credits || 0)} CREDITS</span>
           <button class="btn btn-sm" data-u="${escapeHtml(u.username)}" data-c="${Number(u.credits || 0)}" onclick="openCreditsModal(this.dataset.u, this.dataset.c)">+/- Credits</button>
         </div>`;

    const apiEnabled = !!u.api_enabled || isSuperOp;
    const apiCell = isSuperOp
      ? `<span class="badge emerald">FULL ACCESS</span>`
      : `<div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
           <span class="badge ${apiEnabled ? 'emerald' : 'dim'}">${apiEnabled ? 'ENABLED' : 'LOCKED'}</span>
           <button class="btn btn-sm ${apiEnabled ? 'btn-outline' : 'btn-primary'}" data-u="${escapeHtml(u.username)}" data-en="${apiEnabled ? '1' : '0'}" onclick="toggleUserApiAccess(this.dataset.u, this.dataset.en !== '1')">${apiEnabled ? 'Revoke API' : 'Grant API'}</button>
         </div>`;

    let action;
    const delBtn = `<button class="btn btn-sm btn-danger" data-u="${escapeHtml(u.username)}" onclick="deleteOperatorAccount(this.dataset.u)" title="Permanently delete operator">${ICON.trash}<span>Delete</span></button>`;
    if (u.protected || isMe) {
      action = `<span class="muted" style="font-size: 0.72rem;">${u.protected ? 'Protected' : 'You'}</span>`;
    } else if (u.banned) {
      action = `<button class="btn btn-sm btn-success" data-u="${escapeHtml(u.username)}" onclick="unbanUser(this.dataset.u)">${ICON.check}<span>Unban</span></button>${delBtn}`;
    } else {
      action = `<button class="btn btn-sm btn-danger" data-u="${escapeHtml(u.username)}" onclick="openBanModal(this.dataset.u)">${ICON.ban}<span>Ban</span></button>${delBtn}`;
    }

    return `
      <tr class="${u.banned ? 'row-banned' : ''}">
        <td>
          <div class="cell-user">
            <div class="avatar">${escapeHtml((u.username || '?').charAt(0))}</div>
            <div><div class="nm">${escapeHtml(u.username)} ${isMe ? '<span class="badge plain">You</span>' : ''}</div><div class="em">${escapeHtml(u.email || 'No email')}</div></div>
          </div>
        </td>
        <td><span class="badge ${u.role === 'Super Commander' ? 'amber' : 'dim'}">${escapeHtml(u.role)}</span></td>
        <td>${creditsCell}</td>
        <td>${apiCell}</td>
        <td class="log-time">${escapeHtml(u.last_active || u.created_at || '—')}</td>
        <td>${statusCell}</td>
        <td class="ta-r"><div class="row-actions">${action}</div></td>
      </tr>`;
  }).join('');
}

// ── Super Commander: Manage Operator Credits & Developer API Access ──
let credTargetUser = null;

function openCreditsModal(username, currentCredits = 0) {
  credTargetUser = username;
  setText('cred-target-name', username);
  setText('cred-current-val', `${currentCredits} Credits`);
  if ($('cred-action')) $('cred-action').value = 'add';
  if ($('cred-amount')) $('cred-amount').value = '5';
  const modal = $('modal-credits');
  if (modal) modal.style.display = 'flex';
}

function closeCreditsModal() {
  const modal = $('modal-credits');
  if (modal) modal.style.display = 'none';
  credTargetUser = null;
}

async function submitCreditsUpdate() {
  if (!credTargetUser) return;
  const action = $('cred-action')?.value || 'add';
  const amount = Math.max(0, parseInt($('cred-amount')?.value || '0', 10) || 0);
  const btn = $('btn-cred-submit');
  if (btn) btn.disabled = true;

  try {
    const res = await apiRequest('admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: credTargetUser, action, amount })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update credits');
    showToast(json.message || `Updated credits for ${credTargetUser}`, 'success');
    closeCreditsModal();
    refreshSuperAdminData(false);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function toggleUserApiAccess(username, enable) {
  const ok = await confirmDialog({
    title: enable ? 'Grant Developer API Access' : 'Revoke Developer API Access',
    message: enable
      ? `Grant ${username} a personal Developer API Key (/api/v1/*) so they can control their account from their own website?`
      : `Revoke Developer API access for ${username}? Their API key will stop working immediately.`,
    okLabel: enable ? 'Grant API Access' : 'Revoke API Access',
    danger: !enable
  });
  if (!ok) return;

  try {
    const res = await apiRequest('admin/api-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, enabled: enable })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update API access');
    showToast(json.message || `API access updated for ${username}`, 'success');
    refreshSuperAdminData(false);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Ban / Unban ──
function openBanModal(username) {
  banTarget = username;
  setText('ban-target-name', username);
  $('ban-reason').value = '';
  $('ban-duration').value = '0';
  document.querySelectorAll('#ban-presets button').forEach(b => b.classList.remove('active'));
  $('modal-ban').style.display = 'flex';
  setTimeout(() => $('ban-reason').focus(), 50);
}

function closeBanModal() {
  $('modal-ban').style.display = 'none';
  banTarget = null;
}

function pickBanReason(btn) {
  document.querySelectorAll('#ban-presets button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('ban-reason').value = btn.innerText;
}

async function submitBan() {
  const reason = $('ban-reason').value.trim();
  if (!banTarget) return;
  if (reason.length < 3) {
    showToast('Please give a ban reason', 'error');
    $('ban-reason').focus();
    return;
  }
  const btn = $('btn-ban-confirm');
  btn.disabled = true;
  try {
    const res = await apiRequest('admin/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: banTarget, reason, duration_hours: parseInt($('ban-duration').value) || 0 })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Ban failed');
    showToast(json.message || 'Operator banned', 'success');
    closeBanModal();
    refreshSuperAdminData(false);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function unbanUser(username) {
  const ok = await confirmDialog({
    title: 'Lift ban',
    message: `Allow ${username} to sign in again?`,
    okLabel: 'Unban'
  });
  if (!ok) return;
  try {
    const res = await apiRequest('admin/unban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Unban failed');
    showToast(json.message || 'Operator unbanned', 'success');
    refreshSuperAdminData(false);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteOperatorAccount(username) {
  const ok = await confirmDialog({
    title: 'Delete operator account',
    message: `Permanently delete "${username}"? Their login credentials, credits, and active sessions will be removed immediately. This cannot be undone.`,
    okLabel: 'Delete Account',
    danger: true
  });
  if (!ok) return;
  try {
    const res = await apiRequest('admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Delete failed');
    showToast(json.message || 'Operator deleted', 'success');
    refreshSuperAdminData(false);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Audit log ──
const ACTION_CATEGORY = {
  LOGIN: 'auth', LOGOUT: 'auth', REGISTER: 'auth', LOGIN_BLOCKED: 'auth', API_KEY_ROTATED: 'auth',
  START_MATCH_CLAN: 'match', START_MATCH_ALL: 'match', STOP_MATCH: 'match', API_START_MATCH: 'match', API_STOP_MATCH: 'match',
  FORGE_ACCOUNTS: 'bots', DELETE_BOT: 'bots', API_FORGE_ACCOUNTS: 'bots', API_DELETE_BOT: 'bots',
  BAN_USER: 'mod', UNBAN_USER: 'mod', DELETE_USER: 'mod', ADMIN_CREDITS: 'mod', ADMIN_API_ACCESS: 'mod'
};

function actionBadgeClass(action) {
  if (action === 'LOGIN_BLOCKED' || action === 'BAN_USER' || action === 'DELETE_USER' || action === 'STOP_MATCH' || action === 'API_STOP_MATCH' || action === 'DELETE_BOT' || action === 'API_DELETE_BOT') return 'rose';
  if (action === 'UNBAN_USER' || action.startsWith('START_MATCH') || action === 'API_START_MATCH' || action === 'ADMIN_API_ACCESS') return 'emerald';
  if (action === 'FORGE_ACCOUNTS' || action === 'API_FORGE_ACCOUNTS' || action === 'ADMIN_CREDITS') return 'amber';
  if (action === 'REGISTER') return 'violet';
  return 'cyan';
}

async function fetchAuditLogs() {
  try {
    const res = await apiRequest('admin/audit-logs?limit=400');
    const json = await res.json();
    if (!json.success) return;
    auditCache = json.data || [];
    loaded.audit = true;
    renderAuditLogs();
    renderModerationLogs();
  } catch (e) {}
}

function setAuditFilter(f) {
  auditFilter = f;
  setChipActive('audit-filter-chips', f);
  renderAuditLogs();
}

function auditRowHtml(l, withIp) {
  return `
    <tr>
      <td class="log-time">${escapeHtml(l.timestamp)}</td>
      <td><strong style="color: var(--cyan); font-weight: 600;">${escapeHtml(l.operator)}</strong></td>
      <td><span class="badge ${actionBadgeClass(l.action)} act-badge">${escapeHtml(String(l.action).replace(/_/g, ' '))}</span></td>
      <td style="color: var(--text-2); font-size: 0.78rem;">${escapeHtml(l.details)}</td>
      ${withIp ? `<td class="mono dim">${escapeHtml(l.ip || '')}</td>` : ''}
    </tr>`;
}

function renderAuditLogs() {
  const tbody = $('audit-logs-tbody');
  if (!tbody) return;
  if (!loaded.audit) {
    tbody.innerHTML = skTableRows(5, 5);
    return;
  }
  const q = ($('audit-search')?.value || '').trim().toLowerCase();
  const rows = auditCache.filter(l => {
    if (auditFilter !== 'all' && (ACTION_CATEGORY[l.action] || 'other') !== auditFilter) return false;
    if (q && !`${l.operator} ${l.action} ${l.details} ${l.ip}`.toLowerCase().includes(q)) return false;
    return true;
  });
  setText('audit-count-sub', `${rows.length} of ${auditCache.length}`);
  tbody.innerHTML = rows.length
    ? rows.map(l => auditRowHtml(l, true)).join('')
    : `<tr><td colspan="5"><div class="empty" style="padding: 1.5rem;">No log entries match.</div></td></tr>`;
}

function renderModerationLogs() {
  const tbody = $('mod-logs-tbody');
  if (!tbody) return;
  const rows = auditCache.filter(l => ACTION_CATEGORY[l.action] === 'mod' || l.action === 'LOGIN_BLOCKED').slice(0, 12);
  tbody.innerHTML = rows.length
    ? rows.map(l => auditRowHtml(l, false)).join('')
    : `<tr><td colspan="4"><div class="empty" style="padding: 1.25rem;">No moderation actions yet.</div></td></tr>`;
}

// ── Engine stream ──
function classifyLine(line) {
  if (line.includes('[FAIL]') || line.includes('Error') || line.includes('Exception') || line.includes('blocked') || line.includes('REJECTED')) return 'err';
  if (line.includes('[OK]') || line.includes('SUCCESS') || line.includes('completed') || line.includes('MATCH FINISHED')) return 'ok';
  if (line.includes('[M]') || line.includes('[SYSTEM]') || line.includes('ROUND')) return 'sys';
  if (line.includes('[S1]') || line.includes('[S2]') || line.includes('[S3]') || line.includes('[CAPTURE]')) return 'warn';
  return '';
}

function setEngineFilter(f) {
  engineFilter = f;
  setChipActive('engine-filter-chips', f);
  renderEngineLogs(true);
}

function toggleEnginePause() {
  enginePaused = !enginePaused;
  const btn = $('btn-engine-pause');
  if (btn) btn.innerHTML = enginePaused ? `${ICON.play}<span>Resume</span>` : `${ICON.pause}<span>Pause</span>`;
}

function renderEngineLogs(forceScroll = false) {
  const term = $('vps-engine-terminal');
  if (!term) return;
  const nearBottom = term.scrollHeight - term.scrollTop - term.clientHeight < 60;
  const lines = engineLines.filter(l => engineFilter === 'all' || classifyLine(l) === engineFilter);
  term.innerHTML = lines.length
    ? lines.map(l => `<div class="term-line ${classifyLine(l)}">${escapeHtml(l)}</div>`).join('')
    : '<div class="term-line muted">No matching lines.</div>';
  if (nearBottom || forceScroll) term.scrollTop = term.scrollHeight;
}

async function fetchVPSEngineLogs() {
  const term = $('vps-engine-terminal');
  if (!term) return;
  try {
    const res = await apiRequest('bot/logs?lines=120');
    const json = await res.json();
    if (json.success && json.data && json.data.logs) {
      engineLines = json.data.logs;
      renderEngineLogs();
      setText('vps-log-timestamp', `synced ${new Date().toLocaleTimeString()} · ${engineLines.length} lines`);
    } else {
      term.innerHTML = '<div class="term-line muted">No logs received from the engine.</div>';
    }
  } catch (e) {
    term.innerHTML = `<div class="term-line err">Cannot reach engine log stream: ${escapeHtml(e.message)}</div>`;
  }
}

async function refreshLogsPane() {
  if (!isSuperCommander()) return;
  if (!loaded.audit) {
    const tb = $('audit-logs-tbody');
    if (tb) tb.innerHTML = skTableRows(5, 5);
  }
  const term = $('vps-engine-terminal');
  if (term && engineLines.length === 0) {
    term.innerHTML = Array.from({ length: 10 }).map((_, i) => `<div class="sk sk-line" style="margin: 7px 0; width: ${40 + ((i * 17) % 55)}%;"></div>`).join('');
  }
  await Promise.allSettled([fetchAuditLogs(), fetchVPSEngineLogs()]);
}

// ─────────────────────────────────────────────────────────────
// LIVE OPERATOR FEEDBACK TRAIN (RIGHT -> LEFT, NEVER REPEATING)
// Cycles Hinglish, Hindi (Devanagari), and English — every card is 100% unique
// ─────────────────────────────────────────────────────────────
const usedFeedbackTexts = new Set();
const usedFeedbackHandles = new Set();
let fbLangCursor = 0;
let fbTrainOffset = 0;
let fbTrainPaused = false;
let fbTrainRafId = null;
let fbLastFrameTs = 0;

const FB_FIRST_NAMES = [
  'Aarav', 'Rohan', 'Vikram', 'Karan', 'Nikhil', 'Zaid', 'Pranav', 'Harsh', 'Ankit', 'Siddharth',
  'Yash', 'Rishi', 'Kabir', 'Dev', 'Aditya', 'Tushar', 'Manish', 'Deepak', 'Gaurav', 'Armaan',
  'Sameer', 'Nitin', 'Abhishek', 'Rajat', 'Saurabh', 'Piyush', 'Mayank', 'Tarun', 'Kunal', 'Varun',
  'Shubham', 'Akash', 'chirag', 'Ayush', 'mohit', 'Neeraj', 'Sagar', 'vivek', 'Kartik', 'Lakshya',
  'Rehan', 'Faizan', 'Aman', 'Sahil', 'Ritik', 'Himanshu', 'Prateek', 'Naveen', 'Sumit', 'vishal'
];
const FB_SUFFIXES = [
  'FF', 'TX999', 'OP', 'YT', 'IGL', 'Booyah', 'Clutch', 'Rusher', 'Sniper', 'Esports',
  'Gaming', '999', 'Pro', 'Zone', 'King', 'Blaze', 'Phantom', 'Legend', 'Apex', 'Boss',
  'Squad', 'Elite', 'Vortex', 'Strike', 'God', 'X', 'Live', 'Official', 'Plays', 'Army'
];

function loadSeenFeedbackHistory() {
  try {
    const raw = localStorage.getItem('gg_seen_fb_v1');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(t => usedFeedbackTexts.add(t));
    }
  } catch (e) {}
}

function saveSeenFeedbackHistory(text) {
  usedFeedbackTexts.add(text);
  try {
    const arr = Array.from(usedFeedbackTexts).slice(-600);
    localStorage.setItem('gg_seen_fb_v1', JSON.stringify(arr));
  } catch (e) {}
}

function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUniqueHandle() {
  for (let i = 0; i < 60; i++) {
    const fn = randPick(FB_FIRST_NAMES);
    const sf = randPick(FB_SUFFIXES);
    const sep = Math.random() > 0.45 ? '_' : '';
    const num = Math.random() > 0.5 ? String(randInt(7, 99)) : '';
    const candidate = `${fn.charAt(0).toUpperCase() + fn.slice(1)}${sep}${sf}${num}`;
    if (!usedFeedbackHandles.has(candidate)) {
      usedFeedbackHandles.add(candidate);
      return candidate;
    }
  }
  return `Operator_${randInt(1000, 9999)}`;
}

// Combinatorial & template generators for Hinglish, Hindi, and English
function synthesizeFeedback(langKey) {
  const gloryVal = (randInt(42, 395) * 120 + randInt(15, 95)).toLocaleString('en-IN');
  const squads = randInt(1, 6);
  const matches = randInt(38, 195);
  const bots = squads * 4;
  const minsSwap = randInt(2, 8);

  if (langKey === 'hinglish') {
    const openers = [
      'Bhai sahab ekdum next level system hai!',
      'Sach me yaar, raat ko squad laga ke so gaya tha,',
      'Full paisa vasool panel hai bhai,',
      'Maine pehle bohot panels try kiye par TX999 alag hi cheez hai —',
      'Kamaal ka automation hai boss!',
      'Bhai 1 credit me pura 10 ghanta nonstop chala,',
      'Guild glory push karne ke liye isse best kuch nahi hai,',
      'Mera guild top leaderboard me aa gaya भाई,',
      'Backup bot wala system sabse op hai yaar,',
      'Zero lag aur 10-hour live timer ekdum accurate chalta hai,',
      'Raat bhar 10 hours nonstop squad chala bina ruke,',
      'Ekdum smooth dashboard hai aur guild analytics live update hota hai,'
    ];
    const middles = [
      `subah uth ke dekha toh +${gloryVal} guild glory add ho chuka tha`,
      `pure 10 hours me ${matches} Clash Squad matches bina kisi error ke complete hue`,
      `ek bot beech me offline hua toh ${minsSwap} sec me backup ID automatic ghus gaya`,
      `humare guild me ${bots} bots ne milke +${gloryVal} weekly glory bana diya`,
      `10h timer card pe live chalta rehta hai aur pura session makkhan ki tarah chala`,
      `${squads} squad lagaya tha aur har ek bot guild ke andar full speed me glory de raha hai`,
      `private Developer API se maine apna khud ka frontend connect kar liya bina kisi dikkat ke`,
      `bina ek bhi match drop kiye +${gloryVal} real guild glory सीधा leaderboard pe chadh gaya`
    ];
    const closers = [
      '— dil khush ho gaya! 🔥',
      '— 100% recommended sabhi guild leaders ko!',
      '— ab har week humara guild top pe rahega.',
      '— sach me nonstop beast engine hai!',
      '— koi issue nahi aaya pure 10 ghante me.',
      '— Super Commander support aur system dono solid hain!',
      '— ab manually khelne ki zaroorat hi nahi padti.',
      '— ekdum trusted aur realistic setup hai!'
    ];
    return {
      langLabel: 'HINGLISH',
      gloryTag: `+${gloryVal} Glory`,
      text: `${randPick(openers)} ${randPick(middles)} ${randPick(closers)}`
    };
  }

  if (langKey === 'hindi') {
    const openers = [
      'भाई सच में कमाल का पैनल है,',
      'रात को १ क्रेडिट से स्क्वाड चालू करके सो गया था,',
      'गिल्ड ग्लोरी बढ़ाने के लिए इससे बढ़िया सिस्टम कहीं नहीं मिलेगा —',
      'पूरे १० घंटे बिना रुके मेरा स्क्वाड चला,',
      'बैकअप बॉट फीचर ने दिल जीत लिया भाई,',
      'हमारी गिल्ड की रैंकिंग एक ही दिन में ऊपर आ गई,',
      'डैशबोर्ड और १० घंटे का लाइव टाइमर एकदम सटीक काम करता है,',
      'कोई लैग नहीं, कोई क्रैश नहीं —',
      'मैंने अपनी गिल्ड के लिए बॉट आईडी यहीं से बनाई,',
      'ऑटोमैटिक मैचमेकिंग इतनी स्मूथ चलेगी सोचा नहीं था,'
    ];
    const middles = [
      `सुबह देखा तो गिल्ड में सीधे +${gloryVal} ग्लोरी जुड़ चुकी थी`,
      `१० घंटे के नॉनस्टॉप सेशन में कुल ${matches} मैच अपने आप पूरे हो गए`,
      `जैसे ही एक बॉट में दिक्कत आई, तुरंत बैकअप आईडी ने जगह ले ली और मैच नहीं रुका`,
      `${bots} बॉट्स ने मिलकर इस हफ्ते +${gloryVal} वीकली ग्लोरी आराम से पूरी कर दी`,
      `लाइव गिल्ड एनालिटिक्स कार्ड में हर मेंबर की ग्लोरी साफ-साफ दिखती है`,
      `${squads} स्क्वाड लगातार १० घंटे तक बिना किसी रुकावट के चलते रहे`,
      `प्राइवेट एपीआई और क्रेडिट सिस्टम दोनों बहुत ही प्रोफेशनल और तेज़ हैं`
    ];
    const closers = [
      '— एकदम पैसा वसूल सर्विस है! ⭐',
      '— हर गिल्ड लीडर को एक बार ज़रूर ट्राई करना चाहिए।',
      '— अब हमारी गिल्ड हमेशा टॉप पर रहती है!',
      '— सच में १०/१० परफॉर्मेंस है।',
      '— बिना किसी टेंशन के पूरा काम ऑटोमैटिक हो जाता है।',
      '— इतना स्थिर और भरोसेमंद इंजन पहले कभी नहीं देखा!'
    ];
    return {
      langLabel: 'हिंदी',
      gloryTag: `+${gloryVal} Glory`,
      text: `${randPick(openers)} ${randPick(middles)} ${randPick(closers)}`
    };
  }

  // English
  const openers = [
    'Hands down the cleanest guild glory station we have ever used —',
    'Launched my squad before sleeping with 1 credit and woke up amazed:',
    'The 10-hour nonstop engine is rock solid;',
    'Automatic backup bot hot-swap saved our overnight run —',
    'Real-time guild glory analytics and countdown timer are super accurate;',
    'Forged a fresh roster straight into our clan ID and started matchmaking:',
    'Connected our custom clan portal using the private Developer API —',
    'Zero disconnects across the entire 10-hour session;',
    'Best automation suite for Clash Squad glory pushing —',
    'Our clan jumped straight up the regional leaderboard overnight:'
  ];
  const middles = [
    `our ${bots} bots contributed +${gloryVal} weekly glory without a single manual click`,
    `completed ${matches} consecutive matches in 10 hours with 100% uptime`,
    `when one account dropped, the standby backup bot stepped in within ${minsSwap} seconds`,
    `running ${squads} active squads generated +${gloryVal} verified guild glory effortlessly`,
    `the 10h live countdown and automatic session shutoff work with military precision`,
    `every single bot stayed synced inside the guild and delivered +${gloryVal} glory`
  ];
  const closers = [
    '— worth every single credit!',
    '— easily a 10/10 engineering setup.',
    '— completely unmatched stability and speed.',
    '— our entire guild leadership is blown away.',
    '— set it once for 10 hours and watch the glory roll in!',
    '— super clean UI and rock-solid backend.'
  ];
  return {
    langLabel: 'ENGLISH',
    gloryTag: `+${gloryVal} Glory`,
    text: `${randPick(openers)} ${randPick(middles)} ${randPick(closers)}`
  };
}

function nextUniqueFeedbackItem() {
  const langs = ['hinglish', 'hindi', 'english'];
  const langKey = langs[fbLangCursor % langs.length];
  fbLangCursor++;

  for (let attempt = 0; attempt < 80; attempt++) {
    const item = synthesizeFeedback(langKey);
    if (!usedFeedbackTexts.has(item.text)) {
      saveSeenFeedbackHistory(item.text);
      return {
        handle: generateUniqueHandle(),
        langLabel: item.langLabel,
        gloryTag: item.gloryTag,
        text: item.text
      };
    }
  }
  // Fallback with unique timestamp salt so it can never collide
  const fallback = synthesizeFeedback(langKey);
  const uniqueText = `${fallback.text} (#${Date.now().toString().slice(-4)})`;
  saveSeenFeedbackHistory(uniqueText);
  return {
    handle: generateUniqueHandle(),
    langLabel: fallback.langLabel,
    gloryTag: fallback.gloryTag,
    text: uniqueText
  };
}

function createFeedbackCardElement() {
  const data = nextUniqueFeedbackItem();
  const card = document.createElement('div');
  card.className = 'fb-train-card';
  const initial = (data.handle || 'O').charAt(0).toUpperCase();
  card.innerHTML = `
    <div class="fb-card-top">
      <div class="fb-user">
        <div class="fb-avatar">${escapeHtml(initial)}</div>
        <span class="fb-uname">${escapeHtml(data.handle)}</span>
        <span class="fb-lang-tag">${escapeHtml(data.langLabel)}</span>
      </div>
      <div class="fb-meta-right">
        <span class="fb-glory-tag">${escapeHtml(data.gloryTag)}</span>
        <span class="fb-stars">★★★★★</span>
      </div>
    </div>
    <div class="fb-text">${escapeHtml(data.text)}</div>
  `;
  return card;
}

function initFeedbackTrain() {
  const track = $('feedback-train-track');
  const bar = $('feedback-train-bar');
  if (!track || !bar) return;

  loadSeenFeedbackHistory();
  track.innerHTML = '';

  // Populate initial train of 10 unique cards across full screen width
  for (let i = 0; i < 10; i++) {
    track.appendChild(createFeedbackCardElement());
  }

  bar.addEventListener('mouseenter', () => { fbTrainPaused = true; });
  bar.addEventListener('mouseleave', () => { fbTrainPaused = false; });

  const SPEED_NORMAL = 46; // px per second (smooth right-to-left train)
  const SPEED_HOVER = 14;  // slows down on hover for easy reading

  function stepTrain(now) {
    if (!fbLastFrameTs) fbLastFrameTs = now;
    const dt = Math.min((now - fbLastFrameTs) / 1000, 0.1);
    fbLastFrameTs = now;

    if (currentView === 'landing' && !document.hidden) {
      const speed = fbTrainPaused ? SPEED_HOVER : SPEED_NORMAL;
      fbTrainOffset += speed * dt;

      const firstCard = track.firstElementChild;
      if (firstCard) {
        const gap = 12; // 0.75rem
        const cardStep = firstCard.offsetWidth + gap;
        if (cardStep > 40 && fbTrainOffset >= cardStep) {
          fbTrainOffset -= cardStep;
          firstCard.remove();
          // Append a brand-new, never-repeated feedback card on the right
          track.appendChild(createFeedbackCardElement());
        }
      }
      track.style.transform = `translate3d(${-fbTrainOffset.toFixed(2)}px, 0, 0)`;
    }

    fbTrainRafId = requestAnimationFrame(stepTrain);
  }

  if (fbTrainRafId) cancelAnimationFrame(fbTrainRafId);
  fbTrainRafId = requestAnimationFrame(stepTrain);
}

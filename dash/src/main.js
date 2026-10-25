import './style.css';
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

const STORAGE_TOKEN_KEY = 'machead_dash_session_token';

// Views
const viewAuth = document.getElementById('view-auth');
const viewConsole = document.getElementById('view-console');

// Auth steps
const stepProviders = document.getElementById('auth-step-providers');
const stepHandoff = document.getElementById('auth-step-handoff');

const authClientBanner = document.getElementById('auth-client-banner');
const authClientDeviceName = document.getElementById('auth-client-device-name');
const authErrorBanner = document.getElementById('auth-error-banner');

const handoffUserAvatar = document.getElementById('handoff-user-avatar');
const handoffAccountLabel = document.getElementById('handoff-account-label');
const handoffDeviceLabel = document.getElementById('handoff-device-label');
const btnConfirmHandoff = document.getElementById('btn-confirm-handoff');

// Console elements
const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserEmail = document.getElementById('sidebar-user-email');
const btnSidebarLogout = document.getElementById('btn-sidebar-logout');

const crumbCurrentTitle = document.getElementById('crumb-current-title');
const navDeviceCount = document.getElementById('nav-device-count');
const btnRefreshConsole = document.getElementById('btn-refresh-console');

const consoleToastBanner = document.getElementById('console-toast-banner');
const consoleErrorBanner = document.getElementById('console-error-banner');
const consoleProgressBanner = document.getElementById('console-progress-banner');
const consoleProgressText = document.getElementById('console-progress-text');
const consoleProgressPct = document.getElementById('console-progress-pct');
const consoleProgressBar = document.getElementById('console-progress-bar');

const statTotalDevices = document.getElementById('stat-total-devices');
const statOnlineDevices = document.getElementById('stat-online-devices');
const statHeadlessDevices = document.getElementById('stat-headless-devices');

const devicesTableWrap = document.getElementById('devices-table-wrap');
const devicesCardsGrid = document.getElementById('devices-cards-grid');
const devicesEmptyState = document.getElementById('devices-empty-state');

// Unified Device Workspace & Terminal elements
const btnBackDevices = document.getElementById('btn-back-devices');
const termHostTitle = document.getElementById('term-host-title');
const wsTransportBadge = document.getElementById('ws-transport-badge');
const wsTermTabCount = document.getElementById('ws-term-tab-count');
const termTabsList = document.getElementById('term-tabs-list');
const btnNewTermTab = document.getElementById('btn-new-term-tab');
const xtermMount = document.getElementById('xterm-mount');
const termDimsBadge = document.getElementById('term-dims-badge');
const btnTermPasteRemote = document.getElementById('btn-term-paste-remote');
const btnTermCopyRemote = document.getElementById('btn-term-copy-remote');
const btnTermClear = document.getElementById('btn-term-clear');
const btnTermReconnect = document.getElementById('btn-term-reconnect');
const btnTermDisconnect = document.getElementById('btn-term-disconnect');
const termDotClose = document.getElementById('term-dot-close');
const termDotFullscreen = document.getElementById('term-dot-fullscreen');
const termMobileBar = document.getElementById('term-mobile-bar');

// File Manager elements
const fsQuickpathsList = document.getElementById('fs-quickpaths-list');
const chkFsHidden = document.getElementById('chk-fs-hidden');
const btnFsUp = document.getElementById('btn-fs-up');
const btnFsRefresh = document.getElementById('btn-fs-refresh');
const inputFsPath = document.getElementById('input-fs-path');
const btnFsGo = document.getElementById('btn-fs-go');
const inputFsUploadFile = document.getElementById('input-fs-upload-file');
const btnFsUpload = document.getElementById('btn-fs-upload');
const btnFsMkdir = document.getElementById('btn-fs-mkdir');
const btnFsNewfile = document.getElementById('btn-fs-newfile');
const btnFsOpenTerm = document.getElementById('btn-fs-open-term');
const fsBreadcrumbs = document.getElementById('fs-breadcrumbs');
const fsDropzone = document.getElementById('fs-dropzone');
const fsTableBody = document.getElementById('fs-table-body');

// File Editor Modal elements
const fsEditorModal = document.getElementById('fs-editor-modal');
const editorFileName = document.getElementById('editor-file-name');
const editorFileMeta = document.getElementById('editor-file-meta');
const editorTextarea = document.getElementById('editor-textarea');
const btnEditorSave = document.getElementById('btn-editor-save');
const btnEditorClose = document.getElementById('btn-editor-close');

// System Status & Remote Control elements
const sysHeadlessBadge = document.getElementById('sys-headless-badge');
const sysHeadlessDesc = document.getElementById('sys-headless-desc');
const btnSysToggleHeadless = document.getElementById('btn-sys-toggle-headless');
const sysHostName = document.getElementById('sys-host-name');
const btnSysRefresh = document.getElementById('btn-sys-refresh');
const sysMetaChip = document.getElementById('sys-meta-chip');
const sysMetaUptime = document.getElementById('sys-meta-uptime');
const sysMetaPower = document.getElementById('sys-meta-power');

const sysCpuVal = document.getElementById('sys-cpu-val');
const sysCpuBar = document.getElementById('sys-cpu-bar');
const sysCpuSub = document.getElementById('sys-cpu-sub');

const sysMemVal = document.getElementById('sys-mem-val');
const sysMemBar = document.getElementById('sys-mem-bar');
const sysMemSub = document.getElementById('sys-mem-sub');

const sysDiskVal = document.getElementById('sys-disk-val');
const sysDiskBar = document.getElementById('sys-disk-bar');
const sysDiskSub = document.getElementById('sys-disk-sub');

const sysThermalVal = document.getElementById('sys-thermal-val');
const sysThermalBar = document.getElementById('sys-thermal-bar');
const sysThermalSub = document.getElementById('sys-thermal-sub');

const sysPortsCount = document.getElementById('sys-ports-count');
const sysPortsBody = document.getElementById('sys-ports-body');
const sysProcsBody = document.getElementById('sys-procs-body');

const textEncoder = new TextEncoder();

let currentUser = null;
let currentDevices = [];
let pollTimer = null;
let wasmReadyPromise = null;
let wasmShowProgress = false;
let wasmStageLabel = '正在准备终端环境...';
let wasmStagePct = 35;

// Active Device Workspace State
let lastConnectedAddr = null;
let lastConnectedHost = 'MacBook Pro';
let currentSubpane = 'term'; // 'term' | 'files' | 'status'

// Multi-Tab Terminal State
const terminalTabs = new Map(); // tabId -> { id, title, cwd, xterm, fitAddon, mountEl, session, ro }
let activeTermTabId = null;
let termTabSeq = 0;

// File Manager State
let currentFsPath = '';
let currentFsParent = '';
let currentEditingPath = '';

// System Status Polling State
let statusPollTimer = null;
let currentSysStatus = null;

const WASM_VERSION = 'v6';
const WASM_CACHE_NAME = `machead-tailcat-wasm-${WASM_VERSION}`;
const WASM_DECOMPRESSED_KEY = `/terminal/tailcat.wasm.decompressed.${WASM_VERSION}`;

// Active WebRTC P2P PeerConnection pool keyed by Tailcat address
const rtcPeerPool = new Map();
const LOCAL_SIGNAL_ENDPOINT = 'http://127.0.0.1:41891/webrtc/signal';
const LOCAL_RPC_ENDPOINT = 'http://127.0.0.1:41891/webrtc/rpc';

const urlParams = new URLSearchParams(window.location.search);
let pendingAppAuthRequestId = urlParams.get('app_auth') || '';
let pendingAppCodeChallenge = urlParams.get('code_challenge') || '';
let pendingAppDeviceName = urlParams.get('device_name') || 'MacHead 客户端';
const requestedProvider = urlParams.get('provider') || '';
const initialAuthError = urlParams.get('auth_error') || '';

function getSessionToken() {
  return localStorage.getItem(STORAGE_TOKEN_KEY) || '';
}

function setSessionToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function uint8ToBase64(u8) {
  let bin = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize));
  }
  return btoa(bin);
}

function toBase64UrlUtf8(str) {
  return uint8ToBase64(textEncoder.encode(String(str || '')))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function joinRemotePath(dir, name) {
  const base = dir || '/';
  return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
}

function base64ToUint8(b64) {
  const bin = atob(b64 || '');
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    u8[i] = bin.charCodeAt(i);
  }
  return u8;
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const val = n / Math.pow(1024, i);
  return `${val >= 100 || i === 0 ? Math.round(val) : val.toFixed(1)} ${units[i]}`;
}

function formatUptime(sec) {
  const s = Math.max(0, Number(sec || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${mins} 分钟`;
  return `${Math.max(1, mins)} 分钟`;
}

function resolveUserAvatar(user) {
  if (!user) return '/logo.png';
  if (user.avatar_url) return user.avatar_url;
  const sub = user.provider_sub || (user.email ? user.email.split('@')[0] : '') || user.name || '';
  if ((user.provider || 'github') === 'github' && sub) {
    return `https://github.com/${encodeURIComponent(sub)}.png?size=80`;
  }
  return '/logo.png';
}

function showToast(msg) {
  if (!msg) {
    consoleToastBanner.style.display = 'none';
    return;
  }
  consoleToastBanner.innerHTML = msg;
  consoleToastBanner.style.display = 'block';
  setTimeout(() => {
    consoleToastBanner.style.display = 'none';
  }, 4500);
}

function showError(msg) {
  if (!msg) {
    consoleErrorBanner.style.display = 'none';
    return;
  }
  consoleErrorBanner.textContent = msg;
  consoleErrorBanner.style.display = 'block';
}

function setProgress(label, pct) {
  if (!label) {
    consoleProgressBanner.style.display = 'none';
    return;
  }
  consoleProgressBanner.style.display = 'block';
  consoleProgressText.textContent = label;
  consoleProgressPct.textContent = `${Math.round(pct)}%`;
  consoleProgressBar.style.width = `${Math.max(5, Math.min(100, pct))}%`;
}

function getActiveTermTab() {
  return activeTermTabId ? terminalTabs.get(activeTermTabId) || null : null;
}

/**
 * Navigation switching inside Console Workspace
 */
function switchConsoleTab(tabKey, hostLabel = '') {
  if (tabKey === 'terminal') {
    crumbCurrentTitle.textContent = hostLabel ? `我的设备 / ${hostLabel}` : '设备工作区';
  } else {
    crumbCurrentTitle.textContent = '我的设备';
    stopSystemStatusPolling();
  }

  document.querySelectorAll('.sidebar-nav-item').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-nav') === 'devices');
  });

  document.getElementById('pane-devices').classList.toggle('is-active', tabKey === 'devices');
  document.getElementById('pane-terminal').classList.toggle('is-active', tabKey === 'terminal');

  if (tabKey === 'terminal' && currentSubpane === 'term') {
    fitActiveTerminalTab();
  }
}

function switchWorkspaceSubpane(subpaneKey) {
  currentSubpane = subpaneKey || 'term';
  document.querySelectorAll('.ws-subnav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.getAttribute('data-subpane') === currentSubpane);
  });

  document.getElementById('subpane-term').classList.toggle('is-active', currentSubpane === 'term');
  document.getElementById('subpane-files').classList.toggle('is-active', currentSubpane === 'files');
  document.getElementById('subpane-status').classList.toggle('is-active', currentSubpane === 'status');

  if (currentSubpane === 'term') {
    stopSystemStatusPolling();
    fitActiveTerminalTab();
  } else if (currentSubpane === 'files') {
    stopSystemStatusPolling();
    if (lastConnectedAddr) {
      loadFsDirectory(currentFsPath || '');
    }
  } else if (currentSubpane === 'status') {
    startSystemStatusPolling();
  }
}

document.querySelectorAll('.ws-subnav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchWorkspaceSubpane(btn.getAttribute('data-subpane') || 'term');
  });
});

document.querySelectorAll('.sidebar-nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nav = btn.getAttribute('data-nav');
    switchConsoleTab(nav || 'devices');
  });
});

btnBackDevices.addEventListener('click', () => {
  switchConsoleTab('devices');
});

/**
 * Real OAuth 2.0 Login Redirect Flow (GitHub / Google)
 */
const PROVIDER_LABELS = {
  github: 'GitHub',
  google: 'Google',
};

function startOAuthLogin(provider, triggerBtn = null) {
  const p = PROVIDER_LABELS[provider] ? provider : 'github';
  if (triggerBtn) {
    const labelEl = triggerBtn.querySelector('.sso-btn-label');
    if (labelEl) {
      labelEl.textContent = `正在跳转至 ${PROVIDER_LABELS[p]} 授权...`;
    }
    triggerBtn.disabled = true;
  }

  const loginUrl = new URL('/api/auth', window.location.origin);
  loginUrl.searchParams.set('action', 'login');
  loginUrl.searchParams.set('provider', p);
  if (pendingAppAuthRequestId) {
    loginUrl.searchParams.set('app_auth', pendingAppAuthRequestId);
  }
  if (pendingAppCodeChallenge) {
    loginUrl.searchParams.set('code_challenge', pendingAppCodeChallenge);
  }
  if (pendingAppDeviceName) {
    loginUrl.searchParams.set('device_name', pendingAppDeviceName);
  }

  window.location.href = loginUrl.toString();
}

document.querySelectorAll('[data-provider]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const provider = btn.getAttribute('data-provider');
    startOAuthLogin(provider, btn);
  });
});

/**
 * Client Device Handoff Authorization Step
 */
function showHandoffStep() {
  viewConsole.style.display = 'none';
  viewAuth.style.display = 'flex';
  stepProviders.style.display = 'none';
  stepHandoff.style.display = 'block';

  handoffUserAvatar.src = resolveUserAvatar(currentUser);
  handoffAccountLabel.textContent = currentUser?.name || currentUser?.email || '当前账号';
  handoffDeviceLabel.textContent = pendingAppDeviceName;

  scheduleTailcatWasmPrewarm();
}

async function performAppHandoffApproval() {
  if (!pendingAppAuthRequestId || !getSessionToken()) return;
  btnConfirmHandoff.disabled = true;
  btnConfirmHandoff.textContent = '正在授权并绑定...';

  try {
    const resp = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSessionToken()}`,
      },
      body: JSON.stringify({
        action: 'approve_app',
        requestId: pendingAppAuthRequestId,
        codeChallenge: pendingAppCodeChallenge,
        deviceName: pendingAppDeviceName,
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.ok) {
      const boundName = pendingAppDeviceName;
      pendingAppAuthRequestId = '';
      pendingAppCodeChallenge = '';
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('app_auth');
      cleanUrl.searchParams.delete('code_challenge');
      cleanUrl.searchParams.delete('device_name');
      cleanUrl.searchParams.delete('provider');
      cleanUrl.searchParams.delete('quick_provider');
      history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search);

      await enterConsoleWorkspace();
      showToast(`✅ 已绑定「<strong>${escapeHtml(boundName)}</strong>」`);
    } else {
      if (resp.status === 401) {
        setSessionToken('');
        currentUser = null;
        showAuthView();
      }
      alert(data.error || '授权失败，请重新登录或重试');
    }
  } catch (err) {
    alert(err.message || '授权失败');
  } finally {
    btnConfirmHandoff.disabled = false;
    btnConfirmHandoff.textContent = '确认授权并绑定';
  }
}

btnConfirmHandoff.addEventListener('click', performAppHandoffApproval);

/**
 * Console Workspace Rendering
 */
function updateSidebarUser(user) {
  if (!user) return;
  sidebarUserName.textContent = user.name || user.email || 'MacHead User';
  sidebarUserEmail.textContent = user.email || user.provider || 'github';
  sidebarUserAvatar.src = resolveUserAvatar(user);
}

function formatRelativeTime(unixSec) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - Number(unixSec || 0));
  if (diff < 15) return '刚刚活跃';
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function renderDevices(devices) {
  currentDevices = devices || [];
  const onlineCount = currentDevices.filter((d) => d.isOnline).length;
  const headlessCount = currentDevices.filter((d) => d.isHeadless).length;

  navDeviceCount.textContent = String(currentDevices.length);
  statTotalDevices.textContent = String(currentDevices.length);
  statOnlineDevices.textContent = String(onlineCount);
  statHeadlessDevices.textContent = String(headlessCount);

  if (currentDevices.length === 0) {
    if (devicesTableWrap) devicesTableWrap.style.display = 'none';
    devicesEmptyState.style.display = 'block';
    return;
  }

  devicesEmptyState.style.display = 'none';
  if (devicesTableWrap) devicesTableWrap.style.display = 'block';

  // Silently pre-establish P2P WebRTC + Tailcat channel for online devices
  for (const dev of currentDevices) {
    if (dev.isOnline && dev.tcAddr) {
      prewarmDeviceTransport(dev.tcAddr);
    }
  }

  devicesCardsGrid.innerHTML = currentDevices
    .map((dev) => {
      const statusCls = dev.isOnline ? 'online' : 'offline';
      const statusText = dev.isOnline ? '● 在线' : '○ 离线';
      const cleanArch = String(dev.modelArch || 'Apple Silicon').replace(/\s*\([^)]*\)/g, '');
      const headlessBadge = dev.isHeadless
        ? '<span class="device-tag headless">无头模式</span>'
        : '<span class="device-tag">常规模式</span>';

      return `
        <tr class="device-row">
          <td class="cell-device">
            <div class="device-identity">
              <div class="device-icon"></div>
              <div class="device-identity-text">
                <div class="device-name">${escapeHtml(dev.deviceName)}</div>
                <div class="device-system-text">${escapeHtml(dev.osVersion || 'macOS')} · ${escapeHtml(cleanArch)}</div>
              </div>
            </div>
          </td>
          <td class="cell-status">
            <span class="status-badge ${statusCls}">${statusText}</span>
          </td>
          <td class="cell-mode">
            ${headlessBadge}
          </td>
          <td class="cell-seen">
            <span class="device-seen-text">${formatRelativeTime(dev.lastSeenAt)}</span>
          </td>
          <td class="cell-actions">
            <div class="device-row-actions">
              <button type="button" class="btn-connect-ssh" data-connect-id="${escapeHtml(dev.deviceId)}" data-open-subpane="term">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2.5"/><polyline points="7 9.5 10 12.5 7 15.5"/><line x1="12.5" y1="15.5" x2="17" y2="15.5"/></svg>
                <span>终端</span>
              </button>
              <button type="button" class="btn-row-secondary" data-connect-id="${escapeHtml(dev.deviceId)}" data-open-subpane="files">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 2.5h9a2 2 0 0 1 2 2z"/></svg>
                <span>文件</span>
              </button>
              <button type="button" class="btn-row-secondary" data-connect-id="${escapeHtml(dev.deviceId)}" data-open-subpane="status">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2.5"/><polyline points="6 12 9 12 10.8 8.5 13.2 15.5 15 12 18 12"/></svg>
                <span>状态与远控</span>
              </button>
              <button type="button" class="btn-remove-device" data-remove-id="${escapeHtml(dev.deviceId)}">
                解绑
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function fetchDevices() {
  const token = getSessionToken();
  if (!token) return;

  try {
    const resp = await fetch('/api/devices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.status === 401) {
      setSessionToken('');
      showAuthView();
      return;
    }
    const data = await resp.json();
    if (resp.ok && data.ok) {
      if (data.user) {
        currentUser = data.user;
        updateSidebarUser(currentUser);
      }
      renderDevices(data.devices || []);
    }
  } catch {}
}

function showAuthView() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  stopSystemStatusPolling();
  viewConsole.style.display = 'none';
  viewAuth.style.display = 'flex';
  stepProviders.style.display = 'block';
  stepHandoff.style.display = 'none';

  if (pendingAppAuthRequestId) {
    authClientBanner.style.display = 'flex';
    authClientDeviceName.textContent = pendingAppDeviceName;
  } else {
    authClientBanner.style.display = 'none';
  }

  if (initialAuthError && authErrorBanner) {
    authErrorBanner.textContent = initialAuthError;
    authErrorBanner.style.display = 'block';
  } else if (authErrorBanner) {
    authErrorBanner.style.display = 'none';
  }

  if (
    requestedProvider &&
    PROVIDER_LABELS[requestedProvider] &&
    !initialAuthError &&
    !window.location.pathname.startsWith('/api/') &&
    !urlParams.get('action')
  ) {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('provider');
    history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search);
    startOAuthLogin(requestedProvider);
    return;
  }

  scheduleTailcatWasmPrewarm();
}

async function enterConsoleWorkspace() {
  viewAuth.style.display = 'none';
  viewConsole.style.display = 'flex';
  updateSidebarUser(currentUser);
  switchConsoleTab('devices');
  await fetchDevices();

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.hidden) {
      fetchDevices();
    }
  }, 5000);

  scheduleTailcatWasmPrewarm();
}

btnRefreshConsole.addEventListener('click', () => {
  fetchDevices();
  if (document.getElementById('pane-terminal').classList.contains('is-active')) {
    if (currentSubpane === 'files') loadFsDirectory(currentFsPath);
    if (currentSubpane === 'status') refreshSystemStatus();
  }
});

function teardownAllDeviceConnections() {
  closeAllTerminalTabs();
  for (const [, entry] of rtcPeerPool) {
    try {
      entry.pc?.close();
    } catch {}
  }
  rtcPeerPool.clear();
  if (typeof globalThis.tailcatCloseAll === 'function') {
    try {
      globalThis.tailcatCloseAll();
    } catch {}
  }
}

btnSidebarLogout.addEventListener('click', async () => {
  teardownAllDeviceConnections();
  const token = getSessionToken();
  if (token) {
    await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {});
  }
  setSessionToken('');
  currentUser = null;
  showAuthView();
});

devicesCardsGrid.addEventListener('click', async (e) => {
  const connectBtn = e.target.closest('[data-connect-id]');
  if (connectBtn) {
    const devId = connectBtn.getAttribute('data-connect-id');
    const targetSubpane = connectBtn.getAttribute('data-open-subpane') || 'term';
    const dev = currentDevices.find((d) => d.deviceId === devId);
    if (!dev || !dev.tcAddr) return;
    await openDeviceWorkspace(dev.tcAddr, dev.deviceName || 'MacBook Pro', targetSubpane);
    return;
  }

  const removeBtn = e.target.closest('[data-remove-id]');
  if (removeBtn) {
    const devId = removeBtn.getAttribute('data-remove-id');
    const token = getSessionToken();
    if (!devId || !token) return;
    await fetch(`/api/devices?device_id=${encodeURIComponent(devId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    await fetchDevices();
  }
});

/**
 * Tailcat Wasm + WebRTC Happy Eyeballs Transport Engine
 */
function updateWasmProgress(label, pct) {
  wasmStageLabel = label;
  wasmStagePct = pct;
  if (wasmShowProgress) {
    setProgress(label, pct);
  }
}

async function getDecompressedWasmResponse() {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(WASM_CACHE_NAME);
      const cached = await cache.match(WASM_DECOMPRESSED_KEY);
      if (cached) {
        return cached;
      }
    } catch {}
  }

  const resp = await fetch(`/terminal/tailcat.wasm.gz?v=${WASM_VERSION}`, { cache: 'force-cache' });
  if (!resp.ok) {
    throw new Error(`加载终端组件失败 (HTTP ${resp.status})`);
  }

  let wasmStream = resp.body;
  const contentEncoding = (resp.headers.get('Content-Encoding') || '').toLowerCase();
  if (!contentEncoding.includes('gzip') && typeof DecompressionStream === 'function') {
    wasmStream = wasmStream.pipeThrough(new DecompressionStream('gzip'));
  }

  const decompressedBytes = await new Response(wasmStream).arrayBuffer();

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(WASM_CACHE_NAME);
      await cache.put(
        WASM_DECOMPRESSED_KEY,
        new Response(decompressedBytes, {
          headers: { 'Content-Type': 'application/wasm' },
        })
      );
    } catch {}
  }

  return new Response(decompressedBytes, {
    headers: { 'Content-Type': 'application/wasm' },
  });
}

async function ensureTailcatWasmLoaded({ silent = false } = {}) {
  if (typeof globalThis.tailcatConnectSSH === 'function') return;

  if (!silent) {
    wasmShowProgress = true;
    setProgress(wasmStageLabel, wasmStagePct);
  }

  if (wasmReadyPromise) return wasmReadyPromise;

  wasmReadyPromise = (async () => {
    updateWasmProgress('正在准备终端环境...', 35);
    if (typeof globalThis.Go !== 'function') {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src="/terminal/wasm_exec.js"]');
        if (existing && typeof globalThis.Go === 'function') {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = '/terminal/wasm_exec.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('无法加载终端组件'));
        document.head.appendChild(script);
      });
    }

    updateWasmProgress('正在连接远程设备...', 65);
    const readyCallback = new Promise((resolve) => {
      globalThis.onTailcatReady = resolve;
    });

    const go = new globalThis.Go();
    const decompressedResponse = await getDecompressedWasmResponse();

    let instance;
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      const result = await WebAssembly.instantiateStreaming(decompressedResponse, go.importObject);
      instance = result.instance;
    } else {
      const bytes = await decompressedResponse.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, go.importObject);
      instance = result.instance;
    }

    go.run(instance);
    await readyCallback;
  })();

  try {
    await wasmReadyPromise;
  } catch (err) {
    wasmReadyPromise = null;
    throw err;
  } finally {
    wasmShowProgress = false;
  }
}

function scheduleTailcatWasmPrewarm() {
  if (typeof globalThis.tailcatConnectSSH === 'function' || wasmReadyPromise) return;
  const trigger = () => {
    ensureTailcatWasmLoaded({ silent: true }).catch(() => {});
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(trigger, { timeout: 1200 });
  } else {
    setTimeout(trigger, 300);
  }
}

function gatherLocalOfferSDP(pc, { lanOnly = false } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let fastTimer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (fastTimer) clearTimeout(fastTimer);
      resolve(pc.localDescription?.sdp || '');
    };

    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        finish();
      }
    });

    pc.addEventListener('icecandidate', (ev) => {
      if (!ev.candidate) {
        finish();
        return;
      }
      const candStr = ev.candidate.candidate || '';
      if (lanOnly) {
        if (!fastTimer) {
          fastTimer = setTimeout(finish, 18);
        }
      } else if (candStr.includes('typ srflx')) {
        if (fastTimer) clearTimeout(fastTimer);
        fastTimer = setTimeout(finish, 25);
      } else if (!fastTimer) {
        fastTimer = setTimeout(finish, 240);
      }
    });

    setTimeout(finish, lanOnly ? 90 : 750);
  });
}

const addrHashCache = new Map();
const nonLoopbackAddrs = new Set();
const devicePassHashes = new Map();

async function sha256HexString(rawStr) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(String(rawStr || '')));
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function getAddrSha256Hex(addr) {
  const trimmed = String(addr || '').trim();
  if (addrHashCache.has(trimmed)) {
    return addrHashCache.get(trimmed);
  }
  const hex = await sha256HexString(trimmed);
  addrHashCache.set(trimmed, hex);
  return hex;
}

async function attemptHappyEyeballsTrack(addr, mode, abortSignal) {
  if (mode === 'loopback-direct' && nonLoopbackAddrs.has(addr)) {
    throw new Error('non-loopback device');
  }
  const isLANOnly = mode === 'loopback-direct' || mode === 'lan-direct';
  const pc = new RTCPeerConnection({
    iceServers: isLANOnly
      ? []
      : [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }],
  });

  let openTimer = null;
  const closePc = () => {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    try {
      pc.close();
    } catch {}
  };

  if (abortSignal?.aborted) {
    closePc();
    throw new Error('aborted');
  }
  abortSignal?.addEventListener('abort', closePc, { once: true });

  try {
    const keepaliveDc = pc.createDataChannel('keepalive', { ordered: true });
    const channelOpenPromise = new Promise((resolve, reject) => {
      const timeoutMs =
        mode === 'loopback-direct' ? 750 : mode === 'lan-direct' ? 1800 : 5000;
      openTimer = setTimeout(() => {
        reject(new Error(`${mode} timeout`));
      }, timeoutMs);

      const checkConnected = () => {
        if (keepaliveDc.readyState === 'open' || pc.connectionState === 'connected') {
          if (openTimer) {
            clearTimeout(openTimer);
            openTimer = null;
          }
          resolve(pc);
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          if (openTimer) {
            clearTimeout(openTimer);
            openTimer = null;
          }
          reject(new Error(`${mode} failed`));
        }
      };

      keepaliveDc.addEventListener('open', checkConnected);
      pc.addEventListener('connectionstatechange', checkConnected);
    });
    channelOpenPromise.catch(() => {});

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const offerSDP = await gatherLocalOfferSDP(pc, { lanOnly: isLANOnly });
    if (abortSignal?.aborted) {
      throw new Error('aborted');
    }

    let ans = null;
    const passHash = devicePassHashes.get(addr) || '';
    if (mode === 'loopback-direct') {
      const ctrl = new AbortController();
      const fetchTimer = setTimeout(() => ctrl.abort(), 320);
      try {
        const resp = await fetch(LOCAL_SIGNAL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addr,
            passHash,
            sdp: offerSDP || pc.localDescription.sdp,
            lanOnly: true,
          }),
          signal: ctrl.signal,
        });
        if (!resp.ok) {
          nonLoopbackAddrs.add(addr);
          throw new Error(`HTTP ${resp.status}`);
        }
        ans = await resp.json();
      } catch (err) {
        nonLoopbackAddrs.add(addr);
        throw err;
      } finally {
        clearTimeout(fetchTimer);
      }
    } else {
      await ensureTailcatWasmLoaded({ silent: true });
      if (abortSignal?.aborted) {
        throw new Error('aborted');
      }
      if (typeof globalThis.tailcatSignalWebRTC !== 'function') {
        throw new Error('Wasm WebRTC 信令未就绪');
      }
      ans = await globalThis.tailcatSignalWebRTC({
        addr,
        passHash,
        sdp: offerSDP || pc.localDescription.sdp,
        lanOnly: isLANOnly,
      });
    }

    if (!ans || !ans.sdp) {
      throw new Error('未获取到 WebRTC Answer');
    }

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: ans.sdp,
    });

    await channelOpenPromise;
    pc.__macheadMode = ans.mode || mode;
    return pc;
  } catch (err) {
    closePc();
    throw err;
  } finally {
    abortSignal?.removeEventListener('abort', closePc);
  }
}

const rtcFailureCooldownUntil = new Map();

function getOrCreateWebRTCPeer(addr, { ignoreCooldown = false } = {}) {
  const existing = rtcPeerPool.get(addr);
  if (
    existing &&
    existing.pc &&
    existing.pc.connectionState !== 'failed' &&
    existing.pc.connectionState !== 'closed' &&
    existing.pc.connectionState !== 'disconnected'
  ) {
    return existing.readyPromise;
  }
  if (existing && !existing.pc && existing.readyPromise) {
    return existing.readyPromise;
  }

  if (typeof window.RTCPeerConnection !== 'function') {
    return Promise.reject(new Error('当前浏览器不支持 WebRTC'));
  }

  if (!ignoreCooldown && (rtcFailureCooldownUntil.get(addr) || 0) > Date.now()) {
    return Promise.reject(new Error('WebRTC 冷却中，优先走直连或中继'));
  }

  const entry = { pc: null, mode: '', readyPromise: null, rpcChannelPromise: null };
  entry.readyPromise = (async () => {
    const controllers = [new AbortController(), new AbortController(), new AbortController()];
    let winnerPc = null;

    const wrapTrack = async (idx, mode, delayMs = 0) => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      if (winnerPc || controllers[idx].signal.aborted) {
        throw new Error('already settled');
      }
      const pc = await attemptHappyEyeballsTrack(addr, mode, controllers[idx].signal);
      if (winnerPc) {
        try {
          pc.close();
        } catch {}
        return winnerPc;
      }
      winnerPc = pc;
      controllers.forEach((c, i) => {
        if (i !== idx) c.abort();
      });
      return pc;
    };

    const winner = await Promise.any([
      wrapTrack(0, 'loopback-direct', 0),
      wrapTrack(1, 'lan-direct', 40),
      wrapTrack(2, 'wan-p2p', 220),
    ]);

    rtcFailureCooldownUntil.delete(addr);
    entry.pc = winner;
    entry.mode = winner.__macheadMode || 'webrtc-p2p';

    winner.addEventListener('connectionstatechange', () => {
      if (
        winner.connectionState === 'failed' ||
        winner.connectionState === 'closed' ||
        winner.connectionState === 'disconnected'
      ) {
        if (rtcPeerPool.get(addr) === entry) {
          rtcPeerPool.delete(addr);
        }
      }
    });

    return winner;
  })();

  entry.readyPromise.catch(() => {
    rtcFailureCooldownUntil.set(addr, Date.now() + 45000);
    if (rtcPeerPool.get(addr) === entry) {
      rtcPeerPool.delete(addr);
    }
    try {
      entry.pc?.close();
    } catch {}
  });

  rtcPeerPool.set(addr, entry);
  return entry.readyPromise;
}

globalThis.__macheadRaceWebRTC = getOrCreateWebRTCPeer;

function prewarmDeviceTransport(addr) {
  if (!addr || rtcPeerPool.has(addr) || (rtcFailureCooldownUntil.get(addr) || 0) > Date.now()) return;
  const start = () => {
    getOrCreateWebRTCPeer(addr).catch(() => {});
    ensureTailcatWasmLoaded({ silent: true })
      .then(() => {
        if (typeof globalThis.tailcatPreconnect === 'function') {
          globalThis.tailcatPreconnect(addr).catch(() => {});
        }
      })
      .catch(() => {});
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 800 });
  } else {
    setTimeout(start, 150);
  }
}

/**
 * Multiplexed P2P RPC Client (File Manager + System Status + Headless Control + Clipboard)
 * Supports WebRTC DataChannel ("rpc") with 48KB chunking, Local Loopback HTTP, and DERP TCP fallback.
 */
let rpcReqSeq = 0;

async function getOrCreateWebRTCRPCBridge(addr) {
  const pc = await getOrCreateWebRTCPeer(addr);
  if (pc.__rpcBridge && pc.__rpcBridge.dc.readyState === 'open') {
    return pc.__rpcBridge;
  }
  if (pc.__rpcBridgePromise) {
    return pc.__rpcBridgePromise;
  }

  pc.__rpcBridgePromise = (async () => {
    const dc = pc.createDataChannel('rpc', { ordered: true });
    const pending = new Map();
    const incomingChunks = new Map();

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          dc.close();
        } catch {}
        reject(new Error('RPC DataChannel timeout'));
      }, 3000);
      dc.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      dc.onerror = () => {
        clearTimeout(timer);
        try {
          dc.close();
        } catch {}
        reject(new Error('RPC DataChannel error'));
      };
    });

    const handleCompleteMessage = (rawStr) => {
      try {
        const resp = JSON.parse(rawStr);
        if (resp && resp.id && pending.has(resp.id)) {
          const { resolve, timer } = pending.get(resp.id);
          clearTimeout(timer);
          pending.delete(resp.id);
          resolve(resp);
        }
      } catch {}
    };

    dc.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      try {
        const parsed = JSON.parse(ev.data);
        if (parsed && parsed.__total > 0) {
          let state = incomingChunks.get(parsed.id);
          if (!state || state.total !== parsed.__total) {
            state = { total: parsed.__total, parts: new Array(parsed.__total), received: 0 };
            incomingChunks.set(parsed.id, state);
          }
          if (parsed.__chunk >= 0 && parsed.__chunk < state.total && state.parts[parsed.__chunk] === undefined) {
            state.parts[parsed.__chunk] = parsed.data;
            state.received++;
          }
          if (state.received === state.total) {
            incomingChunks.delete(parsed.id);
            handleCompleteMessage(state.parts.join(''));
          }
          return;
        }
      } catch {}
      handleCompleteMessage(ev.data);
    };

    dc.onclose = () => {
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error('RPC 通道已关闭'));
      }
      pending.clear();
      incomingChunks.clear();
      pc.__rpcBridge = null;
      pc.__rpcBridgePromise = null;
    };

    const bridge = {
      dc,
      call(id, payloadStr, timeoutMs = 20000) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            pending.delete(id);
            incomingChunks.delete(id);
            reject(new Error('RPC 请求超时'));
          }, timeoutMs);
          pending.set(id, { resolve, reject, timer });

          const maxChunk = 48 * 1024;
          if (payloadStr.length <= maxChunk) {
            dc.send(payloadStr);
          } else {
            const chunks = [];
            let start = 0;
            while (start < payloadStr.length) {
              let end = Math.min(start + maxChunk, payloadStr.length);
              if (end < payloadStr.length) {
                const code = payloadStr.charCodeAt(end - 1);
                if (code >= 0xd800 && code <= 0xdbff) {
                  end--;
                }
              }
              chunks.push(payloadStr.slice(start, end));
              start = end;
            }
            const total = chunks.length;
            for (let i = 0; i < total; i++) {
              dc.send(
                JSON.stringify({
                  id,
                  __chunk: i,
                  __total: total,
                  data: chunks[i],
                })
              );
            }
          }
        });
      },
    };

    pc.__rpcBridge = bridge;
    return bridge;
  })();

  try {
    return await pc.__rpcBridgePromise;
  } finally {
    pc.__rpcBridgePromise = null;
  }
}

async function callDeviceRPC(addr, method, params = {}, isPasswordRetry = false) {
  if (!addr) throw new Error('未选择设备');
  const id = `rpc_${Date.now()}_${++rpcReqSeq}`;
  const passHash = devicePassHashes.get(addr) || '';
  const reqObj = { id, addr, passHash, method, params };
  const payloadStr = JSON.stringify(reqObj);

  let resp = null;

  // Track 1: Multiplexed WebRTC DataChannel ("rpc")
  try {
    const bridge = await getOrCreateWebRTCRPCBridge(addr);
    resp = await bridge.call(id, payloadStr);
  } catch {}

  // Track 2: Localhost Loopback HTTP RPC (0ms when browser is on the same Mac)
  if (!resp && !nonLoopbackAddrs.has(addr)) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 900);
      try {
        const httpResp = await fetch(LOCAL_RPC_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, addr, passHash, method, params }),
          signal: ctrl.signal,
        });
        if (httpResp.ok) {
          resp = await httpResp.json();
        } else if (httpResp.status === 403) {
          nonLoopbackAddrs.add(addr);
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      nonLoopbackAddrs.add(addr);
    }
  }

  // Track 3: Encrypted Tailcat WireGuard DERP TCP Port 41892
  if (!resp) {
    await ensureTailcatWasmLoaded({ silent: true });
    if (typeof globalThis.tailcatRPC !== 'function') {
      throw new Error('远程 RPC 通道尚未就绪');
    }
    const rawResp = await globalThis.tailcatRPC({
      addr,
      payload: payloadStr,
    });
    resp = JSON.parse(rawResp);
  }

  if (!resp.ok) {
    const errMsg = String(resp.error || '远程操作失败');
    if (!isPasswordRetry && errMsg.startsWith('NEED_PASSWORD:')) {
      const entered = window.prompt('🔒 该 Mac 已开启安全访问口令保护，请输入访问口令：');
      if (entered !== null && entered.trim() !== '') {
        const hashed = await sha256HexString(entered.trim());
        devicePassHashes.set(addr, hashed);
        return callDeviceRPC(addr, method, params, true);
      }
    }
    throw new Error(errMsg.replace(/^NEED_PASSWORD:\s*/, ''));
  }
  return resp.result ?? resp.data;
}

globalThis.__macheadCallRPC = callDeviceRPC;
globalThis.__macheadOpenWorkspace = openDeviceWorkspace;

/**
 * Multi-Tab Terminal Connection & Management
 */
async function connectViaWebRTCDataChannel({ addr, cols, rows, term, tabId, cwd, onData, onClose }) {
  const pc = await getOrCreateWebRTCPeer(addr);
  const b64Cwd = cwd ? toBase64UrlUtf8(cwd) : '';
  const safeTabId = String(tabId || '1').replace(/[^a-zA-Z0-9_-]/g, '');
  const label = b64Cwd
    ? `pty:${cols || 80}x${rows || 24}:${term || 'xterm-256color'}:${safeTabId}:${b64Cwd}`
    : `pty:${cols || 80}x${rows || 24}:${term || 'xterm-256color'}:${safeTabId}`;

  const dc = pc.createDataChannel(label, { ordered: true });
  dc.binaryType = 'arraybuffer';

  let closed = false;
  const finishClose = (reason) => {
    if (closed) return;
    closed = true;
    try {
      dc.close();
    } catch {}
    if (typeof onClose === 'function') {
      onClose(reason || '连接已断开');
    }
  };

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        dc.close();
      } catch {}
      reject(new Error('打开 P2P 数据通道超时'));
    }, 3500);

    dc.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    dc.onerror = () => {
      clearTimeout(timer);
      try {
        dc.close();
      } catch {}
      reject(new Error('P2P 数据通道异常'));
    };
  });

  dc.onmessage = (ev) => {
    if (typeof ev.data === 'string') {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'exit') {
          finishClose(msg.reason || '终端会话已正常退出');
        }
      } catch {}
      return;
    }
    if (ev.data instanceof ArrayBuffer) {
      onData(new Uint8Array(ev.data));
    } else if (ev.data instanceof Blob) {
      ev.data.arrayBuffer().then((buf) => onData(new Uint8Array(buf))).catch(() => {});
    }
  };

  dc.onclose = () => {
    finishClose('终端会话已断开');
  };

  return {
    transport: pc.__macheadMode || 'webrtc-p2p',
    async write(u8) {
      if (dc.readyState === 'open') {
        dc.send(u8);
      }
    },
    async resize(newCols, newRows) {
      if (dc.readyState === 'open' && newCols > 0 && newRows > 0) {
        dc.send(
          JSON.stringify({
            type: 'resize',
            cols: newCols,
            rows: newRows,
          })
        );
      }
    },
    close() {
      finishClose('用户主动断开连接');
    },
  };
}

function createXtermInstance(mountNode) {
  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: 'block',
    fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
    fontSize: 14,
    lineHeight: 1.25,
    scrollback: 5000,
    theme: {
      background: '#0b0d12',
      foreground: '#e5e7eb',
      cursor: '#10b981',
      selectionBackground: 'rgba(16, 185, 129, 0.28)',
      black: '#1f242d',
      red: '#f87171',
      green: '#34d399',
      yellow: '#fbbf24',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#e5e7eb',
      brightBlack: '#4b5563',
      brightRed: '#fca5a5',
      brightGreen: '#6ee7b7',
      brightYellow: '#fde68a',
      brightBlue: '#93c5fd',
      brightMagenta: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#ffffff',
    },
  });

  const fit = new FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new WebLinksAddon());
  term.open(mountNode);
  return { term, fit };
}

function renderTerminalTabsBar() {
  wsTermTabCount.textContent = String(terminalTabs.size);
  const itemsHtml = [];
  for (const [id, tab] of terminalTabs.entries()) {
    const activeCls = id === activeTermTabId ? 'is-active' : '';
    itemsHtml.push(`
      <div class="term-tab-item ${activeCls}" data-tab-id="${escapeHtml(id)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        <span>${escapeHtml(tab.title)}</span>
        <button type="button" class="term-tab-close" data-close-tab="${escapeHtml(id)}" title="关闭此标签页">×</button>
      </div>
    `);
  }
  termTabsList.innerHTML = itemsHtml.join('');
}

function fitActiveTerminalTab() {
  const tab = getActiveTermTab();
  if (!tab) return;
  setTimeout(() => {
    try {
      tab.fitAddon.fit();
      termDimsBadge.textContent = `${tab.xterm.cols}×${tab.xterm.rows}`;
      tab.xterm.focus();
    } catch {}
  }, 25);
}

function activateTerminalTab(tabId) {
  if (!terminalTabs.has(tabId)) return;
  activeTermTabId = tabId;
  for (const [id, tab] of terminalTabs.entries()) {
    tab.mountEl.classList.toggle('is-active', id === tabId);
  }
  renderTerminalTabsBar();
  fitActiveTerminalTab();
}

function disposeTerminalTab(tab) {
  if (!tab) return;
  try {
    tab.ro?.disconnect();
  } catch {}
  try {
    tab.session?.close();
  } catch {}
  try {
    tab.xterm?.dispose();
  } catch {}
  try {
    tab.mountEl?.remove();
  } catch {}
}

function closeTerminalTab(tabId) {
  const tab = terminalTabs.get(tabId);
  if (!tab) return;
  disposeTerminalTab(tab);
  terminalTabs.delete(tabId);

  if (terminalTabs.size === 0) {
    activeTermTabId = null;
    renderTerminalTabsBar();
    switchConsoleTab('devices');
    return;
  }

  if (activeTermTabId === tabId) {
    const remainingIds = Array.from(terminalTabs.keys());
    activateTerminalTab(remainingIds[remainingIds.length - 1]);
  } else {
    renderTerminalTabsBar();
  }
}

function closeAllTerminalTabs() {
  for (const [, tab] of terminalTabs.entries()) {
    disposeTerminalTab(tab);
  }
  terminalTabs.clear();
  activeTermTabId = null;
  termTabSeq = 0;
  renderTerminalTabsBar();
}

async function createAndConnectTerminalTab({ cwd = '', title = '' } = {}) {
  if (!lastConnectedAddr) return;
  const tabNum = ++termTabSeq;
  const tabId = `tab_${tabNum}`;
  const shortDir = cwd ? cwd.split('/').filter(Boolean).pop() || '/' : '';
  const tabTitle = title || (shortDir ? `${shortDir} #${tabNum}` : `zsh #${tabNum}`);

  const mountEl = document.createElement('div');
  mountEl.className = 'xterm-tab-pane is-active';
  xtermMount.appendChild(mountEl);

  for (const [, existing] of terminalTabs.entries()) {
    existing.mountEl.classList.remove('is-active');
  }

  const { term, fit } = createXtermInstance(mountEl);
  const tabEntry = {
    id: tabId,
    title: tabTitle,
    cwd,
    xterm: term,
    fitAddon: fit,
    mountEl,
    session: null,
    ro: null,
  };

  terminalTabs.set(tabId, tabEntry);
  activeTermTabId = tabId;
  renderTerminalTabsBar();

  fit.fit();
  termDimsBadge.textContent = `${term.cols}×${term.rows}`;

  term.onData((data) => {
    if (tabEntry.session) {
      tabEntry.session.write(textEncoder.encode(data)).catch(() => {});
    }
  });

  term.onResize(({ cols, rows }) => {
    if (activeTermTabId === tabId) {
      termDimsBadge.textContent = `${cols}×${rows}`;
    }
    if (tabEntry.session) {
      tabEntry.session.resize(cols, rows).catch(() => {});
    }
  });

  const ro = new ResizeObserver(() => {
    if (
      activeTermTabId === tabId &&
      currentSubpane === 'term' &&
      document.getElementById('pane-terminal').classList.contains('is-active')
    ) {
      try {
        fit.fit();
      } catch {}
    }
  });
  ro.observe(mountEl);
  tabEntry.ro = ro;

  const cols = term.cols || 80;
  const rows = term.rows || 24;
  const onData = (chunk) => {
    term.write(chunk);
  };
  const onClose = (reason) => {
    tabEntry.session = null;
    term.writeln(`\r\n\x1b[33m${reason || '连接已断开'}。可点击「重连当前页」或新建标签页。\x1b[0m`);
  };

  try {
    let session = null;
    try {
      session = await connectViaWebRTCDataChannel({
        addr: lastConnectedAddr,
        cols,
        rows,
        term: 'xterm-256color',
        tabId,
        cwd,
        onData,
        onClose,
      });
    } catch {
      await ensureTailcatWasmLoaded({ silent: false });
      setProgress('', 0);
      session = await globalThis.tailcatConnectSSH({
        addr: lastConnectedAddr,
        cols,
        rows,
        term: 'xterm-256color',
        onStage: () => {},
        onData,
        onClose,
      });
      if (cwd) {
        const escaped = cwd.replace(/'/g, "'\\''");
        session.write(textEncoder.encode(`cd '${escaped}' && clear\n`)).catch(() => {});
      }
    }

    setProgress('', 0);
    if (!terminalTabs.has(tabId)) {
      try {
        session.close();
      } catch {}
      return;
    }
    tabEntry.session = session;
    wsTransportBadge.textContent =
      session.transport === 'loopback-direct'
        ? '本机直连'
        : session.transport === 'lan-direct'
          ? '局域网直连'
          : session.transport === 'wan-p2p'
            ? 'P2P 直连'
            : 'E2EE 隧道';

    fit.fit();
    await session.resize(term.cols, term.rows).catch(() => {});
    term.focus();
  } catch (err) {
    setProgress('', 0);
    term.writeln(`\r\n\x1b[31m连接失败: ${err.message || String(err)}\x1b[0m`);
  }
}

async function openDeviceWorkspace(addr, hostTitle, initialSubpane = 'term') {
  showError('');
  const isDifferentDevice = lastConnectedAddr !== addr;
  lastConnectedAddr = addr;
  lastConnectedHost = hostTitle || 'MacBook Pro';
  termHostTitle.textContent = lastConnectedHost;

  if (isDifferentDevice) {
    closeAllTerminalTabs();
    currentFsPath = '';
    currentSysStatus = null;
  }

  switchConsoleTab('terminal', lastConnectedHost);
  switchWorkspaceSubpane(initialSubpane);

  if (terminalTabs.size === 0) {
    await createAndConnectTerminalTab();
  }
}

termTabsList.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-close-tab]');
  if (closeBtn) {
    e.stopPropagation();
    closeTerminalTab(closeBtn.getAttribute('data-close-tab'));
    return;
  }
  const tabItem = e.target.closest('[data-tab-id]');
  if (tabItem) {
    activateTerminalTab(tabItem.getAttribute('data-tab-id'));
  }
});

btnNewTermTab.addEventListener('click', () => {
  createAndConnectTerminalTab();
});

function disconnectTerminalAndReturn() {
  stopSystemStatusPolling();
  closeAllTerminalTabs();
  if (currentUser) {
    switchConsoleTab('devices');
  } else {
    showAuthView();
  }
}

btnTermDisconnect.addEventListener('click', disconnectTerminalAndReturn);
termDotClose.addEventListener('click', disconnectTerminalAndReturn);

btnTermClear.addEventListener('click', () => {
  const tab = getActiveTermTab();
  if (tab) {
    tab.xterm.clear();
    tab.xterm.focus();
  }
});

btnTermReconnect.addEventListener('click', async () => {
  const tab = getActiveTermTab();
  if (!tab) {
    createAndConnectTerminalTab();
    return;
  }
  const savedCwd = tab.cwd || '';
  const savedTitle = tab.title || '';
  closeTerminalTab(tab.id);
  await createAndConnectTerminalTab({ cwd: savedCwd, title: savedTitle });
});

// Remote Clipboard Sync (pbpaste / pbcopy)
btnTermPasteRemote.addEventListener('click', async () => {
  if (!lastConnectedAddr) return;
  try {
    const res = await callDeviceRPC(lastConnectedAddr, 'sys_clipboard_get', {});
    const text = res?.text || '';
    if (!text) {
      showToast('📋 远端 Mac 剪贴板当前为空');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✅ 已读取远端 Mac 剪贴板并复制到本地 (${text.length} 字符)`);
    } catch {
      window.prompt('远端 Mac 剪贴板内容 (可按 ⌘C 复制)：', text);
    }
  } catch (err) {
    showError(`读取远端剪贴板失败: ${err.message}`);
  }
});

btnTermCopyRemote.addEventListener('click', async () => {
  if (!lastConnectedAddr) return;
  let text = '';
  try {
    text = await navigator.clipboard.readText();
  } catch {}
  if (!text) {
    text = window.prompt('请输入要写入远端 Mac 剪贴板的文本：', '') || '';
  }
  if (!text) return;
  try {
    await callDeviceRPC(lastConnectedAddr, 'sys_clipboard_set', { text });
    showToast(`✅ 已写入远端 Mac 剪贴板 (${text.length} 字符)`);
  } catch (err) {
    showError(`写入远端剪贴板失败: ${err.message}`);
  }
});

termDotFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

const KEY_MAP = {
  esc: '\x1b',
  tab: '\t',
  'ctrl-c': '\x03',
  'ctrl-d': '\x04',
  'ctrl-l': '\x0c',
  up: '\x1b[A',
  down: '\x1b[B',
  left: '\x1b[D',
  right: '\x1b[C',
};

termMobileBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.mkey');
  const tab = getActiveTermTab();
  if (!btn || !tab || !tab.session) return;
  const keyName = btn.getAttribute('data-key');
  const seq = KEY_MAP[keyName] || '';
  if (seq) {
    tab.session.write(textEncoder.encode(seq)).catch(() => {});
    tab.xterm.focus();
  }
});

/**
 * ============================================================================
 * SUBPANE 2: WEB FILE MANAGER (Browse, Upload, Download, Online Edit, Terminal)
 * ============================================================================
 */
function renderFsBreadcrumbs(fullPath) {
  const clean = String(fullPath || '/');
  const parts = clean.split('/').filter(Boolean);
  const crumbs = [`<button type="button" class="fs-crumb-btn" data-crumb-path="/">/</button>`];
  let acc = '';
  for (const part of parts) {
    acc += `/${part}`;
    crumbs.push(`<span class="fs-crumb-sep">/</span>`);
    crumbs.push(
      `<button type="button" class="fs-crumb-btn" data-crumb-path="${escapeHtml(acc)}">${escapeHtml(part)}</button>`
    );
  }
  fsBreadcrumbs.innerHTML = crumbs.join('');
}

async function loadFsDirectory(targetPath = '') {
  if (!lastConnectedAddr) return;
  showError('');
  try {
    const data = await callDeviceRPC(lastConnectedAddr, 'fs_list', {
      path: targetPath,
      showHidden: Boolean(chkFsHidden.checked),
    });

    currentFsPath = data.path || '/';
    currentFsParent = data.parentPath || '/';
    inputFsPath.value = currentFsPath;
    renderFsBreadcrumbs(currentFsPath);

    // Quick path pills
    const quickPaths = data.quickPaths || [];
    fsQuickpathsList.innerHTML = quickPaths
      .map((qp) => {
        const activeCls = qp.path === currentFsPath ? 'is-active' : '';
        return `<button type="button" class="fs-quick-pill ${activeCls}" data-quick-path="${escapeHtml(qp.path)}">${escapeHtml(qp.name)}</button>`;
      })
      .join('');

    const items = data.items || [];
    if (items.length === 0) {
      fsTableBody.innerHTML = `<tr><td colspan="4" class="fs-empty-cell">此文件夹为空（可直接拖拽文件到此处上传）</td></tr>`;
      return;
    }

    const svgFolder = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    const svgSymlink = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    const svgFile = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

    fsTableBody.innerHTML = items
      .map((item) => {
        const icon = item.isDir ? svgFolder : item.isSymlink ? svgSymlink : svgFile;
        const sizeLabel = item.isDir ? '--' : formatBytes(item.size);
        const timeStr = item.modTime
          ? new Date(item.modTime * 1000).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '--';

        const actionBtns = item.isDir
          ? `
            <button type="button" class="fs-mini-btn" data-fs-open-dir="${escapeHtml(item.path)}">打开</button>
            <button type="button" class="fs-mini-btn" data-fs-term-dir="${escapeHtml(item.path)}" title="在此目录新建终端">终端</button>
            <button type="button" class="fs-mini-btn" data-fs-rename="${escapeHtml(item.path)}" data-fs-name="${escapeHtml(item.name)}">重命名</button>
            <button type="button" class="fs-mini-btn danger" data-fs-delete="${escapeHtml(item.path)}" data-fs-name="${escapeHtml(item.name)}">删除</button>
          `
          : `
            <button type="button" class="fs-mini-btn" data-fs-edit="${escapeHtml(item.path)}" data-fs-name="${escapeHtml(item.name)}">编辑</button>
            <button type="button" class="fs-mini-btn" data-fs-download="${escapeHtml(item.path)}" data-fs-name="${escapeHtml(item.name)}">下载</button>
            <button type="button" class="fs-mini-btn" data-fs-rename="${escapeHtml(item.path)}" data-fs-name="${escapeHtml(item.name)}">重命名</button>
            <button type="button" class="fs-mini-btn danger" data-fs-delete="${escapeHtml(item.path)}" data-fs-name="${escapeHtml(item.name)}">删除</button>
          `;

        return `
          <tr class="device-row">
            <td>
              <button
                type="button"
                class="fs-entry-link"
                title="${escapeHtml(item.name)} (${escapeHtml(item.mode || '')})"
                data-fs-primary="${escapeHtml(item.path)}"
                data-fs-isdir="${item.isDir ? '1' : '0'}"
                data-fs-name="${escapeHtml(item.name)}"
              >
                <span class="fs-entry-icon">${icon}</span>
                <span class="fs-entry-name">${escapeHtml(item.name)}</span>
              </button>
            </td>
            <td class="fs-mono-cell">${escapeHtml(sizeLabel)}</td>
            <td class="fs-mono-cell" title="权限: ${escapeHtml(item.mode || '')}">${escapeHtml(timeStr)}</td>
            <td class="cell-actions">
              <div class="device-row-actions">${actionBtns}</div>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    showError(`读取目录失败: ${err.message}`);
  }
}

const IMAGE_EXT_MIMES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
};

const FORCE_TEXT_EXTS = new Set([
  'txt', 'log', 'md', 'markdown', 'json', 'jsonc', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'css', 'scss', 'less', 'html', 'htm', 'xml', 'svg', 'yaml', 'yml', 'toml', 'ini', 'conf',
  'cfg', 'env', 'sh', 'bash', 'zsh', 'fish', 'py', 'go', 'rs', 'swift', 'c', 'cc', 'cpp',
  'h', 'hpp', 'm', 'mm', 'java', 'kt', 'php', 'rb', 'pl', 'lua', 'sql', 'csv', 'tsv',
  'plist', 'gitignore', 'gitattributes', 'npmrc', 'editorconfig', 'dockerfile', 'makefile',
]);

function decodeFileBytesSmart(bytes, fileName = '') {
  if (!bytes || bytes.length === 0) {
    return { isText: true, text: '', encoding: 'UTF-8' };
  }
  const ext = (fileName.includes('.') ? fileName.split('.').pop() : fileName).toLowerCase();
  const isKnownTextExt = FORCE_TEXT_EXTS.has(ext);

  // Check UTF-16 BOM
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return {
      isText: true,
      text: new TextDecoder('utf-16le').decode(bytes.subarray(2)),
      encoding: 'UTF-16LE',
    };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return {
      isText: true,
      text: new TextDecoder('utf-16be').decode(bytes.subarray(2)),
      encoding: 'UTF-16BE',
    };
  }

  // Check NUL bytes in first 8KB
  const sampleLen = Math.min(bytes.length, 8192);
  let nulCount = 0;
  let badCtrl = 0;
  for (let i = 0; i < sampleLen; i++) {
    const b = bytes[i];
    if (b === 0) nulCount++;
    else if (b < 0x20 && b !== 9 && b !== 10 && b !== 13 && b !== 12 && b !== 8 && b !== 27) {
      badCtrl++;
    }
  }

  if (!isKnownTextExt && (nulCount > 0 || badCtrl * 25 > sampleLen)) {
    return { isText: false, text: '', encoding: 'Binary' };
  }

  // 1. Try strict UTF-8
  try {
    const startOffset =
      bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(startOffset));
    return { isText: true, text, encoding: startOffset ? 'UTF-8 BOM' : 'UTF-8' };
  } catch {}

  // 2. Fallback to GB18030 / GBK (covers Chinese GBK/GB2312/GB18030 text files such as config.txt)
  try {
    const text = new TextDecoder('gb18030', { fatal: false }).decode(bytes);
    return { isText: true, text, encoding: 'GBK / GB18030' };
  } catch {
    return {
      isText: true,
      text: new TextDecoder('utf-8', { fatal: false }).decode(bytes),
      encoding: 'UTF-8 (Lossy)',
    };
  }
}

async function openFileInEditor(filePath, fileName) {
  if (!lastConnectedAddr || !filePath) return;
  showError('');
  try {
    const data = await callDeviceRPC(lastConnectedAddr, 'fs_read', {
      path: filePath,
      maxBytes: 8 * 1024 * 1024,
    });
    const rawName = data.name || fileName || filePath.split('/').pop() || '';
    const ext = (rawName.includes('.') ? rawName.split('.').pop() : '').toLowerCase();

    const imgPreviewWrap = document.getElementById('editor-image-preview');
    const imgPreviewEl = document.getElementById('editor-preview-img');

    // 1. Inline image preview for .png / .jpg / .gif / .webp / .ico / .bmp
    if (IMAGE_EXT_MIMES[ext] && data.dataBase64) {
      currentEditingPath = data.path || filePath;
      editorFileName.textContent = currentEditingPath;
      editorFileMeta.textContent = `${formatBytes(data.size ?? Math.floor((data.dataBase64.length * 3) / 4))} · 图片预览`;
      editorTextarea.style.display = 'none';
      btnEditorSave.style.display = 'none';
      if (imgPreviewWrap && imgPreviewEl) {
        imgPreviewEl.src = `data:${IMAGE_EXT_MIMES[ext]};base64,${data.dataBase64}`;
        imgPreviewWrap.style.display = 'flex';
      }
      fsEditorModal.style.display = 'flex';
      return;
    }

    const bytes = data.dataBase64
      ? base64ToUint8(data.dataBase64)
      : textEncoder.encode(data.text || '');

    // 2. Smart multi-encoding text decode (UTF-8 + GBK/GB18030 + UTF-16)
    const decoded = decodeFileBytesSmart(bytes, rawName);
    if (!decoded.isText && !data.isText) {
      if (window.confirm(`「${rawName}」是二进制文件 (${formatBytes(data.size ?? bytes.length)})，是否直接下载？`)) {
        await downloadRemoteFile(filePath, rawName);
      }
      return;
    }

    currentEditingPath = data.path || filePath;
    editorFileName.textContent = currentEditingPath;
    editorFileMeta.textContent = `${formatBytes(data.size ?? bytes.length)} · ${decoded.encoding}`;
    if (imgPreviewWrap) imgPreviewWrap.style.display = 'none';
    editorTextarea.style.display = 'block';
    btnEditorSave.style.display = 'inline-flex';
    editorTextarea.value = decoded.text || data.text || '';
    fsEditorModal.style.display = 'flex';
    editorTextarea.focus();
  } catch (err) {
    showError(`打开文件失败: ${err.message}`);
  }
}

async function saveCurrentEditedFile() {
  if (!lastConnectedAddr || !currentEditingPath) return;
  btnEditorSave.disabled = true;
  btnEditorSave.textContent = '正在保存...';
  try {
    const res = await callDeviceRPC(lastConnectedAddr, 'fs_write', {
      path: currentEditingPath,
      content: editorTextarea.value,
      append: false,
    });
    editorFileMeta.textContent = `${formatBytes(res.size)} · UTF-8 · 已保存`;
    showToast(`✅ 已保存文件「<strong>${escapeHtml(currentEditingPath)}</strong>」`);
    await loadFsDirectory(currentFsPath);
  } catch (err) {
    showError(`保存文件失败: ${err.message}`);
  } finally {
    btnEditorSave.disabled = false;
    btnEditorSave.textContent = '保存修改 (⌘S)';
  }
}

async function downloadRemoteFile(filePath, fileName) {
  if (!lastConnectedAddr || !filePath) return;
  setProgress(`正在下载 ${fileName || '文件'}...`, 40);
  try {
    const data = await callDeviceRPC(lastConnectedAddr, 'fs_read', {
      path: filePath,
      maxBytes: 24 * 1024 * 1024,
    });
    const bytes = base64ToUint8(data.dataBase64 || '');
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.name || fileName || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setProgress('', 0);
    showToast(`✅ 已下载「<strong>${escapeHtml(data.name || fileName)}</strong>」(${formatBytes(bytes.length)})`);
  } catch (err) {
    setProgress('', 0);
    showError(`下载失败: ${err.message}`);
  }
}

async function uploadFilesToRemote(fileList) {
  if (!lastConnectedAddr || !fileList || fileList.length === 0) return;
  const baseDir = currentFsPath || '~';
  const chunkSize = 512 * 1024; // 512KB per RPC call

  for (const file of Array.from(fileList)) {
    const targetPath = joinRemotePath(baseDir, file.name);
    const totalSize = file.size || 0;
    const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

    try {
      for (let i = 0; i < totalChunks; i++) {
        const pct = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(`正在上传 ${file.name} (${pct}%)...`, pct);
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, totalSize);
        const sliceBuf = await file.slice(start, end).arrayBuffer();
        const slice = new Uint8Array(sliceBuf);
        await callDeviceRPC(lastConnectedAddr, 'fs_write', {
          path: targetPath,
          dataBase64: uint8ToBase64(slice),
          append: i > 0,
        });
      }
      showToast(`✅ 已上传「<strong>${escapeHtml(file.name)}</strong>」(${formatBytes(totalSize)})`);
    } catch (err) {
      showError(`上传 ${file.name} 失败: ${err.message}`);
      break;
    }
  }

  setProgress('', 0);
  inputFsUploadFile.value = '';
  await loadFsDirectory(currentFsPath);
}

fsQuickpathsList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-quick-path]');
  if (btn) {
    loadFsDirectory(btn.getAttribute('data-quick-path'));
  }
});

fsBreadcrumbs.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-crumb-path]');
  if (btn) {
    loadFsDirectory(btn.getAttribute('data-crumb-path'));
  }
});

chkFsHidden.addEventListener('change', () => {
  loadFsDirectory(currentFsPath);
});

btnFsUp.addEventListener('click', () => {
  if (currentFsParent) loadFsDirectory(currentFsParent);
});

btnFsRefresh.addEventListener('click', () => {
  loadFsDirectory(currentFsPath);
});

btnFsGo.addEventListener('click', () => {
  if (inputFsPath.value.trim()) {
    loadFsDirectory(inputFsPath.value.trim());
  }
});

inputFsPath.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && inputFsPath.value.trim()) {
    loadFsDirectory(inputFsPath.value.trim());
  }
});

btnFsUpload.addEventListener('click', () => {
  inputFsUploadFile.click();
});

inputFsUploadFile.addEventListener('change', () => {
  if (inputFsUploadFile.files?.length) {
    uploadFilesToRemote(inputFsUploadFile.files);
  }
});

fsDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  fsDropzone.classList.add('is-dragover');
});

fsDropzone.addEventListener('dragleave', () => {
  fsDropzone.classList.remove('is-dragover');
});

fsDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  fsDropzone.classList.remove('is-dragover');
  if (e.dataTransfer?.files?.length) {
    uploadFilesToRemote(e.dataTransfer.files);
  }
});

btnFsMkdir.addEventListener('click', async () => {
  const folderName = window.prompt('请输入新建文件夹名称：', '');
  if (!folderName || !folderName.trim()) return;
  const target = joinRemotePath(currentFsPath, folderName.trim());
  try {
    await callDeviceRPC(lastConnectedAddr, 'fs_mkdir', { path: target });
    showToast(`✅ 已创建文件夹「<strong>${escapeHtml(folderName.trim())}</strong>」`);
    await loadFsDirectory(currentFsPath);
  } catch (err) {
    showError(`新建文件夹失败: ${err.message}`);
  }
});

btnFsNewfile.addEventListener('click', async () => {
  const fileName = window.prompt('请输入新建文件名称：', 'untitled.txt');
  if (!fileName || !fileName.trim()) return;
  const target = joinRemotePath(currentFsPath, fileName.trim());
  try {
    await callDeviceRPC(lastConnectedAddr, 'fs_write', { path: target, content: '', append: false });
    await loadFsDirectory(currentFsPath);
    await openFileInEditor(target, fileName.trim());
  } catch (err) {
    showError(`新建文件失败: ${err.message}`);
  }
});

btnFsOpenTerm.addEventListener('click', async () => {
  const targetCwd = currentFsPath || '';
  switchWorkspaceSubpane('term');
  await createAndConnectTerminalTab({ cwd: targetCwd });
});

fsTableBody.addEventListener('click', async (e) => {
  const primaryBtn = e.target.closest('[data-fs-primary]');
  if (primaryBtn) {
    const p = primaryBtn.getAttribute('data-fs-primary');
    const isDir = primaryBtn.getAttribute('data-fs-isdir') === '1';
    const name = primaryBtn.getAttribute('data-fs-name') || '';
    if (isDir) {
      await loadFsDirectory(p);
    } else {
      await openFileInEditor(p, name);
    }
    return;
  }

  const openDirBtn = e.target.closest('[data-fs-open-dir]');
  if (openDirBtn) {
    await loadFsDirectory(openDirBtn.getAttribute('data-fs-open-dir'));
    return;
  }

  const termDirBtn = e.target.closest('[data-fs-term-dir]');
  if (termDirBtn) {
    const dirPath = termDirBtn.getAttribute('data-fs-term-dir');
    switchWorkspaceSubpane('term');
    await createAndConnectTerminalTab({ cwd: dirPath });
    return;
  }

  const editBtn = e.target.closest('[data-fs-edit]');
  if (editBtn) {
    await openFileInEditor(
      editBtn.getAttribute('data-fs-edit'),
      editBtn.getAttribute('data-fs-name') || ''
    );
    return;
  }

  const dlBtn = e.target.closest('[data-fs-download]');
  if (dlBtn) {
    await downloadRemoteFile(
      dlBtn.getAttribute('data-fs-download'),
      dlBtn.getAttribute('data-fs-name') || ''
    );
    return;
  }

  const renameBtn = e.target.closest('[data-fs-rename]');
  if (renameBtn) {
    const oldPath = renameBtn.getAttribute('data-fs-rename');
    const oldName = renameBtn.getAttribute('data-fs-name') || '';
    const newName = window.prompt('请输入新名称：', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const parentDir = oldPath.slice(0, Math.max(0, oldPath.lastIndexOf('/'))) || '/';
    const newPath = joinRemotePath(parentDir, newName.trim());
    try {
      await callDeviceRPC(lastConnectedAddr, 'fs_rename', { oldPath, newPath });
      showToast(`✅ 已重命名为「<strong>${escapeHtml(newName.trim())}</strong>」`);
      await loadFsDirectory(currentFsPath);
    } catch (err) {
      showError(`重命名失败: ${err.message}`);
    }
    return;
  }

  const delBtn = e.target.closest('[data-fs-delete]');
  if (delBtn) {
    const targetPath = delBtn.getAttribute('data-fs-delete');
    const name = delBtn.getAttribute('data-fs-name') || targetPath;
    if (!window.confirm(`确定要删除「${name}」吗？此操作不可撤销。`)) return;
    try {
      await callDeviceRPC(lastConnectedAddr, 'fs_delete', { path: targetPath });
      showToast(`🗑️ 已删除「<strong>${escapeHtml(name)}</strong>」`);
      await loadFsDirectory(currentFsPath);
    } catch (err) {
      showError(`删除失败: ${err.message}`);
    }
  }
});

btnEditorSave.addEventListener('click', saveCurrentEditedFile);
document.getElementById('btn-editor-download')?.addEventListener('click', () => {
  if (currentEditingPath) {
    downloadRemoteFile(currentEditingPath, currentEditingPath.split('/').pop() || 'download');
  }
});
btnEditorClose.addEventListener('click', () => {
  fsEditorModal.style.display = 'none';
});
fsEditorModal.addEventListener('click', (e) => {
  if (e.target === fsEditorModal) {
    fsEditorModal.style.display = 'none';
  }
});

editorTextarea.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveCurrentEditedFile();
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editorTextarea.selectionStart;
    const end = editorTextarea.selectionEnd;
    editorTextarea.value = `${editorTextarea.value.substring(0, start)}  ${editorTextarea.value.substring(end)}`;
    editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
  }
});

/**
 * ============================================================================
 * SUBPANE 3: REAL-TIME SYSTEM STATUS & HEADLESS REMOTE CONTROL
 * ============================================================================
 */
function decodeProcessLabel(raw) {
  const s = String(raw || '');
  if (!s.includes('\\x')) return s;
  try {
    const bytes = [];
    for (let i = 0; i < s.length; ) {
      if (s[i] === '\\' && s[i + 1] === 'x' && /^[0-9a-fA-F]{2}$/.test(s.slice(i + 2, i + 4))) {
        bytes.push(parseInt(s.slice(i + 2, i + 4), 16));
        i += 4;
      } else {
        bytes.push(s.charCodeAt(i));
        i += 1;
      }
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    return s;
  }
}

function setMeterStyle(barEl, pct) {
  const clamped = Math.max(2, Math.min(100, Number(pct || 0)));
  barEl.style.width = `${clamped}%`;
  barEl.classList.toggle('warn', clamped >= 75 && clamped < 90);
  barEl.classList.toggle('danger', clamped >= 90);
}

function renderSystemStatus(st) {
  if (!st) return;
  currentSysStatus = st;

  // Headless Mode Remote Control Card
  const isHeadless = Boolean(st.isHeadless);
  sysHeadlessBadge.textContent = isHeadless ? '● 已开启无头模式' : '常规显示模式';
  sysHeadlessBadge.classList.toggle('headless', isHeadless);
  btnSysToggleHeadless.textContent = isHeadless ? '关闭无头模式 (恢复内屏)' : '开启无头模式 (熄灭内屏)';
  btnSysToggleHeadless.classList.toggle('is-headless', isHeadless);
  sysHeadlessDesc.textContent = isHeadless
    ? '当前已熄灭 MacBook 内置屏幕背光并锁定系统防休眠，合盖状态下依然保持全速运转。'
    : '开启后将熄灭 MacBook 内置屏幕背光并锁定系统防休眠，支持合盖全速运行与远程连接。';

  // Host Overview Card
  sysHostName.textContent = st.hostname || lastConnectedHost;
  sysMetaChip.textContent = `${st.cpuModel || 'Apple Silicon'} (${st.cpuCores || '--'} 核) · ${st.osVersion || 'macOS'}`;
  sysMetaUptime.textContent = formatUptime(st.uptimeSec);
  const battStr = st.batteryPct >= 0 ? `${st.batteryPct}%` : '台式机电源';
  sysMetaPower.textContent = `${st.powerSource || 'AC Power'} · ${battStr}`;

  // 4 Live Gauges
  const cpuPct = Number(st.cpuUsagePct || 0);
  sysCpuVal.textContent = `${cpuPct.toFixed(1)}%`;
  setMeterStyle(sysCpuBar, cpuPct);
  const loads = st.loadAvg || [0, 0, 0];
  sysCpuSub.textContent = `Load Avg: ${loads.map((n) => Number(n || 0).toFixed(2)).join(' / ')}`;

  const memPct = Number(st.memUsagePct || 0);
  sysMemVal.textContent = `${formatBytes(st.memUsedBytes)} / ${formatBytes(st.memTotalBytes)}`;
  setMeterStyle(sysMemBar, memPct);
  sysMemSub.textContent = `内存使用率 ${memPct.toFixed(1)}%`;

  const diskPct = Number(st.diskUsagePct || 0);
  sysDiskVal.textContent = `${formatBytes(st.diskUsedBytes)} / ${formatBytes(st.diskTotalBytes)}`;
  setMeterStyle(sysDiskBar, diskPct);
  sysDiskSub.textContent = `可用空间 ${formatBytes(st.diskFreeBytes)} (${diskPct.toFixed(1)}%)`;

  const temp = Number(st.cpuTemp || 0);
  sysThermalVal.textContent = temp > 0 ? `${temp.toFixed(1)} °C` : '正常';
  const tempPct = temp > 0 ? Math.min(100, Math.max(10, ((temp - 25) / 75) * 100)) : 25;
  setMeterStyle(sysThermalBar, tempPct);
  sysThermalSub.textContent = st.isFanless
    ? '风扇: 无风扇静音架构 (Fanless)'
    : st.fanSpeed > 0
      ? `风扇转速: ${st.fanSpeed} RPM`
      : '风扇: 静止 / 智能温控';

  // Listening TCP Ports Table
  const ports = st.ports || [];
  sysPortsCount.textContent = String(ports.length);
  if (ports.length === 0) {
    sysPortsBody.innerHTML = `<tr><td colspan="4" class="fs-empty-cell">暂无监听端口</td></tr>`;
  } else {
    sysPortsBody.innerHTML = ports
      .map((p) => {
        const procName = decodeProcessLabel(p.process || p.command || '--');
        const rawHost = String(p.address || '').replace(new RegExp(`:${p.port}$`), '');
        const cleanHost = rawHost === '*' ? '0.0.0.0' : rawHost.replace(/^\[|\]$/g, '');
        return `
        <tr class="device-row">
          <td><span class="port-pill">:${escapeHtml(p.port)}</span></td>
          <td><strong class="sys-proc-truncate sys-port-proc" title="${escapeHtml(procName)}">${escapeHtml(procName)}</strong></td>
          <td class="fs-mono-cell">${escapeHtml(p.pid)}</td>
          <td class="fs-mono-cell" title="${escapeHtml(p.address)}">${escapeHtml(cleanHost)}</td>
        </tr>
      `;
      })
      .join('');
  }

  // Top Processes Table
  const procs = st.processes || [];
  if (procs.length === 0) {
    sysProcsBody.innerHTML = `<tr><td colspan="5" class="fs-empty-cell">暂无进程数据</td></tr>`;
  } else {
    sysProcsBody.innerHTML = procs
      .map((proc) => {
        const rawCmd = proc.name || String(proc.command || '').split('/').pop() || proc.command;
        const shortCmd = decodeProcessLabel(rawCmd);
        const memMBVal = Number(proc.rssMB ?? proc.memMB ?? 0);
        return `
          <tr class="device-row">
            <td class="fs-mono-cell">${escapeHtml(proc.pid)}</td>
            <td><strong class="sys-proc-truncate" title="${escapeHtml(proc.command || shortCmd)}">${escapeHtml(shortCmd)}</strong></td>
            <td class="fs-mono-cell">${Number(proc.cpu || 0).toFixed(1)}%</td>
            <td class="fs-mono-cell">${memMBVal.toFixed(0)} MB</td>
            <td class="cell-actions">
              <button
                type="button"
                class="fs-mini-btn danger"
                data-kill-pid="${escapeHtml(proc.pid)}"
                data-kill-name="${escapeHtml(shortCmd)}"
              >
                结束
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  }
}

async function refreshSystemStatus() {
  if (!lastConnectedAddr) return;
  try {
    const st = await callDeviceRPC(lastConnectedAddr, 'sys_status', {});
    renderSystemStatus(st);
  } catch (err) {
    showError(`获取系统状态失败: ${err.message}`);
  }
}

function startSystemStatusPolling() {
  stopSystemStatusPolling();
  refreshSystemStatus();
  statusPollTimer = setInterval(() => {
    if (
      currentSubpane === 'status' &&
      document.getElementById('pane-terminal').classList.contains('is-active')
    ) {
      refreshSystemStatus();
    }
  }, 3000);
}

function stopSystemStatusPolling() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

btnSysRefresh.addEventListener('click', refreshSystemStatus);

btnSysToggleHeadless.addEventListener('click', async () => {
  if (!lastConnectedAddr) return;
  const nextEnable = !(currentSysStatus && currentSysStatus.isHeadless);
  btnSysToggleHeadless.disabled = true;
  btnSysToggleHeadless.textContent = nextEnable ? '正在开启无头模式...' : '正在恢复内置屏幕...';
  try {
    const st = await callDeviceRPC(lastConnectedAddr, 'sys_toggle_headless', {
      enable: nextEnable,
    });
    renderSystemStatus(st);
    showToast(
      nextEnable
        ? '🟣 已远程开启「<strong>无头模式</strong>」，MacBook 内置屏幕已屏蔽'
        : '🟢 已远程关闭「<strong>无头模式</strong>」，MacBook 内置屏幕已恢复'
    );
    fetchDevices();
  } catch (err) {
    showError(`切换无头模式失败: ${err.message}`);
  } finally {
    btnSysToggleHeadless.disabled = false;
  }
});

sysProcsBody.addEventListener('click', async (e) => {
  const killBtn = e.target.closest('[data-kill-pid]');
  if (!killBtn || !lastConnectedAddr) return;
  const pid = Number(killBtn.getAttribute('data-kill-pid'));
  const name = killBtn.getAttribute('data-kill-name') || String(pid);
  if (!pid) return;
  if (!window.confirm(`确定要结束远端进程「${name} (PID: ${pid})」吗？`)) return;
  try {
    await callDeviceRPC(lastConnectedAddr, 'sys_kill_process', { pid, force: false });
    showToast(`✅ 已向进程「<strong>${escapeHtml(name)} (${pid})</strong>」发送终止信号`);
    setTimeout(refreshSystemStatus, 400);
  } catch (err) {
    showError(`结束进程失败: ${err.message}`);
  }
});

/**
 * Bootstrap Console Session
 */
async function bootstrap() {
  if (window.location.hash.startsWith('#auth_token=')) {
    const tokenFromHash = decodeURIComponent(window.location.hash.slice('#auth_token='.length));
    if (tokenFromHash) {
      setSessionToken(tokenFromHash);
    }
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const token = getSessionToken();
  if (!token) {
    showAuthView();
    return;
  }

  try {
    const resp = await fetch('/api/auth?action=me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (resp.ok && data.authenticated && data.user) {
      currentUser = data.user;
      if (pendingAppAuthRequestId) {
        showHandoffStep();
      } else {
        await enterConsoleWorkspace();
        const requestedTab = urlParams.get('tab');
        if (requestedTab === 'devices') {
          switchConsoleTab(requestedTab);
        }
      }
      return;
    }
  } catch {}

  setSessionToken('');
  showAuthView();
}

/**
 * PWA Service Worker Registration
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

bootstrap();

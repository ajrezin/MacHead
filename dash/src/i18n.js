/**
 * MacHead Cloud (dash.headlessmac.com) Enterprise Bilingual Dictionary & i18n Engine
 * Supports instant, zero-reload switching between Simplified Chinese (`zh`) and English (`en`).
 */

export const I18N_DICT = {
  zh: {
    'doc.title': 'MacHead Cloud | Device fleet, file manager & remote terminal console',
    'auth.official_site': 'Official website',
    'auth.official_site_url': 'https://headlessmac.com/',
    'auth.heading': 'Log in to MacHead Cloud',
    'auth.subheading': 'Authorize with a third-party account to automatically sync and manage your Mac devices with one click',
    'auth.client_connecting': 'Connecting client:',
    'auth.client_desc': 'After completing sign-in below, this device will be automatically authorized and its remote terminal service enabled',
    'auth.continue_github': 'Continue with GitHub',
    'auth.continue_google': 'Continue with Google',
    'auth.redirecting_oauth': 'Redirecting to {provider}...',
    'handoff.heading': 'Authorize MacHead client',
    'handoff.bind_prefix': 'Link your account',
    'handoff.bind_middle': 'to',
    'handoff.perm_1': 'Automatically sync device online status and headless mode state',
    'handoff.perm_2': 'Allow this account to connect to this Mac via the web terminal and file manager with one click',
    'handoff.confirm_btn': 'Authorize & Bind',
    'handoff.authorizing_btn': 'Authorizing & binding...',
    'handoff.current_account': 'Current account',
    'handoff.default_device': 'MacHead client',
    'handoff.bound_toast': '✅ Bound "<strong>{name}</strong>"',
    'handoff.auth_failed': 'Authorization failed. Please sign in again and retry.',

    // Sidebar & Header
    'sidebar.my_devices': 'My Devices',
    'sidebar.logout_title': 'Log out',
    'header.refresh': 'Refresh',
    'crumb.my_devices': 'My Devices',
    'crumb.workspace': 'Device Workspace',
    'progress.connecting': 'Connecting terminal...',
    'progress.preparing_wasm': 'Preparing terminal environment...',
    'progress.connecting_device': 'Connecting to remote device...',

    // Devices Overview Pane
    'stats.total_devices': 'Bound devices',
    'stats.online_devices': 'Online now',
    'stats.headless_devices': 'Headless',
    'devices.section_heading': 'Devices',
    'devices.col_device': 'Device',
    'devices.col_status': 'Status',
    'devices.col_mode': 'Mode',
    'devices.col_seen': 'Last active',
    'devices.col_actions': 'Actions',
    'devices.status_online': '● Online',
    'devices.status_offline': '○ Offline',
    'devices.mode_headless': 'Headless',
    'devices.mode_normal': 'Normal',
    'devices.btn_term': 'Terminal',
    'devices.btn_files': 'Files',
    'devices.btn_status': 'Status & remote control',
    'devices.btn_unbind': 'Unbind',
    'devices.empty_title': 'No Mac devices bound yet',
    'devices.empty_desc': 'Open <strong>MacHead Preferences</strong> on your Mac, click <strong>"Sign In"</strong> in the bottom-left corner to authorize, and the device will appear here automatically.',

    // Relative time & Uptime
    'time.just_now': 'Just now',
    'time.sec_ago': '{n}s ago',
    'time.min_ago': '{n}m ago',
    'time.hour_ago': '{n}h ago',
    'time.day_ago': '{n}d ago',
    'uptime.days_hours': '{d}d {h}h',
    'uptime.hours_mins': '{h}h {m}m',
    'uptime.mins': '{m}m',

    // Workspace Subnav & Terminal
    'ws.back_devices': 'Devices',
    'ws.tab_term': 'Terminal',
    'ws.tab_files': 'Files',
    'ws.tab_status': 'Status & remote control',
    'ws.fullscreen': 'Fullscreen',
    'ws.fullscreen_title': 'Toggle fullscreen',
    'ws.disconnect': 'Disconnect',
    'ws.disconnect_title': 'Disconnect all sessions and return',
    'ws.transport_loopback': 'Local direct',
    'ws.transport_lan': 'LAN direct',
    'ws.transport_p2p': 'P2P direct',
    'ws.transport_e2ee': 'E2EE tunnel',
    'term.dot_close_title': 'Disconnect and return to Devices',
    'term.close_tab_title': 'Close this tab',
    'term.new_tab': '+ New tab',
    'term.new_tab_title': 'Open a new terminal tab',
    'term.read_clipboard': 'Read clipboard',
    'term.read_clipboard_title': 'Read remote Mac clipboard',
    'term.write_clipboard': 'Write clipboard',
    'term.write_clipboard_title': 'Write text to the remote Mac clipboard',
    'term.clear': 'Clear screen',
    'term.reconnect': 'Reconnect',
    'term.disconnected_hint': 'Connection disconnected. Click "Reconnect" or open a new tab.',
    'term.connect_failed': 'Connection failed: {err}',
    'term.clipboard_empty': '📋 Remote Mac clipboard is currently empty',
    'term.clipboard_read_ok': '✅ Copied remote Mac clipboard to local ({len} chars)',
    'term.clipboard_read_prompt': 'Remote Mac clipboard content (Press ⌘C to copy):',
    'term.clipboard_read_err': 'Failed to read remote clipboard: {err}',
    'term.clipboard_write_prompt': 'Enter text to write to the remote Mac clipboard:',
    'term.clipboard_write_ok': '✅ Wrote to remote Mac clipboard ({len} chars)',
    'term.clipboard_write_err': 'Failed to write remote clipboard: {err}',
    'rpc.password_prompt': '🔒 This Mac is protected by a security password. Enter the access password:',

    // File Manager
    'fs.show_hidden': 'Show hidden files',
    'fs.up': 'Up',
    'fs.up_title': 'Go to parent folder',
    'fs.refresh': 'Refresh',
    'fs.refresh_title': 'Refresh folder',
    'fs.go': 'Go',
    'fs.upload': 'Upload files',
    'fs.mkdir': 'New folder',
    'fs.newfile': 'New file',
    'fs.open_term_here': 'Open Terminal here',
    'fs.drop_hint': 'Drag and drop files here to upload directly',
    'fs.col_name': 'Name',
    'fs.col_size': 'Size',
    'fs.col_mtime': 'Modified',
    'fs.col_actions': 'Actions',
    'fs.loading_dir': 'Loading directory...',
    'fs.empty_dir': 'This folder is empty (drag and drop files here to upload)',
    'fs.btn_open': 'Open',
    'fs.btn_term': 'Terminal',
    'fs.btn_term_title': 'Open a new terminal in this folder',
    'fs.btn_edit': 'Edit',
    'fs.btn_download': 'Download',
    'fs.btn_rename': 'Rename',
    'fs.btn_delete': 'Delete',
    'fs.perm_title': 'Permissions: {mode}',
    'fs.load_err': 'Failed to load directory: {err}',
    'fs.image_preview_meta': '{size} · Image preview',
    'fs.binary_confirm': '"{name}" is a binary file ({size}). Download it directly?',
    'fs.open_file_err': 'Failed to open file: {err}',
    'fs.saving': 'Saving...',
    'fs.saved_meta': '{size} · UTF-8 · Saved',
    'fs.saved_toast': '✅ Saved "<strong>{path}</strong>"',
    'fs.save_err': 'Failed to save file: {err}',
    'fs.downloading_progress': 'Downloading {name}...',
    'fs.downloaded_toast': '✅ Downloaded "<strong>{name}</strong>" ({size})',
    'fs.download_err': 'Download failed: {err}',
    'fs.uploading_progress': 'Uploading {name} ({pct}%)...',
    'fs.uploaded_toast': '✅ Uploaded "<strong>{name}</strong>" ({size})',
    'fs.upload_err': 'Failed to upload {name}: {err}',
    'fs.mkdir_prompt': 'Enter a new folder name:',
    'fs.mkdir_toast': '✅ Created folder "<strong>{name}</strong>"',
    'fs.mkdir_err': 'Failed to create folder: {err}',
    'fs.newfile_prompt': 'Enter a new file name:',
    'fs.newfile_err': 'Failed to create file: {err}',
    'fs.rename_prompt': 'Enter a new name:',
    'fs.rename_toast': '✅ Renamed to "<strong>{name}</strong>"',
    'fs.rename_err': 'Rename failed: {err}',
    'fs.delete_confirm': 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    'fs.delete_toast': '🗑️ Deleted "<strong>{name}</strong>"',
    'fs.delete_err': 'Delete failed: {err}',
    'editor.download': 'Download',
    'editor.save': 'Save changes (⌘S)',
    'editor.close': 'Close',

    // System Status & Headless Control
    'sys.eyebrow_control': 'MACHEAD REMOTE HARDWARE CONTROL',
    'sys.headless_title': 'Headless',
    'sys.badge_headless_on': '● Headless active',
    'sys.badge_headless_off': 'Normal display mode',
    'sys.desc_headless_on': 'The MacBook internal display is powered off and system sleep prevention is locked, so the machine stays running at full speed with the lid closed.',
    'sys.desc_headless_off': 'This powers off the internal display and locks sleep prevention so the Mac can run 24/7 with the lid closed.',
    'sys.btn_enable_headless': 'Enable Headless Mode',
    'sys.btn_disable_headless': 'Disable Headless (restore display)',
    'sys.btn_enabling_headless': 'Enabling Headless Mode...',
    'sys.btn_disabling_headless': 'Restoring built-in display...',
    'sys.toast_headless_on': '🟣 Remotely enabled <strong>Headless Mode</strong> (internal display powered off)',
    'sys.toast_headless_off': '🟢 Remotely disabled <strong>Headless Mode</strong> (internal display restored)',
    'sys.err_toggle_headless': 'Failed to toggle Headless Mode: {err}',
    'sys.eyebrow_host': 'HOST & POWER OVERVIEW',
    'sys.refresh_now': 'Refresh now',
    'sys.meta_chip': 'Chip & OS',
    'sys.meta_uptime': 'Uptime',
    'sys.meta_power': 'Power & battery',
    'sys.cores_unit': 'cores',
    'sys.desktop_power': 'AC power',
    'sys.metric_cpu': 'CPU load',
    'sys.metric_mem': 'Memory usage',
    'sys.metric_mem_sub': 'Used {pct}%',
    'sys.metric_disk': 'Disk space (/)',
    'sys.metric_disk_sub': 'Free {free} ({pct}%)',
    'sys.metric_thermal': 'SMC thermal & fan',
    'sys.thermal_normal': 'Nominal',
    'sys.fan_fanless': 'Fan: passive cooling (fanless)',
    'sys.fan_rpm': 'Fan speed: {rpm} RPM',
    'sys.fan_idle': 'Fan: idle / smart thermal',
    'sys.ports_title': 'Listening TCP ports',
    'sys.col_port': 'Port',
    'sys.col_proc': 'Process',
    'sys.col_addr': 'Bind address',
    'sys.loading_ports': 'Scanning listening ports...',
    'sys.empty_ports': 'No listening TCP ports found',
    'sys.procs_title': 'Top processes',
    'sys.procs_hint': 'Sorted by CPU %',
    'sys.col_mem': 'Memory',
    'sys.loading_procs': 'Loading process list...',
    'sys.empty_procs': 'No process telemetry',
    'sys.btn_kill': 'Terminate',
    'sys.kill_confirm': 'Terminate remote process "{name} (PID: {pid})"?',
    'sys.kill_toast': '✅ Sent SIGTERM to "<strong>{name} ({pid})</strong>"',
    'sys.kill_err': 'Failed to terminate process: {err}',
    'sys.status_err': 'Failed to fetch system telemetry: {err}',
  },
  en: {
    'doc.title': 'MacHead Cloud | Device Fleet, File Manager & Remote Terminal Console',
    'auth.official_site': 'Official Website',
    'auth.official_site_url': 'https://headlessmac.com/en/',
    'auth.heading': 'Sign in to MacHead Cloud',
    'auth.subheading': 'Authenticate with your account to sync and manage your Mac fleet in one click',
    'auth.client_connecting': 'Connecting Mac client: ',
    'auth.client_desc': 'Sign in below to authorize this Mac and enable E2EE remote terminal access',
    'auth.continue_github': 'Continue with GitHub',
    'auth.continue_google': 'Continue with Google',
    'auth.redirecting_oauth': 'Redirecting to {provider}...',
    'handoff.heading': 'Authorize MacHead Client',
    'handoff.bind_prefix': 'Bind account',
    'handoff.bind_middle': 'to',
    'handoff.perm_1': 'Automatically sync device online status and Headless Mode state',
    'handoff.perm_2': 'Allow one-click E2EE web terminal and remote file management for this Mac',
    'handoff.confirm_btn': 'Authorize & Bind Device',
    'handoff.authorizing_btn': 'Authorizing & Binding...',
    'handoff.current_account': 'Current Account',
    'handoff.default_device': 'MacHead Client',
    'handoff.bound_toast': '✅ Bound "<strong>{name}</strong>"',
    'handoff.auth_failed': 'Authorization failed. Please sign in again and retry.',

    // Sidebar & Header
    'sidebar.my_devices': 'My Devices',
    'sidebar.logout_title': 'Sign Out',
    'header.refresh': 'Refresh',
    'crumb.my_devices': 'My Devices',
    'crumb.workspace': 'Workspace',
    'progress.connecting': 'Connecting to terminal...',
    'progress.preparing_wasm': 'Initializing E2EE terminal engine...',
    'progress.connecting_device': 'Connecting to remote Mac...',

    // Devices Overview Pane
    'stats.total_devices': 'Bound Devices',
    'stats.online_devices': 'Online Now',
    'stats.headless_devices': 'Headless Mode',
    'devices.section_heading': 'Device Fleet',
    'devices.col_device': 'Device',
    'devices.col_status': 'Status',
    'devices.col_mode': 'Display Mode',
    'devices.col_seen': 'Last Active',
    'devices.col_actions': 'Actions',
    'devices.status_online': '● Online',
    'devices.status_offline': '○ Offline',
    'devices.mode_headless': 'Headless',
    'devices.mode_normal': 'Normal',
    'devices.btn_term': 'Terminal',
    'devices.btn_files': 'Files',
    'devices.btn_status': 'Telemetry & Control',
    'devices.btn_unbind': 'Unbind',
    'devices.empty_title': 'No Bound Mac Devices Yet',
    'devices.empty_desc': 'Open <strong>MacHead Preferences</strong> on your Mac and click <strong>"Sign In"</strong> in the bottom-left corner to bind your device automatically.',

    // Relative time & Uptime
    'time.just_now': 'Just now',
    'time.sec_ago': '{n}s ago',
    'time.min_ago': '{n}m ago',
    'time.hour_ago': '{n}h ago',
    'time.day_ago': '{n}d ago',
    'uptime.days_hours': '{d}d {h}h',
    'uptime.hours_mins': '{h}h {m}m',
    'uptime.mins': '{m}m',

    // Workspace Subnav & Terminal
    'ws.back_devices': 'Devices',
    'ws.tab_term': 'Terminal',
    'ws.tab_files': 'Files',
    'ws.tab_status': 'Telemetry & Control',
    'ws.fullscreen': 'Fullscreen',
    'ws.fullscreen_title': 'Toggle Fullscreen',
    'ws.disconnect': 'Disconnect',
    'ws.disconnect_title': 'Disconnect all sessions and return',
    'ws.transport_loopback': 'Loopback',
    'ws.transport_lan': 'LAN Direct',
    'ws.transport_p2p': 'WebRTC P2P',
    'ws.transport_e2ee': 'E2EE Tunnel',
    'term.dot_close_title': 'Disconnect and return to device list',
    'term.close_tab_title': 'Close tab',
    'term.new_tab': '+ New Tab',
    'term.new_tab_title': 'Open new terminal tab',
    'term.read_clipboard': 'Pull Clipboard',
    'term.read_clipboard_title': 'Read remote Mac clipboard',
    'term.write_clipboard': 'Push Clipboard',
    'term.write_clipboard_title': 'Write text to remote Mac clipboard',
    'term.clear': 'Clear',
    'term.reconnect': 'Reconnect',
    'term.disconnected_hint': 'Session disconnected. Click "Reconnect" or open a new tab.',
    'term.connect_failed': 'Connection failed: {err}',
    'term.clipboard_empty': '📋 Remote Mac clipboard is currently empty',
    'term.clipboard_read_ok': '✅ Copied remote Mac clipboard to local ({len} chars)',
    'term.clipboard_read_prompt': 'Remote Mac clipboard content (Press ⌘C to copy):',
    'term.clipboard_read_err': 'Failed to read remote clipboard: {err}',
    'term.clipboard_write_prompt': 'Enter text to push to remote Mac clipboard:',
    'term.clipboard_write_ok': '✅ Pushed to remote Mac clipboard ({len} chars)',
    'term.clipboard_write_err': 'Failed to write remote clipboard: {err}',
    'rpc.password_prompt': '🔒 This Mac is protected by a security password. Enter access password:',

    // File Manager
    'fs.show_hidden': 'Show hidden files',
    'fs.up': 'Up',
    'fs.up_title': 'Go to parent folder',
    'fs.refresh': 'Refresh',
    'fs.refresh_title': 'Refresh folder',
    'fs.go': 'Go',
    'fs.upload': 'Upload',
    'fs.mkdir': 'New Folder',
    'fs.newfile': 'New File',
    'fs.open_term_here': 'Open Terminal Here',
    'fs.drop_hint': 'Drag and drop files here to upload directly',
    'fs.col_name': 'Name',
    'fs.col_size': 'Size',
    'fs.col_mtime': 'Modified',
    'fs.col_actions': 'Actions',
    'fs.loading_dir': 'Loading directory...',
    'fs.empty_dir': 'This folder is empty (drag & drop files here to upload)',
    'fs.btn_open': 'Open',
    'fs.btn_term': 'Terminal',
    'fs.btn_term_title': 'Open new terminal tab in this folder',
    'fs.btn_edit': 'Edit',
    'fs.btn_download': 'Download',
    'fs.btn_rename': 'Rename',
    'fs.btn_delete': 'Delete',
    'fs.perm_title': 'Mode: {mode}',
    'fs.load_err': 'Failed to load directory: {err}',
    'fs.image_preview_meta': '{size} · Image Preview',
    'fs.binary_confirm': '"{name}" is a binary file ({size}). Download it directly?',
    'fs.open_file_err': 'Failed to open file: {err}',
    'fs.saving': 'Saving...',
    'fs.saved_meta': '{size} · UTF-8 · Saved',
    'fs.saved_toast': '✅ Saved "<strong>{path}</strong>"',
    'fs.save_err': 'Failed to save file: {err}',
    'fs.downloading_progress': 'Downloading {name}...',
    'fs.downloaded_toast': '✅ Downloaded "<strong>{name}</strong>" ({size})',
    'fs.download_err': 'Download failed: {err}',
    'fs.uploading_progress': 'Uploading {name} ({pct}%)...',
    'fs.uploaded_toast': '✅ Uploaded "<strong>{name}</strong>" ({size})',
    'fs.upload_err': 'Failed to upload {name}: {err}',
    'fs.mkdir_prompt': 'Enter new folder name:',
    'fs.mkdir_toast': '✅ Created folder "<strong>{name}</strong>"',
    'fs.mkdir_err': 'Failed to create folder: {err}',
    'fs.newfile_prompt': 'Enter new file name:',
    'fs.newfile_err': 'Failed to create file: {err}',
    'fs.rename_prompt': 'Enter new name:',
    'fs.rename_toast': '✅ Renamed to "<strong>{name}</strong>"',
    'fs.rename_err': 'Rename failed: {err}',
    'fs.delete_confirm': 'Are you sure you want to delete "{name}"? This cannot be undone.',
    'fs.delete_toast': '🗑️ Deleted "<strong>{name}</strong>"',
    'fs.delete_err': 'Delete failed: {err}',
    'editor.download': 'Download',
    'editor.save': 'Save Changes (⌘S)',
    'editor.close': 'Close',

    // System Status & Headless Control
    'sys.eyebrow_control': 'MACHEAD REMOTE HARDWARE CONTROL',
    'sys.headless_title': 'Headless Mode',
    'sys.badge_headless_on': '● Headless Active',
    'sys.badge_headless_off': 'Normal Display',
    'sys.desc_headless_on': 'Internal display power is cut off and clamshell sleep prevention is locked. Running at full speed with lid closed.',
    'sys.desc_headless_off': 'Powers off the MacBook internal display via SkyLight and locks sleep prevention for 24/7 lid-closed server operation.',
    'sys.btn_enable_headless': 'Enable Headless Mode',
    'sys.btn_disable_headless': 'Disable Headless (Restore Screen)',
    'sys.btn_enabling_headless': 'Enabling Headless Mode...',
    'sys.btn_disabling_headless': 'Restoring Built-In Display...',
    'sys.toast_headless_on': '🟣 Remotely enabled <strong>Headless Mode</strong> (Internal display powered off)',
    'sys.toast_headless_off': '🟢 Remotely disabled <strong>Headless Mode</strong> (Internal display restored)',
    'sys.err_toggle_headless': 'Failed to toggle Headless Mode: {err}',
    'sys.eyebrow_host': 'HOST & POWER OVERVIEW',
    'sys.refresh_now': 'Refresh Now',
    'sys.meta_chip': 'Chip & OS',
    'sys.meta_uptime': 'Uptime',
    'sys.meta_power': 'Power & Battery',
    'sys.cores_unit': 'cores',
    'sys.desktop_power': 'AC Mains',
    'sys.metric_cpu': 'CPU Load',
    'sys.metric_mem': 'Memory Usage',
    'sys.metric_mem_sub': 'Used {pct}%',
    'sys.metric_disk': 'Disk Space (/)',
    'sys.metric_disk_sub': 'Free {free} ({pct}%)',
    'sys.metric_thermal': 'SMC Thermal & Fan',
    'sys.thermal_normal': 'Nominal',
    'sys.fan_fanless': 'Fan: Passive Cooling (Fanless)',
    'sys.fan_rpm': 'Fan Speed: {rpm} RPM',
    'sys.fan_idle': 'Fan: Idle / Smart Thermal',
    'sys.ports_title': 'Listening TCP Ports',
    'sys.col_port': 'Port',
    'sys.col_proc': 'Process',
    'sys.col_addr': 'Bind Address',
    'sys.loading_ports': 'Scanning listening ports...',
    'sys.empty_ports': 'No listening TCP ports found',
    'sys.procs_title': 'Top Processes',
    'sys.procs_hint': 'Sorted by CPU %',
    'sys.col_mem': 'Memory',
    'sys.loading_procs': 'Loading process list...',
    'sys.empty_procs': 'No process telemetry',
    'sys.btn_kill': 'Terminate',
    'sys.kill_confirm': 'Terminate remote process "{name} (PID: {pid})"?',
    'sys.kill_toast': '✅ Sent SIGTERM to "<strong>{name} ({pid})</strong>"',
    'sys.kill_err': 'Failed to terminate process: {err}',
    'sys.status_err': 'Failed to fetch system telemetry: {err}',
  },
};

function readCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

export function detectInitialLang() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = (params.get('lang') || '').toLowerCase();
  if (queryLang === 'en' || queryLang === 'zh') {
    return queryLang;
  }

  const cookieLang = readCookie('mh_locale').toLowerCase();
  if (cookieLang === 'en' || cookieLang === 'zh') {
    return cookieLang;
  }

  try {
    const stored = (localStorage.getItem('mh_locale') || '').toLowerCase();
    if (stored === 'en' || stored === 'zh') {
      return stored;
    }
  } catch {}

  const navLang = (
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    'zh-CN'
  ).toLowerCase();
  return navLang.startsWith('zh') ? 'zh' : 'en';
}

let currentLang = detectInitialLang();

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  const normalized = lang === 'en' ? 'en' : 'zh';
  currentLang = normalized;

  const host = window.location.hostname || '';
  const domainPart =
    host === 'headlessmac.com' || host.endsWith('.headlessmac.com')
      ? '; Domain=.headlessmac.com'
      : '';
  document.cookie = `mh_locale=${normalized}; Path=/; Max-Age=31536000; SameSite=Lax${domainPart}`;
  try {
    localStorage.setItem('mh_locale', normalized);
  } catch {}

  document.documentElement.lang = normalized === 'en' ? 'en' : 'zh-CN';
  return currentLang;
}

export function t(key, vars = {}) {
  const table = I18N_DICT[currentLang] || I18N_DICT.zh;
  let str = table[key] ?? I18N_DICT.zh[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return str;
}

export function applyStaticI18n() {
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-CN';
  document.title = t('doc.title');

  ['auth-website-link', 'sidebar-website-link', 'link-marketing-site'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.href = t('auth.official_site_url');
    }
  });

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });

  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    const btnLang = btn.getAttribute('data-lang-btn');
    const isActive = btnLang === currentLang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

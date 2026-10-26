/**
 * MacHead Cloud (dash.headlessmac.com) Enterprise Bilingual Dictionary & i18n Engine
 * Supports instant, zero-reload switching between Simplified Chinese (`zh`) and English (`en`).
 */

export const I18N_DICT = {
  zh: {
    'doc.title': 'MacHead Cloud | 设备、文件与远程终端控制台',
    'auth.official_site': '产品官网',
    'auth.official_site_url': 'https://headlessmac.com/',
    'auth.heading': '登录 MacHead Cloud',
    'auth.subheading': '通过第三方账号授权，自动同步并一键管理你的 Mac 设备',
    'auth.client_connecting': '正在连接客户端：',
    'auth.client_desc': '完成下方账号登录后，将自动授权并开启该设备的远程终端服务',
    'auth.continue_github': '使用 GitHub 账号继续',
    'auth.continue_google': '使用 Google 账号继续',
    'auth.redirecting_oauth': '正在跳转至 {provider} 授权...',
    'handoff.heading': '授权 MacHead 客户端',
    'handoff.bind_prefix': '将账号',
    'handoff.bind_middle': '绑定至',
    'handoff.perm_1': '自动同步设备在线与无头模式状态',
    'handoff.perm_2': '允许当前账号在网页端一键连接此设备终端与文件',
    'handoff.confirm_btn': '确认授权并绑定',
    'handoff.authorizing_btn': '正在授权并绑定...',
    'handoff.current_account': '当前账号',
    'handoff.default_device': 'MacHead 客户端',
    'handoff.bound_toast': '✅ 已绑定「<strong>{name}</strong>」',
    'handoff.auth_failed': '授权失败，请重新登录或重试',

    // Sidebar & Header
    'sidebar.my_devices': '我的设备',
    'sidebar.logout_title': '退出登录',
    'header.refresh': '刷新状态',
    'crumb.my_devices': '我的设备',
    'crumb.workspace': '设备工作区',
    'progress.connecting': '正在连接终端...',
    'progress.preparing_wasm': '正在准备终端环境...',
    'progress.connecting_device': '正在连接远程设备...',

    // Devices Overview Pane
    'stats.total_devices': '已绑定设备',
    'stats.online_devices': '当前在线',
    'stats.headless_devices': '无头模式',
    'devices.section_heading': '设备列表',
    'devices.col_device': '设备',
    'devices.col_status': '状态',
    'devices.col_mode': '运行模式',
    'devices.col_seen': '最近活跃',
    'devices.col_actions': '操作',
    'devices.status_online': '● 在线',
    'devices.status_offline': '○ 离线',
    'devices.mode_headless': '无头模式',
    'devices.mode_normal': '常规模式',
    'devices.btn_term': '终端',
    'devices.btn_files': '文件',
    'devices.btn_status': '状态与远控',
    'devices.btn_unbind': '解绑',
    'devices.empty_title': '暂无绑定的 Mac 设备',
    'devices.empty_desc': '打开 Mac 上的 <strong>MacHead 偏好设置</strong>，点击左下角的 <strong>「登录账号」</strong> 完成授权后，设备将自动出现在这里。',

    // Relative time & Uptime
    'time.just_now': '刚刚活跃',
    'time.sec_ago': '{n} 秒前',
    'time.min_ago': '{n} 分钟前',
    'time.hour_ago': '{n} 小时前',
    'time.day_ago': '{n} 天前',
    'uptime.days_hours': '{d} 天 {h} 小时',
    'uptime.hours_mins': '{h} 小时 {m} 分钟',
    'uptime.mins': '{m} 分钟',

    // Workspace Subnav & Terminal
    'ws.back_devices': '设备列表',
    'ws.tab_term': '终端',
    'ws.tab_files': '文件管理',
    'ws.tab_status': '状态与远控',
    'ws.fullscreen': '全屏',
    'ws.fullscreen_title': '切换全屏',
    'ws.disconnect': '断开',
    'ws.disconnect_title': '断开全部连接并返回',
    'ws.transport_loopback': '本机直连',
    'ws.transport_lan': '局域网直连',
    'ws.transport_p2p': 'P2P 直连',
    'ws.transport_e2ee': 'E2EE 隧道',
    'term.dot_close_title': '断开并返回设备列表',
    'term.close_tab_title': '关闭此标签页',
    'term.new_tab': '+ 新建',
    'term.new_tab_title': '新建终端标签页',
    'term.read_clipboard': '读剪贴板',
    'term.read_clipboard_title': '读取远端 Mac 剪贴板内容',
    'term.write_clipboard': '写剪贴板',
    'term.write_clipboard_title': '写入文字到远端 Mac 剪贴板',
    'term.clear': '清屏',
    'term.reconnect': '重连',
    'term.disconnected_hint': '连接已断开。可点击「重连」或新建标签页。',
    'term.connect_failed': '连接失败: {err}',
    'term.clipboard_empty': '📋 远端 Mac 剪贴板当前为空',
    'term.clipboard_read_ok': '✅ 已读取远端 Mac 剪贴板并复制到本地 ({len} 字符)',
    'term.clipboard_read_prompt': '远端 Mac 剪贴板内容 (可按 ⌘C 复制)：',
    'term.clipboard_read_err': '读取远端剪贴板失败: {err}',
    'term.clipboard_write_prompt': '请输入要写入远端 Mac 剪贴板的文本：',
    'term.clipboard_write_ok': '✅ 已写入远端 Mac 剪贴板 ({len} 字符)',
    'term.clipboard_write_err': '写入远端剪贴板失败: {err}',
    'rpc.password_prompt': '🔒 该 Mac 已开启安全访问口令保护，请输入访问口令：',

    // File Manager
    'fs.show_hidden': '显示隐藏文件',
    'fs.up': '上级',
    'fs.up_title': '返回上级目录',
    'fs.refresh': '刷新',
    'fs.refresh_title': '刷新目录',
    'fs.go': '前往',
    'fs.upload': '上传文件',
    'fs.mkdir': '新建文件夹',
    'fs.newfile': '新建文件',
    'fs.open_term_here': '在此目录打开终端',
    'fs.drop_hint': '支持拖拽本地文件到此区域直接上传',
    'fs.col_name': '名称',
    'fs.col_size': '大小',
    'fs.col_mtime': '修改时间',
    'fs.col_actions': '操作',
    'fs.loading_dir': '正在加载目录...',
    'fs.empty_dir': '此文件夹为空（可直接拖拽文件到此处上传）',
    'fs.btn_open': '打开',
    'fs.btn_term': '终端',
    'fs.btn_term_title': '在此目录新建终端',
    'fs.btn_edit': '编辑',
    'fs.btn_download': '下载',
    'fs.btn_rename': '重命名',
    'fs.btn_delete': '删除',
    'fs.perm_title': '权限: {mode}',
    'fs.load_err': '读取目录失败: {err}',
    'fs.image_preview_meta': '{size} · 图片预览',
    'fs.binary_confirm': '「{name}」是二进制文件 ({size})，是否直接下载？',
    'fs.open_file_err': '打开文件失败: {err}',
    'fs.saving': '正在保存...',
    'fs.saved_meta': '{size} · UTF-8 · 已保存',
    'fs.saved_toast': '✅ 已保存文件「<strong>{path}</strong>」',
    'fs.save_err': '保存文件失败: {err}',
    'fs.downloading_progress': '正在下载 {name}...',
    'fs.downloaded_toast': '✅ 已下载「<strong>{name}</strong>」({size})',
    'fs.download_err': '下载失败: {err}',
    'fs.uploading_progress': '正在上传 {name} ({pct}%)...',
    'fs.uploaded_toast': '✅ 已上传「<strong>{name}</strong>」({size})',
    'fs.upload_err': '上传 {name} 失败: {err}',
    'fs.mkdir_prompt': '请输入新建文件夹名称：',
    'fs.mkdir_toast': '✅ 已创建文件夹「<strong>{name}</strong>」',
    'fs.mkdir_err': '新建文件夹失败: {err}',
    'fs.newfile_prompt': '请输入新建文件名称：',
    'fs.newfile_err': '新建文件失败: {err}',
    'fs.rename_prompt': '请输入新名称：',
    'fs.rename_toast': '✅ 已重命名为「<strong>{name}</strong>」',
    'fs.rename_err': '重命名失败: {err}',
    'fs.delete_confirm': '确定要删除「{name}」吗？此操作不可撤销。',
    'fs.delete_toast': '🗑️ 已删除「<strong>{name}</strong>」',
    'fs.delete_err': '删除失败: {err}',
    'editor.download': '下载',
    'editor.save': '保存修改 (⌘S)',
    'editor.close': '关闭',

    // System Status & Headless Control
    'sys.eyebrow_control': 'MACHEAD 远程硬件控制',
    'sys.headless_title': '无头模式',
    'sys.badge_headless_on': '● 已开启无头模式',
    'sys.badge_headless_off': '常规显示模式',
    'sys.desc_headless_on': '当前已熄灭 MacBook 内置屏幕背光并锁定系统防休眠，合盖状态下依然保持全速运转。',
    'sys.desc_headless_off': '开启后将熄灭 MacBook 内置屏幕背光并锁定系统防休眠，支持合盖全速运行与远程连接。',
    'sys.btn_enable_headless': '开启无头模式 (熄灭内屏)',
    'sys.btn_disable_headless': '关闭无头模式 (恢复内屏)',
    'sys.btn_enabling_headless': '正在开启无头模式...',
    'sys.btn_disabling_headless': '正在恢复内置屏幕...',
    'sys.toast_headless_on': '🟣 已远程开启「<strong>无头模式</strong>」，MacBook 内置屏幕已屏蔽',
    'sys.toast_headless_off': '🟢 已远程关闭「<strong>无头模式</strong>」，MacBook 内置屏幕已恢复',
    'sys.err_toggle_headless': '切换无头模式失败: {err}',
    'sys.eyebrow_host': '主机与电源概览',
    'sys.refresh_now': '立即刷新',
    'sys.meta_chip': '芯片与系统',
    'sys.meta_uptime': '持续运行',
    'sys.meta_power': '电源与电池',
    'sys.cores_unit': '核',
    'sys.desktop_power': '台式机电源',
    'sys.metric_cpu': 'CPU 负载',
    'sys.metric_mem': '内存占用',
    'sys.metric_mem_sub': '内存使用率 {pct}%',
    'sys.metric_disk': '磁盘空间 (/)',
    'sys.metric_disk_sub': '可用空间 {free} ({pct}%)',
    'sys.metric_thermal': 'SMC 温度与散热',
    'sys.thermal_normal': '正常',
    'sys.fan_fanless': '风扇: 无风扇静音架构 (Fanless)',
    'sys.fan_rpm': '风扇转速: {rpm} RPM',
    'sys.fan_idle': '风扇: 静止 / 智能温控',
    'sys.ports_title': '监听端口 (Listening TCP Ports)',
    'sys.col_port': '端口',
    'sys.col_proc': '进程名',
    'sys.col_addr': '监听地址',
    'sys.loading_ports': '正在检测监听端口...',
    'sys.empty_ports': '暂无监听端口',
    'sys.procs_title': '高占用进程 (Top Processes)',
    'sys.procs_hint': '按 CPU 占用排序',
    'sys.col_mem': '内存',
    'sys.loading_procs': '正在加载进程列表...',
    'sys.empty_procs': '暂无进程数据',
    'sys.btn_kill': '结束',
    'sys.kill_confirm': '确定要结束远端进程「{name} (PID: {pid})」吗？',
    'sys.kill_toast': '✅ 已向进程「<strong>{name} ({pid})</strong>」发送终止信号',
    'sys.kill_err': '结束进程失败: {err}',
    'sys.status_err': '获取系统状态失败: {err}',
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

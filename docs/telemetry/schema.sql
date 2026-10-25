-- Cloudflare D1 SQL Schema for MacHead Telemetry
-- Database Binding Name: DB

CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,                  -- 'page_view', 'click_download', 'app_heartbeat', 'app_event'
    anonymous_id TEXT,                    -- client-side anonymous UUID
    app_version TEXT,                     -- e.g. '0.1.14'
    build_number TEXT,                    -- e.g. '18'
    os_version TEXT,                      -- macOS version
    arch TEXT,                            -- 'arm64' or 'x86_64'
    is_headless INTEGER DEFAULT 0,        -- headless mode active (1/0)
    is_launch_at_login INTEGER DEFAULT 0, -- launch-at-login enabled (1/0)
    is_web_dashboard_enabled INTEGER DEFAULT 0, -- web dashboard enabled (1/0)
    auth_accessibility INTEGER DEFAULT 0, -- accessibility permission granted (1/0)
    uptime_seconds INTEGER DEFAULT 0,     -- system uptime in seconds
    utm_source TEXT,                      -- acquisition channel (e.g. v2ex, github, reddit)
    utm_medium TEXT,                      -- medium (e.g. readme, cpc)
    referrer TEXT,                        -- HTTP Referrer of origin
    extra_action TEXT,                    -- 'enable_headless', 'battery_protection_fired', etc.
    country TEXT,                         -- country code (injected by Cloudflare Edge)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- High-frequency analytics indexes
CREATE INDEX IF NOT EXISTS idx_event_created ON telemetry_events(event, created_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_created ON telemetry_events(anonymous_id, created_at);
CREATE INDEX IF NOT EXISTS idx_utm_source ON telemetry_events(utm_source);

-- Zero-knowledge encrypted short-code pairings for Tailcat Web Terminal
CREATE TABLE IF NOT EXISTS terminal_pairings (
    code_hash TEXT PRIMARY KEY,           -- SHA-256 hex of ("machead-pair-id:" + normalized_code)
    encrypted_payload TEXT NOT NULL,      -- Base64(12-byte IV || AES-GCM ciphertext || 16-byte tag)
    mode TEXT NOT NULL DEFAULT 'ephemeral', -- 'ephemeral' (one-time, 10m TTL) or 'persistent' (reusable, 30d TTL)
    expires_at INTEGER NOT NULL,          -- Unix timestamp in seconds
    created_at INTEGER NOT NULL           -- Unix timestamp in seconds
);

CREATE INDEX IF NOT EXISTS idx_terminal_pairings_expires ON terminal_pairings(expires_at);

-- Cloud Dash OAuth Users (GitHub / Google / Apple)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,               -- 'github', 'google', 'apple'
    provider_sub TEXT NOT NULL,           -- unique subject/id from OAuth provider
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(provider, provider_sub)
);

-- Cloud Dash & macOS Client Bearer Sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,          -- SHA-256 hex of raw session token
    user_id TEXT NOT NULL,
    client_type TEXT NOT NULL DEFAULT 'web', -- 'web' or 'macos_app'
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

-- Bound MacHead Devices per User Account
CREATE TABLE IF NOT EXISTS user_devices (
    device_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    model_arch TEXT,
    os_version TEXT,
    is_headless INTEGER DEFAULT 0,
    require_pass INTEGER DEFAULT 0,
    tc_addr TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);

-- Browser-to-MacHead.app OAuth Handoff Requests
CREATE TABLE IF NOT EXISTS app_auth_requests (
    request_id TEXT PRIMARY KEY,
    device_name TEXT,
    session_token TEXT,
    user_json TEXT,
    expires_at INTEGER NOT NULL
);



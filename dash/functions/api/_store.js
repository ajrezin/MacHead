/**
 * Shared storage & crypto helpers for /api/auth and /api/devices.
 * Automatically uses Cloudflare D1 (`env.DB`) in production and falls back
 * to an in-process memory store during local Vite development.
 */

export const memState = {
  users: new Map(),           // id -> userObj
  sessions: new Map(),        // tokenHash -> { userId, clientType, expiresAt, createdAt }
  revokedTokens: new Set(),   // tokenHash
  devices: new Map(),         // deviceId -> deviceObj
  appAuthRequests: new Map(), // requestId -> { deviceName, sessionToken, userJson, expiresAt }
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function toBase64Url(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(str) {
  const base64 = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function resolveSigningSecret(env) {
  if (env && env.JWT_SECRET && String(env.JWT_SECRET).length >= 16) {
    return String(env.JWT_SECRET);
  }
  // Only allow fallback secret in local memory-mode dev when D1 is not bound
  if (!env || !env.DB) {
    return 'machead-local-dev-only-secret-key';
  }
  throw new Error('Missing required JWT_SECRET in production environment');
}

let cachedHmacSecret = null;
let cachedHmacKeyPromise = null;

function getHmacKey(secret) {
  if (secret === cachedHmacSecret && cachedHmacKeyPromise) {
    return cachedHmacKeyPromise;
  }
  cachedHmacSecret = secret;
  cachedHmacKeyPromise = crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return cachedHmacKeyPromise;
}

export async function signPayload(payload, env, prefix = '') {
  const secret = resolveSigningSecret(env);
  const payloadB64 = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payloadB64));
  return `${prefix}${payloadB64}.${toBase64Url(sig)}`;
}

export async function verifySignedPayload(rawToken, env, prefix = '') {
  try {
    const tokenStr = String(rawToken || '');
    if (prefix && !tokenStr.startsWith(prefix)) return null;
    const secret = resolveSigningSecret(env);
    const body = prefix ? tokenStr.slice(prefix.length) : tokenStr;
    const dotIdx = body.indexOf('.');
    if (dotIdx === -1) return null;
    const payloadB64 = body.slice(0, dotIdx);
    const sigB64 = body.slice(dotIdx + 1);
    const key = await getHmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(sigB64),
      textEncoder.encode(payloadB64)
    );
    if (!valid) return null;
    return JSON.parse(textDecoder.decode(fromBase64Url(payloadB64)));
  } catch {
    return null;
  }
}

function createSignedSessionToken(payload, env) {
  return signPayload(payload, env, 'mhs_');
}

function verifySignedSessionToken(rawToken, env) {
  return verifySignedPayload(rawToken, env, 'mhs_');
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && (u.hostname === 'dash.headlessmac.com' || u.hostname === 'headlessmac.com')) {
      return true;
    }
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://dash.headlessmac.com',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Content-Type': 'application/json; charset=utf-8',
};

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

export async function sha256Hex(input) {
  const bytes = textEncoder.encode(String(input));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateRandomToken(prefix = 'mhs_') {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}${hex}`;
}

let schemaInitPromise = null;

export function ensureAuthTables(db) {
  if (!db) return Promise.resolve();
  if (!schemaInitPromise) {
    schemaInitPromise = db
      .batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            provider_sub TEXT NOT NULL,
            email TEXT,
            name TEXT,
            avatar_url TEXT,
            created_at INTEGER NOT NULL,
            UNIQUE(provider, provider_sub)
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS auth_sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            client_type TEXT NOT NULL DEFAULT 'web',
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
          )
        `),
        db.prepare(`
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
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS app_auth_requests (
            request_id TEXT PRIMARY KEY,
            device_name TEXT,
            session_token TEXT,
            user_json TEXT,
            expires_at INTEGER NOT NULL
          )
        `),
      ])
      .catch((err) => {
        schemaInitPromise = null;
        throw err;
      });
  }
  return schemaInitPromise;
}

export async function upsertUserAndCreateSession(
  env,
  { provider, providerSub, legacyProviderSub = '', email, name, avatarUrl, clientType = 'web' }
) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = nowSec + 30 * 24 * 3600; // 30 days
  const deterministicId = `usr_${provider}_${providerSub}`;

  if (!env.DB) {
    let existingUser = null;
    for (const u of memState.users.values()) {
      if (
        u.provider === provider &&
        (u.provider_sub === providerSub || (legacyProviderSub && u.provider_sub === legacyProviderSub))
      ) {
        existingUser = u;
        break;
      }
    }
    const userId = existingUser ? existingUser.id : deterministicId;
    const userObj = {
      id: userId,
      provider,
      provider_sub: providerSub,
      email: email || '',
      name: name || email || providerSub,
      avatar_url: avatarUrl || '',
      created_at: existingUser ? existingUser.created_at : nowSec,
    };
    const rawToken = await createSignedSessionToken(
      {
        uid: userObj.id,
        p: userObj.provider,
        sub: userObj.provider_sub,
        email: userObj.email,
        name: userObj.name,
        avatar: userObj.avatar_url,
        ct: clientType,
        exp: expiresAt,
        iat: nowSec,
        jti: generateRandomToken(''),
      },
      env
    );
    const tokenHash = await sha256Hex(rawToken);
    memState.users.set(userId, userObj);
    memState.sessions.set(tokenHash, {
      userId,
      clientType,
      expiresAt,
      createdAt: nowSec,
    });
    return { sessionToken: rawToken, user: userObj };
  }

  await ensureAuthTables(env.DB);
  let row = await env.DB.prepare(
    'SELECT id, provider, provider_sub, email, name, avatar_url, created_at FROM users WHERE provider = ? AND provider_sub = ?'
  )
    .bind(provider, providerSub)
    .first();

  // Seamless migration from mutable GitHub login to immutable numeric GitHub user ID
  if (!row && legacyProviderSub && legacyProviderSub !== providerSub) {
    row = await env.DB.prepare(
      'SELECT id, provider, provider_sub, email, name, avatar_url, created_at FROM users WHERE provider = ? AND provider_sub = ?'
    )
      .bind(provider, legacyProviderSub)
      .first();
  }

  const userId = row ? row.id : deterministicId;
  const displayName = name || (row && row.name) || email || providerSub;
  const userEmail = email || (row && row.email) || '';
  const userAvatar = avatarUrl || (row && row.avatar_url) || '';

  const rawToken = await createSignedSessionToken(
    {
      uid: userId,
      p: provider,
      sub: providerSub,
      email: userEmail,
      name: displayName,
      avatar: userAvatar,
      ct: clientType,
      exp: expiresAt,
      iat: nowSec,
      jti: generateRandomToken(''),
    },
    env
  );
  const tokenHash = await sha256Hex(rawToken);

  if (row) {
    await env.DB.prepare(
      'UPDATE OR IGNORE users SET provider_sub = ?, email = ?, name = ?, avatar_url = ? WHERE id = ?'
    )
      .bind(providerSub, userEmail, displayName, userAvatar, userId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO users (id, provider, provider_sub, email, name, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, provider_sub) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         avatar_url = excluded.avatar_url`
    )
      .bind(userId, provider, providerSub, userEmail, displayName, userAvatar, nowSec)
      .run();
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO auth_sessions (token_hash, user_id, client_type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(tokenHash, userId, clientType, expiresAt, nowSec)
    .run();

  return {
    sessionToken: rawToken,
    user: {
      id: userId,
      provider,
      provider_sub: providerSub,
      email: userEmail,
      name: displayName,
      avatar_url: userAvatar,
      created_at: row ? row.created_at : nowSec,
    },
  };
}

export async function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const rawToken = match[1].trim();
  if (!rawToken) return null;

  const tokenHash = await sha256Hex(rawToken);
  if (memState.revokedTokens.has(tokenHash)) return null;
  const nowSec = Math.floor(Date.now() / 1000);

  if (!env.DB) {
    const sess = memState.sessions.get(tokenHash);
    if (sess && sess.expiresAt >= nowSec) {
      const user = memState.users.get(sess.userId);
      if (user) return { user, tokenHash };
    }
    const claims = await verifySignedSessionToken(rawToken, env);
    if (claims && Number(claims.exp) >= nowSec) {
      const userObj = {
        id: claims.uid || `usr_${claims.p}_${claims.sub}`,
        provider: claims.p || 'github',
        provider_sub: claims.sub || '',
        email: claims.email || '',
        name: claims.name || claims.sub || 'User',
        avatar_url: claims.avatar || '',
        created_at: claims.iat || nowSec,
      };
      memState.users.set(userObj.id, userObj);
      memState.sessions.set(tokenHash, {
        userId: userObj.id,
        clientType: claims.ct || 'web',
        expiresAt: Number(claims.exp),
        createdAt: claims.iat || nowSec,
      });
      return { user: userObj, tokenHash };
    }
    return null;
  }

  // Production D1 mode: auth_sessions table is the single source of truth.
  // Any logged-out or deleted token_hash is immediately rejected across all edge nodes.
  await ensureAuthTables(env.DB);
  const row = await env.DB.prepare(`
    SELECT u.id, u.provider, u.provider_sub, u.email, u.name, u.avatar_url, u.created_at
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at >= ?
  `)
    .bind(tokenHash, nowSec)
    .first();

  if (row) return { user: row, tokenHash };
  return null;
}

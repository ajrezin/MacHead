import {
  CORS_HEADERS,
  jsonResponse,
  memState,
  ensureAuthTables,
  authenticateRequest,
  encryptTcAddr,
  decryptTcAddr,
} from './_store.js';

async function mapDeviceRow(row, nowSec, env) {
  const lastSeenAt = Number(row.last_seen_at);
  const tcAddr = await decryptTcAddr(row.tc_addr, env);
  return {
    deviceId: row.device_id,
    deviceName: row.device_name,
    modelArch: row.model_arch,
    osVersion: row.os_version,
    isHeadless: Boolean(row.is_headless),
    requirePass: Boolean(row.require_pass),
    tcAddr,
    lastSeenAt,
    isOnline: nowSec - lastSeenAt < 120,
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/devices
 * Returns all bound MacHead devices under the authenticated user's account.
 * Restricted to 'web' sessions only (macos_app tokens cannot enumerate peer devices).
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await authenticateRequest(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Not logged in or session expired' }, 401);
  }
  if (auth.clientType === 'macos_app') {
    return jsonResponse({ error: 'Forbidden: client device token cannot list account devices' }, 403);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const { user } = auth;

  if (!env.DB) {
    const list = [];
    for (const dev of memState.devices.values()) {
      if (dev.user_id === user.id) {
        const mapped = await mapDeviceRow(dev, nowSec, env);
        if (mapped.tcAddr) list.push(mapped);
      }
    }
    list.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    return jsonResponse({ ok: true, user, devices: list });
  }

  await ensureAuthTables(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT device_id, device_name, model_arch, os_version, is_headless, require_pass, tc_addr, last_seen_at
     FROM user_devices
     WHERE user_id = ?
     ORDER BY last_seen_at DESC`
  )
    .bind(user.id)
    .all();

  const mappedList = await Promise.all((results || []).map((row) => mapDeviceRow(row, nowSec, env)));
  const devices = mappedList.filter((d) => d.tcAddr);
  return jsonResponse({ ok: true, user, devices });
}

/**
 * POST /api/devices
 * Called by MacHead.app on startup, tunnel ready, headless state change, and every 45s heartbeat.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await authenticateRequest(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized client token' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const deviceId = String(body.deviceId || '').trim().slice(0, 128);
  const deviceName = String(body.deviceName || 'MacHead').trim().slice(0, 64);
  const modelArch = String(body.modelArch || 'Apple Silicon').trim().slice(0, 64);
  const osVersion = String(body.osVersion || 'macOS').trim().slice(0, 64);
  const isHeadless = body.isHeadless ? 1 : 0;
  const requirePass = body.requirePass ? 1 : 0;
  const tcAddr = String(body.tcAddr || '').trim();

  if (!deviceId || !tcAddr.startsWith('tc') || tcAddr.length > 256) {
    return jsonResponse({ error: 'Missing deviceId or valid tcAddr' }, 400);
  }

  const encryptedTcAddr = await encryptTcAddr(tcAddr, env);
  const nowSec = Math.floor(Date.now() / 1000);
  const { user } = auth;

  if (!env.DB) {
    const existing = memState.devices.get(deviceId);
    if (existing && existing.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden: device belongs to another account' }, 403);
    }
    memState.devices.set(deviceId, {
      device_id: deviceId,
      user_id: user.id,
      device_name: deviceName,
      model_arch: modelArch,
      os_version: osVersion,
      is_headless: isHeadless,
      require_pass: requirePass,
      tc_addr: encryptedTcAddr,
      last_seen_at: nowSec,
      created_at: existing ? existing.created_at : nowSec,
    });
    return jsonResponse({ ok: true, lastSeenAt: nowSec });
  }

  await ensureAuthTables(env.DB);
  const res = await env.DB.prepare(
    `INSERT INTO user_devices
     (device_id, user_id, device_name, model_arch, os_version, is_headless, require_pass, tc_addr, last_seen_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id) DO UPDATE SET
       device_name = excluded.device_name,
       model_arch = excluded.model_arch,
       os_version = excluded.os_version,
       is_headless = excluded.is_headless,
       require_pass = excluded.require_pass,
       tc_addr = excluded.tc_addr,
       last_seen_at = excluded.last_seen_at
     WHERE user_devices.user_id = excluded.user_id`
  )
    .bind(
      deviceId,
      user.id,
      deviceName,
      modelArch,
      osVersion,
      isHeadless,
      requirePass,
      encryptedTcAddr,
      nowSec,
      nowSec
    )
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return jsonResponse({ error: 'Forbidden: device belongs to another account' }, 403);
  }

  return jsonResponse({ ok: true, lastSeenAt: nowSec });
}

/**
 * DELETE /api/devices?device_id=...
 * Unbinds a device from the user's account.
 */
export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = await authenticateRequest(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const deviceId = (url.searchParams.get('device_id') || '').trim();
  if (!deviceId) {
    return jsonResponse({ error: 'Missing device_id' }, 400);
  }

  if (!env.DB) {
    const existing = memState.devices.get(deviceId);
    if (existing && existing.user_id === auth.user.id) {
      memState.devices.delete(deviceId);
    }
    if (auth.clientType === 'macos_app') {
      memState.sessions.delete(auth.tokenHash);
      memState.revokedTokens.add(auth.tokenHash);
    }
    return jsonResponse({ ok: true });
  }

  await ensureAuthTables(env.DB);
  const statements = [
    env.DB.prepare('DELETE FROM user_devices WHERE device_id = ? AND user_id = ?').bind(
      deviceId,
      auth.user.id
    ),
  ];
  if (auth.clientType === 'macos_app') {
    statements.push(
      env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(auth.tokenHash)
    );
  }
  await env.DB.batch(statements);

  return jsonResponse({ ok: true });
}

/**
 * Cloudflare Pages Function: /api/telemetry
 * Handles incoming web and app telemetry events and writes them to Cloudflare D1.
 */
function sanitizeText(val, maxLen = 64) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s ? s.slice(0, maxLen) : null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://headlessmac.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
  };

  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 4096) {
      return new Response(JSON.stringify({ error: 'Payload too large or empty' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const country = sanitizeText(request.cf?.country, 16) || 'Unknown';
    const eventName = sanitizeText(payload.event, 48) || 'unknown';
    const anonymousId = sanitizeText(payload.anonymous_id, 64);
    const appVersion = sanitizeText(payload.app_version, 32);
    const buildNumber = sanitizeText(payload.build_number, 32);
    const osVersion = sanitizeText(payload.os_version, 48);
    const arch = sanitizeText(payload.arch, 32);
    const utmSource = sanitizeText(payload.utm_source, 64);
    const utmMedium = sanitizeText(payload.utm_medium, 64);
    const referrer = sanitizeText(payload.referrer, 256);
    const extraAction = sanitizeText(payload.action || payload.extra_action, 64);
    const uptimeSeconds = Math.max(0, Math.min(315360000, Math.floor(Number(payload.uptime_seconds) || 0)));

    // 如果未绑定 D1 数据库 (env.DB)，降级为 Console 日志记录（防报错）
    if (!env.DB) {
      return new Response(JSON.stringify({ status: 'ok', mode: 'log_only' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // 写入 Cloudflare D1 数据库
    await env.DB.prepare(`
      INSERT INTO telemetry_events (
        event, anonymous_id, app_version, build_number, os_version, arch,
        is_headless, is_launch_at_login, is_web_dashboard_enabled,
        auth_accessibility, uptime_seconds, utm_source, utm_medium,
        referrer, extra_action, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventName,
      anonymousId,
      appVersion,
      buildNumber,
      osVersion,
      arch,
      payload.is_headless ? 1 : 0,
      payload.is_launch_at_login ? 1 : 0,
      payload.is_web_dashboard_enabled ? 1 : 0,
      payload.auth_accessibility ? 1 : 0,
      uptimeSeconds,
      utmSource,
      utmMedium,
      referrer,
      extraAction,
      country
    ).run();

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Telemetry Handler Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

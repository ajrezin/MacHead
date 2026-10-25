import {
  CORS_HEADERS,
  jsonResponse,
  memState,
  ensureAuthTables,
  upsertUserAndCreateSession,
  authenticateRequest,
  signPayload,
  verifySignedPayload,
  isAllowedOrigin,
} from './_store.js';

const REQUEST_ID_REGEX = /^[a-f0-9-]{16,64}$/i;
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function signState(obj, env) {
  return signPayload(obj, env);
}

function verifyAndDecodeState(stateStr, env) {
  return verifySignedPayload(stateStr, env);
}

function resolveCallbackUrl(url, provider, env) {
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (provider === 'github') {
    if (env.GITHUB_REDIRECT_URI) return env.GITHUB_REDIRECT_URI;
    if (isLocal) {
      return 'http://localhost:8788/api/auth/github/callback';
    }
    return `${url.origin}/api/auth/github/callback`;
  }
  if (provider === 'google') {
    if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
    if (isLocal) {
      return 'http://localhost:8788/api/auth/google/callback';
    }
    return `${url.origin}/api/auth/google/callback`;
  }
  return `${url.origin}/api/auth/${provider}/callback`;
}

export async function handleOAuthLogin(request, env, providerOverride) {
  const url = new URL(request.url);
  const provider = (providerOverride || url.searchParams.get('provider') || 'github').toLowerCase();
  const rawAppAuth = (url.searchParams.get('app_auth') || '').trim();
  const appAuth = REQUEST_ID_REGEX.test(rawAppAuth) ? rawAppAuth : '';
  const deviceName = (url.searchParams.get('device_name') || '').slice(0, 64);
  const returnOrigin = isAllowedOrigin(url.origin) ? url.origin : 'https://dash.headlessmac.com';
  const callbackUrl = resolveCallbackUrl(url, provider, env);

  const state = await signState(
    {
      provider,
      appAuth,
      deviceName,
      returnOrigin,
      callbackUrl,
      t: Date.now(),
    },
    env
  );

  if (provider === 'github') {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      const errUrl = new URL('/', returnOrigin);
      errUrl.searchParams.set('auth_error', '未检测到 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 配置');
      return Response.redirect(errUrl.toString(), 302);
    }
    const ghUrl = new URL('https://github.com/login/oauth/authorize');
    ghUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    if (env.GITHUB_REDIRECT_URI) {
      ghUrl.searchParams.set('redirect_uri', env.GITHUB_REDIRECT_URI);
    }
    ghUrl.searchParams.set('scope', 'read:user user:email');
    ghUrl.searchParams.set('state', state);
    return Response.redirect(ghUrl.toString(), 302);
  }

  if (provider === 'google') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      const errUrl = new URL('/', returnOrigin);
      errUrl.searchParams.set('auth_error', '未检测到 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 配置');
      return Response.redirect(errUrl.toString(), 302);
    }
    const ggUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    ggUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    ggUrl.searchParams.set('redirect_uri', callbackUrl);
    ggUrl.searchParams.set('response_type', 'code');
    ggUrl.searchParams.set('scope', 'openid email profile');
    ggUrl.searchParams.set('prompt', 'select_account');
    ggUrl.searchParams.set('state', state);
    return Response.redirect(ggUrl.toString(), 302);
  }

  const errUrl = new URL('/', returnOrigin);
  errUrl.searchParams.set('auth_error', `不支持的登录方式: ${provider}`);
  return Response.redirect(errUrl.toString(), 302);
}

export async function handleOAuthCallback(request, env, providerOverride) {
  const url = new URL(request.url);
  const provider = (providerOverride || url.searchParams.get('provider') || 'github').toLowerCase();
  const safeDefaultOrigin = isAllowedOrigin(url.origin) ? url.origin : 'https://dash.headlessmac.com';

  const code = url.searchParams.get('code') || '';
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error') || '';
  const rawState = url.searchParams.get('state') || '';
  const stateObj = await verifyAndDecodeState(rawState, env);

  if (
    !stateObj ||
    stateObj.provider !== provider ||
    !stateObj.t ||
    Date.now() - Number(stateObj.t) > OAUTH_STATE_MAX_AGE_MS
  ) {
    return Response.redirect(
      `${safeDefaultOrigin}/?auth_error=${encodeURIComponent('OAuth 状态校验失败或已过期，请重新发起登录')}`,
      302
    );
  }

  const targetOrigin = isAllowedOrigin(stateObj.returnOrigin)
    ? stateObj.returnOrigin
    : safeDefaultOrigin;
  const callbackUrl = resolveCallbackUrl(url, provider, env);

  if (oauthError) {
    return Response.redirect(`${targetOrigin}/?auth_error=${encodeURIComponent(oauthError)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${targetOrigin}/?auth_error=${encodeURIComponent('未获取到 OAuth 授权码')}`, 302);
  }

  try {
    let profile = null;

    if (provider === 'github') {
      const tokenPayload = {
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      };
      if (env.GITHUB_REDIRECT_URI) {
        tokenPayload.redirect_uri = env.GITHUB_REDIRECT_URI;
      }
      const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenPayload),
      });
      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'GitHub 令牌交换失败');
      }

      const userResp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'MacHead-Cloud-Dash',
        },
      });
      const ghUser = await userResp.json();
      if (!userResp.ok || !ghUser || !ghUser.id) {
        throw new Error('获取 GitHub 用户信息失败');
      }

      let primaryEmail = ghUser.email || '';
      if (!primaryEmail) {
        try {
          const emailsResp = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              Accept: 'application/vnd.github+json',
              'User-Agent': 'MacHead-Cloud-Dash',
            },
          });
          const emails = await emailsResp.json();
          if (Array.isArray(emails) && emails.length > 0) {
            const best =
              emails.find((e) => e.primary && e.verified) ||
              emails.find((e) => e.verified) ||
              emails[0];
            if (best?.email) primaryEmail = best.email;
          }
        } catch {}
      }

      profile = {
        provider: 'github',
        providerSub: String(ghUser.id),
        legacyProviderSub: String(ghUser.login || ''),
        email: primaryEmail || `${ghUser.login || ghUser.id}@users.noreply.github.com`,
        name: ghUser.name || ghUser.login || 'GitHub User',
        avatarUrl: ghUser.avatar_url || '',
      };
    } else if (provider === 'google') {
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUrl,
        }),
      });
      const tokenData = await tokenResp.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Google 令牌交换失败');
      }

      const userResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const ggUser = await userResp.json();
      if (!userResp.ok || !ggUser || !ggUser.sub) {
        throw new Error('获取 Google 用户信息失败');
      }
      profile = {
        provider: 'google',
        providerSub: String(ggUser.sub),
        email: ggUser.email || '',
        name: ggUser.name || ggUser.email || 'Google User',
        avatarUrl: ggUser.picture || '',
      };
    }

    if (!profile) {
      return Response.redirect(`${targetOrigin}/?auth_error=${encodeURIComponent('不支持的登录提供商')}`, 302);
    }

    const { sessionToken } = await upsertUserAndCreateSession(env, {
      ...profile,
      clientType: 'web',
    });

    const redirectTarget = new URL('/', targetOrigin);
    if (stateObj.appAuth && REQUEST_ID_REGEX.test(stateObj.appAuth)) {
      redirectTarget.searchParams.set('app_auth', stateObj.appAuth);
    }
    if (stateObj.deviceName) {
      redirectTarget.searchParams.set('device_name', String(stateObj.deviceName).slice(0, 64));
    }
    redirectTarget.hash = `auth_token=${encodeURIComponent(sessionToken)}`;
    return Response.redirect(redirectTarget.toString(), 302);
  } catch (err) {
    return Response.redirect(
      `${targetOrigin}/?auth_error=${encodeURIComponent(err.message || 'OAuth 登录失败')}`,
      302
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'me';

  if (action === 'me') {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ authenticated: false });
    }
    return jsonResponse({
      authenticated: true,
      user: auth.user,
    });
  }

  if (action === 'poll_app') {
    const requestId = (url.searchParams.get('request_id') || '').trim();
    if (!REQUEST_ID_REGEX.test(requestId)) {
      return jsonResponse({ error: 'Invalid request_id format' }, 400);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!env.DB) {
      const rec = memState.appAuthRequests.get(requestId);
      if (!rec || rec.expiresAt < nowSec || !rec.sessionToken) {
        return jsonResponse({ ok: true, status: 'pending' });
      }
      memState.appAuthRequests.delete(requestId);
      return jsonResponse({
        ok: true,
        status: 'approved',
        sessionToken: rec.sessionToken,
        user: JSON.parse(rec.userJson),
      });
    }

    await ensureAuthTables(env.DB);
    const row = await env.DB.prepare(
      'SELECT session_token, user_json, expires_at FROM app_auth_requests WHERE request_id = ?'
    )
      .bind(requestId)
      .first();

    if (!row || Number(row.expires_at) < nowSec || !row.session_token) {
      return jsonResponse({ ok: true, status: 'pending' });
    }

    await env.DB.prepare('DELETE FROM app_auth_requests WHERE request_id = ?')
      .bind(requestId)
      .run();

    return jsonResponse({
      ok: true,
      status: 'approved',
      sessionToken: row.session_token,
      user: JSON.parse(row.user_json),
    });
  }

  if (action === 'login') {
    return handleOAuthLogin(request, env);
  }

  if (action === 'callback') {
    return handleOAuthCallback(request, env);
  }

  return jsonResponse({ error: 'Unknown action' }, 400);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const action = body.action || '';

  if (action === 'approve_app') {
    const auth = await authenticateRequest(request, env);
    if (!auth) {
      return jsonResponse({ error: '请先登录账号后再授权客户端' }, 401);
    }

    const requestId = String(body.requestId || '').trim();
    const deviceName = String(body.deviceName || 'MacHead').trim().slice(0, 64);
    if (!REQUEST_ID_REGEX.test(requestId)) {
      return jsonResponse({ error: 'Invalid requestId format' }, 400);
    }

    const { user } = auth;
    const appSession = await upsertUserAndCreateSession(env, {
      provider: user.provider,
      providerSub: user.provider_sub,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      clientType: 'macos_app',
    });

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = nowSec + 300;
    const userJson = JSON.stringify(appSession.user);

    if (!env.DB) {
      const existing = memState.appAuthRequests.get(requestId);
      if (existing && existing.expiresAt >= nowSec) {
        return jsonResponse({ error: 'Request already approved' }, 409);
      }
      memState.appAuthRequests.set(requestId, {
        deviceName,
        sessionToken: appSession.sessionToken,
        userJson,
        expiresAt,
      });
    } else {
      await ensureAuthTables(env.DB);
      const existing = await env.DB.prepare(
        'SELECT expires_at FROM app_auth_requests WHERE request_id = ?'
      )
        .bind(requestId)
        .first();
      if (existing && Number(existing.expires_at) >= nowSec) {
        return jsonResponse({ error: 'Request already approved' }, 409);
      }
      await env.DB.prepare(
        'INSERT OR REPLACE INTO app_auth_requests (request_id, device_name, session_token, user_json, expires_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(requestId, deviceName, appSession.sessionToken, userJson, expiresAt)
        .run();
    }

    return jsonResponse({
      ok: true,
      deviceName,
      user: appSession.user,
    });
  }

  if (action === 'logout') {
    const auth = await authenticateRequest(request, env);
    if (auth) {
      memState.revokedTokens.add(auth.tokenHash);
      if (!env.DB) {
        memState.sessions.delete(auth.tokenHash);
      } else {
        await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
          .bind(auth.tokenHash)
          .run();
      }
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Unknown POST action' }, 400);
}

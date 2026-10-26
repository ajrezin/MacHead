/**
 * Enterprise Geo & Locale Routing Middleware for headlessmac.com
 *
 * Behaviour (modeled after Stripe / Vercel / Linear):
 * 1. Explicit `?lang=zh` or `?lang=en` query parameter:
 *    Sets the persistent `mh_locale` cookie (1 year) and redirects to the clean
 *    canonical path (`/` or `/en/`, `/changelog` or `/en/changelog`).
 * 2. Search Engine Bots & Crawlers:
 *    Never auto-redirect crawlers so both `/` (zh-CN) and `/en/` (en) are
 *    indexed cleanly via `<link rel="alternate" hreflang="...">`.
 * 3. Persistent User Choice (`mh_locale` cookie):
 *    If the user previously chose a language via the UI switcher, honor it.
 * 4. First-Visit Geo + Accept-Language Detection:
 *    - Visitors from CN / HK / MO / TW (or with `Accept-Language: zh*`) stay on Chinese (`/`).
 *    - Visitors from other regions without a Chinese `Accept-Language` preference
 *      are automatically redirected (302) to the English experience (`/en/`).
 */

const BOT_UA_REGEX =
  /bot|crawler|spider|slurp|googlebot|bingbot|baiduspider|yandex|duckduckbot|facebookexternalhit|twitterbot|applebot|linkedinbot|embedly|quora|pinterest|slackbot|vkshare|w3c_validator|whatsapp|telegrambot|ahrefsbot|semrushbot|CURL/i;

const CHINESE_COUNTRIES = new Set(['CN', 'HK', 'MO', 'TW']);

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

function prefersChineseByHeader(acceptLang) {
  if (!acceptLang) return null;
  const lower = acceptLang.toLowerCase().trim();
  // Check primary language tag first
  const tags = lower
    .split(',')
    .map((s) => s.split(';')[0].trim())
    .filter(Boolean);
  if (tags.length === 0) return null;
  if (tags[0].startsWith('zh')) return true;
  if (tags[0].startsWith('en')) return false;
  if (tags.some((t) => t.startsWith('zh'))) return true;
  return false;
}

function buildLocaleCookie(locale, hostname) {
  const domainAttr =
    hostname && (hostname === 'headlessmac.com' || hostname.endsWith('.headlessmac.com'))
      ? '; Domain=.headlessmac.com'
      : '';
  return `mh_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${domainAttr}`;
}

export async function onRequest(context) {
  const { request, next } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return next();
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Only apply locale routing to landing and changelog HTML routes
  const isZhRoot = path === '/' || path === '/index.html';
  const isZhChangelog = path === '/changelog' || path === '/changelog.html';
  const isEnRoot = path === '/en' || path === '/en/' || path === '/en/index.html';
  const isEnChangelog =
    path === '/en/changelog' || path === '/en/changelog/' || path === '/en/changelog.html';

  if (!isZhRoot && !isZhChangelog && !isEnRoot && !isEnChangelog) {
    return next();
  }

  // 1. Handle explicit `?lang=zh|en` override
  const langParam = (url.searchParams.get('lang') || '').toLowerCase();
  if (langParam === 'zh' || langParam === 'en') {
    url.searchParams.delete('lang');
    const qs = url.searchParams.toString();
    let targetPath = '/';
    if (langParam === 'en') {
      targetPath = isZhChangelog || isEnChangelog ? '/en/changelog' : '/en/';
    } else {
      targetPath = isZhChangelog || isEnChangelog ? '/changelog' : '/';
    }
    const redirectUrl = `${url.origin}${targetPath}${qs ? '?' + qs : ''}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Set-Cookie': buildLocaleCookie(langParam, url.hostname),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  }

  // 2. Never auto-redirect search engine bots or CLI tools
  const ua = request.headers.get('user-agent') || '';
  if (BOT_UA_REGEX.test(ua)) {
    return next();
  }

  // 3. Respect explicit cookie preference if present
  const cookies = parseCookies(request.headers.get('cookie'));
  const savedLocale = cookies.mh_locale;
  if (savedLocale === 'en' && (isZhRoot || isZhChangelog)) {
    const targetPath = isZhChangelog ? '/en/changelog' : '/en/';
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}${targetPath}${url.search}`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Vary: 'Cookie, Accept-Language, CF-IPCountry',
      },
    });
  }
  if (savedLocale === 'zh' && (isEnRoot || isEnChangelog)) {
    const targetPath = isEnChangelog ? '/changelog' : '/';
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}${targetPath}${url.search}`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Vary: 'Cookie, Accept-Language, CF-IPCountry',
      },
    });
  }
  if (savedLocale === 'zh' || savedLocale === 'en') {
    return next();
  }

  // 4. First-visit Geo + Accept-Language routing on root `/` and `/changelog`
  if (isZhRoot || isZhChangelog) {
    const country = (
      (request.cf && request.cf.country) ||
      request.headers.get('cf-ipcountry') ||
      ''
    ).toUpperCase();
    const acceptLang = request.headers.get('accept-language') || '';
    const langPrefersZh = prefersChineseByHeader(acceptLang);

    // Determine if visitor should see Chinese or English:
    // - If Accept-Language explicitly starts with `zh`, keep on Chinese.
    // - Else if country is CN/HK/MO/TW and Accept-Language didn't explicitly start with `en`, keep on Chinese.
    // - Otherwise (international visitor or explicit English browser preference outside Chinese regions), redirect to `/en/`.
    let targetLocale = 'zh';
    if (langPrefersZh === true) {
      targetLocale = 'zh';
    } else if (country && !CHINESE_COUNTRIES.has(country)) {
      targetLocale = 'en';
    } else if (!country && langPrefersZh === false) {
      targetLocale = 'en';
    }

    if (targetLocale === 'en') {
      const targetPath = isZhChangelog ? '/en/changelog' : '/en/';
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${url.origin}${targetPath}${url.search}`,
          'Set-Cookie': buildLocaleCookie('en', url.hostname),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          Vary: 'Cookie, Accept-Language, CF-IPCountry',
        },
      });
    }
  }

  return next();
}

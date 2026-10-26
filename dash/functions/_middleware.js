/**
 * Enterprise Geo & Locale Cookie Middleware for MacHead Cloud (dash.headlessmac.com)
 *
 * - Detects visitor region via Cloudflare `request.cf.country` (`CN`, `HK`, `MO`, `TW`)
 *   and `Accept-Language`.
 * - Supports explicit `?lang=zh|en` override.
 * - Sets a non-HttpOnly `mh_locale=zh|en` cookie (shared across `.headlessmac.com` when applicable)
 *   so the MacHead Cloud SPA boots immediately in the visitor's region/preferred language
 *   without any redirect latency or OAuth callback disruption.
 */

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
  const url = new URL(request.url);

  // Skip API endpoints and static binary assets
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/terminal/') ||
    url.pathname.startsWith('/assets/')
  ) {
    return next();
  }

  const langParam = (url.searchParams.get('lang') || '').toLowerCase();
  const cookies = parseCookies(request.headers.get('cookie'));
  let resolvedLocale = cookies.mh_locale;

  if (langParam === 'zh' || langParam === 'en') {
    resolvedLocale = langParam;
  } else if (resolvedLocale !== 'zh' && resolvedLocale !== 'en') {
    const country = (
      (request.cf && request.cf.country) ||
      request.headers.get('cf-ipcountry') ||
      ''
    ).toUpperCase();
    const acceptLang = request.headers.get('accept-language') || '';
    const langPrefersZh = prefersChineseByHeader(acceptLang);

    if (langPrefersZh === true) {
      resolvedLocale = 'zh';
    } else if (country && !CHINESE_COUNTRIES.has(country)) {
      resolvedLocale = 'en';
    } else if (!country && langPrefersZh === false) {
      resolvedLocale = 'en';
    } else {
      resolvedLocale = 'zh';
    }
  }

  const response = await next();
  // Attach Set-Cookie if cookie wasn't set or was overridden by ?lang=
  if (cookies.mh_locale !== resolvedLocale || langParam === 'zh' || langParam === 'en') {
    const newHeaders = new Headers(response.headers);
    newHeaders.append('Set-Cookie', buildLocaleCookie(resolvedLocale, url.hostname));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return response;
}

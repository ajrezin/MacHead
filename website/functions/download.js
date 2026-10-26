/**
 * Dynamic Installer Download Redirector (/download)
 *
 * Ensures homepage, English page, changelog, and SEO guide download buttons
 * never break or serve stale cached URLs across releases or rollbacks:
 * 1. Reads the current `appcast.json` from the static assets bundle.
 * 2. Performs a lightweight HEAD probe against the versioned R2 DMG URL.
 * 3. If the versioned DMG is available (200 OK), redirects (302, no-store) to it.
 * 4. If a version was just withdrawn from R2 before appcast.json updated,
 *    automatically falls back to `latest.dmg` or the previous valid release.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const fallbackLatestUrl = 'https://releases.headlessmac.com/latest.dmg';

  let targetUrl = fallbackLatestUrl;

  try {
    const appcastUrl = new URL('/appcast.json', request.url);
    const appcastRes = env.ASSETS
      ? await env.ASSETS.fetch(appcastUrl.toString())
      : await fetch(appcastUrl.toString(), { cf: { cacheTtl: 0 } });

    if (appcastRes && appcastRes.ok) {
      const appcast = await appcastRes.json();
      if (appcast && typeof appcast.url === 'string' && appcast.url.startsWith('https://')) {
        // Probe the versioned DMG URL to ensure it hasn't been withdrawn from R2
        try {
          const probe = await fetch(appcast.url, {
            method: 'HEAD',
            cf: { cacheTtl: 0 },
          });
          if (probe.ok) {
            targetUrl = appcast.url;
          }
        } catch {
          targetUrl = appcast.url;
        }
      }
    }
  } catch {
    // Fall back to latest.dmg
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

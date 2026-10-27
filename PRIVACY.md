# Privacy Policy

**English**

---

MacHead is a native macOS application developed by an independent developer. This page describes exactly what data the app and the website collect, why, and how to turn it off. MacHead contains **no third-party analytics SDK, no ads, and no trackers**.

## What we collect

**App telemetry** (anonymous usage statistics, sent to `https://headlessmac.com/api/telemetry`):

| Field | Example | Purpose |
|---|---|---|
| `event` | `app_heartbeat`, `app_event` | Distinguish event types |
| `anonymous_id` | `8F3A…-UUID` | Random UUID generated locally on first launch; **not** derived from any hardware identifier |
| `app_version` / `build_number` | `0.1.23` / `26` | Version adoption, crash correlation |
| `os_version` / `arch` | `Version 15.6 (Build…)` / `arm64` | Platform distribution |
| `is_headless`, `is_launch_at_login`, `is_web_dashboard_enabled`, `auth_accessibility` | `true/false` | Feature usage booleans |
| `uptime_seconds` | `86400` | System uptime in seconds |
| `country` | `US` | Injected automatically by Cloudflare Edge; no IP address is stored |

**Website analytics** (headlessmac.com): standard `page_view` / `click_download` events with `utm_*` and `referrer` for traffic-source attribution. No cookies, no fingerprinting.

## What we never collect

Hardware serial numbers, MAC addresses, hostname, file paths, window titles, keystrokes, account credentials, or any user content. IP addresses are not written to the database.

## Opting out

Preferences → General → turn off ****Anonymous usage statistics****. No further events are sent, immediately. Existing app behavior is unaffected.

## Data handling

Events are stored in a single Cloudflare D1 table used solely to answer "how many active installs, on which versions, using which features". Data is never sold, shared, or used for advertising. Aggregated numbers may be published (e.g. install counts).

---

## Additional notes

MacHead is a native macOS application maintained by an independent developer. This page documents exactly what the app and website collect, why, and how to disable it. **There are no third-party analytics SDKs, ads, or trackers**.

## What we collect

**App telemetry** (anonymous usage statistics, sent to `https://headlessmac.com/api/telemetry`):

| Field | Example | Purpose |
|---|---|---|
| `event` | `app_heartbeat`, `app_event` | Distinguish event types |
| `anonymous_id` | `8F3A…-UUID` | Random UUID generated locally on first launch; **not derived from any hardware identifier** |
| `app_version` / `build_number` | `0.1.23` / `26` | Version distribution, crash correlation |
| `os_version` / `arch` | `Version 15.6` / `arm64` | Platform distribution |
| `is_headless`, `is_launch_at_login`, `is_web_dashboard_enabled`, `auth_accessibility` | `true/false` | Feature usage booleans |
| `uptime_seconds` | `86400` | System uptime in seconds |
| `country` | `US` | Country code automatically injected by Cloudflare Edge; **no IP is stored** |

**Website analytics** (headlessmac.com): standard `page_view` / `click_download` events with `utm_*` and `referrer` for traffic-source attribution. No cookies, no fingerprinting.

## What we never collect

Hardware serial numbers, MAC addresses, hostnames, filesystem paths, window titles, keystrokes, account credentials, or any user content are not collected. IP addresses are not written to the database.

## Opting out

Preferences → General → turn off **Anonymous usage statistics**. No further events are sent immediately, and app functionality is unaffected.

## How we handle data

Events are stored in a single Cloudflare D1 table and are used only to answer “how many active installs there are, which versions are in use, and which features are enabled.” Data is never sold, shared, or used for advertising. Aggregate figures may be published (for example, install counts).

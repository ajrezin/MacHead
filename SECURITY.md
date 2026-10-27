# Security Policy

**English**

## Reporting a vulnerability

**Please do not open a public issue for security problems.** Instead, use GitHub's private vulnerability reporting:

👉 [github.com/ox01024/MacHead/security/advisories/new](https://github.com/ox01024/MacHead/security/advisories/new)

Please include: affected version (menu bar → About), macOS version, reproduction steps, and impact assessment. Reports are handled by the maintainer directly.

MacHead runs with elevated relevance on a user's machine — accessibility permissions, input interception, sudoers rules for battery control, and LAN/remote-tunnel exposure are all in scope and appreciated.

## Scope notes

- The relay/billing server side (tunnel orchestration) is **not** part of this open-source repository; reports about the `headlessmac.com` web service are still welcome via the same channel.
- The bundled third-party binaries (frp, nezha-agent, cloudflared) should be reported upstream; bundled-version issues can be reported here.

---

## Additional notes

## Vulnerability reports

**For security issues, do not open a public issue** (to avoid exposing 0-days). Please use GitHub’s private vulnerability reporting:

👉 [github.com/ox01024/MacHead/security/advisories/new](https://github.com/ox01024/MacHead/security/advisories/new)

Please include: affected version (menu bar → About), macOS version, reproduction steps, and impact assessment. Reports are handled by the maintainer directly.

MacHead runs with elevated access on the user’s machine—accessibility permissions, input interception, sudoers rules for battery control, and LAN / remote tunnel exposure are all within scope and welcome reporting.

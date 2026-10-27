# Contributing

Thank you for contributing to MacHead! This project intentionally stays small and focused: pure Swift, zero third-party dependencies, single target.

## Development Environment

Only macOS’s built-in **Xcode Command Line Tools** are needed (no full Xcode required):

```bash
xcode-select --install        # if not installed
git clone https://github.com/ox01024/MacHead.git
cd MacHead
./build.sh --no-install       # build a universal binary; output stays in ./MacHead.app in the current directory
./build.sh                    # build and install to /Applications (overwrites the existing version and restarts the app)
```

- No SwiftPM / CocoaPods dependencies; `Sources/*.swift` are compiled directly with `swiftc`.
- No Apple Developer certificate is required; builds use ad-hoc signing.
- The third-party binaries in `Resources/` (nezha-agent, frpc, cloudflared, serverstatus-client) are **not** checked into the repo; the build still succeeds without them, and only the relevant optional features become unavailable. Official releases are assembled by GitHub Actions (`release.yml`).

## Project Structure

```
Sources/            # Swift source code (menu bar app, machead CLI, service modules)
Resources/          # Info.plist, icons, web panel assets
Scripts/            # build helper scripts (icon generation, etc.)
website/            # Website headlessmac.com (Vite + Cloudflare Pages)
docs/               # in-depth docs (telemetry schema, etc.)
```

## Commit Guidelines

- Use conventional commit prefixes in commit messages: `feat:` / `fix:` / `docs:` / `chore:` / `refactor:` … Both Chinese and English are acceptable.
- Keep each PR focused on a single topic; use branch names like `feat/xxx` and `fix/xxx`.
- Include screenshots for UI changes. For changes involving permissions (Accessibility, Input Monitoring, sudoers), describe the test path.

## Issues

- For bug reports, include the macOS version and model, the MacHead version (menu bar → About), and reproduction steps.
- For feature suggestions, describe the **use case** first, not only the implementation.
- For security issues, do not open a public issue; use [private vulnerability reporting](https://github.com/ox01024/MacHead/security/advisories/new) instead (see [SECURITY.md](SECURITY.md)).

## Code of Conduct

Be kind and focus on the substance, not the person. Maintainers handle feedback in their spare time; please be patient if responses are slow.

---

Issues and PRs in English are welcome.

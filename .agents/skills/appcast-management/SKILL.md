---
name: appcast-management
description: Detailed schema, rules, and URL configurations for managing the MacHead OTA appcast.json metadata file.
---
# MacHead appcast.json management guide

This skill defines the standard schema, field rules, and hosting path for the MacHead client automatic update (OTA) metadata file `appcast.json`. Any agent modifying the app or update logic must follow this specification exactly.

## 1. Physical hosting path
- The version manifest file must be stored in the frontend static asset directory: `website/public/appcast.json`.
- **Change mechanism**: This file may only be updated by the release pipeline (the "Update appcast.json" step in GitHub Actions `release.yml`) and committed as `chore(release): update appcast.json for vX`; do not manually edit version fields outside the release pipeline and push directly to `main`.
- **Publish mechanism**: appcast.json is published alongside the website static assets; after the release pipeline pushes the appcast to `main`, the Cloudflare Pages Git integration automatically builds and deploys it; the live URL is `https://headlessmac.com/appcast.json`.The appcast is published together with the static assets; after the release pipeline pushes the appcast commit to `main`, the **Cloudflare Pages Git integration** builds and deploys it automatically (note: this bot commit does not trigger Actions; the legacy `deploy.yml` → `gh-pages` path is not used for the live domain). The public URL is `https://headlessmac.com/appcast.json`.

## 2. Field schema definition
`appcast.json` contains the following 5 required core fields:

```json
{
  "version": "1.1.0",
  "build": 2,
  "pubDate": "2026-07-04",
  "url": "https://releases.headlessmac.com/MacHead-v1.1.0-macos-universal.dmg",
  "releaseNotes": "1. 修复了插拔电源时的Battery保护误触发问题；\n2. 优化了外接屏幕断开后的恢复速度。"
}
```

### Field details:
- `version` (String): Semantic version number (SemVer). Comparison uses `String.compare(_:options:.numeric)`.
- `build` (Int): Integer build number. If `version` is the same but `build` is higher, the client still triggers an update.
- `pubDate` (String): Version publication date in `YYYY-MM-DD` format.
- `url` (String): Direct download URL for the installation package. It must use the bound R2 bucket subdomain: `https://releases.headlessmac.com/MacHead-v[Version]-macos-universal.dmg`.
- `releaseNotes` (String): 面向普通用户的通俗升级日志。可以使用换行符 `\n`。

## 3. Update detection logic (Swift client)
- The client performs detection using the singleton `UpdateManager.shared`.
- Automatic checks are normally triggered silently 3 seconds after app launch; manual checks are triggered by the “Check for Updates...” button at the bottom of Preferences (`PreferencesView.swift`).
- Comparison logic:
  ```swift
  let versionResult = cloudVersion.compare(currentVersion, options: .numeric)
  if versionResult == .orderedDescending {
      return true
  } else if versionResult == .orderedSame {
      return cloudBuild > currentBuild
  }
  return false
  ```

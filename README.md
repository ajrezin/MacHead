# MacHead

<p align="center">
  <img src="Resources/logo.svg" width="128" height="128" alt="MacHead Logo" />
</p>

<h3 align="center">Turn your closed MacBook into a headless Mac Studio</h3>

<p align="center">
  <em>Turn your closed MacBook into a headless Mac Studio.</em>
</p>

<p align="center">
  <a href="https://headlessmac.com"><img src="https://img.shields.io/badge/Website-headlessmac.com-blue.svg" alt="Website" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%2012.0%2B-blue.svg" alt="Platform: macOS 12.0+" />
  <img src="https://img.shields.io/badge/arch-Apple%20Silicon%20%7C%20Intel-orange.svg" alt="Architecture: Apple Silicon | Intel" />
  <img src="https://img.shields.io/github/v/release/ox01024/MacHead" alt="Release" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-green.svg" alt="License: Apache 2.0" />
</p>

**English** — MacHead is a free, open-source macOS menu-bar app that turns any MacBook — even one with a broken screen — into a headless server. disable the lid and it keeps working: internal display off, clamshell sleep handled, microphone muted, battery guarded. Includes a web console, a CLI (`machead`), remote access via Cloudflare Tunnel / Microsoft Dev Tunnels / FRP, and monitoring integrations (Serverstatus, Uptime Kuma). Apple Silicon & Intel, macOS 12+.

<p align="center">
  <img src="website/public/machead_console.jpg" width="720" alt="MacHead remote console and preferences: live CPU/memory/GPU/battery monitoring and remote headless workstation management" />
</p>

**MacHead** is a lightweight, dependency-free native macOS open-source tool designed to turn an idle MacBook (one with a broken screen, one you plan to close the lid on, or one you want to use as a dedicated desktop server/router) into an efficient, stable, and secure **headless workstation**. Open the lid and it is a laptop; close the lid and it becomes a server.

---

## ✨ Core Features

- 🖥️ **Headless server on lid close**: safely disconnect the built-in display, support clamshell operation, and turn your MacBook into a quiet, power-efficient headless workstation with reduced screen wear and heat.
- ⌨️ **Smart accidental-touch prevention**: when Headless mode is enabled, the built-in keyboard and trackpad are automatically locked; external input devices remain fully functional, and the trackpad stays disabled when an external mouse is connected.
- 🔇 **Privacy protection**: automatically mute the microphone in Headless mode to prevent eavesdropping and restore the original volume when leaving Headless mode.
- 🔋 **Battery protection**: if power is unexpectedly lost and battery is below the safety threshold, sleep prevention is automatically released and deep sleep is allowed to avoid the battery being drained while the lid is closed.
- 📊 **Remote web console**: monitor CPU, memory, and battery in real time from a browser on your phone or computer, with remote control and a randomly generated admin password on first launch.
- ↔️ **Network tunneling toolkit**: manage **Cloudflare Tunnel**, **Microsoft Dev Tunnels**, and **FRP** from one place to securely expose local SSH/web services to the internet for remote access.
- 📡 **Monitoring & alerts**: native support for **Nezha**, **Serverstatus**, and **Uptime Kuma**, plus temperature alerts via Bark or Telegram for unattended monitoring.
- 🧹 **Move to Trash to uninstall**: no system writes by default; drag the app to the Trash to fully uninstall it. Optional components are created on demand and cleaned up when disabled.

---

## 🚀 Download & Install

**Method 1: Website download (recommended, always latest)**

Go to [headlessmac.com](https://headlessmac.com), download the DMG image, open it, and drag MacHead into the Applications folder. Supports macOS 12.0+ (Monterey and later), Apple Silicon, and Intel. New versions are silently pushed via automatic updates after installation.

**Method 2: GitHub Releases**

Go to [GitHub Releases](https://github.com/ox01024/MacHead/releases) to download older DMG builds.

---

## ⚡ Quick Start

**One-click menu bar controls**

After launch, the MacHead icon appears in the menu bar. Click it to toggle between **Headless mode** and **restore internal display**, and to view display, power, and temperature status in real time. Features such as launch-at-login, accidental touch prevention, tunneling, and monitoring are managed from Preferences.

**Command-line control**

After enabling the CLI tool in Preferences, you can control it directly from Terminal (including SSH):

```bash
machead --status    # check current status (headless / normal / offline)
machead --enable    # enable Headless mode
machead --disable   # restore normal mode
```

**Remote web console**

After enabling this in Preferences, open `http://<local LAN IP>:8080` in a browser (for example, `http://192.168.1.100:8080`; the default port is 8080 and can be changed in Preferences). The username is `admin`, and the password is randomly generated on first launch (and can be changed in Preferences).

---

## 🔒 Permission Setup

Blocking the built-in keyboard / trackpad requires special macOS authorization (the preferences panel will guide you when a feature is not active).：

1. **Accessibility permission**: allow **MacHead** under **System Settings → Privacy & Security → Accessibility**. This is used to intercept and ignore the built-in keyboard’s physical key presses.
2. **Input monitoring permission**: allow **MacHead** under **System Settings → Privacy & Security → Input Monitoring**. This is used to exclusively lock the built-in trackpad.

---

## 🗑️ Uninstallation

Following native macOS behavior: **drag the app to the Trash to uninstall it**; no uninstaller is needed.

- **Default installation** (with optional components disabled): no system writes are made, and dragging the app to the Trash removes it completely.
- **If optional components were enabled**: cleanup happens immediately when you turn them off:
  - disable the `machead` CLI tool → `/usr/local/bin/machead` is immediately removed
  - sign out of Dev Tunnels → Keychain login credentials are immediately cleared
  - the devtunnel CLI installed by the app lives in `~/Library/Application Support/MacHead/`; deleting that directory removes it

---

## 🔐 Privacy & Telemetry

- **Telemetry is fully anonymous**: it only collects a locally generated random UUID, system/application version, CPU architecture, and feature status booleans. It does **not** include any hardware serial numbers, network addresses, account credentials, or usage content.
- **One-click opt-out**: Preferences → General → disable **Anonymous usage statistics** to stop all data transmission immediately.
- **Zero third-party SDKs**: telemetry is sent via a lightweight custom HTTP endpoint with no ad or analytics components.
- See [PRIVACY.md](PRIVACY.md) for the complete field list and data handling; see [SECURITY.md](SECURITY.md) for the vulnerability reporting process.

---

## 🛠️ Build from Source

The development environment has zero third-party dependencies; only macOS’s built-in Xcode Command Line Tools are required:

```bash
git clone https://github.com/ox01024/MacHead.git
cd MacHead
./build.sh --no-install   # build a universal binary; output stays in ./MacHead.app in the current directory
./build.sh                # build and install to /Applications (restarts the app if needed)
```

No Apple Developer certificate is required (ad-hoc signing); no third-party package managers are needed. Optional monitoring and tunneling binaries under `Resources/` are not checked in; builds still succeed if they are missing. See [CONTRIBUTING.md](CONTRIBUTING.md).

```
MacHead/
├── Sources/            # Swift source code (app, CLI, service modules)
├── Resources/          # app resources (Info.plist, icons, web UI assets)
├── Scripts/            # build helper scripts (icon generation, etc.)
├── website/            # Website headlessmac.com (Vite + Cloudflare Pages)
├── docs/               # deeper documentation
├── build.sh            # one-click build/install script
└── .github/workflows/  # CI/CD (releases, website deployment)
```

Contributions are welcome via [Issues](https://github.com/ox01024/MacHead/issues) and [Pull Requests](https://github.com/ox01024/MacHead/pulls). Please include the macOS version and model when reporting a bug, and describe the use case before suggesting a feature. Maintainers use annotated `v*` tags to trigger GitHub Actions release automation (build, DMG, R2 upload, appcast, and GitHub Release).

---

## 📄 Open Source License

This project’s source code is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.

- **The client is fully open source**: this repository contains the full source code for the macOS client.
- **Third-party components**: the frp, nezha-agent, and cloudflared components downloaded during the build process remain under their original authorship; see [NOTICE](NOTICE) for licensing details. The Microsoft Dev Tunnels CLI is proprietary and is not redistributed or bundled; users install it separately under Microsoft’s terms.

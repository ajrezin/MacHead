import Foundation
import AppKit

/// machead CLI symlink management (/usr/local/bin/machead → app executable)
/// This is the only out-of-bundle component; it is strictly opt-in: created only after the user enables it in Preferences.
/// It is removed when disabled; by default the user makes no writes to system paths, and dragging the app to the Trash fully uninstalls it.
enum CLIToolInstaller {
    static let defaultsKey = "EnableCLITool"
    static let symlinkPath = "/usr/local/bin/machead"
    static let targetPath = "/Applications/MacHead.app/Contents/MacOS/MacHead"

    static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: defaultsKey)
    }

    /// Called on app launch: only maintains the symlink when the user has enabled the CLI tool.
    static func setupIfEnabled() {
        // Legacy migration (one-time): users with existing symlinks and no prior preference value are treated as explicitly enabled;
        // After that, the stored preference is authoritative and no longer overridden by the Files system status
        if UserDefaults.standard.object(forKey: defaultsKey) == nil,
           FileManager.default.fileExists(atPath: symlinkPath) {
            UserDefaults.standard.set(true, forKey: defaultsKey)
        }
        guard isEnabled else { return }
        install()
    }

    /// Creates the symlink and prompts for authorization if the user lacks write permission.
    @discardableResult
    static func install() -> Bool {
        let fm = FileManager.default

        // Create only when the app is located in /Applications（与其他机器路径不兼容)
        guard fm.fileExists(atPath: targetPath) else { return false }

        // Already exists and points to the correct location; no action required
        if fm.fileExists(atPath: symlinkPath),
           let dest = try? fm.destinationOfSymbolicLink(atPath: symlinkPath), dest == targetPath {
            return true
        }

        // First try creating it with user permissions directly（/usr/local/bin 可写时；目录已存在时创建为空Actions)
        do {
            try fm.createDirectory(atPath: "/usr/local/bin", withIntermediateDirectories: true)
            if fm.fileExists(atPath: symlinkPath) {
                try fm.removeItem(atPath: symlinkPath)
            }
            try fm.createSymbolicLink(atPath: symlinkPath, withDestinationPath: targetPath)
            NSLog("MacHead: CLI symlink created successfully (user permissions)")
            return true
        } catch {
            // No write permission; use privilege escalation
        }

        // 提权创建（与用户确认后)
        return onMainIfRemote {
            let alert = NSAlert()
            alert.messageText = "Install MacHead command-line tool"
            alert.informativeText = "MacHead wants to create a symlink for the command-line tool at /usr/local/bin/machead. After enabling it, you can run 'machead' in Terminal to manage the device daemon."
            alert.alertStyle = .informational
            alert.addButton(withTitle: "Install now (password or Touch ID required)")
            alert.addButton(withTitle: "Later")

            guard alert.runModal() == .alertFirstButtonReturn else { return false }
            return runElevated("mkdir -p /usr/local/bin && ln -sf \(targetPath) \(symlinkPath)")
        }
    }

    /// Removes the symlink and prompts for authorization if the user lacks write permission.
    @discardableResult
    static func remove() -> Bool {
        let fm = FileManager.default
        guard fm.fileExists(atPath: symlinkPath) else { return true }

        do {
            try fm.removeItem(atPath: symlinkPath)
            return true
        } catch {
            return onMainIfRemote {
                let alert = NSAlert()
                alert.messageText = "Remove MacHead command-line tool"
                alert.informativeText = "Removing /usr/local/bin/machead requires administrator privileges."
                alert.addButton(withTitle: "Authorize removal")
                alert.addButton(withTitle: "Skip")

                guard alert.runModal() == .alertFirstButtonReturn else { return false }
                return runElevated("rm -f \(symlinkPath)")
            }
        }
    }

    // MARK: - Privileged Helpers

    /// Executes a shell command with administrator privileges (osascript).
    static func runElevated(_ command: String) -> Bool {
        let script = "do shell script \"\(command)\" with administrator privileges"
        if let appleScript = NSAppleScript(source: script) {
            var error: NSDictionary?
            appleScript.executeAndReturnError(&error)
            if let err = error {
                NSLog("MacHead: CLIToolInstaller elevated action failed: %@", err)
                return false
            }
            return true
        }
        return false
    }

    /// Ensures dialogs and modal interactions run on the main thread (dispatches synchronously when invoked from a background thread).
    private static func onMainIfRemote(_ work: () -> Bool) -> Bool {
        if Thread.isMainThread {
            return work()
        }
        var result = false
        DispatchQueue.main.sync {
            result = work()
        }
        return result
    }
}

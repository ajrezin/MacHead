import Foundation
import ServiceManagement

/// Launch-at-login management: macOS 13+ uses SMAppService, and macOS 12 falls back to a traditional LaunchAgents plist.
final class LaunchAtLoginHelper {
    static let shared = LaunchAtLoginHelper()

    private init() {}

    private static let legacyAgentLabel = "com.waffle.MacHead"

    private var legacyPlistURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/\(Self.legacyAgentLabel).plist")
    }

    var isEnabled: Bool {
        get {
            if #available(macOS 13.0, *) {
                migrateLegacyAgentIfNeeded()
                return SMAppService.mainApp.status == .enabled
            } else {
                return FileManager.default.fileExists(atPath: legacyPlistURL.path)
            }
        }
        set {
            if #available(macOS 13.0, *) {
                do {
                    if newValue {
                        if SMAppService.mainApp.status == .enabled {
                            return
                        }
                        try SMAppService.mainApp.register()
                        NSLog("MacHead: Launch at login enabled successfully")
                    } else {
                        if SMAppService.mainApp.status != .enabled {
                            return
                        }
                        try SMAppService.mainApp.unregister()
                        NSLog("MacHead: Launch at login disabled successfully")
                    }
                } catch {
                    NSLog("MacHead: Failed to update launch-at-login status: %@", error.localizedDescription)
                }
            } else {
                if newValue {
                    enableLegacyAgent()
                } else {
                    disableLegacyAgent()
                }
            }
        }
    }

    // MARK: - macOS 12 fallback plan

    /// Writes a LaunchAgents plist so launchd opens the app at login.
    /// Writes the plist only; it does not immediately load it via launchctl so the app is not relaunched if it is already running. The setting takes effect on the next login.
    private func enableLegacyAgent() {
        guard let executablePath = Bundle.main.executableURL?.path else {
            NSLog("MacHead: Failed to enable launch-at-login; could not resolve the app executable path")
            return
        }
        do {
            let agentsDir = legacyPlistURL.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: agentsDir, withIntermediateDirectories: true)
            let plist: [String: Any] = [
                "Label": Self.legacyAgentLabel,
                "ProgramArguments": [executablePath],
                "RunAtLoad": true,
                "LaunchOnlyOnce": true,
            ]
            let data = try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
            try data.write(to: legacyPlistURL)
            NSLog("MacHead: Launch-at-login enabled successfully (LaunchAgent)")
        } catch {
            NSLog("MacHead: Failed to write LaunchAgent plist: %@", error.localizedDescription)
        }
    }

    /// Remove the plist to disable login launch.
    /// Do not call launchctl bootout: the app may already be launched by this agent, and bootout would kill the running instance.
    /// LaunchOnlyOnce ensures launchd does not restart the task; any remaining idle task records disappear after logout.
    private func disableLegacyAgent() {
        do {
            try FileManager.default.removeItem(at: legacyPlistURL)
            NSLog("MacHead: Launch-at-login disabled successfully (LaunchAgent)")
        } catch {
            NSLog("MacHead: Failed to remove LaunchAgent plist: %@", error.localizedDescription)
        }
    }

    // MARK: - Legacy migration

    private static var didAttemptLegacyMigration = false

    /// When the user upgrades from macOS 12 to 13+, migrate the legacy LaunchAgent to SMAppService.
    @available(macOS 13.0, *)
    private func migrateLegacyAgentIfNeeded() {
        guard !Self.didAttemptLegacyMigration else { return }
        Self.didAttemptLegacyMigration = true
        guard FileManager.default.fileExists(atPath: legacyPlistURL.path) else { return }
        do {
            if SMAppService.mainApp.status != .enabled {
                try SMAppService.mainApp.register()
            }
            try FileManager.default.removeItem(at: legacyPlistURL)
            NSLog("MacHead: Launch-at-login migrated from LaunchAgent to SMAppService")
        } catch {
            NSLog("MacHead: Launch-at-login migration failed; retaining the original LaunchAgent: %@", error.localizedDescription)
        }
    }
}

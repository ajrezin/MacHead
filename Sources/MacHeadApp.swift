import SwiftUI

struct MacHeadApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
        .commands {
            CommandGroup(replacing: .appSettings) {
                Button("偏好设置...") {
                    appDelegate.openPreferences()
                }
                .keyboardShortcut(",", modifiers: .command)

                Button("检查更新...") {
                    UpdateManager.shared.checkForUpdates(silent: false)
                }
            }
        }
    }
}

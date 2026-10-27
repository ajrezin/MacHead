import SwiftUI

struct MacHeadApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
        .commands {
            CommandGroup(replacing: .appSettings) {
                Button("Preferences...") {
                    appDelegate.openPreferences()
                }
                .keyboardShortcut(",", modifiers: .command)

                Button("Check for Updates...") {
                    UpdateManager.shared.checkForUpdates(silent: false)
                }
            }
        }
    }
}

import Foundation
import CoreGraphics
import ApplicationServices

typealias CGSConfigureDisplayEnabledFunc = @convention(c) (
    OpaquePointer?, // CGDisplayConfigRef
    CGDirectDisplayID,
    Bool
) -> Int32

final class DisplayManager {
    static let shared = DisplayManager()

    private let setMode: CGSConfigureDisplayEnabledFunc?

    /// Cached built-in display ID in memory to avoid writing UserDefaults on every query
    private var cachedBuiltInID: CGDirectDisplayID?

    private init() {
        guard let handle = dlopen(
            "/System/Library/PrivateFrameworks/SkyLight.framework/SkyLight",
            RTLD_LAZY
        ) else {
            setMode = nil
            NSLog("MacHead: Failed to load the SkyLight framework")
            return
        }

        let sym = dlsym(handle, "CGSConfigureDisplayEnabled")
        setMode = sym.map { unsafeBitCast($0, to: CGSConfigureDisplayEnabledFunc.self) }
        if setMode == nil {
            NSLog("MacHead: CGSConfigureDisplayEnabled symbol not found in SkyLight")
        }
    }

    // MARK: - Display-domain query primitives

    /// Enumerate the current list of online displays in one pass (CGGetOnlineDisplayList count/fill pattern)
    func onlineDisplayIDs() -> [CGDirectDisplayID]? {
        var count: UInt32 = 0
        guard CGGetOnlineDisplayList(0, nil, &count) == .success else { return nil }
        var displays = [CGDirectDisplayID](repeating: 0, count: Int(count))
        guard CGGetOnlineDisplayList(count, &displays, &count) == .success else { return nil }
        return displays
    }

    /// Check whether a display is virtual/software-generated (e.g., unkn virt created when no physical display is present, or a remote tool creates a virtual display)
    static func isVirtualDisplay(_ displayID: CGDirectDisplayID) -> Bool {
        let vendor = CGDisplayVendorNumber(displayID)
        let model = CGDisplayModelNumber(displayID)
        // 0x756e6b6e = "unkn", 0x76697274 = "virt"
        return vendor == 0x756e6b6e || model == 0x76697274 || vendor == 0xF0F0 || model == 0xF0F0
    }

    /// Get the current or cached built-in display ID; returns nil if it is neither online nor cached
    var builtInDisplayID: CGDirectDisplayID? {
        if let id = onlineDisplayIDs()?.first(where: { CGDisplayIsBuiltin($0) != 0 }) {
            persistBuiltInID(id)
            return id
        }

        // Fallback to cached ID if display is already disabled and thus offline
        if let cached = cachedBuiltInID { return cached }
        let persisted = UserDefaults.standard.integer(forKey: "BuiltInDisplayID")
        if persisted != 0 {
            let id = CGDirectDisplayID(persisted)
            cachedBuiltInID = id
            return id
        }

        return nil
    }

    /// Check whether the built-in display is currently online (verify using the system online display list and refresh the cache while online)
    var isBuiltInOnline: Bool {
        guard let online = onlineDisplayIDs(),
              let id = online.first(where: { CGDisplayIsBuiltin($0) != 0 }) else { return false }
        persistBuiltInID(id)
        return true
    }

    private func persistBuiltInID(_ id: CGDirectDisplayID) {
        guard cachedBuiltInID != id else { return }
        cachedBuiltInID = id
        UserDefaults.standard.set(Int(id), forKey: "BuiltInDisplayID")
    }

    // MARK: - Built-in display power-off / restore

    /// Disconnect the built-in display (no-op when it is already offline)
    func disconnectBuiltIn(retriesRemaining: Int = 5) {
        guard HeadlessModeController.shared.isHeadlessModeEnabled else { return }

        guard let setMode = setMode else {
            NSLog("MacHead: CGSConfigureDisplayEnabled API is unavailable")
            return
        }

        guard let id = onlineDisplayIDs()?.first(where: { CGDisplayIsBuiltin($0) != 0 }) else {
            NSLog("MacHead: Built-in display is not online; no repeat disconnect needed")
            return
        }
        persistBuiltInID(id)

        NSLog("MacHead: Disconnecting built-in display ID: %d (retries remaining: %d)", id, retriesRemaining)
        var configRef: CGDisplayConfigRef? = nil
        let beginErr = CGBeginDisplayConfiguration(&configRef)
        if beginErr == .success {
            let configureErr = setMode(configRef, id, false)
            if configureErr == 0 {
                let completeErr = CGCompleteDisplayConfiguration(configRef, .permanently)
                NSLog("MacHead: Built-in display disconnect result - configured: %d, committed: %d", configureErr, completeErr.rawValue)
                if completeErr == .success { return }
                CGCancelDisplayConfiguration(configRef)
            } else {
                NSLog("MacHead: Built-in display disconnect configuration failed: %d", configureErr)
                CGCancelDisplayConfiguration(configRef)
            }
            NSLog("MacHead: Disabling display configuration was not committed; retrying in 0.2 seconds...")
        } else {
            NSLog("MacHead: CGBeginDisplayConfiguration failed: %d", beginErr.rawValue)
        }

        guard retriesRemaining > 0 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.disconnectBuiltIn(retriesRemaining: retriesRemaining - 1)
        }
    }

    /// Reconnect the built-in display
    func reconnectBuiltIn(retriesRemaining: Int = 5) {
        guard !HeadlessModeController.shared.isHeadlessModeEnabled else { return }

        // If the built-in display is already in the authoritative online list，no need to re-enable it
        if let online = onlineDisplayIDs(),
           let id = online.first(where: { CGDisplayIsBuiltin($0) != 0 }) {
            NSLog("MacHead: Built-in display ID: %d is already online", id)
            return
        }

        guard let setMode = setMode else {
            NSLog("MacHead: CGSConfigureDisplayEnabled API is unavailable")
            return
        }

        // When the built-in display is offline, use the cached ID；If no cache is available, fall back to Apple Silicon convention and use ID 1（only this restore path requires a guess)
        let id: CGDirectDisplayID
        if let cached = builtInDisplayID {
            id = cached
        } else {
            NSLog("MacHead: No cached built-in display ID was found; falling back to default ID 1 for recovery")
            id = CGDirectDisplayID(1)
        }

        NSLog("MacHead: Reconnecting built-in display ID: %d (retries remaining: %d)", id, retriesRemaining)
        var configRef: CGDisplayConfigRef? = nil
        let beginErr = CGBeginDisplayConfiguration(&configRef)
        if beginErr == .success {
            let configureErr = setMode(configRef, id, true)
            if configureErr == 0 {
                let completeErr = CGCompleteDisplayConfiguration(configRef, .permanently)
                NSLog("MacHead: Built-in display reconnect result - configured: %d, committed: %d", configureErr, completeErr.rawValue)
                if completeErr == .success { return }
                CGCancelDisplayConfiguration(configRef)
            } else {
                NSLog("MacHead: Built-in display reconnect configuration failed: %d", configureErr)
                CGCancelDisplayConfiguration(configRef)
            }
            NSLog("MacHead: Re-enabling display configuration was not committed; retrying in 0.2 seconds...")
        } else {
            NSLog("MacHead: CGBeginDisplayConfiguration failed: %d", beginErr.rawValue)
        }

        guard retriesRemaining > 0 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.reconnectBuiltIn(retriesRemaining: retriesRemaining - 1)
        }
    }
}

import Cocoa
import IOKit
import IOKit.pwr_mgt
import CoreGraphics

extension Notification.Name {
    static let headlessModeStateChanged = Notification.Name("com.waffle.MacHead.headlessModeStateChanged")
}

/// Global display reconfiguration callback for display changes, matching the C function-pointer calling convention
private func displayReconfigurationCallback(
    displayID: CGDirectDisplayID,
    flags: CGDisplayChangeSummaryFlags,
    userInfo: UnsafeMutableRawPointer?
) {
    guard let userInfo = userInfo else { return }
    let controller = Unmanaged<HeadlessModeController>.fromOpaque(userInfo).takeUnretainedValue()
    
    // Ignore the initial configuration phase (kCGDisplayBeginConfigurationFlag)
    // The CoreGraphics specification notes that BeginConfiguration only signals the start of a transaction; the hardware topology and driver state are in a transient pending state.
    // Do not call display configuration APIs during this phase; plug/unplug, recovery, and headless maintenance logic are handled after configuration completes (when not in beginConfigurationFlag).
    guard !flags.contains(.beginConfigurationFlag) else {
        return
    }
    
    guard controller.isDisplayMonitoringStarted else { return }

    let currentExternals = controller.currentExternalDisplays()
    let previousExternals = controller.activeExternalDisplays
    controller.activeExternalDisplays = currentExternals

    NSLog("MacHead: Display configuration change complete. Previously connected: %@, currently connected: %@, count: %d, Headless: %d",
          previousExternals.description, currentExternals.description, currentExternals.count, controller.isHeadlessModeEnabled ? 1 : 0)

    // All external displays have been disconnected (transitioning from having external displays to none): safely restore the built-in display as needed
    if currentExternals.isEmpty {
        if !previousExternals.isEmpty,
           controller.isHeadlessModeEnabled,
           UserDefaults.standard.bool(forKey: "AutoExitHeadlessOnDisconnect") {
            NSLog("MacHead: Detected all external displays disconnected; exiting headless mode immediately!")
            DispatchQueue.main.async {
                controller.triggerSafeRecovery()
            }
        }
        return
    }

    // Headless下内屏被系统意外点亮（插拔/唤醒)：延迟片刻让系统稳定后重新切断
    if controller.isHeadlessModeEnabled {
        if controller.isBuiltInOnline() {
            NSLog("MacHead: In headless mode, the built-in display is online; re-disconnecting it to maintain headless mode...")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                controller.maintainBuiltInDisconnect()
            }
        }
        return
    }

    // 非Headless：有新的外接显示器接入时，按需Automatic恢复 Headless
    let newDisplays = currentExternals.subtracting(previousExternals)
    guard !newDisplays.isEmpty,
          UserDefaults.standard.bool(forKey: "AutoRestoreHeadlessOnConnect") else { return }
    NSLog("MacHead: Detected a new external display connected: %@, automatically re-enabling headless mode...", newDisplays.description)
    DispatchQueue.main.async {
        controller.enableHeadlessMode()
    }
}

final class HeadlessModeController {
    static let shared = HeadlessModeController()
    
    private(set) var isHeadlessModeEnabled = false
    private var sleepAssertionID: IOPMAssertionID = 0
    private var activeAssertionType: String = ""
    private var isCallbackRegistered = false
    var isDisplayMonitoringStarted = false
    fileprivate(set) var activeExternalDisplays: Set<CGDirectDisplayID> = []
    
    // MARK: - Test Hooks
    /// Test mode: action functions only record was*Called flags without touching real displays, microphones, power assertions, or telemetry
    var isTestMode = false
    var wasEnableHeadlessModeCalled = false
    var wasDisableHeadlessModeCalled = false
    var wasTriggerSafeRecoveryCalled = false
    var wasMaintainDisconnectCalled = false
    var mockExternalDisplays: Set<CGDirectDisplayID>? = nil
    /// nil = 读取真实OnlineStatus；否则用该值替代（供测试模拟内屏被系统点亮)
    var mockBuiltInOnline: Bool? = nil
    
    private init() {}

    /// Whether the built-in display is online (can be overridden in test mode via mockBuiltInOnline)
    func isBuiltInOnline() -> Bool {
        mockBuiltInOnline ?? DisplayManager.shared.isBuiltInOnline
    }

    /// Maintain headless mode: when headless is active and external displays are still present, re-disable the built-in display if the system unexpectedly turns it on.
    /// Shared by the display callback (0.3s delay) and systemDidWake (0.5s delay); the 0.3/0.5 second delay
    /// is an intentional stability window, so this re-reads the live external display status instead of using the previous snapshot.
    func maintainBuiltInDisconnect() {
        guard isHeadlessModeEnabled, !currentExternalDisplays().isEmpty else { return }
        if isTestMode {
            wasMaintainDisconnectCalled = true
            return
        }
        DisplayManager.shared.disconnectBuiltIn()
    }

    func currentExternalDisplays() -> Set<CGDirectDisplayID> {
        if let mock = mockExternalDisplays {
            return mock
        }
        guard let online = DisplayManager.shared.onlineDisplayIDs() else { return [] }
        return Set(online.filter { CGDisplayIsBuiltin($0) == 0 && !DisplayManager.isVirtualDisplay($0) })
    }
    
    func enableHeadlessMode() {
        wasEnableHeadlessModeCalled = true
        guard !isHeadlessModeEnabled, !isTestMode else { return }
        isHeadlessModeEnabled = true
        activeExternalDisplays = currentExternalDisplays()
        UserDefaults.standard.set(true, forKey: "HeadlessModeEnabled")
        NSLog("MacHead: Enabling headless mode...")
        
        // 1. 切断内屏
        DisplayManager.shared.disconnectBuiltIn()
        
        // 1.5. Automatic静音内置麦克风
        MediaDeviceManager.shared.muteBuiltInMicrophone()
        
        // 2. 评估并获取电源断言Status
        evaluatePowerAssertion()
        
        // 4. 监听系统唤醒，确保唤醒后内屏仍被断开
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(systemDidWake),
            name: NSWorkspace.screensDidWakeNotification,
            object: nil
        )
        
        NotificationCenter.default.post(name: .headlessModeStateChanged, object: nil)
        TelemetryManager.shared.track(event: "app_event", extraInfo: ["action": "enable_headless"])
    }
    
    func disableHeadlessMode() {
        wasDisableHeadlessModeCalled = true
        guard isHeadlessModeEnabled, !isTestMode else { return }
        isHeadlessModeEnabled = false
        UserDefaults.standard.set(false, forKey: "HeadlessModeEnabled")
        NSLog("MacHead: Closing headless mode...")
        
        // 1. 重连内屏
        DisplayManager.shared.reconnectBuiltIn()
        
        // 1.5. 恢复内置麦克风的静音Status
        MediaDeviceManager.shared.unmuteBuiltInMicrophone()
        
        // 2. 释放所有电源断言
        updateSleepAssertion(enabled: false)
        
        // 4. 移除唤醒监听
        NSWorkspace.shared.notificationCenter.removeObserver(
            self,
            name: NSWorkspace.screensDidWakeNotification,
            object: nil
        )
        
        NotificationCenter.default.post(name: .headlessModeStateChanged, object: nil)
        TelemetryManager.shared.track(event: "app_event", extraInfo: ["action": "disable_headless"])
    }
    
    /// Trigger safe recovery by exiting headless mode immediately
    func triggerSafeRecovery() {
        wasTriggerSafeRecoveryCalled = true
        guard isHeadlessModeEnabled, !isTestMode else { return }
        NSLog("MacHead: External display disconnected; exiting headless mode immediately to restore the built-in display")
        disableHeadlessMode()
    }
    
    /// Dynamically manage idle and clamshell sleep assertions
    func updateSleepAssertion(enabled: Bool) {
        let keepRunningOnLidClose = UserDefaults.standard.bool(forKey: "KeepRunningOnLidClose")
        let targetType = keepRunningOnLidClose ? (kIOPMAssertionTypePreventSystemSleep as String) : (kIOPMAssertionTypePreventUserIdleSystemSleep as String)
        
        if enabled {
            guard isHeadlessModeEnabled else { return }
            
            // 如果已有断言且类型不符，先释放
            if sleepAssertionID != 0 && activeAssertionType != targetType {
                IOPMAssertionRelease(sleepAssertionID)
                NSLog("MacHead: 释放旧类型电源断言，ID: %d", sleepAssertionID)
                sleepAssertionID = 0
                activeAssertionType = ""
            }
            
            if sleepAssertionID == 0 {
                let reason = "MacHead: Headless mode active" as CFString
                let result = IOPMAssertionCreateWithName(
                    targetType as CFString,
                    IOPMAssertionLevel(kIOPMAssertionLevelOn),
                    reason,
                    &sleepAssertionID
                )
                if result != kIOReturnSuccess {
                    NSLog("MacHead: 无法创建电源断言 (%@) %d", targetType, result)
                } else {
                    NSLog("MacHead: 成功创建电源断言 (%@)，ID: %d", targetType, sleepAssertionID)
                    activeAssertionType = targetType
                }
            }
        } else {
            if sleepAssertionID != 0 {
                IOPMAssertionRelease(sleepAssertionID)
                NSLog("MacHead: 释放电源断言，ID: %d", sleepAssertionID)
                sleepAssertionID = 0
                activeAssertionType = ""
            }
        }
    }
    
    
    /// 重新评估电源断言Status
    func evaluatePowerAssertion() {
        guard isHeadlessModeEnabled else { return }
        
        let preventIdleSleep = UserDefaults.standard.bool(forKey: "PreventIdleSleep")
        let isBatteryLow = BatteryManager.shared.isBatteryProtectionActive
        
        // 只有在允许防止睡眠且Battery不处于低电量保护Status时，才持有断言
        let shouldHoldAssertion = preventIdleSleep && !isBatteryLow
        updateSleepAssertion(enabled: shouldHoldAssertion)
    }
    
    // MARK: - 显示器变化守护
    
    func registerDisplayCallback() {
        guard !isCallbackRegistered else { return }
        let userInfo = Unmanaged.passUnretained(self).toOpaque()
        let result = CGDisplayRegisterReconfigurationCallback(displayReconfigurationCallback, userInfo)
        if result == .success {
            isCallbackRegistered = true
            NSLog("MacHead: 成功注册显示器变化回调")
            // 延时 1 秒启动显示器插拔监测，避开 App 启动时的初始Status回调
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.activeExternalDisplays = self.currentExternalDisplays()
                self.isDisplayMonitoringStarted = true
                NSLog("MacHead: 显示器插拔监测已正式启动，当前外接显示器: %@", self.activeExternalDisplays.description)
            }
        } else {
            NSLog("MacHead: 注册显示器变化回调失败: %d", result.rawValue)
        }
    }
    
    
    @objc private func systemDidWake() {
        // 唤醒后系统可能重新枚举显示器，再次确保内屏断开
        guard isHeadlessModeEnabled else { return }
        NSLog("MacHead: 系统唤醒，检查并确保内置显示器断开...")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.maintainBuiltInDisconnect()
        }
    }
    
    static func runTests() {
        print("Running HeadlessModeController Unit Tests...")
        let controller = HeadlessModeController.shared
        
        // 测试模式：动作只记录标志位，绝不触碰真实显示器/麦克风/遥测
        controller.isTestMode = true

        // Save current real state
        let originalIsHeadless = controller.isHeadlessModeEnabled
        let originalIsMonitoring = controller.isDisplayMonitoringStarted
        let originalActiveExternals = controller.activeExternalDisplays

        defer {
            // Restore original state
            controller.isHeadlessModeEnabled = originalIsHeadless
            controller.isDisplayMonitoringStarted = originalIsMonitoring
            controller.activeExternalDisplays = originalActiveExternals
            controller.mockExternalDisplays = nil
            controller.mockBuiltInOnline = nil
            controller.isTestMode = false
        }

        // Helper to reset hooks
        func resetHooks() {
            controller.wasEnableHeadlessModeCalled = false
            controller.wasDisableHeadlessModeCalled = false
            controller.wasTriggerSafeRecoveryCalled = false
            controller.wasMaintainDisconnectCalled = false
        }

        // 回调里的动作经 DispatchQueue.main.async 派发，而 CLI 进程没有常驻 runloop，
        // 必须排水主队列，被派发的动作才会真正执行、标志位才会被记录。
        // 注意：用 precondition 而非 assert —— assert 在 -O 下会被整体编译移除，测试将永远"假绿"。
        func drainMainQueue(seconds: Double = 0.05) {
            RunLoop.current.run(until: Date(timeIntervalSinceNow: seconds))
        }

        // 模拟一次"显示器配置变更完成"事件：重置钩子、设置 mock Status并触发回调
        func fireChange(headless: Bool,
                        previous: Set<CGDirectDisplayID>,
                        current: Set<CGDirectDisplayID>,
                        builtInOnline: Bool = false,
                        displayID: CGDirectDisplayID = 101,
                        flags: CGDisplayChangeSummaryFlags = []) {
            resetHooks()
            controller.isHeadlessModeEnabled = headless
            controller.activeExternalDisplays = previous
            controller.mockExternalDisplays = current
            controller.mockBuiltInOnline = builtInOnline
            displayReconfigurationCallback(displayID: displayID, flags: flags,
                                           userInfo: Unmanaged.passUnretained(controller).toOpaque())
        }

        controller.isDisplayMonitoringStarted = true

        // Test 1: Manually turning off headless mode when an external display is connected.
        // We want to make sure AutoRestoreHeadlessOnConnect does NOT trigger.
        print("Test 1: Manually turning off headless mode when an external display is connected...")
        fireChange(headless: false, previous: [101], current: [101]) // external display remains connected
        drainMainQueue()

        precondition(!controller.wasEnableHeadlessModeCalled, "FAIL: Auto-restore was incorrectly triggered when manually disabling headless mode!")
        precondition(!controller.wasMaintainDisconnectCalled, "FAIL: Maintain-disconnect was incorrectly triggered when headless mode is off!")
        print("Test 1: PASS")

        // Test 2: Unplugging the last external display when headless mode is active.
        // We expect triggerSafeRecovery to be called.
        print("Test 2: Unplugging the last external display when headless mode is active...")
        // Make sure user defaults has AutoExitHeadlessOnDisconnect set to true for test consistency
        let originalAutoExit = UserDefaults.standard.bool(forKey: "AutoExitHeadlessOnDisconnect")
        UserDefaults.standard.set(true, forKey: "AutoExitHeadlessOnDisconnect")
        defer {
            UserDefaults.standard.set(originalAutoExit, forKey: "AutoExitHeadlessOnDisconnect")
        }

        fireChange(headless: true, previous: [101], current: []) // unplugged
        drainMainQueue()

        precondition(controller.wasTriggerSafeRecoveryCalled, "FAIL: Safe recovery was not triggered when all external displays were disconnected!")
        print("Test 2: PASS")

        // Test 3: Plugging in a new external display when headless mode is inactive.
        // We expect enableHeadlessMode to be called.
        print("Test 3: Plugging in a new external display when headless mode is inactive...")
        let originalAutoRestore = UserDefaults.standard.bool(forKey: "AutoRestoreHeadlessOnConnect")
        UserDefaults.standard.set(true, forKey: "AutoRestoreHeadlessOnConnect")
        defer {
            UserDefaults.standard.set(originalAutoRestore, forKey: "AutoRestoreHeadlessOnConnect")
        }

        fireChange(headless: false, previous: [], current: [101]) // plugged in
        drainMainQueue()

        precondition(controller.wasEnableHeadlessModeCalled, "FAIL: Headless mode was not auto-restored when new display connected!")
        print("Test 3: PASS")

        // Test 4: Plugging in a second external display when headless mode is active.
        // We expect no action.
        print("Test 4: Plugging in a second external display when headless mode is active...")
        fireChange(headless: true, previous: [101], current: [101, 102], builtInOnline: false) // 内屏本应Offline
        drainMainQueue()

        precondition(!controller.wasEnableHeadlessModeCalled, "FAIL: Incorrect action when adding second external display in headless mode!")
        precondition(!controller.wasDisableHeadlessModeCalled, "FAIL: Headless mode disabled when adding second external display!")
        precondition(!controller.wasMaintainDisconnectCalled, "FAIL: Maintain-disconnect triggered when adding second external display!")
        print("Test 4: PASS")

        // Test 5: Built-in display begins configuration when no external displays are connected.
        // Protect built-in display from being mistakenly disconnected.
        print("Test 5: Built-in display begins configuration when no external displays are connected...")
        fireChange(headless: true, previous: [], current: [], displayID: 1, flags: [.beginConfigurationFlag])
        drainMainQueue()

        precondition(controller.isHeadlessModeEnabled, "FAIL: Headless mode should not be corrupted by beginConfigurationFlag!")
        precondition(!controller.wasMaintainDisconnectCalled, "FAIL: Maintain-disconnect triggered during beginConfigurationFlag!")
        print("Test 5: PASS")

        // Test 6: Headless mode is active, the system unexpectedly re-lit the built-in display,
        // and external displays are still connected. Expect the built-in to be re-disconnected.
        print("Test 6: Headless mode with built-in unexpectedly re-lit and externals present...")
        fireChange(headless: true, previous: [101], current: [101], builtInOnline: true) // 模拟系统把内屏点亮

        // 维持断开带有 0.3 秒延迟，需要更长的排水窗口
        drainMainQueue(seconds: 0.4)

        precondition(controller.wasMaintainDisconnectCalled, "FAIL: Built-in display was not re-disconnected while headless mode is active with externals present!")
        precondition(controller.isHeadlessModeEnabled, "FAIL: Maintain-disconnect should not turn off headless mode!")
        print("Test 6: PASS")

        // Test 7: Built-in display finishes disconnecting when no external display was previously connected
        // (e.g. pure headless server or before external monitor finishes waking at boot).
        // Must NOT falsely trigger safe recovery as if an external display had been unplugged.
        print("Test 7: Built-in display finishes disconnecting when no external display was previously connected...")
        fireChange(headless: true, previous: [], current: [], builtInOnline: false, displayID: 1)
        drainMainQueue()

        precondition(!controller.wasTriggerSafeRecoveryCalled, "FAIL: Safe recovery was falsely triggered when previousExternals was already empty!")
        precondition(controller.isHeadlessModeEnabled, "FAIL: Headless mode should remain active when no external display was unplugged!")
        print("Test 7: PASS")

        print("All Tests Passed Successfully! 🎉")
    }
}

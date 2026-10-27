import Foundation
import Cocoa

/// MacHead core metrics and telemetry manager singleton
final class TelemetryManager {
    static let shared = TelemetryManager()
    
    // Cloudflare Edge Telemetry Endpoint
    private let telemetryEndpoint = URL(string: "https://headlessmac.com/api/telemetry")!
    
    private init() {}
    
    /// Get or generate a local anonymous device UUID（无敏感设备 HWID，保护隐私)
    var anonymousID: String {
        let key = "MacHead_Anonymous_Device_ID"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: key)
        return newID
    }
    
    /// Get system uptime（Uptime，单位：秒)
    var systemUptimeSeconds: Int {
        var bootTime = timeval()
        var size = MemoryLayout<timeval>.size
        let result = sysctlbyname("kern.boottime", &bootTime, &size, nil, 0)
        if result == 0 {
            let now = time(nil)
            return max(0, now - bootTime.tv_sec)
        }
        return 0
    }
    
    /// Build a complete snapshot payload
    func buildPayload(event: String, extraInfo: [String: Any] = [:]) -> [String: Any] {
        let isAccessibilityGranted = AXIsProcessTrusted()
        
        #if arch(arm64)
        let archStr = "arm64"
        #else
        let archStr = "x86_64"
        #endif
        
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        let osVersion = ProcessInfo.processInfo.operatingSystemVersionString
        
        var payload: [String: Any] = [
            "event": event,
            "anonymous_id": anonymousID,
            "app_version": appVersion,
            "build_number": buildNumber,
            "os_version": osVersion,
            "arch": archStr,
            "uptime_seconds": systemUptimeSeconds,
            "is_headless": HeadlessModeController.shared.isHeadlessModeEnabled,
            "is_launch_at_login": LaunchAtLoginHelper.shared.isEnabled,
            "is_web_dashboard_enabled": UserDefaults.standard.bool(forKey: "EnableWebServer"),
            "auth_accessibility": isAccessibilityGranted,
            "timestamp": Int(Date().timeIntervalSince1970)
        ]
        
        for (key, value) in extraInfo {
            payload[key] = value
        }
        
        return payload
    }
    
    /// Send telemetry events asynchronously（用户可在偏好设置中Close匿名使用统计)
    func track(event: String, extraInfo: [String: Any] = [:]) {
        // Existing users who have not registered this key keep the default enabled state；After an explicit disable, no further events are sent
        if UserDefaults.standard.object(forKey: "telemetryEnabled") == nil {
            UserDefaults.standard.register(defaults: ["telemetryEnabled": true])
        }
        guard UserDefaults.standard.bool(forKey: "telemetryEnabled") else { return }

        let payload = buildPayload(event: event, extraInfo: extraInfo)
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload) else {
            return
        }
        
        var request = URLRequest(url: telemetryEndpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10.0
        request.httpBody = jsonData
        
        let task = URLSession.shared.dataTask(with: request) { _, _, error in
            if let error = error {
                NSLog("TelemetryManager: Track failed for event '\(event)': \(error.localizedDescription)")
            }
        }
        task.resume()
    }
}

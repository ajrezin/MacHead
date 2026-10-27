import Foundation
import Combine

public final class IntegrationManager: ObservableObject {
    public static let shared = IntegrationManager()
    
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        setupSMCWatcher()
    }
    
    public func startAllServices() {
        print("IntegrationManager: Starting all active integrations...")
        NezhaAgentService.shared.start()
        ServerStatusService.shared.start()
        UptimeKumaService.shared.start()
        FrpService.shared.start()
        CloudflareService.shared.start()
        DevTunnelService.shared.start()
        TailcatService.shared.start()
    }

    public func stopAllServices() {
        print("IntegrationManager: Stopping all integrations...")
        NezhaAgentService.shared.stop()
        ServerStatusService.shared.stop()
        UptimeKumaService.shared.stop()
        FrpService.shared.stop()
        CloudflareService.shared.stop()
        DevTunnelService.shared.stop()
        TailcatService.shared.stop()
    }

    public func reloadServices() {
        print("IntegrationManager: Config changed, reloading integrations...")
        DispatchQueue.global(qos: .userInitiated).async {
            self.stopAllServices()
            Thread.sleep(forTimeInterval: 0.2)
            self.startAllServices()
        }
    }
    
    private func setupSMCWatcher() {
        // Observe SMCManager temperature updates
        SMCManager.shared.$currentTemperature
            .receive(on: RunLoop.main)
            .sink { [weak self] temp in
                self?.evaluateTemperature(temp)
            }
            .store(in: &cancellables)
    }
    
    private func evaluateTemperature(_ temp: Double) {
        guard temp > 15.0 else { return } // Ignore invalid startup reads
        
        let defaults = UserDefaults.standard
        guard defaults.bool(forKey: "notificationsEnabled") && defaults.bool(forKey: "overheatAlertEnabled") else { return }
        
        let threshold = defaults.double(forKey: "overheatThreshold")
        let limit = threshold > 0 ? threshold : 85.0 // Default to 85°C
        
        if temp >= limit {
            NotificationService.shared.sendAlert(
                type: .overheat,
                title: "Chip core temperature too high ⚠️",
                body: "The current Mac processor temperature has reached \(Int(temp))°C，above the configured safe threshold（\(Int(limit))°C)。Please check the clamshell placement and cooling conditions.。"
            )
        }
    }
}

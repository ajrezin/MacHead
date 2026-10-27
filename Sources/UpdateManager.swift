import Cocoa

/// Update metadata model describing the latest version information from the cloud
struct UpdateMetadata: Codable {
    let version: String
    let build: Int
    let pubDate: String
    let url: String
    let releaseNotes: String
}

final class UpdateManager: NSObject, URLSessionDownloadDelegate {
    static let shared = UpdateManager()
    
    // Cloudflare R2 或是自定义子域名的 appcast.json 地址
    private let appcastURL = URL(string: "https://headlessmac.com/appcast.json")!
    
    private var isChecking = false
    private var activeMetadata: UpdateMetadata?
    private var downloadTask: URLSessionDownloadTask?
    
    private var progressAlert: NSAlert?
    private var progressIndicator: NSProgressIndicator?
    
    private override init() {
        super.init()
    }
    
    /// Get the current app version
    var currentVersion: String {
        return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }
    
    /// Get the current app build number
    var currentBuild: Int {
        if let buildStr = Bundle.main.infoDictionary?["CFBundleVersion"] as? String,
           let buildInt = Int(buildStr) {
            return buildInt
        }
        return 1
    }
    
    /// Check for updates
    func checkForUpdates(silent: Bool) {
        guard !isChecking else { return }
        isChecking = true
        
        // Append a timestamp as a cache-busting query parameter to bypass local URLSession cache and Cloudflare CDN edge cache
        var components = URLComponents(url: appcastURL, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "t", value: "\(Int(Date().timeIntervalSince1970))")]
        guard let finalURL = components?.url else {
            isChecking = false
            return
        }
        
        let task = URLSession.shared.dataTask(with: finalURL) { [weak self] data, response, error in
            guard let self = self else { return }
            self.isChecking = false
            
            if let error = error {
                print("OTA Check: Failed to fetch metadata: \(error)")
                if !silent {
                    self.showErrorAlert(message: "Unable to connect to the update server. Please try again later.\nReason: \(error.localizedDescription)")
                }
                return
            }
            
            guard let data = data else {
                if !silent {
                    self.showErrorAlert(message: "The server returned empty data.")
                }
                return
            }
            
            do {
                let decoder = JSONDecoder()
                let metadata = try decoder.decode(UpdateMetadata.self, from: data)
                
                let hasNewVersion = self.isNewer(
                    version: metadata.version,
                    build: metadata.build,
                    currentVersion: self.currentVersion,
                    currentBuild: self.currentBuild
                )
                
                if hasNewVersion {
                    self.showUpdateAlert(metadata: metadata)
                } else if !silent {
                    self.showUpToDateAlert()
                }
                
            } catch {
                print("OTA Check: Parsing error: \(error)")
                if !silent {
                    self.showErrorAlert(message: "Failed to parse update data.")
                }
            }
        }
        task.resume()
    }
    
    private func isNewer(version cloudVersion: String, build cloudBuild: Int, currentVersion: String, currentBuild: Int) -> Bool {
        let versionResult = cloudVersion.compare(currentVersion, options: .numeric)
        if versionResult == .orderedDescending {
            return true
        } else if versionResult == .orderedSame {
            return cloudBuild > currentBuild
        }
        return false
    }
    
    /// Alert shown when a new version is discovered
    private func showUpdateAlert(metadata: UpdateMetadata) {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "A new MacHead version is available: v\(metadata.version)"
            alert.informativeText = "Release date: \(metadata.pubDate)\n\nRelease notes:\n\(metadata.releaseNotes)"
            alert.alertStyle = .informational
            alert.addButton(withTitle: "Update now")
            alert.addButton(withTitle: "Remind me later")
            
            NSApp.activate(ignoringOtherApps: true)
            let response = alert.runModal()
            if response == .alertFirstButtonReturn {
                self.startDownload(metadata: metadata)
            }
        }
    }
    
    /// Start an in-app download
    private func startDownload(metadata: UpdateMetadata) {
        guard let url = URL(string: metadata.url) else { return }
        self.activeMetadata = metadata
        
        let config = URLSessionConfiguration.default
        let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        self.downloadTask = session.downloadTask(with: url)
        self.downloadTask?.resume()
        
        // 显示Download进度条弹窗
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "Downloading MacHead v\(metadata.version)..."
            alert.informativeText = "Downloading the latest secure DMG installer from the server. Please wait."
            alert.alertStyle = .informational
            alert.addButton(withTitle: "Cancel")
            
            let indicator = NSProgressIndicator(frame: NSRect(x: 0, y: 0, width: 300, height: 16))
            indicator.isIndeterminate = false
            indicator.minValue = 0
            indicator.maxValue = 100
            indicator.doubleValue = 0
            alert.accessoryView = indicator
            
            self.progressAlert = alert
            self.progressIndicator = indicator
            
            // 使用 beginSheetModal 挂载抽屉弹窗（非阻塞主线程，保证Download进度实时渲染)
            if let window = NSApp.keyWindow {
                alert.beginSheetModal(for: window) { response in
                    if response == .alertFirstButtonReturn {
                        print("OTA Download: User canceled the download.")
                        self.downloadTask?.cancel()
                    }
                }
            } else {
                // 兜底降级使用模态弹窗
                let response = alert.runModal()
                if response == .alertFirstButtonReturn {
                    print("OTA Download: User canceled the download.")
                    self.downloadTask?.cancel()
                }
            }
        }
    }
    
    // MARK: - URLSessionDownloadDelegate
    
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        guard totalBytesExpectedToWrite > 0 else { return }
        let percent = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite) * 100.0
        
        DispatchQueue.main.async {
            self.progressIndicator?.doubleValue = percent
            self.progressAlert?.informativeText = String(format: "Downloaded: %.1f%%", percent)
        }
    }
    
    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        // Close the progress dialog
        DispatchQueue.main.async {
            if let alert = self.progressAlert {
                if let parent = alert.window.sheetParent {
                    parent.endSheet(alert.window)
                } else {
                    NSApp.stopModal(withCode: .alertSecondButtonReturn)
                    alert.window.close()
                }
            }
        }
        
        // Copy the downloaded temporary file into a secure temporary storage location
        let tempDir = NSTemporaryDirectory()
        let destinationURL = URL(fileURLWithPath: tempDir).appendingPathComponent("MacHeadUpdate.dmg")
        
        let fileManager = FileManager.default
        try? fileManager.removeItem(at: destinationURL)
        
        do {
            try fileManager.moveItem(at: location, to: destinationURL)
            // 开始执行挂载覆盖安装
            self.installUpdate(localURL: destinationURL)
        } catch {
            self.handleInstallationFailure(reason: "保存更新包失败：\(error.localizedDescription)")
        }
    }
    
    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        DispatchQueue.main.async {
            // 如果Download出错并且不是用户手动Cancel
            if let error = error {
                let nsError = error as NSError
                if nsError.domain != NSURLErrorDomain || nsError.code != NSURLErrorCancelled {
                    if let alert = self.progressAlert {
                        if let parent = alert.window.sheetParent {
                            parent.endSheet(alert.window)
                        } else {
                            NSApp.stopModal(withCode: .alertSecondButtonReturn)
                            alert.window.close()
                        }
                    }
                    self.handleInstallationFailure(reason: "网络Download失败：\(error.localizedDescription)")
                }
            }
        }
    }
    
    // MARK: - Mounting & Coping installation
    
    private func installUpdate(localURL: URL) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            let mountPoint = "/tmp/MacHeadMount"
            let fileManager = FileManager.default
            
            // 确保挂载目录存在
            if !fileManager.fileExists(atPath: mountPoint) {
                try? fileManager.createDirectory(atPath: mountPoint, withIntermediateDirectories: true, attributes: nil)
            }
            
            print("OTA Install: Mounting DMG...")
            let (mountStatus, mountOutput) = self.runShellCommand("/usr/bin/hdiutil", arguments: [
                "mount", "-nobrowse", "-mountpoint", mountPoint, localURL.path
            ])
            
            guard mountStatus == 0 else {
                self.handleInstallationFailure(reason: "挂载 DMG 失败 (code: \(mountStatus)): \(mountOutput)")
                return
            }
            
            let mountedAppPath = "\(mountPoint)/MacHead.app"
            guard fileManager.fileExists(atPath: mountedAppPath) else {
                self.cleanupMount(mountPoint: mountPoint)
                self.handleInstallationFailure(reason: "DMG 中未找到 MacHead.app Applications包。")
                return
            }
            
            let targetAppPath = "/Applications/MacHead.app"
            print("OTA Install: Replacing app bundle...")
            
            do {
                if fileManager.fileExists(atPath: targetAppPath) {
                    try fileManager.removeItem(atPath: targetAppPath)
                }
                try fileManager.copyItem(atPath: mountedAppPath, toPath: targetAppPath)
                
                // 递归清除新 App 的隔离属性，防止重启时触发系统 Gatekeeper “无法验证开发者” 的弹窗
                print("OTA Install: Stripping quarantine attribute recursively...")
                self.runShellCommand("/usr/bin/xattr", arguments: ["-cr", targetAppPath])
            } catch {
                self.cleanupMount(mountPoint: mountPoint)
                self.handleInstallationFailure(reason: "Files覆盖失败：\(error.localizedDescription)")
                return
            }
            
            // 卸载临时磁盘并删除 DMG
            self.cleanupMount(mountPoint: mountPoint)
            try? fileManager.removeItem(at: localURL)
            
            print("OTA Install: Finished successfully!")
            self.promptForRestart()
        }
    }
    
    private func cleanupMount(mountPoint: String) {
        self.runShellCommand("/usr/bin/hdiutil", arguments: ["detach", "-force", mountPoint])
        try? FileManager.default.removeItem(atPath: mountPoint)
    }
    
    /// 执行系统底层命令的管道工具
    @discardableResult
    private func runShellCommand(_ command: String, arguments: [String]) -> (Int32, String) {
        let process = Process()
        process.launchPath = command
        process.arguments = arguments
        
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        
        process.launch()
        process.waitUntilExit()
        
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8) ?? ""
        return (process.terminationStatus, output)
    }
    
    private func handleInstallationFailure(reason: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            let alert = NSAlert()
            alert.messageText = "更新安装失败"
            alert.informativeText = "\(reason)\n\n系统将Automatic为您打开浏览器Download，请手动Download DMG 拖拽覆盖安装。"
            alert.alertStyle = .warning
            alert.addButton(withTitle: "确定")
            
            NSApp.activate(ignoringOtherApps: true)
            alert.runModal()
            
            // 降级兜底方案：浏览器打开Download
            if let metadata = self.activeMetadata, let url = URL(string: metadata.url) {
                NSWorkspace.shared.open(url)
            }
        }
    }
    
    private func promptForRestart() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "更新成功！"
            alert.informativeText = "最新版 MacHead 已成功部署。是否立即重启应用？"
            alert.alertStyle = .informational
            alert.addButton(withTitle: "立即重启")
            alert.addButton(withTitle: "稍后")
            
            NSApp.activate(ignoringOtherApps: true)
            let response = alert.runModal()
            if response == .alertFirstButtonReturn {
                let appPath = "/Applications/MacHead.app"
                let pid = ProcessInfo.processInfo.processIdentifier
                
                // 启动后台守护 shell 进程，等待旧进程完全Quit后再 open 启动新版本，防止 macOS 激活冲突
                let process = Process()
                process.launchPath = "/bin/sh"
                process.arguments = ["-c", "while kill -0 \(pid) 2>/dev/null; do sleep 0.1; done; open \"\(appPath)\""]
                
                print("OTA Restart: Launching background relaunch helper for pid \(pid)...")
                process.launch()
                
                NSApp.terminate(nil)
            }
        }
    }
    
    /// 当前已是最新版本时的弹窗
    private func showUpToDateAlert() {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "MacHead 已是最新版本"
            alert.informativeText = "您当前运行的版本是 v\(self.currentVersion)，无需更新。"
            alert.alertStyle = .informational
            alert.addButton(withTitle: "好")
            
            NSApp.activate(ignoringOtherApps: true)
            alert.runModal()
        }
    }
    
    /// 错误Status提示
    private func showErrorAlert(message: String) {
        DispatchQueue.main.async {
            let alert = NSAlert()
            alert.messageText = "检查更新失败"
            alert.informativeText = message
            alert.alertStyle = .warning
            alert.addButton(withTitle: "确定")
            
            NSApp.activate(ignoringOtherApps: true)
            alert.runModal()
        }
    }
}

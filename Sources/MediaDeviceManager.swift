import Foundation
import AudioToolbox
import CoreAudio

final class MediaDeviceManager {
    static let shared = MediaDeviceManager()
    
    private var originalMuteState: Bool?
    
    private init() {}
    
    /// Get the default input device ID
    private var defaultInputDeviceID: AudioDeviceID? {
        var deviceID = AudioDeviceID(0)
        var propertySize = UInt32(MemoryLayout<AudioDeviceID>.size)
        
        var propertyAddress = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        
        let status = AudioObjectGetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &propertyAddress,
            0,
            nil,
            &propertySize,
            &deviceID
        )
        
        guard status == noErr else {
            NSLog("MacHead: 获取默认输入设备失败: %d", status)
            return nil
        }
        return deviceID
    }
    
    /// 获取或设置麦克风的静音Status
    var isMuted: Bool {
        get {
            guard let deviceID = defaultInputDeviceID else { return false }
            
            var isMuted: UInt32 = 0
            var propertySize = UInt32(MemoryLayout<UInt32>.size)
            var propertyAddress = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyMute,
                mScope: kAudioObjectPropertyScopeInput,
                mElement: kAudioObjectPropertyElementMain
            )
            
            let status = AudioObjectGetPropertyData(deviceID, &propertyAddress, 0, nil, &propertySize, &isMuted)
            guard status == noErr else { return false }
            return isMuted != 0
        }
        set {
            guard let deviceID = defaultInputDeviceID else { return }
            
            var muteVal: UInt32 = newValue ? 1 : 0
            var propertyAddress = AudioObjectPropertyAddress(
                mSelector: kAudioDevicePropertyMute,
                mScope: kAudioObjectPropertyScopeInput,
                mElement: kAudioObjectPropertyElementMain
            )
            
            var isWritable: DarwinBoolean = false
            let checkStatus = AudioObjectIsPropertySettable(deviceID, &propertyAddress, &isWritable)
            guard checkStatus == noErr, isWritable.boolValue else {
                NSLog("MacHead: 默认输入设备的静音属性不可写")
                return
            }
            
            let status = AudioObjectSetPropertyData(
                deviceID,
                &propertyAddress,
                0,
                nil,
                UInt32(MemoryLayout<UInt32>.size),
                &muteVal
            )
            
            if status == noErr {
                NSLog("MacHead: 成功设置麦克风静音Status为: \(newValue)")
            } else {
                NSLog("MacHead: 设置麦克风静音Status失败: \(status)")
            }
        }
    }
    
    /// Headless启动时调用：静音麦克风，并缓存原始Status
    func muteBuiltInMicrophone() {
        let shouldMute = UserDefaults.standard.bool(forKey: "MuteMicrophoneInHeadlessMode")
        guard shouldMute else { return }
        
        let currentMute = isMuted
        originalMuteState = currentMute
        
        if !currentMute {
            isMuted = true
            NSLog("MacHead: Automatic静音内置麦克风，并保存其先前的未静音Status")
        } else {
            NSLog("MacHead: 内置麦克风已经处于静音Status，无需重复静音")
        }
    }
    
    /// HeadlessQuit时调用：恢复麦克风的原始Status
    func unmuteBuiltInMicrophone() {
        if let original = originalMuteState {
            isMuted = original
            NSLog("MacHead: 已从缓存恢复麦克风的原始静音Status: \(original)")
            originalMuteState = nil
        } else {
            // Fallback: if no cache, unmute it
            isMuted = false
            NSLog("MacHead: 无静音Status缓存，默认将麦克风恢复为解除静音Status")
        }
    }
    
    /// 强制解除静音并清除缓存Status
    func forceUnmute() {
        originalMuteState = nil
        isMuted = false
        NSLog("MacHead: 强制解除麦克风静音，并清除缓存Status")
    }
}

// Copyright 2026 The MacHead Authors
// SPDX-License-Identifier: BSD-3-Clause

//go:build darwin || linux

package main

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
	"unicode/utf8"

	"github.com/pion/webrtc/v4"
)

type rpcRequest struct {
	ID       string          `json:"id"`
	Addr     string          `json:"addr,omitempty"`
	AddrHash string          `json:"addrHash,omitempty"`
	PassHash string          `json:"passHash,omitempty"`
	Method   string          `json:"method"`
	Params   json.RawMessage `json:"params,omitempty"`
}

type rpcResponse struct {
	ID     string `json:"id,omitempty"`
	OK     bool   `json:"ok"`
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

type fsEntry struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	IsDir     bool   `json:"isDir"`
	IsSymlink bool   `json:"isSymlink"`
	Size      int64  `json:"size"`
	Mode      string `json:"mode"`
	ModTime   int64  `json:"modTime"`
	Ext       string `json:"ext"`
}

type quickPathEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Icon string `json:"icon"`
}

type procEntry struct {
	PID     int     `json:"pid"`
	User    string  `json:"user"`
	CPU     float64 `json:"cpu"`
	Mem     float64 `json:"mem"`
	RSSMB   float64 `json:"rssMB"`
	Name    string  `json:"name"`
	Command string  `json:"command"`
}

type listenPortEntry struct {
	PID     int    `json:"pid"`
	Process string `json:"process"`
	Port    int    `json:"port"`
	Address string `json:"address"`
}

func resolveUserHome() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	if u, err := user.Current(); err == nil && u != nil && u.HomeDir != "" {
		return u.HomeDir
	}
	return "/"
}

func resolveSafePath(rawPath string) (string, error) {
	home := resolveUserHome()
	p := strings.TrimSpace(rawPath)
	if p == "" || p == "~" {
		return home, nil
	}
	if strings.HasPrefix(p, "~/") {
		p = filepath.Join(home, p[2:])
	}
	if !filepath.IsAbs(p) {
		p = filepath.Join(home, p)
	}
	return filepath.Clean(p), nil
}

func isLikelyText(data []byte) bool {
	if len(data) == 0 {
		return true
	}
	sample := data
	if len(sample) > 8192 {
		sample = sample[:8192]
	}
	// Check UTF-16 BOM
	if len(sample) >= 2 && ((sample[0] == 0xFF && sample[1] == 0xFE) || (sample[0] == 0xFE && sample[1] == 0xFF)) {
		return true
	}
	if bytes.IndexByte(sample, 0) != -1 {
		return false
	}
	if utf8.Valid(sample) {
		return true
	}
	// Support GBK / GB18030 / Big5 / Latin-1 text files: no NUL bytes and very few non-whitespace control chars
	badCtrl := 0
	for _, b := range sample {
		if b < 0x20 && b != '\t' && b != '\n' && b != '\r' && b != '\f' && b != '\b' && b != 0x1b {
			badCtrl++
		}
	}
	return badCtrl*50 <= len(sample)
}

func resolveMacHeadBinary() string {
	if envBin := strings.TrimSpace(os.Getenv("MACHEAD_APP_BIN")); envBin != "" {
		if _, err := os.Stat(envBin); err == nil {
			return envBin
		}
	}
	if exe, err := os.Executable(); err == nil {
		cand := filepath.Clean(filepath.Join(filepath.Dir(exe), "../MacOS/MacHead"))
		if _, statErr := os.Stat(cand); statErr == nil {
			return cand
		}
	}
	fallback := "/Applications/MacHead.app/Contents/MacOS/MacHead"
	if _, err := os.Stat(fallback); err == nil {
		return fallback
	}
	return ""
}

func runCmdOutputTimeout(timeout time.Duration, name string, args ...string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return exec.CommandContext(ctx, name, args...).Output()
}

func handleMacHeadRPC(req rpcRequest) rpcResponse {
	resp := rpcResponse{ID: req.ID, OK: false}

	if req.Method == "ping" {
		resp.OK = true
		resp.Result = map[string]any{"pong": time.Now().UnixMilli()}
		return resp
	}

	if expectedHash := strings.ToLower(strings.TrimSpace(os.Getenv("MACHEAD_TERM_PASS_HASH"))); expectedHash != "" {
		providedHash := strings.ToLower(strings.TrimSpace(req.PassHash))
		if len(providedHash) != len(expectedHash) ||
			subtle.ConstantTimeCompare([]byte(providedHash), []byte(expectedHash)) != 1 {
			resp.Error = "NEED_PASSWORD: 该设备已开启访问口令保护，请输入访问口令"
			return resp
		}
	}

	switch req.Method {

	case "fs_list":
		var p struct {
			Path       string `json:"path"`
			ShowHidden bool   `json:"showHidden"`
		}
		_ = json.Unmarshal(req.Params, &p)
		dirPath, err := resolveSafePath(p.Path)
		if err != nil {
			resp.Error = err.Error()
			return resp
		}
		entries, err := os.ReadDir(dirPath)
		if err != nil {
			resp.Error = fmt.Sprintf("无法读取目录: %v", err)
			return resp
		}

		items := make([]fsEntry, 0, len(entries))
		for _, ent := range entries {
			name := ent.Name()
			if !p.ShowHidden && strings.HasPrefix(name, ".") {
				continue
			}
			fullPath := filepath.Join(dirPath, name)
			info, err := ent.Info()
			if err != nil {
				continue
			}
			isSymlink := info.Mode()&os.ModeSymlink != 0
			isDir := ent.IsDir()
			size := info.Size()
			if isSymlink {
				if targetInfo, statErr := os.Stat(fullPath); statErr == nil {
					isDir = targetInfo.IsDir()
					size = targetInfo.Size()
				}
			}
			ext := ""
			if !isDir {
				ext = strings.TrimPrefix(strings.ToLower(filepath.Ext(name)), ".")
			}
			items = append(items, fsEntry{
				Name:      name,
				Path:      fullPath,
				IsDir:     isDir,
				IsSymlink: isSymlink,
				Size:      size,
				Mode:      info.Mode().String(),
				ModTime:   info.ModTime().Unix(),
				Ext:       ext,
			})
		}

		sort.Slice(items, func(i, j int) bool {
			if items[i].IsDir != items[j].IsDir {
				return items[i].IsDir
			}
			return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
		})

		home := resolveUserHome()
		quickPaths := []quickPathEntry{
			{Name: "主目录", Path: home, Icon: "🏠"},
			{Name: "桌面", Path: filepath.Join(home, "Desktop"), Icon: "🖥️"},
			{Name: "下载", Path: filepath.Join(home, "Downloads"), Icon: "📥"},
			{Name: "文稿", Path: filepath.Join(home, "Documents"), Icon: "📄"},
		}
		if st, err := os.Stat(filepath.Join(home, "project")); err == nil && st.IsDir() {
			quickPaths = append(quickPaths, quickPathEntry{
				Name: "Project",
				Path: filepath.Join(home, "project"),
				Icon: "💻",
			})
		}
		quickPaths = append(quickPaths,
			quickPathEntry{Name: "应用", Path: "/Applications", Icon: "🚀"},
			quickPathEntry{Name: "根目录", Path: "/", Icon: "💿"},
		)

		resp.OK = true
		resp.Result = map[string]any{
			"path":       dirPath,
			"parentPath": filepath.Dir(dirPath),
			"homeDir":    home,
			"quickPaths": quickPaths,
			"items":      items,
		}
		return resp

	case "fs_read":
		var p struct {
			Path     string `json:"path"`
			MaxBytes int64  `json:"maxBytes"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			resp.Error = "参数格式错误"
			return resp
		}
		targetPath, err := resolveSafePath(p.Path)
		if err != nil {
			resp.Error = err.Error()
			return resp
		}
		info, err := os.Stat(targetPath)
		if err != nil {
			resp.Error = fmt.Sprintf("文件不存在或无法访问: %v", err)
			return resp
		}
		if info.IsDir() {
			resp.Error = "不能直接读取目录内容"
			return resp
		}
		maxLimit := p.MaxBytes
		if maxLimit <= 0 || maxLimit > 32*1024*1024 {
			maxLimit = 16 * 1024 * 1024
		}
		if info.Size() > maxLimit {
			resp.Error = fmt.Sprintf("文件过大 (%d MB)，超过单次传输限制 (%d MB)", info.Size()/(1024*1024), maxLimit/(1024*1024))
			return resp
		}
		data, err := os.ReadFile(targetPath)
		if err != nil {
			resp.Error = fmt.Sprintf("读取文件失败: %v", err)
			return resp
		}
		isText := isLikelyText(data)
		resp.OK = true
		resp.Result = map[string]any{
			"path":       targetPath,
			"name":       filepath.Base(targetPath),
			"size":       info.Size(),
			"modTime":    info.ModTime().Unix(),
			"isText":     isText,
			"dataBase64": base64.StdEncoding.EncodeToString(data),
		}
		return resp

	case "fs_write":
		var p struct {
			Path       string  `json:"path"`
			Content    *string `json:"content,omitempty"`
			DataBase64 string  `json:"dataBase64,omitempty"`
			Append     bool    `json:"append,omitempty"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			resp.Error = "参数格式错误"
			return resp
		}
		targetPath, err := resolveSafePath(p.Path)
		if err != nil {
			resp.Error = err.Error()
			return resp
		}
		var rawBytes []byte
		if p.Content != nil {
			rawBytes = []byte(*p.Content)
		} else if p.DataBase64 != "" {
			decoded, decErr := base64.StdEncoding.DecodeString(p.DataBase64)
			if decErr != nil {
				resp.Error = fmt.Sprintf("Base64 解码失败: %v", decErr)
				return resp
			}
			rawBytes = decoded
		} else {
			rawBytes = []byte{}
		}

		flags := os.O_CREATE | os.O_WRONLY
		if p.Append {
			flags |= os.O_APPEND
		} else {
			flags |= os.O_TRUNC
		}
		f, err := os.OpenFile(targetPath, flags, 0644)
		if err != nil {
			resp.Error = fmt.Sprintf("写入文件失败: %v", err)
			return resp
		}
		_, writeErr := f.Write(rawBytes)
		closeErr := f.Close()
		if writeErr != nil {
			resp.Error = fmt.Sprintf("写入数据失败: %v", writeErr)
			return resp
		}
		if closeErr != nil {
			resp.Error = fmt.Sprintf("保存文件失败: %v", closeErr)
			return resp
		}
		info, _ := os.Stat(targetPath)
		var finalSize int64
		if info != nil {
			finalSize = info.Size()
		}
		resp.OK = true
		resp.Result = map[string]any{
			"path": targetPath,
			"size": finalSize,
		}
		return resp

	case "fs_mkdir":
		var p struct {
			Path string `json:"path"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			resp.Error = "参数格式错误"
			return resp
		}
		targetPath, err := resolveSafePath(p.Path)
		if err != nil {
			resp.Error = err.Error()
			return resp
		}
		if err := os.MkdirAll(targetPath, 0755); err != nil {
			resp.Error = fmt.Sprintf("创建目录失败: %v", err)
			return resp
		}
		resp.OK = true
		resp.Result = map[string]any{"path": targetPath}
		return resp

	case "fs_rename":
		var p struct {
			OldPath string `json:"oldPath"`
			NewPath string `json:"newPath"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			resp.Error = "参数格式错误"
			return resp
		}
		oldAbs, err1 := resolveSafePath(p.OldPath)
		newAbs, err2 := resolveSafePath(p.NewPath)
		if err1 != nil || err2 != nil {
			resp.Error = "路径无效"
			return resp
		}
		if err := os.Rename(oldAbs, newAbs); err != nil {
			resp.Error = fmt.Sprintf("重命名失败: %v", err)
			return resp
		}
		resp.OK = true
		resp.Result = map[string]any{"path": newAbs}
		return resp

	case "fs_delete":
		var p struct {
			Path string `json:"path"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			resp.Error = "参数格式错误"
			return resp
		}
		targetPath, err := resolveSafePath(p.Path)
		if err != nil {
			resp.Error = err.Error()
			return resp
		}
		home := resolveUserHome()
		protected := map[string]bool{
			"/":             true,
			"/Users":        true,
			"/System":       true,
			"/Library":      true,
			"/Applications": true,
			"/bin":          true,
			"/sbin":         true,
			"/usr":          true,
			"/var":          true,
			"/etc":          true,
			home:            true,
		}
		if protected[targetPath] {
			resp.Error = "受系统保护的核心目录禁止删除"
			return resp
		}
		if err := os.RemoveAll(targetPath); err != nil {
			resp.Error = fmt.Sprintf("删除失败: %v", err)
			return resp
		}
		resp.OK = true
		resp.Result = map[string]any{"deleted": targetPath}
		return resp

	case "sys_status":
		resp.OK = true
		resp.Result = collectMacSystemStatus()
		return resp

	case "sys_toggle_headless":
		var p struct {
			Enable bool `json:"enable"`
		}
		_ = json.Unmarshal(req.Params, &p)
		flag := "--disable"
		if p.Enable {
			flag = "--enable"
		}
		if macHeadBin := resolveMacHeadBinary(); macHeadBin != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			_ = exec.CommandContext(ctx, macHeadBin, flag).Run()
			cancel()
		}
		time.Sleep(260 * time.Millisecond)
		resp.OK = true
		resp.Result = collectMacSystemStatus()
		return resp

	case "sys_kill_process":
		var p struct {
			PID   int  `json:"pid"`
			Force bool `json:"force"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil || p.PID <= 1 {
			resp.Error = "无效的进程 PID"
			return resp
		}
		if p.PID == os.Getpid() || p.PID == os.Getppid() {
			resp.Error = "禁止终止当前远程服务进程"
			return resp
		}
		sig := syscall.SIGTERM
		if p.Force {
			sig = syscall.SIGKILL
		}
		if err := syscall.Kill(p.PID, sig); err != nil {
			resp.Error = fmt.Sprintf("无法终止进程 (PID %d): %v", p.PID, err)
			return resp
		}
		resp.OK = true
		resp.Result = map[string]any{"pid": p.PID}
		return resp

	case "sys_clipboard_get":
		out, err := runCmdOutputTimeout(3*time.Second, "/usr/bin/pbpaste")
		if err != nil {
			resp.Error = fmt.Sprintf("读取剪贴板失败: %v", err)
			return resp
		}
		resp.OK = true
		resp.Result = map[string]any{"text": string(out)}
		return resp

	case "sys_clipboard_set":
		var p struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal(req.Params, &p); err != nil {
			resp.Error = "参数错误"
			return resp
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		cmd := exec.CommandContext(ctx, "/usr/bin/pbcopy")
		cmd.Stdin = strings.NewReader(p.Text)
		err := cmd.Run()
		cancel()
		if err != nil {
			resp.Error = fmt.Sprintf("写入剪贴板失败: %v", err)
			return resp
		}
		resp.OK = true
		resp.Result = map[string]any{"length": len(p.Text)}
		return resp

	default:
		resp.Error = fmt.Sprintf("未知的 RPC 方法: %s", req.Method)
		return resp
	}
}

func runCmdTrim(name string, args ...string) string {
	out, err := runCmdOutputTimeout(3*time.Second, name, args...)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

var (
	staticSysOnce     sync.Once
	cachedOSVersion   string
	cachedCPUBrand    string
	cachedMemTotal    uint64
	cachedBootTimeSec int64
)

func initStaticSysFacts() {
	staticSysOnce.Do(func() {
		cachedOSVersion = runCmdTrim("/usr/bin/sw_vers", "-productVersion")
		cachedCPUBrand = runCmdTrim("/usr/sbin/sysctl", "-n", "machdep.cpu.brand_string")
		if cachedCPUBrand == "" {
			cachedCPUBrand = runtime.GOARCH
		}
		if memStr := runCmdTrim("/usr/sbin/sysctl", "-n", "hw.memsize"); memStr != "" {
			cachedMemTotal, _ = strconv.ParseUint(memStr, 10, 64)
		}
		bootRaw := runCmdTrim("/usr/sbin/sysctl", "-n", "kern.boottime")
		if idx := strings.Index(bootRaw, "sec ="); idx != -1 {
			rest := strings.TrimSpace(bootRaw[idx+5:])
			if comma := strings.IndexAny(rest, ", "); comma != -1 {
				if sec, err := strconv.ParseInt(rest[:comma], 10, 64); err == nil && sec > 0 {
					cachedBootTimeSec = sec
				}
			}
		}
	})
}

func collectMacSystemStatus() map[string]any {
	initStaticSysFacts()
	hostname, _ := os.Hostname()
	osVersion := cachedOSVersion
	cpuBrand := cachedCPUBrand
	memTotalBytes := cachedMemTotal
	cores := runtime.NumCPU()

	var uptimeSec int64
	if cachedBootTimeSec > 0 {
		uptimeSec = time.Now().Unix() - cachedBootTimeSec
	}

	var (
		loadRaw string
		vmRaw   string
		battRaw string
		tmOut   []byte
		psRaw   string
		lsofRaw string
		wg      sync.WaitGroup
	)

	wg.Add(6)
	go func() {
		defer wg.Done()
		loadRaw = runCmdTrim("/usr/sbin/sysctl", "-n", "vm.loadavg")
	}()
	go func() {
		defer wg.Done()
		vmRaw = runCmdTrim("/usr/bin/vm_stat")
	}()
	go func() {
		defer wg.Done()
		battRaw = runCmdTrim("/usr/bin/pmset", "-g", "batt")
	}()
	go func() {
		defer wg.Done()
		if macHeadBin := resolveMacHeadBinary(); macHeadBin != "" {
			tmOut, _ = runCmdOutputTimeout(3*time.Second, macHeadBin, "--telemetry-json")
		}
	}()
	go func() {
		defer wg.Done()
		psRaw = runCmdTrim("/bin/ps", "-Ao", "pid,user,pcpu,pmem,rss,comm", "-r")
	}()
	go func() {
		defer wg.Done()
		lsofRaw = runCmdTrim("/usr/sbin/lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-F", "pcn")
	}()
	wg.Wait()

	// Load average via sysctl -n vm.loadavg: "{ 1.85 2.01 1.94 }"
	loadAvg := []float64{0, 0, 0}
	loadParts := strings.Fields(strings.Trim(loadRaw, "{} "))
	for i := 0; i < len(loadParts) && i < 3; i++ {
		if v, err := strconv.ParseFloat(loadParts[i], 64); err == nil {
			loadAvg[i] = v
		}
	}

	// Memory total & used via vm_stat
	var memUsedBytes uint64
	var pageSize uint64 = 16384
	var pagesActive, pagesWired, pagesCompressed uint64
	for _, line := range strings.Split(vmRaw, "\n") {
		if strings.Contains(line, "page size of") {
			for _, f := range strings.Fields(line) {
				if ps, err := strconv.ParseUint(f, 10, 64); err == nil && ps >= 4096 {
					pageSize = ps
					break
				}
			}
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		valStr := strings.TrimSuffix(strings.TrimSpace(parts[1]), ".")
		val, _ := strconv.ParseUint(valStr, 10, 64)
		switch key {
		case "Pages active":
			pagesActive = val
		case "Pages wired down":
			pagesWired = val
		case "Pages occupied by compressor":
			pagesCompressed = val
		}
	}
	memUsedBytes = (pagesActive + pagesWired + pagesCompressed) * pageSize
	if memTotalBytes > 0 && memUsedBytes > memTotalBytes {
		memUsedBytes = memTotalBytes
	}
	var memUsagePct float64
	if memTotalBytes > 0 {
		memUsagePct = float64(memUsedBytes) * 100.0 / float64(memTotalBytes)
	}

	// Disk usage via Statfs("/")
	var diskTotalBytes, diskFreeBytes, diskUsedBytes uint64
	var diskUsagePct float64
	var st syscall.Statfs_t
	if err := syscall.Statfs("/", &st); err == nil {
		diskTotalBytes = st.Blocks * uint64(st.Bsize)
		diskFreeBytes = st.Bavail * uint64(st.Bsize)
		if diskTotalBytes >= diskFreeBytes {
			diskUsedBytes = diskTotalBytes - diskFreeBytes
			diskUsagePct = float64(diskUsedBytes) * 100.0 / float64(diskTotalBytes)
		}
	}

	// Battery status via pmset -g batt
	batteryPct := -1
	isCharging := false
	powerSource := "AC Power"
	if strings.Contains(battRaw, "Battery Power") {
		powerSource = "Battery"
	}
	for _, token := range strings.Fields(battRaw) {
		if strings.HasSuffix(token, "%;") || strings.HasSuffix(token, "%") {
			numStr := strings.TrimRight(token, "%;")
			if pct, err := strconv.Atoi(numStr); err == nil {
				batteryPct = pct
				break
			}
		}
	}
	if strings.Contains(battRaw, "; charging;") || strings.Contains(battRaw, "; charged;") || powerSource == "AC Power" {
		isCharging = true
	}

	// MacHead telemetry (Headless state, SMC temperature, fan speed)
	isHeadless := false
	preventIdleSleep := true
	var cpuTemp float64
	var fanSpeed int
	isFanless := false
	if len(tmOut) > 0 {
		var tm struct {
			IsHeadless       bool    `json:"isHeadless"`
			PreventIdleSleep bool    `json:"preventIdleSleep"`
			CPUTemp          float64 `json:"cpuTemp"`
			FanSpeed         int     `json:"fanSpeed"`
			IsFanless        bool    `json:"isFanless"`
		}
		if json.Unmarshal(tmOut, &tm) == nil {
			isHeadless = tm.IsHeadless
			preventIdleSleep = tm.PreventIdleSleep
			cpuTemp = tm.CPUTemp
			fanSpeed = tm.FanSpeed
			isFanless = tm.IsFanless
		}
	}

	// Top processes & total CPU % via ps
	var totalCPU float64
	var procs []procEntry
	for idx, line := range strings.Split(psRaw, "\n") {
		if idx == 0 {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		pid, err := strconv.Atoi(fields[0])
		if err != nil {
			continue
		}
		userStr := fields[1]
		cpuVal, _ := strconv.ParseFloat(fields[2], 64)
		memVal, _ := strconv.ParseFloat(fields[3], 64)
		rssKB, _ := strconv.ParseFloat(fields[4], 64)
		cmdPath := strings.Join(fields[5:], " ")
		baseName := filepath.Base(cmdPath)

		totalCPU += cpuVal
		if len(procs) < 15 {
			procs = append(procs, procEntry{
				PID:     pid,
				User:    userStr,
				CPU:     cpuVal,
				Mem:     memVal,
				RSSMB:   float64(int(rssKB/102.4)) / 10.0,
				Name:    baseName,
				Command: cmdPath,
			})
		}
	}

	cpuUsagePct := totalCPU / float64(max(1, cores))
	if cpuUsagePct > 100.0 {
		cpuUsagePct = 100.0
	}

	// Listening TCP Ports via lsof
	var ports []listenPortEntry
	seenPorts := map[int]bool{}
	var curPID int
	var curProc string
	for _, line := range strings.Split(lsofRaw, "\n") {
		if len(line) < 2 {
			continue
		}
		prefix := line[0]
		val := line[1:]
		switch prefix {
		case 'p':
			curPID, _ = strconv.Atoi(val)
		case 'c':
			curProc = val
		case 'n':
			colonIdx := strings.LastIndex(val, ":")
			if colonIdx != -1 {
				portNum, err := strconv.Atoi(val[colonIdx+1:])
				if err == nil && portNum > 0 && !seenPorts[portNum] {
					seenPorts[portNum] = true
					ports = append(ports, listenPortEntry{
						PID:     curPID,
						Process: curProc,
						Port:    portNum,
						Address: val,
					})
				}
			}
		}
	}
	sort.Slice(ports, func(i, j int) bool {
		return ports[i].Port < ports[j].Port
	})

	return map[string]any{
		"hostname":         hostname,
		"osVersion":        osVersion,
		"cpuModel":         cpuBrand,
		"cpuCores":         cores,
		"uptimeSec":        uptimeSec,
		"loadAvg":          loadAvg,
		"cpuUsagePct":      float64(int(cpuUsagePct*10)) / 10.0,
		"memUsedBytes":     memUsedBytes,
		"memTotalBytes":    memTotalBytes,
		"memUsagePct":      float64(int(memUsagePct*10)) / 10.0,
		"diskUsedBytes":    diskUsedBytes,
		"diskTotalBytes":   diskTotalBytes,
		"diskFreeBytes":    diskFreeBytes,
		"diskUsagePct":     float64(int(diskUsagePct*10)) / 10.0,
		"batteryPct":       batteryPct,
		"isCharging":       isCharging,
		"powerSource":      powerSource,
		"cpuTemp":          cpuTemp,
		"fanSpeed":         fanSpeed,
		"isFanless":        isFanless,
		"isHeadless":       isHeadless,
		"preventIdleSleep": preventIdleSleep,
		"processes":        procs,
		"ports":            ports,
		"timestamp":        time.Now().Unix(),
	}
}

func serveWebRTCRPCChannel(dc *webrtc.DataChannel) {
	var sendMu sync.Mutex
	sendJSON := func(resp rpcResponse) {
		b, err := json.Marshal(resp)
		if err != nil {
			return
		}
		const maxChunkSize = 48 * 1024
		sendMu.Lock()
		defer sendMu.Unlock()
		if len(b) <= maxChunkSize {
			_ = dc.SendText(string(b))
			return
		}
		var chunks []string
		for start := 0; start < len(b); {
			end := start + maxChunkSize
			if end >= len(b) {
				end = len(b)
			} else {
				// Step back to a valid UTF-8 rune boundary so multi-byte characters are never split
				for end > start && (b[end]&0xC0) == 0x80 {
					end--
				}
			}
			chunks = append(chunks, string(b[start:end]))
			start = end
		}
		total := len(chunks)
		for i, chunkStr := range chunks {
			chunkPacket, _ := json.Marshal(map[string]any{
				"id":      resp.ID,
				"__chunk": i,
				"__total": total,
				"data":    chunkStr,
			})
			_ = dc.SendText(string(chunkPacket))
		}
	}

	// Support chunked incoming requests for large file uploads over DataChannel
	const maxChunksPerRPC = 1024
	type chunkAssembly struct {
		parts     []string
		received  int
		createdAt time.Time
	}
	var (
		inMu     sync.Mutex
		inChunks = map[string]*chunkAssembly{}
	)

	dc.OnClose(func() {
		inMu.Lock()
		clear(inChunks)
		inMu.Unlock()
	})

	dc.OnMessage(func(msg webrtc.DataChannelMessage) {
		var envelope struct {
			ID       string          `json:"id"`
			PassHash string          `json:"passHash,omitempty"`
			Chunk    *int            `json:"__chunk,omitempty"`
			Total    *int            `json:"__total,omitempty"`
			Data     string          `json:"data,omitempty"`
			Method   string          `json:"method,omitempty"`
			Params   json.RawMessage `json:"params,omitempty"`
		}
		if err := json.Unmarshal(msg.Data, &envelope); err != nil {
			return
		}

		if envelope.Chunk != nil && envelope.Total != nil && *envelope.Total > 0 {
			idx := *envelope.Chunk
			tot := *envelope.Total
			if tot > maxChunksPerRPC || idx < 0 || idx >= tot {
				sendJSON(rpcResponse{ID: envelope.ID, OK: false, Error: "chunk count exceeds limit"})
				return
			}
			now := time.Now()
			inMu.Lock()
			if len(inChunks) > 32 {
				for k, v := range inChunks {
					if now.Sub(v.createdAt) > 30*time.Second {
						delete(inChunks, k)
					}
				}
			}
			state, ok := inChunks[envelope.ID]
			if !ok || len(state.parts) != tot {
				state = &chunkAssembly{parts: make([]string, tot), createdAt: now}
				inChunks[envelope.ID] = state
			}
			if state.parts[idx] == "" && envelope.Data != "" {
				state.parts[idx] = envelope.Data
				state.received++
			}
			complete := state.received == tot
			var fullJSON string
			if complete {
				fullJSON = strings.Join(state.parts, "")
				delete(inChunks, envelope.ID)
			}
			inMu.Unlock()

			if !complete {
				return
			}
			var fullReq rpcRequest
			if err := json.Unmarshal([]byte(fullJSON), &fullReq); err != nil {
				sendJSON(rpcResponse{ID: envelope.ID, OK: false, Error: "chunked JSON parse error"})
				return
			}
			go func(r rpcRequest) {
				sendJSON(handleMacHeadRPC(r))
			}(fullReq)
			return
		}

		req := rpcRequest{
			ID:       envelope.ID,
			PassHash: envelope.PassHash,
			Method:   envelope.Method,
			Params:   envelope.Params,
		}
		go func(r rpcRequest) {
			sendJSON(handleMacHeadRPC(r))
		}(req)
	})
}

func handleRPCTCPConn() func(net.Conn) {
	return func(c net.Conn) {
		defer c.Close()
		_ = c.SetDeadline(time.Now().Add(30 * time.Second))
		var req rpcRequest
		if err := json.NewDecoder(io.LimitReader(c, 36*1024*1024)).Decode(&req); err != nil {
			_ = json.NewEncoder(c).Encode(rpcResponse{OK: false, Error: fmt.Sprintf("invalid RPC payload: %v", err)})
			return
		}
		resp := handleMacHeadRPC(req)
		_ = json.NewEncoder(c).Encode(resp)
	}
}

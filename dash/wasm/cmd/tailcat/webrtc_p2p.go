// Copyright 2026 The MacHead Authors
// SPDX-License-Identifier: BSD-3-Clause

//go:build darwin || linux

package main

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/creack/pty"
	"github.com/pion/webrtc/v4"
)

type rtcOfferPayload struct {
	Addr     string `json:"addr,omitempty"`
	AddrHash string `json:"addrHash,omitempty"`
	SDP      string `json:"sdp"`
	LANOnly  bool   `json:"lanOnly,omitempty"`
}

type rtcAnswerPayload struct {
	OK    bool   `json:"ok"`
	SDP   string `json:"sdp,omitempty"`
	Mode  string `json:"mode,omitempty"`
	Error string `json:"error,omitempty"`
}

type rtcControlMessage struct {
	Type string `json:"type"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
	Term string `json:"term,omitempty"`
	T    int64  `json:"t,omitempty"`
}

func negotiateWebRTCAnswer(req rtcOfferPayload, execArgs []string) rtcAnswerPayload {
	if strings.TrimSpace(req.SDP) == "" {
		return rtcAnswerPayload{
			OK:    false,
			Error: "empty SDP offer",
		}
	}

	se := webrtc.SettingEngine{}
	se.SetIncludeLoopbackCandidate(true)
	se.SetNetworkTypes([]webrtc.NetworkType{
		webrtc.NetworkTypeUDP4,
		webrtc.NetworkTypeUDP6,
	})
	se.SetICETimeouts(6*time.Second, 20*time.Second, 1500*time.Millisecond)

	var iceServers []webrtc.ICEServer
	if !req.LANOnly {
		iceServers = []webrtc.ICEServer{
			{URLs: []string{"stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"}},
		}
	}

	api := webrtc.NewAPI(webrtc.WithSettingEngine(se))
	pc, err := api.NewPeerConnection(webrtc.Configuration{
		ICEServers: iceServers,
	})
	if err != nil {
		return rtcAnswerPayload{
			OK:    false,
			Error: fmt.Sprintf("failed to create PeerConnection: %v", err),
		}
	}

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		if state == webrtc.PeerConnectionStateFailed ||
			state == webrtc.PeerConnectionStateClosed {
			_ = pc.Close()
		}
	})

	time.AfterFunc(15*time.Second, func() {
		if pc.ConnectionState() != webrtc.PeerConnectionStateConnected {
			_ = pc.Close()
		}
	})

	pc.OnDataChannel(func(dc *webrtc.DataChannel) {
		label := dc.Label()
		if label == "keepalive" {
			dc.OnMessage(func(msg webrtc.DataChannelMessage) {
				if msg.IsString && string(msg.Data) == "ping" {
					_ = dc.SendText("pong")
				}
			})
			return
		}
		if label == "rpc" || strings.HasPrefix(label, "rpc:") {
			serveWebRTCRPCChannel(dc)
			return
		}
		if strings.HasPrefix(label, "pty") {
			serveWebRTCPTYChannel(dc, label, execArgs)
		}
	})

	hostFound := make(chan struct{}, 1)
	srflxFound := make(chan struct{}, 1)
	pc.OnICECandidate(func(cand *webrtc.ICECandidate) {
		if cand == nil {
			return
		}
		if cand.Typ == webrtc.ICECandidateTypeHost {
			select {
			case hostFound <- struct{}{}:
			default:
			}
		} else if cand.Typ == webrtc.ICECandidateTypeSrflx {
			select {
			case srflxFound <- struct{}{}:
			default:
			}
		}
	})

	gatherDone := webrtc.GatheringCompletePromise(pc)

	if err := pc.SetRemoteDescription(webrtc.SessionDescription{
		Type: webrtc.SDPTypeOffer,
		SDP:  req.SDP,
	}); err != nil {
		_ = pc.Close()
		return rtcAnswerPayload{
			OK:    false,
			Error: fmt.Sprintf("SetRemoteDescription: %v", err),
		}
	}

	answer, err := pc.CreateAnswer(nil)
	if err != nil {
		_ = pc.Close()
		return rtcAnswerPayload{
			OK:    false,
			Error: fmt.Sprintf("CreateAnswer: %v", err),
		}
	}

	if err := pc.SetLocalDescription(answer); err != nil {
		_ = pc.Close()
		return rtcAnswerPayload{
			OK:    false,
			Error: fmt.Sprintf("SetLocalDescription: %v", err),
		}
	}

	if req.LANOnly {
		// Happy Eyeballs LAN Direct mode: no external STUN servers are configured,
		// so local host UDP candidates finish gathering in ~1-3ms.
		select {
		case <-gatherDone:
		case <-hostFound:
			select {
			case <-gatherDone:
			case <-time.After(15 * time.Millisecond):
			}
		case <-time.After(80 * time.Millisecond):
		}
	} else {
		// WAN STUN mode: return as soon as STUN srflx arrives or gathering finishes.
		select {
		case <-gatherDone:
		case <-srflxFound:
			select {
			case <-gatherDone:
			case <-time.After(25 * time.Millisecond):
			}
		case <-hostFound:
			select {
			case <-gatherDone:
			case <-srflxFound:
			case <-time.After(220 * time.Millisecond):
			}
		case <-time.After(800 * time.Millisecond):
		}
	}

	localDesc := pc.LocalDescription()
	if localDesc == nil {
		_ = pc.Close()
		return rtcAnswerPayload{
			OK:    false,
			Error: "missing LocalDescription",
		}
	}

	mode := "wan-p2p"
	if req.LANOnly {
		mode = "lan-direct"
	}
	return rtcAnswerPayload{
		OK:   true,
		SDP:  localDesc.SDP,
		Mode: mode,
	}
}

func isAllowedSignalHost(host string) bool {
	h := strings.ToLower(strings.TrimSpace(host))
	return h == "127.0.0.1:41891" || h == "localhost:41891"
}

func isAllowedSignalOrigin(origin string) bool {
	o := strings.ToLower(strings.TrimSpace(origin))
	if o == "https://dash.headlessmac.com" || o == "https://headlessmac.com" {
		return true
	}
	if strings.HasPrefix(o, "http://localhost:") || o == "http://localhost" ||
		strings.HasPrefix(o, "http://127.0.0.1:") || o == "http://127.0.0.1" {
		return true
	}
	return false
}

func checkLoopbackPostRequest(w http.ResponseWriter, r *http.Request) bool {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	// Mitigate DNS Rebinding by enforcing loopback Host header
	if !isAllowedSignalHost(r.Host) {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "forbidden host header"})
		return false
	}

	// Restrict browser cross-origin requests to trusted MacHead origins only
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin != "" {
		if !isAllowedSignalOrigin(origin) {
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "forbidden origin"})
			return false
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Private-Network", "true")
	}

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return false
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "method not allowed"})
		return false
	}
	return true
}

func startLocalHappyEyeballsServer(connStr string, execArgs []string) {
	ln, err := net.Listen("tcp", "127.0.0.1:41891")
	if err != nil {
		return
	}

	connStrHash := fmt.Sprintf("%x", sha256.Sum256([]byte(strings.TrimSpace(connStr))))
	matchesLocalAddr := func(rawAddr, rawHash string) bool {
		if h := strings.ToLower(strings.TrimSpace(rawHash)); len(h) == len(connStrHash) {
			if subtle.ConstantTimeCompare([]byte(h), []byte(connStrHash)) == 1 {
				return true
			}
		}
		if a := strings.TrimSpace(rawAddr); len(a) == len(connStr) && len(a) > 0 {
			if subtle.ConstantTimeCompare([]byte(a), []byte(connStr)) == 1 {
				return true
			}
		}
		return false
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/webrtc/signal", func(w http.ResponseWriter, r *http.Request) {
		if !checkLoopbackPostRequest(w, r) {
			return
		}

		var req rtcOfferPayload
		if err := json.NewDecoder(io.LimitReader(r.Body, 256*1024)).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(rtcAnswerPayload{OK: false, Error: "invalid JSON body"})
			return
		}

		if !matchesLocalAddr(req.Addr, req.AddrHash) {
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(rtcAnswerPayload{OK: false, Error: "unauthorized device address"})
			return
		}

		// Loopback signaling always uses pure local/LAN host candidates (zero STUN latency).
		req.LANOnly = true
		ans := negotiateWebRTCAnswer(req, execArgs)
		ans.Mode = "loopback-direct"
		if !ans.OK {
			w.WriteHeader(http.StatusInternalServerError)
		}
		_ = json.NewEncoder(w).Encode(ans)
	})

	mux.HandleFunc("/webrtc/rpc", func(w http.ResponseWriter, r *http.Request) {
		if !checkLoopbackPostRequest(w, r) {
			return
		}

		var req rpcRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 36*1024*1024)).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(rpcResponse{OK: false, Error: "invalid JSON body"})
			return
		}

		if !matchesLocalAddr(req.Addr, req.AddrHash) {
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(rpcResponse{OK: false, Error: "unauthorized device address"})
			return
		}

		resp := handleMacHeadRPC(req)
		_ = json.NewEncoder(w).Encode(resp)
	})

	srv := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		_ = srv.Serve(ln)
	}()
}

func handleWebRTCSignalingConn(execArgs []string) func(net.Conn) {
	return func(c net.Conn) {
		defer c.Close()
		_ = c.SetDeadline(time.Now().Add(15 * time.Second))

		var req rtcOfferPayload
		if err := json.NewDecoder(io.LimitReader(c, 256*1024)).Decode(&req); err != nil || req.SDP == "" {
			_ = json.NewEncoder(c).Encode(rtcAnswerPayload{
				OK:    false,
				Error: fmt.Sprintf("invalid SDP offer: %v", err),
			})
			return
		}

		ans := negotiateWebRTCAnswer(req, execArgs)
		_ = json.NewEncoder(c).Encode(ans)
	}
}

	func parsePTYLabel(label string) (cols, rows int, term, customCwd string) {
	cols, rows, term = 80, 24, "xterm-256color"
	// Format: "pty:120x36:xterm-256color[:tabId][:b64cwd]"
	parts := strings.Split(label, ":")
	if len(parts) >= 2 {
		dims := strings.Split(parts[1], "x")
		if len(dims) == 2 {
			if c, err := strconv.Atoi(dims[0]); err == nil && c > 0 {
				cols = c
			}
			if r, err := strconv.Atoi(dims[1]); err == nil && r > 0 {
				rows = r
			}
		}
	}
	if len(parts) >= 3 && parts[2] != "" {
		term = parts[2]
	}
	if len(parts) >= 5 && parts[4] != "" {
		if b, err := base64.RawURLEncoding.DecodeString(parts[4]); err == nil {
			cand := filepath.Clean(string(b))
			if st, statErr := os.Stat(cand); statErr == nil && st.IsDir() {
				customCwd = cand
			}
		}
	}
	return cols, rows, term, customCwd
}

func buildShellCmd(term, customCwd string, execArgs []string) *exec.Cmd {
	u, err := user.Current()
	shell := "/bin/zsh"
	homeDir := os.Getenv("HOME")
	username := os.Getenv("USER")
	if err == nil && u != nil {
		if u.HomeDir != "" {
			homeDir = u.HomeDir
		}
		if u.Username != "" {
			username = u.Username
		}
	}
	if envShell := os.Getenv("SHELL"); envShell != "" {
		shell = envShell
	} else if runtime.GOOS == "darwin" {
		shell = "/bin/zsh"
	}

	var cmd *exec.Cmd
	if len(execArgs) > 0 {
		cmd = exec.Command(execArgs[0], execArgs[1:]...)
	} else {
		cmd = exec.Command(shell, "-l")
	}

	if customCwd != "" {
		cmd.Dir = customCwd
	} else if homeDir != "" {
		cmd.Dir = homeDir
	}

	env := os.Environ()
	env = append(env,
		"TERM="+term,
		"SHELL="+shell,
		"USER="+username,
		"HOME="+homeDir,
		"COLORTERM=truecolor",
		"LANG=en_US.UTF-8",
	)
	cmd.Env = env
	return cmd
}

func serveWebRTCPTYChannel(dc *webrtc.DataChannel, label string, execArgs []string) {
	cols, rows, term, customCwd := parsePTYLabel(label)
	var (
		ptmxMu    sync.Mutex
		ptmxFile  *os.File
		ptyCmd    *exec.Cmd
		ptyClosed bool
		closeOnce sync.Once
	)

	cleanup := func(reason string) {
		closeOnce.Do(func() {
			ptmxMu.Lock()
			ptyClosed = true
			f := ptmxFile
			c := ptyCmd
			ptmxFile = nil
			ptyCmd = nil
			ptmxMu.Unlock()

			if f != nil {
				_ = f.Close()
			}
			if c != nil && c.Process != nil {
				_ = c.Process.Signal(syscall.SIGHUP)
			}
			if reason != "" {
				b, _ := json.Marshal(map[string]any{
					"type":   "exit",
					"reason": reason,
				})
				_ = dc.SendText(string(b))
			}
			_ = dc.Close()
		})
	}

	startPTY := func() (*os.File, error) {
		ptmxMu.Lock()
		defer ptmxMu.Unlock()
		if ptyClosed {
			return nil, fmt.Errorf("terminal channel already closed")
		}
		if ptmxFile != nil {
			return ptmxFile, nil
		}

		cmd := buildShellCmd(term, customCwd, execArgs)
		ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{
			Rows: uint16(rows),
			Cols: uint16(cols),
		})
		if err != nil {
			return nil, err
		}
		ptmxFile = ptmx
		ptyCmd = cmd

		go func(f *os.File) {
			buf := make([]byte, 16*1024)
			for {
				n, readErr := f.Read(buf)
				if n > 0 {
					if sendErr := dc.Send(buf[:n]); sendErr != nil {
						return
					}
				}
				if readErr != nil {
					return
				}
			}
		}(ptmx)

		go func(c *exec.Cmd) {
			_ = c.Wait()
			cleanup("终端会话已正常退出")
		}(cmd)

		return ptmx, nil
	}

	dc.OnOpen(func() {
		if _, err := startPTY(); err != nil {
			cleanup(fmt.Sprintf("无法启动本地终端: %v", err))
			return
		}

		readyMsg, _ := json.Marshal(map[string]any{
			"type":      "ready",
			"transport": "webrtc-p2p",
		})
		_ = dc.SendText(string(readyMsg))
	})

	dc.OnMessage(func(msg webrtc.DataChannelMessage) {
		ptmx, err := startPTY()
		if err != nil || ptmx == nil {
			return
		}

		if msg.IsString {
			var ctrl rtcControlMessage
			if err := json.Unmarshal(msg.Data, &ctrl); err != nil {
				return
			}
			switch ctrl.Type {
			case "resize", "init":
				if ctrl.Cols > 0 && ctrl.Rows > 0 {
					_ = pty.Setsize(ptmx, &pty.Winsize{
						Rows: uint16(ctrl.Rows),
						Cols: uint16(ctrl.Cols),
					})
				}
			case "ping":
				resp, _ := json.Marshal(map[string]any{
					"type": "pong",
					"t":    ctrl.T,
				})
				_ = dc.SendText(string(resp))
			}
			return
		}

		if len(msg.Data) > 0 {
			_, _ = ptmx.Write(msg.Data)
		}
	})

	dc.OnClose(func() {
		cleanup("")
	})
}

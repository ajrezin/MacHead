// Copyright 2026 The MacHead Authors
// Licensed under the Apache License, Version 2.0

//go:build js && wasm

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"strings"
	"sync"
	"syscall/js"
	"time"

	"github.com/tailscale/tailcat"
	"golang.org/x/crypto/ssh"
	"tailscale.com/types/key"
	"tailscale.com/types/logger"
)

type cachedClientEntry struct {
	mu    sync.Mutex
	cl    *tailcat.Client
	ready bool
}

var (
	clientPoolMu sync.Mutex
	clientPool   = map[string]*cachedClientEntry{}
)

func main() {
	js.Global().Set("tailcatConnectSSH", js.FuncOf(tailcatConnectSSH))
	js.Global().Set("tailcatPreconnect", js.FuncOf(tailcatPreconnect))
	js.Global().Set("tailcatSignalWebRTC", js.FuncOf(tailcatSignalWebRTC))
	js.Global().Set("tailcatRPC", js.FuncOf(tailcatRPC))
	js.Global().Set("tailcatCloseAll", js.FuncOf(tailcatCloseAll))
	if f := js.Global().Get("onTailcatReady"); f.Type() == js.TypeFunction {
		f.Invoke()
	}
	select {}
}

func getOrConnectClient(ctx context.Context, addr, derpMapURL string, logf logger.Logf) (*tailcat.Client, error) {
	clientPoolMu.Lock()
	entry, ok := clientPool[addr]
	if !ok {
		entry = &cachedClientEntry{}
		clientPool[addr] = entry
	}
	clientPoolMu.Unlock()

	entry.mu.Lock()
	defer entry.mu.Unlock()

	if entry.cl != nil && entry.ready {
		return entry.cl, nil
	}

	if entry.cl != nil {
		_ = entry.cl.Close()
		entry.cl = nil
		entry.ready = false
	}

	cl := &tailcat.Client{
		Server:     tailcat.Addr(addr),
		Key:        key.NewNode(),
		Logf:       logf,
		DERPMapURL: derpMapURL,
	}
	if err := pingUntil(ctx, cl); err != nil {
		_ = cl.Close()
		return nil, err
	}
	entry.cl = cl
	entry.ready = true
	return cl, nil
}

func dropCachedClient(addr string, cl *tailcat.Client) {
	clientPoolMu.Lock()
	entry, ok := clientPool[addr]
	if !ok {
		clientPoolMu.Unlock()
		return
	}
	clientPoolMu.Unlock()

	entry.mu.Lock()
	matched := entry.cl == cl
	if matched {
		entry.cl = nil
		entry.ready = false
	}
	entry.mu.Unlock()

	if matched {
		clientPoolMu.Lock()
		if cur, exists := clientPool[addr]; exists && cur == entry {
			delete(clientPool, addr)
		}
		clientPoolMu.Unlock()
		if cl != nil {
			go cl.Close()
		}
	}
}

func dialCachedTCPPort(ctx context.Context, addr, derpMapURL string, port uint16, logf logger.Logf) (net.Conn, error) {
	cl, err := getOrConnectClient(ctx, addr, derpMapURL, logf)
	if err != nil {
		return nil, err
	}
	conn, err := cl.DialTCPPort(ctx, port)
	if err != nil {
		dropCachedClient(addr, cl)
		cl, err = getOrConnectClient(ctx, addr, derpMapURL, logf)
		if err != nil {
			return nil, err
		}
		conn, err = cl.DialTCPPort(ctx, port)
		if err != nil {
			return nil, err
		}
	}
	return conn, nil
}

func tailcatCloseAll(this js.Value, args []js.Value) any {
	clientPoolMu.Lock()
	entries := make([]*cachedClientEntry, 0, len(clientPool))
	for k, e := range clientPool {
		entries = append(entries, e)
		delete(clientPool, k)
	}
	clientPoolMu.Unlock()

	go func() {
		for _, e := range entries {
			e.mu.Lock()
			cl := e.cl
			e.cl = nil
			e.ready = false
			e.mu.Unlock()
			if cl != nil {
				_ = cl.Close()
			}
		}
	}()
	return js.Undefined()
}

// tailcatPreconnect warms up the WireGuard + DERP control channel in the background.
func tailcatPreconnect(this js.Value, args []js.Value) any {
	if len(args) < 1 {
		return rejectedPromise(errors.New("tailcatPreconnect requires addr"))
	}
	var addr, derpMapURL string
	if args[0].Type() == js.TypeString {
		addr = args[0].String()
	} else if args[0].Type() == js.TypeObject {
		addr = optString(args[0], "addr")
		derpMapURL = optString(args[0], "derpMapURL")
	}
	if addr == "" {
		return rejectedPromise(errors.New("missing addr"))
	}

	return makePromise(func() (any, error) {
		ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		defer cancel()
		if _, err := getOrConnectClient(ctx, addr, derpMapURL, logger.Discard); err != nil {
			return nil, err
		}
		return js.ValueOf(true), nil
	})
}

// tailcatSignalWebRTC dials virtual TCP port 41890 over the encrypted Tailcat tunnel
// to exchange a WebRTC SDP Offer for an SDP Answer with the Mac's native pion/webrtc engine.
func tailcatSignalWebRTC(this js.Value, args []js.Value) any {
	if len(args) != 1 || args[0].Type() != js.TypeObject {
		return rejectedPromise(errors.New("tailcatSignalWebRTC requires an options object"))
	}
	opts := args[0]
	addr := optString(opts, "addr")
	sdp := optString(opts, "sdp")
	derpMapURL := optString(opts, "derpMapURL")
	lanOnly := opts.Get("lanOnly").Truthy()
	logf := optLogf(opts)

	return makePromise(func() (any, error) {
		if addr == "" || sdp == "" {
			return nil, errors.New("missing addr or sdp")
		}

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		conn, err := dialCachedTCPPort(ctx, addr, derpMapURL, 41890, logf)
		if err != nil {
			return nil, fmt.Errorf("WebRTC 信令端口连接失败: %w", err)
		}
		defer conn.Close()

		reqBytes, _ := json.Marshal(map[string]any{
			"sdp":     sdp,
			"lanOnly": lanOnly,
		})
		if _, err := io.Copy(conn, bytes.NewReader(reqBytes)); err != nil {
			return nil, fmt.Errorf("发送 WebRTC Offer 失败: %w", err)
		}
		if cw, ok := conn.(interface{ CloseWrite() error }); ok {
			_ = cw.CloseWrite()
		}

		var resp struct {
			OK       bool     `json:"ok"`
			SDP      string   `json:"sdp"`
			Mode     string   `json:"mode"`
			LANAddrs []string `json:"lanAddrs"`
			Error    string   `json:"error"`
		}
		if err := json.NewDecoder(io.LimitReader(conn, 256*1024)).Decode(&resp); err != nil {
			return nil, fmt.Errorf("解析 WebRTC Answer 失败: %w", err)
		}
		if !resp.OK || resp.SDP == "" {
			return nil, fmt.Errorf("WebRTC 协商失败: %s", resp.Error)
		}

		return js.ValueOf(map[string]any{
			"ok":   true,
			"sdp":  resp.SDP,
			"mode": resp.Mode,
		}), nil
	})
}

func tailcatRPC(this js.Value, args []js.Value) any {
	if len(args) != 1 || args[0].Type() != js.TypeObject {
		return rejectedPromise(errors.New("tailcatRPC requires an options object"))
	}
	opts := args[0]
	addr := optString(opts, "addr")
	payload := optString(opts, "payload")
	derpMapURL := optString(opts, "derpMapURL")
	logf := optLogf(opts)

	return makePromise(func() (any, error) {
		if addr == "" || payload == "" {
			return nil, errors.New("missing addr or payload")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
		defer cancel()

		conn, err := dialCachedTCPPort(ctx, addr, derpMapURL, 41892, logf)
		if err != nil {
			return nil, fmt.Errorf("RPC 端口连接失败: %w", err)
		}
		defer conn.Close()

		if _, err := io.Copy(conn, strings.NewReader(payload)); err != nil {
			return nil, err
		}
		if cw, ok := conn.(interface{ CloseWrite() error }); ok {
			_ = cw.CloseWrite()
		}
		respBytes, err := io.ReadAll(io.LimitReader(conn, 36*1024*1024))
		if err != nil {
			return nil, err
		}
		return js.ValueOf(string(respBytes)), nil
	})
}

func tailcatConnectSSH(this js.Value, args []js.Value) any {
	if len(args) != 1 || args[0].Type() != js.TypeObject {
		return rejectedPromise(errors.New("tailcatConnectSSH requires an options object"))
	}
	opts := args[0]
	addr := optString(opts, "addr")
	derpMapURL := optString(opts, "derpMapURL")
	termType := optString(opts, "term")
	if termType == "" {
		termType = "xterm-256color"
	}
	cols := optInt(opts, "cols", 80)
	rows := optInt(opts, "rows", 24)
	logf := optLogf(opts)

	onStage := opts.Get("onStage")
	onData := opts.Get("onData")
	onClose := opts.Get("onClose")

	notifyStage := func(stage string) {
		if onStage.Type() == js.TypeFunction {
			onStage.Invoke(stage)
		}
	}

	return makePromise(func() (any, error) {
		if addr == "" {
			return nil, errors.New("缺少设备连接地址")
		}
		if onData.Type() != js.TypeFunction {
			return nil, errors.New("onData callback is required")
		}

		notifyStage("derp_handshake")
		ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
		defer cancel()

		notifyStage("tcp_dial")
		tcpConn, err := dialCachedTCPPort(ctx, addr, derpMapURL, 22, logf)
		if err != nil {
			return nil, fmt.Errorf("终端端口连接失败: %w", err)
		}

		notifyStage("ssh_handshake")
		sshConf := &ssh.ClientConfig{
			User:            "machead",
			Auth:            nil,
			HostKeyCallback: ssh.InsecureIgnoreHostKey(),
			Timeout:         20 * time.Second,
		}

		sshConn, chans, reqs, err := ssh.NewClientConn(tcpConn, "tailcat:22", sshConf)
		if err != nil {
			tcpConn.Close()
			return nil, fmt.Errorf("终端握手失败: %w", err)
		}
		sshClient := ssh.NewClient(sshConn, chans, reqs)

		sess, err := sshClient.NewSession()
		if err != nil {
			sshClient.Close()
			return nil, fmt.Errorf("创建终端会话失败: %w", err)
		}

		modes := ssh.TerminalModes{
			ssh.ECHO:          1,
			ssh.TTY_OP_ISPEED: 115200,
			ssh.TTY_OP_OSPEED: 115200,
		}
		if err := sess.RequestPty(termType, rows, cols, modes); err != nil {
			sess.Close()
			sshClient.Close()
			return nil, fmt.Errorf("分配终端失败: %w", err)
		}

		stdinPipe, err := sess.StdinPipe()
		if err != nil {
			sess.Close()
			sshClient.Close()
			return nil, fmt.Errorf("绑定终端输入流失败: %w", err)
		}
		stdoutPipe, err := sess.StdoutPipe()
		if err != nil {
			sess.Close()
			sshClient.Close()
			return nil, fmt.Errorf("绑定终端输出流失败: %w", err)
		}
		stderrPipe, err := sess.StderrPipe()
		if err != nil {
			sess.Close()
			sshClient.Close()
			return nil, fmt.Errorf("绑定终端错误流失败: %w", err)
		}

		if err := sess.Shell(); err != nil {
			sess.Close()
			sshClient.Close()
			return nil, fmt.Errorf("启动远端终端失败: %w", err)
		}

		var (
			closeOnce sync.Once
			writeFn   js.Func
			resizeFn  js.Func
			closeFn   js.Func
		)
		cleanup := func(reason string) {
			closeOnce.Do(func() {
				_ = stdinPipe.Close()
				_ = sess.Close()
				_ = sshClient.Close()
				_ = tcpConn.Close()
				writeFn.Release()
				resizeFn.Release()
				closeFn.Release()
				if onClose.Type() == js.TypeFunction {
					onClose.Invoke(reason)
				}
			})
		}

		pumpOutput := func(r io.Reader) {
			buf := make([]byte, 32*1024)
			for {
				n, err := r.Read(buf)
				if n > 0 {
					u8 := js.Global().Get("Uint8Array").New(n)
					js.CopyBytesToJS(u8, buf[:n])
					onData.Invoke(u8)
				}
				if err != nil {
					return
				}
			}
		}

		go pumpOutput(stdoutPipe)
		go pumpOutput(stderrPipe)
		go func() {
			err := sess.Wait()
			if err != nil && !errors.Is(err, io.EOF) {
				cleanup(fmt.Sprintf("终端会话已结束 (%v)", err))
			} else {
				cleanup("终端会话已正常退出")
			}
		}()

		notifyStage("connected")

		writeFn = js.FuncOf(func(this js.Value, args []js.Value) any {
			if len(args) != 1 {
				return rejectedPromise(errors.New("write requires a Uint8Array"))
			}
			b := make([]byte, args[0].Get("length").Int())
			js.CopyBytesToGo(b, args[0])
			return makePromise(func() (any, error) {
				if _, err := stdinPipe.Write(b); err != nil {
					return nil, err
				}
				return js.Undefined(), nil
			})
		})
		resizeFn = js.FuncOf(func(this js.Value, args []js.Value) any {
			if len(args) < 2 {
				return rejectedPromise(errors.New("resize requires (cols, rows)"))
			}
			newCols := args[0].Int()
			newRows := args[1].Int()
			if newCols <= 0 || newRows <= 0 {
				return js.Global().Get("Promise").Call("resolve")
			}
			return makePromise(func() (any, error) {
				if err := sess.WindowChange(newRows, newCols); err != nil {
					return nil, err
				}
				return js.Undefined(), nil
			})
		})
		closeFn = js.FuncOf(func(this js.Value, args []js.Value) any {
			go cleanup("用户主动断开连接")
			return nil
		})

		return js.ValueOf(map[string]any{
			"transport": "derp",
			"write":     writeFn,
			"resize":    resizeFn,
			"close":     closeFn,
		}), nil
	})
}

func pingUntil(ctx context.Context, cl *tailcat.Client) error {
	for {
		pctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		_, err := cl.Ping(pctx)
		cancel()
		if err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("ping: %w", ctx.Err())
		case <-time.After(250 * time.Millisecond):
		}
	}
}

func optString(v js.Value, name string) string {
	if p := v.Get(name); p.Type() == js.TypeString {
		return p.String()
	}
	return ""
}

func optInt(v js.Value, name string, fallback int) int {
	if p := v.Get(name); p.Type() == js.TypeNumber {
		val := p.Int()
		if val > 0 {
			return val
		}
	}
	return fallback
}

func optLogf(v js.Value) logger.Logf {
	if v.Get("verbose").Truthy() {
		return log.Printf
	}
	return logger.Discard
}

func makePromise(f func() (any, error)) js.Value {
	var handler js.Func
	handler = js.FuncOf(func(this js.Value, args []js.Value) any {
		resolve, reject := args[0], args[1]
		go func() {
			if res, err := f(); err == nil {
				resolve.Invoke(res)
			} else {
				reject.Invoke(js.Global().Get("Error").New(err.Error()))
			}
		}()
		return nil
	})
	defer handler.Release()
	return js.Global().Get("Promise").New(handler)
}

func rejectedPromise(err error) js.Value {
	return js.Global().Get("Promise").Call("reject", js.Global().Get("Error").New(err.Error()))
}

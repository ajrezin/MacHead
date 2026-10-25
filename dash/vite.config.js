import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'
import http from 'http'
import {
  onRequestGet as authGet,
  onRequestPost as authPost,
  onRequestOptions as authOptions,
  handleOAuthLogin,
  handleOAuthCallback,
} from './functions/api/auth.js'
import {
  onRequestGet as devicesGet,
  onRequestPost as devicesPost,
  onRequestDelete as devicesDelete,
  onRequestOptions as devicesOptions,
} from './functions/api/devices.js'

function loadDevVars() {
  const env = { ...process.env }
  const candidates = [
    resolve(import.meta.dirname, '.dev.vars'),
    resolve(import.meta.dirname, '../website/.dev.vars'),
  ]
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) continue
      const key = line.slice(0, eqIdx).trim()
      let val = line.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!env[key]) {
        env[key] = val
      }
    }
  }
  return env
}

let oauthBridgeServer = null

function localPagesFunctionsPlugin() {
  const handleApiRequest = async (req, res, defaultHost = 'localhost:5174') => {
    const urlObj = new URL(req.url || '/', `http://${req.headers.host || defaultHost}`)
    const pathname = urlObj.pathname

    const callbackMatch = pathname.match(/^\/api\/auth\/(github|google|apple)\/callback$/)
    const redirectMatch = pathname.match(/^\/api\/auth\/(github|google|apple)\/redirect$/)
    const isAuth = pathname === '/api/auth' || Boolean(callbackMatch) || Boolean(redirectMatch)
    const isDevices = pathname === '/api/devices'

    if (!isAuth && !isDevices) {
      return false
    }

    try {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const rawBody = Buffer.concat(chunks)

      const webReq = new Request(urlObj.toString(), {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : rawBody,
      })

      const env = loadDevVars()
      const ctx = { request: webReq, env }
      let webResp

      if (callbackMatch) {
        webResp = await handleOAuthCallback(webReq, env, callbackMatch[1])
      } else if (redirectMatch) {
        webResp = await handleOAuthLogin(webReq, env, redirectMatch[1])
      } else if (isAuth) {
        if (req.method === 'POST') webResp = await authPost(ctx)
        else if (req.method === 'GET') webResp = await authGet(ctx)
        else if (req.method === 'OPTIONS') webResp = await authOptions(ctx)
      } else if (isDevices) {
        if (req.method === 'POST') webResp = await devicesPost(ctx)
        else if (req.method === 'GET') webResp = await devicesGet(ctx)
        else if (req.method === 'DELETE') webResp = await devicesDelete(ctx)
        else if (req.method === 'OPTIONS') webResp = await devicesOptions(ctx)
      }

      if (!webResp) {
        res.statusCode = 405
        res.end('Method Not Allowed')
        return true
      }

      res.statusCode = webResp.status
      webResp.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })
      const respBuf = Buffer.from(await webResp.arrayBuffer())
      res.end(respBuf)
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
    }
    return true
  }

  const attachMiddleware = (middlewares) => {
    // Also listen on [::1]:8788 so Google OAuth's registered http://localhost:8788/api/auth/google/callback resolves to this process
    if (!oauthBridgeServer) {
      oauthBridgeServer = http.createServer(async (req, res) => {
        const handled = await handleApiRequest(req, res, 'localhost:8788')
        if (!handled) {
          res.statusCode = 302
          res.setHeader('Location', `http://localhost:5174${req.url || '/'}`)
          res.end()
        }
      })
      oauthBridgeServer.on('error', () => {})
      oauthBridgeServer.listen(8788, '::1')
    }

    middlewares.use(async (req, res, next) => {
      const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost:5174'}`)

      if (['/login', '/dash', '/terminal', '/devices'].includes(urlObj.pathname)) {
        req.url = '/index.html' + urlObj.search
        return next()
      }

      const handled = await handleApiRequest(req, res, 'localhost:5174')
      if (handled) return

      next()
    })
  }

  return {
    name: 'local-cloudflare-pages-functions',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    },
  }
}

export default defineConfig({
  base: '/',
  server: {
    port: 5174,
  },
  plugins: [localPagesFunctionsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
})

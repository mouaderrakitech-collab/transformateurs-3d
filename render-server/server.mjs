// Serveur de rendu distant — s'exécute sur le pod GPU RunPod (fonctionne aussi en local pour les tests).
//
//  • HTTP  : /health (état public, sans secret) et fichiers de l'application (page moteur ?renderer=1)
//  • WS    : /ws?token=… signalisation WebRTC, relais des commandes, mode de secours JPEG
//  • Lance un navigateur Chromium à accélération GPU qui exécute la scène 3D et la diffuse en WebRTC
//  • Télémétrie nvidia-smi, arrêt automatique (inactivité, durée maximale)
//
// Variables d'environnement : voir render-server/README.md

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { chromium } from 'playwright-core'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const env = process.env
const PORT = +(env.PORT ?? 8080)
const DIST = path.resolve(HERE, env.DIST_DIR ?? '../dist')
const rnd = () => crypto.randomBytes(18).toString('base64url')
const PRESENTER_TOKEN = env.PRESENTER_TOKEN || rnd()
const VIEWER_TOKEN = env.VIEWER_TOKEN || rnd()
const RENDERER_KEY = rnd() // connu uniquement du navigateur moteur lancé par ce processus
const TURN_SECRET = env.TURN_SECRET || ''
const TURN_HOST = env.TURN_PUBLIC_HOST || env.RUNPOD_PUBLIC_IP || ''
const TURN_PORT = env.TURN_PUBLIC_PORT || env.RUNPOD_TCP_PORT_3478 || ''
const FORCE_RELAY = (env.FORCE_RELAY ?? (TURN_SECRET && TURN_HOST ? '1' : '0')) === '1'
const IDLE_STOP_MIN = +(env.IDLE_STOP_MIN ?? 15)
const MAX_SESSION_MIN = +(env.MAX_SESSION_MIN ?? 180)
const START = Date.now()
const SESSION_ENDS_AT = START + MAX_SESSION_MIN * 60_000
const POD_ID = env.RUNPOD_POD_ID || ''
const HEADLESS = env.HEADLESS !== '0'
// Fournisseur affiché dans la présentation (aucune logique spécifique hormis l'arrêt du pod RunPod)
const PROVIDER = env.CLOUD_PROVIDER || (POD_ID ? 'RunPod' : 'local')

const PROFILES = {
  high: { width: 1920, height: 1080 },
  balanced: { width: 1920, height: 1080 },
  low: { width: 1280, height: 720 },
}
let profile = PROFILES[env.PROFILE] ? env.PROFILE : 'balanced'

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

// ───────────────────────────────────────────── État
const clients = new Map() // id → { ws, role, jpeg, ip }
let renderer = null // ws du moteur
let rendererInfo = { ready: false, gpu: '', flags: '', software: false }
let host = {}
let lastActivity = Date.now()
let stopping = false
const failures = new Map() // ip → { n, until }

// ───────────────────────────────────────────── TURN (identifiants temporaires, schéma « REST API » de coturn)
function iceServersFor(role) {
  if (role === 'renderer' || !TURN_SECRET || !TURN_HOST || !TURN_PORT) return []
  const username = `${Math.floor(Date.now() / 1000) + 4 * 3600}:${role}`
  const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64')
  return [{ urls: [`turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`], username, credential }]
}

// ───────────────────────────────────────────── HTTP
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm' }

function health() {
  return {
    ok: true,
    rendererReady: rendererInfo.ready,
    gpu: rendererInfo.gpu,
    softwareRendering: rendererInfo.software,
    clients: clients.size,
    uptimeS: Math.round((Date.now() - START) / 1000),
    idleStopMin: IDLE_STOP_MIN,
    sessionEndsAt: SESSION_ENDS_AT,
    profile,
    transport: FORCE_RELAY ? 'turn-tcp' : 'direct',
    host: { gpuUtil: host.gpuUtil, gpuMemMb: host.gpuMemMb, encUtil: host.encUtil, chromeOnGpu: host.chromeOnGpu, name: host.name },
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  // CORS : la présentation publique (GitHub Pages) interroge /health. Aucune donnée secrète n'est exposée.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(health()))
  }
  let file = path.join(DIST, decodeURIComponent(url.pathname))
  if (!file.startsWith(DIST)) return res.writeHead(403).end()
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!fs.existsSync(file)) return res.writeHead(404).end('Not found')
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
})

// ───────────────────────────────────────────── WebSocket
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 * 1024 })

function safeEq(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

function roleFor(token, ip) {
  if (safeEq(token, RENDERER_KEY) && (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1')) return 'renderer'
  if (safeEq(token, PRESENTER_TOKEN)) return 'presenter'
  if (safeEq(token, VIEWER_TOKEN)) return 'viewer'
  return null
}

const send = (ws, m) => ws?.readyState === 1 && ws.send(JSON.stringify(m))
const toRenderer = (m) => send(renderer, m)

function updateJpeg() {
  const any = [...clients.values()].some((c) => c.jpeg)
  toRenderer({ type: 'jpeg', on: any })
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress ?? ''
  const f = failures.get(ip)
  if (f && f.until > Date.now()) return ws.close(4429, 'Trop de tentatives')
  const token = new URL(req.url, 'http://x').searchParams.get('token') ?? ''
  const role = roleFor(token, ip)
  if (!role) {
    const n = (f?.n ?? 0) + 1
    failures.set(ip, { n, until: n >= 5 ? Date.now() + 60_000 : 0 })
    log('connexion refusée', ip)
    return ws.close(4401, 'Jeton invalide')
  }
  failures.delete(ip)

  if (role === 'renderer') {
    renderer = ws
    send(ws, { type: 'hello', role, clientId: 'renderer', iceServers: iceServersFor('renderer'), rendererReady: true, profile, forceRelay: false })
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // image JPEG de secours → abonnés
        for (const c of clients.values()) if (c.jpeg && c.ws.bufferedAmount < 400_000) c.ws.send(data, { binary: true })
        return
      }
      const m = JSON.parse(data.toString())
      const c = m.to && clients.get(m.to)
      if (!c) return
      if (m.type === 'answer' || m.type === 'ice' || m.type === 'dc') send(c.ws, m)
    })
    ws.on('close', () => {
      if (renderer === ws) renderer = null
      for (const c of clients.values()) send(c.ws, { type: 'renderer-status', ready: false })
    })
    for (const c of clients.values()) c.ws.close(4000, 'Moteur redémarré')
    return
  }

  const id = rnd().slice(0, 10)
  clients.set(id, { ws, role, jpeg: false, ip })
  lastActivity = Date.now()
  log(`client ${id} (${role}) connecté — ${clients.size} client(s)`)
  send(ws, { type: 'hello', role, clientId: id, iceServers: iceServersFor(role), rendererReady: rendererInfo.ready, profile, forceRelay: FORCE_RELAY })

  ws.on('message', (data, isBinary) => {
    if (isBinary || data.length > 256 * 1024) return
    let m
    try { m = JSON.parse(data.toString()) } catch { return }
    if (role === 'presenter') lastActivity = Date.now()
    switch (m.type) {
      case 'offer':
        toRenderer({ type: 'offer', sdp: m.sdp, from: id, role })
        break
      case 'ice':
        toRenderer({ type: 'ice', candidate: m.candidate, from: id })
        break
      case 'dc':
        toRenderer({ type: 'dc', msg: m.msg, from: id, role }) // le rôle est fixé par le serveur, pas par le client
        break
      case 'jpeg':
        clients.get(id).jpeg = !!m.on
        updateJpeg()
        break
      case 'profile':
        if (role === 'presenter' && PROFILES[m.profile]) setProfile(m.profile)
        break
    }
  })
  ws.on('close', () => {
    clients.delete(id)
    toRenderer({ type: 'leave', from: id })
    updateJpeg()
    lastActivity = Date.now()
    log(`client ${id} déconnecté — ${clients.size} client(s)`)
  })
})

// ───────────────────────────────────────────── Navigateur moteur (GPU)
let browser = null
let page = null

function chromePath() {
  if (env.CHROME_PATH) return env.CHROME_PATH
  const roots = ['/ms-playwright', path.join(os.homedir(), '.cache/ms-playwright')]
  for (const r of roots) {
    if (!fs.existsSync(r)) continue
    for (const d of fs.readdirSync(r).filter((x) => x.startsWith('chromium-')).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = path.join(r, d, sub)
        if (fs.existsSync(p)) return p
      }
    }
  }
  return undefined // Windows local : canal « chrome » installé
}

// Jeux d'options GPU essayés dans l'ordre ; le premier qui donne un rendu matériel est conservé.
const FLAG_SETS = process.platform === 'linux'
  ? [
      ['--use-angle=vulkan', '--enable-features=Vulkan,VulkanFromANGLE', '--disable-vulkan-surface', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
      ['--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
      ['--use-gl=egl', '--ignore-gpu-blocklist'],
    ]
  : [['--ignore-gpu-blocklist']]

const isSoftware = (g) => /swiftshader|llvmpipe|software|basic render/i.test(g)

async function launchRenderer() {
  rendererInfo = { ready: false, gpu: '', flags: '', software: false }
  const sets = env.GPU_FLAGS ? [env.GPU_FLAGS.split(' ')] : FLAG_SETS
  const exe = chromePath()
  for (const flags of sets) {
    try {
      await browser?.close().catch(() => undefined)
      const common = ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']
      browser = await chromium.launch({ headless: HEADLESS, executablePath: exe, channel: exe ? undefined : 'chrome', args: [...common, ...flags] })
      const vp = PROFILES[profile]
      page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 })
      page.on('console', (m) => m.type() === 'error' && log('[moteur]', m.text()))
      page.on('crash', () => { log('moteur planté, relance'); setTimeout(launchRenderer, 2000) })
      await page.goto(`http://127.0.0.1:${PORT}/?renderer=1&key=${encodeURIComponent(RENDERER_KEY)}`)
      await page.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 45_000 })
      const gpu = await page.evaluate(() => window.__tele.getState().gpu)
      log('moteur prêt — GPU :', gpu, '— options :', flags.join(' '))
      rendererInfo = { ready: true, gpu, flags: flags.join(' '), software: isSoftware(gpu) }
      if (!isSoftware(gpu) || sets.length === 1) break
      log('rendu logiciel détecté, essai des options suivantes…')
    } catch (e) {
      log('échec du lancement avec', flags.join(' '), '—', e.message.split('\n')[0])
    }
  }
  if (!rendererInfo.ready) log('ERREUR : aucun moteur de rendu opérationnel')
  else if (rendererInfo.software) log('ATTENTION : rendu logiciel (pas de GPU) — la télémétrie le signale aux clients')
}

async function setProfile(p) {
  profile = p
  const vp = PROFILES[p]
  await page?.setViewportSize({ width: vp.width, height: vp.height }).catch(() => undefined)
  toRenderer({ type: 'profile', profile: p })
  for (const c of clients.values()) send(c.ws, { type: 'profile', profile: p })
  log('profil de diffusion :', p)
}

// ───────────────────────────────────────────── Télémétrie GPU (nvidia-smi)
function run(cmd, args) {
  return new Promise((resolve) => execFile(cmd, args, { timeout: 4000 }, (err, out) => resolve(err ? null : out)))
}
async function pollGpu() {
  const q = await run('nvidia-smi', ['--query-gpu=name,utilization.gpu,memory.used,utilization.encoder', '--format=csv,noheader,nounits'])
  const q2 = q ?? (await run('nvidia-smi', ['--query-gpu=name,utilization.gpu,memory.used', '--format=csv,noheader,nounits']))
  if (q2) {
    const [name, util, mem, enc] = q2.trim().split('\n')[0].split(',').map((s) => s.trim())
    host = { ...host, name, gpuUtil: +util, gpuMemMb: +mem, encUtil: enc !== undefined && !isNaN(+enc) ? +enc : undefined }
  }
  // Processus utilisant le GPU : preuve que le navigateur moteur rend sur le GPU
  const pm = await run('nvidia-smi', ['pmon', '-c', '1'])
  if (pm) host.chromeOnGpu = /chrom|headless_shell/i.test(pm)
  toRenderer({ type: 'host', d: { gpuUtil: host.gpuUtil, gpuMemMb: host.gpuMemMb, encUtil: host.encUtil, hostname: os.hostname(), podId: POD_ID || undefined, provider: PROVIDER, idleStopMin: IDLE_STOP_MIN, sessionEndsAt: SESSION_ENDS_AT } })
}

// ───────────────────────────────────────────── Arrêt automatique (protection des coûts)
async function stopPod(reason) {
  if (stopping) return
  stopping = true
  log('ARRÊT AUTOMATIQUE :', reason)
  for (const c of clients.values()) send(c.ws, { type: 'error', message: `Session GPU arrêtée : ${reason}` })
  const key = env.RUNPOD_API_KEY // clé limitée à ce pod, injectée par RunPod
  if (POD_ID && key) {
    // Suppression (aucun coût résiduel) ; à défaut, arrêt simple.
    for (const [method, url] of [['DELETE', `https://rest.runpod.io/v1/pods/${POD_ID}`], ['POST', `https://rest.runpod.io/v1/pods/${POD_ID}/stop`]]) {
      try {
        const r = await fetch(url, { method, headers: { Authorization: `Bearer ${key}` } })
        log('API RunPod', method, url, '→', r.status)
        if (r.ok) break
      } catch (e) {
        log('échec API RunPod', e.message)
      }
    }
  }
  setTimeout(() => process.exit(0), 3000)
}

setInterval(() => {
  const idleMin = (Date.now() - lastActivity) / 60_000
  if (IDLE_STOP_MIN > 0 && clients.size === 0 && idleMin >= IDLE_STOP_MIN) stopPod(`aucune activité depuis ${IDLE_STOP_MIN} min`)
  if (MAX_SESSION_MIN > 0 && Date.now() >= SESSION_ENDS_AT) stopPod(`durée maximale de ${MAX_SESSION_MIN} min atteinte`)
}, 30_000)

// ───────────────────────────────────────────── Démarrage
server.listen(PORT, '0.0.0.0', async () => {
  log(`serveur de rendu sur le port ${PORT} — fichiers : ${DIST}`)
  log(`TURN : ${TURN_HOST && TURN_PORT ? `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp` : 'non configuré (connexion directe)'} — relais forcé : ${FORCE_RELAY}`)
  log(`arrêt si inactif : ${IDLE_STOP_MIN} min — durée max : ${MAX_SESSION_MIN} min`)
  if (!env.PRESENTER_TOKEN) {
    // Jetons générés localement (tests) : affichés une seule fois dans la console, jamais écrits sur disque.
    log('jeton présentateur :', PRESENTER_TOKEN)
    log('jeton spectateur   :', VIEWER_TOKEN)
  }
  setInterval(pollGpu, 2000)
  await launchRenderer()
})

process.on('SIGTERM', async () => {
  await browser?.close().catch(() => undefined)
  process.exit(0)
})

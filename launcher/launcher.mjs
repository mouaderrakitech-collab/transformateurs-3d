#!/usr/bin/env node
// Lanceur local de la présentation (version USB portable et poste de développement).
//
//  • Sert l'application sur http://127.0.0.1:<port> (aucune exposition réseau)
//  • Ouvre le navigateur (Edge en mode application plein écran si disponible)
//  • API locale /api/launcher/* : démarrage / état / arrêt d'une session RunPod.
//    La clé API est saisie dans l'interface à chaque démarrage, utilisée pour l'appel, puis oubliée :
//    elle n'est jamais écrite sur la clé USB.
//
// Usage : node launcher/launcher.mjs [--dir <dossier-app>] [--port 4310] [--open] [--no-cloud]

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const arg = (n, d) => {
  const i = process.argv.indexOf(n)
  return i > 0 ? process.argv[i + 1] : d
}
const DIR = path.resolve(arg('--dir', fs.existsSync(path.join(HERE, '../app')) ? path.join(HERE, '../app') : path.join(HERE, '../dist')))
const PORT0 = +arg('--port', 4310)
const OPEN = process.argv.includes('--open') && !process.env.NO_OPEN // NO_OPEN : tests automatisés
const CLOUD = !process.argv.includes('--no-cloud')

let lib = null
if (CLOUD) {
  try {
    lib = await import(new URL('../cloud/runpod-lib.mjs', import.meta.url))
  } catch {
    lib = null
  }
}
let session = null // { podId, serverUrl, tokens } — en mémoire uniquement

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'video/webm', '.json': 'application/json',
  '.tgz': 'application/gzip', '.wasm': 'application/wasm',
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = ''
    req.on('data', (c) => {
      d += c
      if (d.length > 10_000) reject(new Error('trop volumineux'))
    })
    req.on('end', () => {
      try { resolve(d ? JSON.parse(d) : {}) } catch (e) { reject(e) }
    })
  })
}

async function launcherApi(req, res, action, port) {
  // Protection : seule la page servie par ce lanceur peut appeler l'API (pas un autre site web).
  const origin = req.headers.origin
  if (origin && origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) return json(res, 403, { error: 'Origine refusée' })
  if (!lib) return json(res, 404, { available: false })
  if (req.method === 'GET') return json(res, 200, { available: true, session: session ? { serverUrl: session.serverUrl } : null })
  let body
  try { body = await readBody(req) } catch { return json(res, 400, { error: 'Requête invalide' }) }
  const key = String(body.apiKey ?? '').trim()
  body.apiKey = undefined
  if (!key) return json(res, 400, { error: 'Clé API requise' })
  try {
    if (action === 'status') {
      const pods = await lib.listSessionPods(key)
      const acc = await lib.account(key)
      return json(res, 200, { message: pods.length ? `Session(s) en cours : ${pods.map((p) => `${p.id} (${p.costPerHr ?? '?'} $/h)`).join(', ')} — solde ${acc.clientBalance} $` : `Aucune session en cours — solde ${acc.clientBalance} $`, ...(session ? { serverUrl: session.serverUrl, presenterToken: session.tokens.presenter } : {}) })
    }
    if (action === 'stop') {
      const ids = await lib.stopAll(key)
      session = null
      return json(res, 200, { message: ids.length ? `Pods supprimés : ${ids.join(', ')}. Facturation arrêtée.` : 'Aucun pod à arrêter.' })
    }
    if (action === 'start') {
      const e = await lib.estimate(key)
      if (e.account.clientBalance <= 0) return json(res, 402, { error: 'Solde RunPod nul : approvisionner le compte.' })
      const running = await lib.listSessionPods(key)
      if (running.length) return json(res, 409, { error: `Une session existe déjà (${running.map((p) => p.id).join(', ')}). L’arrêter ou utiliser son lien.` })
      if (!body.confirm) {
        const lines = e.prices.map((g) => `${g.id} : ${g.perHour.toFixed(2)} $/h`).join('\n')
        return json(res, 200, {
          needsConfirm: true,
          message: `Démarrer un GPU RunPod (ressource payante) ?\n\n${lines}\n\nArrêt automatique après ${lib.DEFAULTS.idleStopMin} min sans connexion ; durée max. ${e.maxSessionMin} min (coût max. ${e.maxSessionCost} $).\nSolde actuel : ${e.account.clientBalance} $.`,
        })
      }
      const s = await lib.startSession(key)
      session = { podId: s.pod.id, serverUrl: s.serverUrl, tokens: s.tokens }
      const h = await lib.waitReady(s.serverUrl)
      return json(res, 200, {
        message: `Session prête sur ${h.gpu}${h.softwareRendering ? ' (ATTENTION : rendu logiciel)' : ''}. Lien spectateur : ${lib.sessionLinks(lib.DEFAULTS.publicSite, s.serverUrl, s.tokens).viewer}`,
        serverUrl: s.serverUrl,
        presenterToken: s.tokens.presenter,
      })
    }
    return json(res, 404, { error: 'Action inconnue' })
  } catch (err) {
    return json(res, 500, { error: err.message })
  }
}

function serve(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api/launcher')) return launcherApi(req, res, url.pathname.split('/')[3] ?? '', port)
    let file = path.join(DIR, decodeURIComponent(url.pathname))
    if (!file.startsWith(DIR)) return res.writeHead(403).end()
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) return res.writeHead(404).end('Introuvable')
    const stat = fs.statSync(file)
    const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    // Requêtes partielles (lecture des vidéos)
    const range = req.headers.range
    if (range) {
      const [a, b] = range.replace('bytes=', '').split('-')
      const start = +a
      const end = b ? +b : stat.size - 1
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
      return fs.createReadStream(file, { start, end }).pipe(res)
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' })
    fs.createReadStream(file).pipe(res)
  })
  server.requestTimeout = 0 // le démarrage d'un pod peut durer plusieurs minutes
  server.headersTimeout = 0
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

function openBrowser(url) {
  if (process.platform !== 'win32') return spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
  const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
  if (edge) spawn(edge, [`--app=${url}`, '--start-maximized', '--autoplay-policy=no-user-gesture-required'], { detached: true, stdio: 'ignore' }).unref()
  else spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
}

if (!fs.existsSync(path.join(DIR, 'index.html'))) {
  console.error(`Application introuvable dans ${DIR}`)
  process.exit(2)
}
let port = PORT0
for (;;) {
  try {
    await serve(port)
    break
  } catch (e) {
    if (e.code === 'EADDRINUSE' && port < PORT0 + 20) port++
    else {
      console.error('Impossible de démarrer le serveur local :', e.message)
      process.exit(3)
    }
  }
}
const url = `http://127.0.0.1:${port}/`
console.log(`Présentation disponible : ${url}`)
console.log(`Dossier : ${DIR}`)
console.log(lib ? 'Sessions RunPod : disponibles (clé saisie dans l’interface, jamais enregistrée).' : 'Sessions RunPod : désactivées.')
console.log('Fermer cette fenêtre pour arrêter la présentation.')
if (OPEN) openBrowser(url)

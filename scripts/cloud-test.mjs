// Test local de la chaîne de rendu distant : serveur + moteur (Chrome headless) + présentateur + spectateur.
// Usage : node scripts/cloud-test.mjs [dossier-captures] [--fallback]
//   SRV=https://<pod>-8080.proxy.runpod.net  P=<jeton>  V=<jeton>  → teste un serveur distant existant
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2] ?? 'test-results/cloud'
const FALLBACK = process.argv.includes('--fallback')
const REMOTE = !!process.env.SRV
fs.mkdirSync(OUT, { recursive: true })
const APP = process.env.APP ?? 'http://localhost:4173/'
const SRV = process.env.SRV ?? 'http://localhost:8080'
const P = process.env.P ?? crypto.randomBytes(12).toString('hex')
const V = process.env.V ?? crypto.randomBytes(12).toString('hex')
const results = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function startServer() {
  if (REMOTE) return null
  const p = spawn(process.execPath, ['render-server/server.mjs'], {
    env: { ...process.env, PRESENTER_TOKEN: P, VIEWER_TOKEN: V, IDLE_STOP_MIN: '0', MAX_SESSION_MIN: '0', FORCE_RELAY: FALLBACK ? '1' : '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  p.stdout.on('data', (d) => fs.appendFileSync(path.join(OUT, 'server.log'), d))
  p.stderr.on('data', (d) => fs.appendFileSync(path.join(OUT, 'server.log'), d))
  return p
}
async function waitHealth(t = 90000) {
  const end = Date.now() + t
  while (Date.now() < end) {
    try {
      const j = await (await fetch(SRV + '/health')).json()
      if (j.rendererReady) return j
    } catch { /* pas encore prêt */ }
    await sleep(1000)
  }
  return null
}

fs.writeFileSync(path.join(OUT, 'server.log'), '')
let srv = startServer()
const h = await waitHealth()
ok('Serveur de rendu démarré, moteur prêt', !!h, h ? `GPU moteur : ${h.gpu}` : 'timeout')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const mk = async (token, name) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebSocket|Failed to load resource|ERR_CONNECTION|Failed to fetch/.test(m.text())) errors.push(name + ': ' + m.text())
  })
  await page.goto(APP + '#cloud=' + encodeURIComponent(SRV) + '&token=' + token, { waitUntil: 'networkidle' })
  return page
}
const cloud = (page) =>
  page.evaluate(() => {
    const s = window.__cloud.getState()
    return { status: s.status, role: s.role, transport: s.transport, relay: s.relay, stats: s.stats, tele: s.telemetry, msg: s.message, labels: s.labels.length }
  })
async function waitStatus(page, wanted, t = 40000) {
  const end = Date.now() + t
  while (Date.now() < end) {
    const c = await cloud(page)
    if (wanted.includes(c.status)) return c
    await sleep(500)
  }
  return cloud(page)
}

// ─ Présentateur
const pres = await mk(P, 'présentateur')
const c1 = await waitStatus(pres, ['streaming', 'fallback'], FALLBACK ? 45000 : 30000)
ok(
  FALLBACK ? 'Bascule en mode de secours (WebRTC bloqué)' : 'Flux WebRTC établi (présentateur)',
  FALLBACK ? c1.transport === 'jpeg' : c1.status === 'streaming',
  `${c1.status} / ${c1.transport}${c1.relay ? ' (TURN)' : ''} — ${c1.msg}`,
)
ok('Lien de session effacé de la barre d’adresse', !(await pres.evaluate(() => location.hash)).includes('token'))
await sleep(6000)
const c2 = await cloud(pres)
if (!FALLBACK) {
  const vw = await pres.evaluate(() => {
    const v = document.querySelector('[data-testid=remote-video]')
    return v ? [v.videoWidth, v.videoHeight] : [0, 0]
  })
  ok('Vidéo reçue', vw[0] > 0, `${vw[0]}×${vw[1]}, ${c2.stats.fps} i/s reçues, ${(c2.stats.kbps / 1000).toFixed(1)} Mbit/s, RTT ${c2.stats.rttMs} ms`)
}
ok('Télémétrie du moteur distant reçue', !!c2.tele?.gpu, `GPU distant : ${c2.tele?.gpu} — ${c2.tele?.fps} i/s rendues ${c2.tele?.width}×${c2.tele?.height}${c2.tele?.gpuUtil !== undefined ? ` — util. GPU ${c2.tele.gpuUtil} %` : ''}`)
ok('Latence commande → réponse mesurée', c2.stats.latencyMs > 0, `${c2.stats.latencyMs} ms`)
await pres.screenshot({ path: path.join(OUT, '1-presentateur.png') })

// Commandes → moteur : mode coupe + refroidissement, l'image doit changer
const img1 = await pres.locator('[data-testid=stage]').screenshot()
await pres.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ODAF', mode: 'coupe', view: 'avant', play: true }, true))
await sleep(3500)
const img2 = await pres.locator('[data-testid=stage]').screenshot()
ok('Commande de scène appliquée par le moteur distant (image modifiée)', Buffer.compare(img1, img2) !== 0)
await pres.screenshot({ path: path.join(OUT, '2-coupe-odaf.png') })

// Rotation et zoom à la souris transmis au moteur
const box = await pres.locator('[data-testid=stage]').boundingBox()
await pres.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await pres.mouse.down()
await pres.mouse.move(box.x + box.width / 2 + 400, box.y + box.height / 2, { steps: 15 })
await pres.mouse.up()
await sleep(1500)
const img3 = await pres.locator('[data-testid=stage]').screenshot()
ok('Rotation souris transmise au moteur distant', Buffer.compare(img2, img3) !== 0)
await pres.mouse.wheel(0, -800)
await sleep(1200)
await pres.screenshot({ path: path.join(OUT, '3-rotation-zoom.png') })

// Sélection par clic (lancer de rayon côté moteur)
await pres.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ONAN', mode: 'exterieur', view: 'avant' }, true))
await sleep(2500)
await pres.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6)
await sleep(1500)
const selected = await pres.evaluate(() => window.__app.getState().selectedPart)
ok('Sélection d’un composant sur l’image distante', !!selected, String(selected))

// Étiquettes projetées
await pres.evaluate(() => window.__app.getState().setScene({ view: 'iso', labels: true }, true))
await sleep(2500)
const cl = await cloud(pres)
ok('Étiquettes projetées par le moteur', cl.labels > 0, `${cl.labels} étiquettes`)

// ─ Spectateur : suit la diapositive du présentateur, ne pilote pas
const view = await mk(V, 'spectateur')
const cv = await waitStatus(view, ['streaming', 'fallback'], FALLBACK ? 45000 : 30000)
ok('Session spectateur', cv.role === 'viewer' && ['streaming', 'fallback'].includes(cv.status), `${cv.role} ${cv.status}`)
await pres.evaluate(() => window.__app.getState().goToSlide(21))
await sleep(2000)
const vs = await view.evaluate(() => window.__app.getState().slideIndex)
ok('Le spectateur suit la diapositive du présentateur', vs === 21, `spectateur sur la diapositive ${vs + 1}`)
await view.evaluate(() => window.__app.getState().goToSlide(2))
await sleep(1500)
const ps = await pres.evaluate(() => window.__app.getState().slideIndex)
ok('Le spectateur ne pilote pas la présentation', ps === 21)
await view.screenshot({ path: path.join(OUT, '4-spectateur.png') })
await view.close()

// ─ Jeton invalide
const bad = await mk('jeton-invalide', 'intrus')
const cb = await waitStatus(bad, ['denied'], 15000)
ok('Jeton invalide refusé', cb.status === 'denied', cb.msg)
await bad.close()

// ─ Perte du serveur puis reconnexion (test local uniquement)
if (!REMOTE) {
  srv.kill()
  await sleep(4000)
  const cd = await cloud(pres)
  ok('Perte de connexion détectée', ['reconnecting', 'unavailable', 'checking', 'connecting'].includes(cd.status), `${cd.status} — ${cd.msg}`)
  await pres.screenshot({ path: path.join(OUT, '5-coupure.png') })
  srv = startServer()
  await waitHealth()
  const cr = await waitStatus(pres, ['streaming', 'fallback'], 70000)
  ok('Reconnexion automatique après redémarrage du serveur', ['streaming', 'fallback'].includes(cr.status), cr.status)
  await sleep(2500)
  const after = await cloud(pres)
  ok('Télémétrie rétablie après reconnexion', !!after.tele, `${after.tele?.fps} i/s`)
}

ok('Aucune erreur JavaScript', errors.length === 0, errors.slice(0, 6).join(' | '))
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ date: new Date().toISOString(), server: SRV, fallback: FALLBACK, results, errors }, null, 2))
await browser.close()
srv?.kill()
process.exit(results.every((r) => r.pass) ? 0 : 1)

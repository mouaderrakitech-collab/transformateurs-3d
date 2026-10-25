// Test de la distribution portable : copie dans un autre dossier, lancement par le .bat avec un PATH sans Node.js,
// vérification de l'application servie, de l'API du lanceur et de la version autonome (file://).
// Usage : node scripts/portable-test.mjs [dossier-captures]
import { chromium } from 'playwright-core'
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const OUT = process.argv[2] ?? 'test-results/portable'
fs.mkdirSync(OUT, { recursive: true })
const results = []
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SRC = path.resolve('portable/Transformateurs3D')
const DEST = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'usb-')), 'Transformateurs3D')
fs.cpSync(SRC, DEST, { recursive: true })
ok('Copie de la distribution dans un autre emplacement', fs.existsSync(path.join(DEST, 'Lancer-Presentation.bat')), DEST)

// PATH minimal : aucun Node.js système accessible
const WIN = process.env.SystemRoot ?? process.env.SYSTEMROOT ?? 'C:\Windows'
// Environnement d'un PC « vierge » : PATH système uniquement ; pas de variable empêchant l'exécution
// depuis le dossier courant (NoDefaultCurrentDirectoryInExePath est propre à l'environnement de test).
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(path|nodedefaultcurrentdirectoryinexepath|nodefaultcurrentdirectoryinexepath)$/i.test(k)))
const sysPath = [path.join(WIN, "System32"), WIN].join(";")
let nodeFound = true
try { execSync('where node', { env: { ...cleanEnv, PATH: sysPath, PATHEXT: '.COM;.EXE;.BAT;.CMD' }, stdio: 'pipe' }) } catch { nodeFound = false }
ok('Node.js absent du PATH de test', !nodeFound)

const bat = spawn(path.join(WIN, 'System32', 'cmd.exe'), ['/c', 'Lancer-Presentation.bat'], { cwd: DEST, env: { ...cleanEnv, PATH: sysPath, PATHEXT: '.COM;.EXE;.BAT;.CMD', NO_OPEN: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
bat.stdout.on('data', (d) => (log += d))
bat.stderr.on('data', (d) => (log += d))
let url = null
for (let i = 0; i < 40 && !url; i++) { await sleep(500); url = log.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0] }
ok('Lanceur .bat démarré avec le Node.js embarqué', !!url, url ?? log.slice(0, 300))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
if (url) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  page.on('pageerror', (e) => errors.push('app: ' + e.message))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 30000 }).catch(() => undefined)
  const t = await page.evaluate(() => window.__tele.getState())
  ok('Application servie et rendu 3D local actif', t.fps > 0, `${t.gpu} — ${t.fps} i/s`)
  const api = await page.evaluate(async () => (await fetch('./api/launcher')).json())
  ok('API du lanceur disponible (session RunPod depuis la clé USB)', api.available === true)
  const noKey = await page.evaluate(async () => (await fetch('./api/launcher/start', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).status)
  ok('Démarrage refusé sans clé API', noKey === 400, `HTTP ${noKey}`)
  const foreign = await fetch(url + 'api/launcher/start', { method: 'POST', headers: { Origin: 'https://site-malveillant.example', 'Content-Type': 'application/json' }, body: '{"apiKey":"x"}' })
  ok('Appel depuis une autre origine refusé (protection CSRF)', foreign.status === 403, `HTTP ${foreign.status}`)
  const vid = await fetch(url + 'media/video/puissance-ONAN.webm', { headers: { Range: 'bytes=0-99' } })
  ok('Vidéos de secours servies (requêtes partielles)', vid.status === 206)
  // Mode de secours (images précalculées)
  await page.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'OFAF', mode: 'refroidissement' }, true))
  await page.getByText('Réglages').click()
  await page.getByText('Mode de secours : images et vidéos précalculées').click()
  await sleep(2500)
  const playing = await page.evaluate(() => { const v = document.querySelector('[data-testid=media-view] video'); return v ? !v.paused && v.readyState >= 2 : false })
  ok('Mode de secours : vidéo précalculée lue', playing)
  await page.screenshot({ path: path.join(OUT, 'portable-secours.png') })
  const files = fs.readdirSync(path.join(DEST, 'config')).map((f) => fs.readFileSync(path.join(DEST, 'config', f), 'utf8')).join('\n')
  ok('Aucune clé API dans la configuration portable', !/rpa_|apikey\s*=|RUNPOD_API_KEY/i.test(files))
}

// Version autonome (file://), sans serveur
const page2 = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page2.on('pageerror', (e) => errors.push('autonome: ' + e.message))
await page2.goto(pathToFileURL(path.join(DEST, 'app', 'autonome.html')).href)
await sleep(4000)
const t2 = await page2.evaluate(() => window.__tele?.getState())
ok('Version autonome (file://, sans serveur) : rendu 3D', (t2?.fps ?? 0) > 0, `${t2?.fps} i/s`)
await page2.keyboard.press('ArrowRight'); await sleep(400)
ok('Version autonome : navigation des diapositives', (await page2.evaluate(() => window.__app.getState().slideIndex)) === 1)
await page2.screenshot({ path: path.join(OUT, 'autonome.png') })

ok('Aucune erreur JavaScript', errors.length === 0, errors.slice(0, 5).join(' | '))
await browser.close()
bat.kill()
try { execSync(`taskkill /F /T /PID ${bat.pid}`, { stdio: 'ignore' }) } catch { /* déjà arrêté */ }
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ date: new Date().toISOString(), dest: DEST, results, errors }, null, 2))
process.exit(results.every((r) => r.pass) ? 0 : 1)

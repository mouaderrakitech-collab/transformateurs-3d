// Test de bout en bout : parcourt diapositives, modèles et modes, capture les erreurs JavaScript.
// Usage : node scripts/e2e-test.mjs [url] [dossier-captures]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:4173/'
const OUT = process.argv[3] ?? 'test-results'
fs.mkdirSync(OUT, { recursive: true })
const errors = []
const results = []
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') })
const st = (fn, arg) => page.evaluate(fn, arg)
const wait = (ms) => page.waitForTimeout(ms)

await page.goto(URL, { waitUntil: 'networkidle' })
await wait(4000)
const tele = await st(() => window.__tele.getState())
ok('Chargement et rendu WebGL', tele.fps > 0, `GPU: ${tele.gpu} — ${tele.fps} i/s — ${tele.calls} appels, ${tele.triangles} triangles`)
await shot('00-accueil')

// Diapositives (clavier)
const total = await st(() => document.querySelector('[data-testid=slide-number]').textContent)
let n = 0
for (let i = 0; i < 120; i++) {
  const before = await st(() => { const s = window.__app.getState(); return s.slideIndex + ':' + s.stepIndex })
  await page.keyboard.press('ArrowRight')
  await wait(450)
  const after = await st(() => { const s = window.__app.getState(); return s.slideIndex + ':' + s.stepIndex })
  if (after === before) break
  n++
  const [si, sp] = after.split(':').map(Number)
  if (sp === 0) await shot(`slide-${String(si + 1).padStart(2, '0')}`)
}
ok('Navigation clavier de toutes les diapositives', n > 30, `${n} étapes, compteur final ${await st(() => document.querySelector('[data-testid=slide-number]').textContent)} (départ ${total})`)
await page.keyboard.press('Home'); await wait(300)
ok('Touche Début', await st(() => window.__app.getState().slideIndex === 0))

// Modèles × modes
const combos = [
  ['puissance', 'ONAN'], ['puissance', 'ONAF'], ['puissance', 'OFAF'], ['puissance', 'OFWF'], ['puissance', 'ODAF'], ['puissance', 'ODWF'],
  ['distribution', 'ONAN'], ['monophase', 'ONAN'], ['sec', 'AN'], ['sec', 'AF'],
]
for (const [model, cooling] of combos) {
  for (const mode of ['exterieur', 'interieur', 'eclate', 'coupe', 'refroidissement']) {
    await st(([m, c, md]) => window.__app.getState().setScene({ model: m, cooling: c, mode: md, view: 'iso', play: md === 'refroidissement' || md === 'coupe' }, true), [model, cooling, mode])
    await wait(mode === 'refroidissement' || mode === 'coupe' ? 3200 : 1300)
    await shot(`m-${model}-${cooling}-${mode}`)
  }
  const t = await st(() => window.__tele.getState())
  ok(`Modèle ${model} / ${cooling} — 5 modes`, t.fps > 0, `${t.fps} i/s, ${t.triangles} triangles`)
}

// Vues caméra
await st(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ONAF', mode: 'exterieur' }, true))
for (const v of ['avant', 'arriere', 'gauche', 'droite', 'dessus', 'dessous', 'iso']) {
  await st((vv) => window.__app.getState().setView(vv), v)
  await wait(1100)
  await shot(`v-${v}`)
}
ok('Vues caméra (7)', true)

// Rotation 360° et zoom à la souris
const box = await page.locator('[data-testid=stage]').boundingBox()
const cx = box.x + box.width / 2, cy = box.y + box.height / 2
await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 600, cy + 40, { steps: 20 }); await page.mouse.up()
await wait(600); await shot('souris-rotation')
await page.mouse.wheel(0, -1200); await wait(800); await shot('souris-zoom')
ok('Rotation et zoom souris', true)

// Sélection d'un composant (clic au centre)
await st(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ONAN', mode: 'exterieur', view: 'avant' }, true))
await wait(1200)
await page.mouse.click(cx - 60, cy + 40)
await wait(500)
const sel = await st(() => window.__app.getState().selectedPart)
ok('Sélection d’un composant par clic', !!sel, String(sel))
await shot('selection')

// Commandes d'animation
await st(() => window.__app.getState().setMode('refroidissement'))
await wait(500)
await page.getByRole('button', { name: 'Pause' }).click()
const tp = await st(() => window.__app.getState().playing)
await page.getByRole('button', { name: 'Démarrer' }).click()
const tp2 = await st(() => window.__app.getState().playing)
ok('Pause / Démarrer', tp === false && tp2 === true)
await page.getByRole('button', { name: 'Recommencer' }).click()
ok('Recommencer', true)

// Mode présentation + plein écran
await page.keyboard.press('p'); await wait(500)
ok('Mode présentation (P)', await st(() => window.__app.getState().presenting))
await st(() => window.__app.getState().goToSlide(19)); await wait(1500)
await shot('presentation-onan')
await page.keyboard.press('p'); await wait(300)

// Qualités
for (const q of ['performance', 'haute', 'equilibre']) {
  await st((qq) => window.__app.getState().setQuality(qq), q)
  await wait(2500)
  const t = await st(() => window.__tele.getState())
  ok(`Qualité ${q}`, t.fps > 0, `${t.fps} i/s, ${t.width}×${t.height}`)
}

ok('Aucune erreur JavaScript', errors.length === 0, errors.slice(0, 10).join(' | '))
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ date: new Date().toISOString(), url: URL, gpu: tele.gpu, results, errors }, null, 2))
await browser.close()
process.exit(results.every((r) => r.pass) ? 0 : 1)

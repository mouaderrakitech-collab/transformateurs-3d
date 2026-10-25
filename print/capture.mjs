// Rendus haute résolution des modèles 3D pour le document PDF (moteur en mode capture, sans interface).
// Prérequis : `npm run build` puis `npm run preview` (http://localhost:4173/).
// Sortie : print/captures/img/<id>.jpg + print/captures/figures.json (étiquettes projetées en %).
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:4173/'
const ONLY = process.argv.slice(3)
const FIG = JSON.parse(fs.readFileSync('print/figures.json', 'utf8'))
const OUT = path.resolve('print/captures')
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true })
const metaPath = path.join(OUT, 'figures.json')
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist'] })
// 1600×900 CSS à 1,5 : images 2400×1350 (16:9)
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 })
await page.goto(URL + '?renderer=1', { waitUntil: 'load' })
await page.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 90000 })
const gpu = await page.evaluate(() => window.__tele.getState().gpu)

for (const [id, f] of Object.entries(FIG)) {
  if (id.startsWith('_') || (ONLY.length && !ONLY.includes(id))) continue
  await page.evaluate((f) => {
    const s = window.__app.getState()
    s.setScene({ model: f.model, cooling: f.cooling, mode: f.mode, view: f.view, play: !!f.play, labels: !!f.labels }, true)
  }, f)
  await page.waitForTimeout(2500)
  // cadrage resserré pour l'impression : rapprocher la caméra du facteur « zoom »
  await page.evaluate((z) => { const c = window.__camera; c.dollyTo(c.distance / z, true) }, f.zoom ?? 1)
  await page.waitForTimeout(f.play ? 6500 : f.mode === 'eclate' ? 3000 : 2000)
  const labels = f.labels
    ? await page.evaluate(() => {
        const seen = new Set()
        return window.__labels().filter((l) => {
          if (seen.has(l.name) || l.x < 0.03 || l.x > 0.97 || l.y < 0.04 || l.y > 0.96) return false
          seen.add(l.name)
          return true
        })
      })
    : []
  await page.screenshot({ path: path.join(OUT, 'img', id + '.jpg'), type: 'jpeg', quality: 86 })
  meta[id] = { ...f, labels: labels.map((l) => ({ name: l.name, x: +l.x.toFixed(4), y: +l.y.toFixed(4) })) }
  process.stdout.write(`${id} `)
}
meta._gpu = gpu
meta._date = new Date().toISOString()
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
await browser.close()
console.log(`\n${Object.keys(meta).filter((k) => !k.startsWith('_')).length} images — rendu : ${gpu}`)

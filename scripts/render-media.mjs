// Génère les images et vidéos précalculées du mode de secours (PC sans WebGL, sans Internet).
// Usage : node scripts/render-media.mjs [url-du-site-construit]   (par défaut http://localhost:4173/)
// Sortie : public/media/img/*.jpg, public/media/video/*.webm, public/media/manifest.json
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.argv[2] ?? 'http://localhost:4173/'
const OUT = path.resolve('public/media')
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'video'), { recursive: true })
const COMBOS = [
  ['puissance', 'ONAN'], ['puissance', 'ONAF'], ['puissance', 'OFAF'], ['puissance', 'OFWF'], ['puissance', 'ODAF'], ['puissance', 'ODWF'],
  ['distribution', 'ONAN'], ['monophase', 'ONAN'], ['sec', 'AN'], ['sec', 'AF'],
]
const MODES = ['exterieur', 'interieur', 'eclate', 'coupe', 'refroidissement']
const manifest = { generated: new Date().toISOString(), gpu: '', images: {}, videos: {} }

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(URL + '?renderer=1', { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 60000 })
manifest.gpu = await page.evaluate(() => window.__tele.getState().gpu)

const SKIP_IMAGES = process.argv.includes('--videos-only')
if (SKIP_IMAGES) Object.assign(manifest, JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8')), { videos: {} })
for (const [model, cooling] of SKIP_IMAGES ? [] : COMBOS) {
  for (const mode of MODES) {
    const play = mode === 'refroidissement' || mode === 'coupe'
    await page.evaluate((a) => window.__app.getState().setScene({ model: a[0], cooling: a[1], mode: a[2], view: 'iso', play: a[3] }), [model, cooling, mode, play])
    await page.waitForTimeout(play ? 6000 : 2500)
    const key = `${model}-${cooling}-${mode}`
    await page.screenshot({ path: path.join(OUT, 'img', key + '.jpg'), type: 'jpeg', quality: 88 })
    manifest.images[key] = `media/img/${key}.jpg`
    process.stdout.write('.')
  }
}
await page.close()

// Vidéos des animations de refroidissement (une page enregistrée par combinaison)
for (const [model, cooling] of COMBOS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: path.join(OUT, 'video', 'tmp'), size: { width: 1280, height: 720 } } })
  const p = await ctx.newPage()
  await p.goto(URL + '?renderer=1', { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 60000 })
  await p.evaluate((a) => window.__app.getState().setScene({ model: a[0], cooling: a[1], mode: 'refroidissement', view: 'iso', play: true }), [model, cooling])
  await p.waitForTimeout(12000)
  const video = p.video()
  await ctx.close()
  const key = `${model}-${cooling}`
  fs.renameSync(await video.path(), path.join(OUT, 'video', key + '.webm'))
  manifest.videos[key] = `media/video/${key}.webm`
  process.stdout.write('v')
}
fs.rmSync(path.join(OUT, 'video', 'tmp'), { recursive: true, force: true })
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
await browser.close()
console.log(`\n${Object.keys(manifest.images).length} images, ${Object.keys(manifest.videos).length} vidéos — GPU : ${manifest.gpu}`)

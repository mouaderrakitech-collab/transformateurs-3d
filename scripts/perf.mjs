// Mesure réelle des images/seconde dans une fenêtre Chrome visible (le mode headless bride le rendu).
// La caméra tourne en continu pendant la mesure : avec le rendu à la demande, une scène immobile
// ne produit aucune image et ne donnerait pas une mesure de capacité.
// Usage : node scripts/perf.mjs [url] [--headless]
import { chromium } from 'playwright-core'
const URL = process.argv[2] ?? 'http://localhost:4173/'
const headless = process.argv.includes('--headless')
const browser = await chromium.launch({ channel: 'chrome', headless, args: ['--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(URL, { waitUntil: 'load' })
await page.waitForFunction(() => window.__tele?.getState().gpu !== '—', null, { timeout: 30000 })
// Mise en page fixe (mode présentation : zone 3D pleine largeur) pour des mesures comparables
await page.evaluate(() => window.__app.getState().setPresenting(true))

// Rotation continue de la caméra (équivalent d'un utilisateur qui fait tourner le modèle)
await page.evaluate(() => {
  window.__spin = true
  const spin = () => {
    if (!window.__spin) return
    window.__camera?.rotate(0.006, 0, false)
    requestAnimationFrame(spin)
  }
  spin()
})
const measure = async (label) => {
  await page.waitForTimeout(3500)
  const s = []
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000)
    s.push(await page.evaluate(() => window.__tele.getState()))
  }
  const fps = s.map((x) => x.fps)
  const avg = Math.round(fps.reduce((a, b) => a + b, 0) / fps.length)
  console.log(label.padEnd(46), 'moy.', String(avg).padStart(3), 'i/s  [', fps.join(','), '] ', s[4].width + '×' + s[4].height, s[4].calls, 'appels', s[4].triangles, 'tri')
  return avg
}
console.log('GPU :', await page.evaluate(() => window.__tele.getState().gpu))
for (const q of ['performance', 'equilibre', 'haute']) {
  await page.evaluate((qq) => { window.__app.getState().setQuality(qq); window.__app.getState().setPresenting(true) }, q)
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ONAF', mode: 'exterieur' }, true))
  await measure(`${q} / puissance ONAF extérieur (rotation)`)
  await page.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ODAF', mode: 'refroidissement', play: true }, true))
  await measure(`${q} / puissance ODAF refroidissement`)
  await page.evaluate(() => window.__app.getState().setScene({ model: 'distribution', cooling: 'ONAN', mode: 'coupe', play: true }, true))
  await measure(`${q} / distribution coupe + flux`)
}
// Repos : plus aucune image rendue quand rien ne bouge
await page.evaluate(() => {
  window.__spin = false
  window.__app.getState().setScene({ model: 'puissance', cooling: 'ONAN', mode: 'exterieur', play: false }, true)
})
await page.waitForTimeout(4000)
const idle = await page.evaluate(() => window.__tele.getState().idle)
console.log('Scène immobile : rendu au repos =', idle)
await browser.close()

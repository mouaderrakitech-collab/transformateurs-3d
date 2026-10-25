// Mesure réelle des images/seconde dans une fenêtre Chrome visible (le mode headless bride le rendu).
import { chromium } from 'playwright-core'
const URL = process.argv[2] ?? 'http://localhost:4173/'
const headless = process.argv.includes('--headless')
const browser = await chromium.launch({ channel: 'chrome', headless, args: ['--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(URL, { waitUntil: 'networkidle' })
const measure = async (label) => {
  await page.waitForTimeout(3000)
  const s = []
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(1000); s.push(await page.evaluate(() => window.__tele.getState())) }
  const fps = s.map((x) => x.fps)
  console.log(label.padEnd(44), 'fps', fps.join(','), '| ', s[3].width + 'x' + s[3].height, s[3].calls, 'appels', s[3].triangles, 'tri')
}
const gpu = await page.evaluate(() => window.__tele.getState().gpu)
console.log('GPU:', gpu)
for (const q of ['performance', 'equilibre', 'haute']) {
  await page.evaluate((qq) => window.__app.getState().setQuality(qq), q)
  await page.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ONAF', mode: 'exterieur', view: 'iso' }, true))
  await measure(`${q} / puissance ONAF extérieur`)
  await page.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ODAF', mode: 'refroidissement', play: true }, true))
  await measure(`${q} / puissance ODAF refroidissement`)
}
await browser.close()

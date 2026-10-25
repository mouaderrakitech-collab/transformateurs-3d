// Captures ciblées : node scripts/shots.mjs <dossier> model:cooling:mode:view[:play] ...
import { chromium } from 'playwright-core'
import path from 'node:path'
const [out, ...specs] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await page.goto(process.env.URL ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
for (const s of specs) {
  const [model, cooling, mode, view, play, extra] = s.split(':')
  await page.evaluate((a) => {
    const st = window.__app.getState()
    st.setScene({ model: a[0], cooling: a[1], mode: a[2], view: a[3], play: a[4] === '1' }, true)
    if (a[5] === 'labels') st.setLabels(true)
    else st.setLabels(false)
  }, [model, cooling, mode, view, play, extra])
  await page.waitForTimeout(play === '1' ? 4500 : 1800)
  await page.screenshot({ path: path.join(out, s.replace(/:/g, '_') + '.png'), clip: { x: 288, y: 0, width: 1264, height: 1024 } })
}
console.log('erreurs:', errs.length ? errs : 'aucune')
await browser.close()

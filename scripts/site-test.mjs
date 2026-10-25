// Test d'un site déployé (local ou GitHub Pages) : ressources, rendu 3D, diapositives, PC et mobile.
// Usage : node scripts/site-test.mjs <url> [dossier-captures]
import { chromium, devices } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const URL = (process.argv[2] ?? 'http://localhost:4173/').replace(/\/?$/, '/')
const OUT = process.argv[3] ?? 'test-results/site'
fs.mkdirSync(OUT, { recursive: true })
const results = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ channel: 'chrome', headless: true })

// ─── PC (1920×1080)
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const failed = []
  const errors = []
  const loaded = new Set()
  page.on('response', (r) => {
    loaded.add(r.url())
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
  })
  page.on('requestfailed', (r) => failed.push(`échec ${r.url()}`))
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  const t0 = Date.now()
  const resp = await page.goto(URL, { waitUntil: 'networkidle' })
  ok('Page d’accueil HTTPS', resp.ok() && (URL.startsWith('https://') || URL.startsWith('http://localhost')), `HTTP ${resp.status()} — ${Date.now() - t0} ms`)
  await page.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 30000 }).catch(() => undefined)
  const js = [...loaded].filter((u) => u.endsWith('.js')).length
  const css = [...loaded].filter((u) => u.endsWith('.css')).length
  ok('JavaScript et CSS chargés', js >= 1 && css >= 1, `${js} JS, ${css} CSS`)
  const t = await page.evaluate(() => window.__tele.getState())
  ok('Rendu 3D actif (modèles, matériaux, éclairage)', t.fps > 0 && t.triangles > 10000, `${t.gpu} — ${t.triangles} triangles`)
  // Diapositives
  let n = 0
  for (let i = 0; i < 120; i++) {
    const before = await page.evaluate(() => window.__app.getState().slideIndex + ':' + window.__app.getState().stepIndex)
    await page.keyboard.press('ArrowRight')
    await sleep(250)
    if ((await page.evaluate(() => window.__app.getState().slideIndex + ':' + window.__app.getState().stepIndex)) === before) break
    n++
  }
  const counter = await page.evaluate(() => document.querySelector('[data-testid=slide-number]').textContent)
  ok('33 diapositives parcourues', counter.trim() === '33 / 33', `${counter} (${n} étapes)`)
  // Animation de refroidissement
  await page.evaluate(() => window.__app.getState().setScene({ model: 'puissance', cooling: 'ODAF', mode: 'refroidissement', view: 'iso', play: true }, true))
  await sleep(3500)
  const caption = await page.locator('[data-testid=cooling-caption]').textContent().catch(() => '')
  ok('Animation de refroidissement', !!caption, caption)
  await page.screenshot({ path: path.join(OUT, 'pc-refroidissement.png') })
  // Ressources annexes
  const head = async (p) => (await page.request.get(URL + p)).status()
  const man = await page.request.get(URL + 'media/manifest.json')
  const manifest = man.ok() ? await man.json() : null
  ok('Médias de secours (manifeste)', !!manifest && Object.keys(manifest.images).length === 50, manifest ? `${Object.keys(manifest.images).length} images, ${Object.keys(manifest.videos).length} vidéos` : `HTTP ${man.status()}`)
  const img = manifest && (await head(Object.values(manifest.images)[0]))
  const vid = manifest && (await head(Object.values(manifest.videos)[0]))
  ok('Image et vidéo précalculées accessibles', img === 200 && vid === 200, `image ${img}, vidéo ${vid}`)
  const bundle = await head('render-bundle.tgz')
  ok('Paquet du moteur distant (render-bundle.tgz)', bundle === 200, `HTTP ${bundle}`)
  ok('Aucune ressource en erreur', failed.length === 0, failed.slice(0, 5).join(' | '))
  ok('Aucune erreur JavaScript (PC)', errors.length === 0, errors.slice(0, 5).join(' | '))
  await page.close()
}

// ─── Mobile (profil Pixel 7 : écran tactile, 412×915)
{
  const ctx = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__tele?.getState().fps > 0, null, { timeout: 30000 }).catch(() => undefined)
  const t = await page.evaluate(() => window.__tele.getState())
  ok('Mobile : rendu 3D', t.fps > 0, `${t.width}×${t.height}, qualité ${await page.evaluate(() => window.__app.getState().quality)}`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  ok('Mobile : pas de défilement horizontal', !overflow)
  await page.screenshot({ path: path.join(OUT, 'mobile-accueil.png') })
  await page.getByLabel('Suivant').tap()
  await sleep(600)
  ok('Mobile : diapositive suivante (bouton tactile)', (await page.evaluate(() => window.__app.getState().slideIndex)) === 1)
  await page.getByTestId('open-toc').tap()
  await sleep(500)
  ok('Mobile : sommaire en tiroir', await page.getByTestId('drawer').isVisible())
  await page.screenshot({ path: path.join(OUT, 'mobile-sommaire.png') })
  await page.getByText('Pertes Joule (pertes en charge)').tap()
  await sleep(800)
  ok('Mobile : navigation depuis le sommaire', (await page.evaluate(() => window.__app.getState().slideIndex)) === 15)
  await page.screenshot({ path: path.join(OUT, 'mobile-schema.png') })
  await page.evaluate(() => window.__app.getState().goToSlide(21))
  await sleep(2500)
  await page.getByTestId('open-info').tap()
  await sleep(500)
  await page.screenshot({ path: path.join(OUT, 'mobile-explications.png') })
  ok('Mobile : panneau d’explications', await page.getByTestId('drawer').isVisible())
  ok('Aucune erreur JavaScript (mobile)', errors.length === 0, errors.slice(0, 5).join(' | '))
  await ctx.close()
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ date: new Date().toISOString(), url: URL, results }, null, 2))
process.exit(results.every((r) => r.pass) ? 0 : 1)

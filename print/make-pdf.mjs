// Génère le PDF autonome : livrables/PDF/Presentation_Transformateurs_Electriques_33_Diapositives.pdf
// Étapes : construction du document imprimable → contrôle de débordement → impression PDF (Chrome)
//          → relecture du PDF (pdf.js) : nombre de pages, texte, format 16:9.
// Prérequis : images print/captures (node print/capture.mjs).
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'livrables', 'PDF')
const OUT = path.join(OUT_DIR, 'Presentation_Transformateurs_Electriques_33_Diapositives.pdf')
const PORT = 4500

execSync('npx vite build -c vite.print.config.ts', { stdio: 'inherit' })
fs.mkdirSync(OUT_DIR, { recursive: true })

const srv = spawn(process.execPath, ['launcher/launcher.mjs', '--dir', 'build-print', '--port', String(PORT), '--no-cloud'], { env: { ...process.env, NO_OPEN: '1' }, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })

// Contrôle : aucun élément ne déborde de sa page ni de la zone de contenu (pied de page compris)
const report = await page.evaluate(() => {
  const out = []
  for (const s of document.querySelectorAll('.slide')) {
    const n = +s.dataset.slide
    const sr = s.getBoundingClientRect()
    const body = s.querySelector('.body')
    const br = body ? body.getBoundingClientRect() : sr
    const issues = []
    for (const el of s.querySelectorAll('.body *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (el.classList.contains('callout')) continue
      if (r.bottom > br.bottom + 1 || r.right > sr.right - 20 + 1) {
        issues.push(`${el.tagName.toLowerCase()}.${el.className || ''} « ${(el.textContent || '').trim().slice(0, 40)} » dépasse de ${Math.round(Math.max(r.bottom - br.bottom, r.right - (sr.right - 20)))} px`)
      }
    }
    const broken = [...s.querySelectorAll('img')].filter((i) => !i.naturalWidth).map((i) => i.src)
    out.push({ n, issues: issues.slice(0, 3), broken })
  }
  return out
})
const missing = await page.evaluate(() => [...document.querySelectorAll('figure[data-expected]')].map((f) => { const e = f.dataset.expected.split('|').filter(Boolean); const s = f.dataset.shown.split('|'); return { img: f.dataset.img, miss: e.filter((x) => !s.includes(x)) } }).filter((x) => x.miss.length))
for (const x of missing) console.log('  repères hors champ :', x.img, '→', x.miss.join(' | '))
const slides = report.length
const overflow = report.filter((r) => r.issues.length)
const broken = report.flatMap((r) => r.broken)
console.log(`Pages HTML : ${slides}`)
for (const r of overflow) console.log(`  page ${r.n} : ${r.issues.join(' | ')}`)
if (broken.length) console.log('  images manquantes :', broken)

await page.pdf({ path: OUT, width: '13.333in', height: '7.5in', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
await browser.close()
srv.kill()

// Relecture du PDF produit
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(OUT)), useSystemFonts: true }).promise
const pages = []
for (let i = 1; i <= doc.numPages; i++) {
  const p = await doc.getPage(i)
  const vp = p.getViewport({ scale: 1 })
  const txt = (await p.getTextContent()).items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim()
  pages.push({ i, w: Math.round(vp.width), h: Math.round(vp.height), chars: txt.length, start: txt.slice(0, 70) })
}
const size = fs.statSync(OUT).size
console.log(`\nPDF : ${OUT}`)
console.log(`Taille : ${(size / 1e6).toFixed(1)} Mo — pages : ${doc.numPages} — format : ${pages[0].w}×${pages[0].h} pt (ratio ${(pages[0].w / pages[0].h).toFixed(3)})`)
for (const p of pages) console.log(`  ${String(p.i).padStart(2)} [${p.chars} car.] ${p.start}`)
const ok = doc.numPages === 33 && slides === 33 && overflow.length === 0 && broken.length === 0 && errors.length === 0 && pages.every((p) => p.chars > 20)
console.log(ok ? '\nVALIDATION : OK' : `\nVALIDATION : ÉCHEC (débordements ${overflow.length}, images ${broken.length}, erreurs ${errors.length})`)
if (errors.length) console.log(errors.slice(0, 5))
process.exit(ok ? 0 : 1)

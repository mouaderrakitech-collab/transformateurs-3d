// Rendu des pages du PDF produit (pdf.js dans Chrome) en planches de contrôle visuel.
// Usage : node print/preview-pdf.mjs <dossier-sortie> [pages-par-planche]
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const OUT = process.argv[2] ?? 'test-results/pdf-preview'
const PER = +(process.argv[3] ?? 6)
const PDF = path.resolve('livrables/PDF/Presentation_Transformateurs_Electriques_33_Diapositives.pdf')
fs.mkdirSync(OUT, { recursive: true })
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfprev-'))
fs.copyFileSync(PDF, path.join(dir, 'doc.pdf'))
fs.copyFileSync('node_modules/pdfjs-dist/build/pdf.min.mjs', path.join(dir, 'pdf.min.mjs'))
fs.copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', path.join(dir, 'pdf.worker.min.mjs'))
fs.writeFileSync(
  path.join(dir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888">
<div id="g" style="display:grid;grid-template-columns:repeat(2,960px);gap:12px;padding:12px"></div>
<script type="module">
import * as pdfjs from './pdf.min.mjs'
pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs'
const doc = await pdfjs.getDocument({ url: './doc.pdf' }).promise
window.__n = doc.numPages
window.renderRange = async (a, b) => {
  const g = document.getElementById('g'); g.innerHTML = ''
  for (let i = a; i <= b && i <= doc.numPages; i++) {
    const p = await doc.getPage(i); const vp = p.getViewport({ scale: 1 })
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
    g.appendChild(c); await p.render({ canvas: c, viewport: vp }).promise
  }
}
window.__ready = true
</script>`,
)
const srv = spawn(process.execPath, ['launcher/launcher.mjs', '--dir', dir, '--port', '4510', '--no-cloud'], { env: { ...process.env, NO_OPEN: '1' }, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1200))
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await b.newPage({ viewport: { width: 1956, height: 1000 } })
p.on('console', (m) => console.log('[page]', m.text())); p.on('pageerror', (e) => console.log('[err]', e.message))
await p.goto('http://127.0.0.1:4510/')
await p.waitForFunction(() => window.__ready)
const n = await p.evaluate(() => window.__n)
for (let a = 1; a <= n; a += PER) {
  await p.evaluate(([a, b]) => window.renderRange(a, b), [a, a + PER - 1])
  await p.locator('#g').screenshot({ path: path.join(OUT, `planche-${String(a).padStart(2, '0')}.png`) })
}
console.log(`${n} pages rendues depuis le PDF en planches dans ${OUT}`)
await b.close()
srv.kill()

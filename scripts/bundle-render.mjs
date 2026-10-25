// Paquet du serveur de rendu pour le pod : dist/ (application) + render-server/ → dist/render-bundle.tgz
// Le paquet est publié avec le site (GitHub Pages) et téléchargé par le pod au démarrage. Il ne contient aucun secret.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-bundle-'))
// Les médias de secours (images/vidéos précalculées) sont inutiles sur le pod.
const distDir = path.join(root, 'dist')
fs.cpSync(distDir, path.join(tmp, 'dist'), {
  recursive: true,
  filter: (p) => !p.endsWith('render-bundle.tgz') && !path.relative(distDir, p).split(path.sep).includes('media'),
})
fs.mkdirSync(path.join(tmp, 'render-server'))
for (const f of ['server.mjs', 'package.json', 'start.sh', 'README.md']) {
  const src = path.join(root, 'render-server', f)
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, 'render-server', f))
}
// Fins de ligne Unix pour le script shell
const sh = path.join(tmp, 'render-server', 'start.sh')
fs.writeFileSync(sh, fs.readFileSync(sh, 'utf8').replace(/\r\n/g, '\n'))
const out = path.join(root, 'dist', 'render-bundle.tgz')
// chemins relatifs : évite que « C: » soit interprété comme un hôte distant par GNU tar
execFileSync('tar', ['-czf', 'render-bundle.tgz', 'dist', 'render-server'], { cwd: tmp })
fs.copyFileSync(path.join(tmp, 'render-bundle.tgz'), out)
fs.rmSync(tmp, { recursive: true, force: true })
console.log('paquet :', out, (fs.statSync(out).size / 1e6).toFixed(1), 'Mo')

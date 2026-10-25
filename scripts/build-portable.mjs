// Construit la distribution portable Windows (clé USB) : portable/Transformateurs3D/
//
//   app/                    application construite (+ autonome.html : version mono-fichier sans serveur)
//   runtime/node.exe        environnement Node.js embarqué (aucune installation sur le PC)
//   launcher/, cloud/       lanceur local et accès RunPod (sans aucune clé)
//   config/cloud.cmd        paramètres NON secrets (URL du paquet de rendu, du site public…)
//   Lancer-Presentation.bat, Presentation-sans-serveur.bat, LISEZ-MOI.txt
//
// Usage : node scripts/build-portable.mjs [--site https://user.github.io/repo/] [--skip-build]
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const arg = (n, d) => {
  const i = process.argv.indexOf(n)
  return i > 0 ? process.argv[i + 1] : d
}
const site = (arg('--site', process.env.PUBLIC_SITE_URL ?? '') || '').replace(/\/?$/, (m) => (m ? '/' : ''))
const OUT = path.join(root, 'portable', 'Transformateurs3D')

if (!process.argv.includes('--skip-build')) {
  execSync('npx tsc --noEmit -p . && npx vite build && npx vite build --mode single', { stdio: 'inherit' })
}
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

fs.cpSync(path.join(root, 'dist'), path.join(OUT, 'app'), { recursive: true, filter: (p) => !p.endsWith('render-bundle.tgz') })
// Version autonome placée à côté de media/ pour partager les images de secours
fs.copyFileSync(path.join(root, 'dist-single', 'index.html'), path.join(OUT, 'app', 'autonome.html'))
fs.mkdirSync(path.join(OUT, 'launcher'))
fs.copyFileSync(path.join(root, 'launcher', 'launcher.mjs'), path.join(OUT, 'launcher', 'launcher.mjs'))
fs.mkdirSync(path.join(OUT, 'cloud'))
fs.copyFileSync(path.join(root, 'cloud', 'runpod-lib.mjs'), path.join(OUT, 'cloud', 'runpod-lib.mjs'))
fs.mkdirSync(path.join(OUT, 'runtime'))
fs.copyFileSync(process.execPath, path.join(OUT, 'runtime', 'node.exe'))
fs.writeFileSync(
  path.join(OUT, 'runtime', 'LISEZ-MOI.txt'),
  `node.exe : Node.js ${process.version} (https://nodejs.org), licence MIT — https://github.com/nodejs/node/blob/main/LICENSE\r\n`,
)

fs.mkdirSync(path.join(OUT, 'config'))
fs.writeFileSync(
  path.join(OUT, 'config', 'cloud.cmd'),
  [
    '@rem Paramètres NON secrets de la session de rendu distant. Ne jamais placer de clé API ici.',
    `set "PUBLIC_SITE_URL=${site}"`,
    `set "RENDER_BUNDLE_URL=${site ? site + 'render-bundle.tgz' : ''}"`,
    'set "IDLE_STOP_MIN=15"',
    'set "MAX_SESSION_MIN=150"',
    '',
  ].join('\r\n'),
)

const bat = [
  '@echo off',
  'chcp 65001 >nul',
  'cd /d "%~dp0"',
  'title Transformateurs 3D - presentation',
  'call "config\\cloud.cmd"',
  'if not exist "runtime\\node.exe" goto autonome',
  '"runtime\\node.exe" "launcher\\launcher.mjs" --dir "%~dp0app" --open',
  'if errorlevel 1 goto autonome',
  'goto :eof',
  ':autonome',
  'echo.',
  'echo Le serveur local n a pas pu demarrer (execution bloquee depuis la cle USB ?).',
  'echo Ouverture de la version autonome (sans serveur, sans session GPU distante)...',
  'start "" "%~dp0app\\autonome.html"',
  'pause',
  '',
].join('\r\n')
fs.writeFileSync(path.join(OUT, 'Lancer-Presentation.bat'), bat)
fs.writeFileSync(path.join(OUT, 'Presentation-sans-serveur.bat'), ['@echo off', 'start "" "%~dp0app\\autonome.html"', ''].join('\r\n'))

fs.writeFileSync(
  path.join(OUT, 'LISEZ-MOI.txt'),
  `TRANSFORMATEURS 3D — VERSION PORTABLE
=====================================

1. Copier le dossier « Transformateurs3D » sur la clé USB (ou directement sur le PC).
2. Double-cliquer sur « Lancer-Presentation.bat ».
   → Un serveur local démarre (runtime\\node.exe, rien n'est installé) et la présentation s'ouvre.
   → Fermer la fenêtre noire pour arrêter.

Rendu GPU distant (RunPod)
   • Avec un lien de session fourni par l'opérateur : l'ouvrir dans le navigateur, ou saisir
     l'adresse et le jeton dans Réglages › Rendu GPU distant.
   • Depuis ce lanceur : Réglages › Rendu GPU distant › Lanceur USB. La clé API RunPod est saisie
     à chaque démarrage et n'est JAMAIS enregistrée. Le coût est affiché avant confirmation.
   • Arrêt automatique du GPU après 15 min sans connexion, et au plus tard après 150 min.
   • Toujours cliquer « Arrêter » en fin de présentation.

Sans Internet
   • La présentation complète reste disponible avec le rendu 3D local (GPU du PC).
   • Si le PC n'a pas WebGL : images et vidéos précalculées (mode de secours, non interactif).
   • Le rendu distant interactif n'est évidemment pas disponible hors ligne.

Si l'exécution depuis la clé USB est bloquée (stratégie de sécurité)
   • « Presentation-sans-serveur.bat » ou ouvrir app\\autonome.html dans Edge/Chrome.
   • Cette version n'utilise aucun programme : diapositives et 3D locale fonctionnent ;
     le lanceur RunPod et l'import PDF peuvent être indisponibles.

Navigateurs : Microsoft Edge ou Google Chrome récents (Windows 10/11).
Raccourcis : → / ← diapositives, F plein écran, P présentation, 1-5 modes, ? aide.
`.replace(/\n/g, '\r\n'),
)

const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0)
console.log(`Distribution portable : ${OUT} (${(size(OUT) / 1e6).toFixed(0)} Mo)`)
console.log(site ? `Site public configuré : ${site}` : 'Site public non configuré (--site) : le lanceur RunPod exigera RENDER_BUNDLE_URL.')

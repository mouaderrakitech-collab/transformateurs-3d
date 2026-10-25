#!/usr/bin/env node
// Outil opérateur : sessions de rendu GPU RunPod.
//
//   node cloud/runpod.mjs estimate        coût estimé (lecture seule, gratuit)
//   node cloud/runpod.mjs start [--yes]   crée le pod de rendu (PAYANT, confirmation demandée)
//   node cloud/runpod.mjs status          pods de session en cours et état du moteur
//   node cloud/runpod.mjs stop            supprime tous les pods de session (fin de facturation)
//
// Clé API : variable RUNPOD_API_KEY, sinon saisie masquée. Elle n'est jamais écrite sur disque.
// Les liens de session (avec jetons temporaires) sont affichés à l'écran uniquement.

import readline from 'node:readline'
import { spawn } from 'node:child_process'
import { DEFAULTS, estimate, listSessionPods, podInfo, proxyUrl, sessionLinks, startSession, stopAll, waitReady } from './runpod-lib.mjs'

const cmd = process.argv[2] ?? 'status'
const yes = process.argv.includes('--yes')

function askHidden(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => { if (s.includes(q)) process.stdout.write(s) }
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); resolve(a.trim()) })
  })
}
function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(q, (a) => { rl.close(); resolve(a.trim()) })
  })
}

const key = process.env.RUNPOD_API_KEY || (await askHidden('Clé API RunPod (non enregistrée) : '))
if (!key) {
  console.error('Clé API requise.')
  process.exit(1)
}

try {
  if (cmd === 'estimate' || cmd === 'start') {
    const e = await estimate(key)
    console.log(`\nCompte : solde ${e.account.clientBalance} $ — dépense actuelle ${e.account.currentSpendPerHr} $/h — plafond ${e.account.spendLimit} $/h`)
    console.log(`Cloud ${DEFAULTS.cloudType} — GPU candidats (ordre de priorité) :`)
    for (const g of e.prices) console.log(`  • ${g.id.padEnd(30)} ${String(g.vram).padStart(3)} Go  ${g.perHour.toFixed(2)} $/h`)
    console.log(`Arrêt automatique : ${DEFAULTS.idleStopMin} min sans client, durée maximale ${DEFAULTS.maxSessionMin} min`)
    console.log(`Coût maximal d’une session (pire GPU, durée max.) : ${e.maxSessionCost} $\n`)
    if (cmd === 'estimate') process.exit(0)
    if (e.account.clientBalance <= 0) throw new Error('Solde RunPod nul : approvisionner le compte avant de démarrer une session.')
    const running = await listSessionPods(key)
    if (running.length) throw new Error(`Une session existe déjà (${running.map((p) => p.id).join(', ')}). Utiliser « status » ou « stop ».`)
    if (!yes && (await ask('Créer le pod GPU (ressource PAYANTE) ? Taper OUI pour confirmer : ')) !== 'OUI') {
      console.log('Annulé, aucune ressource créée.')
      process.exit(0)
    }
    const s = await startSession(key)
    console.log(`Pod créé : ${s.pod.id} — ${s.pod.costPerHr ?? '?'} $/h — démarrage du moteur (plusieurs minutes)…`)
    const h = await waitReady(s.serverUrl, {
      onTick: (t) => process.stdout.write(t.rendererReady ? '' : t.ok ? 'm' : '.'),
    })
    const info = await podInfo(key, s.pod.id)
    const links = sessionLinks(DEFAULTS.publicSite, s.serverUrl, s.tokens)
    console.log(`\n\nMoteur prêt — GPU : ${h.gpu}${h.softwareRendering ? '  ⚠ RENDU LOGICIEL' : ''}`)
    console.log(`Serveur : ${s.serverUrl}   TURN : ${info.publicIp}:${info.portMappings?.['3478'] ?? '?'}`)
    console.log('\nLien PRÉSENTATEUR (ne pas diffuser) :\n  ' + links.presenter)
    console.log('\nLien SPECTATEUR :\n  ' + links.viewer)
    console.log('\nArrêt : node cloud/runpod.mjs stop')
    // Connexion automatique : ouverture du lien présentateur (GitHub Pages) dans le navigateur
    if (!process.argv.includes('--no-open') && links.presenter.startsWith('http')) {
      // guillemets explicites : le « & » du fragment (#cloud=…&token=…) ne doit pas être interprété par cmd
      if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '""', `"${links.presenter}"`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref()
      else spawn('xdg-open', [links.presenter], { detached: true, stdio: 'ignore' }).unref()
    }
  } else if (cmd === 'status') {
    const pods = await listSessionPods(key)
    if (!pods.length) console.log('Aucune session en cours (aucun coût de calcul).')
    for (const p of pods) {
      let h = null
      try { h = await (await fetch(proxyUrl(p.id) + '/health')).json() } catch { /* injoignable */ }
      console.log(`${p.id}  ${p.desiredStatus}  ${p.costPerHr ?? '?'} $/h  moteur : ${h ? (h.rendererReady ? 'prêt — ' + h.gpu : 'en démarrage') : 'injoignable'}${h ? `  clients ${h.clients}  util. GPU ${h.host?.gpuUtil ?? '?'} %` : ''}`)
    }
  } else if (cmd === 'stop') {
    const ids = await stopAll(key)
    console.log(ids.length ? `Pods supprimés : ${ids.join(', ')}` : 'Aucun pod de session à arrêter.')
  } else {
    console.log('Commandes : estimate | start [--yes] | status | stop')
  }
} catch (e) {
  console.error('Erreur :', e.message)
  process.exit(1)
}

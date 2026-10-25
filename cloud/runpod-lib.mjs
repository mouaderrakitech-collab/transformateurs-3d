// Accès à l'API REST RunPod pour les sessions de présentation.
// La clé API est TOUJOURS passée en argument (saisie à l'exécution ou variable d'environnement) :
// ce module ne lit ni n'écrit aucun fichier de configuration contenant une clé.

import crypto from 'node:crypto'

const API = 'https://rest.runpod.io/v1'
const GQL = 'https://api.runpod.io/graphql'
export const POD_PREFIX = 'transformateurs-3d'

/** Configuration du pod de rendu (modifiable par variables d'environnement, sans secret). */
export const DEFAULTS = {
  image: process.env.RENDER_IMAGE ?? 'mcr.microsoft.com/playwright:v1.64.1-noble',
  // GPU avec encodeur vidéo matériel NVENC et pilotes graphiques ; ordre = priorité de location.
  gpuTypeIds: (process.env.RENDER_GPUS ?? 'NVIDIA RTX A5000,NVIDIA RTX A4500,NVIDIA RTX A4000,NVIDIA GeForce RTX 4090,NVIDIA RTX A6000,NVIDIA L4').split(','),
  cloudType: process.env.RENDER_CLOUD ?? 'SECURE', // IP publique stable (TCP pour TURN)
  bundleUrl: process.env.RENDER_BUNDLE_URL ?? '',
  idleStopMin: +(process.env.IDLE_STOP_MIN ?? 15),
  maxSessionMin: +(process.env.MAX_SESSION_MIN ?? 150),
  publicSite: process.env.PUBLIC_SITE_URL ?? '',
}

async function rest(key, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  if (!r.ok) throw new Error(`RunPod ${method} ${path} → ${r.status} ${typeof json === 'string' ? json : JSON.stringify(json)}`.slice(0, 400))
  return json
}

async function gql(key, query) {
  const r = await fetch(GQL, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
  const j = await r.json()
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300))
  return j.data
}

export async function account(key) {
  const d = await gql(key, 'query { myself { clientBalance currentSpendPerHr spendLimit } }')
  return d.myself
}

/** Prix horaires actuels des GPU candidats (lecture seule, gratuit). */
export async function gpuPrices(key, ids = DEFAULTS.gpuTypeIds) {
  const d = await gql(key, 'query { gpuTypes { id memoryInGb securePrice communityPrice } }')
  return ids.map((id) => d.gpuTypes.find((g) => g.id === id)).filter(Boolean)
}

export async function listSessionPods(key) {
  const pods = await rest(key, 'GET', '/pods')
  return (pods ?? []).filter((p) => p.name?.startsWith(POD_PREFIX))
}

export const proxyUrl = (podId, port = 8080) => `https://${podId}-${port}.proxy.runpod.net`

/** Estimation de coût AVANT démarrage (aucune ressource créée). */
export async function estimate(key) {
  const [acc, prices] = await Promise.all([account(key), gpuPrices(key)])
  const field = DEFAULTS.cloudType === 'SECURE' ? 'securePrice' : 'communityPrice'
  const p = prices.map((g) => ({ id: g.id, vram: g.memoryInGb, perHour: g[field] })).filter((g) => g.perHour > 0)
  const max = Math.max(...p.map((g) => g.perHour))
  return { account: acc, prices: p, maxPerHour: max, maxSessionMin: DEFAULTS.maxSessionMin, maxSessionCost: +((max * DEFAULTS.maxSessionMin) / 60).toFixed(2) }
}

/** Crée le pod de rendu. Ressource PAYANTE : n'appeler qu'après confirmation explicite. */
export async function startSession(key, { bundleUrl = DEFAULTS.bundleUrl } = {}) {
  if (!bundleUrl) throw new Error('RENDER_BUNDLE_URL non défini (URL publique du paquet render-bundle.tgz)')
  const tokens = {
    presenter: crypto.randomBytes(24).toString('base64url'),
    viewer: crypto.randomBytes(18).toString('base64url'),
    turn: crypto.randomBytes(24).toString('base64url'),
  }
  const startCmd = [
    'set -e',
    "node -e \"fetch(process.env.BUNDLE_URL).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer()}).then(b=>require('fs').writeFileSync('/tmp/b.tgz',Buffer.from(b)))\"",
    'mkdir -p /app && tar xzf /tmp/b.tgz -C /app',
    'bash /app/render-server/start.sh',
  ].join(' && ')
  const pod = await rest(key, 'POST', '/pods', {
    name: `${POD_PREFIX}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`,
    imageName: DEFAULTS.image,
    gpuTypeIds: DEFAULTS.gpuTypeIds,
    gpuCount: 1,
    cloudType: DEFAULTS.cloudType,
    computeType: 'GPU',
    containerDiskInGb: 20,
    volumeInGb: 0, // aucun volume persistant : rien n'est facturé après suppression
    ports: ['8080/http', '3478/tcp'],
    interruptible: false,
    env: {
      BUNDLE_URL: bundleUrl,
      PRESENTER_TOKEN: tokens.presenter,
      VIEWER_TOKEN: tokens.viewer,
      TURN_SECRET: tokens.turn,
      IDLE_STOP_MIN: String(DEFAULTS.idleStopMin),
      MAX_SESSION_MIN: String(DEFAULTS.maxSessionMin),
      NVIDIA_DRIVER_CAPABILITIES: 'all',
      PROFILE: 'balanced',
    },
    dockerEntrypoint: ['bash', '-c'],
    dockerStartCmd: [startCmd],
  })
  return { pod, tokens, serverUrl: proxyUrl(pod.id) }
}

export async function podInfo(key, id) {
  return rest(key, 'GET', `/pods/${id}`)
}

/** Attend que le moteur de rendu soit prêt (état public /health). */
export async function waitReady(serverUrl, { timeoutMs = 15 * 60_000, onTick } = {}) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    try {
      const r = await fetch(serverUrl + '/health', { cache: 'no-store' })
      if (r.ok) {
        const h = await r.json()
        onTick?.(h)
        if (h.rendererReady) return h
      } else onTick?.({ http: r.status })
    } catch (e) {
      onTick?.({ error: e.message })
    }
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error('Délai dépassé : le moteur de rendu n’est pas prêt')
}

/** Supprime (terminate) les pods de session : plus aucune facturation de calcul ni de disque. */
export async function stopAll(key) {
  const pods = await listSessionPods(key)
  const done = []
  for (const p of pods) {
    await rest(key, 'DELETE', `/pods/${p.id}`)
    done.push(p.id)
  }
  return done
}

export function sessionLinks(site, serverUrl, tokens) {
  const base = (site || '').replace(/\/?$/, '/')
  const frag = (t) => `#cloud=${encodeURIComponent(serverUrl)}&token=${t}`
  return {
    presenter: base ? base + frag(tokens.presenter) : frag(tokens.presenter),
    viewer: base ? base + frag(tokens.viewer) : frag(tokens.viewer),
  }
}

import { create } from 'zustand'
import { useApp } from '../store'
import { SYNC_KEYS, type DcMessage, type Label, type RemoteTelemetry, type Role, type StreamProfile, type SyncState, type WsMessage } from './protocol'

export type CloudStatus = 'off' | 'checking' | 'connecting' | 'streaming' | 'fallback' | 'reconnecting' | 'unavailable' | 'denied'

export interface Health {
  ok: boolean
  rendererReady: boolean
  gpu: string
  clients: number
  uptimeS: number
  idleStopMin: number
  sessionEndsAt: number
}

interface CloudState {
  status: CloudStatus
  message: string
  serverUrl: string
  role: Role | null
  transport: 'webrtc' | 'jpeg' | null
  relay: boolean
  profile: StreamProfile
  telemetry: RemoteTelemetry | null
  health: Health | null
  stats: { fps: number; width: number; height: number; kbps: number; rttMs: number; latencyMs: number }
  labels: Label[]
  hovered: string | null
  jpegUrl: string | null
}

export const useCloud = create<CloudState>(() => ({
  status: 'off',
  message: '',
  serverUrl: '',
  role: null,
  transport: null,
  relay: false,
  profile: 'balanced',
  telemetry: null,
  health: null,
  stats: { fps: 0, width: 0, height: 0, kbps: 0, rttMs: 0, latencyMs: 0 },
  labels: [],
  hovered: null,
  jpegUrl: null,
}))

const set = (p: Partial<CloudState>) => useCloud.setState(p)

/** Le rendu distant est-il la source active de l'image ? */
export const isCloudActive = (s: CloudStatus) => s !== 'off'

function normalizeUrl(u: string) {
  let url = u.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//.test(url)) url = 'https://' + url
  return url
}

function pickSync(): SyncState {
  const s = useApp.getState()
  const o = {} as Record<string, unknown>
  for (const k of SYNC_KEYS) o[k] = s[k as keyof typeof s]
  return o as unknown as SyncState
}

class CloudClient {
  private url = ''
  private token = ''
  private ws: WebSocket | null = null
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private video: HTMLVideoElement | null = null
  private stream: MediaStream | null = null
  private timers: number[] = []
  private retry = 0
  private stopped = true
  private applyingRemote = false
  private lastSent: Partial<SyncState> = {}
  private unsub: (() => void) | null = null
  private lastBytes = 0
  private lastStatsTs = 0
  private fallbackTimer = 0

  setVideo(v: HTMLVideoElement | null) {
    this.video = v
    if (v && this.stream) v.srcObject = this.stream
  }

  async connect(url: string, token: string) {
    this.disconnect(false)
    this.url = normalizeUrl(url)
    this.token = token.trim()
    this.stopped = false
    this.retry = 0
    try {
      sessionStorage.setItem('tr3d-cloud', JSON.stringify({ url: this.url, token: this.token }))
    } catch { /* stockage indisponible */ }
    set({ serverUrl: this.url })
    this.unsub = useApp.subscribe(() => this.pushState())
    await this.attempt()
  }

  disconnect(clearSaved = true) {
    this.stopped = true
    this.teardown()
    this.unsub?.()
    this.unsub = null
    if (clearSaved) {
      try { sessionStorage.removeItem('tr3d-cloud') } catch { /* ignore */ }
    }
    set({ status: 'off', message: '', role: null, transport: null, telemetry: null, labels: [], jpegUrl: null })
  }

  private teardown() {
    this.timers.forEach((t) => clearInterval(t))
    this.timers = []
    clearTimeout(this.fallbackTimer)
    this.dc?.close()
    this.pc?.close()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
    }
    this.ws = null
    this.pc = null
    this.dc = null
    this.stream = null
    const j = useCloud.getState().jpegUrl
    if (j) URL.revokeObjectURL(j)
  }

  private scheduleRetry(reason: string, status: CloudStatus = 'reconnecting') {
    if (this.stopped) return
    this.teardown()
    const delay = Math.min(15000, 2000 * 2 ** this.retry++)
    set({ status, message: `${reason} — nouvelle tentative dans ${Math.round(delay / 1000)} s` })
    this.timers.push(window.setTimeout(() => this.attempt(), delay) as unknown as number)
  }

  private async attempt() {
    if (this.stopped) return
    set({ status: 'checking', message: 'Vérification de la connexion Internet et du serveur GPU…' })
    if (!navigator.onLine) return this.scheduleRetry('Pas de connexion Internet', 'unavailable')
    let health: Health
    try {
      const ctl = new AbortController()
      const to = setTimeout(() => ctl.abort(), 8000)
      const r = await fetch(this.url + '/health', { signal: ctl.signal, cache: 'no-store' })
      clearTimeout(to)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      health = await r.json()
    } catch {
      return this.scheduleRetry('Serveur GPU Cloud injoignable (session arrêtée ou en démarrage)', 'unavailable')
    }
    set({ health })
    if (!health.rendererReady) return this.scheduleRetry('Serveur joignable, moteur de rendu en démarrage', 'unavailable')
    set({ status: 'connecting', message: 'Établissement de la session sécurisée…' })
    const wsUrl = this.url.replace(/^http/, 'ws') + '/ws?token=' + encodeURIComponent(this.token)
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'blob'
    this.ws = ws
    ws.onmessage = (ev) => this.onWs(ev)
    ws.onclose = (ev) => {
      if (ev.code === 4401) {
        this.stopped = true
        this.teardown()
        set({ status: 'denied', message: 'Jeton de session refusé (expiré ou invalide).' })
        return
      }
      this.scheduleRetry('Connexion au serveur perdue')
    }
  }

  private send(msg: DcMessage) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(msg))
    else if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'dc', msg }))
  }

  sendCam(op: 'rotate' | 'dolly' | 'truck', dx: number, dy: number) {
    if (useCloud.getState().role === 'presenter') this.send({ t: 'cam', op, dx, dy })
  }
  sendPick(x: number, y: number, click: boolean) {
    if (useCloud.getState().role === 'presenter') this.send({ t: 'pick', x, y, click })
  }
  setProfile(p: StreamProfile) {
    if (useCloud.getState().role !== 'presenter') return
    this.ws?.send(JSON.stringify({ type: 'profile', profile: p }))
  }

  /** Envoie au moteur distant les champs de scène modifiés par le présentateur. */
  private pushState(full = false) {
    if (this.applyingRemote || useCloud.getState().role !== 'presenter') return
    const cur = pickSync()
    const patch: Partial<SyncState> = {}
    for (const k of SYNC_KEYS) {
      if (full || JSON.stringify(cur[k]) !== JSON.stringify(this.lastSent[k])) (patch as Record<string, unknown>)[k] = cur[k]
    }
    if (Object.keys(patch).length === 0) return
    this.lastSent = { ...this.lastSent, ...patch }
    this.send({ t: 'state', s: patch })
  }

  private onWs(ev: MessageEvent) {
    if (ev.data instanceof Blob) {
      // Mode de secours : images JPEG relayées par WebSocket
      const prev = useCloud.getState().jpegUrl
      const url = URL.createObjectURL(ev.data)
      set({ jpegUrl: url, transport: 'jpeg', status: 'fallback', message: 'Mode de secours : images compressées (WebRTC indisponible)' })
      if (prev) URL.revokeObjectURL(prev)
      return
    }
    const m = JSON.parse(ev.data) as WsMessage
    switch (m.type) {
      case 'hello':
        set({ role: m.role, profile: m.profile, message: m.role === 'presenter' ? 'Session présentateur' : 'Session spectateur' })
        this.startRtc(m.iceServers, m.forceRelay)
        break
      case 'answer':
        this.pc?.setRemoteDescription({ type: 'answer', sdp: m.sdp })
        break
      case 'ice':
        if (m.candidate) this.pc?.addIceCandidate(m.candidate).catch(() => undefined)
        break
      case 'profile':
        set({ profile: m.profile })
        break
      case 'renderer-status':
        if (!m.ready) this.scheduleRetry('Le moteur de rendu a redémarré')
        break
      case 'dc':
        this.onDc(m.msg)
        break
      case 'error':
        set({ message: m.message })
        break
    }
  }

  private startRtc(iceServers: RTCIceServer[], forceRelay: boolean) {
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: forceRelay ? 'relay' : 'all' })
    this.pc = pc
    pc.addTransceiver('video', { direction: 'recvonly' })
    const dc = pc.createDataChannel('ctl', { ordered: true })
    this.dc = dc
    dc.onopen = () => {
      this.pushState(true)
    }
    dc.onmessage = (e) => this.onDc(JSON.parse(e.data))
    pc.onicecandidate = (e) => {
      if (e.candidate) this.ws?.send(JSON.stringify({ type: 'ice', candidate: e.candidate.toJSON() }))
    }
    pc.ontrack = (e) => {
      this.stream = e.streams[0] ?? new MediaStream([e.track])
      if (this.video) this.video.srcObject = this.stream
    }
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      if (st === 'connected') {
        clearTimeout(this.fallbackTimer)
        this.retry = 0
        if (useCloud.getState().transport === 'jpeg') this.ws?.send(JSON.stringify({ type: 'jpeg', on: false }))
        set({ status: 'streaming', transport: 'webrtc', message: 'Flux WebRTC actif' })
      } else if (st === 'failed') {
        if (useCloud.getState().transport !== 'jpeg') this.startFallback()
      } else if (st === 'disconnected') {
        set({ status: 'reconnecting', message: 'Flux interrompu, reprise…' })
      }
    }
    pc.createOffer().then(async (o) => {
      await pc.setLocalDescription(o)
      this.ws?.send(JSON.stringify({ type: 'offer', sdp: o.sdp }))
    })
    // Si WebRTC n'aboutit pas (pare-feu strict), bascule sur le mode de secours.
    this.fallbackTimer = window.setTimeout(() => {
      if (useCloud.getState().status !== 'streaming') this.startFallback()
    }, 15000)
    this.timers.push(window.setInterval(() => this.collectStats(), 1000) as unknown as number)
    this.timers.push(window.setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 2000) as unknown as number)
    // Maintien du WebSocket à travers le proxy HTTP de RunPod (fermeture des connexions inactives)
    this.timers.push(window.setInterval(() => this.ws?.readyState === WebSocket.OPEN && this.ws.send('{"type":"ka"}'), 20000) as unknown as number)
    // Le mode de secours utilise le WebSocket pour les commandes : synchroniser immédiatement.
    this.pushState(true)
  }

  private startFallback() {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type: 'jpeg', on: true }))
    set({ status: 'fallback', transport: 'jpeg', message: 'WebRTC indisponible : mode de secours par images' })
    this.pushState(true)
  }

  private onDc(m: DcMessage) {
    switch (m.t) {
      case 'telemetry':
        set({ telemetry: m.d })
        break
      case 'labels':
        set({ labels: m.items })
        break
      case 'hover':
        set({ hovered: m.id })
        break
      case 'pong':
        set({ stats: { ...useCloud.getState().stats, latencyMs: Math.round(performance.now() - m.ts) } })
        break
      case 'state': {
        // État diffusé par le moteur : les spectateurs suivent tout, le présentateur reçoit la sélection.
        const role = useCloud.getState().role
        const patch = role === 'viewer' ? m.s : 'selectedPart' in m.s ? { selectedPart: m.s.selectedPart } : null
        if (patch) {
          this.applyingRemote = true
          useApp.setState(patch as Partial<ReturnType<typeof useApp.getState>>)
          this.lastSent = { ...this.lastSent, ...patch }
          this.applyingRemote = false
        }
        break
      }
    }
  }

  private async collectStats() {
    if (!this.pc) return
    const rep = await this.pc.getStats()
    const st = { ...useCloud.getState().stats }
    let relay = false
    rep.forEach((r) => {
      if (r.type === 'inbound-rtp' && r.kind === 'video') {
        st.fps = Math.round(r.framesPerSecond ?? 0)
        st.width = r.frameWidth ?? 0
        st.height = r.frameHeight ?? 0
        const now = r.timestamp
        if (this.lastStatsTs) st.kbps = Math.round(((r.bytesReceived - this.lastBytes) * 8) / (now - this.lastStatsTs))
        this.lastBytes = r.bytesReceived
        this.lastStatsTs = now
      }
      if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.nominated) {
        st.rttMs = Math.round((r.currentRoundTripTime ?? 0) * 1000)
        const local = rep.get(r.localCandidateId)
        relay = local?.candidateType === 'relay'
      }
    })
    set({ stats: st, relay })
  }

  /** Reprise automatique d'une session enregistrée dans l'onglet (rechargement de page). */
  resume() {
    try {
      const raw = sessionStorage.getItem('tr3d-cloud')
      if (raw) {
        const { url, token } = JSON.parse(raw)
        if (url && token) this.connect(url, token)
      }
    } catch { /* ignore */ }
  }
}

export const cloud = new CloudClient()

/** Le lanceur USB (API locale) n’existe que sur 127.0.0.1 / localhost, jamais sur le site public. */
export const isLocalLauncher = () => /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && location.protocol === 'http:'

/**
 * Lien de session : #cloud=<url>&token=<jeton>. Le fragment n'est jamais envoyé au serveur web
 * (GitHub Pages) ; il est effacé de la barre d'adresse après lecture.
 */
export function readSessionLink(): boolean {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''))
  const url = h.get('cloud')
  const token = h.get('token')
  if (url && token) {
    history.replaceState(null, '', location.pathname + location.search)
    cloud.connect(url, token)
    return true
  }
  return false
}

import * as THREE from 'three'
import type CameraControls from 'camera-controls'
import { useApp } from '../store'
import { useTelemetry } from '../telemetry'
import { labelRegistry } from '../three/labels'
import { PROFILES, SYNC_KEYS, type DcMessage, type RemoteTelemetry, type Role, type StreamProfile, type SyncState, type WsMessage } from './protocol'

/**
 * Moteur de rendu distant : cette page tourne dans un navigateur à accélération GPU sur le pod RunPod.
 * Elle rend la scène 3D, diffuse le canevas en WebRTC à chaque client et applique les commandes du présentateur.
 */

interface Peer {
  id: string
  role: Role
  pc: RTCPeerConnection
  dc: RTCDataChannel | null
  sender: RTCRtpSender | null
}

const peers = new Map<string, Peer>()
let ws: WebSocket
let canvas: HTMLCanvasElement | null = null
let stream: MediaStream | null = null
let profile: StreamProfile = 'balanced'
let host: Partial<RemoteTelemetry> = {}
let jpegTimer = 0
const raycaster = new THREE.Raycaster()

const params = new URLSearchParams(location.search)
const KEY = params.get('key') ?? ''
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws?token=' + encodeURIComponent(KEY)

function r3f() {
  return (window as unknown as { __r3f?: { scene: THREE.Scene; camera: THREE.Camera; gl: THREE.WebGLRenderer } }).__r3f
}
function controls() {
  return (window as unknown as { __camera?: CameraControls }).__camera
}

function pickSync(): SyncState {
  const s = useApp.getState()
  const o: Record<string, unknown> = {}
  for (const k of SYNC_KEYS) o[k] = s[k as keyof typeof s]
  return o as unknown as SyncState
}

/** Le canevas peut être recréé (changement de qualité) : remplacer la piste vidéo de chaque client. */
export function setRenderCanvas(c: HTMLCanvasElement) {
  canvas = c
  stream = c.captureStream(PROFILES[profile].fps)
  const track = stream.getVideoTracks()[0]
  track.contentHint = 'detail'
  for (const p of peers.values()) p.sender?.replaceTrack(track)
}

function sendTo(p: Peer, msg: DcMessage) {
  if (p.dc?.readyState === 'open') p.dc.send(JSON.stringify(msg))
  else if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'dc', to: p.id, msg }))
}
function broadcast(msg: DcMessage, filter?: (p: Peer) => boolean) {
  for (const p of peers.values()) if (!filter || filter(p)) sendTo(p, msg)
}

async function applyEncoding(p: Peer) {
  if (!p.sender) return
  const prm = p.sender.getParameters()
  if (!prm.encodings || prm.encodings.length === 0) prm.encodings = [{}]
  const pr = PROFILES[profile]
  prm.encodings[0].maxBitrate = pr.maxKbps * 1000
  prm.encodings[0].maxFramerate = pr.fps
  prm.degradationPreference = 'maintain-resolution'
  await p.sender.setParameters(prm).catch(() => undefined)
}

async function onOffer(from: string, role: Role, sdp: string, iceServers: RTCIceServer[]) {
  peers.get(from)?.pc.close()
  const pc = new RTCPeerConnection({ iceServers })
  const peer: Peer = { id: from, role, pc, dc: null, sender: null }
  peers.set(from, peer)
  pc.onicecandidate = (e) => {
    if (e.candidate) ws.send(JSON.stringify({ type: 'ice', to: from, candidate: e.candidate.toJSON() }))
  }
  pc.ondatachannel = (e) => {
    peer.dc = e.channel
    e.channel.onmessage = (m) => onCommand(peer, JSON.parse(m.data))
    e.channel.onopen = () => sendTo(peer, { t: 'state', s: role === 'viewer' ? pickSync() : { selectedPart: useApp.getState().selectedPart } })
  }
  pc.onconnectionstatechange = () => {
    // Échec WebRTC : le client reste joignable par WebSocket (mode de secours). Retrait uniquement sur « leave ».
    if (pc.connectionState === 'failed') peer.dc = null
  }
  await pc.setRemoteDescription({ type: 'offer', sdp })
  const tr = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'video')
  if (tr && stream) {
    tr.direction = 'sendonly'
    await tr.sender.replaceTrack(stream.getVideoTracks()[0])
    peer.sender = tr.sender
    // Préférence de codec : H.264 (décodage matériel quasi universel côté client), puis VP8.
    const caps = RTCRtpSender.getCapabilities('video')
    if (caps && 'setCodecPreferences' in tr) {
      const order = ['video/H264', 'video/VP8', 'video/VP9']
      const sorted = [...caps.codecs].sort((a, b) => {
        const ia = order.indexOf(a.mimeType)
        const ib = order.indexOf(b.mimeType)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
      try { tr.setCodecPreferences(sorted) } catch { /* ignore */ }
    }
  }
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  ws.send(JSON.stringify({ type: 'answer', to: from, sdp: answer.sdp }))
  applyEncoding(peer)
}

function onCommand(peer: Peer, m: DcMessage) {
  if (m.t === 'ping') return sendTo(peer, { t: 'pong', ts: m.ts })
  if (peer.role !== 'presenter') return // les spectateurs ne pilotent rien
  switch (m.t) {
    case 'state':
      useApp.setState(m.s as Partial<ReturnType<typeof useApp.getState>>)
      break
    case 'cam': {
      const c = controls()
      if (!c) return
      const dist = c.distance
      if (m.op === 'rotate') c.rotate(m.dx, m.dy, true)
      else if (m.op === 'dolly') c.dolly(m.dx * dist, true)
      else c.truck(m.dx * dist * 1.2, m.dy * dist * 0.8, true)
      break
    }
    case 'pick': {
      const id = pick(m.x, m.y)
      if (m.click) useApp.getState().select(id && id === useApp.getState().selectedPart ? null : id)
      else sendTo(peer, { t: 'hover', id })
      break
    }
  }
}

/** Sélection par lancer de rayon (mêmes règles que localement : coupe et enveloppes ignorées). */
function pick(x: number, y: number): string | null {
  const r = r3f()
  if (!r) return null
  raycaster.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), r.camera)
  const hits = raycaster.intersectObjects(r.scene.children, true)
  const planes = r.gl.clippingPlanes
  for (const h of hits) {
    if (planes.some((p) => p.distanceToPoint(h.point) < 0)) continue
    let o: THREE.Object3D | null = h.object
    let visible = true
    let id: string | null = null
    while (o) {
      if (!o.visible) visible = false
      if (!id && o.userData?.partId) id = o.userData.partId
      o = o.parent
    }
    if (visible && id) return id
  }
  return null
}

function projectLabels() {
  const r = r3f()
  if (!r || !useApp.getState().labels) return []
  const v = new THREE.Vector3()
  const items = []
  for (const [key, l] of labelRegistry) {
    let o: THREE.Object3D | null = l.obj
    let vis = true
    while (o) {
      if (!o.visible) vis = false
      o = o.parent
    }
    if (!vis) continue
    v.copy(l.local)
    l.obj.localToWorld(v)
    v.project(r.camera)
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue
    items.push({ id: key, name: l.name, x: (v.x + 1) / 2, y: (1 - v.y) / 2 })
  }
  return items
}

function startJpeg(on: boolean) {
  clearInterval(jpegTimer)
  if (!on) return
  // Images réduites (720p) et file d'attente courte : les commandes restent prioritaires sur le même canal.
  const small = document.createElement('canvas')
  small.width = 1280
  small.height = 720
  const ctx = small.getContext('2d')!
  jpegTimer = window.setInterval(() => {
    if (!canvas || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount > 150_000) return
    small.height = Math.round((1280 * canvas.height) / canvas.width)
    ctx.drawImage(canvas, 0, 0, small.width, small.height)
    small.toBlob((b) => b && ws.send(b), 'image/jpeg', 0.65)
  }, 1000 / 10)
}

let started = false
export function startRenderer() {
  if (started) return
  started = true
  let iceServers: RTCIceServer[] = []
  const connect = () => {
    ws = new WebSocket(WS_URL)
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data) as WsMessage
      switch (m.type) {
        case 'hello':
          iceServers = m.iceServers
          profile = m.profile
          break
        case 'offer':
          onOffer(m.from!, m.role ?? 'viewer', m.sdp, iceServers)
          break
        case 'ice':
          peers.get(m.from!)?.pc.addIceCandidate(m.candidate).catch(() => undefined)
          break
        case 'leave':
          peers.get(m.from)?.pc.close()
          peers.delete(m.from)
          break
        case 'profile':
          profile = m.profile
          if (canvas) setRenderCanvas(canvas)
          for (const p of peers.values()) applyEncoding(p)
          break
        case 'jpeg':
          startJpeg(m.on)
          break
        case 'dc': {
          // commande reçue par WebSocket (mode de secours) : pair virtuel sans canal de données
          let p = peers.get(m.from!)
          if (!p) {
            p = { id: m.from!, role: m.role ?? 'viewer', pc: new RTCPeerConnection(), dc: null, sender: null }
            peers.set(m.from!, p)
          }
          onCommand(p, m.msg)
          break
        }
        case 'host':
          host = { ...host, ...m.d }
          break
      }
    }
    ws.onclose = () => setTimeout(connect, 1000)
  }
  connect()

  // Diffusion de l'état aux spectateurs (et de la sélection au présentateur)
  let last = ''
  useApp.subscribe(() => {
    const s = pickSync()
    const j = JSON.stringify(s)
    if (j === last) return
    last = j
    broadcast({ t: 'state', s }, (p) => p.role === 'viewer')
    broadcast({ t: 'state', s: { selectedPart: s.selectedPart } }, (p) => p.role === 'presenter')
  })

  // Télémétrie (1 s) et étiquettes (≈ 7 Hz)
  setInterval(() => {
    const t = useTelemetry.getState()
    const d: RemoteTelemetry = { gpu: t.gpu, fps: t.fps, frameMs: t.frameMs, width: t.width, height: t.height, calls: t.calls, triangles: t.triangles, ...host }
    broadcast({ t: 'telemetry', d })
    ;(window as unknown as { __telemetry: RemoteTelemetry }).__telemetry = d
  }, 1000)
  setInterval(() => {
    if (!peers.size) return
    broadcast({ t: 'labels', items: projectLabels() })
  }, 150)
}

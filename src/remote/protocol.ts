/**
 * Protocole entre la présentation (navigateur), le serveur de signalisation (RunPod)
 * et le moteur de rendu (navigateur GPU sur RunPod).
 *
 *  Présentation ──WSS──► serveur ──WS──► moteur de rendu
 *       ▲                                    │
 *       └──────── WebRTC (vidéo + canal de données, via TURN/TCP) ◄┘
 */

import type { CameraView, CoolingId, LayerId, ModelId, ViewMode } from '../types'

export type Role = 'presenter' | 'viewer' | 'renderer'
export type StreamProfile = 'high' | 'balanced' | 'low'

export const PROFILES: Record<StreamProfile, { label: string; width: number; height: number; fps: number; maxKbps: number }> = {
  high: { label: 'Haute qualité — 1080p / 60 i/s', width: 1920, height: 1080, fps: 60, maxKbps: 12000 },
  balanced: { label: 'Équilibré — 1080p / 30 i/s', width: 1920, height: 1080, fps: 30, maxKbps: 6000 },
  low: { label: 'Faible débit — 720p / 30 i/s', width: 1280, height: 720, fps: 30, maxKbps: 2500 },
}

/** État partagé : le présentateur le pilote, le moteur l'applique, les spectateurs le suivent. */
export interface SyncState {
  model: ModelId
  cooling: CoolingId
  mode: ViewMode
  view: CameraView
  viewNonce: number
  labels: boolean
  layers: Record<LayerId, boolean>
  sectionOffset: number
  playing: boolean
  speed: number
  resetNonce: number
  selectedPart: string | null
  slideIndex: number
  stepIndex: number
}

export const SYNC_KEYS: (keyof SyncState)[] = [
  'model', 'cooling', 'mode', 'view', 'viewNonce', 'labels', 'layers', 'sectionOffset',
  'playing', 'speed', 'resetNonce', 'selectedPart', 'slideIndex', 'stepIndex',
]

export interface RemoteTelemetry {
  gpu: string
  fps: number
  frameMs: number
  width: number
  height: number
  calls: number
  triangles: number
  gpuUtil?: number // nvidia-smi, %
  gpuMemMb?: number
  encUtil?: number // utilisation de l'encodeur matériel, %
  hostname?: string
  provider?: string // fournisseur GPU Cloud : RunPod, Modal, local…
  podId?: string
  idleStopMin?: number
  sessionEndsAt?: number // horodatage (ms) d'arrêt automatique
}

export interface Label {
  id: string
  name: string
  x: number // 0..1
  y: number
}

/** Messages du canal de données (client ⇄ moteur). */
export type DcMessage =
  | { t: 'state'; s: Partial<SyncState> }
  | { t: 'cam'; op: 'rotate' | 'dolly' | 'truck'; dx: number; dy: number }
  | { t: 'pick'; x: number; y: number; click: boolean }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number }
  | { t: 'telemetry'; d: RemoteTelemetry }
  | { t: 'labels'; items: Label[] }
  | { t: 'hover'; id: string | null }

/** Messages de signalisation (WebSocket). */
export type WsMessage =
  | { type: 'hello'; role: Role; clientId: string; iceServers: RTCIceServer[]; rendererReady: boolean; profile: StreamProfile; forceRelay: boolean }
  | { type: 'offer'; sdp: string; from?: string; role?: Role }
  | { type: 'answer'; sdp: string; to?: string }
  | { type: 'ice'; candidate: RTCIceCandidateInit; to?: string; from?: string }
  | { type: 'leave'; from: string }
  | { type: 'renderer-status'; ready: boolean }
  | { type: 'profile'; profile: StreamProfile }
  | { type: 'jpeg'; on: boolean; from?: string }
  /** Messages du canal de données relayés par WebSocket (mode de secours sans WebRTC). */
  | { type: 'dc'; msg: DcMessage; from?: string; role?: Role; to?: string }
  | { type: 'error'; message: string }
  /** Mesures de l'hôte GPU (nvidia-smi) transmises par le serveur au moteur. */
  | { type: 'host'; d: Partial<RemoteTelemetry> }

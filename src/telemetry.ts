import { create } from 'zustand'

/** Mesures réelles du rendu (pas de valeurs déclarées). */
export interface Telemetry {
  gpu: string // chaîne WebGL UNMASKED_RENDERER du moteur qui calcule l'image
  vendor: string
  fps: number
  frameMs: number
  calls: number
  triangles: number
  width: number
  height: number
  /** Rendu à la demande : aucune image depuis plus d'1,5 s (scène immobile). */
  idle: boolean
  set: (p: Partial<Telemetry>) => void
}

export const useTelemetry = create<Telemetry>((set) => ({
  gpu: '—',
  vendor: '—',
  fps: 0,
  frameMs: 0,
  calls: 0,
  triangles: 0,
  width: 0,
  height: 0,
  idle: false,
  set: (p) => set(p),
}))

/** Le renderer est-il logiciel (pas de GPU matériel) ? */
export const isSoftwareRenderer = (gpu: string) => /swiftshader|llvmpipe|software|basic render/i.test(gpu)

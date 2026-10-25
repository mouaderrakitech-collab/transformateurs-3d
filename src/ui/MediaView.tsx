import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useApp } from '../store'

/**
 * Mode de secours local : images et vidéos précalculées (scripts/render-media.mjs).
 * Utilisé quand le PC n'offre pas WebGL ou à la demande. Il ne remplace pas l'interactivité 3D :
 * pas de rotation libre ni de sélection, une seule vue par mode.
 */

interface Manifest {
  generated: string
  gpu: string
  images: Record<string, string>
  videos: Record<string, string>
}

export const useMedia = create<{ on: boolean; reason: string; set: (on: boolean, reason?: string) => void }>((set) => ({
  on: false,
  reason: '',
  set: (on, reason = '') => set({ on, reason }),
}))

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

let manifestPromise: Promise<Manifest | null> | null = null
function loadManifest() {
  manifestPromise ??= fetch('./media/manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  return manifestPromise
}

export function MediaView() {
  const model = useApp((s) => s.model)
  const cooling = useApp((s) => s.cooling)
  const mode = useApp((s) => s.mode)
  const reason = useMedia((s) => s.reason)
  const [m, setM] = useState<Manifest | null | undefined>(undefined)
  useEffect(() => {
    loadManifest().then(setM)
  }, [])
  if (m === undefined) return null
  const img = m?.images[`${model}-${cooling}-${mode}`]
  const vid = mode === 'refroidissement' ? m?.videos[`${model}-${cooling}`] : undefined
  return (
    <div className="absolute inset-0 bg-[#1a1f26]" data-testid="media-view">
      {vid ? (
        <video key={vid} src={vid} autoPlay loop muted playsInline className="h-full w-full object-contain" />
      ) : img ? (
        <img key={img} src={img} alt={`${model} ${cooling} ${mode}`} className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full items-center justify-center text-ink-2">Image précalculée indisponible pour cette combinaison.</div>
      )}
      <div className="absolute bottom-3 left-3 max-w-md rounded bg-black/70 px-3 py-2 text-xs text-ink-2">
        <b className="text-warn">Mode de secours</b> — {vid ? 'vidéo' : 'image'} précalculée, non interactive.
        {reason && <> {reason}</>}
        {m && <> Rendu du {new Date(m.generated).toLocaleDateString('fr-FR')}.</>}
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Scene3D } from '../three/Scene'
import { setRenderCanvas, startRenderer } from './renderer'
import { useApp } from '../store'

/** Racine de la page « moteur de rendu » : uniquement la scène 3D, plein cadre, sans interface. */
export function RendererApp() {
  useEffect(() => {
    useApp.setState({ playing: false })
    // sans clé : mode capture (génération des images de secours), aucune connexion réseau
    if (new URLSearchParams(location.search).get('key')) startRenderer()
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1f26' }}>
      <Scene3D active forceQuality="haute" preserve onCanvas={(c) => { setRenderCanvas(c); (window as unknown as { __canvas: HTMLCanvasElement }).__canvas = c }} />
    </div>
  )
}

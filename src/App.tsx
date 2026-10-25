import { useEffect } from 'react'
import { useApp } from './store'
import { Sidebar } from './ui/Sidebar'
import { RightPanel } from './ui/RightPanel'
import { Stage } from './ui/Stage'
import { BottomBar, toggleFullscreen } from './ui/BottomBar'
import { cloud, readSessionLink, useCloud } from './remote/cloud'
import type { ViewMode } from './types'
import { useMedia, webglAvailable } from './ui/MediaView'

const MODE_KEYS: Record<string, ViewMode> = { '1': 'exterieur', '2': 'interieur', '3': 'eclate', '4': 'coupe', '5': 'refroidissement' }

export function App() {
  const presenting = useApp((s) => s.presenting)
  const showHelp = useApp((s) => s.showHelp)

  // Première diapositive, puis éventuel lien de session cloud.
  useEffect(() => {
    useApp.getState().goToSlide(0)
    if (!webglAvailable()) useMedia.getState().set(true, 'WebGL n’est pas disponible sur ce PC.')
    if (!readSessionLink()) {
      cloud.resume()
      // Lanceur USB : si une session GPU est active, s'y connecter automatiquement (rendu distant prioritaire)
      fetch('./api/launcher', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.session?.serverUrl && j.session.presenterToken && useCloud.getState().status === 'off') cloud.connect(j.session.serverUrl, j.session.presenterToken)
        })
        .catch(() => undefined)
    }
  }, [])

  // Navigation clavier (télécommande de présentation : PageUp / PageDown)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      const s = useApp.getState()
      const viewer = useCloud.getState().role === 'viewer'
      if (e.key === 'Escape' && s.showHelp) return s.setShowHelp(false)
      if (viewer && !['f', 'F', '?'].includes(e.key)) return
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          s.next()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          s.prev()
          break
        case 'Home':
          s.goToSlide(0)
          break
        case 'End':
          s.goToSlide(9999)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'p':
        case 'P':
          s.setPresenting(!s.presenting)
          break
        case 'l':
        case 'L':
          s.setLabels(!s.labels)
          break
        case 'Escape':
          if (s.presenting && !document.fullscreenElement) s.setPresenting(false)
          break
        case '?':
          s.setShowHelp(true)
          break
        default:
          if (MODE_KEYS[e.key]) s.setMode(MODE_KEYS[e.key])
      }
    }
    const onFs = () => {
      if (!document.fullscreenElement && useApp.getState().presenting) useApp.getState().setPresenting(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        {!presenting && <Sidebar />}
        <Stage />
        {!presenting && <RightPanel />}
      </div>
      <BottomBar />
      {showHelp && <Help />}
    </div>
  )
}

function Help() {
  const close = () => useApp.getState().setShowHelp(false)
  const rows: [string, string][] = [
    ['→  Espace  PageDown', 'Étape ou diapositive suivante'],
    ['←  PageUp', 'Étape ou diapositive précédente'],
    ['Début / Fin', 'Première / dernière diapositive'],
    ['F', 'Plein écran (masque les panneaux)'],
    ['P', 'Mode présentation'],
    ['1 … 5', 'Extérieur, intérieur, éclatée, coupe, refroidissement'],
    ['L', 'Étiquettes des composants'],
    ['Souris gauche', 'Rotation 360°'],
    ['Molette', 'Zoom'],
    ['Clic droit / Maj + glisser', 'Déplacement'],
    ['Clic sur un composant', 'Description dans le panneau de droite'],
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={close}>
      <div className="w-[34rem] max-w-[92vw] rounded-xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Aide">
        <h3 className="mb-3 text-lg font-semibold">Raccourcis et commandes</h3>
        <table className="w-full text-[14px]">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-1 pr-4 font-mono text-accent-2">{k}</td>
                <td className="py-1 text-ink-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-3">
          Les modèles 3D sont des représentations paramétriques construites à partir des composants réels décrits dans la littérature technique ; ils ne reproduisent pas un appareil d’un constructeur précis.
        </p>
        <button className="btn mt-4" onClick={close}>Fermer</button>
      </div>
    </div>
  )
}

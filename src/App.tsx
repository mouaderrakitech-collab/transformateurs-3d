import { useEffect } from 'react'
import { qualityAuto, useApp } from './store'
import { useTelemetry } from './telemetry'
import { Sidebar } from './ui/Sidebar'
import { RightPanel } from './ui/RightPanel'
import { Stage } from './ui/Stage'
import { BottomBar, toggleFullscreen } from './ui/BottomBar'
import { cloud, readSessionLink, useCloud } from './remote/cloud'
import type { ViewMode } from './types'
import { useMedia, webglAvailable } from './ui/MediaView'
import { useCompact, useDrawer } from './ui/layout'
import { isLocalLauncher } from './remote/cloud'

const MODE_KEYS: Record<string, ViewMode> = { '1': 'exterieur', '2': 'interieur', '3': 'eclate', '4': 'coupe', '5': 'refroidissement' }

export function App() {
  const presenting = useApp((s) => s.presenting)
  const showHelp = useApp((s) => s.showHelp)
  const compact = useCompact()
  const drawer = useDrawer((s) => s.open)
  const setDrawer = useDrawer((s) => s.set)
  // Sur mobile, fermer le tiroir quand on change de diapositive
  const slideIndex = useApp((s) => s.slideIndex)
  useEffect(() => setDrawer(null), [slideIndex, setDrawer])

  // Première diapositive, puis éventuel lien de session cloud.
  useEffect(() => {
    useApp.getState().goToSlide(0)
    if (!webglAvailable()) useMedia.getState().set(true, 'WebGL n’est pas disponible sur ce PC.')
    if (!readSessionLink()) {
      cloud.resume()
      // Lanceur USB : si une session GPU est active, s'y connecter automatiquement (rendu distant prioritaire)
      if (isLocalLauncher()) fetch('./api/launcher', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.session?.serverUrl && j.session.presenterToken && useCloud.getState().status === 'off') cloud.connect(j.session.serverUrl, j.session.presenterToken)
        })
        .catch(() => undefined)
    }
  }, [])

  // Mode local optimisé : si le GPU du PC reste sous 20 i/s, passer en qualité « Performance ».
  useEffect(() => {
    let low = 0
    const id = setInterval(() => {
      const { fps, idle, gpu } = useTelemetry.getState()
      // GPU intégré (Intel HD/UHD/Iris, mobiles) ou rendu logiciel : profil Performance d'emblée
      if (qualityAuto && useApp.getState().quality !== 'performance' && /intel|hd graphics|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe/i.test(gpu)) {
        useApp.setState({ quality: 'performance' })
        return
      }
      if (idle) return // scène immobile : rien à mesurer
      const s = useApp.getState()
      if (!qualityAuto || useCloud.getState().status !== 'off' || s.quality === 'performance' || fps === 0) return
      low = fps < 20 ? low + 1 : 0
      if (low >= 6) {
        useApp.setState({ quality: s.quality === 'haute' ? 'equilibre' : 'performance' })
        low = 0
      }
    }, 1000)
    return () => clearInterval(id)
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
      <div className="relative flex min-h-0 flex-1">
        {!presenting && !compact && <Sidebar />}
        <Stage />
        {!presenting && !compact && <RightPanel />}
        {compact && drawer && (
          <div className="absolute inset-0 z-40 flex bg-black/50" onClick={() => setDrawer(null)}>
            <div className={`h-full max-w-[88vw] ${drawer === 'right' ? 'ml-auto' : ''}`} onClick={(e) => e.stopPropagation()} data-testid="drawer">
              {drawer === 'left' ? <Sidebar /> : <RightPanel />}
            </div>
          </div>
        )}
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

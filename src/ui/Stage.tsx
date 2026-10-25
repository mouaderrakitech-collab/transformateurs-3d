import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { allSlides, useApp } from '../store'
import { Scene3D } from '../three/Scene'
import { anim } from '../three/anim'
import { Diagram } from './Diagrams'
import { References, Table } from './Tables'
import { SlideText } from './RightPanel'
import { COOLING, isDirected, usesFans, usesPumps, usesWater } from '../data/cooling'
import { useCloud } from '../remote/cloud'
import { RemoteView } from '../remote/RemoteView'
import { MediaView, useMedia } from './MediaView'
import type { CameraView, ViewMode } from '../types'

const MODES: { id: ViewMode; label: string; key: string }[] = [
  { id: 'exterieur', label: 'Extérieur', key: '1' },
  { id: 'interieur', label: 'Intérieur', key: '2' },
  { id: 'eclate', label: 'Éclatée', key: '3' },
  { id: 'coupe', label: 'Coupe', key: '4' },
  { id: 'refroidissement', label: 'Refroidissement', key: '5' },
]
const VIEWS: { id: CameraView; label: string }[] = [
  { id: 'avant', label: 'Avant' },
  { id: 'arriere', label: 'Arrière' },
  { id: 'gauche', label: 'Gauche' },
  { id: 'droite', label: 'Droite' },
  { id: 'dessus', label: 'Dessus' },
  { id: 'dessous', label: 'Dessous' },
  { id: 'iso', label: 'Iso' },
]

export function Stage() {
  const imported = useApp((s) => s.importedPages)
  const idx = useApp((s) => s.slideIndex)
  const presenting = useApp((s) => s.presenting)
  const override = useApp((s) => s.sceneOverride)
  const slide = allSlides(imported)[idx]
  const cloudOn = useCloud((s) => s.status !== 'off')
  const media = useMedia((s) => s.on)
  const [force3D, setForce3D] = useState(false)
  useEffect(() => setForce3D(false), [idx])

  const contentSlide = slide.layout === 'diagram' || slide.layout === 'table' || slide.layout === 'refs' || slide.layout === 'image'
  const sceneVisible = !contentSlide || force3D || override

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#1a1f26]" data-testid="stage">
      {!cloudOn && !media && <div className="absolute inset-0" style={{ visibility: sceneVisible ? 'visible' : 'hidden' }}><Scene3D active={sceneVisible} /></div>}
      {!cloudOn && media && sceneVisible && <MediaView />}
      {cloudOn && <div className="absolute inset-0" style={{ visibility: sceneVisible ? 'visible' : 'hidden' }}><RemoteView /></div>}

      {sceneVisible && (
        <>
          <ViewToolbar />
          <CoolingHud />
          {contentSlide && (
            <button className="btn absolute right-3 top-14 z-10" onClick={() => { setForce3D(false); useApp.setState({ sceneOverride: false }) }}>
              ← Revenir au schéma
            </button>
          )}
        </>
      )}

      {!sceneVisible && (
        <div key={slide.id} className="slide-enter absolute inset-0 flex flex-col bg-bg p-3 md:p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h2 className={`${presenting ? 'text-4xl' : 'text-2xl'} font-semibold`}>{slide.title}</h2>
            {slide.layout !== 'image' && (
              <button className="btn shrink-0" onClick={() => setForce3D(true)} title="Afficher le modèle 3D sans quitter la diapositive">
                Afficher la 3D
              </button>
            )}
          </div>
          <div className="flex min-h-0 flex-1 gap-6">
            {presenting && slide.bullets && (
              <div className="w-[34%] shrink-0 overflow-y-auto">
                <SlideBullets />
              </div>
            )}
            <div className="min-h-0 min-w-0 flex-1">
              {slide.layout === 'diagram' && slide.diagram && <Diagram id={slide.diagram} />}
              {slide.layout === 'table' && slide.table && <Table id={slide.table} />}
              {slide.layout === 'refs' && <References />}
              {slide.layout === 'image' && slide.image && <img src={slide.image} alt={slide.title} className="h-full w-full object-contain" />}
            </div>
          </div>
        </div>
      )}

      {slide.layout === 'title' && sceneVisible && !override && <TitleOverlay title={slide.title} subtitle={slide.subtitle} />}
      {presenting && sceneVisible && slide.layout === 'scene' && (
        <div className="pointer-events-auto absolute bottom-4 left-4 z-10 max-h-[60%] w-[30rem] max-w-[45%] overflow-y-auto rounded-xl border border-line/70 bg-bg/85 p-5 backdrop-blur">
          <SlideText large />
        </div>
      )}
    </div>
  )
}

function SlideBullets() {
  const imported = useApp((s) => s.importedPages)
  const idx = useApp((s) => s.slideIndex)
  const slide = allSlides(imported)[idx]
  return (
    <ul className="space-y-3 text-[20px] leading-snug">
      {slide.bullets!.map((b) => (
        <li key={b} className="flex gap-2.5">
          <span className="mt-[0.5em] h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}

function TitleOverlay({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg/80 to-transparent px-5 pb-6 pt-24 md:px-10 md:pb-8 md:pt-28">
      <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg md:text-5xl">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-ink-2 drop-shadow md:text-2xl">{subtitle}</p>}
    </div>
  )
}

function ViewToolbar() {
  const mode = useApp((s) => s.mode)
  const setMode = useApp((s) => s.setMode)
  const setView = useApp((s) => s.setView)
  const view = useApp((s) => s.view)
  const cloudOn = useCloud((s) => s.status !== 'off')
  const viewer = useCloud((s) => s.role === 'viewer')
  if (viewer) return null
  return (
    <div className="absolute left-3 right-3 top-3 z-10 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <div className="flex shrink-0 rounded-lg border border-line bg-panel/90 p-1 backdrop-blur" role="group" aria-label="Mode d'affichage">
        {MODES.map((m) => (
          <button key={m.id} className={`btn border-0 ${mode === m.id ? 'on' : 'bg-transparent'}`} onClick={() => setMode(m.id)} title={`${m.label} (touche ${m.key})`}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 rounded-lg border border-line bg-panel/90 p-1 backdrop-blur" role="group" aria-label="Vue caméra">
        {VIEWS.map((v) => (
          <button key={v.id} className={`btn border-0 px-2 ${view === v.id ? 'on' : 'bg-transparent'}`} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {!cloudOn && <ExportGlb />}
    </div>
  )
}

/** Export du modèle courant au format GLB (réutilisable dans Blender ou un autre moteur). */
function ExportGlb() {
  const model = useApp((s) => s.model)
  const cooling = useApp((s) => s.cooling)
  const [busy, setBusy] = useState(false)
  return (
    <button
      className="btn ml-auto hidden shrink-0 bg-panel/90 md:inline-flex"
      disabled={busy}
      title="Exporter le modèle 3D affiché (GLB)"
      onClick={async () => {
        setBusy(true)
        try {
          const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
          const scene = (window as unknown as { __r3f?: { scene: THREE.Scene } }).__r3f?.scene
          const root = scene?.getObjectByName('model-root')
          if (!root) return
          const glb = (await new GLTFExporter().parseAsync(root, { binary: true })) as ArrayBuffer
          const a = document.createElement('a')
          a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' }))
          a.download = `transformateur-${model}-${cooling}.glb`
          a.click()
          setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? 'Export…' : 'Exporter GLB'}
    </button>
  )
}

/** Commandes et légende de l'animation de refroidissement. */
function CoolingHud() {
  const mode = useApp((s) => s.mode)
  const playing = useApp((s) => s.playing)
  const speed = useApp((s) => s.speed)
  const cooling = useApp((s) => s.cooling)
  const flux = useApp((s) => s.layers.flux)
  const s = useApp()
  const viewer = useCloud((st) => st.role === 'viewer')
  const visible = mode === 'refroidissement' || mode === 'coupe'
  const caption = useCaption(cooling, visible)
  if (!visible) return null
  const fluids = [
    { k: 'Huile', shape: 'rounded-full', show: cooling.length === 4 },
    { k: 'Air', shape: 'rounded-full opacity-70 scale-75', show: cooling[2] !== 'W' },
    { k: 'Eau', shape: 'rotate-45', show: usesWater(cooling) },
  ]
  return (
    <div className="absolute bottom-3 right-3 z-10 w-[22rem] max-w-[calc(100%-1.5rem)] rounded-xl border border-line bg-panel/90 p-3 text-[13px] backdrop-blur" data-testid="cooling-hud">
      <div className="mb-2 flex items-center justify-between">
        <span>
          <b className="font-mono text-base text-accent">{cooling}</b>
          <span className="ml-2 text-ink-2">{COOLING[cooling].nom.split(' — ')[1]}</span>
        </span>
      </div>
      {!viewer && (
        <div className="mb-2 flex items-center gap-1.5">
          {playing ? (
            <button className="btn" onClick={s.pause} aria-label="Pause">❚❚ Pause</button>
          ) : (
            <button className="btn btn-primary" onClick={s.play} aria-label="Démarrer">▶ Démarrer</button>
          )}
          <button className="btn" onClick={s.restart} aria-label="Recommencer">↺</button>
          <button className={`btn ${flux ? 'on' : ''}`} onClick={() => s.toggleLayer('flux')}>Flux</button>
          <label className="ml-1 flex flex-1 items-center gap-1.5 text-xs text-ink-3">
            ×{speed.toFixed(1)}
            <input type="range" min={0.25} max={3} step={0.25} value={speed} onChange={(e) => s.setSpeed(+e.target.value)} className="w-full" aria-label="Vitesse d'animation" />
          </label>
        </div>
      )}
      {mode === 'coupe' && !playing && <p className="mb-2 text-xs text-ink-3">Démarrer pour afficher les circulations dans la coupe.</p>}
      <div className="legend-gradient h-2.5 rounded" />
      <div className="mt-0.5 flex justify-between text-xs text-ink-3"><span>froid</span><span>température relative</span><span>chaud</span></div>
      <div className="mt-2 flex gap-3 text-xs text-ink-2">
        {fluids.filter((f) => f.show).map((f) => (
          <span key={f.k} className="flex items-center gap-1.5"><span className={`inline-block h-2.5 w-2.5 bg-ink ${f.shape}`} />{f.k}</span>
        ))}
        {usesFans(cooling) && <span>• ventilateurs</span>}
        {usesPumps(cooling) && <span>• pompes</span>}
        {isDirected(cooling) && <span>• huile dirigée</span>}
      </div>
      {caption && <p className="mt-2 rounded bg-bg/60 px-2 py-1 text-[12.5px] text-ink" data-testid="cooling-caption">{caption}</p>}
      <p className="mt-2 text-[11px] leading-snug text-ink-3">Visualisation pédagogique qualitative : ni les vitesses ni les couleurs ne sont issues d’une simulation thermique.</p>
    </div>
  )
}

/** Légende par phase, synchronisée sur le temps d'animation. */
function useCaption(cooling: string, on: boolean) {
  const [txt, setTxt] = useState('')
  const cloudOn = useCloud((s) => s.status !== 'off')
  useEffect(() => {
    if (!on) return
    const phases: [number, string][] =
      cooling === 'AN' || cooling === 'AF'
        ? [[0, '1. Les enroulements s’échauffent (pertes Joule et pertes fer).'], [1.5, cooling === 'AF' ? '2. Les ventilateurs soufflent l’air dans les canaux des bobines.' : '2. L’air chauffé monte dans les canaux : convection naturelle.'], [5, '3. L’air chaud est évacué par le haut ; de l’air frais entre par le bas.']]
        : [
            [0, '1. Les enroulements s’échauffent (pertes Joule et pertes fer).'],
            [1.5, isDirected(cooling as never) ? '2. L’huile pompée est dirigée dans les enroulements (parcours en zigzag).' : '2. L’huile chaude, plus légère, monte dans les canaux des enroulements.'],
            [5, usesWater(cooling as never) ? '3. L’huile cède sa chaleur à l’eau dans l’échangeur, à contre-courant.' : usesFans(cooling as never) ? '3. L’air forcé par les ventilateurs refroidit l’huile dans l’échangeur.' : '3. L’huile se refroidit en descendant dans les radiateurs ; l’air monte le long des éléments.'],
            [9, usesPumps(cooling as never) ? '4. La pompe renvoie l’huile refroidie en bas de cuve.' : '4. L’huile refroidie revient en bas de cuve : la boucle recommence.'],
          ]
    const tick = () => {
      // En rendu distant, le temps est estimé localement (approximation de la légende uniquement)
      const t = cloudOn ? (performance.now() / 1000) % 12 : anim.t
      let cur = phases[0][1]
      for (const [ts, s] of phases) if (t >= ts) cur = s
      setTxt(cur)
    }
    tick()
    const id = setInterval(tick, 300)
    return () => clearInterval(id)
  }, [cooling, on, cloudOn])
  return txt
}

import { create } from 'zustand'
import type { CameraView, CoolingId, LayerId, ModelId, Quality, SceneConfig, ViewMode } from './types'
import { SLIDES, type Slide } from './data/slides'
import { COOLING_BY_MODEL } from './data/cooling'

export interface ImportedPage {
  id: string
  title: string
  image: string // dataURL de la page rendue
}

interface AppState {
  // Scène
  model: ModelId
  cooling: CoolingId
  mode: ViewMode
  view: CameraView
  viewNonce: number // incrémenté pour rejouer une vue même identique
  labels: boolean
  layers: Record<LayerId, boolean>
  sectionOffset: number // position du plan de coupe (fraction -0.5..0.5 de la profondeur)
  quality: Quality
  selectedPart: string | null
  hoveredPart: string | null

  // Animation de refroidissement
  playing: boolean
  speed: number
  resetNonce: number

  // Présentation
  slideIndex: number
  stepIndex: number
  presenting: boolean
  sceneOverride: boolean // l'utilisateur a modifié la scène indépendamment de la diapositive
  importedPages: ImportedPage[]
  showHelp: boolean

  setScene: (cfg: Partial<SceneConfig>, fromUser?: boolean) => void
  setMode: (m: ViewMode) => void
  setView: (v: CameraView) => void
  setModel: (m: ModelId) => void
  setCooling: (c: CoolingId) => void
  toggleLayer: (l: LayerId) => void
  setSectionOffset: (v: number) => void
  setQuality: (q: Quality) => void
  select: (id: string | null) => void
  hover: (id: string | null) => void
  setLabels: (v: boolean) => void
  play: () => void
  pause: () => void
  restart: () => void
  setSpeed: (s: number) => void

  goToSlide: (i: number, step?: number) => void
  next: () => void
  prev: () => void
  setPresenting: (v: boolean) => void
  addImportedPages: (p: ImportedPage[]) => void
  clearImportedPages: () => void
  setShowHelp: (v: boolean) => void
}

/** Liste complète des diapositives (intégrées + pages importées). */
export function allSlides(imported: ImportedPage[]): Slide[] {
  if (imported.length === 0) return SLIDES
  const extra: Slide[] = imported.map((p, i) => ({
    id: `import-${p.id}`,
    part: 8,
    title: p.title || `Page importée ${i + 1}`,
    layout: 'image',
    image: p.image,
  }))
  // Les pages importées sont insérées avant la diapositive « Questions / réponses ».
  const qIndex = SLIDES.findIndex((s) => s.id === 'questions')
  return [...SLIDES.slice(0, qIndex), ...extra, ...SLIDES.slice(qIndex)]
}

/** Compatibilité modèle / refroidissement : corrige une combinaison impossible. */
function coherent(model: ModelId, cooling: CoolingId): CoolingId {
  const allowed = COOLING_BY_MODEL[model]
  return allowed.includes(cooling) ? cooling : allowed[0]
}

/** Calcule l'état de scène résultant d'une diapositive et d'une étape. */
function sceneForStep(slide: Slide, step: number): Partial<SceneConfig> | null {
  if (!slide.scene) return null
  let cfg: Partial<SceneConfig> = { labels: false, play: false, ...slide.scene }
  const steps = slide.steps ?? []
  for (let i = 0; i < step && i < steps.length; i++) {
    if (steps[i].scene) cfg = { ...cfg, ...steps[i].scene }
  }
  return cfg
}

export const useApp = create<AppState>((set, get) => ({
  model: 'puissance',
  cooling: 'ONAN',
  mode: 'exterieur',
  view: 'iso',
  viewNonce: 0,
  labels: false,
  layers: { cuve: true, partieActive: true, refroidissement: true, accessoires: true, flux: true },
  sectionOffset: 0,
  quality: 'equilibre',
  selectedPart: null,
  hoveredPart: null,

  playing: false,
  speed: 1,
  resetNonce: 0,

  slideIndex: 0,
  stepIndex: 0,
  presenting: false,
  sceneOverride: false,
  importedPages: [],
  showHelp: false,

  setScene: (cfg, fromUser = false) => {
    const s = get()
    const model = cfg.model ?? s.model
    const cooling = coherent(model, cfg.cooling ?? s.cooling)
    const patch: Partial<AppState> = { model, cooling }
    if (cfg.mode) patch.mode = cfg.mode
    if (cfg.labels !== undefined) patch.labels = cfg.labels
    if (cfg.view) {
      patch.view = cfg.view
      patch.viewNonce = s.viewNonce + 1
    } else if (model !== s.model) {
      patch.viewNonce = s.viewNonce + 1 // recadrer quand le modèle change
    }
    if (model !== s.model || cooling !== s.cooling) {
      patch.selectedPart = null
      patch.resetNonce = s.resetNonce + 1
    }
    if (cfg.play !== undefined) {
      patch.playing = cfg.play
      if (cfg.play) patch.resetNonce = (patch.resetNonce ?? s.resetNonce) + 1
    }
    if (fromUser) patch.sceneOverride = true
    set(patch)
  },
  setMode: (mode) => {
    const patch: Partial<AppState> = { mode, sceneOverride: true }
    if (mode === 'refroidissement' && !get().playing) {
      patch.playing = true
      patch.resetNonce = get().resetNonce + 1
    }
    set(patch)
  },
  setView: (view) => set((s) => ({ view, viewNonce: s.viewNonce + 1 })),
  setModel: (model) => get().setScene({ model }, true),
  setCooling: (cooling) => {
    // Choisit automatiquement le modèle adapté au refroidissement demandé.
    const s = get()
    let model = s.model
    if (!COOLING_BY_MODEL[model].includes(cooling)) {
      model = (Object.keys(COOLING_BY_MODEL) as ModelId[]).find((m) =>
        COOLING_BY_MODEL[m].includes(cooling) && m !== 'monophase' && m !== 'distribution',
      ) ?? model
    }
    get().setScene({ model, cooling }, true)
  },
  toggleLayer: (l) => set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
  setSectionOffset: (sectionOffset) => set({ sectionOffset }),
  setQuality: (quality) => {
    markQualityManual()
    set({ quality })
    try { localStorage.setItem('tr3d-quality', quality) } catch { /* stockage indisponible */ }
  },
  select: (selectedPart) => set({ selectedPart }),
  hover: (hoveredPart) => set({ hoveredPart }),
  setLabels: (labels) => set({ labels }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  restart: () => set((s) => ({ resetNonce: s.resetNonce + 1, playing: true })),
  setSpeed: (speed) => set({ speed }),

  goToSlide: (i, step = 0) => {
    const slides = allSlides(get().importedPages)
    const idx = Math.max(0, Math.min(slides.length - 1, i))
    const slide = slides[idx]
    const st = Math.max(0, Math.min(step, slide.steps?.length ?? 0))
    set({ slideIndex: idx, stepIndex: st, sceneOverride: false, selectedPart: null })
    const cfg = sceneForStep(slide, st)
    if (cfg) get().setScene(cfg)
  },
  next: () => {
    const s = get()
    const slides = allSlides(s.importedPages)
    const slide = slides[s.slideIndex]
    const nSteps = slide.steps?.length ?? 0
    if (s.stepIndex < nSteps) {
      const st = s.stepIndex + 1
      set({ stepIndex: st })
      const step = slide.steps![st - 1]
      if (step.scene) get().setScene(step.scene)
    } else if (s.slideIndex < slides.length - 1) {
      get().goToSlide(s.slideIndex + 1)
    }
  },
  prev: () => {
    const s = get()
    if (s.stepIndex > 0) {
      get().goToSlide(s.slideIndex, s.stepIndex - 1)
    } else if (s.slideIndex > 0) {
      const slides = allSlides(s.importedPages)
      const p = slides[s.slideIndex - 1]
      get().goToSlide(s.slideIndex - 1, p.steps?.length ?? 0)
    }
  },
  setPresenting: (presenting) => set({ presenting }),
  addImportedPages: (p) => set((s) => ({ importedPages: [...s.importedPages, ...p] })),
  clearImportedPages: () => {
    const s = get()
    set({ importedPages: [] })
    if (s.slideIndex >= SLIDES.length) get().goToSlide(SLIDES.length - 1)
  },
  setShowHelp: (showHelp) => set({ showHelp }),
}))

// Qualité mémorisée entre deux sessions (confort uniquement).
/** Vrai tant que l'utilisateur n'a pas choisi de qualité : l'ajustement automatique reste permis. */
export let qualityAuto = true
try {
  const q = localStorage.getItem('tr3d-quality') as Quality | null
  if (q === 'performance' || q === 'equilibre' || q === 'haute') {
    useApp.setState({ quality: q })
    qualityAuto = false
  } else if (window.matchMedia('(max-width: 1099px), (pointer: coarse)').matches) {
    useApp.setState({ quality: 'performance' }) // mobile / tablette
  }
} catch { /* ignore */ }
export const markQualityManual = () => { qualityAuto = false }

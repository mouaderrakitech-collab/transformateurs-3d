import { allSlides, useApp } from '../store'
import { PARTS_TITLES } from '../data/slides'
import { useCloud } from '../remote/cloud'
import { useTelemetry, isSoftwareRenderer } from '../telemetry'
import { useCompact, useDrawer } from './layout'

export function toggleFullscreen() {
  const s = useApp.getState()
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => undefined)
    s.setPresenting(true)
  } else {
    document.exitFullscreen?.()
    s.setPresenting(false)
  }
}

export function BottomBar() {
  const imported = useApp((s) => s.importedPages)
  const slides = allSlides(imported)
  const idx = useApp((s) => s.slideIndex)
  const step = useApp((s) => s.stepIndex)
  const presenting = useApp((s) => s.presenting)
  const s = useApp()
  const slide = slides[idx]
  const nSteps = slide.steps?.length ?? 0
  const viewer = useCloud((c) => c.role === 'viewer')
  const compact = useCompact()
  const drawer = useDrawer()

  return (
    <footer className="flex h-14 shrink-0 items-center gap-2 border-t border-line bg-panel px-2 md:gap-3 md:px-3" data-testid="bottombar">
      {compact && !presenting && (
        <button className={`btn h-9 ${drawer.open === 'left' ? 'on' : ''}`} onClick={() => drawer.set(drawer.open === 'left' ? null : 'left')} aria-label="Sommaire" data-testid="open-toc">☰</button>
      )}
      <button className="btn h-9 w-10 text-lg" onClick={s.prev} disabled={viewer || (idx === 0 && step === 0)} aria-label="Précédent">‹</button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-[13px]">
          <span className="shrink-0 whitespace-nowrap font-mono text-ink" data-testid="slide-number">{idx + 1} / {slides.length}</span>
          <span className="hidden truncate text-ink-3 md:inline">{PARTS_TITLES[slide.part]}</span>
          <span className="truncate font-medium text-ink-2">— {slide.title}</span>
          {nSteps > 0 && (
            <span className="ml-1 flex gap-1" aria-label={`Étape ${step} sur ${nSteps}`}>
              {Array.from({ length: nSteps + 1 }, (_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= step ? 'bg-accent' : 'bg-line'}`} />
              ))}
            </span>
          )}
        </div>
        {/* Progression cliquable */}
        <div className="mt-1.5 flex h-1.5 gap-px overflow-hidden rounded" role="navigation" aria-label="Progression">
          {slides.map((sl, i) => (
            <button
              key={sl.id}
              onClick={() => !viewer && s.goToSlide(i)}
              title={`${i + 1}. ${sl.title}`}
              className={`h-full flex-1 ${i < idx ? 'bg-accent/60' : i === idx ? 'bg-accent' : 'bg-line hover:bg-ink-3'}`}
              aria-label={`Aller à la diapositive ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <button className="btn h-9 w-10 text-lg" onClick={s.next} disabled={viewer || (idx === slides.length - 1 && step >= nSteps)} aria-label="Suivant">›</button>
      <RenderChip />
      {compact && !presenting && (
        <button className={`btn h-9 ${drawer.open === 'right' ? 'on' : ''}`} onClick={() => drawer.set(drawer.open === 'right' ? null : 'right')} aria-label="Explications et réglages" data-testid="open-info">ⓘ</button>
      )}
      <button className={`btn hidden h-9 sm:inline-flex ${presenting ? 'on' : ''}`} onClick={() => s.setPresenting(!presenting)} title="Mode présentation (P)">
        Présentation
      </button>
      <button className="btn h-9" onClick={toggleFullscreen} title="Plein écran (F)">⛶</button>
      <button className="btn hidden h-9 sm:inline-flex" onClick={() => s.setShowHelp(true)} title="Aide (?)">?</button>
    </footer>
  )
}

/** Indique qui calcule l'image : GPU local ou GPU distant (avec état de connexion). */
function RenderChip() {
  const status = useCloud((c) => c.status)
  const tgpu = useCloud((c) => c.telemetry?.gpu)
  const fps = useCloud((c) => c.stats.fps)
  const local = useTelemetry()
  const on = status !== 'off'
  const color = !on ? 'bg-ink-3' : status === 'streaming' ? 'bg-ok' : status === 'fallback' ? 'bg-warn' : 'bg-err'
  const soft = !on && isSoftwareRenderer(local.gpu)
  return (
    <div
      className="hidden max-w-[17rem] items-center gap-2 rounded-md border border-line px-2 py-1 text-xs lg:flex"
      title={on ? `Rendu GPU Cloud : ${tgpu ?? '…'}` : `Rendu local : ${local.gpu}`}
      data-testid="render-chip"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span className="truncate">
        {on ? `GPU Cloud${status === 'streaming' || status === 'fallback' ? ` · ${fps || '–'} i/s` : ' · ' + status}` : `GPU local · ${local.idle ? 'au repos' : local.fps + ' i/s'}`}
        {soft && ' · logiciel'}
      </span>
    </div>
  )
}

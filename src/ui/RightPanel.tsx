import { useEffect, useState } from 'react'
import { allSlides, useApp } from '../store'
import { COOLING } from '../data/cooling'
import { PARTS } from '../data/catalog'
import { refTitle } from '../data/references'
import type { LayerId, Quality } from '../types'
import { PdfImport } from './PdfImport'
import { CloudPanel } from '../remote/CloudPanel'
import { useMedia } from './MediaView'

type Tab = 'explications' | 'composant' | 'reglages'

export function RightPanel() {
  const [tab, setTab] = useState<Tab>('explications')
  const selected = useApp((s) => s.selectedPart)
  useEffect(() => {
    if (selected) setTab('composant')
  }, [selected])
  return (
    <aside className="flex h-full w-[23rem] max-w-full shrink-0 flex-col border-l border-line bg-panel">
      <div className="grid grid-cols-3 border-b border-line text-xs">
        {(['explications', 'composant', 'reglages'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-1 py-2.5 font-medium capitalize ${tab === t ? 'border-b-2 border-accent text-accent-2' : 'text-ink-2 hover:text-ink'}`}
          >
            {t === 'reglages' ? 'Réglages' : t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'explications' && <Explications />}
        {tab === 'composant' && <Composant />}
        {tab === 'reglages' && <Reglages />}
      </div>
    </aside>
  )
}

export function SlideText({ large = false }: { large?: boolean }) {
  const imported = useApp((s) => s.importedPages)
  const idx = useApp((s) => s.slideIndex)
  const step = useApp((s) => s.stepIndex)
  const next = useApp((s) => s.next)
  const slide = allSlides(imported)[idx]
  return (
    <div key={slide.id + step} className="slide-enter">
      <h2 className={`${large ? 'text-3xl' : 'text-xl'} font-semibold leading-tight`}>{slide.title}</h2>
      {slide.subtitle && <p className={`${large ? 'text-lg' : 'text-sm'} mt-1 text-ink-2`}>{slide.subtitle}</p>}
      {slide.bullets && (
        <ul className={`mt-3 space-y-2 ${large ? 'text-[19px]' : 'text-[14.5px]'} leading-snug`}>
          {slide.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {slide.steps && slide.steps.length > 0 && (
        <div className="mt-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Démonstration</div>
          {slide.steps.map((s, i) => (
            <button
              key={s.label}
              onClick={() => (i === step ? next() : useApp.getState().goToSlide(idx, i + 1))}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[13px] ${
                i < step ? 'text-ok' : i === step ? 'bg-accent/10 text-accent-2' : 'text-ink-3'
              }`}
            >
              <span className="font-mono">{i < step ? '✓' : i === step ? '▶' : '○'}</span>
              {s.label}
            </button>
          ))}
        </div>
      )}
      {slide.refs && slide.refs.length > 0 && (
        <p className="mt-4 text-xs text-ink-3">Références : {slide.refs.map(refTitle).join(' ; ')}</p>
      )}
      {slide.notes && <p className="mt-2 text-xs italic text-ink-3">{slide.notes}</p>}
    </div>
  )
}

function Explications() {
  const cooling = useApp((s) => s.cooling)
  const c = COOLING[cooling]
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-4 p-4">
      <SlideText />
      <div className="rounded-lg border border-line bg-panel-2">
        <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left">
          <span>
            <span className="font-mono text-base font-bold text-accent">{c.id}</span>
            <span className="ml-2 text-[13px] text-ink-2">{c.nom.split(' — ')[1]}</span>
          </span>
          <span className="text-ink-3">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="space-y-3 border-t border-line px-3 py-3 text-[13px] leading-snug">
            <div className="flex flex-wrap gap-1.5">
              {c.lettres.map((l, i) => (
                <span key={i} className="rounded border border-line px-1.5 py-0.5" title={l.sens}>
                  <b className="font-mono text-accent">{l.lettre}</b> <span className="text-ink-3">{l.sens.split(' : ')[0]}</span>
                </span>
              ))}
            </div>
            <p>{c.principe}</p>
            <Block title="Composants" items={c.composants} />
            <Block title="Circuits" items={c.circuits} />
            <Block title="Applications" items={c.applications} />
            <Block title="Avantages" items={c.avantages} sign="+" />
            <Block title="Limites" items={c.limites} sign="−" />
            <p className="text-xs text-ink-3">Norme : {c.norme}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Block({ title, items, sign }: { title: string; items: string[]; sign?: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{title}</div>
      <ul className="space-y-0.5">
        {items.map((i) => (
          <li key={i} className="flex gap-1.5">
            <span className={sign === '+' ? 'text-ok' : sign === '−' ? 'text-err' : 'text-ink-3'}>{sign ?? '•'}</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Composant() {
  const id = useApp((s) => s.selectedPart)
  const hovered = useApp((s) => s.hoveredPart)
  const select = useApp((s) => s.select)
  const p = id ? PARTS[id] : null
  return (
    <div className="space-y-3 p-4">
      {!p && (
        <p className="text-sm text-ink-2">
          Cliquer sur un composant du modèle 3D pour afficher sa description. {hovered && <>Survol : <b>{PARTS[hovered]?.nom}</b></>}
        </p>
      )}
      {p && (
        <div className="slide-enter space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">{p.famille}</div>
          <h3 className="text-xl font-semibold">{p.nom}</h3>
          <p className="text-[14.5px] leading-relaxed text-ink">{p.description}</p>
          <button className="btn" onClick={() => select(null)}>Désélectionner</button>
        </div>
      )}
    </div>
  )
}

const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'cuve', label: 'Cuve et structure' },
  { id: 'partieActive', label: 'Partie active et traversées' },
  { id: 'refroidissement', label: 'Équipements de refroidissement' },
  { id: 'accessoires', label: 'Accessoires et protection' },
  { id: 'flux', label: 'Flux (particules et flèches)' },
]

function MediaToggle() {
  const on = useMedia((s) => s.on)
  const set = useMedia((s) => s.set)
  return (
    <label className="mt-2 flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={on} onChange={() => set(!on, on ? '' : 'Activé manuellement.')} className="accent-amber-500" />
      Mode de secours : images et vidéos précalculées
    </label>
  )
}

function Reglages() {
  const s = useApp()
  return (
    <div className="space-y-5 p-4 text-[13.5px]">
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Composants affichés</h4>
        <div className="space-y-1.5">
          {LAYERS.map((l) => (
            <label key={l.id} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={s.layers[l.id]} onChange={() => s.toggleLayer(l.id)} className="accent-amber-500" />
              {l.label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={s.labels} onChange={() => s.setLabels(!s.labels)} className="accent-amber-500" />
            Étiquettes des composants
          </label>
        </div>
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Plan de coupe (mode coupe)</h4>
        <input
          type="range"
          min={-0.45}
          max={0.45}
          step={0.01}
          value={s.sectionOffset}
          onChange={(e) => s.setSectionOffset(+e.target.value)}
          className="w-full"
          aria-label="Position du plan de coupe"
        />
        <div className="flex justify-between text-xs text-ink-3"><span>arrière</span><span>centre</span><span>avant</span></div>
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Qualité graphique</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {(['performance', 'equilibre', 'haute'] as Quality[]).map((q) => (
            <button key={q} className={`btn ${s.quality === q ? 'on' : ''}`} onClick={() => s.setQuality(q)}>
              {q === 'performance' ? 'Performance' : q === 'equilibre' ? 'Équilibré' : 'Haute'}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-3">Résolution, ombres, finesse des géométries et densité des particules.</p>
        <MediaToggle />
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Rendu GPU distant (RunPod)</h4>
        <CloudPanel />
      </section>
      <section>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Importer une présentation</h4>
        <PdfImport />
      </section>
    </div>
  )
}

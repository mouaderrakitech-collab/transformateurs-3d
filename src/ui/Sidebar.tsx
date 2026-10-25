import { useState } from 'react'
import { allSlides, useApp } from '../store'
import { PARTS_TITLES } from '../data/slides'
import { TYPES } from '../data/catalog'
import { COOLING, COOLING_ORDER } from '../data/cooling'

type Tab = 'sommaire' | 'types' | 'refroidissement'

export function Sidebar() {
  const [tab, setTab] = useState<Tab>('sommaire')
  return (
    <aside className="flex h-full w-72 max-w-full shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
          <rect x="7" y="7" width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="3" />
          <circle cx="10" cy="16" r="4" fill="#d97706" />
          <circle cx="22" cy="16" r="4" fill="#d97706" />
        </svg>
        <div>
          <div className="text-[15px] font-semibold leading-tight">Transformateurs 3D</div>
          <div className="text-xs text-ink-3">Types et refroidissement</div>
        </div>
      </div>
      <div className="grid grid-cols-3 border-b border-line text-xs">
        {(['sommaire', 'types', 'refroidissement'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-1 py-2.5 font-medium capitalize ${tab === t ? 'border-b-2 border-accent text-accent-2' : 'text-ink-2 hover:text-ink'}`}
          >
            {t === 'refroidissement' ? 'Refroid.' : t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'sommaire' && <Toc />}
        {tab === 'types' && <Types />}
        {tab === 'refroidissement' && <Coolings />}
      </div>
    </aside>
  )
}

function Toc() {
  const imported = useApp((s) => s.importedPages)
  const slides = allSlides(imported)
  const idx = useApp((s) => s.slideIndex)
  const go = useApp((s) => s.goToSlide)
  let lastPart = -1
  return (
    <nav className="py-2" aria-label="Sommaire">
      {slides.map((s, i) => {
        const header = s.part !== lastPart ? PARTS_TITLES[s.part] : null
        lastPart = s.part
        return (
          <div key={s.id}>
            {header && <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{header}</div>}
            <button
              onClick={() => go(i)}
              className={`flex w-full items-baseline gap-2 px-4 py-1.5 text-left text-[13.5px] ${
                i === idx ? 'bg-accent/15 text-accent-2' : 'text-ink-2 hover:bg-panel-2 hover:text-ink'
              }`}
            >
              <span className="w-5 shrink-0 text-right font-mono text-[11px] text-ink-3">{i + 1}</span>
              <span>{s.title}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}

function Types() {
  const setScene = useApp((s) => s.setScene)
  const model = useApp((s) => s.model)
  return (
    <div className="space-y-2 p-3">
      <p className="px-1 text-xs text-ink-3">
        Ces catégories ne sont pas exclusives : un appareil combine un nombre de phases, un type d’isolation et une fonction dans le réseau.
      </p>
      {TYPES.map((t) => (
        <button
          key={t.id}
          onClick={() => setScene({ model: t.modele, cooling: t.cooling, mode: t.mode, view: 'iso' }, true)}
          className={`w-full rounded-md border p-2.5 text-left ${model === t.modele ? 'border-accent/50 bg-accent/5' : 'border-line hover:bg-panel-2'}`}
        >
          <div className="text-[14px] font-semibold">{t.nom}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink-3">{t.critere}</div>
          <div className="mt-1 text-[12.5px] text-ink-2">{t.resume}</div>
        </button>
      ))}
    </div>
  )
}

function Coolings() {
  const cooling = useApp((s) => s.cooling)
  const setCooling = useApp((s) => s.setCooling)
  const setMode = useApp((s) => s.setMode)
  return (
    <div className="space-y-1.5 p-3">
      <p className="px-1 pb-1 text-xs text-ink-3">Désignations IEC 60076-2 (immergés) et IEC 60076-11 (secs).</p>
      {COOLING_ORDER.map((id) => (
        <button
          key={id}
          onClick={() => {
            setCooling(id)
            setMode('refroidissement')
          }}
          className={`flex w-full items-center gap-3 rounded-md border px-2.5 py-2 text-left ${
            cooling === id ? 'border-accent/60 bg-accent/10' : 'border-line hover:bg-panel-2'
          }`}
        >
          <span className="w-14 font-mono text-[15px] font-bold text-accent">{id}</span>
          <span className="text-[12.5px] leading-snug text-ink-2">{COOLING[id].nom.split(' — ')[1]}</span>
        </button>
      ))}
    </div>
  )
}

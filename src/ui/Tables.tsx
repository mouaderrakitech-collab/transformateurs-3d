import { COOLING, COOLING_ORDER, LEVEL_LABEL, type Level } from '../data/cooling'
import { REFERENCES } from '../data/references'
import type { TableId } from '../data/slides'
import { useApp } from '../store'

function Dots({ v }: { v: Level }) {
  return (
    <span className="inline-flex items-center gap-1" title={LEVEL_LABEL[v]}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= v ? 'bg-accent' : 'bg-line'}`} />
      ))}
      <span className="ml-1 text-ink-3 text-xs">{LEVEL_LABEL[v]}</span>
    </span>
  )
}

function Comparaison() {
  const setCooling = useApp((s) => s.setCooling)
  const setMode = useApp((s) => s.setMode)
  const internal = (id: string) => (id.length === 2 ? '—' : id[1] === 'N' ? 'Naturelle' : id[1] === 'F' ? 'Forcée' : 'Dirigée')
  const extFluid = (id: string) => (id.length === 2 ? 'Air' : id[2] === 'A' ? 'Air' : 'Eau')
  const extCirc = (id: string) => (id[id.length - 1] === 'N' ? 'Naturelle' : 'Forcée')
  return (
    <div className="h-full overflow-auto p-4">
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr className="text-left text-ink-2">
            {['Mode', 'Fluide interne', 'Circulation interne', 'Fluide externe', 'Circulation externe', 'Auxiliaires', 'Complexité', 'Maintenance', 'Dépendance aux auxiliaires'].map((h) => (
              <th key={h} className="border-b border-line px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COOLING_ORDER.map((id) => {
            const c = COOLING[id]
            return (
              <tr key={id} className="hover:bg-panel-2">
                <td className="border-b border-line px-3 py-2">
                  <button
                    className="font-mono text-lg font-bold text-accent hover:underline"
                    onClick={() => {
                      setCooling(id)
                      setMode('refroidissement')
                    }}
                    title="Afficher en 3D"
                  >
                    {id}
                  </button>
                </td>
                <td className="border-b border-line px-3 py-2">{id.length === 2 ? 'Aucun (sec)' : 'Huile (O)'}</td>
                <td className="border-b border-line px-3 py-2">{internal(id)}</td>
                <td className="border-b border-line px-3 py-2">{extFluid(id)}</td>
                <td className="border-b border-line px-3 py-2">{extCirc(id)}</td>
                <td className="border-b border-line px-3 py-2">{c.auxiliaires}</td>
                <td className="border-b border-line px-3 py-2"><Dots v={c.complexite} /></td>
                <td className="border-b border-line px-3 py-2"><Dots v={c.maintenance} /></td>
                <td className="border-b border-line px-3 py-2"><Dots v={c.dependanceAuxiliaires} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-ink-3">
        Niveaux qualitatifs relatifs entre systèmes, établis à partir de la nature des équipements (auxiliaires, circuits). Ils ne remplacent pas les données d’un constructeur.
        Cliquer sur un mode pour l’afficher en 3D.
      </p>
    </div>
  )
}

function Avantages() {
  return (
    <div className="grid h-full grid-cols-1 gap-3 overflow-auto p-4 md:grid-cols-2 xl:grid-cols-4">
      {COOLING_ORDER.map((id) => {
        const c = COOLING[id]
        return (
          <div key={id} className="rounded-lg border border-line bg-panel-2 p-3">
            <div className="font-mono text-xl font-bold text-accent">{id}</div>
            <div className="mb-2 text-xs text-ink-3">{c.applications[0]}</div>
            <ul className="space-y-1 text-[13.5px]">
              {c.avantages.slice(0, 3).map((a) => (
                <li key={a} className="flex gap-1.5"><span className="text-ok">+</span><span>{a}</span></li>
              ))}
              {c.limites.slice(0, 3).map((a) => (
                <li key={a} className="flex gap-1.5 text-ink-2"><span className="text-err">−</span><span>{a}</span></li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function Table({ id }: { id: TableId }) {
  return id === 'comparaison' ? <Comparaison /> : <Avantages />
}

export function References() {
  return (
    <div className="h-full overflow-auto p-6">
      <ul className="space-y-3 text-[16px]">
        {REFERENCES.map((r) => (
          <li key={r.id} className="border-l-2 border-accent pl-3">
            <div className="font-semibold">{r.titre}</div>
            <div className="text-ink-2">{r.detail}</div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink-3">
        Les valeurs citées (limites d’échauffement) proviennent de l’IEC 60076-2:2011 ; vérifier l’édition en vigueur avant tout usage contractuel.
        Les modèles 3D sont des représentations paramétriques pédagogiques et ne reproduisent pas un appareil d’un constructeur précis.
      </p>
    </div>
  )
}

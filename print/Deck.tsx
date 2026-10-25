import { SLIDES, PARTS_TITLES, type Slide } from '../src/data/slides'
import { COOLING, COOLING_ORDER, LEVEL_LABEL, type Level } from '../src/data/cooling'
import { REFERENCES, refTitle } from '../src/data/references'
import { Diagram } from '../src/ui/Diagrams'
import { PAGES, type Fig } from './content'
import figuresMeta from './captures/figures.json'

type Meta = Record<string, { labels?: { name: string; x: number; y: number }[] }>
const META = figuresMeta as unknown as Meta
const TOTAL = SLIDES.length
const DOC_TITLE = 'Les transformateurs électriques — types et systèmes de refroidissement'

function Figure({ fig, compact }: { fig: Fig; compact?: boolean }) {
  const labels = META[fig.img]?.labels ?? []
  const pts = (fig.callouts ?? [])
    .map((name) => labels.find((l) => l.name === name))
    .filter((l): l is { name: string; x: number; y: number } => !!l)
  return (
    <figure className={`fig ${compact ? 'fig-compact' : ''}`} data-img={fig.img} data-expected={(fig.callouts ?? []).join('|')} data-shown={pts.map((p) => p.name).join('|')}>
      <div className="fig-img">
        <img src={`./img/${fig.img}.jpg`} alt={fig.caption} />
        {pts.map((p, i) => (
          <span key={p.name} className="callout" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
            {i + 1}
          </span>
        ))}
      </div>
      {(fig.caption || pts.length > 0) && (
        <figcaption>
          {fig.caption}
          {pts.length > 0 && (
            <span className="legend">
              {pts.map((p, i) => (
                <span key={p.name}>
                  <b>{i + 1}</b> {p.name}
                </span>
              ))}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}

function Bullets({ items, size = 'md' }: { items: string[]; size?: 'md' | 'sm' }) {
  return (
    <ul className={`bullets bullets-${size}`}>
      {items.map((b) => (
        <li key={b}>{b}</li>
      ))}
    </ul>
  )
}

function Frame({ slide, n, children, variant = '' }: { slide: Slide; n: number; children: React.ReactNode; variant?: string }) {
  const refs = slide.refs?.map(refTitle).join(' ; ')
  return (
    <section className={`slide ${variant}`} data-slide={n}>
      <header className="head">
        <div className="part">{PARTS_TITLES[slide.part]}</div>
        <h2>{slide.title}</h2>
      </header>
      <div className="body">{children}</div>
      <footer className="foot">
        <span>{DOC_TITLE}</span>
        {refs ? <span className="refs">Réf. : {refs}</span> : <span />}
        <span className="num">
          {n} / {TOTAL}
        </span>
      </footer>
    </section>
  )
}

function KeyBox({ text }: { text?: string }) {
  if (!text) return null
  return (
    <div className="key">
      <div className="key-t">À retenir</div>
      {text}
    </div>
  )
}

function CoolingBox({ id, dense }: { id: keyof typeof COOLING; dense?: boolean }) {
  const c = COOLING[id]
  const k = dense ? 2 : 3 // deux encadrés sur la même page : listes raccourcies
  return (
    <div className="cool">
      <div className="cool-head">
        <span className="code">{c.id}</span>
        <span className="cool-name">{c.nom.split(' — ')[1]}</span>
        <span className="cool-norm">{c.norme}</span>
      </div>
      <div className="letters">
        {c.lettres.map((l, i) => (
          <div key={i} className="letter">
            <b>{l.lettre}</b>
            <span>{l.sens}</span>
          </div>
        ))}
      </div>
      <div className="pros">
        <div>
          <div className="mini-t ok">Avantages</div>
          <ul>{c.avantages.slice(0, k).map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
        <div>
          <div className="mini-t ko">Limites</div>
          <ul>{c.limites.slice(0, k).map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      </div>
      <div className="apps">
        <b>Applications :</b> {c.applications.slice(0, 2).join(' ; ')}.
      </div>
    </div>
  )
}

function Cover() {
  return (
    <section className="slide cover" data-slide={1}>
      <img className="cover-img" src="./img/cover.jpg" alt="" />
      <div className="cover-shade" />
      <div className="cover-text">
        <div className="cover-kicker">Présentation académique</div>
        <h1>Les transformateurs électriques</h1>
        <p className="cover-sub">Types de transformateurs et systèmes de refroidissement</p>
        <p className="cover-meta">AN · AF · ONAN · ONAF · OFAF · OFWF · ODAF · ODWF — selon IEC 60076-2 et IEC 60076-11</p>
        <p className="cover-meta2">Octobre 2026 — 33 diapositives</p>
      </div>
      <div className="cover-note">
        Illustrations : modèles 3D paramétriques pédagogiques ; ils ne reproduisent pas un appareil d’un constructeur précis.
      </div>
    </section>
  )
}

function Dots({ v }: { v: Level }) {
  return (
    <span className="dots" title={LEVEL_LABEL[v]}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= v ? 'on' : ''} />
      ))}
      <em>{LEVEL_LABEL[v]}</em>
    </span>
  )
}

function Comparison() {
  const internal = (id: string) => (id.length === 2 ? '—' : id[1] === 'N' ? 'Naturelle' : id[1] === 'F' ? 'Forcée' : 'Dirigée')
  const ext = (id: string) => (id.length === 2 || id[2] === 'A' ? 'Air' : 'Eau')
  const extC = (id: string) => (id[id.length - 1] === 'N' ? 'Naturelle' : 'Forcée')
  return (
    <table className="cmp">
      <thead>
        <tr>
          <th>Mode</th>
          <th>Fluide interne</th>
          <th>Circulation interne</th>
          <th>Fluide externe</th>
          <th>Circulation externe</th>
          <th>Auxiliaires</th>
          <th>Complexité</th>
          <th>Maintenance</th>
          <th>Dépendance aux auxiliaires</th>
        </tr>
      </thead>
      <tbody>
        {COOLING_ORDER.map((id) => {
          const c = COOLING[id]
          return (
            <tr key={id}>
              <td className="code-cell">{id}</td>
              <td>{id.length === 2 ? 'Aucun (sec)' : 'Huile (O)'}</td>
              <td>{internal(id)}</td>
              <td>{ext(id)}</td>
              <td>{extC(id)}</td>
              <td>{c.auxiliaires}</td>
              <td><Dots v={c.complexite} /></td>
              <td><Dots v={c.maintenance} /></td>
              <td><Dots v={c.dependanceAuxiliaires} /></td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ProsCons() {
  return (
    <div className="cards">
      {COOLING_ORDER.map((id) => {
        const c = COOLING[id]
        return (
          <div key={id} className="card">
            <div className="card-code">{id}</div>
            <div className="card-app">{c.applications[0]}</div>
            <ul>
              {c.avantages.slice(0, 2).map((a) => <li key={a} className="p">{a}</li>)}
              {c.limites.slice(0, 2).map((a) => <li key={a} className="m">{a}</li>)}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function Page({ slide, n }: { slide: Slide; n: number }) {
  const spec = PAGES[slide.id] ?? {}
  if (slide.id === 'titre') return <Cover />

  if (slide.id === 'questions') {
    return (
      <Frame slide={slide} n={n} variant="closing">
        <div className="cols-2">
          <div className="col-text">
            <p className="lead">Merci de votre attention.</p>
            <div className="key">
              <div className="key-t">Synthèse</div>
              <ul className="bullets bullets-md">
                <li>Les pertes Joule et fer s’accumulent sous forme de chaleur dans l’appareil.</li>
                <li>Le refroidissement protège l’isolation et fixe la puissance disponible.</li>
                <li>Circulation naturelle (N), forcée (F) ou dirigée (D) ; air (A) ou eau (W).</li>
                <li>Le choix dépend de la puissance, du site et des exigences de disponibilité.</li>
              </ul>
            </div>
          </div>
          <div className="col-fig">{spec.figs?.[0] && <Figure fig={spec.figs[0]} />}</div>
        </div>
      </Frame>
    )
  }

  if (slide.layout === 'diagram') {
    return (
      <Frame slide={slide} n={n}>
        <div className="cols-diagram">
          <div className="col-text">
            {slide.bullets && <Bullets items={slide.bullets} />}
            <KeyBox text={spec.key} />
          </div>
          <div className="diagram-panel">{slide.diagram && <Diagram id={slide.diagram} />}</div>
        </div>
      </Frame>
    )
  }

  if (slide.layout === 'table') {
    return (
      <Frame slide={slide} n={n}>
        {slide.table === 'comparaison' ? <Comparison /> : <ProsCons />}
        <p className="note">
          {slide.table === 'comparaison'
            ? 'Niveaux qualitatifs relatifs entre systèmes, établis d’après la nature des équipements ; ils ne remplacent pas les données d’un constructeur.'
            : 'Synthèse des principaux avantages (+) et limites (−) de chaque mode de refroidissement.'}
        </p>
      </Frame>
    )
  }

  if (slide.layout === 'refs') {
    return (
      <Frame slide={slide} n={n}>
        <ol className="refs-list">
          {REFERENCES.map((r) => (
            <li key={r.id}>
              <b>{r.titre}</b> — {r.detail}
            </li>
          ))}
        </ol>
        <p className="note">
          Les limites d’échauffement citées proviennent de l’IEC 60076-2:2011 ; vérifier l’édition en vigueur avant tout usage contractuel.
          Les illustrations sont des modèles 3D paramétriques pédagogiques ; les animations de refroidissement sont qualitatives et ne constituent pas une simulation thermique.
        </p>
      </Frame>
    )
  }

  // Diapositives illustrées (scène 3D)
  const figs = spec.figs ?? []
  if (spec.cooling) {
    return (
      <Frame slide={slide} n={n} variant="cooling">
        <div className="cols-cool">
          <div className="col-text">
            {slide.bullets && <Bullets items={slide.bullets} size="sm" />}
            {spec.cooling.map((c) => (
              <CoolingBox key={c} id={c} dense={spec.cooling!.length > 1} />
            ))}
          </div>
          <div className="col-figs">
            {figs.map((f) => (
              <Figure key={f.img} fig={f} compact={figs.length > 1} />
            ))}
          </div>
        </div>
      </Frame>
    )
  }
  return (
    <Frame slide={slide} n={n}>
      <div className={figs.length > 1 ? `cols-2figs${figs.some((f) => f.callouts?.length) ? ' with-legend' : ''}` : 'cols-2'}>
        <div className="col-text">
          {slide.bullets && <Bullets items={slide.bullets} />}
          <KeyBox text={spec.key} />
          {slide.notes && <p className="note">{slide.notes}</p>}
        </div>
        <div className="col-figs">
          {figs.map((f) => (
            <Figure key={f.img} fig={f} compact={figs.length > 1} />
          ))}
        </div>
      </div>
    </Frame>
  )
}

export function Deck() {
  return (
    <main>
      {SLIDES.map((s, i) => (
        <Page key={s.id} slide={s} n={i + 1} />
      ))}
    </main>
  )
}

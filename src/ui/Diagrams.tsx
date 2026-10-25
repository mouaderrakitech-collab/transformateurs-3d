import type { DiagramId } from '../data/slides'

/**
 * Schémas pédagogiques (SVG vectoriel : net sur vidéoprojecteur, aucun fichier externe).
 * Les schémas sont qualitatifs : aucune valeur numérique n'est inventée.
 */

const C = {
  ink: '#e6ebf0',
  ink2: '#aab4bf',
  ink3: '#7b8794',
  line: '#3a4450',
  core: '#7d858d',
  copper: '#d08447',
  accent: '#f59e0b',
  cold: '#3b82f6',
  hot: '#ef4444',
  ok: '#22c55e',
  panel: '#1f252d',
}

function Frame({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <svg viewBox="0 0 960 540" className="diagram h-full w-full" role="img" aria-label={title}>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.accent} />
        </marker>
        <marker id="arrInk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.ink2} />
        </marker>
        <marker id="arrHot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.hot} />
        </marker>
        <linearGradient id="temp" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={C.cold} />
          <stop offset="1" stopColor={C.hot} />
        </linearGradient>
      </defs>
      {children}
    </svg>
  )
}

const T = (p: React.SVGProps<SVGTextElement> & { children: React.ReactNode }) => (
  <text fill={C.ink} fontSize={20} {...p} />
)

function Coil({ x, y, h, turns, w = 70 }: { x: number; y: number; h: number; turns: number; w?: number }) {
  const step = h / turns
  return (
    <g>
      {Array.from({ length: turns }, (_, i) => (
        <ellipse key={i} cx={x} cy={y + step * (i + 0.5)} rx={w / 2} ry={step * 0.42} fill="none" stroke={C.copper} strokeWidth={5} />
      ))}
    </g>
  )
}

function Induction() {
  return (
    <Frame title="Induction électromagnétique">
      <style>{`.flux{stroke-dasharray:14 12;animation:fl 1.2s linear infinite}@keyframes fl{to{stroke-dashoffset:-26}}`}</style>
      {/* Circuit magnétique */}
      <rect x="250" y="90" width="460" height="330" rx="6" fill="none" stroke={C.core} strokeWidth="56" />
      <rect x="250" y="90" width="460" height="330" rx="6" fill="none" stroke={C.accent} strokeWidth="3" className="flux" markerEnd="url(#arr)" />
      <T x="480" y="70" textAnchor="middle" fill={C.accent}>Flux magnétique Φ(t)</T>
      {/* Primaire */}
      <Coil x={250} y={170} h={170} turns={7} w={100} />
      <T x="160" y="160" textAnchor="middle">N₁</T>
      <line x1="60" y1="190" x2="200" y2="190" stroke={C.ink2} strokeWidth="3" />
      <line x1="60" y1="320" x2="200" y2="320" stroke={C.ink2} strokeWidth="3" />
      <circle cx="60" cy="255" r="32" fill={C.panel} stroke={C.ink2} strokeWidth="3" />
      <path d="M40,255 q10,-18 20,0 t20,0" stroke={C.ink} strokeWidth="3" fill="none" />
      <line x1="60" y1="190" x2="60" y2="223" stroke={C.ink2} strokeWidth="3" />
      <line x1="60" y1="287" x2="60" y2="320" stroke={C.ink2} strokeWidth="3" />
      <T x="60" y="372" textAnchor="middle">u₁ alternative</T>
      <line x1="110" y1="190" x2="170" y2="190" stroke={C.accent} strokeWidth="3" markerEnd="url(#arr)" />
      <T x="140" y="180" textAnchor="middle" fontSize={17} fill={C.accent}>i₁</T>
      {/* Secondaire */}
      <Coil x={710} y={190} h={130} turns={5} w={100} />
      <T x="800" y="160" textAnchor="middle">N₂</T>
      <line x1="760" y1="205" x2="900" y2="205" stroke={C.ink2} strokeWidth="3" />
      <line x1="760" y1="305" x2="900" y2="305" stroke={C.ink2} strokeWidth="3" />
      <rect x="885" y="225" width="30" height="60" fill={C.panel} stroke={C.ink2} strokeWidth="3" />
      <T x="900" y="345" textAnchor="middle">Charge</T>
      <T x="830" y="262" textAnchor="middle" fill={C.accent}>u₂</T>
      <T x="480" y="485" textAnchor="middle" fontSize={24} fill={C.ink}>e = −N · dΦ/dt</T>
      <T x="480" y="518" textAnchor="middle" fontSize={17} fill={C.ink2}>Un flux variable traversant une bobine y induit une force électromotrice (loi de Faraday)</T>
    </Frame>
  )
}

function Ideal() {
  return (
    <Frame title="Transformateur idéal et réel">
      <rect x="330" y="120" width="300" height="200" rx="10" fill={C.panel} stroke={C.line} strokeWidth="2" />
      <T x="480" y="200" textAnchor="middle" fontSize={26}>N₁ : N₂</T>
      <T x="480" y="240" textAnchor="middle" fontSize={17} fill={C.ink2}>circuit magnétique commun</T>
      <line x1="90" y1="220" x2="320" y2="220" stroke={C.accent} strokeWidth="6" markerEnd="url(#arr)" />
      <line x1="640" y1="220" x2="870" y2="220" stroke={C.accent} strokeWidth="5" markerEnd="url(#arr)" />
      <T x="205" y="200" textAnchor="middle">U₁, I₁</T>
      <T x="755" y="200" textAnchor="middle">U₂, I₂</T>
      <T x="205" y="260" textAnchor="middle" fontSize={16} fill={C.ink2}>Puissance absorbée</T>
      <T x="755" y="260" textAnchor="middle" fontSize={16} fill={C.ink2}>Puissance utile</T>
      {/* Pertes = chaleur */}
      <path d="M420,320 C420,380 380,400 360,440" stroke={C.hot} strokeWidth="5" fill="none" markerEnd="url(#arrHot)" />
      <path d="M540,320 C540,380 580,400 600,440" stroke={C.hot} strokeWidth="5" fill="none" markerEnd="url(#arrHot)" />
      <T x="330" y="475" textAnchor="middle" fill={C.hot}>Pertes fer</T>
      <T x="630" y="475" textAnchor="middle" fill={C.hot}>Pertes Joule</T>
      <T x="480" y="515" textAnchor="middle" fontSize={17} fill={C.ink2}>Toutes les pertes deviennent de la chaleur dans l’appareil</T>
      <T x="480" y="60" textAnchor="middle" fontSize={24}>U₁ / U₂ = N₁ / N₂     I₁ / I₂ = N₂ / N₁</T>
      <T x="480" y="92" textAnchor="middle" fontSize={16} fill={C.ink2}>(relations du transformateur idéal)</T>
    </Frame>
  )
}

function Classification() {
  const cols = [
    { x: 160, t: 'Nombre de phases', items: ['Monophasé', 'Triphasé'] },
    { x: 480, t: 'Isolation / refroidissement', items: ['Immergé (liquide)', 'Sec (air)'] },
    { x: 800, t: 'Fonction dans le réseau', items: ['Distribution', 'Puissance'] },
  ]
  const yItem = (i: number) => 150 + i * 90
  const ex = [
    { name: 'Distribution en cabine', c: [1, 0, 0], color: C.accent },
    { name: 'Sec en bâtiment', c: [1, 1, 0], color: C.ok },
    { name: 'Sur poteau', c: [0, 0, 0], color: C.cold },
    { name: 'Poste de transport', c: [1, 0, 1], color: '#c084fc' },
  ]
  return (
    <Frame title="Classification">
      {cols.map((c) => (
        <g key={c.t}>
          <T x={c.x} y={80} textAnchor="middle" fontSize={20} fill={C.ink2}>{c.t}</T>
          {c.items.map((it, i) => (
            <g key={it}>
              <rect x={c.x - 120} y={yItem(i) - 28} width={240} height={56} rx={8} fill={C.panel} stroke={C.line} strokeWidth={2} />
              <T x={c.x} y={yItem(i) + 7} textAnchor="middle">{it}</T>
            </g>
          ))}
        </g>
      ))}
      {ex.map((e, k) => {
        const pts = e.c.map((ci, j) => [cols[j].x, yItem(ci) + (k - 1.5) * 7])
        return (
          <g key={e.name}>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={e.color} strokeWidth={3} opacity={0.85} />
            {pts.map((p, j) => <circle key={j} cx={p[0]} cy={p[1]} r={5} fill={e.color} />)}
            <rect x={80 + k * 210} y={380} width={16} height={16} fill={e.color} rx={3} />
            <T x={104 + k * 210} y={394} fontSize={16}>{e.name}</T>
          </g>
        )
      })}
      <T x="480" y="460" textAnchor="middle" fontSize={19} fill={C.ink2}>Chaque appareil réel combine une catégorie de chaque colonne :</T>
      <T x="480" y="490" textAnchor="middle" fontSize={19} fill={C.ink2}>les catégories ne sont pas mutuellement exclusives.</T>
    </Frame>
  )
}

function Pertes() {
  // courbes qualitatives en fonction du taux de charge
  const X0 = 140, Y0 = 430, W = 680, H = 320
  const pts = (f: (x: number) => number) => Array.from({ length: 41 }, (_, i) => {
    const x = i / 40
    return `${X0 + x * W},${Y0 - f(x) * H}`
  }).join(' ')
  return (
    <Frame title="Pertes selon la charge">
      <line x1={X0} y1={Y0} x2={X0 + W + 20} y2={Y0} stroke={C.ink2} strokeWidth={2} markerEnd="url(#arrInk)" />
      <line x1={X0} y1={Y0} x2={X0} y2={Y0 - H - 30} stroke={C.ink2} strokeWidth={2} markerEnd="url(#arrInk)" />
      <T x={X0 + W} y={Y0 + 36} textAnchor="end" fontSize={18} fill={C.ink2}>Courant de charge I</T>
      <T x={X0 - 14} y={Y0 - H - 40} fontSize={18} fill={C.ink2}>Pertes</T>
      <polyline points={pts(() => 0.22)} fill="none" stroke={C.cold} strokeWidth={4} />
      <polyline points={pts((x) => 0.75 * x * x)} fill="none" stroke={C.hot} strokeWidth={4} />
      <polyline points={pts((x) => 0.22 + 0.75 * x * x)} fill="none" stroke={C.accent} strokeWidth={4} strokeDasharray="10 7" />
      <T x={X0 + W + 10} y={Y0 - 0.22 * H + 6} fontSize={18} fill={C.cold}>Pertes fer (constantes)</T>
      <T x={X0 + W * 0.62} y={Y0 - 0.75 * 0.85 * H} fontSize={18} fill={C.hot} textAnchor="end">Pertes Joule ∝ I²</T>
      <T x={X0 + W - 10} y={Y0 - 0.97 * H} fontSize={18} fill={C.accent} textAnchor="end">Pertes totales</T>
      <T x={480} y={515} textAnchor="middle" fontSize={17} fill={C.ink2}>Allure qualitative, sans échelle numérique</T>
    </Frame>
  )
}

function PertesFer() {
  return (
    <Frame title="Pertes fer">
      {/* Cycle d'hystérésis */}
      <line x1="60" y1="260" x2="440" y2="260" stroke={C.ink3} strokeWidth="2" markerEnd="url(#arrInk)" />
      <line x1="250" y1="470" x2="250" y2="60" stroke={C.ink3} strokeWidth="2" markerEnd="url(#arrInk)" />
      <T x="440" y="290" textAnchor="end" fontSize={18} fill={C.ink2}>H</T>
      <T x="262" y="72" fontSize={18} fill={C.ink2}>B</T>
      <path d="M90,420 C150,410 210,380 230,300 C245,220 300,120 410,100 C350,110 290,140 270,220 C255,300 200,410 90,420 Z" fill="rgba(239,68,68,0.18)" stroke={C.hot} strokeWidth="4" />
      <T x="250" y="510" textAnchor="middle" fontSize={18} fill={C.ink2}>Aire du cycle = énergie perdue par cycle (hystérésis)</T>
      {/* Courants de Foucault */}
      <T x="720" y="70" textAnchor="middle" fontSize={20}>Courants de Foucault</T>
      <rect x="560" y="110" width="130" height="200" fill={C.core} opacity="0.55" stroke={C.line} />
      <ellipse cx="625" cy="210" rx="50" ry="80" fill="none" stroke={C.hot} strokeWidth="5" />
      <T x="625" y="345" textAnchor="middle" fontSize={17} fill={C.ink2}>Bloc massif</T>
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect x={760 + i * 24} y="110" width="18" height="200" fill={C.core} opacity="0.55" stroke={C.line} />
          <ellipse cx={769 + i * 24} cy="210" rx="5" ry="80" fill="none" stroke={C.hot} strokeWidth="2" />
        </g>
      ))}
      <T x="828" y="345" textAnchor="middle" fontSize={17} fill={C.ink2}>Tôles isolées</T>
      <T x="720" y="410" textAnchor="middle" fontSize={18}>Le feuilletage réduit fortement</T>
      <T x="720" y="436" textAnchor="middle" fontSize={18}>les boucles de courant induit</T>
    </Frame>
  )
}

function Limites() {
  // Diagramme thermique de principe (IEC 60076-2) : température en abscisse, hauteur en ordonnée
  return (
    <Frame title="Diagramme thermique">
      <line x1="80" y1="450" x2="520" y2="450" stroke={C.ink2} strokeWidth="2" markerEnd="url(#arrInk)" />
      <line x1="80" y1="450" x2="80" y2="60" stroke={C.ink2} strokeWidth="2" markerEnd="url(#arrInk)" />
      <T x="520" y="480" textAnchor="end" fontSize={17} fill={C.ink2}>Température</T>
      <T x="92" y="70" fontSize={17} fill={C.ink2}>Hauteur</T>
      {/* huile */}
      <line x1="150" y1="400" x2="300" y2="120" stroke={C.cold} strokeWidth="4" />
      <T x="150" y="425" fontSize={16} fill={C.cold}>huile (bas)</T>
      <T x="230" y="110" fontSize={16} fill={C.cold}>huile (haut)</T>
      {/* enroulement moyen */}
      <line x1="230" y1="400" x2="380" y2="120" stroke={C.accent} strokeWidth="4" />
      <line x1="300" y1="140" x2="380" y2="140" stroke={C.ink3} strokeWidth="2" strokeDasharray="5 5" />
      <T x="390" y="146" fontSize={16} fill={C.accent}>enroulement</T>
      <T x="335" y="168" fontSize={15} fill={C.ink3}>gradient g</T>
      {/* point chaud */}
      <circle cx="440" cy="120" r="9" fill={C.hot} />
      <line x1="380" y1="120" x2="432" y2="120" stroke={C.hot} strokeWidth="3" />
      <T x="440" y="96" textAnchor="middle" fontSize={16} fill={C.hot}>point chaud</T>
      {/* tableau IEC 60076-2 */}
      <rect x="560" y="80" width="370" height="300" rx="10" fill={C.panel} stroke={C.line} strokeWidth="2" />
      <T x="745" y="115" textAnchor="middle" fontSize={18}>Limites d’échauffement (K)</T>
      <T x="745" y="140" textAnchor="middle" fontSize={14} fill={C.ink3}>IEC 60076-2:2011, tableau 1 — isolation classique</T>
      {[
        ['Huile en haut de cuve', '60'],
        ['Enroulement moyen (ON, OF)', '65'],
        ['Enroulement moyen (OD)', '70'],
        ['Point chaud', '78'],
      ].map(([l, v], i) => (
        <g key={l}>
          <T x="580" y={185 + i * 46} fontSize={17}>{l}</T>
          <T x="910" y={185 + i * 46} fontSize={18} textAnchor="end" fill={C.accent}>{v}</T>
          <line x1="580" y1={200 + i * 46} x2="910" y2={200 + i * 46} stroke={C.line} />
        </g>
      ))}
      <T x="745" y="410" textAnchor="middle" fontSize={14} fill={C.ink3}>Échauffements au-dessus de l’ambiante ;</T>
      <T x="745" y="430" textAnchor="middle" fontSize={14} fill={C.ink3}>vérifier l’édition en vigueur et le cahier des charges.</T>
      <T x="480" y="515" textAnchor="middle" fontSize={17} fill={C.ink2}>Le vieillissement du papier s’accélère avec la température du point chaud (IEC 60076-7)</T>
    </Frame>
  )
}

function CodeIEC() {
  const boxes = [
    { l: 'O', t: '1. Fluide interne', o: ['O : huile minérale ou|point de feu ≤ 300 °C', 'K : point de feu > 300 °C|(esters)', 'L : point de feu|non mesurable'] },
    { l: 'N', t: '2. Circulation interne', o: ['N : naturelle|(thermosiphon)', 'F : forcée dans|l’échangeur', 'D : forcée et dirigée|dans les enroulements'] },
    { l: 'A', t: '3. Fluide externe', o: ['A : air', 'W : eau'] },
    { l: 'N', t: '4. Circulation externe', o: ['N : convection|naturelle', 'F : forcée (ventilateurs,|pompes)'] },
  ]
  return (
    <Frame title="Code IEC 60076-2">
      {boxes.map((b, i) => {
        const x = 40 + i * 225
        return (
          <g key={i}>
            <rect x={x + 55} y={40} width={110} height={110} rx={12} fill={C.panel} stroke={C.accent} strokeWidth={3} />
            <T x={x + 110} y={122} textAnchor="middle" fontSize={76} fill={C.accent} fontWeight={700}>{b.l}</T>
            <T x={x + 110} y={190} textAnchor="middle" fontSize={19}>{b.t}</T>
            {b.o.map((o, k) => {
              const [code, ...rest] = o.split(' : ')
              return (
                <g key={k}>
                  <T x={x + 10} y={232 + k * 60} fontSize={20} fill={C.accent} fontWeight={700}>{code}</T>
                  <T x={x + 36} y={232 + k * 60} fontSize={14.5} fill={C.ink2}>{rest.join(' : ').split('|')[0]}</T>
                  <T x={x + 36} y={252 + k * 60} fontSize={14.5} fill={C.ink2}>{rest.join(' : ').split('|')[1] ?? ''}</T>
                </g>
              )
            })}
          </g>
        )
      })}
      <T x="480" y="455" textAnchor="middle" fontSize={20}>Double régime : ONAN/ONAF — une puissance assignée par mode</T>
      <T x="480" y="495" textAnchor="middle" fontSize={17} fill={C.ink2}>Secs (IEC 60076-11) : AN, AF   •   Anciennes désignations IEEE : OA, FA, FOA, FOW</T>
    </Frame>
  )
}

function Choix() {
  const node = (x: number, y: number, w: number, text: string[], color = C.line) => (
    <g>
      <rect x={x - w / 2} y={y - 12 - text.length * 11} width={w} height={24 + text.length * 22} rx={8} fill={C.panel} stroke={color} strokeWidth={2} />
      {text.map((t, i) => (
        <T key={i} x={x} y={y + 6 + (i - (text.length - 1) / 2) * 22} textAnchor="middle" fontSize={16}>{t}</T>
      ))}
    </g>
  )
  const edge = (x1: number, y1: number, x2: number, y2: number, label?: string) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink3} strokeWidth={2} markerEnd="url(#arrInk)" />
      {label && <T x={(x1 + x2) / 2 + 6} y={(y1 + y2) / 2 - 4} fontSize={14} fill={C.ink3}>{label}</T>}
    </g>
  )
  return (
    <Frame title="Choix du refroidissement">
      {node(480, 50, 400, ['Risque incendie / installation intérieure ?'], C.accent)}
      {edge(380, 75, 190, 140, 'oui')}
      {edge(580, 75, 640, 140, 'non')}
      {node(190, 170, 300, ['Sec AN / AF', 'ou immergé liquide K'], C.ok)}
      {node(640, 170, 330, ['Puissance et site ?'], C.accent)}
      {edge(560, 195, 300, 280, 'distribution')}
      {edge(640, 195, 640, 280, 'poste')}
      {edge(720, 195, 860, 280, 'très forte')}
      {node(280, 310, 220, ['ONAN'], C.ok)}
      {node(640, 310, 240, ['ONAN / ONAF'], C.ok)}
      {node(860, 310, 180, ['Eau ou', 'espace réduit ?'], C.accent)}
      {edge(820, 345, 760, 420, 'non')}
      {edge(900, 345, 900, 420, 'oui')}
      {node(740, 450, 190, ['OFAF / ODAF'], C.ok)}
      {node(900, 450, 150, ['OFWF', 'ODWF'], C.ok)}
      <T x="40" y="440" fontSize={15} fill={C.ink3}>Arbre qualitatif : le choix final résulte</T>
      <T x="40" y="462" fontSize={15} fill={C.ink3}>d’une étude technico-économique</T>
      <T x="40" y="484" fontSize={15} fill={C.ink3}>(pertes, bruit, encombrement, disponibilité).</T>
    </Frame>
  )
}

function Synthese() {
  const steps = ['AN', 'AF', 'ONAN', 'ONAF', 'OFAF', 'ODAF', 'OFWF', 'ODWF']
  return (
    <Frame title="Synthèse">
      <line x1="80" y1="400" x2="900" y2="400" stroke={C.ink2} strokeWidth={2} markerEnd="url(#arrInk)" />
      <T x="900" y="435" textAnchor="end" fontSize={17} fill={C.ink2}>Intensification des échanges</T>
      {steps.map((s, i) => {
        const x = 120 + i * 105
        const h = 60 + i * 34
        return (
          <g key={s}>
            <rect x={x - 38} y={400 - h} width={76} height={h} rx={6} fill="url(#temp)" opacity={0.25 + i * 0.07} />
            <T x={x} y={390 - h} textAnchor="middle" fontSize={19} fontWeight={700}>{s}</T>
          </g>
        )
      })}
      <T x="120" y="70" fontSize={19}>↑ compacité et capacité de dissipation</T>
      <T x="120" y="100" fontSize={19} fill={C.hot}>↑ dépendance aux auxiliaires, complexité, maintenance</T>
      <T x="480" y="490" textAnchor="middle" fontSize={16} fill={C.ink3}>Ordre indicatif et qualitatif ; les systèmes eau/air ne sont pas strictement hiérarchisés</T>
    </Frame>
  )
}

export function Diagram({ id }: { id: DiagramId }) {
  switch (id) {
    case 'induction': return <Induction />
    case 'ideal': return <Ideal />
    case 'classification': return <Classification />
    case 'pertes': return <Pertes />
    case 'pertesFer': return <PertesFer />
    case 'echauffement':
    case 'limites': return <Limites />
    case 'codeIEC': return <CodeIEC />
    case 'choix': return <Choix />
    case 'synthese': return <Synthese />
  }
}

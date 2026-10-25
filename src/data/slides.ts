import type { SceneConfig } from '../types'

export type SlideLayout = 'title' | 'scene' | 'diagram' | 'table' | 'image' | 'refs'
export type DiagramId =
  | 'induction'
  | 'ideal'
  | 'classification'
  | 'pertes'
  | 'pertesFer'
  | 'echauffement'
  | 'limites'
  | 'codeIEC'
  | 'choix'
  | 'synthese'
export type TableId = 'comparaison' | 'avantages'

export interface Step {
  label: string
  scene?: Partial<SceneConfig>
}

export interface Slide {
  id: string
  part: number
  title: string
  subtitle?: string
  layout: SlideLayout
  bullets?: string[]
  scene?: SceneConfig
  steps?: Step[]
  diagram?: DiagramId
  table?: TableId
  image?: string
  notes?: string
  refs?: string[]
}

export const PARTS_TITLES: Record<number, string> = {
  0: 'Ouverture',
  1: 'Partie 1 — Introduction',
  2: 'Partie 2 — Construction',
  3: 'Partie 3 — Types de transformateurs',
  4: 'Partie 4 — Échauffement',
  5: 'Partie 5 — Systèmes de refroidissement',
  6: 'Partie 6 — Comparaison',
  7: 'Partie 7 — Conclusion',
  8: 'Annexes importées',
}

export const SLIDES: Slide[] = [
  {
    id: 'titre',
    part: 0,
    title: 'Les transformateurs électriques',
    subtitle: 'Types de transformateurs et systèmes de refroidissement',
    layout: 'title',
    scene: { model: 'puissance', cooling: 'ONAF', mode: 'exterieur', view: 'iso' },
    notes: 'Présenter le plan en sept parties. Les modèles 3D sont des représentations pédagogiques paramétriques, pas des reproductions d’un appareil d’un constructeur donné.',
  },

  // ───────── Partie 1
  {
    id: 'definition',
    part: 1,
    title: 'Définition du transformateur',
    layout: 'scene',
    bullets: [
      'Machine électrique statique : aucune pièce en mouvement dans la conversion d’énergie',
      'Transfère l’énergie électrique d’un circuit à un autre par induction électromagnétique',
      'Modifie la tension et le courant alternatifs en conservant la fréquence',
      'Permet le transport de l’électricité à haute tension (pertes en ligne réduites), puis sa distribution à basse tension',
    ],
    scene: { model: 'distribution', cooling: 'ONAN', mode: 'exterieur', view: 'iso' },
    steps: [{ label: 'Voir la partie active', scene: { mode: 'interieur' } }],
    refs: ['iec60076-1'],
  },
  {
    id: 'induction',
    part: 1,
    title: 'Principe de l’induction électromagnétique',
    layout: 'diagram',
    diagram: 'induction',
    bullets: [
      'Le courant alternatif du primaire crée un flux magnétique variable Φ(t)',
      'Le circuit magnétique canalise ce flux vers le secondaire',
      'Loi de Faraday : e = −N · dΦ/dt — chaque spire embrassant le flux est le siège d’une f.é.m.',
      'En régime sinusoïdal : E = 4,44 · f · N · Φmax (valeur efficace)',
    ],
    refs: ['jp', 'kulkarni'],
  },
  {
    id: 'fonctionnement',
    part: 1,
    title: 'Fonctionnement général',
    layout: 'diagram',
    diagram: 'ideal',
    bullets: [
      'Transformateur idéal : U₁ / U₂ = N₁ / N₂ = m⁻¹ et I₁ / I₂ = N₂ / N₁',
      'La puissance apparente est conservée : U₁·I₁ ≈ U₂·I₂',
      'Transformateur réel : courant magnétisant, pertes fer, pertes Joule, flux de fuite',
      'Les pertes, même faibles devant la puissance transmise, se transforment en chaleur à évacuer',
    ],
    refs: ['jp'],
  },

  // ───────── Partie 2
  {
    id: 'circuit-magnetique',
    part: 2,
    title: 'Circuit magnétique',
    layout: 'scene',
    bullets: [
      'Tôles d’acier au silicium à grains orientés, de faible épaisseur et isolées entre elles',
      'Colonnes de section en gradins, proche du cercle, pour remplir l’enroulement',
      'Culasses supérieure et inférieure ; joints à coupe en biais (step-lap)',
      'Le feuilletage limite les courants de Foucault ; l’alliage limite l’hystérésis',
    ],
    scene: { model: 'puissance', cooling: 'ONAN', mode: 'interieur', view: 'avant' },
    steps: [
      { label: 'Vue éclatée de la partie active', scene: { mode: 'eclate', view: 'iso' } },
      { label: 'Afficher les étiquettes', scene: { labels: true } },
    ],
    refs: ['kulkarni', 'jp'],
  },
  {
    id: 'enroulements',
    part: 2,
    title: 'Enroulements',
    layout: 'scene',
    bullets: [
      'Disposition concentrique : BT à l’intérieur (près du noyau), HT à l’extérieur',
      'Conducteurs en cuivre ou en aluminium, isolés au papier (immergés) ou à la résine (secs)',
      'Enroulements en galettes, hélicoïdaux ou en couches selon le courant et la tension',
      'Les cales entre galettes créent les canaux de circulation du fluide de refroidissement',
    ],
    scene: { model: 'puissance', cooling: 'ONAN', mode: 'coupe', view: 'avant' },
    steps: [{ label: 'Vue isométrique de la coupe', scene: { view: 'iso' } }],
    refs: ['kulkarni'],
  },
  {
    id: 'isolation',
    part: 2,
    title: 'Isolation',
    layout: 'scene',
    bullets: [
      'Immergés : système papier / carton comprimé imprégné d’huile',
      'Huile minérale (O) ou liquides de point de feu élevé, esters (K)',
      'Secs : résine époxy coulée sous vide, imprégnation, isolants solides',
      'La température de l’isolation conditionne sa durée de vie (IEC 60076-7)',
    ],
    scene: { model: 'puissance', cooling: 'ONAN', mode: 'coupe', view: 'iso' },
    steps: [{ label: 'Comparer avec un transformateur sec', scene: { model: 'sec', cooling: 'AN', mode: 'coupe' } }],
    refs: ['iec60076-7', 'iec60076-11'],
  },
  {
    id: 'cuve-accessoires',
    part: 2,
    title: 'Cuve et accessoires',
    layout: 'scene',
    bullets: [
      'Cuve en acier soudé, raidisseurs, couvercle boulonné',
      'Traversées HT et BT, changeur de prises',
      'Conservateur, relais Buchholz, dessiccateur, soupape de surpression',
      'Armoire de commande, indicateurs de température',
    ],
    scene: { model: 'puissance', cooling: 'ONAN', mode: 'exterieur', view: 'iso', labels: true },
    steps: [{ label: 'Vue arrière', scene: { view: 'arriere' } }],
    refs: ['abb'],
  },

  // ───────── Partie 3
  {
    id: 'classification',
    part: 3,
    title: 'Des catégories non exclusives',
    layout: 'diagram',
    diagram: 'classification',
    bullets: [
      'Trois critères indépendants : nombre de phases, isolation/refroidissement, fonction dans le réseau',
      'Un même appareil appartient à une catégorie de chaque critère',
      'Exemple : un transformateur de distribution est souvent triphasé ET immergé',
      'Exemple : un transformateur sec peut aussi être un transformateur de distribution',
    ],
  },
  {
    id: 'monophase',
    part: 3,
    title: 'Monophasé',
    layout: 'scene',
    bullets: [
      'Un primaire et un secondaire sur un circuit magnétique',
      'Exemple : transformateur sur poteau, immergé, ONAN',
      'Circuit cuirassé : colonne centrale bobinée, deux colonnes de retour',
      'Aussi : bancs de trois unités monophasées pour les très grandes puissances',
    ],
    scene: { model: 'monophase', cooling: 'ONAN', mode: 'exterieur', view: 'iso' },
    steps: [
      { label: 'Vue intérieure', scene: { mode: 'interieur', view: 'avant' } },
      { label: 'Vue éclatée', scene: { mode: 'eclate', view: 'iso' } },
    ],
  },
  {
    id: 'triphase',
    part: 3,
    title: 'Triphasé',
    layout: 'scene',
    bullets: [
      'Trois colonnes sur un circuit magnétique commun',
      'Chaque colonne porte la BT et la HT d’une phase',
      'Couplages étoile, triangle, zigzag ; indice horaire (ex. Dyn11)',
      'Solution la plus économique pour une puissance triphasée donnée',
    ],
    scene: { model: 'distribution', cooling: 'ONAN', mode: 'interieur', view: 'avant' },
    steps: [{ label: 'Vue éclatée', scene: { mode: 'eclate', view: 'iso' } }],
  },
  {
    id: 'sec',
    part: 3,
    title: 'Transformateur à sec',
    layout: 'scene',
    bullets: [
      'Isolation solide (résine époxy) et refroidissement par l’air',
      'Norme IEC 60076-11 ; refroidissement AN ou AF',
      'Réduit les risques d’incendie et de pollution : installation intérieure',
      'Doit être protégé du contact direct (enveloppe ou local fermé)',
    ],
    scene: { model: 'sec', cooling: 'AN', mode: 'exterieur', view: 'iso' },
    steps: [{ label: 'Vue éclatée', scene: { mode: 'eclate' } }],
    refs: ['iec60076-11'],
  },
  {
    id: 'immerge',
    part: 3,
    title: 'Transformateur immergé',
    layout: 'scene',
    bullets: [
      'La partie active baigne dans un liquide isolant',
      'Le liquide isole et transporte la chaleur vers les parois',
      'Cuve hermétique à remplissage total, ou cuve à conservateur',
      'Refroidissements ON, OF, OD combinés avec l’air (A) ou l’eau (W)',
    ],
    scene: { model: 'distribution', cooling: 'ONAN', mode: 'coupe', view: 'iso' },
    refs: ['iec60076-2'],
  },
  {
    id: 'distribution',
    part: 3,
    title: 'Transformateur de distribution',
    layout: 'scene',
    bullets: [
      'Abaisse la moyenne tension (HTA) vers la basse tension (BT)',
      'Exemple représenté : triphasé, immergé, cuve hermétique à ailettes',
      'Traversées HT porcelaine, sorties BT, commutateur hors tension',
      'Relais de protection intégré (type DGPT2) sur les cuves hermétiques',
    ],
    scene: { model: 'distribution', cooling: 'ONAN', mode: 'exterieur', view: 'iso', labels: true },
    refs: ['schneider'],
  },
  {
    id: 'puissance',
    part: 3,
    title: 'Transformateur de puissance',
    layout: 'scene',
    bullets: [
      'Postes de transport et de répartition, sortie des centrales',
      'Changeur de prises en charge pour régler la tension',
      'Conservateur, relais Buchholz, surveillance des températures',
      'Système de refroidissement choisi selon la puissance et le site',
    ],
    scene: { model: 'puissance', cooling: 'ONAF', mode: 'exterieur', view: 'iso' },
    steps: [{ label: 'Vue éclatée', scene: { mode: 'eclate' } }],
    refs: ['abb'],
  },

  // ───────── Partie 4
  {
    id: 'pertes-joule',
    part: 4,
    title: 'Pertes Joule (pertes en charge)',
    layout: 'diagram',
    diagram: 'pertes',
    bullets: [
      'Dissipées dans la résistance des enroulements : P = R₁·I₁² + R₂·I₂²',
      'Proportionnelles au carré du courant, donc à la charge',
      'Pertes supplémentaires : courants de Foucault dans les conducteurs et les pièces métalliques (flux de fuite)',
      'Elles sont concentrées dans les enroulements : origine du point chaud',
    ],
    refs: ['iec60076-1', 'kulkarni'],
  },
  {
    id: 'pertes-fer',
    part: 4,
    title: 'Pertes fer (pertes à vide)',
    layout: 'diagram',
    diagram: 'pertesFer',
    bullets: [
      'Présentes dès que le transformateur est sous tension, quelle que soit la charge',
      'Hystérésis : énergie liée au cycle d’aimantation, croît avec la fréquence et l’induction',
      'Courants de Foucault : courants induits dans les tôles, réduits par le feuilletage',
      'Dépendent de la qualité de la tôle, de l’induction de travail et de la fréquence',
    ],
    refs: ['kulkarni'],
  },
  {
    id: 'origine-echauffement',
    part: 4,
    title: 'Origine de l’échauffement',
    layout: 'scene',
    bullets: [
      'La chaleur est produite dans les enroulements (pertes Joule) et le circuit magnétique (pertes fer)',
      'Elle traverse l’isolation puis est transmise au fluide (huile ou air)',
      'La température n’est pas uniforme : la zone la plus chaude est le point chaud, en haut des enroulements',
      'Visualisation : couleur rouge = zones et fluide plus chauds',
    ],
    scene: { model: 'puissance', cooling: 'ONAN', mode: 'refroidissement', view: 'avant', play: true },
    steps: [{ label: 'Vue en coupe', scene: { mode: 'coupe' } }],
    refs: ['iec60076-7'],
  },
  {
    id: 'necessite',
    part: 4,
    title: 'Nécessité du refroidissement',
    layout: 'diagram',
    diagram: 'limites',
    bullets: [
      'L’isolation cellulosique vieillit d’autant plus vite que la température du point chaud est élevée',
      'IEC 60076-2 fixe des limites d’échauffement (au-dessus de l’ambiante) pour l’huile et les enroulements',
      'Le refroidissement détermine donc la puissance que l’appareil peut fournir durablement',
      'Il doit être adapté à la puissance, au site et au besoin de disponibilité',
    ],
    refs: ['iec60076-2', 'iec60076-7'],
  },

  // ───────── Partie 5
  {
    id: 'code-iec',
    part: 5,
    title: 'Désignation des modes de refroidissement',
    layout: 'diagram',
    diagram: 'codeIEC',
    bullets: [
      'Immergés (IEC 60076-2) : code de quatre lettres',
      '1 – fluide interne (O, K, L) ; 2 – circulation interne (N, F, D)',
      '3 – fluide externe (A, W) ; 4 – circulation externe (N, F)',
      'Secs (IEC 60076-11) : AN ou AF',
    ],
    refs: ['iec60076-2', 'iec60076-11', 'ieee-c57-12-00'],
  },
  {
    id: 'an-af',
    part: 5,
    title: 'AN / AF — transformateur sec',
    layout: 'scene',
    bullets: [
      'AN : l’air s’élève naturellement dans les canaux entre circuit magnétique, BT et HT',
      'AF : des ventilateurs tangentiels sous les bobines forcent ce passage',
      'Commande par sondes de température dans les enroulements BT',
      'Ventilation du local indispensable dans les deux cas',
    ],
    scene: { model: 'sec', cooling: 'AN', mode: 'refroidissement', view: 'avant', play: true },
    steps: [
      { label: 'Passer en AF (ventilateurs)', scene: { cooling: 'AF', play: true } },
      { label: 'Vue isométrique', scene: { view: 'iso' } },
    ],
    refs: ['iec60076-11'],
  },
  {
    id: 'onan',
    part: 5,
    title: 'ONAN — huile naturelle, air naturel',
    layout: 'scene',
    bullets: [
      '1. Les enroulements s’échauffent',
      '2. L’huile chaude, plus légère, monte dans les canaux (thermosiphon)',
      '3. Elle entre en haut des radiateurs et s’y refroidit en descendant',
      '4. L’huile refroidie revient en bas de cuve ; l’air monte le long des radiateurs',
    ],
    scene: { model: 'puissance', cooling: 'ONAN', mode: 'refroidissement', view: 'droite', play: true },
    steps: [
      { label: 'Vue isométrique', scene: { view: 'iso' } },
      { label: 'Coupe : circuit interne', scene: { mode: 'coupe', view: 'avant' } },
    ],
    refs: ['iec60076-2'],
  },
  {
    id: 'onaf',
    part: 5,
    title: 'ONAF — huile naturelle, air forcé',
    layout: 'scene',
    bullets: [
      'Huile : thermosiphon, comme en ONAN',
      'Ventilateurs sous les radiateurs : circulation forcée de l’air',
      'Échange thermique accru dans les radiateurs',
      'Double régime ONAN/ONAF : retour en ONAN à puissance réduite si les ventilateurs s’arrêtent',
    ],
    scene: { model: 'puissance', cooling: 'ONAF', mode: 'refroidissement', view: 'droite', play: true },
    steps: [{ label: 'Vue isométrique', scene: { view: 'iso' } }],
    refs: ['iec60076-2'],
  },
  {
    id: 'ofaf',
    part: 5,
    title: 'OFAF — huile forcée, air forcé',
    layout: 'scene',
    bullets: [
      'Pompes : circulation forcée de l’huile dans les aéroréfrigérants',
      'Ventilateurs : air forcé à travers les tubes ailetés',
      'Dans les enroulements : écoulement toujours de type thermosiphon',
      'Capacité de refroidissement très faible sans auxiliaires',
    ],
    scene: { model: 'puissance', cooling: 'OFAF', mode: 'refroidissement', view: 'droite', play: true },
    steps: [
      { label: 'Vue isométrique', scene: { view: 'iso' } },
      { label: 'Coupe : écoulement non dirigé', scene: { mode: 'coupe', view: 'avant' } },
    ],
    refs: ['iec60076-2'],
  },
  {
    id: 'ofwf',
    part: 5,
    title: 'OFWF — huile forcée, eau forcée',
    layout: 'scene',
    bullets: [
      'Pompe à huile : circulation forcée dans un échangeur huile/eau',
      'Échangeur à faisceau tubulaire : huile côté calandre, eau dans les tubes',
      'Circuit d’eau : entrée froide, sortie réchauffée, à contre-courant',
      'Échangeur à double paroi pour éviter toute contamination de l’huile',
    ],
    scene: { model: 'puissance', cooling: 'OFWF', mode: 'refroidissement', view: 'droite', play: true },
    steps: [{ label: 'Vue isométrique', scene: { view: 'iso' } }],
    refs: ['iec60076-2'],
  },
  {
    id: 'odaf',
    part: 5,
    title: 'ODAF — huile dirigée, air forcé',
    layout: 'scene',
    bullets: [
      'L’huile pompée est dirigée dans les enroulements par un collecteur et des conduits',
      'Rondelles de guidage : parcours en zigzag à travers les galettes',
      'Débit maîtrisé dans chaque canal : point chaud mieux contrôlé',
      'Aéroréfrigérants à ventilateurs côté air',
    ],
    scene: { model: 'puissance', cooling: 'ODAF', mode: 'coupe', view: 'avant', play: true },
    steps: [
      { label: 'Circuit complet', scene: { mode: 'refroidissement', view: 'iso' } },
    ],
    refs: ['iec60076-2'],
  },
  {
    id: 'odwf',
    part: 5,
    title: 'ODWF — huile dirigée, eau forcée',
    layout: 'scene',
    bullets: [
      'Circulation dirigée de l’huile dans les enroulements (comme ODAF)',
      'Échangeur huile/eau (comme OFWF)',
      'Solution la plus compacte pour les très fortes puissances',
      'Deux circuits forcés à surveiller : débit d’huile et débit d’eau',
    ],
    scene: { model: 'puissance', cooling: 'ODWF', mode: 'refroidissement', view: 'iso', play: true },
    steps: [{ label: 'Coupe : zigzag dans les enroulements', scene: { mode: 'coupe', view: 'avant' } }],
    refs: ['iec60076-2'],
  },

  // ───────── Partie 6
  {
    id: 'comparaison',
    part: 6,
    title: 'Comparaison des systèmes',
    layout: 'table',
    table: 'comparaison',
    notes: 'Les niveaux sont qualitatifs et relatifs entre systèmes ; ils ne remplacent pas les données d’un constructeur.',
  },
  {
    id: 'avantages',
    part: 6,
    title: 'Avantages et inconvénients',
    layout: 'table',
    table: 'avantages',
  },

  // ───────── Partie 7
  {
    id: 'synthese',
    part: 7,
    title: 'Synthèse',
    layout: 'diagram',
    diagram: 'synthese',
    bullets: [
      'Les pertes (Joule et fer) imposent d’évacuer la chaleur pour protéger l’isolation',
      'Plus la puissance augmente, plus la circulation des fluides doit être intensifiée : N → F → D',
      'L’air (A) puis l’eau (W) comme fluide externe selon le site',
      'Chaque étape gagne en compacité mais dépend davantage des auxiliaires',
    ],
  },
  {
    id: 'choix',
    part: 7,
    title: 'Choisir le refroidissement selon l’application',
    layout: 'diagram',
    diagram: 'choix',
    bullets: [
      'Risque incendie / intérieur de bâtiment → transformateur sec AN ou AF, ou liquide K',
      'Distribution extérieure → immergé ONAN',
      'Poste de transformation → ONAN/ONAF',
      'Grandes puissances → OFAF / ODAF ; eau disponible ou espace réduit → OFWF / ODWF',
    ],
    notes: 'Arbre de décision qualitatif : le choix réel résulte d’une étude technico-économique (pertes, encombrement, bruit, disponibilité, maintenance).',
  },
  {
    id: 'references',
    part: 7,
    title: 'Références',
    layout: 'refs',
  },
  {
    id: 'questions',
    part: 7,
    title: 'Questions / réponses',
    subtitle: 'Merci de votre attention',
    layout: 'title',
    scene: { model: 'puissance', cooling: 'OFAF', mode: 'exterieur', view: 'iso' },
  },
]

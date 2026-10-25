import type { CoolingId, ModelId } from '../types'

/** Combinaisons modèle / refroidissement représentées en 3D. */
export const COOLING_BY_MODEL: Record<ModelId, CoolingId[]> = {
  monophase: ['ONAN'],
  distribution: ['ONAN'],
  sec: ['AN', 'AF'],
  puissance: ['ONAN', 'ONAF', 'OFAF', 'OFWF', 'ODAF', 'ODWF'],
}

/** Niveau qualitatif (aucune valeur numérique inventée). */
export type Level = 1 | 2 | 3
export const LEVEL_LABEL: Record<Level, string> = { 1: 'Faible', 2: 'Moyenne', 3: 'Élevée' }

export interface CoolingInfo {
  id: CoolingId
  nom: string
  norme: string
  lettres: { lettre: string; sens: string }[]
  principe: string
  composants: string[]
  circuits: string[]
  applications: string[]
  avantages: string[]
  limites: string[]
  auxiliaires: string
  complexite: Level
  maintenance: Level
  dependanceAuxiliaires: Level
  modele: ModelId
}

const L1_O = { lettre: 'O', sens: 'Fluide interne : huile minérale ou liquide isolant de point de feu ≤ 300 °C' }
const L2_N = { lettre: 'N', sens: 'Circulation interne naturelle (thermosiphon) dans l’équipement de refroidissement et les enroulements' }
const L2_F = { lettre: 'F', sens: 'Circulation forcée dans l’équipement de refroidissement ; écoulement de type thermosiphon dans les enroulements' }
const L2_D = { lettre: 'D', sens: 'Circulation forcée et dirigée depuis l’équipement de refroidissement vers au moins les enroulements principaux' }
const L3_A = { lettre: 'A', sens: 'Fluide externe : air' }
const L3_W = { lettre: 'W', sens: 'Fluide externe : eau' }
const L4_N = { lettre: 'N', sens: 'Circulation externe naturelle (convection)' }
const L4_F = { lettre: 'F', sens: 'Circulation externe forcée (ventilateurs, pompes)' }

export const COOLING: Record<CoolingId, CoolingInfo> = {
  AN: {
    id: 'AN',
    nom: 'Air Natural — air naturel',
    norme: 'IEC 60076-11 (transformateurs de type sec)',
    lettres: [
      { lettre: 'A', sens: 'Fluide de refroidissement : air (aucun liquide isolant)' },
      { lettre: 'N', sens: 'Circulation naturelle par convection' },
    ],
    principe:
      'Les enroulements (enrobés de résine ou imprégnés) sont refroidis directement par l’air ambiant. L’air réchauffé au contact des bobines s’élève dans les canaux axiaux de refroidissement et est remplacé par de l’air plus frais aspiré par le bas : c’est la convection naturelle.',
    composants: [
      'Circuit magnétique en tôles à grains orientés',
      'Enroulements BT (souvent en feuillard) et HT enrobés de résine époxy',
      'Canaux axiaux de refroidissement entre circuit magnétique, BT et HT',
      'Cales de calage élastiques et armatures de serrage',
      'Sondes de température (PT100 ou PTC) et relais de surveillance',
      'Local ou enveloppe ventilés (entrée d’air basse, sortie haute)',
    ],
    circuits: [
      'Air frais aspiré sous les bobines',
      'Montée de l’air dans les canaux axiaux, échauffement au contact des enroulements',
      'Évacuation de l’air chaud par le haut, vers la sortie de ventilation du local',
    ],
    applications: [
      'Bâtiments recevant du public, immeubles de grande hauteur, hôpitaux',
      'Postes intérieurs proches des charges, industrie',
      'Tunnels, métro, installations où le risque incendie ou de pollution doit être limité',
    ],
    avantages: [
      'Aucun liquide : risque d’incendie et de pollution réduit',
      'Aucun auxiliaire de refroidissement',
      'Maintenance limitée (nettoyage, contrôle des serrages)',
      'Installation possible à l’intérieur, près des charges',
    ],
    limites: [
      'Puissances et tensions plus limitées que pour les transformateurs immergés',
      'Sensibilité à la poussière, à l’humidité et à la condensation (classes d’environnement de l’IEC 60076-11)',
      'Nécessite une ventilation correcte du local',
      'Parties actives accessibles : enveloppe ou local protégé obligatoire',
    ],
    auxiliaires: 'Aucun',
    complexite: 1,
    maintenance: 1,
    dependanceAuxiliaires: 1,
    modele: 'sec',
  },
  AF: {
    id: 'AF',
    nom: 'Air Forced — air forcé',
    norme: 'IEC 60076-11 (transformateurs de type sec)',
    lettres: [
      { lettre: 'A', sens: 'Fluide de refroidissement : air' },
      { lettre: 'F', sens: 'Circulation forcée par ventilateurs' },
    ],
    principe:
      'Même construction que le transformateur sec AN, complétée par des ventilateurs (souvent tangentiels) placés sous les bobines. Ils soufflent l’air dans les canaux de refroidissement, ce qui augmente l’évacuation de la chaleur. Leur mise en marche est commandée par les sondes de température des enroulements.',
    composants: [
      'Partie active identique au type AN',
      'Rampes de ventilateurs tangentiels sous les enroulements',
      'Sondes de température et relais de commande des ventilateurs',
      'Alimentation auxiliaire des ventilateurs',
    ],
    circuits: [
      'Air aspiré et soufflé par les ventilateurs sous les bobines',
      'Circulation accélérée dans les canaux axiaux',
      'Évacuation de l’air chaud par le haut',
    ],
    applications: [
      'Transformateurs secs devant supporter des pointes de charge',
      'Augmentation temporaire de la puissance disponible (selon le constructeur)',
      'Industrie, centres de données, infrastructures',
    ],
    avantages: [
      'Capacité de dissipation augmentée pour un même appareil',
      'Mise en service automatique selon la température',
      'Retour au fonctionnement AN si les ventilateurs sont à l’arrêt (avec puissance réduite)',
    ],
    limites: [
      'Bruit des ventilateurs',
      'Alimentation auxiliaire et maintenance des ventilateurs',
      'Mêmes contraintes d’environnement que le type AN',
    ],
    auxiliaires: 'Ventilateurs',
    complexite: 2,
    maintenance: 2,
    dependanceAuxiliaires: 2,
    modele: 'sec',
  },
  ONAN: {
    id: 'ONAN',
    nom: 'Oil Natural Air Natural — huile naturelle, air naturel',
    norme: 'IEC 60076-2',
    lettres: [L1_O, L2_N, L3_A, L4_N],
    principe:
      'L’huile chauffée par les pertes dans les enroulements et le circuit magnétique devient moins dense et monte (thermosiphon). Elle atteint le haut de la cuve, entre dans les radiateurs (ou les ailettes de la cuve), se refroidit en descendant au contact des parois, puis retourne en bas de la cuve. À l’extérieur, l’air réchauffé par les radiateurs monte par convection naturelle.',
    composants: [
      'Cuve remplie d’huile isolante',
      'Radiateurs à éléments ou cuve à ailettes (ondes)',
      'Collecteurs et vannes d’isolement des radiateurs',
      'Conservateur avec relais Buchholz et dessiccateur, ou cuve hermétique à remplissage total',
      'Indicateur de température d’huile',
    ],
    circuits: [
      'Circuit huile : montée dans les canaux des enroulements → haut de cuve → collecteur supérieur → descente dans les radiateurs → collecteur inférieur → bas de cuve',
      'Circuit air : convection naturelle ascendante le long des radiateurs',
    ],
    applications: [
      'Transformateurs de distribution (postes MT/BT)',
      'Transformateurs de puissance de taille moyenne',
      'Premier étage des transformateurs à double régime ONAN/ONAF',
    ],
    avantages: [
      'Aucun auxiliaire : fonctionnement silencieux et autonome',
      'Très grande fiabilité',
      'Maintenance minimale',
    ],
    limites: [
      'Surface d’échange importante : encombrement et masse croissent avec la puissance',
      'Dissipation limitée par la convection naturelle',
      'Dépend de la température de l’air ambiant',
    ],
    auxiliaires: 'Aucun',
    complexite: 1,
    maintenance: 1,
    dependanceAuxiliaires: 1,
    modele: 'puissance',
  },
  ONAF: {
    id: 'ONAF',
    nom: 'Oil Natural Air Forced — huile naturelle, air forcé',
    norme: 'IEC 60076-2',
    lettres: [L1_O, L2_N, L3_A, L4_F],
    principe:
      'L’huile circule toujours par thermosiphon, comme en ONAN. Des ventilateurs installés sur les radiateurs forcent le passage de l’air entre les éléments, ce qui augmente fortement l’échange thermique côté air. Les ventilateurs sont généralement enclenchés par étages selon la température (image thermique des enroulements ou température d’huile).',
    composants: [
      'Cuve et radiateurs (comme ONAN)',
      'Ventilateurs montés sous ou à côté des radiateurs',
      'Armoire de commande des ventilateurs',
      'Indicateurs de température d’huile et d’enroulement (image thermique)',
    ],
    circuits: [
      'Circuit huile : thermosiphon identique à ONAN',
      'Circuit air : soufflage forcé à travers les radiateurs',
    ],
    applications: [
      'Transformateurs de puissance des postes de transformation',
      'Double puissance assignée ONAN/ONAF : la puissance la plus élevée est obtenue ventilateurs en marche',
    ],
    avantages: [
      'Puissance accrue avec les mêmes radiateurs',
      'Si les ventilateurs s’arrêtent, le transformateur fonctionne en ONAN à puissance réduite',
      'Mise en service par étages, adaptée à la charge',
    ],
    limites: [
      'Bruit des ventilateurs',
      'Alimentation auxiliaire et maintenance des moteurs',
      'Gain limité par la circulation naturelle de l’huile',
    ],
    auxiliaires: 'Ventilateurs',
    complexite: 2,
    maintenance: 2,
    dependanceAuxiliaires: 2,
    modele: 'puissance',
  },
  OFAF: {
    id: 'OFAF',
    nom: 'Oil Forced Air Forced — huile forcée, air forcé',
    norme: 'IEC 60076-2',
    lettres: [L1_O, L2_F, L3_A, L4_F],
    principe:
      'Des pompes forcent la circulation de l’huile à travers des aéroréfrigérants (échangeurs huile/air compacts) équipés de ventilateurs. Dans la cuve, l’huile n’est pas canalisée vers les enroulements : à l’intérieur de ceux-ci, l’écoulement reste de type thermosiphon, et une partie du débit contourne la partie active.',
    composants: [
      'Pompes à huile (motopompes immergées ou à rotor noyé)',
      'Aéroréfrigérants à tubes ailetés et ventilateurs',
      'Indicateurs de débit d’huile',
      'Vannes, tuyauteries, armoire de commande',
    ],
    circuits: [
      'Circuit huile : haut de cuve → aéroréfrigérant → pompe → bas de cuve (circulation forcée)',
      'Dans les enroulements : montée de l’huile par thermosiphon',
      'Circuit air : soufflage forcé à travers les tubes ailetés',
    ],
    applications: [
      'Grands transformateurs de puissance (transport, centrales)',
      'Installations où l’encombrement des radiateurs serait trop important',
    ],
    avantages: [
      'Échangeurs compacts pour une forte puissance dissipée',
      'Encombrement réduit par rapport à des radiateurs ONAN équivalents',
    ],
    limites: [
      'Forte dépendance aux auxiliaires : la capacité de refroidissement sans pompes ni ventilateurs est très faible',
      'Redondance des groupes et alimentation secourue nécessaires',
      'Maintenance des pompes et ventilateurs ; risque de fuite',
      'Électrisation par écoulement (streaming electrification) à surveiller aux forts débits',
    ],
    auxiliaires: 'Pompes + ventilateurs',
    complexite: 3,
    maintenance: 3,
    dependanceAuxiliaires: 3,
    modele: 'puissance',
  },
  OFWF: {
    id: 'OFWF',
    nom: 'Oil Forced Water Forced — huile forcée, eau forcée',
    norme: 'IEC 60076-2',
    lettres: [L1_O, L2_F, L3_W, L4_F],
    principe:
      'Une pompe fait circuler l’huile dans un échangeur huile/eau (souvent à faisceau tubulaire). L’eau, mise en circulation par le réseau ou par une pompe, absorbe la chaleur et l’emporte hors de l’installation. Comme en OF, l’écoulement dans les enroulements reste de type thermosiphon.',
    composants: [
      'Pompe à huile',
      'Échangeur huile/eau (faisceau tubulaire, souvent à double paroi avec détection de fuite)',
      'Circuit d’eau de refroidissement (pompe, filtres, vannes)',
      'Indicateurs de débit et de pression huile et eau',
    ],
    circuits: [
      'Circuit huile : haut de cuve → échangeur (côté calandre) → pompe → bas de cuve',
      'Circuit eau : entrée d’eau froide → tubes de l’échangeur → sortie d’eau réchauffée',
      'Transfert thermique huile → paroi des tubes → eau, à contre-courant',
    ],
    applications: [
      'Centrales hydrauliques et postes en caverne',
      'Transformateurs industriels (fours à arc, électrolyse)',
      'Sites où l’air de refroidissement ou l’espace manquent',
    ],
    avantages: [
      'Très compact',
      'Peu de bruit aérien (pas de ventilateurs)',
      'Évacuation de la chaleur hors du local par l’eau',
    ],
    limites: [
      'Risque de contamination de l’huile par l’eau : échangeurs à double paroi, pression d’huile supérieure à celle de l’eau',
      'Qualité de l’eau (encrassement, corrosion) et infrastructure hydraulique',
      'Aucune capacité naturelle significative sans circulation',
      'Maintenance de deux circuits',
    ],
    auxiliaires: 'Pompe huile + circuit d’eau',
    complexite: 3,
    maintenance: 3,
    dependanceAuxiliaires: 3,
    modele: 'puissance',
  },
  ODAF: {
    id: 'ODAF',
    nom: 'Oil Directed Air Forced — huile dirigée, air forcé',
    norme: 'IEC 60076-2',
    lettres: [L1_O, L2_D, L3_A, L4_F],
    principe:
      'L’huile refroidie par les aéroréfrigérants est pompée puis dirigée, par des conduits et des écrans isolants, directement dans les canaux des enroulements. Des rondelles de guidage imposent un parcours en zigzag à travers les galettes. Le débit dans les enroulements est ainsi maîtrisé, ce qui limite la température du point chaud.',
    composants: [
      'Pompes à huile',
      'Collecteur de distribution et conduits isolants vers le bas des enroulements',
      'Rondelles de guidage d’huile dans les enroulements',
      'Aéroréfrigérants à ventilateurs',
      'Indicateurs de débit',
    ],
    circuits: [
      'Circuit huile : haut de cuve → aéroréfrigérant → pompe → collecteur → enroulements (zigzag) → haut de cuve',
      'Circuit air : soufflage forcé à travers les tubes ailetés',
    ],
    applications: [
      'Très grands transformateurs de puissance (transformateurs élévateurs de centrales, interconnexion)',
      'Conceptions compactes à forte densité de puissance',
    ],
    avantages: [
      'Meilleure maîtrise du point chaud des enroulements',
      'Appareil plus compact pour une puissance donnée',
    ],
    limites: [
      'Conception hydraulique des enroulements plus complexe',
      'Électrisation par écoulement à maîtriser (débits, vitesse de l’huile)',
      'Dépendance totale aux pompes et ventilateurs',
    ],
    auxiliaires: 'Pompes + ventilateurs',
    complexite: 3,
    maintenance: 3,
    dependanceAuxiliaires: 3,
    modele: 'puissance',
  },
  ODWF: {
    id: 'ODWF',
    nom: 'Oil Directed Water Forced — huile dirigée, eau forcée',
    norme: 'IEC 60076-2',
    lettres: [L1_O, L2_D, L3_W, L4_F],
    principe:
      'Combinaison de la circulation dirigée de l’huile dans les enroulements (comme en ODAF) et d’un échangeur huile/eau (comme en OFWF). C’est la solution la plus compacte, réservée aux applications où l’eau de refroidissement est disponible.',
    composants: [
      'Pompe à huile et collecteur de distribution dirigée',
      'Conduits isolants et rondelles de guidage dans les enroulements',
      'Échangeur huile/eau à double paroi',
      'Circuit d’eau, indicateurs de débit et de pression',
    ],
    circuits: [
      'Circuit huile : haut de cuve → échangeur → pompe → collecteur → enroulements (zigzag) → haut de cuve',
      'Circuit eau : entrée d’eau froide → échangeur → sortie d’eau réchauffée',
    ],
    applications: [
      'Transformateurs élévateurs de centrales hydrauliques ou en caverne',
      'Très fortes puissances dans des volumes restreints',
    ],
    avantages: [
      'Densité de puissance maximale',
      'Point chaud maîtrisé par la circulation dirigée',
      'Pas de ventilateurs : peu de bruit aérien',
    ],
    limites: [
      'Système le plus complexe (deux circuits forcés + hydraulique interne)',
      'Risque de contamination eau/huile à maîtriser',
      'Dépendance totale aux auxiliaires',
    ],
    auxiliaires: 'Pompe huile + circuit d’eau',
    complexite: 3,
    maintenance: 3,
    dependanceAuxiliaires: 3,
    modele: 'puissance',
  },
}

export const COOLING_ORDER: CoolingId[] = ['AN', 'AF', 'ONAN', 'ONAF', 'OFAF', 'OFWF', 'ODAF', 'ODWF']

/** Anciennes désignations (IEEE C57.12.00, éditions antérieures à 2000) – correspondance indicative. */
export const ANCIENNES_DESIGNATIONS: { iec: string; ancien: string }[] = [
  { iec: 'ONAN', ancien: 'OA' },
  { iec: 'ONAF', ancien: 'FA' },
  { iec: 'OFAF / ODAF', ancien: 'FOA' },
  { iec: 'OFWF / ODWF', ancien: 'FOW' },
]

/** Systèmes utilisant des ventilateurs ou des pompes. */
export const usesFans = (c: CoolingId) => c === 'AF' || c === 'ONAF' || c === 'OFAF' || c === 'ODAF'
export const usesPumps = (c: CoolingId) => c === 'OFAF' || c === 'OFWF' || c === 'ODAF' || c === 'ODWF'
export const usesWater = (c: CoolingId) => c === 'OFWF' || c === 'ODWF'
export const isDirected = (c: CoolingId) => c === 'ODAF' || c === 'ODWF'
export const usesAirCooler = (c: CoolingId) => c === 'OFAF' || c === 'ODAF'
export const usesRadiators = (c: CoolingId) => c === 'ONAN' || c === 'ONAF'

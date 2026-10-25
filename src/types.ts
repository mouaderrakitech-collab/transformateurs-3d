// Types partagés de l'application.

/** Modèles 3D de base disponibles. */
export type ModelId = 'monophase' | 'distribution' | 'sec' | 'puissance'

/** Modes de refroidissement (désignations IEC 60076-2 / IEC 60076-11). */
export type CoolingId = 'AN' | 'AF' | 'ONAN' | 'ONAF' | 'OFAF' | 'OFWF' | 'ODAF' | 'ODWF'

/** Modes d'affichage de la scène 3D. */
export type ViewMode = 'exterieur' | 'interieur' | 'eclate' | 'coupe' | 'refroidissement'

/** Vues caméra prédéfinies. */
export type CameraView = 'avant' | 'arriere' | 'gauche' | 'droite' | 'dessus' | 'dessous' | 'iso'

/** Niveaux de qualité graphique. */
export type Quality = 'performance' | 'equilibre' | 'haute'

/** Calques (familles de composants) pouvant être masqués. */
export type LayerId = 'cuve' | 'partieActive' | 'refroidissement' | 'accessoires' | 'flux'

/** Configuration d'une scène 3D (utilisée par les diapositives). */
export interface SceneConfig {
  model: ModelId
  cooling: CoolingId
  mode: ViewMode
  view?: CameraView
  /** Démarre automatiquement l'animation de refroidissement. */
  play?: boolean
  labels?: boolean
}

/** Fluide transporté par une trajectoire animée. */
export type Fluid = 'huile' | 'air' | 'eau'

/** Trajectoire de fluide : points + température relative (0 = froid, 1 = chaud) en chaque point. */
export interface FlowPath {
  fluid: Fluid
  points: [number, number, number][]
  temps: number[]
  /** Vitesse relative qualitative (pas une valeur physique). */
  speed: number
  /** Nombre de particules sur la trajectoire. */
  count: number
  closed?: boolean
}

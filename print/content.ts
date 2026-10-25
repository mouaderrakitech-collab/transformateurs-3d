import type { CoolingId } from '../src/types'

/** Illustration d'une diapositive : image 3D, repères numérotés (noms de composants) et légende. */
export interface Fig {
  img: string
  caption: string
  callouts?: string[]
}

export interface PageSpec {
  figs?: Fig[]
  cooling?: CoolingId[]
  /** Encadré « À retenir » (synthèse académique de la diapositive). */
  key?: string
}

/** Plan éditorial du document PDF : une entrée par diapositive (identifiants de src/data/slides.ts). */
export const PAGES: Record<string, PageSpec> = {
  titre: { figs: [{ img: 'cover', caption: '' }] },
  definition: {
    figs: [{ img: 'def-dist', caption: 'Transformateur de distribution triphasé immergé — partie active visible à travers la cuve.', callouts: ['Circuit magnétique', 'Enroulement haute tension (HT)', 'Cuve à ailettes (ondes)', 'Traversée haute tension', 'Traversée basse tension'] }],
    key: 'Un transformateur adapte la tension et le courant alternatifs sans modifier la fréquence ni la puissance transmise, aux pertes près.',
  },
  induction: { key: 'Sans variation de flux, aucune tension n’est induite : le transformateur ne fonctionne qu’en régime alternatif.' },
  fonctionnement: { key: 'Le rapport des nombres de spires fixe le rapport des tensions ; les pertes, bien que faibles, déterminent l’échauffement.' },
  'circuit-magnetique': {
    figs: [{ img: 'core-exploded', caption: 'Vue éclatée : culasse supérieure levée, enroulements extraits, cuve et accessoires écartés.', callouts: ['Circuit magnétique', 'Enroulement haute tension (HT)', 'Isolation solide (carton, papier)', 'Armatures de serrage', 'Radiateurs à éléments'] }],
  },
  enroulements: {
    figs: [{ img: 'windings-section', caption: 'Coupe technique : colonnes en gradins, enroulements BT (intérieur) et HT (extérieur) en galettes, cylindres isolants.' }],
  },
  isolation: {
    figs: [
      { img: 'power-section-iso', caption: 'Immergé : isolation papier–carton imprégnée d’huile.' },
      { img: 'dry-section', caption: 'Sec : bobines HT enrobées de résine époxy.' },
    ],
  },
  'cuve-accessoires': {
    figs: [{ img: 'power-accessories', caption: 'Transformateur de puissance : cuve et principaux accessoires.', callouts: ['Traversée haute tension', 'Traversée basse tension', 'Conservateur d’huile', 'Relais Buchholz', 'Dessiccateur (silicagel)', 'Soupape de surpression', 'Armoire de commande', 'Radiateurs à éléments'] }],
  },
  classification: { key: 'Exemple : un transformateur de distribution en cabine est à la fois triphasé, immergé et de distribution.' },
  monophase: {
    figs: [
      { img: 'mono-ext', caption: 'Transformateur monophasé sur poteau (immergé, ONAN).' },
      { img: 'mono-int', caption: 'Intérieur : circuit cuirassé et bobine concentrique.', callouts: ['Circuit magnétique cuirassé', 'Enroulement haute tension (HT)', 'Traversée basse tension', 'Pattes de fixation sur poteau'] },
    ],
  },
  triphase: {
    figs: [{ img: 'dist-exploded', caption: 'Transformateur triphasé à trois colonnes (vue éclatée).', callouts: ['Circuit magnétique', 'Enroulement basse tension (BT)', 'Enroulement haute tension (HT)', 'Couvercle', 'Cuve à ailettes (ondes)'] }],
  },
  sec: {
    figs: [
      { img: 'dry-ext', caption: 'Transformateur sec enrobé (IP00).', callouts: ['Enroulement HT enrobé de résine', 'Barres de couplage HT', 'Circuit magnétique', 'Cales de calage'] },
      { img: 'dry-exploded', caption: 'Vue éclatée : bobines HT, BT et circuit magnétique.' },
    ],
  },
  immerge: {
    figs: [{ img: 'dist-section-flow', caption: 'Coupe d’un transformateur immergé : circulation de l’huile (bleu = froid, rouge = chaud).' }],
  },
  distribution: {
    figs: [{ img: 'dist-ext', caption: 'Transformateur de distribution triphasé, cuve hermétique à ailettes.', callouts: ['Traversée haute tension', 'Traversée basse tension', 'Commutateur de prises hors tension', 'Relais de protection intégré (type DGPT2)', 'Cuve à ailettes (ondes)', 'Châssis et galets'] }],
  },
  puissance: {
    figs: [
      { img: 'power-onaf-ext', caption: 'Transformateur de puissance ONAF : radiateurs et ventilateurs.' },
      { img: 'power-exploded', caption: 'Vue éclatée de l’appareil.' },
    ],
  },
  'pertes-joule': { key: 'À courant nominal, les pertes Joule dominent ; elles diminuent avec le carré de la charge.' },
  'pertes-fer': { key: 'Les pertes fer existent dès la mise sous tension, même à vide : elles sont permanentes.' },
  'origine-echauffement': {
    figs: [{ img: 'heat-front', caption: 'Visualisation qualitative : enroulements échauffés et huile chaude montant vers le haut de cuve.' }],
  },
  necessite: { key: 'Le refroidissement fixe la puissance que l’appareil peut délivrer en restant dans les limites d’échauffement.' },
  'code-iec': { key: 'Exemple : ONAF = huile minérale, circulation interne naturelle, air externe, circulation externe forcée.' },
  'an-af': {
    cooling: ['AN', 'AF'],
    figs: [
      { img: 'an-front', caption: 'AN : convection naturelle de l’air dans les canaux.' },
      { img: 'af-iso', caption: 'AF : ventilateurs tangentiels sous les bobines.' },
    ],
  },
  onan: {
    cooling: ['ONAN'],
    figs: [
      { img: 'onan-side', caption: 'Huile chaude vers le haut des radiateurs, retour froid en bas ; air ascendant.' },
      { img: 'onan-section', caption: 'Coupe : thermosiphon dans les enroulements.' },
    ],
  },
  onaf: {
    cooling: ['ONAF'],
    figs: [
      { img: 'onaf-iso', caption: 'Ventilateurs sous les radiateurs : air forcé.' },
      { img: 'onaf-side', caption: 'Vue de face : ventilateurs soufflant l’air à travers les radiateurs.' },
    ],
  },
  ofaf: {
    cooling: ['OFAF'],
    figs: [
      { img: 'ofaf-iso', caption: 'Aéroréfrigérants à ventilateurs et pompes sur le retour.' },
      { img: 'ofaf-section', caption: 'Coupe : l’huile pompée n’est pas dirigée dans les enroulements.' },
    ],
  },
  ofwf: {
    cooling: ['OFWF'],
    figs: [
      { img: 'ofwf-iso', caption: 'Échangeur huile/eau, pompe et circuit d’eau.' },
      { img: 'ofwf-side', caption: 'Eau froide entrante, eau réchauffée sortante (contre-courant).' },
    ],
  },
  odaf: {
    cooling: ['ODAF'],
    figs: [
      { img: 'odaf-section', caption: 'Coupe : parcours en zigzag imposé par les rondelles de guidage.' },
      { img: 'odaf-iso', caption: 'Circuit complet avec aéroréfrigérants.' },
    ],
  },
  odwf: {
    cooling: ['ODWF'],
    figs: [
      { img: 'odwf-iso', caption: 'Circulation dirigée et échangeur huile/eau.' },
      { img: 'odwf-section', caption: 'Coupe : zigzag dans les galettes HT.' },
    ],
  },
  synthese: { key: 'Gagner en compacité se paie en complexité et en dépendance aux auxiliaires.' },
  choix: { key: 'Le choix final résulte d’une étude technico-économique : pertes, encombrement, bruit, disponibilité et maintenance.' },
  questions: { figs: [{ img: 'closing', caption: '' }] },
}

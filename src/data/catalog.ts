import type { CoolingId, ModelId, ViewMode } from '../types'

export interface TypeInfo {
  id: string
  nom: string
  critere: 'Nombre de phases' | 'Isolation / refroidissement' | 'Fonction dans le réseau'
  modele: ModelId
  cooling: CoolingId
  mode: ViewMode
  resume: string
  points: string[]
}

/** Les six catégories demandées. Elles se recoupent : un même appareil appartient à plusieurs catégories. */
export const TYPES: TypeInfo[] = [
  {
    id: 'monophase',
    nom: 'Transformateur monophasé',
    critere: 'Nombre de phases',
    modele: 'monophase',
    cooling: 'ONAN',
    mode: 'exterieur',
    resume: 'Un seul enroulement primaire et un seul secondaire, alimentés par une tension alternative monophasée.',
    points: [
      'Circuit magnétique cuirassé (représenté ici) ou à colonnes',
      'Exemple représenté : transformateur de distribution monophasé sur poteau, immergé dans l’huile',
      'Utilisé aussi en banc de trois unités monophasées pour les très fortes puissances (limites de transport)',
    ],
  },
  {
    id: 'triphase',
    nom: 'Transformateur triphasé',
    critere: 'Nombre de phases',
    modele: 'distribution',
    cooling: 'ONAN',
    mode: 'interieur',
    resume: 'Trois phases sur un circuit magnétique commun, généralement à trois colonnes.',
    points: [
      'Trois colonnes portant chacune un enroulement BT (intérieur) et HT (extérieur)',
      'Couplages possibles : étoile, triangle, zigzag (ex. Dyn11 en distribution)',
      'Moins de matière qu’un banc de trois monophasés de même puissance',
    ],
  },
  {
    id: 'sec',
    nom: 'Transformateur à sec',
    critere: 'Isolation / refroidissement',
    modele: 'sec',
    cooling: 'AN',
    mode: 'exterieur',
    resume: 'Pas de liquide isolant : les enroulements sont isolés par des solides (résine époxy) et refroidis par l’air.',
    points: [
      'Norme de référence : IEC 60076-11',
      'Modes de refroidissement AN et AF',
      'Choisi lorsque le risque d’incendie ou de pollution doit être réduit (intérieur des bâtiments)',
    ],
  },
  {
    id: 'immerge',
    nom: 'Transformateur immergé dans l’huile',
    critere: 'Isolation / refroidissement',
    modele: 'distribution',
    cooling: 'ONAN',
    mode: 'coupe',
    resume: 'La partie active est plongée dans un liquide qui assure à la fois l’isolation et l’évacuation de la chaleur.',
    points: [
      'Huile minérale, ou liquides moins inflammables (esters naturels ou synthétiques, désignation K)',
      'Cuve hermétique à remplissage total ou cuve avec conservateur',
      'Modes ONAN, ONAF, OFAF, OFWF, ODAF, ODWF (IEC 60076-2)',
    ],
  },
  {
    id: 'distribution',
    nom: 'Transformateur de distribution',
    critere: 'Fonction dans le réseau',
    modele: 'distribution',
    cooling: 'ONAN',
    mode: 'exterieur',
    resume: 'Abaisse la moyenne tension du réseau de distribution vers la basse tension des utilisateurs.',
    points: [
      'Exemple représenté : triphasé, immergé, cuve hermétique à ailettes, ONAN',
      'Installé en poste de transformation (cabine, poste préfabriqué, poteau)',
      'Changeur de prises hors tension, protection type relais intégré (DGPT2 en France)',
    ],
  },
  {
    id: 'puissance',
    nom: 'Transformateur de puissance',
    critere: 'Fonction dans le réseau',
    modele: 'puissance',
    cooling: 'ONAN',
    mode: 'exterieur',
    resume: 'Relie les réseaux de transport et de répartition, ou élève la tension en sortie de centrale.',
    points: [
      'Exemple représenté : triphasé, immergé, avec conservateur et changeur de prises en charge',
      'Refroidissement selon la puissance : ONAN, ONAF, OFAF, ODAF, OFWF, ODWF',
      'Accessoires de protection : relais Buchholz, soupape de surpression, images thermiques',
    ],
  },
]

export interface PartInfo {
  nom: string
  famille: 'Cuve et structure' | 'Partie active' | 'Isolation' | 'Refroidissement' | 'Accessoires et protection' | 'Connexions'
  description: string
}

/** Description des composants cliquables dans la scène 3D. */
export const PARTS: Record<string, PartInfo> = {
  noyau: {
    nom: 'Circuit magnétique',
    famille: 'Partie active',
    description:
      'Empilage de tôles d’acier au silicium à grains orientés, isolées entre elles pour limiter les courants de Foucault. Colonnes à section en gradins (proche du cercle) et culasses supérieure et inférieure. Il canalise le flux magnétique commun aux enroulements.',
  },
  noyauCuirasse: {
    nom: 'Circuit magnétique cuirassé',
    famille: 'Partie active',
    description:
      'Circuit à colonne centrale entourée de deux colonnes de retour : le flux de la colonne centrale se partage entre les deux retours. Construction courante pour les petits transformateurs monophasés.',
  },
  enroulementBT: {
    nom: 'Enroulement basse tension (BT)',
    famille: 'Partie active',
    description:
      'Enroulement placé au plus près du circuit magnétique, car il nécessite la plus faible distance d’isolement par rapport à la masse. Conducteurs en cuivre ou aluminium (méplats, feuillard).',
  },
  enroulementHT: {
    nom: 'Enroulement haute tension (HT)',
    famille: 'Partie active',
    description:
      'Enroulement extérieur, concentrique à l’enroulement BT. Dans les transformateurs immergés, il est souvent réalisé en galettes de conducteurs isolés au papier, séparées par des cales qui créent les canaux d’huile.',
  },
  enroulementHTResine: {
    nom: 'Enroulement HT enrobé de résine',
    famille: 'Partie active',
    description:
      'Bobine haute tension coulée sous vide dans une résine époxy chargée. La résine assure l’isolation et la tenue mécanique. Le refroidissement se fait par sa surface et par les canaux d’air.',
  },
  isolation: {
    nom: 'Isolation solide (carton, papier)',
    famille: 'Isolation',
    description:
      'Cylindres et écrans en carton comprimé (presspahn) entre circuit magnétique, BT et HT ; papier autour des conducteurs. Imprégnés d’huile, ils forment l’isolation papier-huile. Les cales créent les canaux de refroidissement.',
  },
  rondelles: {
    nom: 'Rondelles de guidage d’huile',
    famille: 'Refroidissement',
    description:
      'Écrans annulaires placés à intervalles dans l’enroulement. Ils obligent l’huile à traverser les galettes en zigzag (circulation dirigée OD), ce qui garantit un débit dans tous les canaux.',
  },
  collecteurOD: {
    nom: 'Collecteur de circulation dirigée',
    famille: 'Refroidissement',
    description:
      'Tuyauterie isolante qui reçoit l’huile refoulée par les pompes et l’amène directement à la base des enroulements (désignation D de l’IEC 60076-2).',
  },
  serrage: {
    nom: 'Armatures de serrage',
    famille: 'Cuve et structure',
    description:
      'Fers profilés et tirants qui serrent les culasses et maintiennent les enroulements en compression. Ils doivent résister aux efforts électrodynamiques des courts-circuits.',
  },
  cuve: {
    nom: 'Cuve',
    famille: 'Cuve et structure',
    description:
      'Enveloppe en tôle d’acier soudée, renforcée par des raidisseurs. Elle contient la partie active et le liquide isolant, et supporte les accessoires. Peinte pour la protection contre la corrosion.',
  },
  cuveAilettes: {
    nom: 'Cuve à ailettes (ondes)',
    famille: 'Refroidissement',
    description:
      'Parois en tôle pliée formant des ailettes creuses remplies d’huile. Elles augmentent la surface d’échange et, en cuve hermétique, se déforment légèrement pour absorber la dilatation de l’huile.',
  },
  cuveCylindrique: {
    nom: 'Cuve cylindrique',
    famille: 'Cuve et structure',
    description:
      'Cuve de transformateur sur poteau. La paroi lisse suffit à évacuer les pertes de ces petites puissances par convection naturelle (ONAN).',
  },
  couvercle: {
    nom: 'Couvercle',
    famille: 'Cuve et structure',
    description: 'Couvercle boulonné sur la bride de la cuve avec un joint, qui porte les traversées et plusieurs accessoires.',
  },
  huile: {
    nom: 'Huile isolante',
    famille: 'Isolation',
    description:
      'Liquide qui remplit la cuve : il isole électriquement et transporte la chaleur des enroulements vers les surfaces de refroidissement. Huile minérale (O) ou ester (K) selon la désignation.',
  },
  traverseeHT: {
    nom: 'Traversée haute tension',
    famille: 'Connexions',
    description:
      'Isolateur qui fait passer le conducteur HT à travers le couvercle mis à la terre. Les traversées de forte tension sont de type condensateur (papier imprégné), avec enveloppe en porcelaine ou composite silicone à ailettes.',
  },
  traverseeBT: {
    nom: 'Traversée basse tension',
    famille: 'Connexions',
    description: 'Traversée plus courte, dimensionnée pour un courant plus élevé et une tension plus faible. Comprend souvent la sortie du neutre.',
  },
  conservateur: {
    nom: 'Conservateur d’huile',
    famille: 'Accessoires et protection',
    description:
      'Réservoir placé au-dessus de la cuve qui absorbe les variations de volume de l’huile avec la température. La cuve reste ainsi entièrement remplie.',
  },
  buchholz: {
    nom: 'Relais Buchholz',
    famille: 'Accessoires et protection',
    description:
      'Relais monté sur la tuyauterie entre cuve et conservateur. Il détecte l’accumulation de gaz (défaut naissant) et les mouvements brusques d’huile (défaut grave) : alarme puis déclenchement.',
  },
  dessiccateur: {
    nom: 'Dessiccateur (silicagel)',
    famille: 'Accessoires et protection',
    description:
      'Assèche l’air qui entre dans le conservateur lors de la contraction de l’huile. Le silicagel change de couleur lorsqu’il est saturé d’humidité.',
  },
  soupape: {
    nom: 'Soupape de surpression',
    famille: 'Accessoires et protection',
    description: 'Dispositif qui s’ouvre en cas de surpression interne brutale, afin de limiter le risque de rupture de la cuve.',
  },
  regleur: {
    nom: 'Changeur de prises en charge',
    famille: 'Accessoires et protection',
    description:
      'Modifie le nombre de spires actives de l’enroulement HT sans interrompre le courant, pour régler la tension. Il possède son propre compartiment d’huile et une commande motorisée.',
  },
  commandeRegleur: {
    nom: 'Commande motorisée du changeur de prises',
    famille: 'Accessoires et protection',
    description: 'Coffret contenant le moteur et les automatismes qui manœuvrent le changeur de prises via un arbre de transmission.',
  },
  commutateur: {
    nom: 'Commutateur de prises hors tension',
    famille: 'Accessoires et protection',
    description: 'Manette sur le couvercle permettant d’ajuster le rapport de transformation, transformateur hors tension.',
  },
  dgpt: {
    nom: 'Relais de protection intégré (type DGPT2)',
    famille: 'Accessoires et protection',
    description:
      'Relais des transformateurs hermétiques : détection de dégagement gazeux, de baisse de niveau, de surpression et de température excessive.',
  },
  armoire: {
    nom: 'Armoire de commande',
    famille: 'Accessoires et protection',
    description: 'Regroupe les borniers, les indicateurs de température, la commande des ventilateurs et des pompes et les alarmes.',
  },
  radiateurs: {
    nom: 'Radiateurs à éléments',
    famille: 'Refroidissement',
    description:
      'Éléments en tôle emboutie, à canaux verticaux, reliés par des collecteurs haut et bas. L’huile chaude entre en haut, se refroidit en descendant et retourne en bas de cuve. Démontables grâce aux vannes d’isolement.',
  },
  ventilateurs: {
    nom: 'Ventilateurs',
    famille: 'Refroidissement',
    description:
      'Motoventilateurs hélicoïdes qui forcent l’air à travers les radiateurs ou les aéroréfrigérants (lettre F en 4ᵉ position). Ils sont enclenchés par étages selon la température.',
  },
  aerorefrigerant: {
    nom: 'Aéroréfrigérant',
    famille: 'Refroidissement',
    description:
      'Échangeur huile/air compact : l’huile circule dans des tubes munis d’ailettes, l’air est soufflé à travers le faisceau par les ventilateurs. Conçu pour fonctionner avec circulation forcée d’huile et d’air.',
  },
  pompe: {
    nom: 'Pompe à huile',
    famille: 'Refroidissement',
    description:
      'Motopompe centrifuge montée sur la tuyauterie de retour. Elle impose la circulation de l’huile (lettre F ou D en 2ᵉ position). Associée à un indicateur de débit.',
  },
  echangeurEau: {
    nom: 'Échangeur huile/eau',
    famille: 'Refroidissement',
    description:
      'Échangeur à faisceau tubulaire : l’eau circule dans les tubes, l’huile dans la calandre, à contre-courant. Les modèles à double paroi permettent de détecter une fuite avant toute contamination.',
  },
  circuitEau: {
    nom: 'Circuit d’eau de refroidissement',
    famille: 'Refroidissement',
    description: 'Tuyauteries d’arrivée d’eau froide et de retour d’eau réchauffée (lettre W en 3ᵉ position, F en 4ᵉ position).',
  },
  tuyauterie: {
    nom: 'Tuyauteries d’huile',
    famille: 'Refroidissement',
    description: 'Conduites reliant le haut de la cuve à l’entrée de l’échangeur et sa sortie au bas de la cuve, avec vannes d’isolement.',
  },
  ventTangentiel: {
    nom: 'Ventilateurs tangentiels',
    famille: 'Refroidissement',
    description:
      'Ventilateurs à rotor allongé placés sous les bobines d’un transformateur sec (mode AF). Ils soufflent l’air dans les canaux de refroidissement.',
  },
  cales: {
    nom: 'Cales de calage',
    famille: 'Isolation',
    description: 'Blocs isolants élastiques entre les bobines et les armatures : ils maintiennent les enroulements et amortissent les vibrations.',
  },
  barresHT: {
    nom: 'Barres de couplage HT',
    famille: 'Connexions',
    description: 'Liaisons entre les bobines HT réalisant le couplage (par exemple triangle). Les prises de réglage sont accessibles sur la face avant des bobines.',
  },
  barresBT: {
    nom: 'Barres de sortie BT',
    famille: 'Connexions',
    description: 'Jeux de barres en cuivre ou aluminium raccordés aux sorties des enroulements basse tension.',
  },
  chassis: {
    nom: 'Châssis et galets',
    famille: 'Cuve et structure',
    description: 'Châssis en profilés acier avec galets orientables pour la manutention et la mise en place.',
  },
  sondes: {
    nom: 'Sondes de température',
    famille: 'Accessoires et protection',
    description: 'Sondes PT100 ou PTC dans les canaux BT, reliées à un relais qui commande les ventilateurs, l’alarme et le déclenchement.',
  },
  supports: {
    nom: 'Pattes de fixation sur poteau',
    famille: 'Cuve et structure',
    description: 'Ferrures soudées à l’arrière de la cuve pour l’accrochage du transformateur sur le poteau.',
  },
  thermometre: {
    nom: 'Indicateur de température d’huile',
    famille: 'Accessoires et protection',
    description: 'Thermomètre à cadran mesurant la température de l’huile en haut de cuve, avec contacts d’alarme.',
  },
}

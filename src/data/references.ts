export interface Reference {
  id: string
  titre: string
  detail: string
}

/**
 * Références documentaires. Les numéros de norme sont ceux des séries publiées ;
 * vérifier l'édition en vigueur avant toute citation de valeur.
 */
export const REFERENCES: Reference[] = [
  { id: 'iec60076-1', titre: 'IEC 60076-1', detail: 'Transformateurs de puissance – Partie 1 : Généralités.' },
  {
    id: 'iec60076-2',
    titre: 'IEC 60076-2:2011',
    detail: 'Transformateurs de puissance – Partie 2 : Échauffement des transformateurs immergés dans un liquide (symboles de refroidissement à 4 lettres, limites d’échauffement).',
  },
  { id: 'iec60076-7', titre: 'IEC 60076-7', detail: 'Guide de charge pour transformateurs immergés (point chaud, vieillissement de l’isolation).' },
  { id: 'iec60076-11', titre: 'IEC 60076-11', detail: 'Transformateurs de type sec (modes AN/AF, classes d’environnement, climatiques et de comportement au feu).' },
  { id: 'iec60076-14', titre: 'IEC 60076-14', detail: 'Transformateurs immergés utilisant des matériaux isolants haute température.' },
  { id: 'ieee-c57-12-00', titre: 'IEEE C57.12.00', detail: 'Exigences générales pour transformateurs immergés (désignations de refroidissement alignées sur l’IEC).' },
  { id: 'ieee-c57-91', titre: 'IEEE C57.91', detail: 'Guide de charge des transformateurs immergés dans l’huile minérale.' },
  { id: 'jp', titre: 'M. J. Heathcote, J&P Transformer Book', detail: '13ᵉ édition, Newnes / Elsevier, 2007.' },
  { id: 'kulkarni', titre: 'S. V. Kulkarni, S. A. Khaparde, Transformer Engineering', detail: 'Design, Technology, and Diagnostics, 2ᵉ édition, CRC Press, 2012.' },
  { id: 'abb', titre: 'ABB, Transformer Handbook', detail: 'ABB Power Technologies, 2004.' },
  { id: 'schneider', titre: 'Schneider Electric, Guide de l’installation électrique', detail: 'Chapitres sur les postes de livraison HTA/BT et le choix des transformateurs.' },
]

export const refTitle = (id: string) => REFERENCES.find((r) => r.id === id)?.titre ?? id

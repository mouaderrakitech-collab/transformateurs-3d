/**
 * État d'animation mutable, lu à chaque image (évite de re-rendre React 60 fois par seconde).
 */
export const anim = {
  /** Temps de l'animation de refroidissement (s), avance seulement en lecture. */
  t: 0,
  /** Facteur de vue éclatée, 0 → 1 (interpolé). */
  explode: 0,
  /** Échauffement visuel des enroulements, 0 → 1. */
  heat: 0,
  /** Angle cumulé des ventilateurs. */
  fanAngle: 0,
  /** Vrai lorsque le refroidissement est affiché et en lecture. */
  running: false,
  /** Rendu à la demande : horodatage jusqu'auquel le rendu reste actif après un changement. */
  wakeUntil: 0,
}

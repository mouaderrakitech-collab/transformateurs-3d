import * as THREE from 'three'

/** Vrai quand la page tourne comme moteur de rendu distant (navigateur GPU sur RunPod). */
export const IS_RENDERER = new URLSearchParams(location.search).has('renderer')

/** Registre des étiquettes, projetées à l'écran par le moteur distant puis dessinées en DOM côté client. */
export const labelRegistry = new Map<string, { name: string; obj: THREE.Object3D; local: THREE.Vector3 }>()

import * as THREE from 'three'

/**
 * Matériaux PBR partagés.
 * - Textures procédurales générées une seule fois (aucun fichier à télécharger → fonctionnement hors ligne).
 * - Patch de shader : en mode coupe, les faces arrière visibles à travers le plan de coupe
 *   sont remplies d'une couleur hachurée, ce qui donne l'aspect d'une section pleine.
 */

export const sectionUniform = { value: 0 }

// ───────────────────────── Textures procédurales
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat = 1) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  draw(ctx, size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 4
  return t
}

function noise(ctx: CanvasRenderingContext2D, s: number, base: number, amp: number) {
  const img = ctx.createImageData(s, s)
  for (let i = 0; i < s * s; i++) {
    const v = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * amp))
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
}

let _tex: Record<string, THREE.Texture> | null = null
function textures() {
  if (_tex) return _tex
  _tex = {
    // Rugosité légèrement irrégulière de la peinture
    paintRough: canvasTexture(128, (ctx, s) => noise(ctx, s, 150, 40), 3),
    // Feuilletage des tôles du circuit magnétique
    lamination: canvasTexture(256, (ctx, s) => {
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, s, s)
      for (let y = 0; y < s; y += 2) {
        const v = 100 + Math.random() * 80
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.fillRect(0, y, s, 1)
      }
    }, 2),
    // Brossage du cuivre
    brushed: canvasTexture(128, (ctx, s) => {
      noise(ctx, s, 110, 30)
      ctx.globalAlpha = 0.25
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'
        ctx.fillRect(0, Math.random() * s, s, 1)
      }
    }, 2),
    // Papier crêpé des conducteurs
    paper: canvasTexture(128, (ctx, s) => {
      noise(ctx, s, 170, 50)
      ctx.globalAlpha = 0.2
      for (let i = 0; i < s; i += 4) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, i, s, 1)
      }
    }, 4),
  }
  return _tex
}

// ───────────────────────── Patch « coupe »
function patchSection<T extends THREE.MeshStandardMaterial>(m: T, cut: string): T {
  m.side = THREE.DoubleSide
  // écrite après la conversion de couleur du shader : exprimer la couleur en espace d’affichage (sRGB)
  const cutColor = new THREE.Color(cut).convertLinearToSRGB()
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSection = sectionUniform
    shader.uniforms.uCutColor = { value: cutColor }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSection;\nuniform vec3 uCutColor;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uSection > 0.5 && !gl_FrontFacing) {
          float h = step(0.55, fract((gl_FragCoord.x + gl_FragCoord.y) / 9.0));
          gl_FragColor = vec4(uCutColor * (0.78 + 0.22 * h), 1.0);
        }`,
      )
  }
  m.customProgramCacheKey = () => 'section-' + cut
  return m
}

// ───────────────────────── Bibliothèque
export interface MaterialLib {
  paint: THREE.MeshStandardMaterial // acier peint gris clair (type RAL 7033/7035)
  paintDark: THREE.MeshStandardMaterial
  galva: THREE.MeshStandardMaterial // acier galvanisé (radiateurs)
  steel: THREE.MeshStandardMaterial // acier brut / boulonnerie
  core: THREE.MeshStandardMaterial // tôles magnétiques
  copper: THREE.MeshStandardMaterial
  copperLV: THREE.MeshStandardMaterial
  paperWinding: THREE.MeshStandardMaterial // galettes isolées papier
  pressboard: THREE.MeshStandardMaterial
  resin: THREE.MeshPhysicalMaterial // bobine HT enrobée (sec)
  foil: THREE.MeshStandardMaterial // enroulement BT feuillard (sec)
  porcelain: THREE.MeshPhysicalMaterial
  porcelainGrey: THREE.MeshPhysicalMaterial
  aluminium: THREE.MeshStandardMaterial
  brass: THREE.MeshStandardMaterial
  rubber: THREE.MeshStandardMaterial
  blue: THREE.MeshStandardMaterial // tuyauteries d'eau
  fanBlade: THREE.MeshStandardMaterial
  orange: THREE.MeshStandardMaterial // silicagel / cales
  glass: THREE.MeshPhysicalMaterial
  cabinet: THREE.MeshStandardMaterial
  motor: THREE.MeshStandardMaterial
  yellow: THREE.MeshStandardMaterial
  // non patchés
  oil: THREE.MeshPhysicalMaterial
  ghost: THREE.MeshStandardMaterial
  ground: THREE.MeshStandardMaterial
}

let _lib: MaterialLib | null = null

export function mats(): MaterialLib {
  if (_lib) return _lib
  const t = textures()
  const std = (p: THREE.MeshStandardMaterialParameters, cut: string) =>
    patchSection(new THREE.MeshStandardMaterial(p), cut)
  const phys = (p: THREE.MeshPhysicalMaterialParameters, cut: string) =>
    patchSection(new THREE.MeshPhysicalMaterial(p), cut)

  _lib = {
    paint: std({ color: '#8d969c', roughness: 0.55, metalness: 0.15, roughnessMap: t.paintRough }, '#5d666c'),
    paintDark: std({ color: '#4d575f', roughness: 0.5, metalness: 0.2, roughnessMap: t.paintRough }, '#353d44'),
    galva: std({ color: '#b9c0c6', roughness: 0.42, metalness: 0.85, roughnessMap: t.paintRough }, '#7d858b'),
    steel: std({ color: '#9aa1a8', roughness: 0.35, metalness: 0.9 }, '#6a7178'),
    core: std(
      { color: '#8a9097', roughness: 0.42, metalness: 0.55, roughnessMap: t.lamination },
      '#8c949c',
    ),
    copper: std({ color: '#c47a45', roughness: 0.3, metalness: 1, roughnessMap: t.brushed, emissive: '#ff2200', emissiveIntensity: 0 }, '#e07b3c'),
    copperLV: std({ color: '#b5703f', roughness: 0.34, metalness: 1, roughnessMap: t.brushed, emissive: '#ff2200', emissiveIntensity: 0 }, '#e07b3c'),
    paperWinding: std(
      { color: '#a8733f', roughness: 0.75, metalness: 0.05, roughnessMap: t.paper, bumpMap: t.paper, bumpScale: 0.3, emissive: '#ff2200', emissiveIntensity: 0 },
      '#d98a4e',
    ),
    pressboard: std({ color: '#c8a26a', roughness: 0.85, metalness: 0 }, '#9c7a48'),
    resin: phys({ color: '#3f4c58', roughness: 0.28, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, emissive: '#ff2200', emissiveIntensity: 0 }, '#c46a3c'),
    foil: std({ color: '#7b5a3c', roughness: 0.6, metalness: 0.4, emissive: '#ff2200', emissiveIntensity: 0 }, '#d98a4e'),
    porcelain: phys({ color: '#6e3b28', roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 }, '#e8e2d8'),
    porcelainGrey: phys({ color: '#a3aaae', roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 }, '#e8e2d8'),
    aluminium: std({ color: '#cfd4d8', roughness: 0.3, metalness: 0.95 }, '#9aa1a8'),
    brass: std({ color: '#c9a440', roughness: 0.3, metalness: 1 }, '#8f7429'),
    rubber: std({ color: '#1d1f22', roughness: 0.9, metalness: 0 }, '#111'),
    blue: std({ color: '#2b6aa3', roughness: 0.5, metalness: 0.2 }, '#1d4b75'),
    fanBlade: std({ color: '#6f7a82', roughness: 0.4, metalness: 0.6 }, '#4a535a'),
    orange: std({ color: '#d4661f', roughness: 0.6, metalness: 0 }, '#9a4a16'),
    glass: phys({ color: '#d8eef7', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }, '#9fc3d3'),
    cabinet: std({ color: '#a6aeb3', roughness: 0.5, metalness: 0.2, roughnessMap: t.paintRough }, '#6d757a'),
    motor: std({ color: '#3d5a73', roughness: 0.45, metalness: 0.3 }, '#283c4d'),
    yellow: std({ color: '#d8b11c', roughness: 0.5, metalness: 0.1 }, '#987c12'),

    oil: new THREE.MeshPhysicalMaterial({
      color: '#d9a43a',
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    ghost: new THREE.MeshStandardMaterial({
      color: '#9fb4c4',
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    ground: new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: 0.95, metalness: 0 }),
  }
  return _lib
}

/** Matériaux qui rougeoient lors de la visualisation de l'échauffement. */
export function heatMaterials(): [THREE.MeshStandardMaterial, number][] {
  const m = mats()
  // intensité maximale par matériau : lueur discrète, la couleur de base reste lisible
  return [[m.copper, 0.18], [m.copperLV, 0.18], [m.paperWinding, 0.3], [m.resin, 0.14], [m.foil, 0.2]]
}

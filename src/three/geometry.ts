import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Générateurs de géométries paramétriques (dimensions en mètres, échelle approximative).
 * Toutes les géométries sont mises en cache : un même composant répété (éléments de radiateur,
 * ailettes, pales...) partage la même géométrie en mémoire GPU.
 */

const cache = new Map<string, THREE.BufferGeometry>()
export function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined
  if (!g) {
    g = make()
    cache.set(key, g)
  }
  return g
}

/** Facteur de finesse global (fixé selon le niveau de qualité). */
export let DETAIL = 1
export function setDetail(d: number) {
  if (d !== DETAIL) {
    DETAIL = d
    cache.forEach((g) => g.dispose())
    cache.clear()
  }
}
export const seg = (n: number) => Math.max(8, Math.round(n * DETAIL))

/** Ne garde que position / normal / uv pour permettre la fusion de géométries hétérogènes. */
function clean(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g
  for (const name of Object.keys(out.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') out.deleteAttribute(name)
  }
  return out
}
export function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map(clean), false)!
  g.computeBoundingSphere()
  return g
}

/**
 * Section en gradins d'une colonne de circuit magnétique : réunion de paquets de tôles
 * de largeurs décroissantes, inscrits dans un cercle de diamètre D.
 * axis 'y' = colonne verticale, 'x' = culasse horizontale.
 */
export function steppedCore(D: number, length: number, axis: 'x' | 'y', steps = 5) {
  return cached(`core-${D}-${length}-${axis}-${steps}`, () => {
    // Contour en gradins symétrique : un seul solide fermé, sans faces internes (coupe propre).
    const ws: number[] = []
    const ds: number[] = []
    for (let i = 0; i < steps; i++) {
      const th = ((i + 0.5) / steps) * (Math.PI / 2) * 0.86 + 0.1
      ws.push((D * Math.cos(th)) / 2) // demi-largeur du paquet i (décroissante)
      ds.push((D * Math.sin(th)) / 2) // demi-épaisseur d'empilage (croissante)
    }
    // Premier quadrant, du paquet le plus large au plus étroit
    const q1: [number, number][] = []
    for (let i = 0; i < steps; i++) {
      q1.push([ws[i], i === 0 ? 0 : ds[i - 1]])
      q1.push([ws[i], ds[i]])
    }
    const rev = [...q1].reverse()
    const outline: [number, number][] = [
      ...q1,
      ...rev.map(([u, v]) => [-u, v] as [number, number]),
      ...q1.slice(1).map(([u, v]) => [-u, -v] as [number, number]),
      ...rev.slice(0, -1).map(([u, v]) => [u, -v] as [number, number]),
    ]
    const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)))
    const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 1 })
    g.translate(0, 0, -length / 2)
    // Plan du contour : x = largeur, y = empilage ; extrusion selon z.
    g.rotateX(-Math.PI / 2) // → largeur x, longueur y, empilage z (colonne)
    if (axis === 'x') g.rotateZ(Math.PI / 2) // → longueur x, largeur y, empilage z (culasse)
    g.computeVertexNormals()
    return g
  })
}

/**
 * Enroulement concentrique (solide de révolution fermé). Les galettes sont représentées
 * par des rainures sur la face extérieure (canaux radiaux entre galettes).
 */
export function windingGeometry(rIn: number, rOut: number, h: number, discs: number, groove = 0.25) {
  return cached(`wind-${rIn}-${rOut}-${h}-${discs}-${groove}-${DETAIL}`, () => {
    const pts: THREE.Vector2[] = []
    const y0 = -h / 2
    pts.push(new THREE.Vector2(rIn, y0))
    if (discs > 1) {
      const pitch = h / discs
      const gap = pitch * groove
      const depth = Math.min((rOut - rIn) * 0.18, 0.02)
      pts.push(new THREE.Vector2(rOut, y0))
      for (let i = 0; i < discs; i++) {
        const top = y0 + (i + 1) * pitch
        if (i < discs - 1) {
          pts.push(new THREE.Vector2(rOut, top - gap))
          pts.push(new THREE.Vector2(rOut - depth, top - gap))
          pts.push(new THREE.Vector2(rOut - depth, top))
          pts.push(new THREE.Vector2(rOut, top))
        } else {
          pts.push(new THREE.Vector2(rOut, top))
        }
      }
    } else {
      pts.push(new THREE.Vector2(rOut, y0))
      pts.push(new THREE.Vector2(rOut, -y0))
    }
    pts.push(new THREE.Vector2(rIn, -y0))
    pts.push(new THREE.Vector2(rIn, y0))
    // Profil parcouru de bas en haut sur la face extérieure : normales vers l'extérieur.
    const g = new THREE.LatheGeometry(pts, seg(56))
    g.computeVertexNormals()
    return g
  })
}

/** Tube fermé (cylindre creux) : cylindres isolants, rondelles. */
export function tubeGeometry(rIn: number, rOut: number, h: number) {
  return cached(`tube-${rIn}-${rOut}-${h}-${DETAIL}`, () => {
    const pts = [
      new THREE.Vector2(rIn, -h / 2),
      new THREE.Vector2(rOut, -h / 2),
      new THREE.Vector2(rOut, h / 2),
      new THREE.Vector2(rIn, h / 2),
      new THREE.Vector2(rIn, -h / 2),
    ]
    return new THREE.LatheGeometry(pts, seg(48))
  })
}

/**
 * Profil d'isolateur de traversée : alternance d'ailettes grandes et petites.
 * Retourne une géométrie de révolution, base en y = 0.
 */
export function bushingGeometry(height: number, rCore: number, rShed: number, sheds: number) {
  return cached(`bush-${height}-${rCore}-${rShed}-${sheds}-${DETAIL}`, () => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(rCore * 1.25, 0)]
    const pitch = height / (sheds + 0.5)
    for (let i = 0; i < sheds; i++) {
      const y = pitch * (i + 0.35)
      const r = i % 2 === 0 ? rShed : rShed * 0.8
      // pente supérieure longue, sous-face courte (écoulement de l'eau de pluie)
      pts.push(new THREE.Vector2(rCore, y))
      pts.push(new THREE.Vector2(r, y + pitch * 0.18))
      pts.push(new THREE.Vector2(r * 0.98, y + pitch * 0.26))
      pts.push(new THREE.Vector2(rCore, y + pitch * 0.62))
    }
    pts.push(new THREE.Vector2(rCore * 0.95, height))
    pts.push(new THREE.Vector2(0, height))
    return new THREE.LatheGeometry(pts, seg(32))
  })
}

/**
 * Élément de radiateur embouti : plaque mince à canaux verticaux et bourrelets haut/bas.
 * Plan de l'élément : XY (largeur x, hauteur y), épaisseur selon z.
 */
export function radiatorPanel(width: number, height: number, thick: number) {
  return cached(`rad-${width}-${height}-${thick}-${DETAIL}`, () => {
    const parts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(width, height, thick * 0.35)]
    const channels = 8
    for (let i = 0; i < channels; i++) {
      const x = -width / 2 + (width / channels) * (i + 0.5)
      const c = new THREE.CylinderGeometry(thick / 2, thick / 2, height * 0.94, 8)
      c.scale(1.6, 1, 1)
      c.translate(x, 0, 0)
      parts.push(c)
    }
    for (const y of [height / 2 - thick * 0.6, -height / 2 + thick * 0.6]) {
      const c = new THREE.CylinderGeometry(thick * 0.62, thick * 0.62, width * 0.98, 10)
      c.rotateZ(Math.PI / 2)
      c.translate(0, y, 0)
      parts.push(c)
    }
    return merge(parts)
  })
}

/**
 * Paroi ondulée (ailettes de cuve hermétique) : ailettes creuses perpendiculaires à la paroi.
 * Paroi dans le plan XY, ailettes vers +z.
 */
export function finWall(length: number, height: number, depth: number, pitch: number) {
  return cached(`fins-${length}-${height}-${depth}-${pitch}`, () => {
    const parts: THREE.BufferGeometry[] = []
    const n = Math.floor(length / pitch)
    const t = pitch * 0.32
    for (let i = 0; i < n; i++) {
      const x = -length / 2 + pitch * (i + 0.5)
      const b = new THREE.BoxGeometry(t, height, depth)
      b.translate(x, 0, depth / 2)
      parts.push(b)
      // nez arrondi de l'ailette
      const c = new THREE.CylinderGeometry(t / 2, t / 2, height, 6)
      c.translate(x, 0, depth)
      parts.push(c)
    }
    const base = new THREE.BoxGeometry(length, height, 0.01)
    parts.push(base)
    return merge(parts)
  })
}

/** Pale de ventilateur hélicoïde (forme extrudée vrillée). */
export function fanBlade(radius: number) {
  return cached(`blade-${radius}`, () => {
    const s = new THREE.Shape()
    const r0 = radius * 0.22
    s.moveTo(r0, -radius * 0.06)
    s.quadraticCurveTo(radius * 0.7, -radius * 0.22, radius, -radius * 0.12)
    s.quadraticCurveTo(radius * 1.02, radius * 0.08, radius * 0.92, radius * 0.16)
    s.quadraticCurveTo(radius * 0.55, radius * 0.14, r0, radius * 0.07)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: radius * 0.012, bevelEnabled: false })
    // vrillage : rotation progressive autour de l'axe radial
    const p = g.attributes.position as THREE.BufferAttribute
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const a = 0.55 - (v.x / radius) * 0.3
      const y = v.y * Math.cos(a) - v.z * Math.sin(a)
      const z = v.y * Math.sin(a) + v.z * Math.cos(a)
      p.setXYZ(i, v.x, y, z)
    }
    g.computeVertexNormals()
    return g
  })
}

/** Tuyauterie suivant une polyligne, coudes arrondis. */
export function pipeGeometry(points: [number, number, number][], radius: number, bend = 0.12) {
  return cached(`pipe-${JSON.stringify(points)}-${radius}-${DETAIL}`, () => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    const v = points.map((p) => new THREE.Vector3(...p))
    let start = v[0].clone()
    for (let i = 1; i < v.length; i++) {
      const cur = v[i]
      if (i < v.length - 1) {
        const next = v[i + 1]
        const dIn = cur.clone().sub(v[i - 1])
        const dOut = next.clone().sub(cur)
        const r = Math.min(bend, dIn.length() / 2, dOut.length() / 2)
        const a = cur.clone().sub(dIn.normalize().multiplyScalar(r))
        const b = cur.clone().add(dOut.normalize().multiplyScalar(r))
        path.add(new THREE.LineCurve3(start, a))
        path.add(new THREE.QuadraticBezierCurve3(a, cur.clone(), b))
        start = b
      } else {
        path.add(new THREE.LineCurve3(start, cur.clone()))
      }
    }
    return new THREE.TubeGeometry(path, seg(16) * v.length, radius, seg(14), false)
  })
}

/** Cylindre orienté entre deux points (tirants, barres). */
export function orientBetween(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a)
  obj.position.copy(a).add(b).multiplyScalar(0.5)
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
}

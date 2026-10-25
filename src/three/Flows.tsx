import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FlowPath, Fluid } from '../types'
import { anim } from './anim'
import { useApp } from '../store'

/**
 * Visualisation pédagogique des circulations (pas une simulation thermique) :
 * particules instanciées le long de trajectoires, couleur = température relative.
 * Huile = sphères, air = petites particules translucides, eau = octaèdres.
 */

/** Rampe de couleur commune à tous les fluides : bleu (froid) → rouge (chaud). */
export function tempColor(t: number, out = new THREE.Color()) {
  const c = Math.max(0, Math.min(1, t))
  return out.setHSL(0.64 * (1 - c), 0.95, 0.5 + 0.06 * Math.sin(c * Math.PI))
}

interface Sampled {
  pos: Float32Array // n*3
  tmp: Float32Array // n
  length: number
  speed: number
  count: number
  fluid: Fluid
}

const SAMPLES = 160

function sample(p: FlowPath): Sampled {
  const pts = p.points.map((v) => new THREE.Vector3(...v))
  const curve = new THREE.CatmullRomCurve3(pts, !!p.closed, 'centripetal', 0.3)
  const length = curve.getLength()
  // température : interpolation sur l'abscisse curviligne des points de contrôle
  const n = pts.length
  const pos = new Float32Array(SAMPLES * 3)
  const tmp = new Float32Array(SAMPLES)
  const v = new THREE.Vector3()
  // longueurs cumulées approximatives des points de contrôle
  const cum: number[] = [0]
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]))
  const total = cum[n - 1] + (p.closed ? pts[0].distanceTo(pts[n - 1]) : 0)
  // L'air réchauffé est représenté plus « chaud » pour rester lisible (échelle relative par fluide).
  const base = p.fluid === 'air' ? p.temps.map((t) => Math.min(1, t * 1.35)) : p.temps
  const temps = p.closed ? [...base, base[0]] : base
  const cumC = p.closed ? [...cum, total] : cum
  for (let s = 0; s < SAMPLES; s++) {
    const u = s / (p.closed ? SAMPLES : SAMPLES - 1)
    curve.getPointAt(u, v)
    pos.set([v.x, v.y, v.z], s * 3)
    const d = u * total
    let k = 0
    while (k < cumC.length - 2 && cumC[k + 1] < d) k++
    const f = (d - cumC[k]) / Math.max(1e-6, cumC[k + 1] - cumC[k])
    tmp[s] = temps[k] + (temps[k + 1] - temps[k]) * Math.max(0, Math.min(1, f))
  }
  return { pos, tmp, length, speed: p.speed, count: p.count, fluid: p.fluid }
}

const GEOS: Record<Fluid, () => THREE.BufferGeometry> = {
  huile: () => new THREE.SphereGeometry(1, 10, 8),
  air: () => new THREE.SphereGeometry(1, 6, 4),
  eau: () => new THREE.OctahedronGeometry(1.15),
}

export function Flows({ paths, size, density }: { paths: FlowPath[]; size: number; density: number }) {
  const visible = useApp((s) => s.layers.flux)
  const sampled = useMemo(() => paths.map(sample), [paths])
  const byFluid = useMemo(() => {
    const out: Record<Fluid, { path: Sampled; offset: number; spawn: number }[]> = { huile: [], air: [], eau: [] }
    let seed = 1
    for (const s of sampled) {
      const n = Math.max(1, Math.round(s.count * density))
      for (let i = 0; i < n; i++) {
        seed = (seed * 16807) % 2147483647
        out[s.fluid].push({ path: s, offset: i / n + (seed / 2147483647) * (0.5 / n), spawn: 0.8 + (seed % 1000) / 400 })
      }
    }
    return out
  }, [sampled, density])

  return (
    <group visible={visible}>
      {(Object.keys(byFluid) as Fluid[]).map((f) =>
        byFluid[f].length ? <FluidParticles key={f} fluid={f} items={byFluid[f]} size={size} /> : null,
      )}
      <Arrows paths={sampled} size={size} />
    </group>
  )
}

function FluidParticles({ fluid, items, size }: { fluid: Fluid; items: { path: Sampled; offset: number; spawn: number }[]; size: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const geo = useMemo(() => GEOS[fluid](), [fluid])
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        transparent: fluid === 'air',
        opacity: fluid === 'air' ? 0.75 : 1,
        depthWrite: fluid !== 'air',
      }),
    [fluid],
  )
  const scale = fluid === 'huile' ? size : fluid === 'eau' ? size * 1.0 : size * 0.7
  const o = useMemo(() => new THREE.Object3D(), [])
  const c = useMemo(() => new THREE.Color(), [])

  useLayoutEffect(() => {
    // couleurs initiales (requis pour créer l'attribut instanceColor)
    for (let i = 0; i < items.length; i++) ref.current.setColorAt(i, c.set('#ffffff'))
    ref.current.instanceColor!.needsUpdate = true
  }, [items, c])

  useEffect3Dispose(geo, mat)

  useFrame(() => {
    const mesh = ref.current
    const t = anim.t
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const p = it.path
      const age = t - it.spawn
      if (age <= 0) {
        o.scale.setScalar(0)
      } else {
        let u = (it.offset + (age * p.speed) / p.length) % 1
        if (u < 0) u += 1
        const fi = u * (SAMPLES - 1)
        const k = Math.floor(fi)
        const f = fi - k
        const k2 = Math.min(SAMPLES - 1, k + 1)
        o.position.set(
          p.pos[k * 3] + (p.pos[k2 * 3] - p.pos[k * 3]) * f,
          p.pos[k * 3 + 1] + (p.pos[k2 * 3 + 1] - p.pos[k * 3 + 1]) * f,
          p.pos[k * 3 + 2] + (p.pos[k2 * 3 + 2] - p.pos[k * 3 + 2]) * f,
        )
        // apparition progressive
        o.scale.setScalar(scale * Math.min(1, age * 2))
        tempColor(p.tmp[k], c)
        mesh.setColorAt(i, c)
      }
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, items.length]} frustumCulled={false} renderOrder={5} />
}

/** Flèches fixes indiquant le sens de circulation (lisibles même animation en pause). */
function Arrows({ paths, size }: { paths: Sampled[]; size: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const per = 3
  const count = paths.length * per
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 2.6, 10)
    g.rotateX(Math.PI / 2) // pointe selon +z
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.85 }), [])
  useEffect3Dispose(geo, mat)
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    let i = 0
    for (const p of paths) {
      for (let k = 0; k < per; k++) {
        const s = Math.floor(((k + 0.5) / per) * (SAMPLES - 2))
        const a = new THREE.Vector3(p.pos[s * 3], p.pos[s * 3 + 1], p.pos[s * 3 + 2])
        const b = new THREE.Vector3(p.pos[s * 3 + 3], p.pos[s * 3 + 4], p.pos[s * 3 + 5])
        o.position.copy(a)
        o.lookAt(b)
        o.scale.setScalar(size * (p.fluid === 'air' ? 0.9 : 1.25))
        o.updateMatrix()
        ref.current.setMatrixAt(i, o.matrix)
        ref.current.setColorAt(i, tempColor(p.tmp[s], c))
        i++
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [paths, size])
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} renderOrder={5} />
}

function useEffect3Dispose(geo: THREE.BufferGeometry, mat: THREE.Material) {
  useEffect(() => () => {
    geo.dispose()
    mat.dispose()
  }, [geo, mat])
}

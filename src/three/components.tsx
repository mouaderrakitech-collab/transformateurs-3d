import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mats, type MaterialLib } from './materials'
import {
  bushingGeometry,
  cached,
  fanBlade,
  merge,
  pipeGeometry,
  radiatorPanel,
  seg,
  steppedCore,
  tubeGeometry,
  windingGeometry,
} from './geometry'
import { anim } from './anim'
import { Part } from './Part'

type V3 = [number, number, number]
type MatKey = keyof MaterialLib

// ════════════════════════════════════════════ Partie active triphasée (circuit à colonnes)

export interface ActivePartProps {
  limbs: number[] // abscisses des colonnes
  D: number // diamètre circonscrit des colonnes
  windowH: number // hauteur de fenêtre
  y0: number // bas de la culasse inférieure
  lv: [number, number] // rayons BT
  hv: [number, number] // rayons HT
  lvDiscs: number
  hvDiscs: number
  hvMat?: MatKey
  lvMat?: MatKey
  directed?: boolean
  dry?: boolean
  explodeScale?: number
}

export function activeGeometryInfo(p: ActivePartProps) {
  const yokeH = p.D * 0.95
  const wh = p.windowH * 0.9
  const yc = p.y0 + yokeH + p.windowH / 2 // centre des enroulements
  return { yokeH, wh, yc, top: p.y0 + 2 * yokeH + p.windowH }
}

export function ActivePart(p: ActivePartProps) {
  const m = mats()
  const { yokeH, wh, yc } = activeGeometryInfo(p)
  const span = p.limbs[p.limbs.length - 1] - p.limbs[0]
  const yokeLen = span + p.D
  const xMid = (p.limbs[0] + p.limbs[p.limbs.length - 1]) / 2
  const e = p.explodeScale ?? 1
  const limbGeo = steppedCore(p.D, p.windowH + 0.002, 'y')
  const yokeGeo = steppedCore(p.D, yokeLen, 'x')
  const lvGeo = windingGeometry(p.lv[0], p.lv[1], wh, p.lvDiscs, 0.12)
  const hvGeo = windingGeometry(p.hv[0], p.hv[1], wh, p.hvDiscs, 0.3)
  const gap = (p.hv[0] - p.lv[1]) / 2
  const insGeo1 = tubeGeometry(p.D / 2 + 0.004, p.lv[0] - 0.006, wh * 1.04)
  const insGeo2 = tubeGeometry(p.lv[1] + gap * 0.7, p.lv[1] + gap * 1.0, wh * 1.06)
  const ringGeo = tubeGeometry(p.D / 2 + 0.004, p.hv[1] + 0.01, wh * 0.035)
  const clampDepth = p.D * 0.12
  const clampZ = p.D / 2 + clampDepth / 2 + 0.01

  return (
    <group>
      {/* Circuit magnétique */}
      <Part id="noyau" layer="partieActive" explode={[0, 0, 0]} label={[xMid, p.y0 + yokeH + p.windowH + yokeH * 1.4, 0]}>
        {p.limbs.map((x) => (
          <mesh key={x} geometry={limbGeo} material={m.core} position={[x, p.y0 + yokeH + p.windowH / 2, 0]} />
        ))}
        <mesh geometry={yokeGeo} material={m.core} position={[xMid, p.y0 + yokeH / 2, 0]} />
        <CoreTopYoke geo={yokeGeo} pos={[xMid, p.y0 + yokeH * 1.5 + p.windowH, 0]} lift={0.9 * e} />
      </Part>

      {/* Enroulements BT */}
      <Part id="enroulementBT" layer="partieActive" explode={[0, 0.55 * e, 0]} label={[p.limbs[0], yc, p.lv[1]]}>
        {p.limbs.map((x) => (
          <mesh key={x} geometry={lvGeo} material={m[p.lvMat ?? 'copperLV']} position={[x, yc, 0]} />
        ))}
      </Part>

      {/* Enroulements HT */}
      <Part id={p.dry ? 'enroulementHTResine' : 'enroulementHT'} layer="partieActive" explode={[0, 1.15 * e, 0.35 * e]} label={[p.limbs[p.limbs.length - 1], yc + wh * 0.3, p.hv[1]]}>
        {p.limbs.map((x) => (
          <mesh key={x} geometry={hvGeo} material={m[p.hvMat ?? 'paperWinding']} position={[x, yc, 0]} />
        ))}
      </Part>

      {/* Isolation solide */}
      {!p.dry && (
        <Part id="isolation" layer="partieActive" explode={[0, 0.3 * e, 0]} label={[p.limbs[1] ?? p.limbs[0], yc + wh * 0.56, 0]}>
          {p.limbs.map((x) => (
            <group key={x} position={[x, yc, 0]}>
              <mesh geometry={insGeo1} material={m.pressboard} />
              <mesh geometry={insGeo2} material={m.pressboard} />
              <mesh geometry={ringGeo} material={m.pressboard} position={[0, wh / 2 + wh * 0.03, 0]} />
              <mesh geometry={ringGeo} material={m.pressboard} position={[0, -wh / 2 - wh * 0.03, 0]} />
            </group>
          ))}
        </Part>
      )}

      {/* Rondelles de guidage (circulation dirigée) */}
      {p.directed && (
        <Part id="rondelles" layer="refroidissement" explode={[0, 1.15 * e, 0.35 * e]} label={[p.limbs[0], yc - wh * 0.2, p.hv[1] + 0.05]}>
          {p.limbs.map((x) => (
            <group key={x} position={[x, yc, 0]}>
              {Array.from({ length: 5 }, (_, i) => {
                const y = -wh / 2 + (wh / 6) * (i + 1)
                const outer = i % 2 === 0
                const g = outer
                  ? tubeGeometry(p.hv[0] + (p.hv[1] - p.hv[0]) * 0.25, p.hv[1] + 0.025, 0.012)
                  : tubeGeometry(p.hv[0] - 0.02, p.hv[1] - (p.hv[1] - p.hv[0]) * 0.25, 0.012)
                return <mesh key={i} geometry={g} material={m.yellow} position={[0, y, 0]} />
              })}
            </group>
          ))}
        </Part>
      )}

      {/* Armatures de serrage */}
      <Part id="serrage" layer="partieActive" explode={[0, 0, 0.6 * e]} label={[p.limbs[0] - p.D * 0.6, p.y0 + yokeH / 2, clampZ + 0.05]}>
        {[p.y0 + yokeH / 2, p.y0 + yokeH * 1.5 + p.windowH].map((y, j) => (
          <group key={y} position={[0, j === 1 ? 0 : 0, 0]}>
            {[1, -1].map((s) => (
              <mesh key={s} position={[xMid, y, s * clampZ]} material={p.dry ? m.paintDark : m.paint}>
                <boxGeometry args={[yokeLen + 0.12, yokeH * 0.92, clampDepth]} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Tirants verticaux */}
        {[p.limbs[0] - p.D * 0.62, p.limbs[p.limbs.length - 1] + p.D * 0.62].map((x) =>
          [1, -1].map((s) => (
            <mesh key={`${x}${s}`} position={[x, p.y0 + yokeH + p.windowH / 2, s * clampZ]} material={m.steel}>
              <cylinderGeometry args={[0.012, 0.012, p.windowH + yokeH * 1.6, 10]} />
            </mesh>
          )),
        )}
      </Part>
    </group>
  )
}

/** Culasse supérieure : retirée en vue éclatée pour libérer les enroulements. */
function CoreTopYoke({ geo, pos, lift }: { geo: THREE.BufferGeometry; pos: V3; lift: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(() => {
    ref.current.position.set(pos[0], pos[1] + lift * 1.6 * anim.explode, pos[2])
  })
  return <mesh ref={ref} geometry={geo} material={mats().core} position={pos} />
}

// ════════════════════════════════════════════ Traversée

export interface BushingProps {
  position: V3
  height: number
  rCore: number
  rShed: number
  sheds: number
  mat?: 'porcelain' | 'porcelainGrey'
  dome?: boolean
  tilt?: [number, number, number]
}

export function Bushing({ position, height, rCore, rShed, sheds, mat = 'porcelain', dome, tilt }: BushingProps) {
  const m = mats()
  const geo = bushingGeometry(height, rCore, rShed, sheds)
  const flangeH = Math.max(0.02, height * 0.06)
  return (
    <group position={position} rotation={tilt ?? [0, 0, 0]}>
      <mesh material={m.paint} position={[0, flangeH / 2, 0]}>
        <cylinderGeometry args={[rShed * 1.05, rShed * 1.1, flangeH, seg(24)]} />
      </mesh>
      <mesh geometry={geo} material={m[mat]} position={[0, flangeH, 0]} />
      {dome && (
        <mesh material={m.aluminium} position={[0, flangeH + height + rCore * 0.6, 0]}>
          <cylinderGeometry args={[rCore * 1.3, rCore * 1.4, rCore * 1.2, seg(20)]} />
        </mesh>
      )}
      <mesh material={m.brass} position={[0, flangeH + height + (dome ? rCore * 1.4 : 0) + rCore * 0.5, 0]}>
        <cylinderGeometry args={[rCore * 0.35, rCore * 0.35, rCore * 1.2, 12]} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════ Tuyauterie, vannes

export function Pipe({ points, radius, mat = 'paint', flanges = true }: { points: V3[]; radius: number; mat?: MatKey; flanges?: boolean }) {
  const m = mats()
  const geo = pipeGeometry(points, radius, radius * 2.5)
  const fl = useMemo(() => {
    if (!flanges) return []
    const a = new THREE.Vector3(...points[0])
    const a2 = new THREE.Vector3(...points[1])
    const b = new THREE.Vector3(...points[points.length - 1])
    const b2 = new THREE.Vector3(...points[points.length - 2])
    return [
      { p: a.clone().lerp(a2, Math.min(0.5, (radius * 1.2) / a.distanceTo(a2))), d: a2.clone().sub(a).normalize() },
      { p: b.clone().lerp(b2, Math.min(0.5, (radius * 1.2) / b.distanceTo(b2))), d: b2.clone().sub(b).normalize() },
    ]
  }, [points, radius, flanges])
  return (
    <group>
      <mesh geometry={geo} material={m[mat]} />
      {fl.map((f, i) => (
        <mesh
          key={i}
          material={m[mat]}
          position={f.p}
          quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.d)}
        >
          <cylinderGeometry args={[radius * 1.6, radius * 1.6, radius * 0.5, seg(20)]} />
        </mesh>
      ))}
    </group>
  )
}

/** Vanne papillon : corps + volant de manœuvre, axe de tuyauterie selon `axis`. */
export function Valve({ position, radius, axis = 'z' }: { position: V3; radius: number; axis?: 'x' | 'y' | 'z' }) {
  const m = mats()
  const rot: V3 = axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0]
  return (
    <group position={position}>
      <mesh material={m.paintDark} rotation={rot}>
        <cylinderGeometry args={[radius * 1.7, radius * 1.7, radius * 0.9, seg(20)]} />
      </mesh>
      <mesh material={m.steel} position={[0, radius * 2.2, 0]}>
        <cylinderGeometry args={[radius * 0.15, radius * 0.15, radius * 1.2, 8]} />
      </mesh>
      <mesh material={m.yellow} position={[0, radius * 2.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.6, radius * 0.1, 6, 16]} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════ Radiateurs à éléments

/** Instanciation de nombreux éléments identiques (un seul appel de dessin). */
function InstancedPanels({ geo, mat, positions }: { geo: THREE.BufferGeometry; mat: THREE.Material; positions: V3[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    positions.forEach((p, i) => {
      o.position.set(...p)
      o.updateMatrix()
      ref.current.setMatrixAt(i, o.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [positions])
  return <instancedMesh ref={ref} args={[geo, mat, positions.length]} castShadow receiveShadow />
}

export interface RadiatorBankProps {
  /** Point d'attache sur la paroi (x, -, z de la paroi). */
  x: number
  zWall: number
  side: 1 | -1
  topY: number
  botY: number
  panels: number
  width: number
  pitch: number
  fans?: boolean
  fanPairs?: number
}

export function radiatorLayout(p: RadiatorBankProps) {
  const height = p.topY - p.botY + 0.22
  const z0 = 0.2
  const zs = Array.from({ length: p.panels }, (_, i) => z0 + i * p.pitch)
  const zEnd = z0 + (p.panels - 1) * p.pitch
  return { height, zs, zEnd, yMid: (p.topY + p.botY) / 2 }
}

export function RadiatorBank(p: RadiatorBankProps) {
  const m = mats()
  const { height, zs, zEnd, yMid } = radiatorLayout(p)
  const geo = radiatorPanel(p.width, height, 0.03)
  const positions = useMemo(() => zs.map((z) => [0, yMid, z] as V3), [zs, yMid])
  const r = 0.045
  return (
    <group position={[p.x, 0, p.zWall]} rotation={[0, p.side === 1 ? 0 : Math.PI, 0]}>
      <InstancedPanels geo={geo} mat={m.galva} positions={positions} />
      {/* Collecteurs haut et bas */}
      {[p.topY, p.botY].map((y) => (
        <group key={y}>
          <Pipe points={[[0, y, 0.0], [0, y, zEnd + 0.06]]} radius={r} mat="galva" flanges={false} />
          <Valve position={[0, y, 0.08]} radius={r} axis="z" />
        </group>
      ))}
      {/* Bouchons de purge et de vidange */}
      <mesh material={m.brass} position={[0, p.topY + 0.07, zEnd]}>
        <cylinderGeometry args={[0.015, 0.015, 0.05, 8]} />
      </mesh>
    </group>
  )
}

/** Ventilateurs montés sous un banc de radiateurs, soufflant vers le haut. */
export function RadiatorFans(p: RadiatorBankProps & { radius?: number }) {
  const { zs, zEnd } = radiatorLayout(p)
  const rad = p.radius ?? 0.26
  const n = Math.max(1, Math.round((zEnd - zs[0]) / (rad * 2.3)))
  const step = (zEnd - zs[0]) / n
  const m = mats()
  return (
    <group position={[p.x, 0, p.zWall]} rotation={[0, p.side === 1 ? 0 : Math.PI, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const z = zs[0] + step * (i + 0.5)
        return (
          <group key={i} position={[0, p.botY - 0.32, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <Fan radius={rad} />
          </group>
        )
      })}
      {/* Support des ventilateurs */}
      <mesh material={m.paintDark} position={[0, p.botY - 0.32, (zs[0] + zEnd) / 2]}>
        <boxGeometry args={[0.04, 0.04, zEnd - zs[0] + 0.3]} />
      </mesh>
      <mesh material={m.paintDark} position={[0, p.botY - 0.2, 0.08]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════ Ventilateur hélicoïde (axe local z, souffle vers +z)

export function Fan({ radius, blades = 4, guard = true }: { radius: number; blades?: number; guard?: boolean }) {
  const m = mats()
  const rotor = useRef<THREE.Group>(null!)
  const bladeGeo = fanBlade(radius * 0.93)
  useFrame(() => {
    rotor.current.rotation.z = anim.fanAngle
  })
  return (
    <group>
      <group ref={rotor}>
        {Array.from({ length: blades }, (_, i) => (
          <mesh key={i} geometry={bladeGeo} material={m.fanBlade} rotation={[0, 0, (i / blades) * Math.PI * 2]} />
        ))}
        <mesh material={m.paintDark} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.22, radius * 0.22, radius * 0.18, 16]} />
        </mesh>
      </group>
      {/* Moteur derrière le rotor */}
      <mesh material={m.motor} position={[0, 0, -radius * 0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.2, radius * 0.2, radius * 0.4, 16]} />
      </mesh>
      {guard && (
        <>
          <mesh material={m.paintDark}>
            <torusGeometry args={[radius * 1.02, radius * 0.025, 6, seg(40)]} />
          </mesh>
          <mesh material={m.paintDark} position={[0, 0, -radius * 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radius * 1.05, radius * 1.05, radius * 0.22, seg(40), 1, true]} />
          </mesh>
          {/* Grille de protection : rayons et anneaux fusionnés (1 appel de dessin) */}
          <mesh geometry={guardGeometry(radius)} material={m.steel} position={[0, 0, radius * 0.12]} />
        </>
      )}
    </group>
  )
}

function guardGeometry(radius: number) {
  return cached('guard-' + radius, () => {
    const parts: THREE.BufferGeometry[] = []
    for (let i = 0; i < 8; i++) {
      const b = new THREE.BoxGeometry(radius * 2.04, radius * 0.012, radius * 0.012)
      b.rotateZ((i / 8) * Math.PI)
      parts.push(b)
    }
    for (const k of [0.4, 0.7, 0.98]) parts.push(new THREE.TorusGeometry(radius * k, radius * 0.008, 4, 32))
    return merge(parts)
  })
}

function pumpFins() {
  return cached('pump-fins', () =>
    merge(
      Array.from({ length: 10 }, (_, i) => {
        const c = new THREE.CylinderGeometry(0.145, 0.145, 0.008, 24)
        c.rotateX(Math.PI / 2)
        c.translate(0, 0, -0.14 - i * 0.028)
        return c
      }),
    ),
  )
}

// ════════════════════════════════════════════ Motopompe centrifuge (axe d'aspiration selon y local)

export function Pump({ position, rotation }: { position: V3; rotation?: V3 }) {
  const m = mats()
  return (
    <group position={position} rotation={rotation ?? [0, 0, 0]}>
      {/* Volute */}
      <mesh material={m.motor} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.14, seg(28)]} />
      </mesh>
      <mesh material={m.motor} position={[0.12, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.13, 16]} />
      </mesh>
      {/* Moteur à rotor noyé */}
      <mesh material={m.motor} position={[0, 0, -0.27]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.36, seg(24)]} />
      </mesh>
      <mesh geometry={pumpFins()} material={m.motor} />
      {/* Boîte à bornes */}
      <mesh material={m.paintDark} position={[0, 0.16, -0.28]}>
        <boxGeometry args={[0.12, 0.07, 0.12]} />
      </mesh>
      {/* Indicateur de débit */}
      <mesh material={m.aluminium} position={[0, 0.2, 0.0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════ Conservateur d'huile

export function Conservator({ position, length, radius }: { position: V3; length: number; radius: number }) {
  const m = mats()
  return (
    <group position={position}>
      <mesh material={m.paint} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, length, seg(40)]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={m.paint} position={[(s * length) / 2, 0, 0]} scale={[0.35, 1, 1]}>
          <sphereGeometry args={[radius, seg(32), 16, s === 1 ? 0 : Math.PI, Math.PI]} />
        </mesh>
      ))}
      {/* Indicateur de niveau à cadran */}
      <mesh material={m.aluminium} position={[length / 2 + radius * 0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.3, radius * 0.3, 0.04, 20]} />
      </mesh>
      <mesh material={m.glass} position={[length / 2 + radius * 0.39, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.26, radius * 0.26, 0.01, 20]} />
      </mesh>
      {/* Selles de support */}
      {[-length * 0.35, length * 0.35].map((x) => (
        <mesh key={x} material={m.paintDark} position={[x, -radius * 0.85, 0]}>
          <boxGeometry args={[0.08, radius * 0.5, radius * 1.4]} />
        </mesh>
      ))}
    </group>
  )
}

/** Relais Buchholz : boîtier sur la tuyauterie cuve-conservateur, avec hublots. */
export function Buchholz({ position, axis = 'x' }: { position: V3; axis?: 'x' | 'z' }) {
  const m = mats()
  return (
    <group position={position} rotation={[0, axis === 'z' ? Math.PI / 2 : 0, 0]}>
      <mesh material={m.paintDark}>
        <boxGeometry args={[0.22, 0.16, 0.16]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={m.glass} position={[0, 0.01, s * 0.081]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.01, 16]} />
        </mesh>
      ))}
      <mesh material={m.aluminium} position={[0, 0.1, 0]}>
        <boxGeometry args={[0.12, 0.04, 0.1]} />
      </mesh>
    </group>
  )
}

/** Dessiccateur à silicagel (verre + billes oranges + godet à huile). */
export function Breather({ position }: { position: V3 }) {
  const m = mats()
  return (
    <group position={position}>
      <mesh material={m.paintDark} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.03, 20]} />
      </mesh>
      <mesh material={m.orange} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 20]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.32, 20]} />
      </mesh>
      <mesh material={m.paintDark} position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.03, 20]} />
      </mesh>
      <mesh material={m.glass} position={[0, -0.21, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.08, 16]} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════ Aéroréfrigérant (OFAF / ODAF)
// Faisceau de tubes ailetés horizontaux ; l'air le traverse selon +z local, aspiré par les ventilateurs.

export function AirCooler({ width, height, depth, legH = 0.8 }: { width: number; height: number; depth: number; legH?: number }) {
  const m = mats()
  const fins = cached(`ac-fins-${width}-${height}-${depth}`, () => {
    // ailettes : plaques minces verticales (plan yz) empilées selon x
    const parts: THREE.BufferGeometry[] = []
    const n = Math.round(width / 0.025)
    for (let i = 0; i < n; i++) {
      const b = new THREE.BoxGeometry(0.003, height * 0.86, depth * 0.7)
      b.translate(-width / 2 + 0.05 + (i * (width - 0.1)) / n, 0, 0)
      parts.push(b)
    }
    return merge(parts)
  })
  const tubes = cached(`ac-tubes-${width}-${height}-${depth}`, () => {
    const parts: THREE.BufferGeometry[] = []
    const rows = 9
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 3; c++) {
        const t = new THREE.CylinderGeometry(0.014, 0.014, width * 0.98, 8)
        t.rotateZ(Math.PI / 2)
        t.translate(0, -height * 0.4 + (r * height * 0.8) / (rows - 1), -depth * 0.22 + c * depth * 0.22 + (r % 2) * 0.03)
        parts.push(t)
      }
    }
    return merge(parts)
  })
  return (
    <group>
      {/* Cadre */}
      {[1, -1].map((s) => (
        <mesh key={s} material={m.paint} position={[(s * width) / 2, 0, 0]}>
          <boxGeometry args={[0.06, height, depth]} />
        </mesh>
      ))}
      {[1, -1].map((s) => (
        <mesh key={'h' + s} material={m.paint} position={[0, (s * height) / 2, 0]}>
          <boxGeometry args={[width + 0.06, 0.08, depth]} />
        </mesh>
      ))}
      <mesh geometry={fins} material={m.aluminium} />
      <mesh geometry={tubes} material={m.copper} />
      {/* Boîtes à eau côté huile (collecteurs haut et bas) */}
      {[1, -1].map((s) => (
        <mesh key={'c' + s} material={m.paint} position={[0, s * (height / 2 + 0.09), -depth * 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, width * 0.9, seg(20)]} />
        </mesh>
      ))}
      {/* Ventilateurs sur la face de sortie d'air */}
      {[-width / 4, width / 4].map((x) => (
        <group key={x} position={[x, 0, depth / 2 + 0.12]}>
          <Fan radius={Math.min(width / 4.4, height / 2.4)} />
        </group>
      ))}
      {/* Pieds */}
      {[1, -1].map((s) => (
        <mesh key={'p' + s} material={m.paintDark} position={[(s * width) / 2, -height / 2 - legH / 2, 0]}>
          <boxGeometry args={[0.06, legH, 0.06]} />
        </mesh>
      ))}
    </group>
  )
}


// ════════════════════════════════════════════ Échangeur huile/eau à faisceau tubulaire (OFWF / ODWF)
// Calandre horizontale selon x. Huile côté calandre, eau dans les tubes.

export function WaterCooler({ length, radius }: { length: number; radius: number }) {
  const m = mats()
  return (
    <group>
      <mesh material={m.paint} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, length, seg(36)]} />
      </mesh>
      {/* Brides de calandre */}
      {[1, -1].map((s) => (
        <mesh key={s} material={m.paintDark} position={[(s * length) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.05, seg(36)]} />
        </mesh>
      ))}
      {/* Boîtes à eau (fonds bombés) */}
      {[1, -1].map((s) => (
        <group key={'b' + s} position={[(s * (length / 2 + 0.12)), 0, 0]}>
          <mesh material={m.blue} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[radius * 0.98, radius * 0.98, 0.2, seg(36)]} />
          </mesh>
          <mesh material={m.blue} position={[s * 0.1, 0, 0]} scale={[0.4, 1, 1]}>
            <sphereGeometry args={[radius * 0.98, seg(28), 14, s === 1 ? 0 : Math.PI, Math.PI]} />
          </mesh>
        </group>
      ))}
      {/* Chicanes visibles par les regards */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={'r' + i} material={m.paintDark} position={[-length / 2 + (length / 6) * (i + 1), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 1.03, radius * 1.03, 0.02, seg(36)]} />
        </mesh>
      ))}
      {/* Selles */}
      {[-length * 0.32, length * 0.32].map((x) => (
        <mesh key={'s' + x} material={m.paintDark} position={[x, -radius - 0.25, 0]}>
          <boxGeometry args={[0.1, 0.5, radius * 1.6]} />
        </mesh>
      ))}
      {/* Détecteur de fuite (double paroi) */}
      <mesh material={m.yellow} position={[length * 0.2, radius + 0.04, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.08]} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════ Ventilateur tangentiel (transformateur sec AF), axe x

export function CrossFlowFan({ length }: { length: number }) {
  const m = mats()
  const rotor = useRef<THREE.Group>(null!)
  useFrame(() => {
    rotor.current.rotation.x = -anim.fanAngle * 1.5
  })
  const vanes = 16
  return (
    <group>
      {/* Carter */}
      <mesh material={m.paintDark} position={[0, -0.02, -0.03]}>
        <boxGeometry args={[length, 0.1, 0.06]} />
      </mesh>
      <mesh material={m.paintDark} position={[0, 0.0, 0.0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.065, 0.065, length, 20, 1, true, 0, Math.PI * 1.3]} />
      </mesh>
      <group ref={rotor}>
        {Array.from({ length: vanes }, (_, i) => {
          const a = (i / vanes) * Math.PI * 2
          return (
            <mesh key={i} material={m.fanBlade} position={[0, Math.cos(a) * 0.045, Math.sin(a) * 0.045]} rotation={[a + 0.5, 0, 0]}>
              <boxGeometry args={[length * 0.96, 0.025, 0.003]} />
            </mesh>
          )
        })}
      </group>
      <mesh material={m.motor} position={[length / 2 + 0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.12, 16]} />
      </mesh>
    </group>
  )
}

/** Thermomètre à cadran. */
export function Dial({ position, rotation, r = 0.06 }: { position: V3; rotation?: V3; r?: number }) {
  const m = mats()
  return (
    <group position={position} rotation={rotation ?? [0, 0, 0]}>
      <mesh material={m.paintDark} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.04, 20]} />
      </mesh>
      <mesh material={m.cabinet} position={[0, 0, 0.021]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.85, r * 0.85, 0.002, 20]} />
      </mesh>
      <mesh material={m.rubber} position={[r * 0.25, r * 0.1, 0.024]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[r * 0.6, r * 0.06, 0.002]} />
      </mesh>
    </group>
  )
}

/** Galet de roulement. */
export function Wheel({ position, r = 0.08, axis = 'x' }: { position: V3; r?: number; axis?: 'x' | 'z' }) {
  const m = mats()
  return (
    <group position={position}>
      <mesh material={m.paintDark} rotation={axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, r * 0.6, 20]} />
      </mesh>
      <mesh material={m.paintDark} position={[0, r * 0.9, 0]}>
        <boxGeometry args={[r * 1.1, r * 0.5, r * 1.1]} />
      </mesh>
    </group>
  )
}

/** Anneau de levage. */
export function LiftingLug({ position, rotation }: { position: V3; rotation?: V3 }) {
  const m = mats()
  return (
    <mesh material={m.paint} position={position} rotation={rotation ?? [0, 0, 0]}>
      <torusGeometry args={[0.05, 0.016, 8, 16, Math.PI]} />
    </mesh>
  )
}

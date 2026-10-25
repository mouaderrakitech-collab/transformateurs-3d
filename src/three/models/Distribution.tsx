import { useApp } from '../../store'
import { mats } from '../materials'
import { Part } from '../Part'
import { finWall } from '../geometry'
import { ActivePart, Bushing, Dial, LiftingLug, Pipe, Valve, Wheel, type ActivePartProps } from '../components'
import type { FlowPath } from '../../types'

/**
 * Transformateur de distribution triphasé, immergé, cuve hermétique à remplissage total
 * avec parois ondulées (ailettes), refroidissement ONAN.
 */

const T = { x: 0.72, z: 0.42, y0: 0.18, y1: 1.32, t: 0.012 }
const FIN = { depth: 0.2, pitch: 0.045, y0: 0.27, y1: 1.25 }

export const DIST_ACTIVE: ActivePartProps = {
  limbs: [-0.46, 0, 0.46],
  D: 0.2,
  windowH: 0.58,
  y0: 0.22,
  lv: [0.11, 0.15],
  hv: [0.17, 0.225],
  lvDiscs: 14,
  hvDiscs: 18,
  explodeScale: 0.45,
}
const WB = 0.44
const WT = 0.96

export function DistributionTransformer() {
  const m = mats()
  const mode = useApp((s) => s.mode)
  const showOil = mode === 'interieur' || mode === 'coupe' || mode === 'refroidissement'
  const finH = FIN.y1 - FIN.y0
  const finY = (FIN.y0 + FIN.y1) / 2
  const longFins = finWall(2 * T.x - 0.04, finH, FIN.depth, FIN.pitch)
  const shortFins = finWall(2 * T.z - 0.06, finH, FIN.depth * 0.8, FIN.pitch)
  const H = T.y1 - T.y0

  return (
    <group>
      <ActivePart {...DIST_ACTIVE} />

      {/* Liaisons internes vers les traversées */}
      <Part id="enroulementHT" layer="partieActive" explode={[0, 0.5, 0.16]}>
        {DIST_ACTIVE.limbs.map((x) => (
          <Pipe key={x} points={[[x * 0.98, WT, -0.19], [x * 0.9, 1.15, -0.2], [x * 0.87, 1.3, -0.2]]} radius={0.008} mat="copper" flanges={false} />
        ))}
      </Part>
      <Part id="enroulementBT" layer="partieActive" explode={[0, 0.25, 0]}>
        {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
          <mesh key={x} material={m.copperLV} position={[x, 1.13, 0.2]}>
            <boxGeometry args={[0.04, 0.34 - i * 0.0, 0.008]} />
          </mesh>
        ))}
      </Part>

      {showOil && (
        <Part id="huile" layer="cuve">
          <mesh material={m.oil} position={[0, (T.y0 + T.y1) / 2, 0]} renderOrder={2}>
            <boxGeometry args={[2 * T.x - 0.03, H - 0.03, 2 * T.z - 0.03]} />
          </mesh>
        </Part>
      )}

      {/* Cuve : fond, couvercle, cadre */}
      <Part id="cuve" layer="cuve" shell label={[T.x - 0.1, 0.24, T.z + 0.22]}>
        {[1, -1].map((s) => (
          <mesh key={'w' + s} material={m.paint} position={[0, (T.y0 + T.y1) / 2, s * (T.z - T.t / 2)]}>
            <boxGeometry args={[2 * T.x, H, T.t]} />
          </mesh>
        ))}
        {[1, -1].map((s) => (
          <mesh key={'e' + s} material={m.paint} position={[s * (T.x - T.t / 2), (T.y0 + T.y1) / 2, 0]}>
            <boxGeometry args={[T.t, H, 2 * T.z - 2 * T.t]} />
          </mesh>
        ))}
        <mesh material={m.paint} position={[0, T.y0 + 0.01, 0]}>
          <boxGeometry args={[2 * T.x + 0.06, 0.02, 2 * T.z + 0.06]} />
        </mesh>
        {/* Ceinture haute et basse rigidifiant les ondes */}
        <mesh material={m.paint} position={[0, T.y1 - 0.04, 0]}>
          <boxGeometry args={[2 * T.x + 2 * FIN.depth + 0.02, 0.08, 2 * T.z + 2 * FIN.depth + 0.02]} />
        </mesh>
        <mesh material={m.paint} position={[0, T.y0 + 0.05, 0]}>
          <boxGeometry args={[2 * T.x + 2 * FIN.depth + 0.02, 0.06, 2 * T.z + 2 * FIN.depth + 0.02]} />
        </mesh>
        <Valve position={[0.3, 0.23, T.z + FIN.depth + 0.04]} radius={0.025} />
        <mesh material={m.aluminium} position={[-0.3, 0.22, T.z + FIN.depth + 0.012]}>
          <boxGeometry args={[0.22, 0.05, 0.005]} />
        </mesh>
      </Part>

      <Part id="cuveAilettes" layer="refroidissement" shell explode={[0, 0, 0.35]} label={[0, 0.9, T.z + FIN.depth + 0.05]}>
        <mesh geometry={longFins} material={m.paint} position={[0, finY, T.z]} />
        <mesh geometry={longFins} material={m.paint} position={[0, finY, -T.z]} rotation={[0, Math.PI, 0]} />
        <mesh geometry={shortFins} material={m.paint} position={[T.x, finY, 0]} rotation={[0, Math.PI / 2, 0]} />
        <mesh geometry={shortFins} material={m.paint} position={[-T.x, finY, 0]} rotation={[0, -Math.PI / 2, 0]} />
      </Part>

      <Part id="couvercle" layer="cuve" shell explode={[0, 0.9, 0]} label={[-0.5, 1.4, -0.35]}>
        <mesh material={m.paint} position={[0, T.y1 + 0.015, 0]}>
          <boxGeometry args={[2 * T.x + 0.08, 0.03, 2 * T.z + 0.08]} />
        </mesh>
        {[
          [-T.x + 0.05, -T.z + 0.05],
          [T.x - 0.05, -T.z + 0.05],
          [-T.x + 0.05, T.z - 0.05],
          [T.x - 0.05, T.z - 0.05],
        ].map(([x, z]) => (
          <LiftingLug key={`${x}${z}`} position={[x, T.y1 + 0.05, z]} rotation={[0, Math.PI / 4, 0]} />
        ))}
      </Part>

      <Part id="traverseeHT" layer="partieActive" explode={[0, 1.2, -0.1]} label={[0.4, 1.78, -0.2]}>
        {[-0.4, 0, 0.4].map((x) => (
          <Bushing key={x} position={[x, T.y1 + 0.03, -0.2]} height={0.32} rCore={0.032} rShed={0.07} sheds={5} />
        ))}
      </Part>
      <Part id="traverseeBT" layer="partieActive" explode={[0, 0.9, 0.1]} label={[0.45, 1.6, 0.2]}>
        {[-0.45, -0.15, 0.15, 0.45].map((x) => (
          <group key={x}>
            <Bushing position={[x, T.y1 + 0.03, 0.2]} height={0.13} rCore={0.028} rShed={0.05} sheds={2} mat="porcelainGrey" />
            {/* Plage de raccordement */}
            <mesh material={m.brass} position={[x, T.y1 + 0.25, 0.2]}>
              <boxGeometry args={[0.05, 0.08, 0.012]} />
            </mesh>
          </group>
        ))}
      </Part>
      <Part id="commutateur" layer="accessoires" explode={[0, 0.8, 0]} label={[0.6, 1.5, -0.3]}>
        <mesh material={m.paintDark} position={[0.6, T.y1 + 0.06, -0.28]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 20]} />
        </mesh>
        <mesh material={m.yellow} position={[0.6, T.y1 + 0.1, -0.28]}>
          <boxGeometry args={[0.12, 0.025, 0.025]} />
        </mesh>
      </Part>
      <Part id="dgpt" layer="accessoires" explode={[0, 0.8, 0]} label={[-0.6, 1.55, 0.05]}>
        <mesh material={m.paintDark} position={[-0.6, T.y1 + 0.08, 0.05]}>
          <cylinderGeometry args={[0.055, 0.055, 0.1, 20]} />
        </mesh>
        <mesh material={m.glass} position={[-0.6, T.y1 + 0.16, 0.05]}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 20]} />
        </mesh>
        <mesh material={m.cabinet} position={[-0.6, T.y1 + 0.06, 0.13]}>
          <boxGeometry args={[0.07, 0.05, 0.05]} />
        </mesh>
      </Part>
      <Part id="thermometre" layer="accessoires" explode={[0, 0.8, 0]}>
        <Dial position={[0.62, T.y1 + 0.09, 0.08]} rotation={[-Math.PI / 2, 0, 0]} r={0.035} />
      </Part>

      <Part id="chassis" layer="cuve" explode={[0, -0.15, 0]} label={[-0.5, 0.05, 0.45]}>
        {[0.28, -0.28].map((z) => (
          <mesh key={z} material={m.paintDark} position={[0, 0.14, z]}>
            <boxGeometry args={[2 * T.x + 0.1, 0.07, 0.08]} />
          </mesh>
        ))}
        {[
          [-0.55, 0.28],
          [0.55, 0.28],
          [-0.55, -0.28],
          [0.55, -0.28],
        ].map(([x, z]) => (
          <Wheel key={`${x}${z}`} position={[x, 0.055, z]} r={0.055} />
        ))}
      </Part>
    </group>
  )
}

export function distributionFlows(): FlowPath[] {
  const paths: FlowPath[] = []
  const duct = (DIST_ACTIVE.lv[1] + DIST_ACTIVE.hv[0]) / 2
  const finCenter = (x: number) => {
    const L = 2 * T.x - 0.04
    const i = Math.round((x + L / 2) / FIN.pitch - 0.5)
    return -L / 2 + FIN.pitch * (i + 0.5)
  }
  for (const lx of DIST_ACTIVE.limbs) {
    for (const sx of [1, -1]) {
      for (const s of [1, -1]) {
        const fx = finCenter(lx + sx * 0.12 + s * 0.04)
        const zf = s * (T.z + FIN.depth * 0.55)
        paths.push({
          fluid: 'huile',
          points: [
            [lx + sx * duct, WB + 0.01, -0.01],
            [lx + sx * duct, (WB + WT) / 2, -0.01],
            [lx + sx * duct, WT - 0.01, -0.01],
            [lx + sx * 0.2, 1.08, s * 0.12],
            [fx, 1.18, s * (T.z - 0.04)],
            [fx, 1.2, zf],
            [fx, 0.75, zf],
            [fx, 0.32, zf],
            [fx, 0.28, s * (T.z - 0.05)],
            [lx + sx * 0.18, 0.36, s * 0.12],
          ],
          temps: [0.25, 0.65, 0.95, 1, 1, 0.95, 0.5, 0.15, 0.12, 0.18],
          speed: 0.13,
          count: 9,
          closed: true,
        })
      }
    }
  }
  // Air : convection naturelle le long des ailettes
  for (let k = 0; k < 14; k++) {
    const s = k % 2 ? 1 : -1
    const x = -0.62 + (k / 13) * 1.24
    const z = s * (T.z + FIN.depth * 0.5)
    paths.push({
      fluid: 'air',
      points: [
        [x, 0.15, z],
        [x, 0.3, z],
        [x, 0.8, z],
        [x, 1.25, z],
        [x, 1.75, z * 1.05],
      ],
      temps: [0, 0.02, 0.3, 0.5, 0.5],
      speed: 0.18,
      count: 5,
    })
  }
  return paths
}

export const DIST_VIEW = { target: [0, 0.8, 0] as [number, number, number], radius: 1.7 }

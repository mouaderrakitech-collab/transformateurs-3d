import { mats } from '../materials'
import { Part } from '../Part'
import { ActivePart, Bushing, CrossFlowFan, Pipe, Wheel, type ActivePartProps } from '../components'
import type { CoolingId, FlowPath } from '../../types'

/**
 * Transformateur sec triphasé à enroulements HT enrobés de résine (IEC 60076-11),
 * sans enveloppe (IP00). Refroidissement AN, ou AF avec ventilateurs tangentiels.
 */

export const DRY_ACTIVE: ActivePartProps = {
  limbs: [-0.6, 0, 0.6],
  D: 0.26,
  windowH: 0.95,
  y0: 0.24,
  lv: [0.15, 0.2],
  hv: [0.24, 0.29],
  lvDiscs: 1,
  hvDiscs: 1,
  hvMat: 'resin',
  lvMat: 'foil',
  dry: true,
  explodeScale: 0.6,
}
const yokeH = DRY_ACTIVE.D * 0.95
const WB = 0.535
const WT = 1.39
const yc = (WB + WT) / 2
const TOP = DRY_ACTIVE.y0 + 2 * yokeH + DRY_ACTIVE.windowH

export function DryTransformer({ cooling }: { cooling: CoolingId }) {
  const m = mats()
  const L = DRY_ACTIVE.limbs
  const zf = DRY_ACTIVE.hv[1] + 0.02
  return (
    <group>
      <ActivePart {...DRY_ACTIVE} />

      {/* Cales élastiques entre bobines et armatures */}
      <Part id="cales" layer="partieActive" explode={[0, 0.2, 0]} label={[L[2] + 0.3, WT + 0.03, 0.1]}>
        {L.flatMap((x) =>
          [WB - 0.024, WT + 0.024].flatMap((y) =>
            [0.4, 2.0, 3.6, 5.2].map((a) => (
              <mesh key={`${x}${y}${a}`} material={m.orange} position={[x + Math.cos(a) * 0.265, y, Math.sin(a) * 0.265]}>
                <boxGeometry args={[0.04, 0.045, 0.04]} />
              </mesh>
            )),
          ),
        )}
      </Part>

      {/* Couplage triangle HT : barres diagonales en face avant, bornes HT, plaques de prises */}
      <Part id="barresHT" layer="partieActive" explode={[0, 1.15 * 0.6, 0.35 * 0.6]} label={[0.3, WT + 0.12, zf + 0.05]}>
        <Pipe points={[[L[0], WB + 0.03, zf], [L[1], WT - 0.03, zf]]} radius={0.012} mat="copper" flanges={false} />
        <Pipe points={[[L[1], WB + 0.03, zf], [L[2], WT - 0.03, zf]]} radius={0.012} mat="copper" flanges={false} />
        <Pipe points={[[L[2], WB + 0.03, zf], [L[2] + 0.36, WB + 0.03, zf], [L[2] + 0.36, WT + 0.08, zf], [L[0], WT + 0.08, zf + 0.03], [L[0], WT - 0.03, zf]]} radius={0.012} mat="copper" flanges={false} />
        {L.map((x) => (
          <group key={x}>
            <Bushing position={[x, WT - 0.06, zf - 0.01]} height={0.07} rCore={0.012} rShed={0.022} sheds={2} mat="porcelainGrey" tilt={[Math.PI / 2, 0, 0]} />
            {/* Plaque des prises de réglage */}
            <mesh material={m.resin} position={[x, yc, DRY_ACTIVE.hv[1] + 0.005]}>
              <boxGeometry args={[0.1, 0.16, 0.02]} />
            </mesh>
            {Array.from({ length: 6 }, (_, i) => (
              <mesh key={i} material={m.brass} position={[x - 0.025 + (i % 2) * 0.05, yc - 0.05 + Math.floor(i / 2) * 0.05, DRY_ACTIVE.hv[1] + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.009, 0.009, 0.015, 10]} />
              </mesh>
            ))}
            <mesh material={m.copper} position={[x, yc, DRY_ACTIVE.hv[1] + 0.028]}>
              <boxGeometry args={[0.07, 0.014, 0.004]} />
            </mesh>
          </group>
        ))}
      </Part>

      {/* Barres de sortie BT à l'arrière */}
      <Part id="barresBT" layer="partieActive" explode={[0, 0.4, -0.3]} label={[L[0], TOP + 0.32, -0.25]}>
        {[...L, L[2] + 0.2].map((x) => (
          <group key={x}>
            <mesh material={m.copperLV} position={[x, WT + 0.25, -0.21]}>
              <boxGeometry args={[0.08, 0.6, 0.012]} />
            </mesh>
            <mesh material={m.copperLV} position={[x, TOP + 0.25, -0.21]}>
              <boxGeometry args={[0.1, 0.06, 0.012]} />
            </mesh>
          </group>
        ))}
      </Part>

      <Part id="sondes" layer="accessoires" explode={[0, 0.5, 0]} label={[L[1], TOP + 0.08, 0.2]}>
        {L.map((x) => (
          <mesh key={x} material={m.rubber} position={[x + 0.175, WT + 0.06, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 8]} />
          </mesh>
        ))}
        <mesh material={m.cabinet} position={[L[2] + 0.42, TOP - 0.1, 0.12]}>
          <boxGeometry args={[0.14, 0.12, 0.08]} />
        </mesh>
      </Part>

      {/* Châssis à galets */}
      <Part id="chassis" layer="cuve" explode={[0, -0.25, 0]} label={[L[0] - 0.3, 0.12, 0.32]}>
        {[0.25, -0.25].map((z) => (
          <mesh key={z} material={m.paintDark} position={[0, 0.17, z]}>
            <boxGeometry args={[L[2] - L[0] + 0.5, 0.1, 0.08]} />
          </mesh>
        ))}
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} material={m.paintDark} position={[x, 0.17, 0]}>
            <boxGeometry args={[0.08, 0.1, 0.5]} />
          </mesh>
        ))}
        {[
          [-0.7, 0.25],
          [0.7, 0.25],
          [-0.7, -0.25],
          [0.7, -0.25],
        ].map(([x, z]) => (
          <Wheel key={`${x}${z}`} position={[x, 0.055, z]} r={0.055} axis="z" />
        ))}
        {/* Œillets de levage sur les armatures supérieures */}
        {[L[0] - 0.2, L[2] + 0.2].map((x) => (
          <mesh key={x} material={m.paintDark} position={[x, TOP + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.04, 0.012, 6, 14]} />
          </mesh>
        ))}
      </Part>

      {cooling === 'AF' && (
        <Part id="ventTangentiel" layer="refroidissement" explode={[0, -0.2, 0.5]} label={[0, 0.28, 0.45]}>
          {[1, -1].map((s) => (
            <group key={s} position={[0, 0.34, s * 0.36]} rotation={[s * 0.6, 0, 0]}>
              <CrossFlowFan length={1.5} />
            </group>
          ))}
        </Part>
      )}
    </group>
  )
}

export function dryFlows(cooling: CoolingId): FlowPath[] {
  const paths: FlowPath[] = []
  const af = cooling === 'AF'
  const ducts = [(DRY_ACTIVE.D / 2 + DRY_ACTIVE.lv[0]) / 2, (DRY_ACTIVE.lv[1] + DRY_ACTIVE.hv[0]) / 2]
  let i = 0
  for (const lx of DRY_ACTIVE.limbs) {
    for (const sx of [1, -1]) {
      for (const r of ducts) {
        const x = lx + sx * r
        const z = -0.015
        const zFan = (i++ % 2 ? 1 : -1) * 0.36
        paths.push({
          fluid: 'air',
          points: af
            ? [[x, 0.2, zFan * 1.2], [x, 0.36, zFan], [x, WB - 0.05, z], [x, yc, z], [x, WT, z], [x + sx * 0.05, TOP + 0.35, z]]
            : [[x, 0.12, z * 6], [x, WB - 0.05, z], [x, yc, z], [x, WT, z], [x + sx * 0.05, TOP + 0.35, z]],
          temps: af ? [0, 0, 0.02, 0.3, 0.55, 0.55] : [0, 0.02, 0.35, 0.7, 0.7],
          speed: af ? 1.0 : 0.3,
          count: af ? 8 : 6,
        })
      }
      // Convection sur la surface extérieure de la bobine HT
      const xo = lx + sx * (DRY_ACTIVE.hv[1] + 0.02)
      paths.push({
        fluid: 'air',
        points: [[xo, 0.15, -0.02], [xo, WB, -0.02], [xo, WT, -0.02], [xo + sx * 0.06, TOP + 0.3, -0.02]],
        temps: [0, 0.05, 0.5, 0.5],
        speed: af ? 0.6 : 0.25,
        count: 4,
      })
    }
  }
  return paths
}

export const DRY_VIEW = { target: [0, 0.95, 0] as [number, number, number], radius: 1.6 }

import { useApp } from '../../store'
import { mats } from '../materials'
import { Part } from '../Part'
import { windingGeometry, tubeGeometry, seg } from '../geometry'
import { Bushing, LiftingLug, Pipe } from '../components'
import type { FlowPath } from '../../types'

/**
 * Transformateur monophasé de distribution sur poteau, immergé, ONAN.
 * Circuit magnétique cuirassé : colonne centrale bobinée et deux colonnes de retour.
 */

const R = 0.3 // rayon de cuve
const Y0 = 0.12
const Y1 = 1.0
const CORE = { cw: 0.1, ow: 0.05, depth: 0.14, win: 0.44, yoke: 0.05, y0: 0.2, xo: 0.2 }
const yc = CORE.y0 + CORE.yoke + CORE.win / 2 // 0.47
const LV: [number, number] = [0.09, 0.12]
const HV: [number, number] = [0.128, 0.168]
const WH = 0.4

export function MonophaseTransformer() {
  const m = mats()
  const mode = useApp((s) => s.mode)
  const showOil = mode === 'interieur' || mode === 'coupe' || mode === 'refroidissement'
  const lvGeo = windingGeometry(LV[0], LV[1], WH, 10, 0.12)
  const hvGeo = windingGeometry(HV[0], HV[1], WH, 16, 0.25)
  const yokeW = 2 * CORE.xo + CORE.ow
  const H = Y1 - Y0

  return (
    <group>
      {/* Circuit magnétique cuirassé */}
      <Part id="noyauCuirasse" layer="partieActive" label={[0, CORE.y0 + CORE.win + 2 * CORE.yoke + 0.06, 0]}>
        <mesh material={m.core} position={[0, yc, 0]}>
          <boxGeometry args={[CORE.cw, CORE.win, CORE.depth]} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh key={s} material={m.core} position={[s * CORE.xo, yc, 0]}>
            <boxGeometry args={[CORE.ow, CORE.win, CORE.depth]} />
          </mesh>
        ))}
        <mesh material={m.core} position={[0, CORE.y0 + CORE.yoke / 2, 0]}>
          <boxGeometry args={[yokeW, CORE.yoke, CORE.depth]} />
        </mesh>
        <TopYoke y={CORE.y0 + CORE.yoke * 1.5 + CORE.win} w={yokeW} />
      </Part>
      <Part id="enroulementBT" layer="partieActive" explode={[0, 0.3, 0]} label={[0, yc, LV[1]]}>
        <mesh geometry={lvGeo} material={m.copperLV} position={[0, yc, 0]} />
      </Part>
      <Part id="enroulementHT" layer="partieActive" explode={[0, 0.6, 0.15]} label={[0, yc + 0.12, HV[1]]}>
        <mesh geometry={hvGeo} material={m.paperWinding} position={[0, yc, 0]} />
        <Pipe points={[[0.05, yc + WH / 2, -0.15], [0.03, 0.85, -0.08], [0, 1.02, 0]]} radius={0.006} mat="copper" flanges={false} />
      </Part>
      <Part id="isolation" layer="partieActive" explode={[0, 0.15, 0]}>
        <mesh geometry={tubeGeometry(LV[1] + 0.002, LV[1] + 0.005, WH * 1.05)} material={m.pressboard} position={[0, yc, 0]} />
        <mesh geometry={tubeGeometry(0.075, 0.087, WH * 1.03)} material={m.pressboard} position={[0, yc, 0]} />
      </Part>
      <Part id="serrage" layer="partieActive" explode={[0, 0, 0.3]}>
        {[CORE.y0 + CORE.yoke / 2, CORE.y0 + CORE.yoke * 1.5 + CORE.win].map((y) =>
          [1, -1].map((s) => (
            <mesh key={`${y}${s}`} material={m.paintDark} position={[0, y, s * (CORE.depth / 2 + 0.012)]}>
              <boxGeometry args={[yokeW + 0.02, CORE.yoke * 0.9, 0.02]} />
            </mesh>
          )),
        )}
      </Part>

      {showOil && (
        <Part id="huile" layer="cuve">
          <mesh material={m.oil} position={[0, (Y0 + Y1) / 2 - 0.03, 0]} renderOrder={2}>
            <cylinderGeometry args={[R - 0.006, R - 0.006, H - 0.08, seg(40)]} />
          </mesh>
        </Part>
      )}

      {/* Cuve cylindrique : paroi (tube fermé), fond, bandeau de couvercle */}
      <Part id="cuveCylindrique" layer="cuve" shell label={[R * 0.7, 0.4, R * 0.75]}>
        <mesh geometry={tubeGeometry(R - 0.006, R, H)} material={m.paintDark} position={[0, (Y0 + Y1) / 2, 0]} />
        <mesh material={m.paintDark} position={[0, Y0 + 0.006, 0]}>
          <cylinderGeometry args={[R, R, 0.012, seg(40)]} />
        </mesh>
        <mesh material={m.paintDark} position={[0, Y0 + 0.02, 0]}>
          <torusGeometry args={[R + 0.004, 0.012, 8, seg(40)]} />
        </mesh>
        {/* Borne de terre et plaque signalétique */}
        <mesh material={m.brass} position={[0.2, 0.25, R * 0.75]}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
        </mesh>
        <mesh material={m.aluminium} position={[-0.12, 0.5, R * 0.95]} rotation={[0, -0.4, 0]}>
          <boxGeometry args={[0.12, 0.08, 0.004]} />
        </mesh>
      </Part>
      <Part id="couvercle" layer="cuve" shell explode={[0, 0.5, 0]} label={[-0.2, 1.08, 0.1]}>
        <mesh material={m.paintDark} position={[0, Y1 + 0.005, 0]}>
          <cylinderGeometry args={[R + 0.012, R + 0.012, 0.02, seg(40)]} />
        </mesh>
        <mesh material={m.paintDark} position={[0, Y1 + 0.015, 0]} scale={[1, 0.18, 1]}>
          <sphereGeometry args={[R, seg(40), 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh material={m.steel} position={[0, Y1, 0]}>
          <torusGeometry args={[R + 0.014, 0.008, 6, seg(40)]} />
        </mesh>
        <LiftingLug position={[0.22, Y1 + 0.04, -0.12]} rotation={[0, 0.5, 0]} />
        <LiftingLug position={[-0.22, Y1 + 0.04, -0.12]} rotation={[0, -0.5, 0]} />
      </Part>

      {/* Traversée HT sur le couvercle */}
      <Part id="traverseeHT" layer="partieActive" explode={[0, 0.7, 0]} label={[0, 1.5, 0]}>
        <Bushing position={[0, Y1 + 0.05, 0]} height={0.34} rCore={0.03} rShed={0.065} sheds={6} mat="porcelainGrey" />
      </Part>
      {/* Traversées BT latérales (X1, X2, X3) */}
      <Part id="traverseeBT" layer="partieActive" explode={[0, 0, 0.35]} label={[0.15, 0.95, R + 0.12]}>
        {[-0.12, 0, 0.12].map((x) => (
          <Bushing key={x} position={[x, 0.86, R * Math.cos(Math.asin(x / R)) - 0.01]} height={0.07} rCore={0.018} rShed={0.034} sheds={2} mat="porcelainGrey" tilt={[Math.PI / 2, 0, 0]} />
        ))}
      </Part>
      {/* Pattes d'accrochage au poteau */}
      <Part id="supports" layer="cuve" explode={[0, 0, -0.3]} label={[0, 0.9, -R - 0.08]}>
        {[0.88, 0.32].map((y) => (
          <group key={y}>
            <mesh material={m.steel} position={[0, y, -R - 0.03]}>
              <boxGeometry args={[0.24, 0.06, 0.06]} />
            </mesh>
            <mesh material={m.steel} position={[0, y, -R - 0.065]}>
              <boxGeometry args={[0.3, 0.1, 0.012]} />
            </mesh>
          </group>
        ))}
      </Part>
    </group>
  )
}

function TopYoke({ y, w }: { y: number; w: number }) {
  return (
    <mesh material={mats().core} position={[0, y, 0]}>
      <boxGeometry args={[w, CORE.yoke, CORE.depth]} />
    </mesh>
  )
}

export function monophaseFlows(): FlowPath[] {
  const paths: FlowPath[] = []
  const duct = (LV[1] + HV[0]) / 2
  // Huile : montée dans l'enroulement, redescente le long de la paroi (surface de refroidissement)
  const angles = [-0.15, -0.6, -1.2, -1.95, -2.55, -3.0]
  angles.forEach((a, i) => {
    const sx = Math.cos(a) >= 0 ? 1 : -1
    const wx = Math.cos(a) * (R - 0.025)
    const wz = Math.sin(a) * (R - 0.025)
    paths.push({
      fluid: 'huile',
      points: [
        [sx * duct, yc - WH / 2 + 0.01, -0.005],
        [sx * duct, yc, -0.005],
        [sx * duct, yc + WH / 2 - 0.01, -0.005],
        [sx * 0.12, 0.85, wz * 0.3],
        [wx, 0.88, wz],
        [wx, 0.55, wz],
        [wx, 0.2, wz],
        [sx * 0.12, 0.17, wz * 0.3],
      ],
      temps: [0.25, 0.65, 0.95, 1, 0.9, 0.5, 0.15, 0.18],
      speed: 0.09,
      count: 8,
      closed: true,
    })
    void i
  })
  // Air : convection naturelle autour de la cuve
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    const x = Math.cos(a) * (R + 0.04)
    const z = Math.sin(a) * (R + 0.04)
    paths.push({
      fluid: 'air',
      points: [
        [x, 0.05, z],
        [x, 0.3, z],
        [x, 0.8, z],
        [x * 0.9, 1.4, z * 0.9],
      ],
      temps: [0, 0.1, 0.4, 0.45],
      speed: 0.14,
      count: 4,
    })
  }
  return paths
}

export const MONO_VIEW = { target: [0, 0.6, 0] as [number, number, number], radius: 0.95 }

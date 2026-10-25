import { useApp } from '../../store'
import { mats } from '../materials'
import { Part } from '../Part'
import {
  ActivePart,
  AirCooler,
  Breather,
  Buchholz,
  Bushing,
  Conservator,
  Dial,
  LiftingLug,
  Pipe,
  Pump,
  RadiatorBank,
  RadiatorFans,
  Valve,
  WaterCooler,
  type ActivePartProps,
  type RadiatorBankProps,
} from '../components'
import { isDirected, usesAirCooler, usesFans, usesRadiators, usesWater } from '../../data/cooling'
import type { CoolingId, FlowPath } from '../../types'

/**
 * Transformateur de puissance triphasé immergé, avec conservateur et changeur de prises en charge.
 * Dimensions représentatives (m) ; la configuration de refroidissement change selon le mode choisi.
 */

const T = { x0: -2.65, x1: 2.15, z: 0.9, y0: 0.3, y1: 3.2, t: 0.03 }
const TX = (T.x0 + T.x1) / 2
const TL = T.x1 - T.x0
const TH = T.y1 - T.y0

export const POWER_ACTIVE: ActivePartProps = {
  limbs: [-1.32, 0, 1.32],
  D: 0.56,
  windowH: 1.6,
  y0: 0.36,
  lv: [0.3, 0.4],
  hv: [0.46, 0.6],
  lvDiscs: 34,
  hvDiscs: 44,
}
const WB = 0.972 // bas des enroulements
const WT = 2.412 // haut des enroulements

const BANK_X = [-1.6, -0.55, 0.5, 1.55]
const bank = (x: number, side: 1 | -1): RadiatorBankProps => ({
  x,
  zWall: side * T.z,
  side,
  topY: 2.85,
  botY: 0.75,
  panels: 14,
  width: 0.52,
  pitch: 0.05,
})

// Aéroréfrigérants (OFAF / ODAF) : face +z, deux groupes
const AC = { xs: [-1.25, 0.85], w: 1.2, h: 1.5, d: 0.55, cy: 1.95, cz: T.z + 0.35 + 0.275 }
// Échangeur huile/eau (OFWF / ODWF)
const WC = { x: -0.1, y: 1.0, z: 1.75, len: 1.6, r: 0.24 }

export function PowerTransformer({ cooling }: { cooling: CoolingId }) {
  const m = mats()
  const mode = useApp((s) => s.mode)
  const showOil = mode === 'interieur' || mode === 'coupe' || mode === 'refroidissement'
  const directed = isDirected(cooling)

  return (
    <group>
      {/* ── Partie active */}
      <ActivePart {...POWER_ACTIVE} directed={directed} />

      {/* Connexions internes : sorties HT, BT et prises vers le changeur */}
      <Part id="enroulementHT" layer="partieActive" explode={[0, 1.15, 0.35]}>
        {POWER_ACTIVE.limbs.map((x) => (
          <Pipe key={'hl' + x} points={[[x, WT, -0.5], [x, 2.85, -0.45], [x, 3.15, -0.35]]} radius={0.025} mat="copper" flanges={false} />
        ))}
        {POWER_ACTIVE.limbs.map((x, i) => (
          <Pipe
            key={'tap' + x}
            points={[[x + 0.2, 1.55 + i * 0.07, 0.6], [x + 0.2, 1.55 + i * 0.07, 0.7], [-2.05, 1.55 + i * 0.07, 0.7], [-2.3, 1.55 + i * 0.07, 0.15]]}
            radius={0.012}
            mat="copper"
            flanges={false}
          />
        ))}
      </Part>
      <Part id="enroulementBT" layer="partieActive" explode={[0, 0.55, 0]}>
        {POWER_ACTIVE.limbs.map((x) => (
          <Pipe key={'ll' + x} points={[[x, WT, 0.35], [x, 2.85, 0.4], [x, 3.15, 0.45]]} radius={0.03} mat="copperLV" flanges={false} />
        ))}
      </Part>

      {/* Changeur de prises en charge (compartiment immergé) */}
      <Part id="regleur" layer="accessoires" explode={[-0.8, 0.9, 0]} label={[-2.35, 2.2, 0.3]}>
        <mesh material={m.resin} position={[-2.35, 2.1, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 2.0, 32]} />
        </mesh>
        <mesh material={m.aluminium} position={[-2.35, T.y1 + 0.1, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.16, 32]} />
        </mesh>
        <mesh material={m.paintDark} position={[-2.35, T.y1 + 0.2, 0]}>
          <boxGeometry args={[0.14, 0.08, 0.14]} />
        </mesh>
      </Part>

      {/* ── Huile (volume translucide) */}
      {showOil && (
        <Part id="huile" layer="cuve">
          <mesh material={m.oil} position={[TX, (T.y0 + T.y1) / 2 - 0.02, 0]} renderOrder={2}>
            <boxGeometry args={[TL - 2 * T.t, TH - 0.06, 2 * T.z - 2 * T.t]} />
          </mesh>
        </Part>
      )}

      {/* ── Cuve */}
      <Part id="cuve" layer="cuve" shell explode={[0, 0, 0]} label={[T.x1 - 0.2, 1.2, T.z + 0.05]}>
        <TankShell />
      </Part>
      <Part id="couvercle" layer="cuve" shell explode={[0, 1.9, 0]} label={[TX - 1.2, T.y1 + 0.1, 0.6]}>
        <mesh material={m.paint} position={[TX, T.y1 + 0.025, 0]}>
          <boxGeometry args={[TL + 0.08, 0.05, 2 * T.z + 0.08]} />
        </mesh>
        {[
          [T.x0 + 0.1, T.z - 0.05],
          [T.x1 - 0.1, T.z - 0.05],
          [T.x0 + 0.1, -T.z + 0.05],
          [T.x1 - 0.1, -T.z + 0.05],
        ].map(([x, z]) => (
          <LiftingLug key={`${x}${z}`} position={[x, T.y1 + 0.06, z]} />
        ))}
      </Part>

      {/* ── Traversées */}
      <Part id="traverseeHT" layer="partieActive" explode={[0, 2.8, -0.2]} label={[0, 4.5, -0.35]}>
        {POWER_ACTIVE.limbs.map((x) => (
          <Bushing key={x} position={[x, T.y1 + 0.05, -0.35]} height={1.45} rCore={0.085} rShed={0.17} sheds={15} dome />
        ))}
      </Part>
      <Part id="traverseeBT" layer="partieActive" explode={[0, 2.2, 0.2]} label={[1.32, 3.9, 0.45]}>
        {[...POWER_ACTIVE.limbs, 1.85].map((x) => (
          <Bushing key={x} position={[x, T.y1 + 0.05, 0.45]} height={0.5} rCore={0.065} rShed={0.12} sheds={5} />
        ))}
      </Part>

      {/* ── Conservateur, Buchholz, dessiccateur, soupape */}
      <Part id="conservateur" layer="accessoires" explode={[0, 2.2, -0.6]} label={[-0.4, 4.4, -1.0]}>
        <Conservator position={[-0.4, 4.0, -1.0]} length={2.8} radius={0.3} />
        {[-1.5, 0.7].map((x) => (
          <mesh key={x} material={m.paintDark} position={[x, 3.47, -0.88]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
          </mesh>
        ))}
        <Pipe points={[[0.3, 3.22, -0.55], [0.3, 3.5, -0.55], [0.3, 3.55, -0.98], [0.3, 3.72, -1.0]]} radius={0.04} />
      </Part>
      <Part id="buchholz" layer="accessoires" explode={[0, 2.2, -0.6]} label={[0.3, 3.75, -0.7]}>
        <Buchholz position={[0.3, 3.53, -0.76]} axis="z" />
      </Part>
      <Part id="dessiccateur" layer="accessoires" explode={[-0.4, 1.6, -0.6]} label={[-2.5, 1.2, -1.05]}>
        <Pipe points={[[-1.75, 3.85, -1.0], [-2.5, 3.85, -1.0], [-2.5, 1.62, -1.0]]} radius={0.018} flanges={false} />
        <Breather position={[-2.5, 1.4, -1.0]} />
      </Part>
      <Part id="soupape" layer="accessoires" explode={[0, 2.0, 0]} label={[1.85, 3.5, -0.4]}>
        <mesh material={m.paintDark} position={[1.85, T.y1 + 0.1, -0.4]}>
          <cylinderGeometry args={[0.12, 0.12, 0.12, 24]} />
        </mesh>
        <mesh material={m.yellow} position={[1.85, T.y1 + 0.18, -0.4]}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 24]} />
        </mesh>
      </Part>

      {/* ── Commande du régleur et armoire */}
      <Part id="commandeRegleur" layer="accessoires" explode={[-0.8, 0, 0]} label={[T.x0 - 0.25, 1.6, 0.3]}>
        <mesh material={m.cabinet} position={[T.x0 - 0.2, 1.35, 0.3]}>
          <boxGeometry args={[0.34, 0.85, 0.6]} />
        </mesh>
        <mesh material={m.steel} position={[T.x0 - 0.04, 1.35, 0.55]}>
          <boxGeometry args={[0.02, 0.12, 0.03]} />
        </mesh>
        <Pipe points={[[T.x0 - 0.2, 1.78, 0.3], [T.x0 - 0.2, T.y1 + 0.2, 0.3], [-2.35, T.y1 + 0.2, 0.3], [-2.35, T.y1 + 0.2, 0.08]]} radius={0.015} mat="steel" flanges={false} />
      </Part>
      <Part id="armoire" layer="accessoires" explode={[0.8, 0, 0]} label={[T.x1 + 0.3, 1.7, 0]}>
        <mesh material={m.cabinet} position={[T.x1 + 0.22, 1.3, 0]}>
          <boxGeometry args={[0.4, 1.0, 0.8]} />
        </mesh>
        <mesh material={m.paintDark} position={[T.x1 + 0.22, 1.85, 0]}>
          <boxGeometry args={[0.46, 0.05, 0.86]} />
        </mesh>
        <mesh material={m.steel} position={[T.x1 + 0.43, 1.3, 0.3]}>
          <boxGeometry args={[0.03, 0.15, 0.03]} />
        </mesh>
      </Part>
      <Part id="thermometre" layer="accessoires" explode={[0, 0, 0.5]} label={[1.98, 2.75, T.z + 0.1]}>
        <Dial position={[1.98, 2.55, T.z + 0.03]} />
        <Dial position={[1.98, 2.3, T.z + 0.03]} />
      </Part>

      {/* ── Socle */}
      <Part id="chassis" layer="cuve" explode={[0, -0.3, 0]}>
        {[0.6, -0.6].map((z) => (
          <mesh key={z} material={m.paintDark} position={[TX, 0.14, z]}>
            <boxGeometry args={[TL + 0.2, 0.26, 0.18]} />
          </mesh>
        ))}
      </Part>

      {/* ── Systèmes de refroidissement */}
      {usesRadiators(cooling) &&
        ([1, -1] as const).map((side) => (
          <Part key={'r' + side} id="radiateurs" layer="refroidissement" explode={[0, 0, side * 1.0]} label={side === 1 ? [BANK_X[2], 3.15, T.z + 0.5] : undefined}>
            {BANK_X.map((x) => <RadiatorBank key={x} {...bank(x, side)} />)}
          </Part>
        ))}
      {usesRadiators(cooling) &&
        usesFans(cooling) &&
        ([1, -1] as const).map((side) => (
          <Part key={'f' + side} id="ventilateurs" layer="refroidissement" explode={[0, -0.2, side * 1.0]} label={side === 1 ? [BANK_X[1], 0.25, T.z + 0.6] : undefined}>
            {BANK_X.map((x) => <RadiatorFans key={x} {...bank(x, side)} />)}
          </Part>
        ))}
      {usesAirCooler(cooling) && (
        <>
          <Part id="aerorefrigerant" layer="refroidissement" explode={[0, 0, 1.2]} label={[AC.xs[1], AC.cy + 0.95, AC.cz]}>
            {AC.xs.map((x) => (
              <group key={x} position={[x, AC.cy, AC.cz]}>
                <AirCooler width={AC.w} height={AC.h} depth={AC.d} legH={AC.cy - AC.h / 2} />
              </group>
            ))}
          </Part>
          <Part id="tuyauterie" layer="refroidissement" explode={[0, 0, 0.6]}>
            {AC.xs.map((x) => (
              <group key={x}>
                <Pipe points={[[x, 2.88, T.z], [x, 2.88, AC.cz - 0.055], [x, AC.cy + AC.h / 2 + 0.12, AC.cz - 0.055]]} radius={0.06} />
                <Valve position={[x, 2.88, T.z + 0.1]} radius={0.06} />
                <Pipe points={[[x, AC.cy - AC.h / 2 - 0.12, AC.cz - 0.055], [x, 0.62, AC.cz - 0.055], [x, 0.62, T.z]]} radius={0.06} />
                <Valve position={[x, 0.62, T.z + 0.1]} radius={0.06} />
              </group>
            ))}
          </Part>
          <Part id="pompe" layer="refroidissement" explode={[0, -0.2, 0.9]} label={[AC.xs[0], 0.95, T.z + 0.35]}>
            {AC.xs.map((x) => (
              <Pump key={x} position={[x, 0.62, T.z + 0.32]} rotation={[0, Math.PI / 2, 0]} />
            ))}
          </Part>
        </>
      )}
      {usesWater(cooling) && <WaterSystem />}
      {directed && (
        <Part id="collecteurOD" layer="refroidissement" explode={[0, -0.25, 0.35]} label={[-0.6, 0.45, 0.55]}>
          <DirectedManifold water={usesWater(cooling)} />
        </Part>
      )}
    </group>
  )
}

/** Parois, fond et raidisseurs de la cuve (solides fermés pour la coupe). */
function TankShell() {
  const m = mats()
  const stiffX = [-2.15, -1.08, 0.02, 1.05, 2.0]
  return (
    <group>
      {[1, -1].map((s) => (
        <mesh key={'w' + s} material={m.paint} position={[TX, (T.y0 + T.y1) / 2, s * (T.z - T.t / 2)]}>
          <boxGeometry args={[TL, TH, T.t]} />
        </mesh>
      ))}
      {[T.x0 + T.t / 2, T.x1 - T.t / 2].map((x) => (
        <mesh key={'e' + x} material={m.paint} position={[x, (T.y0 + T.y1) / 2, 0]}>
          <boxGeometry args={[T.t, TH, 2 * T.z - 2 * T.t]} />
        </mesh>
      ))}
      <mesh material={m.paint} position={[TX, T.y0 + 0.015, 0]}>
        <boxGeometry args={[TL, 0.03, 2 * T.z]} />
      </mesh>
      {/* Bride supérieure */}
      <mesh material={m.paint} position={[TX, T.y1 - 0.03, 0]}>
        <boxGeometry args={[TL + 0.08, 0.06, 2 * T.z + 0.08]} />
      </mesh>
      {/* Raidisseurs verticaux et ceinture */}
      {stiffX.map((x) =>
        [1, -1].map((s) => (
          <mesh key={`${x}${s}`} material={m.paint} position={[x, (T.y0 + T.y1) / 2, s * (T.z + 0.04)]}>
            <boxGeometry args={[0.1, TH - 0.1, 0.08]} />
          </mesh>
        )),
      )}
      {[1, -1].map((s) => (
        <mesh key={'b' + s} material={m.paint} position={[TX, 0.55, s * (T.z + 0.03)]}>
          <boxGeometry args={[TL, 0.08, 0.06]} />
        </mesh>
      ))}
      {/* Vanne de vidange et plaque signalétique */}
      <Valve position={[T.x1 - 0.25, 0.42, T.z + 0.06]} radius={0.04} />
      <mesh material={m.aluminium} position={[-2.35, 1.0, T.z + 0.01]}>
        <boxGeometry args={[0.35, 0.25, 0.01]} />
      </mesh>
    </group>
  )
}

/** Circuit huile/eau OFWF / ODWF. */
function WaterSystem() {
  return (
    <>
      <Part id="echangeurEau" layer="refroidissement" explode={[0, 0, 1.2]} label={[WC.x, WC.y + 0.45, WC.z]}>
        <group position={[WC.x, WC.y, WC.z]}>
          <WaterCooler length={WC.len} radius={WC.r} />
        </group>
      </Part>
      <Part id="tuyauterie" layer="refroidissement" explode={[0, 0, 0.6]}>
        {/* Huile chaude : haut de cuve → entrée calandre (côté +x) */}
        <Pipe points={[[WC.x + 0.6, 2.88, T.z], [WC.x + 0.6, 2.88, WC.z], [WC.x + 0.6, WC.y + WC.r, WC.z]]} radius={0.06} />
        <Valve position={[WC.x + 0.6, 2.88, T.z + 0.1]} radius={0.06} />
        {/* Huile refroidie : sortie calandre (côté −x) → pompe → bas de cuve */}
        <Pipe points={[[WC.x - 0.6, WC.y - WC.r, WC.z], [WC.x - 0.6, 0.5, WC.z], [WC.x - 0.6, 0.5, T.z]]} radius={0.06} />
        <Valve position={[WC.x - 0.6, 0.5, T.z + 0.1]} radius={0.06} />
      </Part>
      <Part id="pompe" layer="refroidissement" explode={[0, -0.2, 0.9]} label={[WC.x - 0.6, 0.85, 1.25]}>
        <Pump position={[WC.x - 0.6, 0.5, 1.3]} rotation={[0, Math.PI / 2, 0]} />
      </Part>
      <Part id="circuitEau" layer="refroidissement" explode={[0, 0, 1.5]} label={[WC.x + 1.0, 1.7, 2.3]}>
        {/* Eau froide : sol → boîte à eau −x */}
        <Pipe points={[[WC.x - 1.05, 0.06, 2.4], [WC.x - 1.05, 0.06, WC.z], [WC.x - 1.05, WC.y - 0.12, WC.z]]} radius={0.05} mat="blue" />
        {/* Eau réchauffée : boîte à eau +x → retour */}
        <Pipe points={[[WC.x + 1.05, WC.y + 0.12, WC.z], [WC.x + 1.05, 1.5, WC.z], [WC.x + 1.05, 1.5, 2.4], [WC.x + 1.05, 0.06, 2.4]]} radius={0.05} mat="blue" />
        <Valve position={[WC.x - 1.05, 0.3, WC.z]} radius={0.05} axis="y" />
      </Part>
    </>
  )
}

/** Collecteur interne de circulation dirigée : distribue l'huile pompée à la base de chaque enroulement. */
function DirectedManifold({ water }: { water: boolean }) {
  const inlet = water ? [WC.x - 0.6] : AC.xs
  const yIn = water ? 0.5 : 0.62
  return (
    <group>
      <Pipe points={[[-1.75, 0.55, 0.62], [1.6, 0.55, 0.62]]} radius={0.06} mat="pressboard" flanges={false} />
      {inlet.map((x) => (
        <Pipe key={x} points={[[x, yIn, T.z - 0.03], [x, yIn, 0.75], [x, 0.55, 0.66]]} radius={0.05} mat="pressboard" flanges={false} />
      ))}
      {POWER_ACTIVE.limbs.map((x) => (
        <group key={x}>
          {[1, -1].map((sx) => (
            <Pipe key={sx} points={[[x + sx * 0.2, 0.55, 0.6], [x + sx * 0.5, 0.62, 0.3], [x + sx * 0.53, WB - 0.04, 0.02]]} radius={0.035} mat="pressboard" flanges={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════ Trajectoires de fluides

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function powerFlows(cooling: CoolingId): FlowPath[] {
  const paths: FlowPath[] = []
  const L = POWER_ACTIVE.limbs
  const nearest = (x: number) => L.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a))
  const duct = (POWER_ACTIVE.lv[1] + POWER_ACTIVE.hv[0]) / 2
  const zc = -0.03 // trajectoires internes juste derrière le plan de coupe : visibles en coupe
  const directed = isDirected(cooling)
  const forcedOil = cooling !== 'ONAN' && cooling !== 'ONAF'
  const vOilN = 0.32
  const vOilF = 0.85

  // ── Boucles thermosiphon dans les enroulements (toujours présentes sauf OD où l'huile est dirigée)
  const windingLoop = (lx: number, sx: number, k: number): FlowPath => ({
    fluid: 'huile',
    points: [
      [lx + sx * duct, WB + 0.02, zc],
      [lx + sx * duct, (WB + WT) / 2, zc],
      [lx + sx * duct, WT - 0.02, zc],
      [lx + sx * 0.66, WT + 0.12, zc],
      [lx + sx * (0.66 + 0.02 * k), (WB + WT) / 2, zc],
      [lx + sx * 0.64, WB - 0.08, zc],
    ],
    temps: [0.3, 0.7, 0.95, 0.9, 0.6, 0.35],
    speed: vOilN * 0.8,
    count: 7,
    closed: true,
  })

  if (cooling === 'ONAN' || cooling === 'ONAF') {
    // Circuit complet : enroulements → haut de cuve → radiateur → bas de cuve
    let i = 0
    for (const bx of BANK_X) {
      for (const s of [1, -1] as const) {
        for (const k of [0, 1]) {
          const lx = nearest(bx)
          const sx = bx >= lx ? 1 : -1
          const zk = s * (T.z + 0.2 + (k ? 0.45 : 0.15))
          const ox = (rnd(i++) - 0.5) * 0.35
          paths.push({
            fluid: 'huile',
            points: [
              [lx + sx * duct, WB + 0.02, zc],
              [lx + sx * duct, (WB + WT) / 2, zc],
              [lx + sx * duct, WT - 0.02, zc],
              [lx + sx * 0.5, WT + 0.25, s * 0.3],
              [bx, 2.85, s * (T.z - 0.08)],
              [bx, 2.85, s * (T.z + 0.15)],
              [bx + ox, 2.78, zk],
              [bx + ox, (2.85 + 0.75) / 2, zk],
              [bx + ox, 0.82, zk],
              [bx, 0.75, s * (T.z + 0.15)],
              [bx, 0.75, s * (T.z - 0.1)],
              [lx + sx * 0.45, 0.8, s * 0.3],
            ],
            temps: [0.25, 0.65, 0.95, 1, 1, 0.98, 0.95, 0.55, 0.15, 0.12, 0.12, 0.18],
            speed: vOilN,
            count: 11,
            closed: true,
          })
        }
      }
    }
    // Air extérieur
    const fan = cooling === 'ONAF'
    let j = 0
    for (const bx of BANK_X) {
      for (const s of [1, -1] as const) {
        for (let k = 0; k < 3; k++) {
          const z = s * (T.z + 0.225 + 0.2 * k + 0.05 * rnd(j))
          const x = bx + (rnd(j++ + 50) - 0.5) * 0.4
          paths.push({
            fluid: 'air',
            points: fan
              ? [[x, 0.05, z], [x, 0.43, z], [x, 0.8, z], [x, 2.0, z], [x, 2.9, z], [x * 1.04, 3.9, z * 1.08]]
              : [[x, 0.45, z], [x, 0.8, z], [x, 2.0, z], [x, 2.9, z], [x, 3.6, z * 1.05]],
            temps: fan ? [0, 0, 0.05, 0.3, 0.45, 0.45] : [0, 0.05, 0.35, 0.55, 0.55],
            speed: fan ? 1.5 : 0.45,
            count: fan ? 7 : 5,
          })
        }
      }
    }
    return paths
  }

  // ── Circulation forcée ou dirigée
  if (!directed) for (const lx of L) for (const sx of [1, -1]) paths.push(windingLoop(lx, sx, (lx + sx) % 2))

  const air = usesAirCooler(cooling)
  const inlets = air ? AC.xs : [WC.x - 0.6]
  const outlets = air ? AC.xs : [WC.x + 0.6]
  const yRet = air ? 0.62 : 0.5

  // Portion extérieure : haut de cuve → échangeur → pompe → bas de cuve
  const external = (xo: number, xi: number, var_: number): { pts: [number, number, number][]; tmp: number[] } => {
    if (air) {
      const z = AC.cz - 0.055
      const pts: [number, number, number][] = [
        [xo, 2.88, T.z - 0.05],
        [xo, 2.88, z],
        [xo + var_ * 0.4, AC.cy + AC.h / 2 + 0.05, z],
        [xo + var_ * 0.4, AC.cy + AC.h * 0.2, z + 0.1 * var_],
        [xo - var_ * 0.3, AC.cy - AC.h * 0.15, z - 0.1 * var_],
        [xo, AC.cy - AC.h / 2 - 0.08, z],
        [xi, yRet, z],
        [xi, yRet, T.z + 0.32],
        [xi, yRet, T.z - 0.05],
      ]
      return { pts, tmp: [1, 1, 0.95, 0.6, 0.3, 0.15, 0.12, 0.12, 0.12] }
    }
    const pts: [number, number, number][] = [
      [xo, 2.88, T.z - 0.05],
      [xo, 2.88, WC.z],
      [xo, WC.y + WC.r * 0.6, WC.z],
      [WC.x + 0.3, WC.y - WC.r * 0.6, WC.z + 0.05 * var_],
      [WC.x, WC.y + WC.r * 0.6, WC.z - 0.05 * var_],
      [WC.x - 0.3, WC.y - WC.r * 0.6, WC.z],
      [xi, WC.y - WC.r * 0.8, WC.z],
      [xi, yRet, WC.z],
      [xi, yRet, 1.3],
      [xi, yRet, T.z - 0.05],
    ]
    return { pts, tmp: [1, 1, 0.95, 0.7, 0.45, 0.25, 0.15, 0.12, 0.12, 0.12] }
  }

  if (directed) {
    // Huile pompée → collecteur → base des enroulements → zigzag à travers les galettes → haut de cuve
    let i = 0
    for (const lx of L) {
      for (const sx of [1, -1]) {
        const xi = inlets[i % inlets.length]
        const xo = outlets[i % outlets.length]
        const var_ = i % 2 ? 1 : -1
        i++
        const ext = external(xo, xi, var_)
        const rIn = POWER_ACTIVE.hv[0] + 0.025
        const rOut = POWER_ACTIVE.hv[1] - 0.025
        const zig: [number, number, number][] = []
        const zigT: number[] = []
        const n = 6
        for (let k = 0; k <= n; k++) {
          const y = WB + 0.03 + ((WT - WB - 0.06) * k) / n
          const r = k % 2 === 0 ? rIn : rOut
          zig.push([lx + sx * r, y, zc])
          zigT.push(0.2 + (0.75 * k) / n)
        }
        paths.push({
          fluid: 'huile',
          points: [
            ...ext.pts,
            [xi, 0.55, 0.62],
            [lx + sx * 0.2, 0.55, 0.6],
            [lx + sx * 0.5, 0.62, 0.3],
            [lx + sx * 0.53, WB - 0.04, zc],
            ...zig,
            [lx + sx * 0.55, WT + 0.2, zc],
            [lx * 0.7 + xo * 0.3, 2.95, 0.4],
          ],
          temps: [...ext.tmp, 0.13, 0.14, 0.15, 0.18, ...zigT, 1, 1],
          speed: vOilF,
          count: 16,
          closed: true,
        })
      }
    }
  } else {
    // OF : l'huile pompée entre librement en bas de cuve ; une partie contourne la partie active.
    let i = 0
    for (const xo of outlets) {
      for (const xi of inlets) {
        for (const var_ of [1, -1]) {
          const ext = external(xo, xi, var_)
          const xb = xi + var_ * 0.35
          paths.push({
            fluid: 'huile',
            points: [
              ...ext.pts,
              [xb, 0.5, 0.72],
              [xb, 1.6, 0.76],
              [xb, 2.7, 0.74],
              [(xb + xo) / 2, 2.92, 0.6],
            ],
            temps: [...ext.tmp, 0.15, 0.45, 0.8, 0.95],
            speed: vOilF,
            count: 14,
            closed: true,
          })
          i++
        }
      }
    }
  }

  if (air) {
    // Air forcé à travers le faisceau ailetté (de la cuve vers l'extérieur)
    let j = 0
    for (const x of AC.xs) {
      for (let k = 0; k < 8; k++) {
        const ox = (rnd(j) - 0.5) * AC.w * 0.85
        const oy = (rnd(j++ + 9) - 0.5) * AC.h * 0.8
        paths.push({
          fluid: 'air',
          points: [
            [x + ox, AC.cy + oy, T.z + 0.12],
            [x + ox, AC.cy + oy, AC.cz - AC.d / 2],
            [x + ox, AC.cy + oy, AC.cz + AC.d / 2],
            [x + ox * 0.7, AC.cy + oy * 0.7, AC.cz + AC.d / 2 + 0.2],
            [x + ox * 1.3, AC.cy + oy * 1.2 + 0.3, AC.cz + 1.6],
          ],
          temps: [0, 0.02, 0.5, 0.5, 0.45],
          speed: 1.4,
          count: 5,
        })
      }
    }
  } else {
    // Eau : entrée froide côté −x, tubes, sortie réchauffée côté +x (contre-courant)
    for (let k = 0; k < 4; k++) {
      const oy = (k - 1.5) * 0.08
      paths.push({
        fluid: 'eau',
        points: [
          [WC.x - 1.05, 0.06, 2.4],
          [WC.x - 1.05, 0.06, WC.z],
          [WC.x - 1.05, WC.y + oy, WC.z],
          [WC.x - WC.len / 2, WC.y + oy, WC.z + oy * 0.5],
          [WC.x + WC.len / 2, WC.y + oy, WC.z + oy * 0.5],
          [WC.x + 1.05, WC.y + oy, WC.z],
          [WC.x + 1.05, 1.5, WC.z],
          [WC.x + 1.05, 1.5, 2.4],
          [WC.x + 1.05, 0.06, 2.4],
        ],
        temps: [0, 0, 0.02, 0.05, 0.5, 0.52, 0.52, 0.52, 0.52],
        speed: 1.0,
        count: 12,
      })
    }
  }
  void forcedOil
  return paths
}

export const POWER_VIEW = { target: [-0.25, 2.0, 0.2] as [number, number, number], radius: 4.6 }

import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, events as defaultEvents, useFrame, useThree, type RootState } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useApp } from '../store'
import { anim } from './anim'
import { heatMaterials, sectionUniform, mats } from './materials'
import { setDetail } from './geometry'
import { Flows } from './Flows'
import { PowerTransformer, powerFlows, POWER_VIEW } from './models/Power'
import { DistributionTransformer, distributionFlows, DIST_VIEW } from './models/Distribution'
import { MonophaseTransformer, monophaseFlows, MONO_VIEW } from './models/Monophase'
import { DryTransformer, dryFlows, DRY_VIEW } from './models/DryType'
import { usesFans } from '../data/cooling'
import { useTelemetry } from '../telemetry'
import type { CameraView, CoolingId, FlowPath, ModelId, Quality } from '../types'

export interface ModelDef {
  view: { target: [number, number, number]; radius: number }
  particle: number
  depth: number // demi-profondeur pour le plan de coupe
  flows: (c: CoolingId) => FlowPath[]
  render: (c: CoolingId) => ReactNode
}

export const MODELS: Record<ModelId, ModelDef> = {
  puissance: { view: POWER_VIEW, particle: 0.042, depth: 1.0, flows: powerFlows, render: (c) => <PowerTransformer cooling={c} /> },
  distribution: { view: DIST_VIEW, particle: 0.017, depth: 0.45, flows: distributionFlows, render: () => <DistributionTransformer /> },
  monophase: { view: MONO_VIEW, particle: 0.012, depth: 0.32, flows: monophaseFlows, render: () => <MonophaseTransformer /> },
  sec: { view: DRY_VIEW, particle: 0.016, depth: 0.32, flows: dryFlows, render: (c) => <DryTransformer cooling={c} /> },
}

export const QUALITY: Record<Quality, { dpr: [number, number]; shadows: boolean; shadowMap: number; detail: number; density: number; env: number }> = {
  performance: { dpr: [1, 1], shadows: false, shadowMap: 512, detail: 0.6, density: 0.6, env: 64 },
  equilibre: { dpr: [1, 1.5], shadows: true, shadowMap: 1024, detail: 1, density: 1, env: 128 },
  haute: { dpr: [1, 2], shadows: true, shadowMap: 2048, detail: 1.5, density: 1.3, env: 256 },
}

const VIEW_DIRS: Record<CameraView, [number, number, number]> = {
  avant: [0, 0.12, 1],
  arriere: [0, 0.12, -1],
  gauche: [-1, 0.12, 0],
  droite: [1, 0.12, 0],
  dessus: [0, 1, 0.0001],
  dessous: [0, -1, 0.0001],
  iso: [1, 0.75, 1.15],
}

/** Contrôleur de caméra : rejoue la vue demandée avec une transition douce. */
function CameraRig() {
  const ref = useRef<CameraControls>(null!)
  const model = useApp((s) => s.model)
  const view = useApp((s) => s.view)
  const nonce = useApp((s) => s.viewNonce)
  const exploded = useApp((s) => s.mode === 'eclate')
  const first = useRef(true)
  useEffect(() => {
    const def = MODELS[model].view
    // vue éclatée : recul et cible plus haute (les composants s'élèvent)
    const d = new THREE.Vector3(...VIEW_DIRS[view]).normalize().multiplyScalar(def.radius * (exploded ? 2.9 : 2.4))
    const [tx, ty0, tz] = def.target
    const ty = ty0 + (exploded ? def.radius * 0.3 : 0)
    ref.current?.setLookAt(tx + d.x, ty + d.y, tz + d.z, tx, ty, tz, !first.current)
    first.current = false
  }, [model, view, nonce, exploded])
  // API utilisée par le serveur de rendu distant (commandes caméra reçues du navigateur)
  useEffect(() => {
    const w = window as unknown as { __camera?: CameraControls }
    w.__camera = ref.current
  }, [])
  return <CameraControls ref={ref} makeDefault minDistance={0.3} maxDistance={30} dollySpeed={0.6} smoothTime={0.35} />
}

/** Plan de coupe global (mode « coupe »). */
function SectionPlane() {
  const { gl } = useThree()
  const mode = useApp((s) => s.mode)
  const offset = useApp((s) => s.sectionOffset)
  const model = useApp((s) => s.model)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), [])
  useEffect(() => {
    const on = mode === 'coupe'
    plane.constant = offset * MODELS[model].depth * 2
    gl.clippingPlanes = on ? [plane] : []
    sectionUniform.value = on ? 1 : 0
  }, [gl, mode, offset, model, plane])
  return null
}

/** Pilote d'animation : temps, éclatement, échauffement, ventilateurs. */
function Driver() {
  const reset = useApp((s) => s.resetNonce)
  useEffect(() => {
    anim.t = 0
    anim.heat = 0
  }, [reset])
  useFrame((_, dtRaw) => {
    const s = useApp.getState()
    const dt = Math.min(dtRaw, 0.05)
    const flowsOn = s.mode === 'refroidissement' || (s.mode === 'coupe' && s.playing)
    anim.running = flowsOn && s.playing
    if (anim.running) anim.t += dt * s.speed
    const targetE = s.mode === 'eclate' ? 1 : 0
    anim.explode = THREE.MathUtils.damp(anim.explode, targetE, 4, dt)
    const targetH = flowsOn ? Math.min(1, anim.t / 1.5) : 0
    anim.heat = THREE.MathUtils.damp(anim.heat, targetH, 3, dt)
    for (const [m, k] of heatMaterials()) m.emissiveIntensity = anim.heat * k
    if (anim.running && usesFans(s.cooling)) anim.fanAngle += dt * s.speed * 14
  })
  return null
}

/** Mesure réelle des performances et identification du GPU qui exécute le rendu. */
function Probe() {
  const { gl } = useThree()
  const set = useTelemetry((s) => s.set)
  const acc = useRef({ n: 0, t: 0 })
  useEffect(() => {
    const ctx = gl.getContext()
    const ext = ctx.getExtension('WEBGL_debug_renderer_info')
    const gpu = ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)
    const vendor = ext ? ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL) : ctx.getParameter(ctx.VENDOR)
    set({ gpu: String(gpu), vendor: String(vendor) })
  }, [gl, set])
  useFrame((_, dt) => {
    const a = acc.current
    a.n++
    a.t += dt
    if (a.t >= 1) {
      const size = gl.getDrawingBufferSize(new THREE.Vector2())
      set({
        fps: Math.round(a.n / a.t),
        frameMs: +((a.t / a.n) * 1000).toFixed(1),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        width: size.x,
        height: size.y,
      })
      a.n = 0
      a.t = 0
    }
  })
  return null
}

function ModelSwitch({ density }: { density: number }) {
  const model = useApp((s) => s.model)
  const cooling = useApp((s) => s.cooling)
  const mode = useApp((s) => s.mode)
  const playing = useApp((s) => s.playing)
  const def = MODELS[model]
  const flows = useMemo(() => def.flows(cooling), [def, cooling])
  const showFlows = mode === 'refroidissement' || (mode === 'coupe' && playing)
  return (
    <group key={model + cooling} name="model-root">
      {def.render(cooling)}
      {showFlows && <Flows paths={flows} size={def.particle} density={density} />}
    </group>
  )
}

function Lights({ q }: { q: Quality }) {
  const cfg = QUALITY[q]
  return (
    <>
      <hemisphereLight args={['#dce6f0', '#3a3530', 0.5]} />
      <directionalLight
        position={[6, 10, 7]}
        intensity={2.2}
        castShadow={cfg.shadows}
        shadow-mapSize={[cfg.shadowMap, cfg.shadowMap]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-6, 4, -5]} intensity={0.6} color="#c9d8ff" />
      {/* Environnement d'éclairage généré localement (aucun fichier HDR distant) */}
      <Environment resolution={cfg.env} frames={1}>
        <color attach="background" args={['#20252c']} />
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffe8c8" position={[3, 3, 6]} scale={2} />
      </Environment>
    </>
  )
}

function Ground() {
  const m = mats()
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow material={m.ground}>
        <circleGeometry args={[14, 64]} />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[28, 28]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#3b4450"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#56616e"
        fadeDistance={22}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
    </group>
  )
}

/** Ignore les intersections situées dans la partie retirée par le plan de coupe. */
export function clipFilter(items: THREE.Intersection[], state: RootState) {
  const planes = state.gl.clippingPlanes
  if (!planes.length) return items
  return items.filter((i) => planes.every((p) => p.distanceToPoint(i.point) >= 0))
}

/** Accès au graphe de scène pour le moteur distant (sélection par lancer de rayon). */
function Expose() {
  const { scene, camera, gl } = useThree()
  useEffect(() => {
    ;(window as unknown as { __r3f?: unknown }).__r3f = { scene, camera, gl }
  }, [scene, camera, gl])
  return null
}

export function Scene3D({ active, onCanvas, forceQuality, preserve }: { active: boolean; onCanvas?: (c: HTMLCanvasElement) => void; forceQuality?: Quality; preserve?: boolean }) {
  const userQuality = useApp((s) => s.quality)
  const quality = forceQuality ?? userQuality
  const cfg = QUALITY[quality]
  setDetail(cfg.detail)
  const select = useApp((s) => s.select)
  return (
    <Canvas
      key={quality}
      shadows={cfg.shadows ? 'soft' : false}
      dpr={cfg.dpr}
      frameloop={active ? 'always' : 'never'}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!preserve }}
      events={(store) => ({ ...defaultEvents(store), filter: clipFilter })}
      camera={{ fov: 38, near: 0.05, far: 200, position: [8, 6, 9] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
        onCanvas?.(gl.domElement)
      }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#1a1f26']} />
      <fog attach="fog" args={['#1a1f26', 18, 40]} />
      <Lights q={quality} />
      <Ground />
      <ModelSwitch density={cfg.density} />
      <CameraRig />
      <SectionPlane />
      <Driver />
      <Probe />
      <Expose />
    </Canvas>
  )
}

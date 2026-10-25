import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useApp } from '../store'
import { anim } from './anim'
import { mats } from './materials'
import { PARTS } from '../data/catalog'
import { IS_RENDERER, labelRegistry } from './labels'

const noRaycast = () => undefined
import type { LayerId } from '../types'

interface PartProps {
  /** Clé dans PARTS (catalogue des composants). */
  id: string
  layer: LayerId
  /** Déplacement en vue éclatée. */
  explode?: [number, number, number]
  /** Enveloppe extérieure : rendue translucide en vue intérieure / refroidissement. */
  shell?: boolean
  /** Position d'étiquette (repère local). */
  label?: [number, number, number]
  children: ReactNode
}

const tmp = new THREE.Vector3()

/**
 * Composant logique d'un modèle : gère la sélection, le survol, l'éclatement,
 * la transparence des enveloppes et le masquage par calque.
 */
export function Part({ id, layer, explode, shell, label, children }: PartProps) {
  const ref = useRef<THREE.Group>(null!)
  const visible = useApp((s) => s.layers[layer])
  const mode = useApp((s) => s.mode)
  const labels = useApp((s) => s.labels)
  const selected = useApp((s) => s.selectedPart === id)
  const select = useApp((s) => s.select)
  const hover = useApp((s) => s.hover)
  const ghost = shell && (mode === 'interieur' || mode === 'refroidissement' || mode === 'eclate')

  // Remplacement des matériaux par le matériau « fantôme » pour les enveloppes.
  useLayoutEffect(() => {
    const g = ref.current
    const ghostMat = mats().ghost
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      if (ghost) {
        if (!m.userData.orig) m.userData.orig = m.material
        m.material = ghostMat
        m.castShadow = false
        m.raycast = noRaycast // une enveloppe translucide ne doit pas bloquer la sélection
      } else if (m.userData.orig) {
        m.material = m.userData.orig
        m.castShadow = true
        m.raycast = (m as THREE.InstancedMesh).isInstancedMesh ? THREE.InstancedMesh.prototype.raycast : THREE.Mesh.prototype.raycast
      }
    })
  }, [ghost, children])

  // Ombres : activées pour tous les maillages opaques.
  useEffect(() => {
    ref.current.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !(m.material as THREE.Material).transparent) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [children])

  // Moteur distant : enregistrement des étiquettes (dessinées côté client)
  useEffect(() => {
    if (!IS_RENDERER || !label || !visible) return
    const key = id + ':' + label.join(',')
    labelRegistry.set(key, { name: PARTS[id]?.nom ?? id, obj: ref.current, local: new THREE.Vector3(...label) })
    return () => { labelRegistry.delete(key) }
  }, [id, label, visible])

  useFrame(() => {
    if (!explode) return
    tmp.set(explode[0], explode[1], explode[2]).multiplyScalar(anim.explode)
    ref.current.position.copy(tmp)
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hover(id)
    document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    hover(null)
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    select(selected ? null : id)
  }

  return (
    <group ref={ref} visible={visible} onPointerOver={visible ? onOver : undefined} onPointerOut={visible ? onOut : undefined} onClick={visible ? onClick : undefined} userData={{ partId: id }}>
      {children}
      {selected && visible && <SelectionBox target={ref} />}
      {labels && visible && label && !IS_RENDERER && (
        <Html position={label} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="part-label">{PARTS[id]?.nom ?? id}</div>
        </Html>
      )}
    </group>
  )
}

/** Boîte englobante ambrée autour du composant sélectionné. */
function SelectionBox({ target }: { target: React.RefObject<THREE.Group> }) {
  const helper = useRef<THREE.Box3Helper>(null!)
  const box = useRef(new THREE.Box3())
  useFrame(() => {
    const g = target.current
    if (!g || !helper.current) return
    helper.current.visible = false
    box.current.makeEmpty()
    g.updateWorldMatrix(true, true)
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.visible) box.current.expandByObject(m)
    })
    // repère local du groupe parent
    const inv = g.matrixWorld.clone().invert()
    box.current.applyMatrix4(inv)
    helper.current.visible = true
  })
  return <box3Helper ref={helper} args={[box.current, new THREE.Color('#f59e0b')]} />
}

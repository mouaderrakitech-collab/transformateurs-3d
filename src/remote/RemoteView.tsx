import { useEffect, useRef, useState } from 'react'
import { cloud, useCloud } from './cloud'
import { PARTS } from '../data/catalog'

/**
 * Affiche le flux vidéo rendu par le GPU distant et transmet les interactions
 * (rotation, zoom, déplacement, sélection) au moteur 3D distant.
 */
/** « ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 …, Vulkan …) » → « NVIDIA GeForce RTX 4090 » */
function shortGpu(s: string) {
  const m = s.match(/NVIDIA[^,()]*?(RTX|GeForce|Quadro|Tesla|A\d|L\d)[^,()]*/i)
  return (m ? m[0] : s).replace(/\s*\(0x[0-9a-f]+\)/i, '').trim().slice(0, 48)
}

export function RemoteView() {
  const video = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const st = useCloud()
  const [rect, setRect] = useState({ x: 0, y: 0, w: 1, h: 1 })
  const drag = useRef<{ x: number; y: number; btn: number; moved: boolean } | null>(null)
  const lastHover = useRef(0)

  useEffect(() => {
    cloud.setVideo(video.current)
    return () => cloud.setVideo(null)
  }, [])

  // Rectangle réellement occupé par l'image (object-fit: contain) pour convertir les coordonnées.
  useEffect(() => {
    const el = box.current!
    const update = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      const vw = st.stats.width || st.telemetry?.width || 16
      const vh = st.stats.height || st.telemetry?.height || 9
      const s = Math.min(W / vw, H / vh)
      setRect({ w: vw * s, h: vh * s, x: (W - vw * s) / 2, y: (H - vh * s) / 2 })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [st.stats.width, st.stats.height, st.telemetry?.width, st.telemetry?.height])

  const norm = (e: React.PointerEvent | React.WheelEvent) => {
    const b = box.current!.getBoundingClientRect()
    return { x: (e.clientX - b.left - rect.x) / rect.w, y: (e.clientY - b.top - rect.y) / rect.h }
  }
  const presenter = st.role === 'presenter'

  return (
    <div
      ref={box}
      className="absolute inset-0 select-none bg-black"
      style={{ cursor: presenter ? (st.hovered ? 'pointer' : 'grab') : 'default', touchAction: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (!presenter) return
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, btn: e.button, moved: false }
      }}
      onPointerMove={(e) => {
        if (!presenter) return
        const d = drag.current
        if (d) {
          const dx = e.clientX - d.x
          const dy = e.clientY - d.y
          if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true
          d.x = e.clientX
          d.y = e.clientY
          if (d.btn === 0 && !e.shiftKey) cloud.sendCam('rotate', (-dx / rect.w) * Math.PI * 2, (-dy / rect.h) * Math.PI)
          else cloud.sendCam('truck', -dx / rect.w, -dy / rect.h)
        } else if (performance.now() - lastHover.current > 120) {
          lastHover.current = performance.now()
          const p = norm(e)
          if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) cloud.sendPick(p.x, p.y, false)
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d && !d.moved && d.btn === 0) {
          const p = norm(e)
          cloud.sendPick(p.x, p.y, true)
        }
      }}
      onWheel={(e) => presenter && cloud.sendCam('dolly', -e.deltaY * 0.004, 0)}
    >
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-contain"
        style={{ display: st.transport === 'jpeg' ? 'none' : 'block' }}
        data-testid="remote-video"
      />
      {st.transport === 'jpeg' && st.jpegUrl && (
        <img src={st.jpegUrl} alt="Rendu distant" className="absolute inset-0 h-full w-full object-contain" draggable={false} />
      )}
      {/* Étiquettes projetées par le moteur distant, affichées en DOM (texte net) */}
      {st.labels.map((l) => (
        <div
          key={l.id}
          className="part-label pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: rect.x + l.x * rect.w, top: rect.y + l.y * rect.h }}
        >
          {l.name}
        </div>
      ))}
      {/* Indicateur permanent : qui calcule l'image, mesures réelles */}
      {(st.status === 'streaming' || st.status === 'fallback') && (
        <div className="pointer-events-none absolute left-3 top-16 z-10 rounded-lg border border-ok/50 bg-black/70 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink" data-testid="remote-hud">
          <div className="flex items-center gap-2 font-sans text-[13px] font-semibold text-ok">
            <span className="h-2 w-2 rounded-full bg-ok" /> GPU distant connecté
          </div>
          <div>{st.telemetry?.gpu ? shortGpu(st.telemetry.gpu) : '…'}{st.telemetry?.gpuUtil !== undefined ? ` · ${st.telemetry.gpuUtil} %` : ''}</div>
          {st.telemetry?.gpu && !/nvidia/i.test(st.telemetry.gpu) && (
            <div className="font-sans text-warn">⚠ Le moteur distant n’utilise pas un GPU NVIDIA</div>
          )}
          <div>
            Rendu {st.telemetry?.fps ?? '–'} i/s · Reçu {st.transport === 'jpeg' ? '≈10' : st.stats.fps || '–'} i/s
          </div>
          <div>
            {st.transport === 'jpeg' ? '1280×720 (secours)' : st.stats.width ? `${st.stats.width}×${st.stats.height}` : '–'} · latence {st.stats.latencyMs || '–'} ms
          </div>
        </div>
      )}
      {st.hovered && presenter && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/70 px-2 py-1 text-xs text-ink">
          {PARTS[st.hovered]?.nom}
        </div>
      )}
      {st.status !== 'streaming' && st.status !== 'fallback' && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/85">
          <div className="max-w-md rounded-lg border border-line bg-panel p-5 text-center">
            <div className="mb-2 text-lg font-semibold">
              {st.status === 'denied' ? 'Accès refusé' : st.status === 'unavailable' ? 'Serveur GPU indisponible' : 'Connexion au GPU distant…'}
            </div>
            <p className="text-sm text-ink-2">{st.message}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="btn" onClick={() => cloud.disconnect()}>Passer en rendu local</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

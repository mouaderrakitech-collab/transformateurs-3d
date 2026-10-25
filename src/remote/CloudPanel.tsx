import { useEffect, useState } from 'react'
import { cloud, isLocalLauncher, useCloud } from './cloud'
import { PROFILES, type StreamProfile } from './protocol'
import { useTelemetry, isSoftwareRenderer } from '../telemetry'

/**
 * Connexion à une session de rendu GPU distante.
 * Le site public ne peut PAS démarrer de GPU : il se connecte uniquement à une session
 * déjà démarrée par l'opérateur, à l'aide d'un jeton de session temporaire.
 */
export function CloudPanel() {
  const st = useCloud()
  const local = useTelemetry()
  const [url, setUrl] = useState(st.serverUrl)
  const [token, setToken] = useState('')
  const [launcher, setLauncher] = useState<{ available: boolean } | null>(null)

  // Lanceur USB : un serveur local peut proposer le démarrage d'une session (clé saisie à l'exécution).
  useEffect(() => {
    if (!isLocalLauncher()) return
    fetch('./api/launcher', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLauncher(j?.available ? j : null))
      .catch(() => setLauncher(null))
  }, [])

  const on = st.status !== 'off'
  const dot =
    st.status === 'streaming' ? 'bg-ok' : st.status === 'fallback' ? 'bg-warn' : st.status === 'off' ? 'bg-ink-3' : st.status === 'denied' || st.status === 'unavailable' ? 'bg-err' : 'bg-warn animate-pulse'

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 rounded border border-line bg-panel-2 px-2.5 py-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">
            {on ? `GPU Cloud${st.telemetry?.provider ? ' (' + st.telemetry.provider + ')' : ''} — ${st.role === 'viewer' ? 'spectateur' : 'présentateur'}` : 'Rendu local (GPU de ce PC)'}
          </div>
          <div className="truncate text-xs text-ink-3" title={st.message}>
            {on ? st.message : local.gpu}
          </div>
        </div>
      </div>

      {!on && (
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (url && token) cloud.connect(url, token)
          }}
        >
          <input
            className="w-full rounded border border-line bg-bg px-2 py-1.5 text-[13px]"
            placeholder="Lien de session ou adresse du serveur (https://…)"
            value={url}
            onChange={(e) => {
              // Lien complet collé (…#cloud=<adresse>&token=<jeton>) : extraire l'adresse et le jeton
              const v = e.target.value.trim()
              const h = v.includes('#') ? new URLSearchParams(v.split('#')[1]) : null
              if (h?.get('cloud') && h.get('token')) {
                setUrl(h.get('cloud')!)
                setToken(h.get('token')!)
              } else setUrl(e.target.value)
            }}
            aria-label="Lien de session ou adresse du serveur de rendu"
          />
          <input
            className="w-full rounded border border-line bg-bg px-2 py-1.5 font-mono text-[13px]"
            placeholder="Jeton de session"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-label="Jeton de session"
          />
          <button className="btn btn-primary w-full" disabled={!url || !token}>Se connecter au GPU Cloud</button>
          <p className="text-xs text-ink-3">
            Le jeton est fourni par l’opérateur lors du démarrage de la session (lien de session). Il expire avec la session.
          </p>
        </form>
      )}

      {on && (
        <>
          {st.role === 'presenter' && (
            <div className="grid grid-cols-1 gap-1">
              {(Object.keys(PROFILES) as StreamProfile[]).map((p) => (
                <button key={p} className={`btn justify-start ${st.profile === p ? 'on' : ''}`} onClick={() => cloud.setProfile(p)}>
                  {PROFILES[p].label}
                </button>
              ))}
            </div>
          )}
          <RemoteStats />
          <button className="btn w-full" onClick={() => cloud.disconnect()}>Se déconnecter (rendu local)</button>
        </>
      )}
      {!on && launcher && <LauncherStart />}
      {!on && isSoftwareRenderer(local.gpu) && (
        <p className="text-xs text-warn">Ce PC n’utilise pas de GPU matériel : préférez le rendu distant ou la qualité « Performance ».</p>
      )}
    </div>
  )
}

/** Mesures du flux et télémétrie du GPU distant (preuve que le rendu est calculé sur le GPU Cloud). */
export function RemoteStats() {
  const st = useCloud()
  const t = st.telemetry
  const rows: [string, string][] = [
    ['GPU de rendu', t?.gpu ?? '—'],
    ['Utilisation GPU', t?.gpuUtil !== undefined ? `${t.gpuUtil} %` : '—'],
    ['Mémoire GPU', t?.gpuMemMb !== undefined ? `${t.gpuMemMb} Mo` : '—'],
    ['Encodeur matériel', t?.encUtil !== undefined ? `${t.encUtil} %` : '—'],
    ['Images rendues (serveur)', t ? `${t.fps} i/s — ${t.width}×${t.height}` : '—'],
    ['Images reçues (ici)', st.stats.fps ? `${st.stats.fps} i/s — ${st.stats.width}×${st.stats.height}` : '—'],
    ['Débit', st.stats.kbps ? `${(st.stats.kbps / 1000).toFixed(1)} Mbit/s` : '—'],
    ['Aller-retour réseau', st.stats.rttMs ? `${st.stats.rttMs} ms` : '—'],
    ['Latence commande → réponse', st.stats.latencyMs ? `${st.stats.latencyMs} ms` : '—'],
    ['Transport', st.transport === 'webrtc' ? (st.relay ? 'WebRTC via TURN (TCP)' : 'WebRTC direct') : st.transport === 'jpeg' ? 'Secours WebSocket' : '—'],
    ['Arrêt auto. si inactif', t?.idleStopMin ? `${t.idleStopMin} min` : '—'],
    ['Fin de session max.', t?.sessionEndsAt ? new Date(t.sessionEndsAt).toLocaleTimeString('fr-FR') : '—'],
  ]
  return (
    <table className="w-full text-xs" data-testid="remote-stats">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="py-0.5 pr-2 text-ink-3">{k}</td>
            <td className="py-0.5 text-right font-mono text-ink">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Démarrage d'une session depuis le lanceur USB : la clé API RunPod est saisie ici,
 * transmise uniquement au serveur local (127.0.0.1) et gardée en mémoire le temps de l'appel.
 */
function LauncherStart() {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function call(action: 'start' | 'stop' | 'status', confirm = false) {
    setBusy(true)
    setMsg(action === 'start' ? 'Démarrage du pod GPU (plusieurs minutes)…' : '…')
    try {
      const r = await fetch('./api/launcher/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key, confirm }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Erreur')
      if (j.needsConfirm) {
        if (window.confirm(j.message)) return call(action, true)
        setMsg('Démarrage annulé.')
        return
      }
      setMsg(j.message)
      if (j.serverUrl && j.presenterToken) cloud.connect(j.serverUrl, j.presenterToken)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      if (action !== 'start' || confirm) setKey('')
    }
  }
  return (
    <div className="space-y-1.5 rounded border border-line p-2.5">
      <div className="text-[12px] font-semibold">Lanceur USB — démarrer une session GPU Cloud (RunPod, payant)</div>
      <input
        className="w-full rounded border border-line bg-bg px-2 py-1.5 font-mono text-[13px]"
        placeholder="Clé API RunPod (non enregistrée)"
        type="password"
        autoComplete="off"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <div className="grid grid-cols-3 gap-1">
        <button className="btn" disabled={busy || !key} onClick={() => call('status')}>État</button>
        <button className="btn btn-primary" disabled={busy || !key} onClick={() => call('start')}>Démarrer</button>
        <button className="btn" disabled={busy || !key} onClick={() => call('stop')}>Arrêter</button>
      </div>
      <p className="text-xs text-ink-3">Un démarrage crée une ressource payante. Coût affiché avant confirmation.</p>
      {msg && <p className="text-xs text-ink-2">{msg}</p>}
    </div>
  )
}

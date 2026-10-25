import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { RendererApp } from './remote/RendererApp'
import { IS_RENDERER } from './three/labels'
import { useApp } from './store'
import { useTelemetry } from './telemetry'
import { useCloud } from './remote/cloud'

// Accès aux états pour les tests automatisés et le diagnostic.
Object.assign(window, { __app: useApp, __tele: useTelemetry, __cloud: useCloud })

// ?renderer=1 : page « moteur de rendu » exécutée sur le GPU distant (aucune interface).
createRoot(document.getElementById('root')!).render(
  <StrictMode>{IS_RENDERER ? <RendererApp /> : <App />}</StrictMode>,
)

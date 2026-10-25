# Serveur de rendu distant

Tourne sur le pod GPU RunPod (image `mcr.microsoft.com/playwright:v1.64.1-noble`). Il fonctionne aussi en local pour les tests (`node render-server/server.mjs`).

Rôle :

1. Sert l’application construite (`../dist`) et l’état public `/health`.
2. Lance un Chromium à accélération GPU qui exécute la page moteur `?renderer=1` : la même scène Three.js que la présentation, rendue en 1920×1080.
3. Relaie la signalisation WebRTC entre la page moteur et les navigateurs (présentateur, spectateurs).
4. Publie la télémétrie `nvidia-smi` (utilisation GPU, mémoire, encodeur, processus Chromium sur le GPU).
5. Arrête le pod après inactivité ou à la durée maximale.

## Variables d’environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `8080` | Port HTTP/WS (exposé en `8080/http` via le proxy RunPod) |
| `PRESENTER_TOKEN` | aléatoire | Jeton présentateur (pilote la scène) |
| `VIEWER_TOKEN` | aléatoire | Jeton spectateur (regarde seulement) |
| `TURN_SECRET` | — | Secret partagé avec coturn (identifiants TURN temporaires, valables 4 h) |
| `TURN_PUBLIC_HOST` / `TURN_PUBLIC_PORT` | `RUNPOD_PUBLIC_IP` / `RUNPOD_TCP_PORT_3478` | Adresse publique du relais TURN/TCP |
| `FORCE_RELAY` | `1` si TURN configuré | Les clients passent par le relais TURN (obligatoire sur RunPod : pas d’UDP) |
| `IDLE_STOP_MIN` | `15` | Arrêt du pod après N minutes sans client (0 = désactivé) |
| `MAX_SESSION_MIN` | `180` | Durée maximale de la session (0 = désactivé) |
| `PROFILE` | `balanced` | Profil initial : `high` (1080p/60), `balanced` (1080p/30), `low` (720p/30) |
| `GPU_FLAGS` | — | Force les options Chromium (sinon essai automatique Vulkan → EGL) |
| `CHROME_PATH` | auto | Exécutable Chromium (sinon `/ms-playwright/chromium-*`) |

`RUNPOD_POD_ID` et `RUNPOD_API_KEY` sont injectés par RunPod dans chaque pod. Cette clé est limitée au pod lui-même, et le serveur ne l’utilise que pour s’arrêter.

## Sécurité

- Jetons comparés à temps constant. Blocage d’une IP pendant 60 s après 5 échecs.
- Le rôle (présentateur ou spectateur) est fixé par le serveur, jamais par le client.
- Le moteur ne s’authentifie que depuis `127.0.0.1`, avec une clé aléatoire propre au processus.
- `/health` n’expose aucun secret.

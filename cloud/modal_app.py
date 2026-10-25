"""
Fournisseur GPU Cloud « Modal » (crédits gratuits mensuels du plan Starter).

Exécute le MÊME serveur de rendu que RunPod (render-server/) sur un GPU NVIDIA Modal :
  • tunnel HTTPS  → port 8080 (présentation, /health, signalisation WebSocket)
  • tunnel TCP    → port 3478 (relais TURN/TCP pour le flux WebRTC)

Utilisation (poste opérateur, après `modal token new`) :
    npm run build
    cloud\\.venv\\Scripts\\modal run cloud/modal_app.py                 (GPU T4 par défaut)
    cloud\\.venv\\Scripts\\modal run cloud/modal_app.py --gpu L4 --minutes 90

La session s'arrête : en fermant le terminal (Ctrl+C), après IDLE minutes sans client,
ou au bout de MINUTES minutes. Aucune clé n'est écrite dans le projet : l'authentification
Modal est gérée par la CLI Modal dans le profil de l'utilisateur (~/.modal.toml).
"""

import json
import os
import secrets
import subprocess
import time
import urllib.parse
import urllib.request
import webbrowser
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SITE = "https://mouaderrakitech-collab.github.io/transformateurs-3d/"

image = (
    modal.Image.from_registry("mcr.microsoft.com/playwright:v1.64.1-noble", add_python="3.12")
    .apt_install("coturn", "libvulkan1", "libegl1", "libgl1", "vulkan-tools")
    .env({"NVIDIA_DRIVER_CAPABILITIES": "all", "DIST_DIR": "../dist", "DEBIAN_FRONTEND": "noninteractive"})
    .add_local_dir(ROOT / "render-server", "/app/render-server", copy=True)
    .add_local_dir(ROOT / "dist", "/app/dist", copy=True, ignore=["media", "media/**", "render-bundle.tgz"])
    # fins de ligne Unix (copie depuis Windows) puis dépendances du serveur
    .run_commands(
        "sed -i 's/\\r$//' /app/render-server/start.sh",
        "cd /app/render-server && npm install --omit=dev --no-audit --no-fund --loglevel=error",
    )
)

app = modal.App("transformateurs-3d-rendu", image=image)


@app.function(gpu="T4", timeout=4 * 3600, max_containers=1)
def session(q: modal.Queue, minutes: int, idle: int, site: str):
    tokens = {
        "presenter": secrets.token_urlsafe(24),
        "viewer": secrets.token_urlsafe(18),
        "turn": secrets.token_urlsafe(24),
    }
    with modal.forward(8080) as web, modal.forward(3478, unencrypted=True) as turn:
        turn_host, turn_port = turn.tcp_socket
        env = {
            **os.environ,
            "PRESENTER_TOKEN": tokens["presenter"],
            "VIEWER_TOKEN": tokens["viewer"],
            "TURN_SECRET": tokens["turn"],
            "TURN_PUBLIC_HOST": turn_host,
            "TURN_PUBLIC_PORT": str(turn_port),
            "FORCE_RELAY": "1",
            "IDLE_STOP_MIN": str(idle),
            "MAX_SESSION_MIN": str(minutes),
            "CLOUD_PROVIDER": "Modal",
            "PROFILE": "balanced",
        }
        proc = subprocess.Popen(["bash", "/app/render-server/start.sh"], env=env)
        health = None
        for _ in range(300):
            if proc.poll() is not None:
                break
            try:
                with urllib.request.urlopen("http://127.0.0.1:8080/health", timeout=3) as r:
                    health = json.load(r)
                    if health.get("rendererReady"):
                        break
            except Exception:
                pass
            time.sleep(2)
        base = site.rstrip("/") + "/"
        server = web.url.rstrip("/")
        q.put(
            {
                "ready": bool(health and health.get("rendererReady")),
                "health": health,
                "server": server,
                "turn": f"{turn_host}:{turn_port}",
                "presenter": f"{base}#cloud={urllib.parse.quote(server, safe='')}&token={tokens['presenter']}",
                "viewer": f"{base}#cloud={urllib.parse.quote(server, safe='')}&token={tokens['viewer']}",
            }
        )
        proc.wait()  # le serveur s'arrête seul (inactivité, durée max.) ; le conteneur se termine alors


@app.local_entrypoint()
def main(gpu: str = "T4", minutes: int = 120, idle: int = 15, site: str = DEFAULT_SITE, open_browser: bool = True):
    print(f"Démarrage d'une session GPU Cloud Modal ({gpu}, max. {minutes} min, arrêt après {idle} min sans client)…")
    with modal.Queue.ephemeral() as q:
        call = session.with_options(gpu=gpu).spawn(q, minutes, idle, site)
        info = q.get(timeout=1200)
        h = info.get("health") or {}
        if not info["ready"]:
            print("ÉCHEC : le moteur de rendu n'a pas démarré. Consulter les journaux : modal app logs transformateurs-3d-rendu")
            call.cancel()
            return
        print(f"\nMoteur prêt — GPU : {h.get('gpu')}")
        if h.get("softwareRendering"):
            print("ATTENTION : rendu LOGICIEL (le GPU n'est pas utilisé par le navigateur moteur).")
        print(f"Serveur : {info['server']}   TURN/TCP : {info['turn']}")
        print("\nLien PRÉSENTATEUR (ne pas diffuser) :\n  " + info["presenter"])
        print("\nLien SPECTATEUR :\n  " + info["viewer"])
        print("\nCtrl+C ou fermeture de ce terminal = fin de la session GPU.")
        if open_browser:
            webbrowser.open(info["presenter"])
        call.get()
    print("Session terminée.")

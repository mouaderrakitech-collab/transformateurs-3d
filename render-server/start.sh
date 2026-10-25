#!/usr/bin/env bash
# Démarrage sur le pod RunPod (image mcr.microsoft.com/playwright:v1.64.1-noble).
# Appelé par la commande de démarrage du pod après téléchargement du paquet.
set -euo pipefail
cd "$(dirname "$0")"
echo "[start] $(date -u +%T) préparation du pod ${RUNPOD_POD_ID:-local}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# coturn : relais TURN sur TCP (RunPod n'expose pas l'UDP). libvulkan1 / libegl1 : rendu GPU de Chromium.
apt-get install -y -qq --no-install-recommends coturn libvulkan1 libegl1 libgl1 vulkan-tools >/dev/null || true

# Bibliothèques graphiques NVIDIA (GL/EGL/Vulkan) : certains fournisseurs (Modal…) ne montent que les
# bibliothèques de calcul. On installe le paquet correspondant à la version majeure du pilote de l'hôte.
DRV=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1 | cut -d. -f1 || true)
if [ -n "$DRV" ] && ! ldconfig -p | grep -q libGLX_nvidia; then
  echo "[start] pilote $DRV sans bibliothèques graphiques : installation de libnvidia-gl-$DRV"
  apt-get install -y -qq --no-install-recommends "libnvidia-gl-$DRV" >/dev/null 2>&1 \
    || apt-get install -y -qq --no-install-recommends "libnvidia-gl-$DRV-server" >/dev/null 2>&1 \
    || echo "[start] libnvidia-gl-$DRV indisponible : risque de rendu logiciel (signalé dans la présentation)"
  ldconfig || true
fi

# Fichiers ICD NVIDIA (Vulkan / EGL) s'ils ne sont pas fournis par le conteneur.
NV_GLX=$(ldconfig -p | grep -m1 -o '/[^ ]*libGLX_nvidia.so.0' || true)
NV_EGL=$(ldconfig -p | grep -m1 -o '/[^ ]*libEGL_nvidia.so.0' || true)
if [ -n "$NV_GLX" ] && [ ! -f /usr/share/vulkan/icd.d/nvidia_icd.json ] && [ ! -f /etc/vulkan/icd.d/nvidia_icd.json ]; then
  mkdir -p /usr/share/vulkan/icd.d
  printf '{"file_format_version":"1.0.0","ICD":{"library_path":"%s","api_version":"1.3.0"}}\n' "$NV_GLX" > /usr/share/vulkan/icd.d/nvidia_icd.json
fi
if [ -n "$NV_EGL" ] && [ ! -f /usr/share/glvnd/egl_vendor.d/10_nvidia.json ]; then
  mkdir -p /usr/share/glvnd/egl_vendor.d
  printf '{"file_format_version":"1.0.0","ICD":{"library_path":"%s"}}\n' "$NV_EGL" > /usr/share/glvnd/egl_vendor.d/10_nvidia.json
fi
echo "[start] GLX=${NV_GLX:-absent} EGL=${NV_EGL:-absent}"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader || echo "[start] nvidia-smi indisponible"
(vulkaninfo --summary 2>/dev/null | grep -E 'deviceName|driverName' | head -4) || true

# TURN (TCP 3478). Pas d'« external-ip » : l'adresse relayée doit rester joignable depuis le moteur local.
if [ -n "${TURN_SECRET:-}" ]; then
  cat > /tmp/turnserver.conf <<EOF
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=${TURN_SECRET}
realm=transformateurs3d
no-tls
no-dtls
no-cli
no-multicast-peers
min-port=49152
max-port=49999
total-quota=50
stale-nonce=600
log-file=stdout
simple-log
EOF
  turnserver -c /tmp/turnserver.conf >/tmp/turn.log 2>&1 &
  echo "[start] coturn lancé (public : ${RUNPOD_PUBLIC_IP:-?}:${RUNPOD_TCP_PORT_3478:-?})"
fi

npm install --omit=dev --no-audit --no-fund --loglevel=error
export DIST_DIR=../dist
exec node server.mjs

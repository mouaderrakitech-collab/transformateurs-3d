# RunPod : configuration, démarrage, arrêt, coûts

## 1. Outils (guide officiel https://agents.runpod.io/)

À exécuter par l’utilisateur (installation refusée en mode automatique pendant le développement) :

```
claude plugin marketplace add runpod/runpod-plugins-official
claude plugin install runpod@runpod
```

Puis, dans Claude Code : `/reload-plugins`, `/mcp`, choisir **runpod**, puis **Sign in with Runpod** (OAuth : aucune clé créée ni stockée).

Ce projet n’a **pas besoin** du plugin pour fonctionner : l’outil `cloud/runpod.mjs` et le lanceur USB appellent directement l’API REST officielle (`https://rest.runpod.io/v1`).

## 2. Préparation (une fois)

1. **Approvisionner le compte RunPod.** Au 25/10/2026 le solde est de 0 $ : aucun pod ne peut démarrer.
2. **Vérifier le plafond de dépense** du compte (actuellement 80 $/h, valeur par défaut). Le réduire est recommandé, par exemple à 2 $/h.
3. **Publier le site** (GitHub Pages) : il héberge aussi `render-bundle.tgz`, téléchargé par le pod au démarrage.
4. **Révoquer la clé API** communiquée en clair pendant le développement et en créer une nouvelle, de portée minimale.

## 3. Démarrer une session (opérateur)

Depuis un poste avec Node.js :

```
set PUBLIC_SITE_URL=https://<compte>.github.io/<dépôt>/
set RENDER_BUNDLE_URL=https://<compte>.github.io/<dépôt>/render-bundle.tgz
node cloud/runpod.mjs estimate      :: coût estimé, gratuit
node cloud/runpod.mjs start         :: demande la clé (masquée) puis la confirmation « OUI »
```

Ou depuis la clé USB : **Réglages › Rendu GPU distant › Lanceur USB** (clé saisie dans l’interface, coût affiché avant confirmation).

Ce qui se passe :

1. Création d’un pod Secure Cloud. GPU par ordre de priorité : RTX A5000, A4500, A4000, RTX 4090, L4 (tous avec pilotes graphiques et NVENC).
2. Le pod télécharge le paquet, installe coturn, configure Vulkan/EGL NVIDIA, puis lance le serveur et le moteur. Durée prévue : quelques minutes, non mesurée tant que le compte n’est pas approvisionné.
3. L’outil attend `/health → rendererReady` puis affiche :
   - le **lien présentateur** (ne pas diffuser) ;
   - le **lien spectateur** (peut être partagé avec le public).
4. Si le GPU du pod n’est pas utilisé (rendu logiciel), la console et l’interface l’affichent (`softwareRendering`).

## 4. Pendant la présentation

**Réglages › Rendu GPU distant** affiche des mesures réelles :

- le GPU de rendu (chaîne WebGL du moteur distant) ;
- l’utilisation GPU, la mémoire et l’encodeur (`nvidia-smi`) ;
- les images rendues côté serveur et les images reçues ;
- le débit, l’aller-retour réseau et la latence commande → réponse ;
- le transport (WebRTC via TURN ou secours) et l’heure d’arrêt automatique.

Profils : Haute qualité (1080p/60), Équilibré (1080p/30), Faible débit (720p/30). Choisir selon les mesures affichées.

## 5. Arrêter

```
node cloud/runpod.mjs stop     :: supprime tous les pods « transformateurs-3d-* »
node cloud/runpod.mjs status   :: vérifier : « Aucune session en cours »
```

Ou bien le bouton **Arrêter** du lanceur USB. Il existe aussi des sécurités automatiques sur le pod : arrêt après 15 min sans client et au plus tard après 150 min (`IDLE_STOP_MIN`, `MAX_SESSION_MIN`).

## 6. Coût estimé (prix relevés le 25/10/2026, Secure Cloud, à revérifier avec `estimate`)

| GPU | VRAM | Prix | 1 h de présentation + 10 min de démarrage |
|---|---|---|---|
| RTX A5000 | 24 Go | 0,27 $/h | ≈ 0,32 $ |
| RTX A4500 | 20 Go | 0,25 $/h | ≈ 0,29 $ |
| RTX A4000 | 16 Go | 0,25 $/h | ≈ 0,29 $ |
| RTX 4090 | 24 Go | 0,89 $/h | ≈ 1,04 $ |
| L4 | 24 Go | 0,59 $/h | ≈ 0,69 $ |

Le disque conteneur (20 Go) est inclus pendant l’exécution. Il n’y a aucun volume persistant, donc aucun coût après suppression du pod. Coût maximal d’une session avec le GPU le plus cher et la durée maximale : 2,23 $.

## 7. Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| « Serveur GPU injoignable » | pod arrêté ou en démarrage | `status` ; attendre ou relancer |
| « moteur en démarrage » prolongé | installation ou téléchargement du paquet | consulter les journaux du pod (console RunPod) |
| Flux en « Secours WebSocket » | TURN/TCP bloqué par le réseau | utiliser une autre connexion (partage 4G) ou accepter le mode secours |
| `softwareRendering: true` | pilotes graphiques non exposés au conteneur | vérifier `NVIDIA_DRIVER_CAPABILITIES=all`, les journaux `[start] GLX=… EGL=…`, essayer `GPU_FLAGS` |
| « Jeton refusé » | session redémarrée (nouveaux jetons) | utiliser le nouveau lien |

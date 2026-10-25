# Architecture technique

## Vue d’ensemble

Une seule application React + TypeScript, utilisable de trois façons :

| Usage | Rendu 3D | Diapositives | Hébergement |
|---|---|---|---|
| Lien public (GitHub Pages) | GPU RunPod (flux vidéo) ou GPU local | intégrées | `https://<compte>.github.io/<dépôt>/` |
| Clé USB (version portable) | GPU RunPod ou GPU local | intégrées | serveur local `127.0.0.1` (Node.js embarqué) |
| Sans Internet | GPU local ; sinon images/vidéos précalculées | intégrées | clé USB, ou `autonome.html` (sans serveur) |

```
 Navigateur (présentation)                       Pod RunPod (GPU NVIDIA)
 ┌───────────────────────────┐                   ┌─────────────────────────────────────────┐
 │ Diapositives, panneaux    │  HTTPS /health    │ render-server/server.mjs (Node.js)      │
 │ Commandes (store Zustand) │ ───────────────►  │  • fichiers de l’application            │
 │                           │  WSS /ws?token=   │  • signalisation WebRTC, rôles, jetons  │
 │ RemoteView <video>        │ ◄──────────────►  │  • télémétrie nvidia-smi, arrêt auto    │
 │  souris → commandes       │  (proxy RunPod)   │                 │ WS local              │
 │                           │                   │  Chromium GPU (Playwright, headless)    │
 │                           │   WebRTC vidéo    │   page ?renderer=1 : scène Three.js     │
 │                           │ ◄══ + canal ════► │   canvas.captureStream → piste vidéo    │
 │                           │   de données      │                 │                       │
 └───────────────────────────┘   via TURN/TCP    │  coturn (TCP 3478, port TCP public)     │
                                                 └─────────────────────────────────────────┘
```

## Choix du moteur de rendu distant

**Unreal Engine Pixel Streaming 2 (étudié, non retenu pour cette version).**

| Critère | Pixel Streaming 2 | Solution retenue (Chromium GPU + WebRTC) |
|---|---|---|
| Contenu 3D | à reconstruire dans Unreal (projet, matériaux, animations, interface de commande) | même scène que la présentation locale : un seul code |
| Chaîne de production | éditeur Unreal + compilation Linux (environ 100 Go d’outils), compte Epic | `npm run build` |
| Encodage | NVENC matériel | encodeur WebRTC de Chromium (logiciel sous Linux, voir les limites) |
| Réseau RunPod | WebRTC UDP impossible : TURN/TCP nécessaire | identique : TURN/TCP sur port TCP public |
| Mode local / hors ligne | non (rendu serveur uniquement) | oui, même code |
| Vérifiable ici | non (pas d’Unreal sur le poste de développement) | oui, chaîne testée de bout en bout en local |

La solution retenue calcule bien le rendu sur le GPU distant : la scène, les matériaux, l’éclairage, les ombres, les animations et les coupes s’exécutent dans le Chromium du pod. Le navigateur du public ne reçoit qu’un flux vidéo. La télémétrie affichée à l’écran (chaîne `UNMASKED_RENDERER` WebGL du moteur, `nvidia-smi`, processus Chromium présent sur le GPU) permet de le vérifier pendant la présentation.

Pixel Streaming 2 reste une évolution possible si l’encodage NVENC devient indispensable (60 i/s à 1080p pour de nombreux spectateurs). Il faudrait alors porter les modèles en GLB (export intégré à l’application) puis reconstruire la logique de scène dans Unreal.

## Réseau

- **Proxy HTTP RunPod** (`https://<pod>-8080.proxy.runpod.net`) : HTTPS et WSS valides. Utilisé pour `/health` et la signalisation. Il ne transporte pas les médias WebRTC (UDP/SRTP).
- **TCP public** (port 3478 mappé sur un port public aléatoire) : coturn en TURN/TCP. Les clients utilisent `iceTransportPolicy: relay`, et le média passe en TCP jusqu’au pod. Les identifiants TURN sont temporaires (HMAC, 4 h) et délivrés seulement aux clients authentifiés.
- **Mode de secours** : si WebRTC échoue (pare-feu d’entreprise), les images JPEG 720p passent par le WebSocket du proxy (≈ 10 i/s). Les commandes restent prioritaires : la file d’images est bornée.
- **Maintien de connexion** : message périodique pour éviter la fermeture des WebSocket inactifs par le proxy.
- **Reconnexion** : reprise automatique avec attente croissante (2 s → 15 s). Le message affiché distingue « pas d’Internet », « serveur arrêté », « moteur en démarrage » et « jeton refusé ».

## Sessions et sécurité

- Le **site public ne démarre jamais de GPU**. Il se connecte seulement à une session existante avec un **jeton temporaire** transmis dans le fragment d’URL (`#cloud=…&token=…`). Le fragment n’est pas envoyé à GitHub et il est effacé de la barre d’adresse.
- **Présentateur** : pilote la scène et les diapositives. **Spectateur** : reçoit le flux et suit les diapositives du présentateur, sans rien piloter. Le rôle est imposé par le serveur.
- **Clé API RunPod** : jamais dans le dépôt, le site, le paquet de rendu ni la clé USB. Elle est saisie à l’exécution (outil opérateur ou lanceur USB), gardée en mémoire le temps de l’appel, puis oubliée.
- **Coûts** : confirmation obligatoire avec affichage du prix horaire. Arrêt automatique après inactivité (15 min par défaut) et à la durée maximale (150 min). Pas de volume persistant. Plafond de dépense du compte RunPod.
- **API du lanceur USB** : écoute sur `127.0.0.1` uniquement, avec vérification de l’origine (une page web tierce ne peut pas l’appeler).

## Code source

```
src/
  data/        contenu pédagogique : refroidissements (IEC 60076-2/-11), types, composants, diapositives, références
  three/       moteur 3D : matériaux PBR, géométries paramétriques, composants industriels, 4 modèles, flux, scène
  ui/          interface : sommaire, panneaux, scène centrale, schémas SVG, tableaux, import PDF, mode de secours
  remote/      rendu distant : protocole, client (présentation), moteur (page ?renderer=1), vue vidéo
render-server/ serveur du pod (Node.js) + script de démarrage (coturn, ICD NVIDIA)
cloud/         outil opérateur RunPod (estimation, démarrage, état, arrêt)
launcher/      lanceur local (USB et poste de développement)
scripts/       construction (paquet de rendu, version portable, médias) et tests automatisés
```

### Modèles 3D

Les modèles sont **paramétriques** : ils sont générés par le code au chargement (aucun fichier à télécharger), à partir de composants industriels réels.

- circuit magnétique à colonnes en gradins (solide extrudé), culasses, armatures et tirants
- enroulements BT/HT concentriques en galettes, cylindres isolants, rondelles de guidage (OD)
- cuve à raidisseurs, couvercle, traversées à ailettes (profil de révolution), conservateur, Buchholz, dessiccateur, soupape, changeur de prises en charge et sa commande, armoire
- radiateurs à éléments (instanciés), ventilateurs hélicoïdes à grille, aéroréfrigérants à tubes ailetés, motopompes, échangeur huile/eau à faisceau tubulaire, ventilateurs tangentiels (sec AF)

Les composants n’apparaissent que s’ils correspondent au mode de refroidissement choisi : radiateurs pour ON, aéroréfrigérants et pompes pour OF/OD, échangeur et circuit d’eau pour W, collecteur dirigé pour D. Ils sont exportables en GLB (bouton « Exporter GLB ») pour être repris dans Blender.

### Modes d’affichage

- **Extérieur.**
- **Intérieur** : enveloppes translucides et non sélectionnables, huile visible.
- **Éclatée** : déplacements interpolés par composant, culasse supérieure levée.
- **Coupe** : plan de coupe global réglable. Les faces coupées sont remplies d’un hachurage par un correctif de shader, et la sélection ignore la partie retirée.
- **Refroidissement** : particules instanciées sur des trajectoires, couleur = température relative, flèches de sens, lueur d’échauffement des enroulements, ventilateurs animés.

### Performances (mesurées, voir TESTS.md)

- Géométries mises en cache et partagées. Éléments de radiateur instanciés. Grilles de ventilateurs et ailettes de pompes fusionnées.
- Trois niveaux de qualité : résolution, ombres, finesse des géométries, densité des particules.
- Rendu suspendu quand la scène n’est pas visible (diapositives de schémas) et quand l’onglet est masqué.
- En rendu distant, le canevas local est démonté : le GPU du PC n’est plus sollicité.

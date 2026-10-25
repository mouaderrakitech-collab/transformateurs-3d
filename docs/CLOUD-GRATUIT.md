# Rendu GPU Cloud : fournisseurs et solutions gratuites

Recherche effectuée le 25/10/2026. Budget : 0 €.

## Architecture multi-fournisseurs

Le rendu GPU Cloud ne dépend d’aucun fournisseur. La même pièce tourne partout : `render-server/`, c’est-à-dire un serveur Node.js, Chromium GPU et coturn. Un fournisseur n’a qu’à fournir quatre choses :

1. un GPU NVIDIA avec bibliothèques graphiques (GL/EGL/Vulkan), pas seulement CUDA ;
2. une adresse **HTTPS** vers le port 8080 (présentation, `/health`, WebSocket) ;
3. un **port TCP** public vers le port 3478 (relais TURN du flux WebRTC). Sans lui, on passe en secours par images via le WebSocket ;
4. un moyen d’arrêter la machine (le serveur s’arrête seul après inactivité ou à la durée maximale).

La présentation ne connaît que **l’adresse du serveur et un jeton de session**. Elle affiche le fournisseur, le modèle du GPU, les images/s, la latence et la résolution mesurés.

| Fournisseur | Fichier | Démarrage | Coût |
|---|---|---|---|
| RunPod | `cloud/runpod.mjs`, `cloud/runpod-lib.mjs`, lanceur USB | `npm run runpod -- start` | payant (0,25 à 0,89 $/h) |
| Modal | `cloud/modal_app.py` | `npm run cloud:modal` | crédits gratuits mensuels |
| Autre (machine avec GPU NVIDIA) | `render-server/` | `node render-server/server.mjs` + tunnel HTTPS/TCP | selon l’hébergeur |

### Récupération sécurisée de l’adresse et du jeton

- Les jetons (présentateur, spectateur, TURN) sont générés **au démarrage de chaque session** et disparaissent avec elle.
- L’outil de démarrage (RunPod ou Modal) **ouvre automatiquement** le lien présentateur `https://…github.io/transformateurs-3d/#cloud=<serveur>&token=<jeton>`. Le fragment `#…` n’est jamais envoyé à GitHub et il est effacé de la barre d’adresse.
- Le lien complet peut aussi être collé dans **Réglages › Rendu GPU Cloud** : l’adresse et le jeton sont extraits automatiquement.
- Avec la **version USB**, une session démarrée depuis le lanceur est rejointe automatiquement au chargement.
- Aucune clé API de fournisseur n’atteint le navigateur ni le site public. La clé RunPod est saisie dans l’outil ou le lanceur local. L’authentification Modal est gérée par la CLI Modal dans le profil de l’utilisateur, hors du projet.

## Fournisseurs gratuits étudiés

| Fournisseur | GPU gratuit | Compatible avec notre streaming 3D ? | Verdict |
|---|---|---|---|
| **Modal** (plan Starter) | 30 $ de crédits par mois ([tarifs officiels](https://modal.com/pricing)). T4 : 0,000164 $/s, soit ≈ 0,59 $/h et ≈ 50 h par mois | **Oui en théorie** : tunnel HTTPS + tunnel TCP brut ([documentation](https://modal.com/docs/guide/tunnels)). Chrome headless rend sur le GPU d’un T4 Modal selon [ce retour d’expérience](https://tigerabrodi.blog/how-to-get-webgpu-in-headless-chrome-on-cloud-gpus) | **Intégré, non testé** : compte Modal nécessaire |
| Google Colab (gratuit) | T4 | Interdit : le palier gratuit proscrit les interfaces web et le contrôle à distance ([FAQ Colab](https://research.google.com/colaboratory/faq.html), [contexte](https://decrypt.co/197428/google-colab-stable-diffusion-web-ui-ban)) | **Exclu** (conditions d’utilisation) |
| Kaggle Notebooks | T4/P100, environ 30 h/semaine | Aucun port entrant. Tunnels tiers gratuits limités au HTTP ou plafonnés en débit ([exemples communautaires](https://pypi.org/project/kgout/)). Conditions non vérifiées | **Non retenu** (au mieux secours par images, cadre juridique incertain) |
| Lightning AI | environ 15 crédits/mois, vérification par téléphone ([synthèse non officielle](https://usagepricing.com/blueprint/lightning-ai)) | Exposition de ports non documentée dans les sources trouvées | **Non vérifié** |
| Hugging Face Spaces | palier gratuit sans GPU ; ZeroGPU réservé à des appels ponctuels | Pas de GPU persistant pour un rendu continu | **Exclu** |

Sources secondaires sur Modal : [Spheron](https://www.spheron.network/blog/free-gpu-cloud-credits-2026/), [continuumcode](https://continuumcode.ai/guides/modal-pricing/), [aicreditmart](https://aicreditmart.com/ai-credits-providers/modal-free-tier-how-to-get-30-month-in-compute-credits-2026/). Plusieurs indiquent l’absence de carte bancaire ; la page officielle ne le précise pas. **À vérifier lors de l’inscription.**

## Ce qui reste à vérifier sur Modal (au premier lancement)

1. **Rendu GPU réel** : le moteur doit afficher un GPU NVIDIA et non SwiftShader. `start.sh` installe `libnvidia-gl-<version du pilote>` si le conteneur n’a que les bibliothèques de calcul. Une différence de version mineure entre pilote et bibliothèque peut empêcher l’initialisation : l’interface le signale par « ⚠ Le moteur distant n’utilise pas un GPU NVIDIA ».
2. **WebRTC via le tunnel TCP Modal** (TURN). Le tunnel est de couche 4, donc il devrait convenir.
3. **WebSocket via le tunnel HTTPS** : Modal termine le TLS et transmet le flux TCP, donc il devrait convenir.
4. **Mesures** : images/s rendues et reçues, latence, résolution, utilisation GPU.

## Procédure Modal

1. Créer un compte sur https://modal.com (palier Starter gratuit). Vérifier qu’aucun moyen de paiement n’est exigé. **Ne pas en ajouter** si l’objectif est 0 € : sans moyen de paiement, rien ne peut être facturé au-delà des crédits.
2. Sur le poste opérateur : `npm run cloud:modal:setup`. Cela installe la CLI Modal dans `cloud/.venv` et ouvre le navigateur pour l’authentification (`modal token new`).
3. `npm run build`, puis `npm run cloud:modal` (T4, 120 min max., arrêt après 15 min sans client). Le lien présentateur s’ouvre automatiquement sur GitHub Pages.
4. Fin : Ctrl+C dans le terminal. La session s’arrête aussi seule (inactivité ou durée maximale).

## Si aucun GPU Cloud n’est disponible

La présentation reste complète en **rendu local optimisé** :

- passage automatique en qualité « Performance » si le GPU du PC reste sous 20 i/s ;
- qualité « Performance » par défaut sur mobile ;
- images et vidéos précalculées en dernier recours (PC sans WebGL).

Sur l’Intel HD 4600, le rendu local donne 23 à 34 i/s en qualité Performance (mesuré). Il est utilisable, mais moins fluide qu’un GPU NVIDIA distant.

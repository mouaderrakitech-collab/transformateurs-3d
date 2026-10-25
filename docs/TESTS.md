# Rapport de tests

Tous les résultats ci-dessous proviennent de tests **réellement exécutés** le 25/10/2026 sur le poste de développement :

- Windows 10 Pro 19045, GPU **Intel HD Graphics 4600** (Direct3D 11), Chrome stable
- Node.js 24.19.0, application construite (`vite build`) et servie par `vite preview`

Les scripts sont dans `scripts/` et produisent `test-results/*/results.json` ainsi que des captures d’écran.

Légende : ✅ réussi · ⏳ non exécuté (ressource ou autorisation manquante) · ⚠️ réussi avec réserve

## 1. Application (`scripts/e2e-test.mjs`) — 23/23 ✅

| Test | Résultat |
|---|---|
| Chargement, rendu WebGL | ✅ ANGLE Intel HD 4600, 602 appels de dessin, 458 k triangles |
| Navigation clavier de toutes les diapositives et étapes | ✅ 54 étapes, 33/33 diapositives |
| Touche Début | ✅ |
| Puissance ONAN, ONAF, OFAF, OFWF, ODAF, ODWF × 5 modes | ✅ (30 combinaisons) |
| Distribution ONAN × 5 modes | ✅ |
| Monophasé ONAN × 5 modes | ✅ |
| Sec AN, AF × 5 modes | ✅ |
| 7 vues caméra (avant, arrière, gauche, droite, dessus, dessous, iso) | ✅ |
| Rotation et zoom à la souris | ✅ |
| Sélection d’un composant par clic | ✅ (radiateurs) |
| Pause / Démarrer / Recommencer | ✅ |
| Mode présentation (P) | ✅ |
| Qualités Performance / Équilibré / Haute | ✅ |
| Aucune erreur JavaScript | ✅ 0 erreur |

Vérifications visuelles sur captures :

- coupe hachurée : circuit magnétique en gradins, galettes, parois de cuve ;
- vue éclatée : radiateurs écartés de chaque côté, culasse levée ;
- sens des circulations : huile chaude montant dans les enroulements, puis vers les radiateurs ou échangeurs par le haut, retour froid par le bas ; air ascendant ou soufflé ; eau à contre-courant ;
- zigzag OD dans les enroulements ; transparence en vue intérieure.

Défauts trouvés et corrigés pendant ces vérifications :

- circuit magnétique noir (relief trop fort, puis couleur de coupe en espace linéaire) ;
- orientation des solides de révolution ;
- éclatement des radiateurs arrière ;
- lueur d’échauffement trop forte.

## 2. Performances mesurées (`scripts/perf.mjs`, fenêtre Chrome visible, zone 3D 1264×1024)

| Qualité | Puissance ONAF extérieur | Puissance ODAF refroidissement |
|---|---|---|
| Performance | 23–26 i/s (307 appels) | 26–34 i/s |
| Équilibré | 22–23 i/s (602 appels, 458 k triangles) | 28 i/s |
| Haute | 18–22 i/s (676 k triangles) | 22 i/s |

Version finale. Ce GPU intégré de 2013 reste sous 30 i/s : sur ce type de PC, préférer le profil Performance ou le rendu distant. En mode headless (tests automatisés), Chrome bride le rendu : ces chiffres-là ne sont pas des mesures de performance.

## 3. Chaîne de rendu distant, en local (`scripts/cloud-test.mjs`) — 18/18 ✅

Serveur `render-server/server.mjs` et moteur Chromium headless **sur le même PC** (GPU Intel). Présentateur et spectateur dans un second navigateur.

| Test | Résultat |
|---|---|
| Serveur démarré, moteur prêt | ✅ moteur sur ANGLE Intel HD 4600 |
| Flux WebRTC établi | ✅ |
| Lien de session effacé de la barre d’adresse | ✅ |
| Vidéo reçue | ✅ 1920×1080, 7 à 12 i/s (GPU Intel : rendu, encodage et 3 navigateurs sur la même machine) |
| Télémétrie du moteur distant | ✅ |
| Latence commande → réponse | ✅ 4–5 ms (boucle locale) |
| Commande de scène appliquée par le moteur (image modifiée) | ✅ |
| Rotation souris transmise au moteur | ✅ |
| Sélection d’un composant sur l’image distante (lancer de rayon côté moteur) | ✅ |
| Étiquettes projetées par le moteur | ✅ 18 étiquettes |
| Session spectateur | ✅ |
| Le spectateur suit la diapositive du présentateur | ✅ |
| Le spectateur ne pilote pas la présentation | ✅ |
| Jeton invalide refusé | ✅ |
| Perte du serveur détectée | ✅ « Serveur GPU injoignable » |
| Reconnexion automatique après redémarrage du serveur | ✅ |
| Télémétrie rétablie | ✅ |
| Aucune erreur JavaScript | ✅ |

### Mode de secours, WebRTC bloqué (`--fallback`) — 17/17 ✅

Bascule automatique vers les images JPEG par WebSocket, puis toutes les commandes, la sélection, le suivi spectateur et la reconnexion fonctionnent. Latence mesurée : 196 à 667 ms. Un défaut a été trouvé et corrigé : file d’images trop longue qui retardait les commandes (images 720p et file bornée).

## 4. Version portable (`scripts/portable-test.mjs`) — 13/13 ✅

| Test | Résultat |
|---|---|
| Copie de la distribution dans un autre dossier | ✅ |
| Node.js absent du PATH (PATH système uniquement) | ✅ |
| `Lancer-Presentation.bat` démarre le Node.js embarqué | ✅ `http://127.0.0.1:4310/` |
| Application servie, rendu 3D local | ✅ |
| API du lanceur disponible | ✅ |
| Démarrage de session refusé sans clé | ✅ HTTP 400 |
| Appel depuis une autre origine refusé | ✅ HTTP 403 |
| Vidéos servies avec requêtes partielles | ✅ HTTP 206 |
| Mode de secours : vidéo précalculée lue | ✅ |
| Aucune clé API dans la configuration portable | ✅ |
| Version autonome `file://` sans serveur : rendu 3D | ✅ |
| Version autonome : navigation | ✅ |
| Aucune erreur JavaScript | ✅ |

## 5. RunPod

| Test | Résultat |
|---|---|
| Authentification API (clé fournie) | ✅ compte trouvé, 0 pod, plafond 80 $/h |
| Catalogue GPU et prix (lecture seule) | ✅ |
| `cloud/runpod.mjs estimate` / `status` | ✅ (aucune ressource créée) |
| Installation du plugin RunPod pour Claude Code | ⏳ refusée par le mode automatique (étape utilisateur) |
| Démarrage du pod GPU | ⏳ **solde 0 $** et autorisation de dépense requise |
| Rendu sur GPU RunPod, télémétrie nvidia-smi | ⏳ |
| Streaming WebRTC via TURN/TCP RunPod | ⏳ |
| 1080p/60, latence Internet, Wi-Fi | ⏳ |
| Arrêt automatique (inactivité, durée max.) sur pod réel | ⏳ (logique en place ; testée en local avec arrêt désactivé) |
| Coût réel par heure | ⏳ estimé : 0,27 $/h (RTX A5000, Secure) |

## 6. Sécurité

| Test | Résultat |
|---|---|
| Recherche de la clé `rpa_…` dans `src`, `dist`, `render-server`, `cloud`, `launcher`, `scripts`, paquet du pod | ✅ aucune occurrence |
| Contrôle anti-fuite dans le workflow de publication | ✅ en place (bloque la publication) |
| Jetons invalides, rôle imposé par le serveur, origine du lanceur | ✅ (sections 3 et 4) |

## 7. GitHub Pages

| Test | Résultat |
|---|---|
| Workflow de construction et de publication | prêt, ⏳ non exécuté (push non autorisé) |
| URL publique | ⏳ |

# Rapport : solutions réellement disponibles avec un budget de 0 €

Date : 25/10/2026. Poste de présentation de référence : Intel HD Graphics 4600.

## Conclusion

**Aucun GPU Cloud n’est actuellement utilisable sans carte bancaire pour notre streaming 3D interactif.** Le rendu GPU Cloud n’a donc **jamais été établi** sur un GPU NVIDIA distant : il reste **non fonctionnel** à ce jour, bien que l’intégration soit prête (RunPod, Modal).

La solution retenue à 0 € est le **rendu local optimisé**, publié sur GitHub Pages et disponible en version USB. La télémétrie l’affiche clairement : « GPU local ».

## 1. Modal : blocage dû aux conditions du compte, pas au code

Déroulé constaté par l’utilisateur :

- authentification de la CLI : réussie ;
- construction de l’image (Playwright + coturn + serveur de rendu) : réussie, l’application `transformateurs-3d-rendu` apparaît dans `modal app list` ;
- démarrage de la fonction GPU T4 : **refusé** par la plateforme avec le message « Please add a payment method to use T4 GPU functions ».

Le refus intervient à la planification du GPU, après l’authentification et la construction, donc **avant toute exécution de notre code**. C’est une règle du compte : les fonctions GPU exigent un moyen de paiement, même avec les crédits gratuits. Les sources publiques se contredisent sur ce point ([offre étudiante](https://www.studentoffers.co/offer/modal) : « Modal requires it » ; [guide aicreditmart](https://aicreditmart.com/ai-credits-providers/modal-free-tier-how-to-get-30-month-in-compute-credits-2026/) : sans carte). Le compte réel tranche : **carte obligatoire pour les GPU**.

Aucune tentative de contournement n’a été faite. L’intégration (`cloud/modal_app.py`) est **conservée** pour un usage futur.

## 2. Offres GPU gratuites sans carte bancaire (vérification)

| Offre | Sans carte ? | GPU | Utilisable pour notre streaming WebRTC ? |
|---|---|---|---|
| Modal Starter | **Non pour les GPU** (constaté) | T4, L4… | Oui techniquement, bloqué par le compte |
| RunPod | Non (solde à approvisionner) | oui | Oui techniquement, payant |
| Google Colab gratuit | Oui | T4 | **Non** : interfaces web et contrôle à distance interdits sur le palier gratuit ([FAQ](https://research.google.com/colaboratory/faq.html)) |
| Kaggle Notebooks | Oui (selon [un guide](https://gpuperhour.com/blog/free-cloud-gpus-and-credits)) | T4/P100, quota hebdomadaire variable | **Non** : pas de port entrant ; tunnels tiers limités ; usage en serveur interactif non prévu par la plateforme |
| SageMaker Studio Lab | Oui | T4, 4 h par 24 h | **Non** : notebook uniquement, pas de service exposé. Fermeture annoncée aux nouveaux comptes au 30/07/2026 ([source secondaire](https://aimultiple.com/free-cloud-gpu), non confirmée par AWS) |
| Lightning AI | Partiellement : 5 crédits sans carte, 25 de plus avec carte ([synthèse du 21/09/2026](https://www.usagepricing.com/blueprint/activity/lightning-ai-2026-09-21-gpu-rate-card-reprice)), vérification par téléphone | T4… | **Non vérifié** : exposition d’un port TCP et pilotes graphiques non documentés ; quota unique très court |
| Hugging Face Spaces | Oui | non (palier gratuit sans GPU) | Non |

Seul Lightning AI reste à étudier, avec une ressource **très limitée** (crédits uniques) et deux inconnues bloquantes : port TCP pour TURN et rendu GL/Vulkan dans le conteneur. Ce n’est pas une solution durable pour des présentations répétées.

## 3. Solution retenue : rendu local optimisé (mesuré)

Optimisations apportées :

1. **Rendu à la demande** : le GPU ne calcule une image que lorsque quelque chose bouge (rotation, transition, animation). Mesuré : **0 image** rendue au repos, après une transition caméra, après la vue éclatée et pendant la pause de l’animation (test automatisé, Chrome).
2. **Profil Performance pour GPU intégrés** : sans ombres ni anticrénelage, résolution interne à 85 %, géométries et particules allégées.
3. **Détection automatique** des GPU intégrés (Intel HD/UHD/Iris, GPU mobiles, rendu logiciel) : profil Performance appliqué au premier lancement, puis réduction automatique si la cadence reste sous 20 i/s.
4. **Mobile** : profil Performance par défaut, disposition compacte.

Mesures en fenêtre Chrome visible, zone 3D pleine largeur (1920×1024), caméra en rotation continue, Intel HD Graphics 4600 :

| Scène | Avant (profil Performance précédent) | Après (profil Performance optimisé) | Gain |
|---|---|---|---|
| Transformateur de puissance, extérieur | 16 i/s | **35–36 i/s** | × 2,2 |
| Refroidissement ODAF animé | 16 i/s | **27 i/s** | × 1,7 |
| Distribution, coupe + flux | 16 i/s | **38–39 i/s** | × 2,4 |

Les profils Équilibré (≈ 15 i/s) et Haute qualité (≈ 13 i/s) restent disponibles mais sont trop lourds pour ce GPU.

Contenu préservé : 33 diapositives, 4 modèles, 5 modes, 8 refroidissements, animations, vues et interactions. Tests automatisés : application 23/23, site 17/17, rendu distant (en local) 18/18, version USB 13/13.

## 4. Options si le budget évolue

| Option | Coût indicatif | Action |
|---|---|---|
| Modal avec moyen de paiement + budget de l’espace fixé à 0 $ au-delà des crédits | crédits mensuels gratuits, **carte requise** | ajouter une carte, fixer le plafond, `npm run cloud:modal` |
| RunPod | ≈ 0,32 $ par heure de présentation (RTX A5000, si disponible) ; ≈ 1 $/h (RTX 4090) | approvisionner, `npm run runpod -- start` |
| PC de présentation avec GPU dédié | 0 € si disponible | la présentation détecte le GPU et peut passer en Équilibré ou Haute qualité |

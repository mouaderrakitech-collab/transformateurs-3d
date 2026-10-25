# Limites et éléments non validés

Liste à jour au 25/10/2026. Chaque point indique ce qui manque et la solution proposée.

## Non testé faute de ressources (à faire dès autorisation)

| Élément | État | Ce qui manque | Solution |
|---|---|---|---|
| Rendu GPU Cloud gratuit (Modal) | **bloqué par le compte** : moyen de paiement exigé pour les GPU (constaté le 25/10/2026) ; image construite avec succès | compte Modal et authentification de la CLI (`npm run cloud:modal:setup`) | voir docs/CLOUD-GRATUIT.md |
| Rendu sur GPU RunPod réel | **non testé** | solde RunPod de 0 $ et autorisation de dépense | approvisionner (≈ 1 $ suffit pour un test d’une heure sur RTX A5000), puis `node cloud/runpod.mjs start` et `SRV=… P=… V=… node scripts/cloud-test.mjs` |
| Accès GPU dans le conteneur (Vulkan/EGL NVIDIA pour Chromium) | **non vérifié** | test sur pod | `start.sh` configure les ICD ; le serveur essaie Vulkan puis EGL et signale tout rendu logiciel |
| 1080p / 60 i/s distant | **non mesuré** | test sur pod | la télémétrie affiche les valeurs mesurées ; choisir le profil d’après elles |
| TURN/TCP sur le port public RunPod | **non testé** | test sur pod | chaîne testée en local sans TURN ; secours WebSocket testé |
| Wi-Fi, latence Internet réelle | **non mesurés** | session RunPod | mesures affichées dans l’interface (RTT, latence, débit) |
| Coût réel d’une session | estimé à partir des prix API | session réelle | `status` affiche le coût horaire réel du pod |

## Limites connues

1. **Modèles 3D paramétriques, pas des reproductions constructeur.** Ils sont générés par le code à partir de la composition réelle des transformateurs (J&P Transformer Book, Kulkarni, ABB Transformer Handbook). Les proportions sont représentatives mais ne correspondent pas à un appareil précis. Blender n’est pas installé sur le poste de développement et aucun modèle industriel sous licence compatible n’a été fourni. *Solution :* exporter en GLB (bouton intégré), affiner dans Blender, ou intégrer des modèles constructeur sous licence.
2. **Textures procédurales.** Rugosité de la peinture, feuilletage des tôles, cuivre brossé et papier sont générés au chargement en basse résolution (128 à 256 px). Il n’y a pas de textures photographiques haute résolution. Cela allège les fichiers et le fonctionnement hors ligne, mais le photoréalisme est limité.
3. **Encodage vidéo distant logiciel.** Sous Linux, l’encodeur WebRTC de Chromium n’utilise pas NVENC : l’encodage se fait sur le processeur du pod, et le 1080p/60 pour plusieurs spectateurs n’est pas garanti. *Solution :* profil Équilibré ou Faible débit ; à terme, encodage GStreamer NVENC ou Unreal Pixel Streaming 2 (voir ARCHITECTURE.md).
4. **Un moteur partagé.** Tous les spectateurs voient la même scène (celle du présentateur). Chaque spectateur ajoute un encodage : le nombre de spectateurs simultanés n’est pas mesuré.
5. **Animations de refroidissement qualitatives.** Les trajectoires, les vitesses relatives et les couleurs sont pédagogiques. Ce n’est pas une simulation thermique ou CFD, et l’interface le précise.
6. **Valeurs numériques.** Les seules valeurs citées sont les limites d’échauffement de l’IEC 60076-2:2011 (tableau 1) : huile 60 K, enroulement 65 K (ON/OF) ou 70 K (OD), point chaud 78 K. Elles sont à vérifier dans l’édition en vigueur. Les tableaux comparatifs sont qualitatifs.
7. **Import PPTX.** Il passe par une conversion en PDF (PowerPoint › Exporter › PDF). Les pages deviennent des images, et les animations PowerPoint sont perdues.
8. **Version autonome (`autonome.html`).** Elle n’utilise ni serveur ni lanceur : pas de démarrage de session RunPod depuis cette page, et l’import PDF peut être indisponible en `file://`.
9. **Mode de secours précalculé.** Il fournit une vue par mode et par modèle (image ou vidéo), sans rotation ni sélection. Les médias ont été rendus sur le GPU du poste de développement (Intel HD 4600).
10. **Performances locales mesurées sur un GPU modeste** (Intel HD 4600) : 17 à 47 i/s selon la scène et la qualité. Les machines plus récentes n’ont pas été testées.
11. **Exécution depuis USB.** Le lancement a été testé depuis une copie de la distribution dans un autre dossier, avec un PATH sans Node.js, et non depuis une vraie clé USB sur un autre PC. Les stratégies AppLocker/SRP n’ont pas été testées ; dans ce cas, `autonome.html` sert de secours.
12. **Clé API exposée pendant le développement.** Elle a été transmise en clair dans la conversation. Elle n’a été écrite dans aucun fichier (vérifié par recherche), mais il faut **la révoquer**.

# Transformateurs 3D — présentation interactive

Présentation Web 3D en français sur **les différents types de transformateurs électriques et leurs systèmes de refroidissement** (AN, AF, ONAN, ONAF, OFAF, OFWF, ODAF, ODWF selon IEC 60076-2 / IEC 60076-11).

Diapositives, modèles 3D et démonstrations sont réunis dans une seule interface. Le rendu 3D est calculé soit par le GPU du PC, soit par un **GPU distant RunPod** dont l’image est diffusée en WebRTC.

## Démarrage rapide

| Situation | Commande |
|---|---|
| PC avec Node.js (développement) | `demarrer.bat`, ou `npm ci` puis `npm run build` puis `npm run serve` |
| Clé USB / PC sans Node.js | `npm run build:portable -- --site <url-pages>` puis copier `portable/Transformateurs3D` et lancer `Lancer-Presentation.bat` |
| Exécution bloquée sur le PC | ouvrir `app/autonome.html` de la version portable |
| Lien public | https://mouaderrakitech-collab.github.io/transformateurs-3d/ (déploiement automatique à chaque push sur `main`) |
| Session GPU Cloud (Modal, crédits gratuits) | `npm run cloud:modal:setup` puis `npm run cloud:modal` (voir [docs/CLOUD-GRATUIT.md](docs/CLOUD-GRATUIT.md)) |
| Session GPU RunPod (payant) | `node cloud/runpod.mjs estimate`, puis `start`, puis `stop` (voir [docs/RUNPOD.md](docs/RUNPOD.md)) |

## Contenu

- **33 diapositives** en 7 parties (introduction, construction, types, échauffement, refroidissements, comparaison, conclusion), avec étapes de démonstration qui pilotent la 3D, schémas SVG, tableaux comparatifs et références.
- **4 modèles 3D** couvrant les 6 types : monophasé sur poteau, distribution triphasé hermétique à ailettes, sec enrobé (AN/AF), puissance avec conservateur et changeur en charge dans 6 configurations de refroidissement.
- **5 modes** : extérieur, intérieur, éclaté, coupe technique (plan réglable, sections hachurées), refroidissement (particules, flèches, code couleur froid → chaud).
- **Caméra** : rotation 360°, zoom, déplacement, 7 vues prédéfinies. Clic sur un composant pour afficher sa description.
- **Présentation** : plein écran (F), mode présentation (P), clavier et télécommande (← → PageUp/PageDown), sommaire interactif, numérotation, transitions, import PDF (depuis un PPTX converti).
- **Qualité** : Performance, Équilibré, Haute. Mode de secours avec images et vidéos précalculées.
- **Rendu distant** : session présentateur/spectateur par jeton temporaire, télémétrie GPU réelle, reconnexion, secours WebSocket, arrêt automatique du pod.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : architecture, choix du rendu distant (Unreal Pixel Streaming étudié), réseau, sécurité
- [docs/CLOUD-GRATUIT.md](docs/CLOUD-GRATUIT.md) : rendu GPU Cloud multi-fournisseurs, fournisseurs gratuits étudiés, procédure Modal
- [docs/RUNPOD.md](docs/RUNPOD.md) : configuration, démarrage et arrêt d’une session, coûts
- [docs/TESTS.md](docs/TESTS.md) : rapport de tests (résultats réellement exécutés)
- [docs/LIMITES.md](docs/LIMITES.md) : limites et éléments non validés
- [render-server/README.md](render-server/README.md) : serveur de rendu du pod

## Tests automatisés

```
npm run preview                  (dans un terminal : sert dist/ sur le port 4173)
npm run test:e2e                 diapositives, modèles × modes, vues, souris, sélection, présentation, qualités
npm run test:cloud               chaîne de rendu distant complète en local (moteur + présentateur + spectateur)
node scripts/cloud-test.mjs test-results/cloud --fallback      WebRTC bloqué → mode de secours
node scripts/portable-test.mjs   version portable sans Node.js dans le PATH, version autonome file://
npm run test:perf                images/seconde mesurées (fenêtre Chrome visible)
```

## Sécurité

Aucune clé API dans le dépôt, le site, le paquet du pod ni la clé USB. Le workflow de publication bloque toute clé détectée. Le site public ne peut pas démarrer de GPU. Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#sessions-et-sécurité).

## Avertissements

Les modèles 3D sont des **représentations paramétriques pédagogiques** construites à partir des composants réels décrits dans la littérature technique. Ce ne sont pas des reproductions d’appareils d’un constructeur. Les animations de refroidissement sont **qualitatives** et ne sont pas des simulations thermiques.

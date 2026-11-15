# Générateur de gabarits pour queues droites

Application statique en français : formulaire, aperçu SVG instantané, export STL
par OpenSCAD WebAssembly dans un Web Worker. Aucun serveur de calcul, compte,
CMS, CDN, framework frontend ou API distante n'est utilisé à l'exécution.

`peigne.scad` est le modèle original, conservé sans modification. Le STL compile
ce fichier avec des paramètres `-D`, toujours en `mode="piece"`.

## Lancer l'application

Les bibliothèques, le WASM et les polices sont déjà dans `vendor/`.
Depuis le dossier du projet :

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Ouvrir <http://127.0.0.1:8000>. Un double-clic sur `index.html` (`file://`) ne
convient pas aux imports JavaScript, au chargement du SCAD et au Worker.
Python sert seulement les fichiers pendant le développement ; il ne calcule
aucun STL. Node.js n'est pas nécessaire.

## Déployer sur nginx ou un autre serveur statique

```sh
python3 scripts/package.py
```

Copier **le contenu de `dist/`** dans le répertoire web choisi. Les URL sont
relatives : l'application fonctionne à la racine ou dans un sous-répertoire.
Le script vérifie les ressources et leurs empreintes avant de créer le paquet.

Le serveur doit servir `.js` en `text/javascript` ou `application/javascript`,
`.wasm` en `application/wasm`, `.scad` en `text/plain` et `.ttf` en `font/ttf`.
Ne pas remplacer les erreurs 404 des ressources par `index.html`. La compilation
est monothread à l'intérieur du Worker : COOP, COEP et SharedArrayBuffer ne sont
pas nécessaires. HTTPS est recommandé pour la publication.

Exemple de bloc nginx, à adapter au chemin réellement installé :

```nginx
server {
    listen 80;
    server_name gabarits.example.org;
    root /var/www/gabarits;
    index index.html;
    include /etc/nginx/mime.types;
    types {
        application/wasm wasm;
        text/plain scad md;
    }
    location / { try_files $uri $uri/ =404; }
}
```

Le moteur WASM pèse environ 11 Mo et n'est chargé qu'au clic sur l'export.
L'archive de sources correspondantes est beaucoup plus volumineuse (environ
452 Mo) : elle contient aussi les dépendances C/C++ et leurs sous-modules.
Elle **n'est jamais chargée par le configurateur**. Conserver son lien et sa
disponibilité lors de la redistribution ; ne pas omettre les notices de `vendor/`.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html`, `css/style.css` | Structure accessible, présentation inspirée du thème Fjalla du blog |
| `js/parameters.js` | Métadonnées du formulaire, lecture des valeurs SCAD, validations, dimensions dérivées |
| `js/geometry.js` | Traduction des opérations 2D du modèle avec Clipper |
| `js/preview.js` | Construction du SVG et des cotes ; agrandissement disponible sur mobile |
| `js/app.js` | Événements, erreurs, Worker, téléchargement, annulation |
| `js/openscad-worker.js` | Chargement local du moteur et de la police, exécution Manifold, transfert du STL |
| `peigne.scad` | Source fonctionnelle unique du STL |
| `vendor/` | Bibliothèques, polices, licences, binaire WASM et sources correspondantes |

Les trois valeurs souvent confondues sont distinctes : longueur du corps / pas
de raccordement (`nombre_dents × 2 × largeur_queue`), encombrement avec languette
(`longueur_piece + profondeur_puzzle`) et décalage de contre-pièce (`largeur_queue`).
Le décalage nécessite une butée externe, comme le précise le modèle.

## Modifier le modèle ou les paramètres

Les valeurs initiales sont lues directement dans les affectations simples de
`peigne.scad`. Modifier une valeur par défaut ne nécessite pas de la recopier
dans le HTML ou le JavaScript. Aucun `eval` n'est utilisé.

Pour ajouter un paramètre, compléter `groups` dans `js/parameters.js`, sa règle
d'activation et les validations correspondant aux assertions du SCAD. Si la
géométrie change, adapter `geometry.js` puis exécuter les tests de fidélité.
Les constantes `$fn=96`, `epsilon=0.01` et le profil puzzle discrétisé sont
actuellement repris du modèle. Ne pas les modifier d'un seul côté.

Les options cachées conservent leur valeur pour une réactivation ultérieure.
Les paramètres invalides inactifs sont ignorés à l'export. Le nombre de dents
reste entier ; les doigts inférieurs à 4 mm provoquent seulement un avertissement.
Le SCAD reste le dernier contrôle des assertions lors de la compilation.

## Moteur et reconstruction

La distribution installée est `@lofcz/openscad-wasm@0.0.2`, dérivée du projet
officiel `openscad/openscad-wasm`. Elle propose Manifold et une correction de
chargement des contours de polices dans FreeType. Voir `vendor/openscad/BUILD.json`
pour la révision exacte, les sources des dépendances et les empreintes SHA-256.
Le tarball npm est contrôlé par son empreinte SHA-512 épinglée.

Pour récupérer à nouveau les mêmes ressources, depuis une machine connectée :

```sh
python3 scripts/install-wasm.py
```

Prérequis de cette opération de développement : Python 3.11+, git, make, wget,
tar et les utilitaires Unix classiques. Le script récupère aussi les sources
complètes des bibliothèques liées ; prévoir plusieurs Go d'espace temporaire
dans `.build/`. Il ne compile pas le C++.

Pour reconstruire le binaire : `bash scripts/build-wasm.sh` (Docker et npm sont
alors également nécessaires). La compilation peut prendre plusieurs heures.
La distribution npm est utilisée en production sans installation npm.

La police de gravure `DejaVu Sans Mono`, style Book, est fournie localement et
installée dans le système de fichiers virtuel d'OpenSCAD. Une police absente ou
une erreur de chargement interrompt l'export : les inscriptions ne sont jamais
désactivées automatiquement.

## Vérifications

```sh
# Python standard, GJS et OpenSCAD local
gjs -m tests/validate-parameters.js
python3 tests/compare-profiles.py

# Tests réels Chromium / Firefox
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python -m playwright install chromium firefox
.venv/bin/python tests/browser.py
.venv/bin/python tests/browser_options.py
```

Les tests navigateur lancent leur propre serveur HTTP statique, téléchargent
réellement les STL et comparent des exports natifs avec les mêmes paramètres.
Ils contrôlent aussi les requêtes réseau, l'annulation, les champs conditionnels,
les erreurs de police et une largeur d'écran de 390 px. Les fichiers et captures
sont placés dans `test-results/`. Les mesures effectivement obtenues et les
limites de cette comparaison sont détaillées dans `VALIDATION.md`.

Le test SVG compare les contours et les surfaces, et pas seulement une capture
d'écran : jeu nul, bague égale à la fraise, raccords étirés indépendamment, trous,
une seule dent, doigts fins et doigts courts.

## Limites connues

- L'aperçu ne dessine pas les gravures ; les fraisures sont signalées par des
  cercles pointillés. Ces opérations sont présentes dans le STL.
- OpenSCAD 2021.01 local et le moteur WASM récent ne placent pas exactement les
  caractères au même endroit. Les gravures conservent leur contenu, leur police,
  leur profondeur et leurs contours ; leur espacement diffère légèrement.
  Les tests distinguent explicitement cette différence du profil mécanique.
  Aucun correctif de géométrie n'est appliqué au fichier SCAD pour la masquer.
- Les temps de calcul et les possibilités de génération de très grandes pièces
  dépendent de la mémoire du navigateur. Le bouton Annuler arrête le Worker.
- Le Worker et ses caches sont libérés à la fin du calcul. Seul le dernier STL
  reste disponible pour le lien de téléchargement de secours ; son URL est
  révoquée au prochain export ou en quittant la page.
- Au-delà de 200 dents, seul l'aperçu est masqué pour préserver la réactivité.
  Cette limite d'affichage ne change ni les assertions SCAD ni l'export STL.
- Les tests sur un écran mobile simulé ne constituent pas des essais matériels
  sous Android ; les tests Linux ne constituent pas des essais sous Windows.
- Les contrôles d'accessibilité automatisés et le HTML sémantique ne valent pas
  certification RGAA ; un audit manuel complet reste distinct de ces tests.

## Licences

Le modèle original conserve `LICENSE.md` (Gnieark's License v1.0). Le nouveau
code applicatif et les scripts sont sous GPL-2.0-or-later, texte dans
`LICENSE-APP.txt`. Les composants tiers conservent leurs licences respectives.
Voir `THIRD_PARTY_NOTICES.md` ; les sources correspondantes du moteur sont
servies dans `vendor/openscad/SOURCES.tar.gz`.

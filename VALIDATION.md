# Bilan de validation — 14 novembre 2026

## Environnement

- OpenSCAD natif 2021.01 (CGAL), Linux.
- `@lofcz/openscad-wasm@0.0.2`, moteur **Manifold** explicitement sélectionné.
  Le journal réel indique `3D object (manifold)` et `Status: NoError`.
- Playwright 1.65.2 ; Chromium 159.0.8154.6 et Firefox 159.0.
- DejaVu Sans Mono Book locale, même fichier TTF pour la référence native et
  le Worker. SHA-256 :
  `a54dca07c76d6289e717e75e0a58c0128f6d7269ef3faf76417c9d7d3bba37ab`.
- Modèle original inchangé, SHA-256 :
  `e495502d0b4f2b6d90805ce28919fd77ca7afe558c5a6525b3b81e7451a90cc0`.

## Validations et aperçu

`tests/validate-parameters.js` : **36 configurations** confrontées aux assertions
du SCAD, mêmes acceptations et refus. Le test inclut les paramètres masqués,
l'avertissement non bloquant sous 4 mm et le mode d'export `piece`.

`tests/compare-profiles.py` : **10 profils** confrontés aux SVG exportés par
OpenSCAD natif, nombre de contours identique dans chaque cas. Les distances
sont mesurées dans les deux sens, aux sommets et milieux des arêtes ; les
surfaces sont également comparées.

| Configuration | Écart maximal des contours (mm) |
| --- | ---: |
| Valeurs initiales | 0,000491 |
| Jeu nul | 0,000430 |
| Bague = fraise | 0,000491 |
| Trous | 0,000491 |
| Fraisures (profil des trous traversants) | 0,000491 |
| Une dent | 0,000075 |
| Raccord étiré différemment en X et Y | 0,000348 |
| Doigts fins | 0,000071 |
| Huit dents, dimensions augmentées | 0,000561 |
| Doigts très courts | 0,000428 |

Écart maximal de surface : **0,006401 mm²**. La précision décimale de l'export
SVG natif contribue à ces écarts. Les raccords ne sont pas remplacés par des
dessins schématiques : les deux implémentations utilisent les quatre arcs
discrétisés, la languette, son offset femelle et les booléens du modèle.

## Téléchargements STL réels

`tests/browser.py` passe sur **Chromium et Firefox**. La page est servie par un
serveur HTTP statique et les fichiers proviennent des événements de téléchargement
du navigateur, après exécution du vrai Worker WASM.

| Variante | Triangles WASM | Volume WASM (mm³) | Volume natif (mm³) |
| --- | ---: | ---: | ---: |
| Valeurs initiales, gravures | 41 026 | 49 182,742019 | 49 182,737525 |
| Sans gravures | 2 004 | 49 260,869694 | 49 260,864340 |
| Trous, sans gravures | 2 780 | 49 006,582288 | 49 006,577941 |
| Trous et fraisures, sans gravures | 3 702 | 48 911,224514 | 48 911,219551 |
| Trous, fraisures et gravures | 42 724 | 48 833,096838 | 48 833,092737 |

Les deux navigateurs donnent les mêmes résultats géométriques. Encombrement :
X [-20 ; 120], Y [-3,7 ; 96,3], Z [0 ; 8] mm. L'écart d'encombrement maximal
avec le STL natif est **0,0000031 mm** ; l'écart relatif de volume reste inférieur
à **0,000011 %**.

Sans gravures, les quatre sections comparées (base, milieu, dessus, arrière)
diffèrent de moins de **0,000494 mm**, y compris avec trous et fraisures.
Une triangulation différente est normale : le nombre de facettes n'est pas
utilisé comme preuve d'égalité des surfaces.

### Différence de placement des gravures

Les STL gravés **ne sont pas strictement identiques** à ceux d'OpenSCAD 2021.01 :
le moteur récent et sa chaîne FreeType/HarfBuzz placent les caractères un peu
différemment. Le test initial de superposition complète l'a détecté ; il n'a
pas été remplacé par une simple comparaison de volumes.

Les tests vérifient séparément les **60 contours gravés du dessus** et les
**44 contours de l'URL arrière**, par correspondance un à un, avec uniquement
une translation autorisée (aucune mise à l'échelle). L'écart de forme est au
maximum de **0,002442 mm**. Le déplacement maximal d'un contour est de
**0,500479 mm** sur le dessus et de **0,940944 mm** sur la tranche arrière.
Le contenu et la profondeur des inscriptions sont conservés. Le fichier SCAD
n'a pas été modifié pour compenser cette différence entre versions.

Les résultats détaillés reproductibles sont produits dans
`test-results/browser-results.json`. Une valeur `null` dans les écarts de section
bruts signifie qu'une arête correspondante se trouve hors du voisinage spatial
du test, en raison du déplacement de texte ; les mesures de forme et de
translation des caractères sont données séparément dans `lettering`.

## Interface et réseau

Le test navigateur vérifie : modification instantanée du SVG, assemblage de
deux modules, refus des paramètres impossibles, avertissement des doigts fins,
réinitialisation, téléchargement d'une seule pièce même en vue assemblée,
interdiction des compilations simultanées, maintien de la réactivité, annulation,
et échec explicite si la police locale répond 404. Aucune erreur JavaScript
inattendue n'est remontée.

Toutes les requêtes de l'application observées pendant ces tests sont des GET
vers le serveur statique local. Aucun POST, service de calcul, CDN ou API
distante n'est appelé. Le moteur et la police de gravure sont chargés à la demande.

Le paquet final `dist/` a aussi été testé depuis le sous-répertoire HTTP `/dist/` :
téléchargement effectif de `peigne_20mm_3dents.stl` (2 051 384 octets), moteur
Manifold confirmé dans le journal, 16 requêtes locales, aucune erreur JavaScript.
Les licences, la documentation, le WASM et l'archive des sources répondent HTTP 200 ;
le WASM est servi en `application/wasm`.

L'affichage a été inspecté à 1 280 px et 390 px, sans débordement horizontal de
la page. Le dessin peut être agrandi et parcouru séparément. Le style a été
comparé visuellement au blog et à sa feuille `style2025-12-01.css`.

`tests/browser_options.py` passe également dans les deux navigateurs : combinaison
trous/fraisures/gravures, modification des paramètres pendant le calcul avec
conservation de l'instantané exporté, vraie erreur SCAD rendue lisible,
réinitialisation des options, limite d'affichage à 201 dents, et agrandissement
du dessin avec défilement au clavier à **320 px**, sans débordement de page.
Résultats supplémentaires : `test-results/options-results.json`.

axe-core 4.14.0 (règles WCAG 2 A/AA et 2.1 AA) : **aucune violation détectée**
sur les états initial, invalide et avec fixations testés dans Chromium. Cela ne remplace pas un audit RGAA
complet au clavier et avec des lecteurs d'écran.

## Limites des essais

Les mesures concernent les configurations listées, pas toutes les combinaisons
réelles de dimensions. Aucun test matériel Android/Windows ni essai d'usinage
ou d'impression 3D n'a été effectué. Le comportement sur mobile a été vérifié
par largeur de fenêtre, pas sur un appareil physique.

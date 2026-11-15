# État livré — 15 novembre 2026

L’application et `dist/` intègrent l’encoche et la cale. Aucun déploiement distant.

## Décisions utilisateur et réalisation

- Encoche rectangulaire, sans bosse, début à W du coin arrière côté puzzle mâle
  (x=0). Largeur 2W exacte, profondeur 10+j ; aucun jeu latéral.
- `encoche_calage=true` par défaut, désactivable pour les modules trop courts.
- `ajouter_cale=false`, option indépendante : carré 20x20, trou central
  `diametre_vis`, languette Wx10 sans jeu, épaisseur du peigne, sans fraisure.
- Placement entre les doigts si possible, rotation examinée aussi ; sinon minimum
  de surface parmi 8 placements extérieurs. Séparation nominale 2 mm.
- Le STL contient un peigne et éventuellement une cale, même en aperçu assemblé.
- URL complète déplacée sur une tranche arrière intacte ; texte du dessus dans
  le dos plein. Puzzle et doigts inchangés. Assertions SCAD / validations JS ajoutées.
- Le modèle initial est dans `tests/fixtures/peigne-original.scad`.

## Vérifications passées

- 47 configurations JS / assertions SCAD.
- 17 profils JS / natifs : écart maximal < 0,000561 mm.
- Test indépendant de course de calage et conservation du profil original.
- 20 téléchargements Chromium / Firefox : suites browser.py, browser_options.py,
  browser_calage.py. STL comparés aux références natives du modèle modifié.
- Cale : deux solides fermés, volume, encombrement, trou traversant ; placements
  intérieur, extérieur, tourné ; gravures+fixations combinées.
- Mobile 320/390 px, zoom, annulation, erreurs, absence de police, réseau local.

## Limites

Les gravures diffèrent en placement d’OpenSCAD 2021.01 : jusqu’à 0,500480 mm sur
le dessus et 0,413989 mm sur l’URL actuelle. Formes de caractères concordantes
après translation (<0,002435 mm) ; mécanique <0,000494 mm. Aucun essai d’impression
ou d’usinage physique. Voir VALIDATION.md pour les résultats et leur portée.

## Reprendre

- README.md : lancement, déploiement, calage, maintenance et licences.
- `python3 scripts/package.py` régénère dist/ après vérification du moteur.
- `gjs -m tests/validate-parameters.js`, `python3 tests/compare-profiles.py`,
  `python3 tests/calage-mechanics.py`.
- `.venv/bin/python tests/browser.py`, `tests/browser_options.py`,
  `tests/browser_calage.py` : serveurs locaux temporaires, navigateurs réels.
- Playwright 1.65.2, navigateurs dans `~/.cache/ms-playwright` (plus dans /tmp).
- Les suites régénèrent leurs références STL ; cela prend plusieurs minutes pour
  les gravures dans OpenSCAD natif. Les résultats sont dans test-results/.
- Moteur local @lofcz/openscad-wasm@0.0.2 / Manifold ; polices locales.
  Archive vendor/openscad/SOURCES.tar.gz (~452 Mo) à conserver dans la distribution.
  Ignorée dans Git ; scripts/install-wasm.py permet de la régénérer.
- .gitignore exclut construction, distribution, tests générés, caches et archive.
- Aucune infrastructure serveur de calcul. Aucun commit créé par cette passe.

# État final — 14 novembre 2026

L'application est livrée dans le dépôt et dans `dist/`, prête pour un hébergement
statique indépendant. Aucun déploiement distant n'a été effectué.

## Réalisé et vérifié

- `peigne.scad` original inchangé ; valeurs initiales lues depuis ce fichier.
- Formulaire, validations, SVG fidèle une/deux pièces, cotes, bague optionnelle,
  agrandissement au clavier et au toucher, interface responsive.
- WASM local `@lofcz/openscad-wasm@0.0.2`, Manifold, Worker, police DejaVu locale,
  téléchargement réel, annulation et gestion d'erreurs.
- Identité du blog examinée réellement : thème Fjalla, Fjalla One / Open Sans,
  corail et gris bleuté. Polices web locales et contrastes adaptés.
- 36 configurations de validation comparées aux assertions natives.
- 10 profils SVG comparés aux exports OpenSCAD ; écart maximal < 0,000561 mm.
- 5 variantes STL dans Chromium et Firefox, comparées à OpenSCAD 2021.01 :
  défaut, sans inscriptions, trous, fraisures, inscriptions+trous+fraisures.
- Tests mobiles 320/390 px, erreurs de paramètres / police / compilation,
  instantané des paramètres au clic, réinitialisation, annulation, réseau local.
- axe-core : aucun problème détecté sur les états initial, invalide, fixations.
- Le paquet `dist/` a été servi et testé dans un sous-répertoire HTTP, avec
  téléchargement effectif et sans requête externe.

## Différence connue à conserver dans les communications

Les gravures diffèrent légèrement en placement par rapport à OpenSCAD 2021.01 :
les contours de caractères correspondent (écart de forme < 0,002442 mm), mais
le déplacement maximal atteint 0,500479 mm sur le dessus et 0,940944 mm sur l'URL.
Les parties mécaniques concordent à moins de 0,000494 mm dans les tests STL.
Ne pas prétendre à une égalité stricte des STL gravés avec OpenSCAD 2021.01.
Aucun essai physique Android/Windows, impression ou usinage n'a été effectué.

## Fichiers utiles

- `README.md` : lancement, déploiement, maintenance et limites.
- `VALIDATION.md` : mesures et tests réellement exécutés.
- `THIRD_PARTY_NOTICES.md`, `LICENSE-APP.txt` : licences du nouveau code et tiers.
- `vendor/openscad/BUILD.json` : version et empreintes.
- `vendor/openscad/SOURCES.tar.gz` : environ 452 Mo de sources correspondantes,
  dépendances et sous-modules, patchs et sources de repli Meson incluses.
  L'archive n'est jamais chargée automatiquement par l'application.
- `test-results/` : STL natifs/navigateur, résultats JSON et captures.
- `scripts/install-wasm.py` : récupération reproductible du binaire et des sources.
- `scripts/package.py` : vérification puis préparation de `dist/`.

Les sources de développement téléchargées sont dans `.build/` (ignoré).
L'environnement de test est `.venv/` (ignoré), Playwright 1.65.2 ; navigateurs dans
`/tmp/peigne-playwright`. Dans cet environnement, Firefox a nécessité une exécution
hors du bac à sable, autorisée via la demande d'escalade. Les tests fonctionnent
normalement depuis un terminal non restreint.

Aucun commit n'a été créé : `.git` n'était pas un dépôt exploitable dans cette
session. Le travail est conservé dans les fichiers du projet.

# Licences et provenance

## Modèle et application

- `peigne.scad` : Gnieark, 2026 ; Gnieark's License v1.0 (`LICENSE.md`).
  Le modèle n'a pas été modifié. Son utilisation comme entrée du moteur est
  distincte de la licence d'OpenSCAD.
- Nouveau code dans `js/`, `css/`, `index.html`, `scripts/` et `tests/` :
  Copyright 2026 Gnieark et contributeurs. GPL-2.0-or-later (`LICENSE-APP.txt`).

## OpenSCAD WebAssembly

Distribution : [@lofcz/openscad-wasm 0.0.2](https://github.com/lofcz/openscad-wasm/tree/96c8ea8f6a676920e8d21858ae2c603fde2c7c4d),
dérivée de [openscad/openscad-wasm](https://github.com/openscad/openscad-wasm).
Licence de la distribution : GPL-2.0-only, texte complet dans
`vendor/openscad/COPYING`. Les fichiers JS et WASM de cette distribution sont
conservés sans modification. L'application fournit séparément la police DejaVu.

Les sources correspondantes sont distribuées dans
[SOURCES.tar.gz](vendor/openscad/SOURCES.tar.gz). Cette archive contient le
Makefile, les Dockerfiles, les correctifs, les sources TypeScript du wrapper,
les sources OpenSCAD et les bibliothèques récupérées aux références épinglées
du Makefile, avec leurs sous-modules et leurs textes de licence.
`vendor/openscad/BUILD.json` conserve ces références et les empreintes des fichiers.

Parmi les dépendances présentes dans les sources : OpenSCAD (GPL), CGAL
(GPL/LGPL selon les composants), Manifold et Clipper2 (Apache-2.0 / Boost),
Boost (Boost Software License), Eigen (MPL-2.0 et licences indiquées dans ses
fichiers), GMP et MPFR (LGPL/GPL selon versions), FreeType (FTL/GPL),
HarfBuzz, Fontconfig, libffi, GLib, Cairo, lib3mf, Expat, liblzma, libzip,
zlib, libxml2 et double-conversion. Les licences et notices exactes de chaque
version font autorité dans l'archive, notamment les répertoires `libs/` et
`libs/openscad/submodules/`. Les outils de compilation sont décrits par les
Dockerfiles ; ils ne sont pas requis par le site déployé.
Les sources additionnelles de pixman, libpng, PCRE2 et proxy-libintl, ainsi que
les correctifs Meson, sont conservées avec leurs empreintes dans les répertoires
`subprojects/packagecache/` correspondants de cette archive.
Les notices des runtimes Emscripten 6.0.5, musl, libc++ et libc++abi sont
également conservées dans `vendor/openscad/toolchain-notices/`.

Conserver le moteur, sa licence, son manifeste et le téléchargement des sources
correspondantes ensemble lors de la redistribution. Les sources ne sont pas
téléchargées automatiquement par les visiteurs du configurateur.

## Clipper JavaScript

[clipper-lib](https://github.com/junmer/clipper-lib), version 6.4.2.2.
Angus Johnson, 2010–2017 ; traduction JavaScript par Timo.
Fichier `vendor/clipper/clipper.js`, blob Git
`7e9453dec06ad1c318b924b1cccca426834dfc79`, conservé sans modification.
Boost Software License 1.0 : `vendor/clipper/LICENSE.txt`.
Le code JSBN intégré est de Tom Wu : `vendor/clipper/JSBN-LICENSE.txt`.
Les notices originales sont également conservées en tête du fichier.

## Polices locales

- DejaVu Sans Mono Book : projet DejaVu, dérivé de Bitstream Vera.
  `vendor/fonts/DejaVuSansMono.ttf` ; licence et copyrights dans
  `vendor/fonts/LICENSE.txt`. Police de gravure uniquement.
- [Fjalla One](https://github.com/google/fonts/tree/main/ofl/fjallaone) :
  SIL Open Font License 1.1, `vendor/fonts/fjallaone-OFL.txt`.
- [Open Sans](https://github.com/google/fonts/tree/main/ofl/opensans) :
  SIL Open Font License 1.1, `vendor/fonts/opensans-OFL.txt`.
  La fonte variable est conservée sans modification, avec un nom de fichier
  local simplifié (`OpenSans-Variable.ttf`).

La présentation reprend des caractéristiques du thème Fjalla observées sur
[le blog](https://blog-du-grouik.tinad.fr/) : typographie, corail, gris bleuté,
fond blanc, séparateurs et marges. Le CSS est écrit pour ce configurateur ;
le thème CMS et ses images ne sont pas redistribués.

## Développement seulement

Les tests navigateur utilisent Playwright (Apache-2.0), installé séparément.
Les navigateurs de test, GJS, Python et OpenSCAD natif ne sont pas inclus dans
`dist/`. Aucune dépendance de test n'est chargée par l'application.

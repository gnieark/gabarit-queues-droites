#!/usr/bin/env bash
# Préparation de développement seulement. Aucun outil requis sur le serveur web.
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
wasm_ref=96c8ea8f6a676920e8d21858ae2c603fde2c7c4d
build_dir="$project_dir/.build/openscad-wasm"
vendor_dir="$project_dir/vendor/openscad"
for tool in git make docker npm python3 tar; do
  if ! command -v "$tool" >/dev/null; then
    echo "Outil de développement manquant : $tool" >&2
    exit 1
  fi
done
mkdir -p "$project_dir/.build" "$vendor_dir"
if [ ! -d "$build_dir/.git" ]; then
  git clone --no-checkout https://github.com/lofcz/openscad-wasm.git "$build_dir"
fi
git -C "$build_dir" fetch --depth 1 origin "$wasm_ref"
git -C "$build_dir" checkout --detach "$wasm_ref"
# PTHREAD=0 : pas de SharedArrayBuffer ni d'en-têtes COOP/COEP nécessaires.
# Le Makefile épingle aussi les sources des bibliothèques C/C++.
make -C "$build_dir" ENV=release PTHREAD=0 all
python3 "$project_dir/scripts/cache-meson-sources.py" "$build_dir"
for name in openscad.js openscad.wasm.js openscad.wasm; do
  test -s "$build_dir/build/$name"
done
# Distribuer les sources correspondantes, les correctifs et les recettes de build,
# y compris les bibliothèques liées. Ne pas se limiter à un lien vers main.
# Inclure les archives et les fichiers de licence de toutes les dépendances.
tar --exclude='.git' --exclude='node_modules' --exclude='./build' \
    --exclude='./.oci*' --exclude='./.image*' --exclude='./.base-image*' \
    -czf "$vendor_dir/SOURCES.tar.gz" -C "$build_dir" .
cp "$build_dir/build/openscad.js" "$build_dir/build/openscad.wasm.js" \
   "$build_dir/build/openscad.wasm" "$build_dir/COPYING" "$vendor_dir/"
python3 "$project_dir/scripts/record-wasm.py" "$build_dir" "$wasm_ref" --source-build
echo 'Moteur et sources installés. Exécuter les tests navigateur avant publication.'

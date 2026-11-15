#!/usr/bin/env python3
"""Préparer dist/ seulement si moteur, police, notices et sources sont présents."""
import hashlib
import json
from pathlib import Path
import shutil

root=Path(__file__).resolve().parents[1]
required=['vendor/openscad/openscad.js','vendor/openscad/openscad.wasm.js',
          'vendor/openscad/openscad.wasm','vendor/openscad/COPYING',
          'vendor/openscad/SOURCES.tar.gz','vendor/openscad/BUILD.json',
          'vendor/fonts/DejaVuSansMono.ttf','vendor/fonts/LICENSE.txt']
missing=[p for p in required if not (root/p).is_file() or not (root/p).stat().st_size]
if missing:
    raise SystemExit('Publication impossible : ressources manquantes.\n  '+'\n  '.join(missing)+'\nExécuter scripts/build-wasm.sh puis les tests navigateur.')
vendor=root/'vendor/openscad'
manifest=json.loads((vendor/'BUILD.json').read_text())
for filename,digest in manifest['sha256'].items():
    with (vendor/filename).open('rb') as stream:actual=hashlib.file_digest(stream,'sha256').hexdigest()
    if actual!=digest:
        raise SystemExit('Empreinte incorrecte : '+filename)
if (vendor/'openscad.wasm').read_bytes()[:4]!=b'\0asm':
    raise SystemExit('Binaire WebAssembly invalide.')
dist=root/'dist'
dist.mkdir(exist_ok=True)
for folder in ['css','js','vendor']:
    shutil.copytree(root/folder,dist/folder,dirs_exist_ok=True)
for filename in ['index.html','peigne.scad','README.md','LICENSE.md','LICENSE-APP.txt','THIRD_PARTY_NOTICES.md','VALIDATION.md']:
    shutil.copy2(root/filename,dist/filename)
print('Fichiers statiques prêts dans dist/. Conserver vendor/openscad/SOURCES.tar.gz en ligne.')

#!/usr/bin/env python3
"""Enregistrer la provenance du build effectivement réalisé."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
checkout=Path(sys.argv[1])
revision=sys.argv[2]
source_build='--source-build' in sys.argv[3:]
actual=subprocess.check_output(['git','-C',str(checkout),'rev-parse','HEAD'],text=True).strip()
if actual!=revision:
    raise SystemExit('La révision construite ne correspond pas à la révision attendue.')
refs={}
for path in (checkout/'libs').iterdir():
    if (path/'.git').exists():
        refs[path.name]=subprocess.check_output(['git','-C',str(path),'rev-parse','HEAD'],text=True).strip()
vendor=root/'vendor/openscad'
def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
hashes={p.name:digest(p) for p in vendor.iterdir() if p.is_file() and p.name!='BUILD.json'}
(vendor/'BUILD.json').write_text(json.dumps({
    'repository':'https://github.com/lofcz/openscad-wasm',
    'distribution':'reconstruction locale de @lofcz/openscad-wasm@0.0.2' if source_build else '@lofcz/openscad-wasm@0.0.2',
    'npm_integrity':None if source_build else 'sha512-bmvfseOkgn5+8Nj7VC2UP57gQddZ42ILZ9PZ9L2WQc+8oUlq2WtUJ5A9s/0Xw7ijvUzkY+nAnnhXxdC5WHM4kQ==',
    'revision':revision,'dependencies':refs,'pthread':False,
    'sources':'SOURCES.tar.gz','sha256':hashes,
},indent=2)+'\n')

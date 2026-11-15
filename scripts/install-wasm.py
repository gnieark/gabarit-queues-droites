#!/usr/bin/env python3
"""Installer le binaire épinglé et les sources correspondantes, sans npm.

Python 3.11+, git, make, wget, tar, patch/sed ; réseau requis seulement ici.
Les dépendances présentes dans vendor/ rendent cette étape inutile pour déployer.
"""
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
REVISION='96c8ea8f6a676920e8d21858ae2c603fde2c7c4d'
URL='https://registry.npmjs.org/@lofcz/openscad-wasm/-/openscad-wasm-0.0.2.tgz'
INTEGRITY='sha512-bmvfseOkgn5+8Nj7VC2UP57gQddZ42ILZ9PZ9L2WQc+8oUlq2WtUJ5A9s/0Xw7ijvUzkY+nAnnhXxdC5WHM4kQ=='

def run(*args,cwd=None):
    subprocess.run(args,cwd=cwd,check=True)

def provision():
    vendor=ROOT/'vendor/openscad'
    vendor.mkdir(parents=True,exist_ok=True)
    data=urllib.request.urlopen(URL,timeout=120).read()
    assert 'sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode()==INTEGRITY,'Intégrité npm incorrecte'
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
        for name in ['openscad.js','openscad.wasm.js','openscad.wasm','COPYING','README.md','package.json']:
            (vendor/name).write_bytes(archive.extractfile('package/'+name).read())
    checkout=ROOT/'.build/openscad-wasm'
    if not (checkout/'.git').exists():
        run('git','clone','--no-checkout','https://github.com/lofcz/openscad-wasm.git',str(checkout))
    run('git','fetch','--depth','1','origin',REVISION,cwd=checkout)
    run('git','checkout','--detach',REVISION,cwd=checkout)
    run('make','-j2','libs',cwd=checkout)
    run('python3',str(ROOT/'scripts/cache-meson-sources.py'),str(checkout))
    # Comprend les bibliothèques et leurs sous-modules, licences, patchs,
    # Makefile, Dockerfiles et sources du wrapper. CMake est un outil de build.
    run('tar','--exclude=.git','--exclude=node_modules','--exclude=./build',
        '--exclude=./libs/cmake.tar.gz','-czf',str(vendor/'SOURCES.tar.gz'),'-C',str(checkout),'.')
    run('python3',str(ROOT/'scripts/record-wasm.py'),str(checkout),REVISION)
    print('Moteur et sources installés ; exécuter les tests navigateur.')

if __name__=='__main__':provision()

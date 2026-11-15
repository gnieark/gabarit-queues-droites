#!/usr/bin/env python3
"""Vérifications indépendantes : références de calage et conservation du profil initial."""
import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
spec=importlib.util.spec_from_file_location('profiles',Path(__file__).with_name('compare-profiles.py'))
profiles=importlib.util.module_from_spec(spec);spec.loader.exec_module(profiles)
ROOT=profiles.ROOT

def export(source, filename, params):
    cmd=['openscad','-o',str(filename),'-D','mode="profil"']
    for k,v in params.items():cmd+=['-D',k+'='+json.dumps(v)]
    p=subprocess.run(cmd+[str(source)],env={**os.environ,'QT_QPA_PLATFORM':'offscreen'},capture_output=True,text=True)
    assert p.returncode==0 and 'ERROR:' not in p.stderr,p.stderr
    return profiles.svg_paths(filename)

with tempfile.TemporaryDirectory() as temp:
    folder=Path(temp)
    old=export(ROOT/'tests/fixtures/peigne-original.scad',folder/'old.svg',{})
    same=export(ROOT/'peigne.scad',folder/'same.svg',{'encoche_calage':False})
    assert max(profiles.directed(old,same),profiles.directed(same,old))<1e-9
    for w,j in [(20,0),(20,0.1),(20,0.7),(15,0.1),(30,0.2)]:
        p={'largeur_queue':w,'jeu_emboitement':j,'inscriptions':False}
        base=export(ROOT/'peigne.scad',folder/'base.svg',{**p,'encoche_calage':False})
        cut=export(ROOT/'peigne.scad',folder/'cut.svg',p)
        assert abs(profiles.area(base)-profiles.area(cut)-2*w*(10+j))<0.02
        edges=[(a,b) for path in cut for a,b in zip(path,path[1:]+path[:1])]
        for x in [w,3*w]:
            assert any(abs(a[0]-x)<0.001 and abs(b[0]-x)<0.001 and abs(abs(a[1]-b[1])-(10+j))<0.001 for a,b in edges)
        # Mesurer la largeur de la languette sur son bord d'extrémité, hors tête.
        params={**p,'ajouter_cale':True}
        result=json.loads(subprocess.check_output(['gjs','-m','tests/export-profile.js',json.dumps(params)],cwd=ROOT,text=True))
        assert len(result)==3 # peigne, cale, trou de cale
        tongue_edges=[math.dist(a,b) for path in result for a,b in zip(path,path[1:]+path[:1])
                      if abs(a[1]-32)<0.001 and abs(b[1]-32)<0.001]
        assert len(tongue_edges)==1
        assert abs(2*w-tongue_edges[0]-w)<0.001, 'Course entre butées différente de W' 
    print('Profil original conservé sans calage ; encoches de largeur 2W, départ W et profondeur 10+jeu vérifiées sur 5 dimensions.')

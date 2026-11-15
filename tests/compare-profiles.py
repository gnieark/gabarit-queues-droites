#!/usr/bin/env python3
"""Compare les contours JS aux exports natifs OpenSCAD (aucune dépendance pip)."""
import json
import math
import os
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CASES = {
    'defaults': {},
    'zero-clearance': {'jeu_emboitement': 0},
    'no-compensation': {'diametre_bague': 12},
    'holes': {'trous_fixation': True},
    'countersinks': {'trous_fixation': True, 'fraisure_vis': True},
    'one-tooth': {'nombre_dents': 1, 'profondeur_puzzle': 8},
    'anisotropic-puzzle': {'profondeur_puzzle': 28, 'largeur_dos': 22, 'jeu_emboitement': 0.7},
    'thin-teeth': {'largeur_queue': 15},
    'large': {'nombre_dents': 8, 'largeur_queue': 30, 'diametre_bague': 30, 'longueur_queues': 75},
    'short-fingers': {'longueur_queues': 0.5, 'largeur_dos': 12, 'jeu_emboitement': 0.45},
}

def svg_paths(filename):
    paths = []
    for elem in ET.parse(filename).iter():
        if not elem.tag.endswith('path'):
            continue
        for subpath in re.findall(r'M([^MzZ]+)[zZ]', elem.attrib['d']):
            values = [float(n) for n in re.findall(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?', subpath)]
            paths.append([(x,-y) for x,y in zip(values[::2],values[1::2])])
    return paths

def area(paths):
    return abs(sum(sum(x*v-u*y for (x,y),(u,v) in zip(p,p[1:]+p[:1]))/2 for p in paths))

def distance(point, a, b):
    dx,dy = b[0]-a[0],b[1]-a[1]
    denominator = dx*dx+dy*dy
    t = min(1,max(0,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/denominator)) if denominator else 0
    return math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)

def directed(a, b):
    segments = [edge for p in b for edge in zip(p,p[1:]+p[:1])]
    points = [q for p in a for u,v in zip(p,p[1:]+p[:1]) for q in (u,((u[0]+v[0])/2,(u[1]+v[1])/2))]
    return max(min(distance(q,*edge) for edge in segments) for q in points)

def compare(name, overrides, directory):
    filename = directory / (name+'.svg')
    cmd = ['openscad','-o',str(filename),'-D','mode="profil"']
    for key,value in overrides.items():
        cmd.extend(['-D',key+'='+json.dumps(value)])
    proc = subprocess.run(cmd+['peigne.scad'],cwd=ROOT,env={**os.environ,'QT_QPA_PLATFORM':'offscreen'},capture_output=True,text=True)
    if proc.returncode or 'ERROR:' in proc.stderr:
        raise AssertionError(proc.stderr)
    expected = svg_paths(filename)
    actual = json.loads(subprocess.check_output(['gjs','-m','tests/export-profile.js',json.dumps(overrides)],cwd=ROOT,text=True))
    gap = max(directed(expected,actual),directed(actual,expected))
    delta = abs(area(expected)-area(actual))
    print(f'{name}: contours={len(actual)}, écart de bord={gap:.6f} mm, écart de surface={delta:.6f} mm²',flush=True)
    assert len(expected)==len(actual), f'{name}: nombre de contours différent'
    assert gap < 0.002, f'{name}: profil différent ({gap} mm)'
    assert delta < max(0.01,area(expected)*0.00002), f'{name}: surface différente'
    return {'case':name,'boundary_mm':gap,'area_mm2':delta}

if __name__=='__main__':
    with tempfile.TemporaryDirectory(prefix='peigne-profiles-') as directory:
        results = [compare(name,p,Path(directory)) for name,p in CASES.items()]
    print(json.dumps(results,ensure_ascii=False,indent=2))

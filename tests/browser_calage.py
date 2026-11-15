#!/usr/bin/env python3
"""Calage : vrais téléchargements, deux solides, dimensions et comparaison native."""
import functools
from http.server import ThreadingHTTPServer
import json
import math
import threading
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from browser import ROOT, OUTPUT, Handler, set_value, native
from mesh import read_stl, bounds, volume, compare, section, components

CASES = {
    'cale-interieure': {'inscriptions': False, 'ajouter_cale': True},
    'cale-exterieure': {'inscriptions': False, 'ajouter_cale': True, 'longueur_queues': 8},
    'cale-tournee': {'inscriptions': False, 'ajouter_cale': True, 'largeur_queue': 40, 'diametre_bague': 12, 'longueur_queues': 45},
    'cale-gravures-fraisures': {'ajouter_cale': True, 'trous_fixation': True, 'fraisure_vis': True},
    'sans-calage': {'inscriptions': False, 'encoche_calage': False},
}

def solids(mesh):
    parents=list(range(len(mesh)))
    def root(i):
        while parents[i]!=i:
            parents[i]=parents[parents[i]]; i=parents[i]
        return i
    points={}
    edges={}
    for i,tri in enumerate(mesh):
        keys=[tuple(round(v,5) for v in point) for point in tri]
        for key in keys:
            if key in points: parents[root(i)]=root(points[key])
            else: points[key]=i
        for a,b in zip(keys,keys[1:]+keys[:1]):
            edge=tuple(sorted((a,b)));edges[edge]=edges.get(edge,0)+1
    assert all(n==2 for n in edges.values()), 'Maillage ouvert ou non manifold'
    groups={}
    for i,tri in enumerate(mesh):groups.setdefault(root(i),[]).append(tri)
    return list(groups.values())

if __name__=='__main__':
    OUTPUT.mkdir(exist_ok=True)
    refs={name:native(name,p) for name,p in CASES.items()}
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/'
    results=[]
    try:
        with sync_playwright() as pw:
            for name in ['chromium','firefox']:
                browser=getattr(pw,name).launch()
                context=browser.new_context(accept_downloads=True,viewport={'width':1280,'height':1000})
                page=context.new_page(); errors=[]; requests=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                context.on('request',lambda r:requests.append((r.method,r.url)))
                page.goto(base);page.locator('#outil').wait_for(state='visible')
                assert page.locator('#encoche_calage').is_checked()
                assert not page.locator('#ajouter_cale').is_checked()
                for variant,overrides in CASES.items():
                    page.get_by_role('button',name='Réinitialiser les paramètres').click()
                    page.wait_for_function('document.getElementById("largeur_queue").value==="20" && !document.getElementById("ajouter_cale").checked')
                    for key,value in overrides.items():set_value(page,key,value)
                    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                    page.wait_for_function('!document.getElementById("download").disabled')
                    cale=overrides.get('ajouter_cale',False)
                    assert page.locator('#preview .spacer').count()==int(cale)
                    if cale:assert page.locator('#diametre_vis').is_enabled()
                    page.get_by_label('Deux pièces raccordées',exact=True).check()
                    assert page.locator('#preview .module').count()==2
                    assert page.locator('#preview .spacer').count()==int(cale)
                    with page.expect_download(timeout=240000) as event:
                        page.locator('#download').click()
                        page.wait_for_function('document.getElementById("generation-status").dataset.busy==="false"',timeout=240000)
                        assert page.locator('#generation-status').get_attribute('data-error')!='true',page.locator('#compile-log').text_content()
                    target=OUTPUT/(name+'-'+variant+'.stl');event.value.save_as(target)
                    assert ('_avec_cale' in event.value.suggested_filename)==cale
                    back=overrides.get('longueur_queues',50)+(overrides.get('diametre_bague',24.6)-12)/2+40
                    result={'browser':name,'case':variant,**compare(target,refs[variant],back=back,inscriptions=overrides.get('inscriptions',True))}
                    if not overrides.get('inscriptions',True):
                        bodies=solids(read_stl(target))
                        assert len(bodies)==(2 if cale else 1),'Nombre de solides incorrect en vue assemblée'
                        if cale:
                            spacer=min(bodies,key=volume)
                            w=overrides.get('largeur_queue',20)
                            polygon_hole=96/2*(4.5/2)**2*math.sin(2*math.pi/96)
                            assert abs(volume(spacer)-(400+10*w-polygon_hole)*8)<0.01
                            box=bounds(spacer);size=[hi-lo for lo,hi in zip(*box)]
                            assert max(abs(a-b) for a,b in zip(sorted(size[:2]),sorted([max(20,w),30])))<0.001
                            assert abs(size[2]-8)<0.001
                            # Un trou traversant, deux contours au milieu de la cale.
                            assert len(components(section(spacer,2,4)))==2
                        result['solids']=len(bodies)
                    results.append(result);print(json.dumps(result),flush=True)
                    if variant=='cale-interieure':
                        page.get_by_label('Une pièce',exact=True).check()
                        page.screenshot(path=str(OUTPUT/(name+'-calage-desktop.png')),full_page=True)
                        page.set_viewport_size({'width':320,'height':800})
                        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                        page.screenshot(path=str(OUTPUT/(name+'-calage-mobile.png')),full_page=True)
                        page.set_viewport_size({'width':1280,'height':1000})
                set_value(page,'encoche_calage',True)
                set_value(page,'ajouter_cale',True)
                set_value(page,'diametre_vis',18)
                page.wait_for_function('document.getElementById("download").disabled')
                assert 'cale' in page.locator('#validation').inner_text().lower()
                set_value(page,'diametre_vis',4.5)
                set_value(page,'trous_fixation',True)
                set_value(page,'largeur_dos',22)
                page.wait_for_function('document.getElementById("download").disabled')
                assert 'proche' in page.locator('#validation').inner_text()
                assert not errors,errors
                assert all(method=='GET' and urlparse(url).netloc==urlparse(base).netloc for method,url in requests)
                context.close();browser.close()
        (OUTPUT/'calage-results.json').write_text(json.dumps(results,indent=2)+'\n')
    finally:server.shutdown()

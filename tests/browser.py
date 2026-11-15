#!/usr/bin/env python3
"""Tests réels via HTTP, Worker WASM et téléchargement ; Chromium + Firefox.

python3 -m pip install playwright
python3 -m playwright install chromium firefox
python3 tests/browser.py
"""
import functools
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import threading
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from mesh import compare,read_stl,volume

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'test-results'
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
    def copyfile(self,source,outputfile):
        try:super().copyfile(source,outputfile)
        except (BrokenPipeError,ConnectionResetError):pass # Annulation du Worker.

def set_value(page,key,value):
    locator=page.locator('#'+key)
    # Ouvrir la section repliée avant toute interaction accessible.
    locator.evaluate('(input) => { const d=input.closest("details"); if(d) d.open=true; }')
    if isinstance(value,bool):
        locator.set_checked(value)
    else:
        locator.fill(str(value))

def native(name,overrides):
    target=OUTPUT/(name+'-native.stl')
    cmd=['openscad','-o',str(target)]
    for key,value in overrides.items():
        cmd+=['-D',f'{key}={json.dumps(value)}']
    proc=subprocess.run(cmd+[str(ROOT/'peigne.scad')],env={**os.environ,'QT_QPA_PLATFORM':'offscreen'},capture_output=True,text=True,timeout=900)
    (OUTPUT/(name+'-native.log')).write_text(proc.stderr)
    assert proc.returncode==0 and 'ERROR:' not in proc.stderr,proc.stderr
    return target

def test_browser(browser,base_url,name):
    context=browser.new_context(accept_downloads=True,viewport={'width':1280,'height':900})
    page=context.new_page()
    requests=[]
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    context.on('request',lambda request:requests.append((request.method,request.url)))
    page.goto(base_url)
    page.locator('#outil').wait_for(state='visible')
    assert page.locator('#diametre_bague').input_value()=='24.6'
    assert page.locator('#diametre_fraise').input_value()=='12'
    assert page.locator('#preview .module').count()==1
    before=page.locator('#preview .module').get_attribute('d')
    set_value(page,'largeur_queue',22)
    page.wait_for_function('(before) => document.querySelector("#preview .module").getAttribute("d") !== before',arg=before)
    page.get_by_role('button',name='Réinitialiser les paramètres').click()
    page.wait_for_function('document.getElementById("largeur_queue").value === "20"')
    page.get_by_label('Deux pièces raccordées',exact=True).check()
    assert page.locator('#preview .module').count()==2
    set_value(page,'diametre_bague',50)
    page.wait_for_function('document.getElementById("download").disabled')
    assert page.locator('#validation').inner_text()
    set_value(page,'diametre_bague',24.6)
    page.locator('#download').wait_for(state='visible')
    set_value(page,'largeur_queue',15)
    page.wait_for_function('document.getElementById("validation").textContent.includes("moins de 4")')
    assert page.locator('#download').is_enabled()
    set_value(page,'largeur_queue',20)
    page.screenshot(path=str(OUTPUT/(name+'-desktop.png')),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUTPUT/(name+'-mobile.png')),full_page=True)
    results=[]
    for variant,overrides in [
        ('default',{}),('plain',{'inscriptions':False}),
        ('holes',{'inscriptions':False,'trous_fixation':True}),
        ('countersinks',{'inscriptions':False,'trous_fixation':True,'fraisure_vis':True}),
    ]:
        for key,value in overrides.items():set_value(page,key,value)
        with page.expect_download(timeout=900000) as event:
            page.locator('#download').click()
            assert page.locator('#download').is_disabled()
            # L'interface reste réactive pendant le calcul ; l'export garde
            # les paramètres capturés au clic, même en aperçu assemblé.
            page.get_by_label('Une pièce',exact=True).check()
            assert page.locator('#preview .module').count()==1
            page.wait_for_function('document.getElementById("generation-status").dataset.busy === "false"',timeout=180000)
            assert page.locator('#generation-status').get_attribute('data-error')!='true',page.locator('#generation-status').inner_text()+'\n'+page.locator('#compile-log').text_content()
        download=event.value
        assert download.suggested_filename=='peigne_20mm_3dents.stl'
        target=OUTPUT/(name+'-'+variant+'.stl')
        download.save_as(target)
        assert page.locator('#download-again').is_visible()
        ref=OUTPUT/(variant+'-native.stl')
        if not ref.exists():ref=native(variant,overrides)
        result={'browser':name,'variant':variant,**compare(target,ref,inscriptions=variant=='default')}
        results.append(result)
        print(json.dumps(result),flush=True)
    assert results[0]['volume_mm3']<results[1]['volume_mm3']-1,'Gravures absentes'
    assert results[2]['volume_mm3']<results[1]['volume_mm3']-1,'Trous absents'
    assert results[3]['volume_mm3']<results[2]['volume_mm3']-1,'Fraisures absentes'
    # La police indisponible doit faire échouer explicitement le calcul.
    set_value(page,'inscriptions',True)
    context.route('**/vendor/fonts/DejaVuSansMono.ttf',lambda route:route.fulfill(status=404,body='missing'))
    page.locator('#download').click()
    page.wait_for_function('document.getElementById("generation-status").dataset.error === "true"',timeout=60000)
    assert 'police' in page.locator('#generation-status').inner_text().lower() or 'DejaVu' in page.locator('#generation-status').inner_text()
    assert page.locator('#download-again').is_hidden()
    context.unroute('**/vendor/fonts/DejaVuSansMono.ttf')
    page.locator('#download').click()
    page.locator('#cancel').click()
    assert 'annulée' in page.locator('#generation-status').inner_text()
    assert not errors,errors
    assert all(method=='GET' and urlparse(url).netloc==urlparse(base_url).netloc for method,url in requests),requests
    context.close()
    return results

if __name__=='__main__':
    assert (ROOT/'vendor/openscad/openscad.wasm').exists(),'Installer OpenSCAD WASM avant ce test.'
    OUTPUT.mkdir(exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    results=[]
    try:
        with sync_playwright() as playwright:
            for name in ['chromium','firefox']:
                browser=getattr(playwright,name).launch()
                try:results+=test_browser(browser,f'http://127.0.0.1:{server.server_port}/',name)
                finally:browser.close()
        (OUTPUT/'browser-results.json').write_text(json.dumps(results,indent=2)+'\n')
        print(json.dumps(results,indent=2))
    finally:
        server.shutdown()

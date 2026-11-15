#!/usr/bin/env python3
"""Cas combiné et contrôles supplémentaires ; serveur statique lancé par le test."""
import functools
import json
from pathlib import Path
import threading
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from browser import ROOT,OUTPUT,Handler,set_value,native
from mesh import compare

if __name__=='__main__':
    OUTPUT.mkdir(exist_ok=True)
    overrides={'inscriptions':True,'trous_fixation':True,'fraisure_vis':True}
    reference=OUTPUT/'combined-native.stl'
    if not reference.exists():reference=native('combined',overrides)
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    results=[]
    try:
        with sync_playwright() as p:
            for name in ['chromium','firefox']:
                browser=getattr(p,name).launch()
                context=browser.new_context(accept_downloads=True,viewport={'width':320,'height':800})
                page=context.new_page()
                page.goto(f'http://127.0.0.1:{server.server_port}/')
                page.locator('#outil').wait_for(state='visible')
                assert page.locator('#diametre_tete_vis').is_disabled()
                set_value(page,'nombre_dents',201)
                page.wait_for_function('document.getElementById("preview").hasAttribute("hidden")')
                assert page.locator('#download').is_enabled()
                set_value(page,'nombre_dents',3)
                page.locator('#preview').wait_for(state='visible')
                page.locator('#zoom-preview').click()
                assert page.locator('#zoom-preview').get_attribute('aria-pressed')=='true'
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.locator('.drawing').focus()
                page.keyboard.press('ArrowRight')
                page.wait_for_function('document.querySelector(".drawing").scrollLeft>0')
                page.locator('#zoom-preview').click()
                for key,value in overrides.items():set_value(page,key,value)
                page.locator('#diametre_tete_vis').wait_for(state='visible')
                with page.expect_download(timeout=180000) as event:
                    page.locator('#download').click()
                    # Le formulaire est utilisable et le calcul garde son instantané.
                    set_value(page,'largeur_queue',22)
                    page.wait_for_function('document.getElementById("generation-status").dataset.busy === "false"',timeout=180000)
                    assert page.locator('#generation-status').get_attribute('data-error')!='true'
                target=OUTPUT/(name+'-combined.stl')
                event.value.save_as(target)
                assert event.value.suggested_filename=='peigne_20mm_3dents.stl'
                results.append({'browser':name,**compare(target,reference,inscriptions=True)})
                # Exécuter une erreur SCAD dans le vrai moteur, hors validation JS.
                result=page.evaluate('''async()=>{
                  const original=await(await fetch('peigne.scad')).text();
                  const {defaultsFromSCAD}=await import('./js/parameters.js');
                  return await new Promise(resolve=>{
                    const worker=new Worker('./js/openscad-worker.js',{type:'module'});
                    worker.onmessage=({data})=>{if(data.type!=='status'){resolve(data);worker.terminate();}};
                    worker.postMessage({source:original+'\nassert(false,"Test erreur de compilation");',parameters:defaultsFromSCAD(original)});
                  });
                }'''.replace("original+'\nassert","original+'\\nassert"))
                assert result['type']=='error',result
                assert 'Test erreur de compilation' in result['log'],result
                page.get_by_role('button',name='Réinitialiser les paramètres').click()
                page.wait_for_function('!document.getElementById("trous_fixation").checked')
                assert page.locator('#largeur_queue').input_value()=='20'
                page.evaluate('window.scrollTo(0,0)')
                page.screenshot(path=str(OUTPUT/(name+'-320px.png')),full_page=True)
                print(json.dumps(results[-1]),flush=True)
                context.close();browser.close()
        (OUTPUT/'options-results.json').write_text(json.dumps(results,indent=2)+'\n')
    finally:server.shutdown()

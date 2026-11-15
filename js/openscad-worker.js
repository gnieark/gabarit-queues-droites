// SPDX-License-Identifier: GPL-2.0-or-later
import { scadArguments } from './parameters.js';

let running = false;
const root = new URL('../',import.meta.url);
const progress = message => self.postMessage({type:'status',message});

async function bytes(path) {
  let response;
  try { response = await fetch(new URL(path,root)); }
  catch { throw new Error(`Impossible de charger la ressource locale ${path}. Vérifiez son installation et réessayez.`); }
  if (!response.ok) throw new Error(`Ressource locale manquante : ${path} (HTTP ${response.status}). Consultez la documentation d’installation.`);
  return new Uint8Array(await response.arrayBuffer());
}

// Un Worker et une instance ne servent qu'à un calcul. terminate() libère le tas
// WASM, les caches OpenSCAD, le système de fichiers virtuel et le Fontconfig.
self.onmessage = async ({data}) => {
  if (running) return;
  running = true;
  const log = [];
  const record = line => { log.push(String(line)); if(log.length>400) log.shift(); };
  try {
    const args = scadArguments(data.parameters);
    if (typeof data.source !== 'string' || !data.source.includes('module piece()')) throw new Error('Le modèle OpenSCAD est absent ou incompatible.');
    let createOpenSCAD;
    try {
      ({default:createOpenSCAD} = await import('../vendor/openscad/openscad.js'));
    } catch {
      throw new Error('OpenSCAD WASM n’est pas installé ou ne peut pas être chargé. Préparez les ressources locales décrites dans README.md ; aucun STL n’a été généré.');
    }
    const font = data.parameters.inscriptions ? await bytes('vendor/fonts/DejaVuSansMono.ttf') : null;
    if (font && (font.length<1000 || font[0]!==0 || font[1]!==1 || font[2]!==0 || font[3]!==0)) {
      throw new Error('La police DejaVu Sans Mono est absente ou invalide. Les inscriptions n’ont pas été supprimées : le calcul est arrêté.');
    }
    const instance = await createOpenSCAD({
      noInitialRun:true,
      locateFile:path=>new URL(`vendor/openscad/${path}`,root).href,
      print:record,printErr:record,
    });
    const FS=instance.FS;
    const mkdir = path => { try { FS.mkdir(path); } catch (error) { if (!FS.analyzePath(path).exists) throw error; } };
    mkdir('/fonts');
    // Fontconfig OpenSCAD WASM recherche /fonts/fonts.conf. Aucun fallback
    // typographique n'est nécessaire : cette famille est la seule installée.
    FS.writeFile('/fonts/fonts.conf','<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>/fonts</dir><cachedir>/tmp/fontconfig</cachedir></fontconfig>');
    if(font) FS.writeFile('/fonts/DejaVuSansMono.ttf',font);
    FS.writeFile('/input.scad',data.source);
    progress('Génération en cours… Le calcul peut prendre plusieurs secondes. Vous pouvez continuer à utiliser le formulaire.');
    let exit;
    try {
      exit = instance.callMain(['/input.scad','--backend=Manifold','--export-format=binstl','-o','/output.stl',...args]);
    } catch (error) {
      if (error?.name === 'ExitStatus') exit=error.status;
      else throw error;
    }
    if ((exit!==undefined && exit!==0) || log.some(line=>/ERROR:|WARNING:.*(?:font|text|manifold|backend)|Could not.*font|Can't.*font/i.test(line))) {
      throw new Error('OpenSCAD n’a pas pu générer le gabarit avec ces paramètres. Consultez les détails du calcul.');
    }
    const output = FS.readFile('/output.stl');
    // Le format demandé est binaire : rejeter les sorties vides ou incomplètes.
    if (output.length<84) throw new Error('OpenSCAD a produit un fichier STL vide.');
    const view = new DataView(output.buffer,output.byteOffset,output.byteLength);
    const triangles=view.getUint32(80,true);
    if (!triangles || output.length!==84+triangles*50) throw new Error('Le fichier produit n’est pas un STL binaire complet.');
    const buffer=output.slice().buffer;
    self.postMessage({type:'done',buffer,log:log.join('\n')},[buffer]);
  } catch (error) {
    self.postMessage({type:'error',message:error.message || 'Échec du calcul OpenSCAD.',log:log.join('\n')});
  }
};

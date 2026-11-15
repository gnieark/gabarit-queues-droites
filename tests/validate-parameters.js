import GLib from 'gi://GLib';
import { defaultsFromSCAD, derived, validate, scadArguments } from '../js/parameters.js';
const [, bytes]=GLib.file_get_contents('peigne.scad');
const defaults=defaultsFromSCAD(new TextDecoder().decode(bytes));
const d=derived(defaults);
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
assert(Math.abs(d.largeur_dent-7.4)<1e-9,'largeur dent');
assert(d.ouverture===32.6 && d.longueur_piece===120 && d.encombrement===140,'dimensions');
assert(defaults.diametre_fraise===12 && defaults.diametre_bague===24.6,'diamètres par défaut');
assert(!validate(defaults).errors.length,'défauts valides');
assert(defaults.encoche_calage && !defaults.ajouter_cale,'calage par défaut');
assert(d.profondeur_encoche===10.1,'jeu uniquement en profondeur');
const cases=[
  [{ajouter_cale:true},true], [{ajouter_cale:true,diametre_vis:0},false],
  [{ajouter_cale:true,diametre_vis:18},false], [{ajouter_cale:true,diametre_vis:17.9},true],
  [{nombre_dents:1,profondeur_puzzle:8},false],
  [{encoche_calage:true,largeur_dos:12},false],
  [{encoche_calage:false,largeur_dos:12},true],
  [{largeur_dos:22,trous_fixation:true},false],
  [{largeur_dos:30,trous_fixation:true,fraisure_vis:true},false],
  [{largeur_dos:34,trous_fixation:true,fraisure_vis:true},true],
  [{ajouter_cale:true,encoche_calage:false},true],
  [{epaisseur:0},false], [{longueur_queues:-1},false], [{largeur_queue:0},false],
  [{diametre_bague:11},false], [{diametre_fraise:0},false], [{diametre_fraise:21},false],
  [{diametre_bague:32},false], [{nombre_dents:0},false], [{nombre_dents:1.5},false],
  [{nombre_dents:1},false], [{nombre_dents:1,profondeur_puzzle:8,encoche_calage:false},true],
  [{largeur_dos:0},false], [{profondeur_puzzle:0},false], [{profondeur_puzzle:59.8},false],
  [{jeu_emboitement:-0.01},false], [{jeu_emboitement:2},false], [{jeu_emboitement:0},true],
  [{trous_fixation:true,diametre_vis:0},false], [{diametre_vis:-1},true],
  [{trous_fixation:true,diametre_vis:38},false],
  [{trous_fixation:true,fraisure_vis:true},true],
  [{trous_fixation:true,fraisure_vis:true,angle_fraisure:180},false],
  [{trous_fixation:true,fraisure_vis:true,angle_fraisure:0},false],
  [{trous_fixation:true,fraisure_vis:true,angle_fraisure:150},true],
  [{trous_fixation:true,fraisure_vis:true,diametre_tete_vis:4},false],
  [{trous_fixation:true,fraisure_vis:true,epaisseur:2},false],
  [{trous_fixation:true,fraisure_vis:true,diametre_tete_vis:38,epaisseur:30},false],
  [{fraisure_vis:true,angle_fraisure:0},true],
  [{taille_texte:0},false], [{profondeur_gravure:0},false], [{profondeur_gravure:2},false],
  [{inscriptions:false,profondeur_gravure:2},true],
  [{nombre_dents:1,profondeur_puzzle:19},false],
  [{nombre_dents:1,profondeur_puzzle:19,inscriptions:false,encoche_calage:false},true],
  [{largeur_queue:15},true], [{diametre_bague:12},true],
];
for(const [overrides,valid] of cases){
  const p={...defaults,...overrides}, result=validate(p);
  assert((result.errors.length===0)===valid,JSON.stringify(overrides));
  // L'export natif CSG évalue les assertions, y compris celles de gravures().
  const args=['openscad','-o','/tmp/peigne-validation.csg'];
  for(const [key,value] of Object.entries(overrides))args.push('-D',`${key}=${value}`);
  args.push('peigne.scad');
  const [,stdout,stderr]=GLib.spawn_sync(null,args,['QT_QPA_PLATFORM=offscreen'],GLib.SpawnFlags.SEARCH_PATH,null);
  const log=new TextDecoder().decode(stderr)+new TextDecoder().decode(stdout);
  const nativeValid=!log.includes('ERROR:');
  assert(nativeValid===valid,`Validation native différente : ${JSON.stringify(overrides)}\n${log}`);
}
assert(validate({...defaults,largeur_queue:15}).warnings.length===1,'alerte doigts fins');
assert(validate({...defaults,largeur_queue:NaN}).errors.length>0,'champ vide');
assert(scadArguments(defaults).at(-1)==='mode="piece"','STL limité à une pièce');
assert(!scadArguments({...defaults,inscriptions:false,taille_texte:NaN}).join(' ').includes('NaN'),'champ masqué invalide ignoré');
print(`${cases.length} configurations : validations JavaScript / OpenSCAD identiques ; valeurs calculées et avertissements vérifiés.`);

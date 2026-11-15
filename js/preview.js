// SPDX-License-Identifier: GPL-2.0-or-later
import { profile, spacerProfile, pathData } from './geometry.js';
import { derived, format, spacerPlacement } from './parameters.js';

const NS = 'http://www.w3.org/2000/svg';
function element(name, attributes = {}, text = '') {
  const e = document.createElementNS(NS, name);
  for (const [key,value] of Object.entries(attributes)) e.setAttribute(key, value);
  if (text) e.textContent = text;
  return e;
}
export function drawPreview(svg, p, { assembled = false, guide = false } = {}) {
  const d = derived(p);
  const back = d.racine+p.largeur_dos;
  const end = d.longueur_piece*(assembled ? 2 : 1);
  const cale = p.ajouter_cale ? spacerPlacement(p,assembled?2:1) : null;
  const left = Math.min(-p.profondeur_puzzle,cale?.x ?? 0);
  const right = Math.max(end,cale ? cale.x+cale.width : end);
  const top = Math.max(back,cale ? cale.y+cale.height : back);
  const bottom = Math.min(-d.largeur_dent/2,cale?.y ?? 0);
  const font = Math.max(5,(end+p.profondeur_puzzle)/42);
  const pad = font*5;
  svg.replaceChildren();
  svg.setAttribute('viewBox', `${left-pad} ${-top-pad*2} ${right-left+pad*2.5} ${top-bottom+pad*4}`);
  svg.append(element('title', {id:'svg-title'}, assembled ? 'Deux modules raccordés, vus de dessus' : 'Un module vu de dessus'));
  svg.append(element('desc', {id:'svg-desc'}, `${p.nombre_dents} dents par module. Largeur réelle des dents : ${format(d.largeur_dent)} mm. Ouverture : ${format(d.ouverture)} mm. Longueur du corps : ${format(d.longueur_piece)} mm. Raccord mâle à gauche, femelle à droite. ${p.encoche_calage ? `Encoche arrière de ${format(2*p.largeur_queue)} mm sur ${format(d.profondeur_encoche)} mm.` : ''} ${cale ? 'Une cale séparée avec trou de vis est ajoutée au plateau.' : ''}`));
  const paths = pathData(profile(p));
  for (let i=0;i<(assembled?2:1);i++) {
    const group=element('g', {transform:`translate(${i*d.longueur_piece},0)`});
    group.append(element('path', {d:paths,'fill-rule':'evenodd',class:`module module-${i+1}`}));
    // Indication des fraisures seulement : le profil réel conserve les trous traversants.
    if (d.fraisure_active) for (const x of [d.longueur_piece/4,3*d.longueur_piece/4]) {
      group.append(element('circle',{cx:x,cy:-(d.racine+p.largeur_dos/2),r:p.diametre_tete_vis/2,class:'countersink'}));
    }
    svg.append(group);
  }
  if (cale) svg.append(element('path',{d:pathData(spacerProfile(p,assembled?2:1)),'fill-rule':'evenodd',class:'spacer'}));
  if (guide && (!cale?.inside || p.nombre_dents>2)) {
    const x=p.largeur_queue*(cale?.inside?3.5:1.5), y=-p.longueur_queues/2;
    svg.append(element('circle',{cx:x,cy:y,r:p.diametre_bague/2,class:'guide-ring'}));
    svg.append(element('circle',{cx:x,cy:y,r:p.diametre_fraise/2,class:'router-bit'}));
  }
  const dimensions=element('g',{class:'dimensions','font-size':font});
  function line(x1,y1,x2,y2,cls='dimension-line') {
    dimensions.append(element('line',{x1,y1,x2,y2,class:cls}));
  }
  function horizontal(x1,x2,y,anchor,label) {
    line(x1,anchor,x1,y+font); line(x2,anchor,x2,y+font);
    line(x1,y,x2,y);
    for (const x of [x1,x2]) line(x-font/2,y+font/2,x+font/2,y-font/2,'dimension-tick');
    dimensions.append(element('text',{x:(x1+x2)/2,y:y-font*0.55,'text-anchor':'middle'},label));
  }
  horizontal(-p.profondeur_puzzle,end,-top-pad*1.4,-back,`${format(end+p.profondeur_puzzle)} mm · hors tout`);
  horizontal(0,d.longueur_piece,-top-pad*0.55,-back,`${format(d.longueur_piece)} mm · raccordement`);
  const tip=d.largeur_dent/2;
  horizontal(d.compensation,p.largeur_queue-d.compensation,-bottom+pad*0.8,tip,`${format(d.largeur_dent)} mm · dent`);
  if (p.nombre_dents>1 || assembled) horizontal(p.largeur_queue-d.compensation,d.pas+d.compensation,-bottom+pad*1.7,0,`${format(d.ouverture)} mm · ouverture`);
  // Si la cale est à droite, porter cette cote à gauche pour éviter de la traverser.
  const onLeft=right>end, anchor=onLeft?left:end;
  const x=onLeft?left-pad*0.55:end+pad*0.8, direction=onLeft?-1:1;
  line(anchor,0,x+direction*font,0); line(anchor,-p.longueur_queues,x+direction*font,-p.longueur_queues); line(x,0,x,-p.longueur_queues);
  dimensions.append(element('text',{transform:`translate(${x+direction*font*1.3},${-p.longueur_queues/2}) rotate(-90)`,'text-anchor':'middle'},`${format(p.longueur_queues)} mm · partie droite`));
  if (p.encoche_calage) {
    const y=-back+3;
    line(p.largeur_queue,y,3*p.largeur_queue,y);
    for(const xx of [p.largeur_queue,3*p.largeur_queue]) line(xx,y-1,xx,y+1,'dimension-tick');
    dimensions.append(element('text',{x:2*p.largeur_queue,y:y+4.5,'text-anchor':'middle','font-size':Math.min(font,4)},`${format(2*p.largeur_queue)} mm`));
  }
  svg.append(dimensions);
}

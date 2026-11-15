// SPDX-License-Identifier: GPL-2.0-or-later
import { profile, pathData } from './geometry.js';
import { derived, format } from './parameters.js';

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
  const font = Math.max(5,(end+p.profondeur_puzzle)/42);
  const pad = font*5;
  svg.replaceChildren();
  svg.setAttribute('viewBox', `${-p.profondeur_puzzle-pad} ${-back-pad*2} ${end+p.profondeur_puzzle+pad*2.5} ${back+d.largeur_dent/2+pad*4}`);
  svg.append(element('title', {id:'svg-title'}, assembled ? 'Deux modules raccordés, vus de dessus' : 'Un module vu de dessus'));
  svg.append(element('desc', {id:'svg-desc'}, `${p.nombre_dents} dents par module. Largeur réelle des dents : ${format(d.largeur_dent)} mm. Ouverture : ${format(d.ouverture)} mm. Longueur du corps : ${format(d.longueur_piece)} mm. Raccord mâle à gauche, femelle à droite.`));
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
  if (guide) {
    const x=p.largeur_queue*1.5, y=-p.longueur_queues/2;
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
  horizontal(-p.profondeur_puzzle,end,-back-pad*1.4,-back,`${format(end+p.profondeur_puzzle)} mm · hors tout`);
  horizontal(0,d.longueur_piece,-back-pad*0.55,-back,`${format(d.longueur_piece)} mm · raccordement`);
  const tip=d.largeur_dent/2;
  horizontal(d.compensation,p.largeur_queue-d.compensation,tip+pad*0.8,tip,`${format(d.largeur_dent)} mm · dent`);
  if (p.nombre_dents>1 || assembled) horizontal(p.largeur_queue-d.compensation,d.pas+d.compensation,tip+pad*1.7,0,`${format(d.ouverture)} mm · ouverture`);
  const x=end+pad*0.8;
  line(end,0,x+font,0); line(end,-p.longueur_queues,x+font,-p.longueur_queues); line(x,0,x,-p.longueur_queues);
  dimensions.append(element('text',{transform:`translate(${x+font*1.3},${-p.longueur_queues/2}) rotate(-90)`,'text-anchor':'middle'},`${format(p.longueur_queues)} mm · partie droite`));
  svg.append(dimensions);
}

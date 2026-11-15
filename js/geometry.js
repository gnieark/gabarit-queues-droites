// SPDX-License-Identifier: GPL-2.0-or-later
import '../vendor/clipper/clipper.js';
import { derived } from './parameters.js';

const C = globalThis.ClipperLib;
// Même grille entière que l'export 2D d'OpenSCAD 2021.01.
const SCALE = 65536;
const EPSILON = 0.01;
const FN = 96;
const pt = ([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) });
const polygon = points => {
  const p = points.map(pt);
  if (!C.Clipper.Orientation(p)) p.reverse();
  return p;
};
const rectangle = (x, y, w, h) => polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
const translate = (paths, x, y) => paths.map(path => path.map(p => ({ X: p.X + Math.round(x*SCALE), Y: p.Y + Math.round(y*SCALE) })));
function boolean(subject, clip, operation) {
  const c = new C.Clipper();
  c.AddPaths(subject, C.PolyType.ptSubject, true);
  if (clip.length) c.AddPaths(clip, C.PolyType.ptClip, true);
  const result = [];
  c.Execute(operation, result, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  return result;
}
const union = paths => boolean(paths, [], C.ClipType.ctUnion);
const subtract = (a, b) => boolean(a, b, C.ClipType.ctDifference);
function offset(paths, distance, round = false) {
  if (distance === 0) return paths;
  const c = new C.ClipperOffset(1000000, Math.abs(distance) * SCALE * (1 - Math.cos(Math.PI / FN)));
  c.AddPaths(paths, round ? C.JoinType.jtRound : C.JoinType.jtMiter, C.EndType.etClosedPolygon);
  const result = [];
  c.Execute(result, distance * SCALE);
  return result;
}
export function arcPoints(center, radius, start, end, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (start + (end - start) * i / n) * Math.PI / 180;
    return [center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)];
  });
}
export function puzzlePoints(p) {
  const r = 3.903882032022072;
  return [[0,0],[0,5],
    ...arcPoints([-r,5],r,0,104.0362434679265),
    ...arcPoints([-20+r,10],r,284.0362434679265,180),
    ...arcPoints([-20+r,30],r,180,75.9637565320735),
    ...arcPoints([-r,35],r,255.9637565320735,360),[0,40]]
    .map(([x,y]) => [x*p.profondeur_puzzle/20,y*p.largeur_dos/40]);
}
const circle = (x,y,r) => polygon(arcPoints([x,y],r,0,360,FN).slice(0,-1));

// Correspondance directe avec languette(), dos(), doigts(), profil().
// Le STL n'utilise jamais ce code : il compile le SCAD original.
export function profile(p) {
  const d = derived(p);
  const tab = polygon([...puzzlePoints(p), [EPSILON,p.largeur_dos],[EPSILON,0]]);
  const back = subtract(union([rectangle(0,0,d.longueur_piece,p.largeur_dos),tab]),
    translate(offset([tab],p.jeu_emboitement),d.longueur_piece,0));
  const slots = [];
  for (let i=-1;i<p.nombre_dents;i++) {
    slots.push(...offset([rectangle(i*d.pas+p.largeur_queue,-p.diametre_bague-1,
      p.largeur_queue,p.longueur_queues+p.diametre_bague+1)],d.compensation,true));
  }
  const fingers = subtract([rectangle(0,0,d.longueur_piece,d.racine+EPSILON)],slots);
  for (let i=0;i<p.nombre_dents;i++) fingers.push(circle(p.largeur_queue/2+i*d.pas,0,d.largeur_dent/2));
  let result = union([...fingers,...translate(back,0,d.racine)]);
  if (p.trous_fixation) result = subtract(result,
    [d.longueur_piece/4,3*d.longueur_piece/4].map(x=>circle(x,d.racine+p.largeur_dos/2,p.diametre_vis/2)));
  return result.map(path=>path.map(({X,Y})=>[X/SCALE,Y/SCALE]));
}
export function pathData(paths) {
  return paths.map(path => path.map(([x,y],i) => `${i ? 'L' : 'M'}${x},${-y}`).join(' ')+' Z').join(' ');
}

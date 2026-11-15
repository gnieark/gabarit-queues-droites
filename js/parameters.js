// SPDX-License-Identifier: GPL-2.0-or-later
// Les valeurs initiales viennent de peigne.scad, jamais d'une seconde liste.
export const groups = [
  { title: 'Guidage', fields: [
    ['largeur_queue', 'Largeur des queues', 'mm', 0.1],
    ['diametre_fraise', 'Diamètre de la fraise', 'mm', 0.1],
    ['diametre_bague', 'Diamètre extérieur de la bague', 'mm', 0.1],
    ['nombre_dents', 'Nombre de dents', '', 1],
    ['longueur_queues', 'Longueur droite des doigts', 'mm', 1, 'Hors bouts arrondis. Ne règle pas la profondeur de coupe dans le bois.'],
    ['epaisseur', 'Épaisseur du gabarit', 'mm', 0.1],
  ] },
  { title: 'Raccords puzzle', fields: [
    ['jeu_emboitement', 'Jeu d’emboîtement', 'mm', 0.01, 'Jeu normal entre les surfaces mâle et femelle.'],
    ['largeur_dos', 'Largeur du dos', 'mm', 1],
    ['profondeur_puzzle', 'Profondeur des raccords', 'mm', 1],
  ] },
  { title: 'Calage', fields: [
    ['encoche_calage', 'Ajouter l’encoche au dos du peigne', 'boolean', 0, 'Largeur : deux queues. Profondeur : 10 mm + jeu ; aucun jeu latéral.'],
    ['ajouter_cale', 'Ajouter la cale à imprimer dans le STL', 'boolean', 0, 'Carré de 20 × 20 mm, languette de 10 mm et trou de vis. Même épaisseur que le peigne. Diamètre du trou réglable dans Fixations.'],
  ] },
  { title: 'Fixations', fields: [
    ['trous_fixation', 'Ajouter les deux trous de fixation', 'boolean'],
    ['diametre_vis', 'Diamètre des vis', 'mm', 0.1, 'Diamètre commun aux fixations du peigne et au trou de la cale.', 'vis_actives'],
    ['fraisure_vis', 'Ajouter les fraisures sur le dessus', 'boolean', 0, '', 'trous_fixation'],
    ['diametre_tete_vis', 'Diamètre des têtes de vis', 'mm', 0.1, '', 'fraisure_active'],
    ['angle_fraisure', 'Angle total des fraisures', '°', 1, '', 'fraisure_active'],
  ] },
  { title: 'Inscriptions', fields: [
    ['inscriptions', 'Graver les dimensions et l’URL du blog', 'boolean'],
    ['profondeur_gravure', 'Profondeur de gravure', 'mm', 0.1, '', 'inscriptions'],
    ['taille_texte', 'Taille maximale du texte', 'mm', 0.1, 'La taille est réduite automatiquement selon la place disponible.', 'inscriptions'],
  ] },
];
export const fields = groups.flatMap(g => g.fields);
export function defaultsFromSCAD(source) {
  const values = {};
  for (const [key, , unit] of fields) {
    const match = source.match(new RegExp(`^${key}\\s*=\\s*([^;]+);`, 'm'));
    if (!match) throw new Error(`Paramètre absent du modèle : ${key}.`);
    const literal = match[1].trim();
    if (unit === 'boolean') {
      if (!['true', 'false'].includes(literal)) throw new Error(`Valeur booléenne attendue pour ${key}.`);
      values[key] = literal === 'true';
    } else {
      values[key] = Number(literal);
      if (!Number.isFinite(values[key])) throw new Error(`Valeur numérique attendue pour ${key}.`);
    }
  }
  return values;
}
export function derived(p) {
  const compensation = (p.diametre_bague - p.diametre_fraise) / 2;
  const largeur_dent = p.largeur_queue - 2 * compensation;
  const longueur_piece = p.nombre_dents * 2 * p.largeur_queue;
  const fraisure_active = p.trous_fixation && p.fraisure_vis;
  return {
    compensation, largeur_dent, longueur_piece,
    profondeur_encoche: 10 + p.jeu_emboitement,
    hauteur_dos_utile: p.largeur_dos - (p.encoche_calage ? 10 + p.jeu_emboitement : 0),
    largeur_cale: Math.max(20, p.largeur_queue),
    largeur_url: p.encoche_calage ? Math.max(p.largeur_queue, longueur_piece - p.profondeur_puzzle - p.jeu_emboitement - 3*p.largeur_queue) : longueur_piece,
    pas: 2 * p.largeur_queue,
    racine: p.longueur_queues + compensation,
    ouverture: p.largeur_queue + 2 * compensation,
    encombrement: longueur_piece + p.profondeur_puzzle,
    decalage: p.largeur_queue,
    fraisure_active,
    profondeur_fraisure: fraisure_active && p.angle_fraisure > 0 && p.angle_fraisure < 180
      ? (p.diametre_tete_vis - p.diametre_vis) / (2 * Math.tan(p.angle_fraisure * Math.PI / 360)) : 0,
    largeur_zone: Math.min(longueur_piece - 2 * p.profondeur_puzzle - 4,
      p.trous_fixation ? longueur_piece / 2 - (fraisure_active ? p.diametre_tete_vis : p.diametre_vis) - 4 : longueur_piece - 4),
  };
}
export function enabled(key, p) {
  if (key === 'vis_actives') return p.trous_fixation || p.ajouter_cale;
  return !key || (key === 'fraisure_active' ? p.trous_fixation && p.fraisure_vis : p[key]);
}
// Traduction des assert() du modèle, y compris celle du module gravures().
export function validate(p) {
  const errors = [];
  const add = (ok, message, keys) => { if (!ok) errors.push({ message, keys }); };
  for (const [key, label, unit, , , condition] of fields) {
    if (!enabled(condition, p)) continue;
    add(unit === 'boolean' ? typeof p[key] === 'boolean' : Number.isFinite(p[key]),
      `Renseignez une valeur valide pour « ${label} ».`, [key]);
  }
  if (errors.length) return { errors, warnings: [], values: null };
  const d = derived(p);
  add(p.epaisseur > 0 && p.longueur_queues > 0 && p.largeur_queue > 0,
    'La largeur des queues, la longueur des doigts et l’épaisseur doivent être positives.', ['epaisseur', 'longueur_queues', 'largeur_queue']);
  add(p.diametre_fraise > 0 && p.diametre_bague >= p.diametre_fraise,
    'La fraise doit avoir un diamètre positif et la bague être au moins aussi large que la fraise.', ['diametre_fraise', 'diametre_bague']);
  add(p.largeur_queue >= p.diametre_fraise,
    'La largeur des queues doit être au moins égale au diamètre de la fraise.', ['largeur_queue', 'diametre_fraise']);
  add(d.largeur_dent > 0, 'Dents impossibles : augmentez la largeur des queues ou réduisez le diamètre de la bague.', ['largeur_queue', 'diametre_bague']);
  add(Number.isInteger(p.nombre_dents) && p.nombre_dents >= 1, 'Le nombre de dents doit être un entier positif.', ['nombre_dents']);
  add(p.largeur_dos > 0 && p.profondeur_puzzle > 0 && p.profondeur_puzzle + 2 * p.jeu_emboitement < d.longueur_piece / 2,
    'Le dos et les raccords doivent être positifs ; la profondeur du raccord plus deux fois le jeu doit rester inférieure à la demi-longueur du module.', ['largeur_dos', 'profondeur_puzzle', 'jeu_emboitement', 'nombre_dents']);
  add(p.jeu_emboitement >= 0 && p.jeu_emboitement < Math.min(p.largeur_dos / 20, p.profondeur_puzzle / 4),
    'Le jeu doit être positif ou nul, inférieur à 1/20 de la largeur du dos et à 1/4 de la profondeur du raccord.', ['jeu_emboitement']);
  add(!p.encoche_calage || (d.hauteur_dos_utile > 2 &&
    3*p.largeur_queue + 2 < d.longueur_piece - p.profondeur_puzzle - p.jeu_emboitement),
    'Pas assez de place pour l’encoche : agrandissez le dos / le module, réduisez le raccord ou désactivez l’encoche.', ['encoche_calage', 'largeur_dos', 'nombre_dents', 'profondeur_puzzle']);
  const distanceEncoche = x => Math.hypot(Math.max(p.largeur_queue-x, 0, x-3*p.largeur_queue), Math.max(p.largeur_dos/2-d.profondeur_encoche, 0));
  add(!p.encoche_calage || !p.trous_fixation ||
    Math.min(...[d.longueur_piece/4,3*d.longueur_piece/4].map(distanceEncoche)) > (d.fraisure_active ? p.diametre_tete_vis : p.diametre_vis)/2+1,
    'L’encoche est trop proche des trous ou des fraisures : agrandissez le dos ou réduisez les diamètres.', ['largeur_dos', 'diametre_vis', 'diametre_tete_vis', 'encoche_calage']);
  add(!p.ajouter_cale || (p.diametre_vis > 0 && p.diametre_vis+2 < 20),
    'Le trou de la cale doit être positif et laisser de la matière dans le carré de 20 mm (diamètre inférieur à 18 mm).', ['diametre_vis', 'ajouter_cale']);
  add(!p.inscriptions || d.largeur_url > 4,
    'Pas assez de place sur la tranche arrière pour conserver l’URL : agrandissez le module ou désactivez les inscriptions.', ['inscriptions', 'nombre_dents']);
  const place = Math.min(p.largeur_dos, d.longueur_piece / 2 - p.profondeur_puzzle - p.jeu_emboitement);
  add(!p.trous_fixation || (p.diametre_vis > 0 && p.diametre_vis + 2 < place),
    'Pas assez de matière pour les trous : réduisez le diamètre des vis ou agrandissez le dos / le module.', ['diametre_vis', 'largeur_dos', 'nombre_dents']);
  add(!d.fraisure_active || (p.angle_fraisure > 0 && p.angle_fraisure < 180 && p.diametre_tete_vis > p.diametre_vis),
    'La tête doit être plus large que le trou et l’angle de fraisure strictement compris entre 0° et 180°.', ['diametre_tete_vis', 'angle_fraisure']);
  add(!d.fraisure_active || (d.profondeur_fraisure > 0 && d.profondeur_fraisure < p.epaisseur),
    'La fraisure traverse l’épaisseur : augmentez l’épaisseur, réduisez la tête ou augmentez l’angle.', ['epaisseur', 'diametre_tete_vis', 'angle_fraisure']);
  add(!d.fraisure_active || p.diametre_tete_vis + 2 < place,
    'Pas assez de matière autour des fraisures.', ['diametre_tete_vis', 'largeur_dos', 'nombre_dents']);
  add(!p.inscriptions || (p.taille_texte > 0 && p.profondeur_gravure > 0 && p.profondeur_gravure < Math.min(p.epaisseur / 4, p.largeur_dos / 10)),
    'La taille du texte et la gravure doivent être positives ; la profondeur doit rester inférieure au quart de l’épaisseur et au dixième du dos.', ['taille_texte', 'profondeur_gravure', 'epaisseur']);
  add(!p.inscriptions || d.largeur_zone > 0,
    'Pas assez de place pour les inscriptions : agrandissez le module ou désactivez les inscriptions.', ['inscriptions', 'nombre_dents', 'profondeur_puzzle']);
  return { errors, values: d, warnings: d.largeur_dent > 0 && d.largeur_dent < 4
    ? ['Attention : les doigts font moins de 4 mm. Vérifiez leur rigidité avant utilisation.'] : [] };
}
export function scadArguments(p) {
  const result = validate(p);
  if (result.errors.length) throw new Error(result.errors.map(e => e.message).join('\n'));
  return fields.flatMap(([key, , , , , condition]) => enabled(condition, p) || Number.isFinite(p[key]) || typeof p[key] === 'boolean'
    ? ['-D', `${key}=${p[key]}`] : []).concat(['-D', 'mode="piece"']);
}
export const format = value => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);

// Même sélection de placements sûrs que placement_cale() dans peigne.scad.
// x/y sont le coin inférieur gauche de la boîte après rotation.
export function spacerPlacement(p, modules = 1) {
  const d = derived(p), w = d.largeur_cale;
  if (p.nombre_dents >= 2 && d.ouverture >= w+4 && p.longueur_queues >= 34)
    return {x:1.5*p.largeur_queue-w/2,y:2,angle:0,width:w,height:30,inside:true};
  if (p.nombre_dents >= 2 && d.ouverture >= 34 && p.longueur_queues >= w+4)
    return {x:1.5*p.largeur_queue-15,y:2,angle:90,width:30,height:w,inside:true};
  const left=-p.profondeur_puzzle, right=modules*d.longueur_piece, bottom=-d.largeur_dent/2, top=d.racine+p.largeur_dos;
  const candidates=[0,90].flatMap(angle => {
    const width=angle===0?w:30, height=angle===0?30:w;
    return [[left,top+2],[left,bottom-2-height],[right+2,bottom],[left-2-width,bottom]]
      .map(([x,y])=>({x,y,angle,width,height,inside:false}));
  });
  const area=c=>(Math.max(right,c.x+c.width)-Math.min(left,c.x))*(Math.max(top,c.y+c.height)-Math.min(bottom,c.y));
  return candidates.reduce((best,c)=>area(c)<area(best)?c:best);
}

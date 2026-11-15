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
  { title: 'Fixations', fields: [
    ['trous_fixation', 'Ajouter les deux trous de fixation', 'boolean'],
    ['diametre_vis', 'Diamètre des vis', 'mm', 0.1, '', 'trous_fixation'],
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

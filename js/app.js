// SPDX-License-Identifier: GPL-2.0-or-later
import { groups, fields, defaultsFromSCAD, enabled, validate, format, spacerPlacement } from './parameters.js';
import { drawPreview } from './preview.js';

const $ = id => document.getElementById(id);
let source, defaults, current, validation, worker = null, downloadURL = null;
let renderFrame = 0;

function buildForm() {
  for (const [index, group] of groups.entries()) {
    const wrapper = document.createElement('div');
    wrapper.className = 'parameter-group';
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = group.title;
    if (index) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = group.title;
      legend.className = 'visually-hidden';
      details.append(summary, fieldset);
      wrapper.append(details);
    } else wrapper.append(fieldset);
    fieldset.append(legend);
    for (const [key, label, unit, step, hint, condition] of group.fields) {
      const container = document.createElement('div');
      container.className = unit === 'boolean' ? 'field checkbox-field' : 'field';
      container.dataset.condition = condition || '';
      const caption = document.createElement('label');
      caption.htmlFor = key;
      caption.textContent = label;
      const input = document.createElement('input');
      input.id = input.name = key;
      input.type = unit === 'boolean' ? 'checkbox' : 'number';
      if (unit === 'boolean') {
        input.defaultChecked = defaults[key];
        caption.prepend(input);
        container.append(caption);
      } else {
        input.defaultValue = defaults[key];
        input.step = step;
        input.inputMode = key === 'nombre_dents' ? 'numeric' : 'decimal';
        input.required = true;
        const row = document.createElement('div');
        row.className = 'input-unit';
        const suffix = document.createElement('span');
        suffix.id = `${key}-unit`;
        suffix.textContent = unit;
        row.append(input, suffix);
        container.append(caption, row);
        input.setAttribute('aria-describedby', `${key}-unit${hint ? ` ${key}-hint` : ''}`);
      }
      if (hint) {
        const help = document.createElement('small');
        help.id = `${key}-hint`;
        help.textContent = hint;
        if (unit === 'boolean') input.setAttribute('aria-describedby', help.id);
        container.append(help);
      }
      fieldset.append(container);
    }
    $('fields').append(wrapper);
  }
}

function readForm() {
  return Object.fromEntries(fields.map(([key, , unit]) => [key,unit === 'boolean' ? $(key).checked : $(key).valueAsNumber]));
}

function showNotice(messages, error = false) {
  if (!messages.length) return;
  const box = document.createElement('div');
  box.className = `notice${error ? ' error' : ''}`;
  const heading = document.createElement('strong');
  heading.textContent = error ? 'Paramètres à corriger' : 'À vérifier';
  const list = document.createElement('ul');
  for (const message of messages) {
    const li = document.createElement('li');
    if (error) {
      const link = document.createElement('a');
      link.href = `#${message.keys[0]}`;
      link.textContent = message.message;
      link.addEventListener('click', event => {
        event.preventDefault();
        const input = $(message.keys[0]);
        const details = input.closest('details');
        if (details) details.open = true;
        input.focus();
      });
      li.append(link);
    } else li.textContent = message;
    list.append(li);
  }
  box.append(heading,list);
  $('validation').append(box);
}

function update() {
  renderFrame = 0;
  current = readForm();
  for (const container of document.querySelectorAll('[data-condition]')) {
    const active = enabled(container.dataset.condition,current);
    container.hidden = !active;
    for (const input of container.querySelectorAll('input')) input.disabled = !active;
  }
  validation = validate(current);
  $('validation').replaceChildren();
  for (const [key] of fields) {
    const invalid = validation.errors.some(e => e.keys.includes(key));
    $(key).setAttribute('aria-invalid', String(invalid));
  }
  showNotice(validation.errors,true);
  showNotice(validation.warnings);
  $('download').disabled = Boolean(worker) || validation.errors.length > 0;
  if (validation.errors.length) {
    $('preview').setAttribute('hidden','');
    $('preview').replaceChildren();
    $('measurements').replaceChildren();
    $('preview-caption').textContent = 'Corrigez les paramètres pour afficher le profil correspondant.';
    return;
  }
  const assembled = document.querySelector('input[name=view]:checked').value === 'assembly';
  // Limite d'affichage, pas une nouvelle contrainte du modèle. Évite de bloquer
  // le fil d'interface sur des dizaines de milliers de booléens SVG.
  const previewLimited = current.nombre_dents > 200;
  $('preview').toggleAttribute('hidden',previewLimited);
  if (previewLimited) $('preview').replaceChildren();
  else drawPreview($('preview'),current,{assembled,guide:$('show-guide').checked});
  const d = validation.values;
  $('measurements').replaceChildren();
  for (const [label,value] of [
    ['Largeur réelle des dents',d.largeur_dent],['Ouverture de guidage',d.ouverture],
    ['Longueur du module, raccord inclus',d.encombrement],['Décalage de la contre-pièce',d.decalage],
    ...(current.encoche_calage ? [['Largeur de l’encoche',2*current.largeur_queue],['Profondeur de l’encoche',d.profondeur_encoche]] : []),
  ]) {
    const group = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = `${format(value)} mm`;
    group.append(dt,dd); $('measurements').append(group);
  }
  const guideVisible=$('show-guide').checked && (!current.ajouter_cale || !spacerPlacement(current).inside || current.nombre_dents>2);
  $('preview-caption').textContent = `Profil à l’échelle relative, cotes en mm. ${assembled ? 'Le deuxième module est décalé du pas de raccordement. ' : ''}${current.inscriptions ? 'Dimensions gravées sur le dessus et URL sur la tranche arrière (non dessinées). ' : 'Sans inscriptions. '}${d.fraisure_active ? 'Cercles pointillés : fraisures.' : ''}${guideVisible ? ' En bleu : bague (contour extérieur) et fraise (centre).' : ''}`;
  if (current.ajouter_cale) {
    const placement=spacerPlacement(current,assembled?2:1);
    $('preview-caption').textContent += ` Cale en vert : carré 20 × 20 mm, languette ${format(current.largeur_queue)} × 10 mm, trou Ø ${format(current.diametre_vis)} mm. ${placement.inside ? 'Placée entre les doigts pour ne pas agrandir le plateau.' : 'Placée à côté du peigne avec un espace de 2 mm.'}`;
    if (placement.inside && current.nombre_dents<=2 && $('show-guide').checked)
      $('preview-caption').textContent += ' La bague est masquée car la cale occupe l’ouverture.';
  }
  $('calage-help').textContent = current.encoche_calage
    ? 'Fixez la cale par sa vis. Placez un flanc de la languette contre un côté de l’encoche, puis faites coulisser le peigne jusqu’à l’autre butée : le déplacement nominal vaut une largeur de queue. Immobilisez le peigne avant chaque usinage.'
    : 'Pour la contre-pièce, repérez un décalage d’une largeur de queue, par exemple avec une cale ou une butée.';
  $('stl-content').textContent = `Le STL contient un seul peigne${current.ajouter_cale ? ' et une cale séparée' : ''}, même si l’aperçu montre deux modules. Le calcul s’effectue dans votre navigateur.`;
  if (previewLimited) $('preview-caption').textContent = 'L’aperçu est masqué au-delà de 200 dents pour préserver la réactivité. Le calcul STL reste disponible, dans les limites de mémoire de votre navigateur.';
}

function status(message, {busy=false,error=false} = {}) {
  $('generation-status').textContent = message;
  $('generation-status').dataset.busy = String(busy);
  $('generation-status').dataset.error = String(error);
}
function cleanupWorker() {
  worker?.terminate();
  worker = null;
  $('cancel').hidden = true;
  $('download').disabled = validation.errors.length > 0;
  $('download').textContent = 'Télécharger le STL';
  $('download').removeAttribute('aria-busy');
}
function releaseDownload() {
  if (downloadURL) URL.revokeObjectURL(downloadURL);
  downloadURL = null;
  $('download-again').hidden = true;
  $('download-again').removeAttribute('href');
}
function generate() {
  if (worker) return;
  update();
  if (validation.errors.length) return;
  if (!globalThis.Worker || !globalThis.WebAssembly) {
    status('Ce navigateur ne prend pas en charge les Web Workers et WebAssembly nécessaires au calcul.',{error:true});
    return;
  }
  const snapshot = {...current};
  releaseDownload();
  $('compile-details').hidden = true;
  $('compile-log').textContent = '';
  status('Chargement du moteur OpenSCAD… Le premier chargement peut prendre un moment.',{busy:true});
  try {
    worker = new Worker(new URL('./openscad-worker.js',import.meta.url),{type:'module'});
    $('download').disabled = true;
    $('download').textContent = 'Génération en cours…';
    $('download').setAttribute('aria-busy','true');
    $('cancel').hidden = false;
    worker.onmessage = ({data}) => {
      if (data.type === 'status') status(data.message,{busy:true});
      else if (data.type === 'done') {
        downloadURL = URL.createObjectURL(new Blob([data.buffer],{type:'model/stl'}));
        const link = $('download-again');
        link.href = downloadURL;
        link.download = `peigne_${snapshot.largeur_queue}mm_${snapshot.nombre_dents}dents${snapshot.ajouter_cale ? '_avec_cale' : ''}.stl`;
        link.hidden = false;
        link.click();
        status(`STL généré : ${link.download}. Le téléchargement a été lancé. Ces paramètres sont ceux du début du calcul.`);
        $('compile-log').textContent = data.log;
        $('compile-details').hidden = !data.log;
        cleanupWorker();
      } else if (data.type === 'error') {
        status(data.message,{error:true});
        $('compile-log').textContent = data.log || '';
        $('compile-details').hidden = !data.log;
        cleanupWorker();
      }
    };
    worker.onerror = event => {
      event.preventDefault();
      status('Le moteur de calcul n’a pas pu démarrer ou s’est arrêté. Vérifiez la présence des ressources WASM locales et la mémoire disponible ; les détails de déploiement sont dans la documentation.',{error:true});
      cleanupWorker();
    };
    worker.postMessage({source,parameters:snapshot});
  } catch (error) {
    status(`Impossible de lancer le calcul : ${error.message}`,{error:true});
    cleanupWorker();
  }
}

async function start() {
  const response = await fetch(new URL('../peigne.scad',import.meta.url));
  if (!response.ok) throw new Error(`Modèle OpenSCAD indisponible (HTTP ${response.status}).`);
  source = await response.text();
  defaults = defaultsFromSCAD(source);
  buildForm();
  $('parameters').addEventListener('input',()=> {
    if (!renderFrame) renderFrame = requestAnimationFrame(update);
  });
  $('parameters').addEventListener('submit',event=>event.preventDefault());
  $('parameters').addEventListener('reset',()=>requestAnimationFrame(update));
  for (const input of document.querySelectorAll('.view-controls input')) input.addEventListener('change',update);
  $('zoom-preview').addEventListener('click',()=>{
    const drawing = document.querySelector('.drawing');
    const zoom = drawing.classList.toggle('zoomed');
    $('zoom-preview').setAttribute('aria-pressed',String(zoom));
    $('zoom-preview').textContent = zoom ? 'Adapter le dessin à la largeur' : 'Agrandir le dessin';
    if (zoom) {
      drawing.tabIndex=0;
      drawing.setAttribute('role','region');
      drawing.setAttribute('aria-label','Dessin agrandi, défilement horizontal avec les flèches du clavier ou au toucher');
    } else {
      drawing.removeAttribute('tabindex');
      drawing.removeAttribute('role');
      drawing.removeAttribute('aria-label');
    }
  });
  $('download').addEventListener('click',generate);
  $('cancel').addEventListener('click',()=>{cleanupWorker();status('Génération annulée. Vous pouvez modifier les paramètres et recommencer.');});
  window.addEventListener('pagehide',()=>{cleanupWorker();releaseDownload();});
  $('outil').hidden = false;
  $('boot-status').hidden = true;
  update();
}
start().catch(error=>{
  $('boot-status').textContent = `${error.message} Ouvrez cette page depuis un serveur HTTP statique, et vérifiez que peigne.scad est présent.`;
  $('boot-status').className = 'notice error';
});

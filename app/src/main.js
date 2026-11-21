// Leonida Key Art Studio — page wiring. Owns the state, the source registry (painted scenes, bundled
// samples, user uploads), every control on the page, the focal-point click handling, PNG exports,
// and the deterministic ?shot= routes used for screenshots.
import { SCENES, sceneCanvas } from './scenes.js';
import { computeLayout, drawCoverArt } from './cover.js';
import { parseShot } from './shots.js';

const ROLES = ['THE DRIVER', 'THE SIREN', 'THE LOOKOUT', 'THE FIXER', 'THE HEAVY', 'THE GHOST'];
const SCENE_ORDER = ['vice-sunset', 'neon-harbor', 'causeway-dusk', 'golden-mile', 'palm-strip', 'marina-heist'];

const state = {
  mode: 'keyart',
  panelCount: 4,
  popOut: true,
  panels: SCENE_ORDER.map((id, i) => ({
    sourceId: `scene:${id}`,
    focal: { x: 0.5, y: 0.44 },
    zoom: 1,
    tag: ROLES[i],
  })),
  title: 'LEONIDA',
  subtitle: 'welcome back to',
  treatment: 'sunset',
  edition: 'gold',
  billing: 'LEONIDA KEY ART STUDIO PRESENTS · STARRING YOU · A LEONIDA STORY · SHOT ON LOCATION IN VICE CITY',
};

let selected = 0;
let uploadCount = 0;

/* ------------------------------------------------------------- sources */

const sources = new Map();
const getSource = (id) => sources.get(id) ?? null;

function addSceneSources() {
  for (const s of SCENES) {
    const c = sceneCanvas(s.id);
    sources.set(`scene:${s.id}`, { label: `Scene · ${s.name}`, img: c, w: c.width, h: c.height });
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addSampleSources() {
  for (const name of ['pier', 'boulevard']) {
    try {
      const img = await loadImage(`./samples/${name}.jpg`);
      sources.set(`sample:${name}`, {
        label: `Sample photo · ${name}`,
        img, w: img.naturalWidth, h: img.naturalHeight,
      });
    } catch { /* samples are a bonus; the painted scenes always work */ }
  }
}

/* ------------------------------------------------------------- dom refs */

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');
const sourceSelect = $('panel-source');
const tagSelect = $('tag-select');
const tagText = $('tag-text');
const zoomInput = $('zoom');
const zoomValue = $('zoom-value');

function visibleCount() {
  if (state.mode === 'keyart') return 2; // hero + its backdrop panel
  return computeLayout(preview.width, preview.height, state).length;
}

function rebuildSourceOptions() {
  const current = state.panels[selected]?.sourceId;
  sourceSelect.innerHTML = '';
  for (const [id, src] of sources) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = src.label;
    sourceSelect.appendChild(opt);
  }
  if (current && sources.has(current)) sourceSelect.value = current;
}

function syncPanelControls() {
  const panel = state.panels[selected];
  if (!panel) return;
  rebuildSourceOptions();
  zoomInput.value = String(panel.zoom);
  zoomValue.textContent = `${panel.zoom.toFixed(2)}×`;
  tagText.value = panel.tag || '';
  tagSelect.value = ROLES.includes(panel.tag) ? panel.tag : (panel.tag ? '' : '');
  if (!panel.tag) tagSelect.value = '';
}

function redraw() {
  drawCoverArt(pctx, preview.width, preview.height, state, getSource, { focusIndex: selected });
}

/* ------------------------------------------------------------- uploads */

async function addUploads(files) {
  for (const file of files) {
    if (uploadCount >= 6) break;
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } catch { continue; }
    uploadCount += 1;
    const id = `upload:${uploadCount}`;
    sources.set(id, {
      label: `Your photo ${uploadCount}`,
      img, w: img.naturalWidth, h: img.naturalHeight,
    });
    const thumb = document.createElement('img');
    thumb.src = url;
    thumb.alt = `Uploaded photo ${uploadCount}`;
    $('photo-strip').appendChild(thumb);
    // the first upload takes the selected panel; later ones fill the following panels
    const target = Math.min(selected + uploadCount - 1, state.panels.length - 1);
    state.panels[target].sourceId = id;
    state.panels[target].focal = { x: 0.5, y: 0.45 };
    state.panels[target].zoom = 1;
  }
  syncPanelControls();
  redraw();
}

const fileInput = $('file-input');
const dropZone = $('drop-zone');
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
fileInput.addEventListener('change', () => { addUploads([...fileInput.files]); fileInput.value = ''; });
for (const ev of ['dragenter', 'dragover']) {
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
}
for (const ev of ['dragleave', 'drop']) {
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('drag'); });
}
dropZone.addEventListener('drop', (e) => addUploads([...e.dataTransfer.files]));

/* ------------------------------------------------------------- layout controls */

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    state.mode = btn.dataset.mode;
    $('panel-count-field').hidden = state.mode !== 'panels';
    if (selected >= visibleCount()) selected = 0;
    syncPanelControls();
    redraw();
  });
});
$('panel-count').addEventListener('change', (e) => {
  state.panelCount = Number(e.target.value);
  if (selected >= visibleCount()) selected = 0;
  syncPanelControls();
  redraw();
});
$('popout').addEventListener('change', (e) => { state.popOut = e.target.checked; redraw(); });

/* ------------------------------------------------------------- panel controls */

sourceSelect.addEventListener('change', () => {
  state.panels[selected].sourceId = sourceSelect.value;
  redraw();
});
$('swap-btn').addEventListener('click', () => {
  const n = visibleCount();
  const other = (selected + 1) % n;
  const tmp = state.panels[selected];
  state.panels[selected] = state.panels[other];
  state.panels[other] = tmp;
  syncPanelControls();
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomInput.value);
  zoomValue.textContent = `${state.panels[selected].zoom.toFixed(2)}×`;
  redraw();
});
tagSelect.addEventListener('change', () => {
  state.panels[selected].tag = tagSelect.value;
  tagText.value = tagSelect.value;
  redraw();
});
tagText.addEventListener('input', () => {
  state.panels[selected].tag = tagText.value.trim().toUpperCase();
  redraw();
});

/* ------------------------------------------------------------- title controls */

$('title-input').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle-input').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('billing-input').addEventListener('input', (e) => { state.billing = e.target.value; redraw(); });
$('treatment-select').addEventListener('change', (e) => { state.treatment = e.target.value; redraw(); });
$('edition-select').addEventListener('change', (e) => { state.edition = e.target.value; redraw(); });

/* ------------------------------------------------------------- focal click */

/** The same cover-fit math the renderer uses, so a click maps back to an image point exactly. */
function currentTransform(panel, rect, src) {
  const scale = Math.max(rect.w / src.w, rect.h / src.h) * (panel.zoom || 1);
  const dw = src.w * scale;
  const dh = src.h * scale;
  let dx = rect.x + rect.w / 2 - panel.focal.x * dw;
  let dy = rect.y + rect.h / 2 - panel.focal.y * dh;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  return { dx, dy, dw, dh };
}

preview.addEventListener('click', (e) => {
  const box = preview.getBoundingClientRect();
  const px = ((e.clientX - box.left) / box.width) * preview.width;
  const py = ((e.clientY - box.top) / box.height) * preview.height;
  const rects = computeLayout(preview.width, preview.height, state);
  let idx = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
  if (idx === -1 && state.mode === 'keyart') idx = 0; // backdrop clicks still steer the hero
  if (idx === -1) return;
  selected = idx;
  const panel = state.panels[selected];
  const src = getSource(panel.sourceId);
  if (src) {
    const t = currentTransform(panel, rects[idx], src);
    panel.focal = {
      x: Math.min(1, Math.max(0, (px - t.dx) / t.dw)),
      y: Math.min(1, Math.max(0, (py - t.dy) / t.dh)),
    };
  }
  syncPanelControls();
  redraw();
});

/* ------------------------------------------------------------- exports */

document.querySelectorAll('.export-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [w, h] = btn.dataset.size.split('x').map(Number);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    drawCoverArt(c.getContext('2d'), w, h, state, getSource, { focusIndex: -1 });
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `leonida-keyart-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  });
});

/* ------------------------------------------------------------- init + shots */

function applyCaptionAndPhoto(desc) {
  if (desc.photo && sources.has(`sample:${desc.photo}`)) {
    state.panels[0].sourceId = `sample:${desc.photo}`;
  }
  if (desc.caption) state.title = desc.caption.toUpperCase();
}

async function init() {
  addSceneSources();
  await addSampleSources();
  // Fonts used only on the canvas (Pacifico) are not loaded by DOM layout, so pull both display
  // faces in explicitly — fonts.ready alone can resolve before a canvas-only face has loaded.
  try {
    await Promise.all([
      document.fonts.load('64px "Anton"'),
      document.fonts.load('64px "Pacifico"'),
    ]);
  } catch { /* fallback faces still render */ }
  await document.fonts.ready;

  const desc = parseShot(new URLSearchParams(location.search));
  $('popout').checked = state.popOut;

  if (desc && desc.kind === 'render') {
    applyCaptionAndPhoto(desc);
    state.mode = desc.mode;
    if (desc.panelCount) state.panelCount = desc.panelCount;
    if (typeof desc.popOut === 'boolean') state.popOut = desc.popOut;
    document.body.classList.add('shot-mode');
    const shotCanvas = $('shot-canvas');
    shotCanvas.hidden = false;
    shotCanvas.width = desc.w;
    shotCanvas.height = desc.h;
    drawCoverArt(shotCanvas.getContext('2d'), desc.w, desc.h, state, getSource, { focusIndex: -1 });
  } else {
    if (desc && desc.kind === 'editor') applyCaptionAndPhoto(desc);
    syncPanelControls();
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

init();

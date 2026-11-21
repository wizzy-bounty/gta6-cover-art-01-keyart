// The cover composer for Leonida Key Art Studio. Pure Canvas 2D: given a state (layout mode, panels
// with focal crops and cast tags, title treatment, edition frame, billing line) it paints the whole
// cover at whatever size the target canvas is — preview and full-size exports share this one path.

/** The title treatments the composer can paint; anything else falls back to sunset. */
export const TITLE_TREATMENTS = ['chrome', 'sunset', 'gold', 'neon'];

const TAG_COLORS = [
  ['DRIVER', '#ffb35c'],
  ['FIXER', '#57e6ff'],
  ['SIREN', '#ff5da2'],
  ['LOOKOUT', '#9dff6e'],
  ['HEAVY', '#ff7847'],
  ['GHOST', '#cfd6ff'],
];

function tagColor(tag) {
  const up = (tag || '').toUpperCase();
  for (const [key, col] of TAG_COLORS) if (up.includes(key)) return col;
  return '#ffb35c';
}

/** The hero panel rectangle for Key Art mode (the frame the subject sits in, before pop-out). */
export function heroFrame(W, H) {
  return { x: W * 0.055, y: H * 0.05, w: W * 0.89, h: H * 0.9 };
}

/** Panel rectangles for a layout — the single source of truth for rendering and click hit-testing. */
export function computeLayout(W, H, state) {
  if (state.mode === 'keyart') {
    const f = heroFrame(W, H);
    if (!state.popOut) return [f];
    const w = f.w * 1.12;
    const h = f.h * 1.12;
    return [{ x: f.x - (w - f.w) / 2, y: f.y - f.h * 0.075, w, h }];
  }
  if (state.mode === 'duo') {
    const g = Math.max(4, Math.min(W, H) * 0.006);
    if (W >= H) {
      const w = (W - g) / 2;
      return [
        { x: 0, y: 0, w, h: H },
        { x: w + g, y: 0, w, h: H },
      ];
    }
    const h = (H - g) / 2;
    return [
      { x: 0, y: 0, w: W, h },
      { x: 0, y: h + g, w: W, h },
    ];
  }
  // panels
  const count = state.panelCount === 6 ? 6 : 4;
  const landscape = W > H;
  const cols = count === 6 ? (landscape ? 3 : 2) : 2;
  const rows = Math.ceil(count / cols);
  const g = Math.max(6, Math.min(W, H) * 0.009);
  const cw = (W - g * (cols + 1)) / cols;
  const ch = (H - g * (rows + 1)) / rows;
  const rects = [];
  for (let i = 0; i < count; i++) {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    rects.push({ x: g + cx * (cw + g), y: g + cy * (ch + g), w: cw, h: ch });
  }
  return rects;
}

/** Cover-fit draw with a focal bias; returns where the image landed so callers can place markers. */
function drawFocal(ctx, img, iw, ih, rect, focal, zoom) {
  const scale = Math.max(rect.w / iw, rect.h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + rect.w / 2 - focal.x * dw;
  let dy = rect.y + rect.h / 2 - focal.y * dh;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  // gentle bottom vignette inside the panel so tags and titles stay readable
  const v = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = v;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
  return { dx, dy, dw, dh };
}

function drawTag(ctx, rect, tag, u) {
  if (!tag) return;
  const text = tag.toUpperCase();
  const size = Math.max(12, Math.min(rect.w * 0.052, u * 0.034));
  ctx.save();
  ctx.font = `${size}px "Anton", sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = size * 0.55;
  const lh = size * 1.5;
  const lx = rect.x + rect.w * 0.045;
  const ly = rect.y + rect.h * 0.05;
  ctx.translate(lx, ly);
  ctx.rotate(-0.07);
  ctx.fillStyle = 'rgba(7,5,14,0.85)';
  ctx.fillRect(0, 0, tw + padX * 2 + size * 0.3, lh);
  ctx.fillStyle = tagColor(text);
  ctx.fillRect(0, 0, size * 0.3, lh);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX + size * 0.3, lh / 2 + size * 0.04);
  ctx.restore();
}

function drawCrosshair(ctx, x, y, u) {
  const r = Math.max(10, Math.min(22, u * 0.016));
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 1.9, y); ctx.lineTo(x + r * 1.9, y);
  ctx.moveTo(x, y - r * 1.9); ctx.lineTo(x, y + r * 1.9);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 1.9, y); ctx.lineTo(x + r * 1.9, y);
  ctx.moveTo(x, y - r * 1.9); ctx.lineTo(x, y + r * 1.9);
  ctx.stroke();
  ctx.fillStyle = '#ff5da2';
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

const EDITIONS = {
  standard: { name: 'STANDARD', frame: ['#191423', '#191423'], sealFill: '#241b3d', sealRing: '#8d7fb8', star: '#e8e2f7' },
  chrome: { name: 'CHROME', frame: ['#f4f8ff', '#8fa5c0', '#e6eefb', '#6d84a3'], sealFill: '#dfe9f5', sealRing: '#7d94b5', star: '#33507a' },
  gold: { name: 'GOLD FOIL', frame: ['#fff3ae', '#d9a83f', '#f9e08a', '#a87c1e'], sealFill: '#f3d27a', sealRing: '#a87c1e', star: '#5c3d05' },
  platinum: { name: 'PLATINUM', frame: ['#ffffff', '#c3d4e8', '#f4faff', '#9db4cc'], sealFill: '#eef6ff', sealRing: '#9db4cc', star: '#476b8f' },
  legend: { name: 'LEGEND', frame: ['#0a0810', '#0a0810'], sealFill: '#14101f', sealRing: '#e8c268', star: '#e8c268' },
};

function frameGradient(ctx, W, H, stops) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  const n = stops.length;
  stops.forEach((col, i) => g.addColorStop(n === 1 ? 0 : i / (n - 1), col));
  return g;
}

function drawFrameAndSeal(ctx, W, H, editionKey, u) {
  const ed = EDITIONS[editionKey] || EDITIONS.standard;
  const t = Math.max(4, u * 0.009);
  ctx.save();
  if (editionKey === 'legend') {
    ctx.lineWidth = t * 2.4;
    ctx.strokeStyle = '#0a0810';
    ctx.strokeRect(t * 1.2, t * 1.2, W - t * 2.4, H - t * 2.4);
    ctx.lineWidth = Math.max(2, t * 0.45);
    ctx.strokeStyle = '#e8c268';
    ctx.strokeRect(t * 2.6, t * 2.6, W - t * 5.2, H - t * 5.2);
  } else if (editionKey === 'standard') {
    ctx.lineWidth = t;
    ctx.strokeStyle = ed.frame[0];
    ctx.strokeRect(t / 2, t / 2, W - t, H - t);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.strokeRect(t + 2, t + 2, W - t * 2 - 4, H - t * 2 - 4);
  } else {
    ctx.lineWidth = t * 1.7;
    ctx.strokeStyle = frameGradient(ctx, W, H, ed.frame);
    ctx.strokeRect(t * 0.85, t * 0.85, W - t * 1.7, H - t * 1.7);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(t * 1.9, t * 1.9, W - t * 3.8, H - t * 3.8);
  }
  // edition seal, top-right corner
  const r = u * 0.052;
  const sx = W - r - u * 0.028;
  const sy = r + u * 0.028;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = ed.sealFill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = ed.sealRing;
  ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // five-point star
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r * 0.52 : r * 0.22;
    const px = sx + Math.cos(ang) * rad;
    const py = sy + Math.sin(ang) * rad - r * 0.08;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = ed.star;
  ctx.fill();
  ctx.font = `${Math.max(8, r * 0.30)}px "Anton", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ed.name.split(' ')[0], sx, sy + r * 0.52);
  ctx.restore();
  return ed;
}

function titleStyle(ctx, treatment, size, W, H) {
  treatment = TITLE_TREATMENTS.includes(treatment) ? treatment : 'sunset';
  ctx.font = `${size}px "Anton", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${Math.max(1, size * 0.015)}px`; } catch { /* older engines */ }
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.035;
  ctx.lineWidth = size * 0.05;
  ctx.lineJoin = 'round';
  if (treatment === 'chrome') {
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#c7d5e8');
    g.addColorStop(0.52, '#7d94b5'); g.addColorStop(0.68, '#e8f1fb'); g.addColorStop(1, '#93a9c4');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(18,28,48,0.9)';
  } else if (treatment === 'gold') {
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
    g.addColorStop(0, '#fff7ae'); g.addColorStop(0.4, '#f3d27a');
    g.addColorStop(0.62, '#b8860b'); g.addColorStop(0.85, '#f9e08a'); g.addColorStop(1, '#caa437');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(52,34,0,0.9)';
  } else if (treatment === 'neon') {
    ctx.fillStyle = '#ff4fd8';
    ctx.strokeStyle = 'rgba(70,0,50,0.9)';
    ctx.shadowColor = '#ff2ea6';
    ctx.shadowBlur = size * 0.38;
  } else { // sunset
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
    g.addColorStop(0, '#ffe259'); g.addColorStop(0.45, '#ffa751');
    g.addColorStop(0.78, '#ff5da2'); g.addColorStop(1, '#c73e8e');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(64,10,44,0.88)';
  }
}

function drawTitleBlock(ctx, W, H, state, u) {
  const title = (state.title || '').trim().toUpperCase();
  const billingY = H - u * 0.034;
  // title, fitted to width
  let size = u * 0.165;
  ctx.save();
  if (title) {
    titleStyle(ctx, state.treatment, size, W, H);
    while (ctx.measureText(title).width > W * 0.9 && size > 14) {
      size -= 3;
      titleStyle(ctx, state.treatment, size, W, H);
    }
    const titleY = billingY - u * 0.055;
    if (state.treatment === 'neon') {
      ctx.strokeText(title, W / 2, titleY);
      ctx.fillText(title, W / 2, titleY);
      ctx.fillText(title, W / 2, titleY);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffe3f9';
      ctx.fillText(title, W / 2, titleY);
    } else {
      ctx.strokeText(title, W / 2, titleY);
      ctx.fillText(title, W / 2, titleY);
    }
    // subtitle, script, tucked over the title's top-left shoulder
    const sub = (state.subtitle || '').trim();
    if (sub) {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = size * 0.1;
      ctx.shadowOffsetY = 2;
      let subSize = size * 0.34;
      ctx.font = `${subSize}px "Pacifico", cursive`;
      try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
      while (ctx.measureText(sub).width > W * 0.62 && subSize > 10) {
        subSize -= 2;
        ctx.font = `${subSize}px "Pacifico", cursive`;
      }
      ctx.fillStyle = '#ffeef7';
      ctx.strokeStyle = 'rgba(60,8,36,0.65)';
      ctx.lineWidth = subSize * 0.09;
      const subY = titleY - size * 0.94;
      ctx.strokeText(sub, W / 2, subY);
      ctx.fillText(sub, W / 2, subY);
    }
  }
  ctx.restore();
  // billing block
  const billing = (state.billing || '').trim().toUpperCase();
  if (billing) {
    ctx.save();
    let bSize = Math.max(10, u * 0.0165);
    ctx.font = `${bSize}px "Anton", sans-serif`;
    try { ctx.letterSpacing = `${Math.max(1, bSize * 0.14)}px`; } catch { /* ignore */ }
    while (ctx.measureText(billing).width > W * 0.86 && bSize > 7) {
      bSize -= 1;
      ctx.font = `${bSize}px "Anton", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillText(billing, W / 2, billingY);
    ctx.restore();
  }
}

/**
 * Paints the full cover. `getSource(id)` resolves a panel source id to
 * { img, w, h } or null. `opts.focusIndex` >= 0 draws the editor's selection
 * outline and focal crosshair (exports pass -1 and get a clean cover).
 */
export function drawCoverArt(ctx, W, H, state, getSource, opts = {}) {
  const u = Math.min(W, H);
  const focusIndex = opts.focusIndex ?? -1;
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, W, H);

  const rects = computeLayout(W, H, state);

  if (state.mode === 'keyart') {
    // backdrop: the second panel's source (or the hero's own) full-bleed and darkened
    const backPanel = state.panels[1] || state.panels[0];
    const backSrc = backPanel && getSource(backPanel.sourceId);
    if (backSrc) {
      drawFocal(ctx, backSrc.img, backSrc.w, backSrc.h, { x: 0, y: 0, w: W, h: H }, backPanel.focal, 1);
    }
    ctx.fillStyle = 'rgba(9,5,17,0.52)';
    ctx.fillRect(0, 0, W, H);
    // frame shadow, then the hero itself
    const f = heroFrame(W, H);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = u * 0.035;
    ctx.fillStyle = '#000';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.restore();
  }

  const landed = [];
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (!panel) { landed.push(null); return; }
    const src = getSource(panel.sourceId);
    if (!src) { landed.push(null); return; }
    landed.push(drawFocal(ctx, src.img, src.w, src.h, rect, panel.focal, panel.zoom));
    if (state.mode === 'keyart') {
      ctx.save();
      ctx.lineWidth = Math.max(2, u * 0.0035);
      ctx.strokeStyle = state.popOut ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)';
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  });

  if (state.mode === 'duo') {
    ctx.save();
    ctx.fillStyle = '#e8c268';
    const g = Math.max(4, u * 0.006);
    if (W >= H) ctx.fillRect((W - g) / 2, 0, g, H); else ctx.fillRect(0, (H - g) / 2, W, g);
    ctx.restore();
  }

  // cast tags
  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    if (panel && landed[i]) drawTag(ctx, rect, panel.tag, u);
  });

  // readability scrim behind the title stack
  const scrim = ctx.createLinearGradient(0, H * 0.52, 0, H);
  scrim.addColorStop(0, 'rgba(4,2,9,0)');
  scrim.addColorStop(0.72, 'rgba(4,2,9,0.38)');
  scrim.addColorStop(1, 'rgba(4,2,9,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.52, W, H * 0.48);

  drawFrameAndSeal(ctx, W, H, state.edition, u);
  drawTitleBlock(ctx, W, H, state, u);

  // editor-only overlays
  if (focusIndex >= 0 && rects[focusIndex] && landed[focusIndex]) {
    const rect = rects[focusIndex];
    const panel = state.panels[focusIndex];
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff5da2';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    const fx = landed[focusIndex].dx + panel.focal.x * landed[focusIndex].dw;
    const fy = landed[focusIndex].dy + panel.focal.y * landed[focusIndex].dh;
    drawCrosshair(ctx, fx, fy, u);
  }
}

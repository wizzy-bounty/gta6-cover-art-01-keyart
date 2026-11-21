// Painted demo scenes for Leonida Key Art Studio. Every scene is drawn from scratch with Canvas 2D
// onto an offscreen 1024x1024 canvas — sunsets, palm silhouettes, skylines, marinas and neon — so the
// studio has rich cover material before the user uploads a single photo. Painting is deterministic:
// a seeded PRNG per scene means the same scene always looks the same.

const SIZE = 1024;

/** Small deterministic PRNG (mulberry32) so painted scenes never change between renders. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d() {
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  return [c, c.getContext('2d')];
}

function sky(ctx, stops, top = 0, bottom = SIZE) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, SIZE, bottom - top);
}

function sun(ctx, x, y, r, core, glow) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.4);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3.4, y - r * 3.4, r * 6.8, r * 6.8);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = core;
  ctx.fill();
}

function clouds(ctx, rand, yBase, count, tint, alpha) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const cx = rand() * SIZE;
    const cy = yBase + (rand() - 0.5) * 130;
    const w = 130 + rand() * 260;
    const h = 16 + rand() * 26;
    ctx.globalAlpha = alpha * (0.5 + rand() * 0.5);
    ctx.fillStyle = tint;
    for (let j = 0; j < 5; j++) {
      ctx.beginPath();
      ctx.ellipse(cx + (j - 2) * w * 0.18, cy + (rand() - 0.5) * 10, w * (0.32 - Math.abs(j - 2) * 0.05), h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function ocean(ctx, top, rand, sunX, water, sparkle) {
  const g = ctx.createLinearGradient(0, top, 0, SIZE);
  g.addColorStop(0, water[0]);
  g.addColorStop(1, water[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, SIZE, SIZE - top);
  // sun glitter path
  ctx.save();
  for (let i = 0; i < 130; i++) {
    const t = rand();
    const y = top + 8 + t * (SIZE - top - 20);
    const spread = 26 + t * 190;
    const x = sunX + (rand() - 0.5) * spread;
    const len = 8 + rand() * (20 + t * 46);
    ctx.globalAlpha = 0.12 + rand() * 0.4 * (1 - t * 0.4);
    ctx.strokeStyle = sparkle;
    ctx.lineWidth = 1.4 + rand() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.lineTo(x + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function palm(ctx, x, baseY, h, lean, dark) {
  ctx.save();
  ctx.strokeStyle = dark;
  ctx.fillStyle = dark;
  ctx.lineCap = 'round';
  // curved trunk made of tapering segments
  const segs = 9;
  let px = x, py = baseY;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    ctx.lineWidth = 15 * (1 - t * 0.55);
    ctx.beginPath();
    ctx.moveTo(px, py);
    px += lean * (h / segs) * 0.42;
    py -= h / segs;
    ctx.lineTo(px, py);
    ctx.stroke();
  }
  // fronds
  const topX = px, topY = py;
  ctx.lineWidth = 6;
  for (let i = 0; i < 8; i++) {
    const ang = (-168 + i * 24) * (Math.PI / 180);
    const len = h * (0.34 + (i % 3) * 0.05);
    const cx = topX + Math.cos(ang) * len * 0.55;
    const cy = topY + Math.sin(ang) * len * 0.4 - len * 0.14;
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.55 + len * 0.34;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  // coconuts
  ctx.beginPath(); ctx.arc(topX - 7, topY + 9, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(topX + 8, topY + 11, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function building(ctx, x, baseY, w, h, body, win, rand, litRatio = 0.5) {
  ctx.fillStyle = body;
  ctx.fillRect(x, baseY - h, w, h);
  const cols = Math.max(2, Math.floor(w / 17));
  const rows = Math.max(3, Math.floor(h / 24));
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      if (rand() > litRatio) continue;
      ctx.fillStyle = win;
      ctx.globalAlpha = 0.35 + rand() * 0.65;
      ctx.fillRect(x + 5 + cx * ((w - 8) / cols), baseY - h + 7 + ry * ((h - 12) / rows), 6.5, 9);
    }
  }
  ctx.globalAlpha = 1;
}

function skyline(ctx, rand, baseY, minH, maxH, body, win, litRatio) {
  let x = -20;
  while (x < SIZE + 10) {
    const w = 46 + rand() * 92;
    const h = minH + rand() * (maxH - minH);
    building(ctx, x, baseY, w, h, body, win, rand, litRatio);
    if (rand() > 0.72) { // antenna
      ctx.strokeStyle = body;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, baseY - h);
      ctx.lineTo(x + w / 2, baseY - h - 22 - rand() * 26);
      ctx.stroke();
    }
    x += w + 3 + rand() * 12;
  }
}

function neonSign(ctx, x, y, text, color, size) {
  ctx.save();
  ctx.font = `${size}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function boat(ctx, x, y, s, hull, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // mast + sail lines
  ctx.strokeStyle = 'rgba(10,10,18,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -118); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -114); ctx.lineTo(44, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(-34, -6); ctx.stroke();
  // hull
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(-58, 0); ctx.lineTo(58, 0); ctx.lineTo(40, 20); ctx.lineTo(-42, 20); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(-58, -3, 116, 5);
  ctx.restore();
}

function carSilhouette(ctx, x, y, s, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = dark;
  // low sports-car profile
  ctx.beginPath();
  ctx.moveTo(-150, 0);
  ctx.lineTo(-142, -16);
  ctx.quadraticCurveTo(-96, -24, -58, -27);
  ctx.quadraticCurveTo(-34, -52, 14, -54);
  ctx.quadraticCurveTo(66, -55, 92, -30);
  ctx.quadraticCurveTo(132, -22, 148, -12);
  ctx.lineTo(150, 0);
  ctx.closePath();
  ctx.fill();
  // canopy glass
  ctx.fillStyle = 'rgba(140,200,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(-40, -30);
  ctx.quadraticCurveTo(-22, -48, 12, -49);
  ctx.quadraticCurveTo(44, -49, 62, -31);
  ctx.closePath();
  ctx.fill();
  // wheels
  ctx.fillStyle = dark;
  for (const wx of [-92, 96]) {
    ctx.beginPath(); ctx.arc(wx, 2, 21, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(220,225,235,0.75)';
    ctx.beginPath(); ctx.arc(wx, 2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
  }
  // headlight + tail glow
  ctx.fillStyle = 'rgba(255,244,190,0.95)';
  ctx.fillRect(138, -14, 12, 5);
  ctx.fillStyle = 'rgba(255,60,80,0.9)';
  ctx.fillRect(-150, -13, 10, 5);
  ctx.restore();
}

/* ------------------------------------------------------------------ scenes */

function paintGoldenMile() {
  const [c, ctx] = canvas2d();
  const rand = rng(1101);
  sky(ctx, [[0, '#2e4a8f'], [0.42, '#c65f9e'], [0.68, '#ff9a5c'], [0.86, '#ffd98a'], [1, '#ffe9b0']]);
  sun(ctx, 660, 640, 74, '#fff3c4', 'rgba(255,190,90,0.55)');
  clouds(ctx, rand, 210, 7, '#ffb9c8', 0.5);
  clouds(ctx, rand, 420, 4, '#ff9d7e', 0.4);
  // distant hotel row
  skyline(ctx, rand, 668, 120, 300, 'rgba(58,32,74,0.85)', '#ffd98a', 0.4);
  ocean(ctx, 668, rand, 660, ['#e88a63', '#274b73'], '#ffe9b0');
  // beachfront hotels, art-deco blocks with lit trims
  const hotels = [[36, 560, 120, 240], [176, 520, 96, 290], [806, 540, 110, 260], [700, 580, 84, 210]];
  for (const [x, by, w, h] of hotels) {
    building(ctx, x, by + 130, w, h, '#3a2145', '#ffe6a3', rand, 0.55);
    ctx.fillStyle = '#ff5da2';
    ctx.fillRect(x - 3, by + 130 - h, w + 6, 6);
    ctx.fillStyle = '#57e6ff';
    ctx.fillRect(x - 3, by + 130 - h + 12, w + 6, 3);
  }
  // sand strip
  const sand = ctx.createLinearGradient(0, 856, 0, SIZE);
  sand.addColorStop(0, '#f7cf8e');
  sand.addColorStop(1, '#d99a5f');
  ctx.fillStyle = sand;
  ctx.fillRect(0, 856, SIZE, SIZE - 856);
  ctx.fillStyle = 'rgba(120,70,30,0.25)';
  for (let i = 0; i < 260; i++) ctx.fillRect(rand() * SIZE, 866 + rand() * 140, 3, 2);
  // boardwalk
  ctx.fillStyle = '#8a5a3b';
  ctx.fillRect(0, 838, SIZE, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let x = 0; x < SIZE; x += 46) ctx.fillRect(x, 838, 3, 20);
  palm(ctx, 96, 900, 330, 0.5, '#241126');
  palm(ctx, 916, 910, 360, -0.55, '#241126');
  palm(ctx, 830, 880, 240, -0.3, '#2e1733');
  return c;
}

function paintNeonHarbor() {
  const [c, ctx] = canvas2d();
  const rand = rng(2202);
  sky(ctx, [[0, '#050914'], [0.55, '#0d1b3d'], [0.85, '#173057'], [1, '#1d3a63']]);
  // stars
  ctx.fillStyle = '#cfe6ff';
  for (let i = 0; i < 170; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.75;
    ctx.fillRect(rand() * SIZE, rand() * 430, 2, 2);
  }
  ctx.globalAlpha = 1;
  // moon
  sun(ctx, 812, 168, 44, '#eaf4ff', 'rgba(160,200,255,0.35)');
  skyline(ctx, rand, 600, 170, 430, '#0a1226', '#9fd8ff', 0.62);
  // neon signs on the waterfront blocks
  neonSign(ctx, 190, 420, 'MARINA', '#ff5da2', 44);
  neonSign(ctx, 520, 356, 'VICE', '#57e6ff', 52);
  neonSign(ctx, 838, 452, 'HOTEL', '#ffb35c', 38);
  // water
  ocean(ctx, 600, rand, 812, ['#12294d', '#060d1f'], '#9fd8ff');
  // neon reflections
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (const [x, col] of [[190, '#ff5da2'], [520, '#57e6ff'], [838, '#ffb35c']]) {
    ctx.fillStyle = col;
    for (let i = 0; i < 22; i++) {
      const y = 620 + rand() * 330;
      ctx.fillRect(x - 34 + rand() * 56, y, 14 + rand() * 30, 3);
    }
  }
  ctx.restore();
  // dock
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 880, SIZE, 26);
  for (let x = 20; x < SIZE; x += 90) ctx.fillRect(x, 906, 14, 60);
  boat(ctx, 240, 852, 1.15, '#0d1526', '#ff5da2');
  boat(ctx, 560, 872, 0.9, '#0d1526', '#57e6ff');
  boat(ctx, 806, 846, 1.3, '#0d1526', '#ffb35c');
  return c;
}

function paintCausewayDusk() {
  const [c, ctx] = canvas2d();
  const rand = rng(3303);
  sky(ctx, [[0, '#1d2f66'], [0.4, '#7a3f8f'], [0.66, '#e85d75'], [0.85, '#ff9a5c'], [1, '#ffc46b']]);
  sun(ctx, 512, 596, 88, '#ffe9a8', 'rgba(255,160,80,0.6)');
  clouds(ctx, rand, 190, 6, '#c98bb8', 0.5);
  clouds(ctx, rand, 380, 5, '#ff8f6b', 0.45);
  // far shore skyline
  skyline(ctx, rand, 612, 90, 210, 'rgba(40,22,54,0.9)', '#ffca7a', 0.45);
  ocean(ctx, 612, rand, 512, ['#d96a55', '#1d3355'], '#ffd98a');
  // causeway deck, slight perspective
  ctx.fillStyle = '#171320';
  ctx.beginPath();
  ctx.moveTo(0, 800); ctx.lineTo(SIZE, 764); ctx.lineTo(SIZE, 906); ctx.lineTo(0, 952); ctx.closePath();
  ctx.fill();
  // guard rails
  ctx.strokeStyle = '#0c0a14';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0, 788); ctx.lineTo(SIZE, 752); ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 812); ctx.lineTo(SIZE, 776); ctx.stroke();
  // bridge posts + lamps
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = t * SIZE;
    const y = 800 - t * 36;
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(x - 4, y - 108, 8, 108);
    const lamp = ctx.createRadialGradient(x, y - 116, 2, x, y - 116, 34);
    lamp.addColorStop(0, 'rgba(255,230,160,0.95)');
    lamp.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(x - 34, y - 150, 68, 68);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(x, y - 116, 5, 0, Math.PI * 2); ctx.fill();
  }
  // lane dashes
  ctx.strokeStyle = 'rgba(255,220,150,0.8)';
  ctx.lineWidth = 5;
  ctx.setLineDash([36, 30]);
  ctx.beginPath(); ctx.moveTo(0, 884); ctx.lineTo(SIZE, 842); ctx.stroke();
  ctx.setLineDash([]);
  // the car, mid-causeway, headlights on
  carSilhouette(ctx, 470, 838, 1.55, '#0b0913');
  const beam = ctx.createLinearGradient(690, 830, 1024, 812);
  beam.addColorStop(0, 'rgba(255,244,190,0.4)');
  beam.addColorStop(1, 'rgba(255,244,190,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(688, 824); ctx.lineTo(1024, 790); ctx.lineTo(1024, 848); ctx.lineTo(688, 838); ctx.closePath();
  ctx.fill();
  palm(ctx, 60, 830, 260, 0.4, '#1c0f24');
  return c;
}

function paintPalmStrip() {
  const [c, ctx] = canvas2d();
  const rand = rng(4404);
  sky(ctx, [[0, '#274690'], [0.45, '#b04a8c'], [0.75, '#ff7e5f'], [1, '#feb47b']]);
  sun(ctx, 300, 560, 66, '#fff0b8', 'rgba(255,170,90,0.5)');
  clouds(ctx, rand, 170, 6, '#ffb9c8', 0.45);
  // deco strip: pastel blocks with neon trim
  const blocks = [
    [30, 700, 150, 330, '#f7e3c3'], [196, 700, 120, 420, '#ffd3e0'], [332, 700, 140, 280, '#c3ecf7'],
    [560, 700, 130, 380, '#ffe9b0'], [706, 700, 118, 300, '#e3d3ff'], [840, 700, 150, 350, '#ffd9c3'],
  ];
  for (const [x, by, w, h, col] of blocks) {
    ctx.fillStyle = col;
    ctx.fillRect(x, by - h, w, h);
    ctx.fillStyle = 'rgba(90,40,80,0.35)';
    for (let ry = 0; ry < Math.floor(h / 44); ry++)
      for (let cx = 0; cx < Math.floor(w / 34); cx++)
        if (rand() > 0.4) ctx.fillRect(x + 12 + cx * 34, by - h + 16 + ry * 44, 16, 22);
    ctx.fillStyle = '#ff5da2';
    ctx.fillRect(x - 3, by - h - 4, w + 6, 5);
  }
  neonSign(ctx, 256, 330, 'PALMS', '#57e6ff', 40);
  neonSign(ctx, 625, 380, 'DECO', '#ff5da2', 40);
  neonSign(ctx, 915, 360, 'BAR', '#ffb35c', 36);
  // street
  ctx.fillStyle = '#241a30';
  ctx.fillRect(0, 700, SIZE, SIZE - 700);
  ctx.fillStyle = '#3a2b4d';
  ctx.fillRect(0, 700, SIZE, 12);
  ctx.strokeStyle = 'rgba(255,220,150,0.75)';
  ctx.lineWidth = 5;
  ctx.setLineDash([40, 34]);
  ctx.beginPath(); ctx.moveTo(0, 876); ctx.lineTo(SIZE, 876); ctx.stroke();
  ctx.setLineDash([]);
  // parked convertible silhouette + street palms
  carSilhouette(ctx, 660, 800, 1.25, '#150d20');
  palm(ctx, 120, 760, 300, 0.35, '#1d1026');
  palm(ctx, 950, 770, 320, -0.4, '#1d1026');
  palm(ctx, 480, 730, 210, 0.2, '#271635');
  return c;
}

function paintMarinaHeist() {
  const [c, ctx] = canvas2d();
  const rand = rng(5505);
  sky(ctx, [[0, '#f7b267'], [0.4, '#f4845f'], [0.68, '#c6507e'], [1, '#5b3a8e']], 0, 640);
  sky(ctx, [[0, '#5b3a8e'], [1, '#2c2150']], 640, SIZE);
  sun(ctx, 512, 628, 96, '#fff3c4', 'rgba(255,180,90,0.55)');
  clouds(ctx, rand, 200, 7, '#ffd9a0', 0.5);
  // skyline across the bay
  skyline(ctx, rand, 640, 150, 380, '#33204d', '#ffd98a', 0.5);
  ocean(ctx, 640, rand, 512, ['#e2705f', '#232c5c'], '#ffe9b0');
  // foreground marina: bigger boats, heist energy
  ctx.fillStyle = '#120c22';
  ctx.fillRect(0, 908, SIZE, 20);
  boat(ctx, 210, 880, 1.7, '#160f2a', '#ff5da2');
  boat(ctx, 540, 896, 1.35, '#160f2a', '#57e6ff');
  boat(ctx, 838, 872, 1.9, '#160f2a', '#ffb35c');
  // searchlight sweep from the skyline
  const beam = ctx.createLinearGradient(120, 470, 700, 900);
  beam.addColorStop(0, 'rgba(220,240,255,0.20)');
  beam.addColorStop(1, 'rgba(220,240,255,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(120, 470); ctx.lineTo(760, 880); ctx.lineTo(620, 940); ctx.lineTo(120, 500); ctx.closePath();
  ctx.fill();
  palm(ctx, 962, 940, 300, -0.5, '#150b21');
  return c;
}

function paintViceSunset() {
  const [c, ctx] = canvas2d();
  const rand = rng(6606);
  sky(ctx, [[0, '#3b2d7a'], [0.34, '#a03d8c'], [0.58, '#f25c78'], [0.8, '#ff9a5c'], [1, '#ffd166']]);
  sun(ctx, 512, 622, 118, '#fff6cf', 'rgba(255,170,90,0.65)');
  // retro sun banding
  ctx.fillStyle = 'rgba(59,45,122,0.55)';
  for (let i = 0; i < 4; i++) ctx.fillRect(512 - 118, 622 + 26 + i * 24, 236, 7 + i * 2);
  clouds(ctx, rand, 170, 6, '#e88bb8', 0.5);
  clouds(ctx, rand, 330, 4, '#ff9d7e', 0.5);
  ocean(ctx, 640, rand, 512, ['#ef7d5f', '#2a2a5e'], '#ffe9b0');
  // horizon palms, the classic composition
  palm(ctx, 150, 700, 430, 0.42, '#170b26');
  palm(ctx, 884, 706, 452, -0.44, '#170b26');
  palm(ctx, 726, 668, 268, -0.24, '#20102f');
  // wet sand foreground
  const sand = ctx.createLinearGradient(0, 856, 0, SIZE);
  sand.addColorStop(0, '#8e4a6b');
  sand.addColorStop(1, '#3a2150');
  ctx.fillStyle = sand;
  ctx.fillRect(0, 856, SIZE, SIZE - 856);
  ctx.fillStyle = 'rgba(255,210,140,0.35)';
  for (let i = 0; i < 60; i++) ctx.fillRect(380 + rand() * 260, 866 + rand() * 120, 10 + rand() * 30, 2.5);
  return c;
}

export const SCENES = [
  { id: 'vice-sunset', name: 'Vice Sunset', paint: paintViceSunset },
  { id: 'golden-mile', name: 'Golden Mile', paint: paintGoldenMile },
  { id: 'neon-harbor', name: 'Neon Harbor', paint: paintNeonHarbor },
  { id: 'causeway-dusk', name: 'Causeway Dusk', paint: paintCausewayDusk },
  { id: 'palm-strip', name: 'Palm Strip', paint: paintPalmStrip },
  { id: 'marina-heist', name: 'Marina Heist', paint: paintMarinaHeist },
];

const cache = new Map();

/** Returns the painted canvas for a scene id, painting it once and caching it. */
export function sceneCanvas(id) {
  if (!cache.has(id)) {
    const scene = SCENES.find((s) => s.id === id) ?? SCENES[0];
    cache.set(id, scene.paint());
  }
  return cache.get(id);
}

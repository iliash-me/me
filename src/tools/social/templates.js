// Templates are just starting points: each one produces a list of free-form layers.
import {
  FORMAT_PRESETS, PALETTES, DEFAULT_BG, STORAGE_KEY,
  makeText, makeShape, measureTextLayer, applyPalette, paletteBackground,
} from './engine';

export function buildTemplate(id, W, H) {
  const s = Math.min(W / 1200, H / 630);
  const fs = (v) => Math.max(9, Math.round(v * s));
  const px = Math.round(Math.max(W * 0.07, 40));
  const py = Math.round(Math.max(H * 0.11, 36));
  const innerW = W - px * 2;
  const L = [];
  const add = (l) => { L.push(l); return l; };
  const h = (l) => measureTextLayer(l).height;
  const w = (l) => measureTextLayer(l).width;
  const mono = { fontFamily: 'JetBrains Mono' };

  const kicker = (o = {}) => makeText({
    name: 'Kicker', text: 'ENGINEERING NOTES', ...mono, fontWeight: 700, fontSize: fs(18),
    letterSpacing: 2, lineHeight: 1.2, autoWidth: true, bgEnabled: true, bgRole: 'accent',
    role: 'onAccent', padding: fs(10), radius: 999, ...o,
  });
  const headline = (o = {}) => makeText({
    name: 'Headline', text: 'Building tactile interfaces that feel alive', fontWeight: 800,
    fontSize: fs(60), lineHeight: 1.1, letterSpacing: -1, role: 'ink', w: innerW, ...o,
  });
  const subtitle = (o = {}) => makeText({
    name: 'Subtitle', text: 'Notes on motion, physics and craft in modern React apps.',
    fontWeight: 500, fontSize: fs(26), lineHeight: 1.4, role: 'muted', w: innerW, ...o,
  });

  if (id === 'editorial') {
    const inset = Math.round(Math.min(W, H) * 0.035);
    add(makeShape('rect', {
      name: 'Frame', x: inset, y: inset, w: W - inset * 2, h: H - inset * 2, fillEnabled: false,
      strokeWidth: 2, strokeRole: 'line', role: null, radius: fs(24), opacity: 0.4,
    }));
    const k = add(kicker({ x: px, y: py }));
    const hd = add(headline({ x: px, y: py + h(k) + fs(28), w: Math.min(innerW, Math.round(W * 0.78)) }));
    add(subtitle({ x: px, y: hd.y + h(hd) + fs(20), w: Math.min(innerW, Math.round(W * 0.7)) }));
    const av = fs(64);
    const rowY = H - py - av;
    add(makeShape('ellipse', { name: 'Avatar', x: px, y: rowY, w: av, h: av, role: 'accent' }));
    const ini = makeText({ name: 'Initials', text: 'MI', fontWeight: 800, fontSize: fs(24), autoWidth: true, role: 'onAccent' });
    ini.x = px + (av - w(ini)) / 2; ini.y = rowY + (av - h(ini)) / 2; add(ini);
    const nm = makeText({ name: 'Author', text: 'Mohammad Iliash', fontWeight: 700, fontSize: fs(22), autoWidth: true, role: 'ink' });
    const hn = makeText({ name: 'Handle', text: '@iliash', ...mono, fontWeight: 500, fontSize: fs(16), autoWidth: true, role: 'muted' });
    const gap = fs(4);
    const top = rowY + (av - (h(nm) + gap + h(hn))) / 2;
    nm.x = px + av + fs(18); nm.y = top; add(nm);
    hn.x = nm.x; hn.y = top + h(nm) + gap; add(hn);
    const dm = makeText({ name: 'Domain', text: 'iliash.me', ...mono, fontWeight: 700, fontSize: fs(20), autoWidth: true, role: 'accent' });
    dm.x = W - px - w(dm); dm.y = rowY + (av - h(dm)) / 2; add(dm);
  } else if (id === 'spotlight') {
    const orb = Math.round(Math.max(W, H) * 0.42);
    add(makeShape('ellipse', { name: 'Orb', x: W - orb * 0.7, y: -orb * 0.35, w: orb, h: orb, role: 'accent', opacity: 0.18 }));
    const ring = Math.round(orb * 0.6);
    add(makeShape('ellipse', {
      name: 'Ring', x: -ring * 0.3, y: H - ring * 0.7, w: ring, h: ring, fillEnabled: false,
      strokeWidth: Math.max(2, fs(3)), strokeRole: 'accent', role: null, opacity: 0.5,
    }));
    const cw = Math.min(innerW, Math.round(W * 0.8));
    const k = kicker({ text: 'NEW RELEASE' });
    k.x = (W - w(k)) / 2;
    const hd = headline({ align: 'center', w: cw, x: (W - cw) / 2, text: 'Ship delightful products faster' });
    const sb = subtitle({ align: 'center', w: cw, x: (W - cw) / 2 });
    const ft = makeText({ name: 'Footer', text: 'iliash.me', ...mono, fontWeight: 700, fontSize: fs(18), letterSpacing: 2, autoWidth: true, role: 'muted' });
    const g1 = fs(28), g2 = fs(20);
    const total = h(k) + g1 + h(hd) + g2 + h(sb);
    k.y = (H - total) / 2 - fs(10); hd.y = k.y + h(k) + g1; sb.y = hd.y + h(hd) + g2;
    ft.x = (W - w(ft)) / 2; ft.y = H - py * 0.6 - h(ft);
    [k, hd, sb, ft].forEach(add);
  } else if (id === 'terminal') {
    const m = Math.round(Math.min(W, H) * 0.08);
    const win = add(makeShape('rect', {
      name: 'Window', x: m, y: m, w: W - m * 2, h: H - m * 2, role: 'surface', strokeRole: 'line',
      stroke: '#3a414d', strokeWidth: 2, radius: fs(20), shadow: true, shadowBlur: 40,
    }));
    const bar = fs(52);
    const dot = fs(14);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => add(makeShape('ellipse', {
      name: `Dot ${i + 1}`, x: win.x + fs(22) + i * (dot + fs(9)), y: win.y + (bar - dot) / 2, w: dot, h: dot, fill: c, role: null,
    })));
    const tt = makeText({ name: 'Title', text: '~/iliash/notes.md', ...mono, fontWeight: 500, fontSize: fs(15), autoWidth: true, role: 'muted' });
    tt.x = win.x + (win.w - w(tt)) / 2; tt.y = win.y + (bar - h(tt)) / 2; add(tt);
    add(makeShape('rect', { name: 'Divider', x: win.x, y: win.y + bar, w: win.w, h: 2, radius: 0, role: 'line' }));
    const ix = win.x + fs(44);
    const iw = win.w - fs(88);
    const pr = add(makeText({ name: 'Prompt', text: '$ cat ./latest-post', ...mono, fontWeight: 700, fontSize: fs(20), autoWidth: true, role: 'accent', x: ix, y: win.y + bar + fs(36) }));
    const hd = add(headline({ x: ix, y: pr.y + h(pr) + fs(20), w: iw, fontSize: fs(54) }));
    const sb = add(subtitle({ x: ix, y: hd.y + h(hd) + fs(16), w: iw, fontSize: fs(23) }));
    const ft = makeText({ name: 'Footer', text: '→ iliash.me', ...mono, fontWeight: 700, fontSize: fs(17), autoWidth: true, role: 'muted' });
    ft.x = ix; ft.y = Math.max(sb.y + h(sb) + fs(16), win.y + win.h - fs(36) - h(ft)); add(ft);
  } else if (id === 'metric') {
    const colW = Math.round(innerW * 0.56);
    const k = add(kicker({ x: px, y: py, text: 'CASE STUDY' }));
    const hd = add(headline({ x: px, y: py + h(k) + fs(26), w: colW, fontSize: fs(52), text: 'Rebuilding a dashboard for buttery motion' }));
    add(subtitle({ x: px, y: hd.y + h(hd) + fs(18), w: colW, fontSize: fs(23) }));
    const cx = px + colW + fs(48);
    const cw = W - px - cx;
    const ch = Math.min(H - py * 2, Math.round(cw * 0.95));
    const card = add(makeShape('rect', {
      name: 'Metric card', x: cx, y: (H - ch) / 2, w: cw, h: ch, role: 'surface', strokeRole: 'accent',
      stroke: '#ff4f18', strokeWidth: Math.max(2, fs(3)), radius: fs(28), shadow: true, shadowBlur: 40,
    }));
    const big = makeText({ name: 'Metric', text: '99.8%', fontWeight: 800, fontSize: fs(84), letterSpacing: -2, lineHeight: 1, align: 'center', role: 'accent', w: cw - fs(20) });
    const cap = makeText({ name: 'Metric label', text: '60FPS FRAME STABILITY', ...mono, fontWeight: 700, fontSize: fs(15), letterSpacing: 2, align: 'center', role: 'muted', w: cw - fs(20) });
    const tot = h(big) + fs(14) + h(cap);
    big.x = cx + fs(10); big.y = card.y + (ch - tot) / 2;
    cap.x = cx + fs(10); cap.y = big.y + h(big) + fs(14);
    add(big); add(cap);
    add(makeText({ name: 'Domain', text: 'iliash.me', ...mono, fontWeight: 700, fontSize: fs(18), autoWidth: true, role: 'muted', x: px, y: H - py * 0.8 - fs(22) }));
  } else {
    const hd = headline({ align: 'center', text: 'Your headline here' });
    hd.x = px; hd.y = (H - h(hd)) / 2; add(hd);
  }
  return L;
}

export function createDoc(formatId = 'og', templateId = 'editorial', paletteId = 'obsidian', size) {
  const preset = FORMAT_PRESETS.find((f) => f.id === formatId);
  const W = size?.w || preset?.w || 1200;
  const H = size?.h || preset?.h || 630;
  const p = PALETTES.find((x) => x.id === paletteId) || PALETTES[0];
  return {
    version: 2,
    format: { id: preset ? formatId : 'custom', w: W, h: H },
    paletteId: p.id,
    background: paletteBackground(p, DEFAULT_BG),
    layers: applyPalette(buildTemplate(templateId, W, H), p),
  };
}

export function loadStoredDoc() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || !d.format || !(d.format.w > 0) || !(d.format.h > 0) || !Array.isArray(d.layers) || !d.background) return null;
    return d;
  } catch {
    return null;
  }
}

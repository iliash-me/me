// Shared engine for the free-form Social Media Image Composer.
// The DOM preview and the PNG exporter both use measureTextLayer() so text wraps identically.

export const STORAGE_KEY = 'iliash-social-composer-v2';

export const FORMAT_PRESETS = [
  { id: 'og', label: 'Open Graph', w: 1200, h: 630 },
  { id: 'post', label: 'X Post', w: 1200, h: 675 },
  { id: 'banner', label: 'X Banner', w: 1500, h: 500 },
  { id: 'linkedin', label: 'LinkedIn', w: 1584, h: 396 },
  { id: 'square', label: 'Square', w: 1080, h: 1080 },
  { id: 'story', label: 'Story', w: 1080, h: 1920 },
];

export const FONT_FALLBACKS = {
  'Plus Jakarta Sans': 'sans-serif',
  'Space Grotesk': 'sans-serif',
  'JetBrains Mono': 'monospace',
  'Playfair Display': 'serif',
  Georgia: 'serif',
};
export const FONT_FAMILIES = Object.keys(FONT_FALLBACKS);
export const FONT_WEIGHTS = [400, 500, 600, 700, 800];
export const fontCss = (family) => `"${family}", ${FONT_FALLBACKS[family] || 'sans-serif'}`;

export const PALETTES = [
  { id: 'obsidian', name: 'Obsidian Signal', bg1: '#0f1115', bg2: '#1e2430', accent: '#ff4f18', ink: '#ffffff', muted: '#a3a9b3', surface: '#161a22', line: '#3a414d', pattern: '#ffffff', onAccent: '#ffffff' },
  { id: 'daylight', name: 'Daylight Studio', bg1: '#f5f5f3', bg2: '#e6e4dd', accent: '#ff4f18', ink: '#111315', muted: '#5b616a', surface: '#ffffff', line: '#c9c7c0', pattern: '#111315', onAccent: '#ffffff' },
  { id: 'indigo', name: 'Indigo Aurora', bg1: '#0b1026', bg2: '#1e1b4b', accent: '#38bdf8', ink: '#ffffff', muted: '#a5b4fc', surface: '#141a3a', line: '#334083', pattern: '#ffffff', onAccent: '#0b1026' },
  { id: 'emerald', name: 'Emerald Matrix', bg1: '#061a14', bg2: '#0f2e24', accent: '#10b981', ink: '#ffffff', muted: '#9fd8c4', surface: '#0b241c', line: '#1f5a46', pattern: '#ffffff', onAccent: '#04120d' },
  { id: 'sunset', name: 'Sunset Ember', bg1: '#2a0f1f', bg2: '#7c2d12', accent: '#fbbf24', ink: '#fff7ed', muted: '#fed7aa', surface: '#3b1424', line: '#7a3b2a', pattern: '#ffffff', onAccent: '#2a0f1f' },
];

export const TEMPLATES = [
  { id: 'editorial', label: 'Editorial' },
  { id: 'spotlight', label: 'Spotlight' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'metric', label: 'Metric Split' },
  { id: 'blank', label: 'Blank' },
];

export const DEFAULT_BG = {
  type: 'linear',
  angle: 135,
  glow: true,
  glowAlpha: 0.28,
  glowX: 82,
  glowY: 20,
  glowSize: 50,
  pattern: 'grid',
  patternOpacity: 0.06,
  patternSize: 48,
};

export const uid = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const round1 = (v) => Math.round(v * 10) / 10;
export const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function hexToRgba(hex, a) {
  const n = parseInt(isHex(hex) ? hex.slice(1) : '000000', 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ---------------- Text measurement ---------------- */

let measureCtx = null;
export const measureCache = new Map();

function getMeasureCtx() {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

export function applyFont(ctx, l) {
  ctx.font = `${l.fontWeight} ${l.fontSize}px ${fontCss(l.fontFamily)}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${l.letterSpacing || 0}px`;
}

function wrapLines(ctx, text, maxWidth) {
  const out = [];
  const fitWord = (word) => {
    if (ctx.measureText(word).width <= maxWidth) return word;
    let chunk = '';
    for (const ch of word) {
      if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
        out.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    return chunk;
  };
  for (const para of String(text ?? '').split('\n')) {
    if (maxWidth == null || !para) {
      out.push(para);
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      if (!line) {
        line = fitWord(word);
        continue;
      }
      const test = `${line} ${word}`;
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else {
        out.push(line);
        line = fitWord(word);
      }
    }
    out.push(line);
  }
  return out;
}

export function measureTextLayer(l) {
  const key = [l.text, l.fontFamily, l.fontWeight, l.fontSize, l.lineHeight, l.letterSpacing, l.padding, l.autoWidth ? 'auto' : l.w].join('|');
  const hit = measureCache.get(key);
  if (hit) return hit;
  const ctx = getMeasureCtx();
  applyFont(ctx, l);
  const pad = l.padding || 0;
  const inner = l.autoWidth ? null : Math.max(10, l.w - pad * 2);
  const lines = wrapLines(ctx, l.text, inner);
  const lh = l.fontSize * l.lineHeight;
  const maxLine = lines.reduce((m, t) => Math.max(m, ctx.measureText(t).width), 0);
  const res = {
    lines,
    lh,
    pad,
    width: l.autoWidth ? Math.max(20, Math.ceil(maxLine + pad * 2)) : l.w,
    height: Math.ceil(lines.length * lh + pad * 2),
  };
  if (measureCache.size > 600) measureCache.clear();
  measureCache.set(key, res);
  return res;
}

export function getBox(l) {
  if (l.type === 'text') {
    const m = measureTextLayer(l);
    return { x: l.x, y: l.y, w: m.width, h: m.height };
  }
  return { x: l.x, y: l.y, w: l.w, h: l.h };
}

/* ---------------- Layer factories ---------------- */

const base = () => ({ id: uid(), x: 0, y: 0, rotation: 0, opacity: 1, hidden: false, locked: false });

export function makeText(o = {}) {
  return {
    ...base(), type: 'text', name: 'Text', w: 600, h: 0, text: 'Text',
    fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 48, lineHeight: 1.2, letterSpacing: 0,
    align: 'left', color: '#ffffff', autoWidth: false, bgEnabled: false, bgColor: '#ff4f18',
    padding: 0, radius: 0, role: 'ink', bgRole: null, ...o,
  };
}

export function makeShape(type, o = {}) {
  return {
    ...base(), type, name: type === 'ellipse' ? 'Circle' : 'Rectangle', w: 300, h: 200,
    fill: '#ff4f18', fillEnabled: true, stroke: '#ffffff', strokeWidth: 0,
    radius: type === 'rect' ? 16 : 0, shadow: false, shadowBlur: 30, role: 'accent', strokeRole: null, ...o,
  };
}

export function makeImage(o = {}) {
  return {
    ...base(), type: 'image', name: 'Image', w: 400, h: 300, src: '', fit: 'cover', radius: 0,
    stroke: '#ffffff', strokeWidth: 0, shadow: false, shadowBlur: 30, ...o,
  };
}

export function applyPalette(layers, p) {
  return layers.map((l) => {
    const n = { ...l };
    if (l.type === 'text') {
      if (l.role && p[l.role]) n.color = p[l.role];
      if (l.bgRole && p[l.bgRole]) n.bgColor = p[l.bgRole];
    } else if (l.type !== 'image') {
      if (l.role && p[l.role]) n.fill = p[l.role];
      if (l.strokeRole && p[l.strokeRole]) n.stroke = p[l.strokeRole];
    }
    return n;
  });
}

export function paletteBackground(p, bg = DEFAULT_BG) {
  return { ...bg, c1: p.bg1, c2: p.bg2, glowColor: p.accent, patternColor: p.pattern };
}

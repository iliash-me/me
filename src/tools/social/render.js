// Canvas renderer + CSS helpers. Mirrors the DOM preview so PNG export matches pixel for pixel.
import { applyFont, measureTextLayer, hexToRgba, getBox } from './engine';

/* ---------------- Background ---------------- */

export function backgroundStyle(bg, W, H) {
  const imgs = [];
  const sizes = [];
  if (bg.pattern === 'grid') {
    const c = hexToRgba(bg.patternColor, bg.patternOpacity);
    imgs.push(`linear-gradient(to right, ${c} 1px, transparent 1px)`, `linear-gradient(to bottom, ${c} 1px, transparent 1px)`);
    sizes.push(`${bg.patternSize}px ${bg.patternSize}px`, `${bg.patternSize}px ${bg.patternSize}px`);
  } else if (bg.pattern === 'dots') {
    const c = hexToRgba(bg.patternColor, Math.min(1, bg.patternOpacity * 2.5));
    imgs.push(`radial-gradient(circle at center, ${c} 1.6px, transparent 2.1px)`);
    sizes.push(`${bg.patternSize}px ${bg.patternSize}px`);
  }
  if (bg.glow) {
    const R = Math.round((Math.max(W, H) * bg.glowSize) / 100);
    imgs.push(`radial-gradient(circle ${R}px at ${bg.glowX}% ${bg.glowY}%, ${hexToRgba(bg.glowColor, bg.glowAlpha)}, ${hexToRgba(bg.glowColor, 0)})`);
    sizes.push('100% 100%');
  }
  if (bg.type === 'linear') {
    imgs.push(`linear-gradient(${bg.angle}deg, ${bg.c1}, ${bg.c2})`);
    sizes.push('100% 100%');
  } else if (bg.type === 'radial') {
    imgs.push(`radial-gradient(circle farthest-corner at 50% 50%, ${bg.c1}, ${bg.c2})`);
    sizes.push('100% 100%');
  }
  return {
    backgroundColor: bg.c1,
    backgroundImage: imgs.length ? imgs.join(', ') : 'none',
    backgroundSize: sizes.join(', ') || 'auto',
    backgroundRepeat: 'repeat',
    backgroundPosition: '0 0',
  };
}

export function drawBackground(ctx, bg, W, H) {
  ctx.fillStyle = bg.c1;
  ctx.fillRect(0, 0, W, H);
  if (bg.type === 'linear') {
    const a = (bg.angle * Math.PI) / 180;
    const L = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a));
    const dx = (Math.sin(a) * L) / 2;
    const dy = (-Math.cos(a) * L) / 2;
    const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (bg.type === 'radial') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W / 2, H / 2));
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (bg.glow) {
    const R = Math.round((Math.max(W, H) * bg.glowSize) / 100);
    const cx = (W * bg.glowX) / 100;
    const cy = (H * bg.glowY) / 100;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
    g.addColorStop(0, hexToRgba(bg.glowColor, bg.glowAlpha));
    g.addColorStop(1, hexToRgba(bg.glowColor, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const S = Math.max(4, bg.patternSize);
  if (bg.pattern === 'grid') {
    ctx.fillStyle = hexToRgba(bg.patternColor, bg.patternOpacity);
    for (let x = 0; x < W; x += S) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += S) ctx.fillRect(0, y, W, 1);
  } else if (bg.pattern === 'dots') {
    ctx.fillStyle = hexToRgba(bg.patternColor, Math.min(1, bg.patternOpacity * 2.5));
    for (let x = S / 2; x < W + S; x += S) {
      for (let y = S / 2; y < H + S; y += S) {
        ctx.beginPath();
        ctx.arc(x, y, 1.85, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/* ---------------- Primitives ---------------- */

export function pathRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function pathShape(ctx, l, x, y, w, h, r) {
  if (l.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.1, w / 2), Math.max(0.1, h / 2), 0, 0, Math.PI * 2);
  } else {
    pathRoundRect(ctx, x, y, w, h, r);
  }
}

export function drawImageFit(ctx, img, x, y, w, h, fit) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const k = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
  const dw = iw * k;
  const dh = ih * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

const imageCache = new Map();
export function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    }));
  }
  return imageCache.get(src);
}

// Draws only the CSS-like box-shadow (not the shape) by drawing the shape far away
// and offsetting the shadow back. shadowOffset/shadowBlur ignore the transform, so map them manually.
function drawShadowOnly(ctx, l, w, h, r, blur, mult) {
  const D = 100000;
  const m = ctx.getTransform();
  const oy = blur / 3;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = blur * mult;
  ctx.shadowOffsetX = m.a * D + m.c * oy;
  ctx.shadowOffsetY = m.b * D + m.d * oy;
  ctx.fillStyle = '#000';
  pathShape(ctx, l, -w / 2 - D, -h / 2, w, h, r);
  ctx.fill();
  ctx.restore();
}

/* ---------------- Layers ---------------- */

export function drawLayer(ctx, l, imgs, mult = 1) {
  if (l.hidden) return;
  const b = getBox(l);
  const { w, h } = b;
  ctx.save();
  ctx.globalAlpha = l.opacity ?? 1;
  ctx.translate(b.x + w / 2, b.y + h / 2);
  if (l.rotation) ctx.rotate((l.rotation * Math.PI) / 180);
  const x = -w / 2;
  const y = -h / 2;

  if (l.type === 'text') {
    const m = measureTextLayer(l);
    if (l.bgEnabled) {
      ctx.fillStyle = l.bgColor;
      pathRoundRect(ctx, x, y, w, h, l.radius);
      ctx.fill();
    }
    applyFont(ctx, l);
    ctx.fillStyle = l.color;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = l.align;
    const fm = ctx.measureText('Mg');
    const asc = fm.fontBoundingBoxAscent ?? l.fontSize * 0.8;
    const desc = fm.fontBoundingBoxDescent ?? l.fontSize * 0.2;
    const tx = l.align === 'center' ? x + w / 2 : l.align === 'right' ? x + w - m.pad : x + m.pad;
    m.lines.forEach((line, i) => {
      const top = y + m.pad + i * m.lh;
      ctx.fillText(line, tx, top + (m.lh - (asc + desc)) / 2 + asc);
    });
  } else if (l.type === 'image') {
    const img = imgs.get(l.src);
    if (l.shadow) drawShadowOnly(ctx, l, w, h, l.radius, l.shadowBlur, mult);
    ctx.save();
    pathRoundRect(ctx, x, y, w, h, l.radius);
    ctx.clip();
    if (img) drawImageFit(ctx, img, x, y, w, h, l.fit);
    ctx.restore();
    if (l.strokeWidth > 0) {
      const sw = l.strokeWidth;
      ctx.strokeStyle = l.stroke;
      ctx.lineWidth = sw;
      pathRoundRect(ctx, x + sw / 2, y + sw / 2, w - sw, h - sw, Math.max(0, l.radius - sw / 2));
      ctx.stroke();
    }
  } else {
    if (l.shadow) drawShadowOnly(ctx, l, w, h, l.radius, l.shadowBlur, mult);
    if (l.fillEnabled) {
      ctx.fillStyle = l.fill;
      pathShape(ctx, l, x, y, w, h, l.radius);
      ctx.fill();
    }
    if (l.strokeWidth > 0) {
      const sw = Math.min(l.strokeWidth, w / 2, h / 2);
      ctx.strokeStyle = l.stroke;
      ctx.lineWidth = sw;
      pathShape(ctx, l, x + sw / 2, y + sw / 2, w - sw, h - sw, Math.max(0, l.radius - sw / 2));
      ctx.stroke();
    }
  }
  ctx.restore();
}

export async function renderDocToCanvas(doc, mult = 1) {
  if (document.fonts?.ready) await document.fonts.ready;
  const { w: W, h: H } = doc.format;
  const imgs = new Map();
  await Promise.all(doc.layers.filter((l) => l.type === 'image' && l.src).map(async (l) => {
    const img = await loadImage(l.src);
    if (img) imgs.set(l.src, img);
  }));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * mult);
  canvas.height = Math.round(H * mult);
  const ctx = canvas.getContext('2d');
  ctx.scale(mult, mult);
  drawBackground(ctx, doc.background, W, H);
  doc.layers.forEach((l) => drawLayer(ctx, l, imgs, mult));
  return canvas;
}

/* ---------------- Snapping ---------------- */

// Snap a moving box [pos, pos+size] on one axis to a list of target coordinates.
export function snapAxis(pos, size, targets, th) {
  let best = null;
  const offsets = [0, size / 2, size];
  for (const t of targets) {
    for (const o of offsets) {
      const d = t - (pos + o);
      if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, guide: t };
    }
  }
  return best ? { pos: pos + best.d, guide: best.guide } : { pos, guide: null };
}

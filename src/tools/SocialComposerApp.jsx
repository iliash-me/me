import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './SocialComposerApp.css';
import {
  FORMAT_PRESETS, PALETTES, TEMPLATES, measureCache, getBox, measureTextLayer,
  makeText, makeShape, makeImage, applyPalette, paletteBackground, uid, round1, clamp,
} from './social/engine';
import { buildTemplate, createDoc } from './social/templates';
import { backgroundStyle, renderDocToCanvas, snapAxis } from './social/render';
import { CustomSizeForm, Icon } from './social/fields';
import { LayerView, SelectionBox } from './social/Stage';
import PropertiesPanel from './social/PropertiesPanel';
import BackgroundPanel from './social/BackgroundPanel';
import useDocHistory from './social/useDocHistory';

const FONT_LOADS = [
  ...[400, 500, 600, 700, 800].map((w) => `${w} 40px "Plus Jakarta Sans"`),
  ...[500, 700, 800].map((w) => `${w} 40px "JetBrains Mono"`),
  '500 40px "Space Grotesk"', '700 40px "Space Grotesk"',
  '700 40px "Playfair Display"', '800 40px "Playfair Display"',
];

const HANDLE_DIRS = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0],
};

const isTypingTarget = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

function readImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const url = reader.result;
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const iw = img.naturalWidth || 800;
        const ih = img.naturalHeight || 600;
        const k = Math.min(1, 1600 / Math.max(iw, ih));
        if (k === 1 && file.size < 1.5e6) {
          resolve({ src: url, w: iw, h: ih });
          return;
        }
        const c = document.createElement('canvas');
        c.width = Math.round(iw * k);
        c.height = Math.round(ih * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const keepAlpha = /png|webp|gif|svg/.test(file.type);
        resolve({ src: c.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.9), w: c.width, h: c.height });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });
}

export default function SocialComposerApp({ onNavigateHome }) {
  const { doc, docRef, pristineRef, applyDoc, replaceSilently, undo, redo, hist, saveStatus } = useDocHistory();
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [guides, setGuides] = useState([]);
  const [fontVersion, setFontVersion] = useState(0);
  const [zoom, setZoom] = useState('fit');
  const [wrapW, setWrapW] = useState(900);
  const [viewH, setViewH] = useState(() => window.innerHeight);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  const dragRef = useRef(null);
  const handlersRef = useRef({});
  const toastTimer = useRef(null);

  const W = doc.format.w;
  const H = doc.format.h;
  const palette = PALETTES.find((p) => p.id === doc.paletteId) || PALETTES[0];
  const selected = doc.layers.find((l) => l.id === selectedId) || null;
  const fitScale = Math.max(0.05, Math.min(1, (wrapW - 72) / W, Math.max(260, viewH * 0.72) / H));
  const scale = zoom === 'fit' ? fitScale : zoom;

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  /* ---------- fonts ---------- */
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (!alive) return;
      measureCache.clear();
      if (pristineRef.current) {
        const d = docRef.current;
        replaceSilently(createDoc(d.format.id, 'editorial', d.paletteId, d.format));
        setSelectedId(null);
      }
      setFontVersion((v) => v + 1);
    };
    if (document.fonts) {
      Promise.all(FONT_LOADS.map((f) => document.fonts.load(f).catch(() => null))).then(refresh);
      document.fonts.addEventListener?.('loadingdone', refresh);
    }
    return () => {
      alive = false;
      document.fonts?.removeEventListener?.('loadingdone', refresh);
    };
  }, [docRef, pristineRef, replaceSilently]);

  /* ---------- sizing ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWrapW(entry.contentRect.width));
    ro.observe(el);
    const onResize = () => setViewH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* ---------- layer helpers ---------- */
  const updateLayer = useCallback((id, patch, key) => {
    applyDoc((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }), { key });
  }, [applyDoc]);

  const addLayer = (layer) => {
    const b = getBox(layer);
    const l = { ...layer, x: round1(layer.x || (W - b.w) / 2), y: round1(layer.y || (H - b.h) / 2) };
    applyDoc((d) => ({ ...d, layers: [...d.layers, l] }));
    setSelectedId(l.id);
    setEditingId(null);
  };

  const addElement = (kind) => {
    const m = Math.min(W, H);
    const p = palette;
    if (kind === 'heading') addLayer(makeText({ name: 'Heading', text: 'Your headline', fontWeight: 800, fontSize: Math.round(m * 0.1), lineHeight: 1.1, letterSpacing: -1, w: Math.round(W * 0.6), color: p.ink, role: 'ink' }));
    if (kind === 'text') addLayer(makeText({ name: 'Text', text: 'Add a short supporting line here', fontWeight: 500, fontSize: Math.round(m * 0.045), lineHeight: 1.4, w: Math.round(W * 0.5), color: p.muted, role: 'muted' }));
    if (kind === 'badge') {
      const fsz = Math.round(m * 0.03);
      addLayer(makeText({ name: 'Badge', text: 'NEW', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: fsz, letterSpacing: 2, autoWidth: true, bgEnabled: true, bgColor: p.accent, bgRole: 'accent', color: p.onAccent, role: 'onAccent', padding: Math.round(fsz * 0.6), radius: 999 }));
    }
    if (kind === 'rect') addLayer(makeShape('rect', { w: Math.round(W * 0.25), h: Math.round(H * 0.25), fill: p.accent, role: 'accent', stroke: p.line }));
    if (kind === 'ellipse') addLayer(makeShape('ellipse', { w: Math.round(m * 0.25), h: Math.round(m * 0.25), fill: p.accent, role: 'accent', stroke: p.line }));
    if (kind === 'line') addLayer(makeShape('rect', { name: 'Line', w: Math.round(W * 0.3), h: Math.max(2, Math.round(m * 0.006)), radius: 2, fill: p.accent, role: 'accent' }));
  };

  const handleFiles = async (files, replaceId = null) => {
    const file = [...(files || [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    const res = await readImageFile(file);
    if (!res) {
      flash('Could not read that image');
      return;
    }
    if (replaceId) {
      const l = docRef.current.layers.find((x) => x.id === replaceId);
      if (l) updateLayer(replaceId, { src: res.src, h: round1((l.w * res.h) / res.w) });
      return;
    }
    const k = Math.min((W * 0.5) / res.w, (H * 0.6) / res.h, 1);
    addLayer(makeImage({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Image', src: res.src, w: round1(res.w * k), h: round1(res.h * k) }));
  };

  const arrange = (dir) => {
    if (!selected) return;
    applyDoc((d) => {
      const arr = [...d.layers];
      const i = arr.findIndex((l) => l.id === selected.id);
      if (i < 0) return d;
      const [item] = arr.splice(i, 1);
      const to = dir === 'front' ? arr.length : dir === 'back' ? 0 : dir === 'forward' ? Math.min(arr.length, i + 1) : Math.max(0, i - 1);
      arr.splice(to, 0, item);
      return { ...d, layers: arr };
    });
  };

  const align = (kind) => {
    if (!selected) return;
    const b = getBox(selected);
    const patch = {
      left: { x: 0 }, hcenter: { x: (W - b.w) / 2 }, right: { x: W - b.w },
      top: { y: 0 }, vcenter: { y: (H - b.h) / 2 }, bottom: { y: H - b.h },
    }[kind];
    updateLayer(selected.id, patch);
  };

  const duplicate = () => {
    if (!selected) return;
    const copy = { ...selected, id: uid(), name: `${selected.name} copy`, x: selected.x + 24, y: selected.y + 24, locked: false };
    applyDoc((d) => {
      const i = d.layers.findIndex((l) => l.id === selected.id);
      const arr = [...d.layers];
      arr.splice(i + 1, 0, copy);
      return { ...d, layers: arr };
    });
    setSelectedId(copy.id);
  };

  const removeSelected = () => {
    if (!selected) return;
    applyDoc((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== selected.id) }));
    setSelectedId(null);
    setEditingId(null);
  };

  const changeFormat = (id, w, h) => {
    applyDoc((d) => {
      const W0 = d.format.w;
      const H0 = d.format.h;
      if (w === W0 && h === H0) return d.format.id === id ? d : { ...d, format: { id, w, h } };
      return {
        ...d,
        format: { id, w, h },
        layers: d.layers.map((l) => {
          const b = getBox(l);
          return { ...l, x: round1(((b.x + b.w / 2) * w) / W0 - b.w / 2), y: round1(((b.y + b.h / 2) * h) / H0 - b.h / 2) };
        }),
      };
    });
  };

  const applyTemplate = (id) => {
    applyDoc((d) => ({ ...d, layers: applyPalette(buildTemplate(id, d.format.w, d.format.h), palette) }));
    setSelectedId(null);
    setEditingId(null);
  };

  const choosePalette = (p) => {
    applyDoc((d) => ({ ...d, paletteId: p.id, background: paletteBackground(p, d.background), layers: applyPalette(d.layers, p) }));
  };

  const resetDoc = () => {
    applyDoc((d) => createDoc(d.format.id, 'editorial', d.paletteId, d.format));
    setSelectedId(null);
  };

  /* ---------- export ---------- */
  const download = async (mult) => {
    setBusy(true);
    try {
      const c = await renderDocToCanvas(docRef.current, mult);
      await new Promise((resolve) => c.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `social-${W}x${H}${mult > 1 ? `@${mult}x` : ''}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        resolve();
      }, 'image/png'));
      flash(`Downloaded ${W * mult}×${H * mult} PNG`);
    } catch {
      flash('Export failed');
    }
    setBusy(false);
  };

  const copyPng = async () => {
    try {
      const blob = renderDocToCanvas(docRef.current, 1).then((c) => new Promise((r) => c.toBlob(r, 'image/png')));
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      flash('PNG copied to clipboard');
    } catch {
      flash('Clipboard images not supported here');
    }
  };

  /* ---------- pointer interaction ---------- */
  const beginDrag = (e, mode, layer, handle = null) => {
    const others = docRef.current.layers.filter((l) => l.id !== layer.id && !l.hidden).map(getBox);
    dragRef.current = {
      mode, handle, id: layer.id, sx: e.clientX, sy: e.clientY, orig: layer, box: getBox(layer), started: false, pushed: false,
      tx: [0, W / 2, W, ...others.flatMap((b) => [b.x, b.x + b.w / 2, b.x + b.w])],
      ty: [0, H / 2, H, ...others.flatMap((b) => [b.y, b.y + b.h / 2, b.y + b.h])],
    };
  };

  const onLayerPointerDown = (e, l) => {
    if (editingId === l.id || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    setSelectedId(l.id);
    setEditingId(null);
    if (!l.locked) beginDrag(e, 'move', l);
  };

  const onHandleDown = (e, mode, handle) => {
    if (!selected || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    beginDrag(e, mode, selected, handle);
  };

  const computeDrag = (d, e) => {
    const o = d.orig;
    const b = d.box;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    if (d.mode === 'move') {
      let nx = b.x + dx;
      let ny = b.y + dy;
      const g = [];
      if (!e.altKey) {
        const th = 6 / scale;
        const sx = snapAxis(nx, b.w, d.tx, th);
        const sy = snapAxis(ny, b.h, d.ty, th);
        nx = sx.pos;
        ny = sy.pos;
        if (sx.guide != null) g.push({ axis: 'x', pos: sx.guide });
        if (sy.guide != null) g.push({ axis: 'y', pos: sy.guide });
      }
      setGuides(g);
      return { x: round1(nx), y: round1(ny) };
    }
    const rad = ((o.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    if (d.mode === 'rotate') {
      const r = stageRef.current.getBoundingClientRect();
      const px = (e.clientX - r.left) / scale;
      const py = (e.clientY - r.top) / scale;
      let a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      else {
        const n = Math.round(a / 90) * 90;
        if (Math.abs(a - n) < 3) a = n;
      }
      a = ((((a + 180) % 360) + 360) % 360) - 180;
      return { rotation: round1(a) };
    }
    // resize in the layer's local (rotated) frame
    const [hx, hy] = HANDLE_DIRS[d.handle];
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    let patch;
    let nw;
    let nh;
    if (o.type === 'text') {
      if (hy === 0) {
        const w = Math.max(20, b.w + hx * lx);
        patch = { w: round1(w), autoWidth: false };
      } else {
        const k = Math.max(0.08, (b.w + hx * lx) / b.w);
        patch = {
          fontSize: round1(Math.max(6, o.fontSize * k)),
          padding: round1((o.padding || 0) * k),
          letterSpacing: round1((o.letterSpacing || 0) * k),
          radius: o.radius >= 999 ? o.radius : round1((o.radius || 0) * k),
        };
        if (!o.autoWidth) patch.w = round1(Math.max(20, o.w * k));
      }
      const m = measureTextLayer({ ...o, ...patch });
      nw = m.width;
      nh = m.height;
    } else {
      nw = Math.max(4, b.w + hx * lx);
      nh = Math.max(2, b.h + hy * ly);
      const corner = hx !== 0 && hy !== 0;
      const keep = corner && (o.type === 'image' ? !e.shiftKey : e.shiftKey);
      if (keep) {
        const k = Math.max(nw / b.w, nh / b.h);
        nw = Math.max(4, b.w * k);
        nh = Math.max(2, b.h * k);
      }
      patch = { w: round1(nw), h: round1(nh) };
    }
    // keep the opposite edge anchored; for text side handles anchor the top edge
    const sxl = (hx * (nw - b.w)) / 2;
    const syl = hy === 0 ? (nh - b.h) / 2 : (hy * (nh - b.h)) / 2;
    const ncx = cx + sxl * cos - syl * sin;
    const ncy = cy + sxl * sin + syl * cos;
    return { ...patch, x: round1(ncx - nw / 2), y: round1(ncy - nh / 2) };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
      d.started = true;
    }
    const patch = computeDrag(d, e);
    applyDoc((doc2) => ({ ...doc2, layers: doc2.layers.map((l) => (l.id === d.id ? { ...l, ...patch } : l)) }), { history: !d.pushed });
    d.pushed = true;
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setGuides([]);
  };

  const onKeyDown = (e) => {
    if (isTypingTarget(e.target)) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && k === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (!selected) return;
    if (mod && k === 'd') {
      e.preventDefault();
      duplicate();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeSelected();
    } else if (e.key === 'Escape') {
      setSelectedId(null);
    } else if (e.key === 'Enter' && selected.type === 'text' && !selected.locked) {
      e.preventDefault();
      setEditingId(selected.id);
    } else if (e.key === '[' || e.key === ']') {
      arrange(e.key === ']' ? 'forward' : 'backward');
    } else if (e.key.startsWith('Arrow') && !selected.locked) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      updateLayer(selected.id, { x: selected.x + dx, y: selected.y + dy }, `${selected.id}:nudge`);
    }
  };

  useEffect(() => {
    handlersRef.current = { onPointerMove, onPointerUp, onKeyDown };
  });

  useEffect(() => {
    const mv = (e) => handlersRef.current.onPointerMove?.(e);
    const up = (e) => handlersRef.current.onPointerUp?.(e);
    const kd = (e) => handlersRef.current.onKeyDown?.(e);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', kd);
    return () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd);
    };
  }, []);

  /* ---------- derived ---------- */
  const bgStyle = useMemo(() => backgroundStyle(doc.background, W, H), [doc.background, W, H]);

  const meta = useMemo(() => {
    const texts = doc.layers.filter((l) => l.type === 'text' && !l.hidden && l.text.trim()).sort((a, b) => b.fontSize - a.fontSize);
    const title = (texts[0]?.text || 'Untitled').replace(/\s+/g, ' ').trim();
    const desc = (texts[1]?.text || '').replace(/\s+/g, ' ').trim();
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return [
      `<meta property="og:title" content="${esc(title)}" />`,
      desc && `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:image" content="https://example.com/social-${W}x${H}.png" />`,
      `<meta property="og:image:width" content="${W}" />`,
      `<meta property="og:image:height" content="${H}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
    ].filter(Boolean).join('\n');
  }, [doc.layers, W, H]);

  const zoomPct = Math.round(scale * 100);

  return (
    <div className="sc-shell">
      <header className="sc-topbar">
        <div className="sc-topbar-inner">
          <div className="sc-brand">
            <a
              href="/"
              className="sc-back"
              aria-label="Back to portfolio"
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
            >
              ← Portfolio
            </a>
            <div>
              <span className="sc-kicker">TOOL // FREE-FORM SHARE CARD EDITOR</span>
              <h1 className="sc-title">Social Media Image Composer</h1>
            </div>
          </div>
          <div className="sc-formats" role="group" aria-label="Canvas size">
            {FORMAT_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={doc.format.id === f.id ? 'is-active' : ''}
                onClick={() => changeFormat(f.id, f.w, f.h)}
                title={`${f.w}×${f.h}`}
              >
                {f.label}
                <small>{f.w}×{f.h}</small>
              </button>
            ))}
            <CustomSizeForm w={W} h={H} onApply={(w, h) => changeFormat('custom', w, h)} />
          </div>
        </div>
      </header>

      <div className="sc-layout">
        <aside className="sc-left">
          <div className="sc-panel">
            <p className="sc-panel-title">Add elements</p>
            <div className="sc-add-grid">
              <button type="button" onClick={() => addElement('heading')}><Icon name="text" /><span>Heading</span></button>
              <button type="button" onClick={() => addElement('text')}><Icon name="text" /><span>Text</span></button>
              <button type="button" onClick={() => addElement('badge')}><Icon name="badge" /><span>Badge</span></button>
              <button type="button" onClick={() => addElement('rect')}><Icon name="rect" /><span>Rectangle</span></button>
              <button type="button" onClick={() => addElement('ellipse')}><Icon name="circle" /><span>Circle</span></button>
              <button type="button" onClick={() => addElement('line')}><Icon name="line" /><span>Line</span></button>
              <button type="button" className="sc-add-wide" onClick={() => { replaceRef.current = null; fileRef.current?.click(); }}>
                <Icon name="image" /><span>Upload image</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handleFiles(e.target.files, replaceRef.current);
                e.target.value = '';
              }}
            />
          </div>

          <div className="sc-panel">
            <p className="sc-panel-title">Templates <span className="sc-muted-inline">replace layers</span></p>
            <div className="sc-chip-grid">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="sc-chip" onClick={() => applyTemplate(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="sc-panel">
            <p className="sc-panel-title">Palette</p>
            <div className="sc-palettes">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`sc-palette${doc.paletteId === p.id ? ' is-active' : ''}`}
                  onClick={() => choosePalette(p)}
                  title={p.name}
                >
                  <span className="sc-swatch" style={{ background: `linear-gradient(135deg, ${p.bg1}, ${p.bg2})` }}>
                    <i style={{ background: p.accent }} />
                    <i style={{ background: p.ink }} />
                  </span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <BackgroundPanel
            bg={doc.background}
            update={(patch, key) => applyDoc((d) => ({ ...d, background: { ...d.background, ...patch } }), { key: key ? `bg:${key}` : null })}
          />
        </aside>

        <main className="sc-main">
          <div className="sc-toolbar">
            <div className="sc-tool-group">
              <button type="button" className="sc-icon-btn" onClick={undo} disabled={!hist.canUndo} title="Undo (⌘Z)" aria-label="Undo"><Icon name="undo" /></button>
              <button type="button" className="sc-icon-btn" onClick={redo} disabled={!hist.canRedo} title="Redo (⌘⇧Z)" aria-label="Redo"><Icon name="redo" /></button>
              <span className="sc-sep" />
              <button type="button" className="sc-icon-btn" onClick={duplicate} disabled={!selected} title="Duplicate (⌘D)" aria-label="Duplicate"><Icon name="copy" /></button>
              <button type="button" className="sc-icon-btn" onClick={removeSelected} disabled={!selected} title="Delete (Del)" aria-label="Delete"><Icon name="trash" /></button>
              <span className="sc-sep" />
              <select className="sc-zoom" value={zoom} onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))} aria-label="Zoom">
                <option value="fit">Fit ({Math.round(fitScale * 100)}%)</option>
                {[0.25, 0.5, 0.75, 1].map((z) => <option key={z} value={z}>{z * 100}%</option>)}
              </select>
              <span className={`sc-save is-${saveStatus}`} title={saveStatus === 'full' ? 'Browser storage is full; remove large images' : 'Autosaved locally'}>
                {saveStatus === 'full' ? 'Storage full' : 'Autosaved'}
              </span>
            </div>
            <div className="sc-tool-group">
              <button type="button" className="sc-btn" onClick={resetDoc} title="Start over with the default template">Reset</button>
              <button type="button" className="sc-btn" onClick={copyPng}>Copy PNG</button>
              <button type="button" className="sc-btn" onClick={() => download(1)} disabled={busy}>PNG 1×</button>
              <button type="button" className="sc-btn sc-btn-primary" onClick={() => download(2)} disabled={busy}>Download 2×</button>
            </div>
          </div>

          <div
            className="sc-stage-wrap"
            ref={wrapRef}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedId(null);
                setEditingId(null);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            <div className="sc-stage" ref={stageRef} style={{ width: W * scale, height: H * scale }}>
              <div className="sc-stage-inner" style={{ width: W, height: H, transform: `scale(${scale})`, '--inv': 1 / scale }}>
                <div
                  className="sc-canvas"
                  data-fv={fontVersion}
                  style={bgStyle}
                  onPointerDown={() => {
                    setSelectedId(null);
                    setEditingId(null);
                  }}
                >
                  {doc.layers.filter((l) => !l.hidden).map((l) => (
                    <LayerView
                      key={l.id}
                      layer={l}
                      editing={editingId === l.id}
                      onPointerDown={onLayerPointerDown}
                      onDoubleClick={(e, layer) => {
                        if (layer.type === 'text' && !layer.locked) setEditingId(layer.id);
                      }}
                      onTextChange={(id, text) => updateLayer(id, { text }, `${id}:text`)}
                      onEditEnd={() => setEditingId(null)}
                    />
                  ))}
                </div>
                {guides.map((g, i) => (
                  <div key={i} className={`sc-guide sc-guide-${g.axis}`} style={g.axis === 'x' ? { left: g.pos } : { top: g.pos }} />
                ))}
                {selected && !selected.hidden && editingId !== selected.id && (
                  <SelectionBox layer={selected} onHandleDown={onHandleDown} />
                )}
              </div>
            </div>
          </div>

          <p className="sc-hint">
            Drag to move · handles resize · top knob rotates (Shift = 15°) · double-click text to edit · Alt disables snapping ·
            arrows nudge (Shift ×10) · ⌘D duplicate · [ ] reorder · drop an image onto the canvas
          </p>

          <div className="sc-panel sc-meta">
            <div className="sc-meta-head">
              <p className="sc-panel-title">Meta tags</p>
              <button
                type="button"
                className="sc-btn"
                onClick={() => navigator.clipboard?.writeText(meta).then(() => flash('Meta tags copied'), () => flash('Copy failed'))}
              >
                Copy
              </button>
            </div>
            <pre>{meta}</pre>
          </div>
        </main>

        <aside className="sc-right">
          <PropertiesPanel
            layer={selected}
            update={(patch, key) => selected && updateLayer(selected.id, patch, key)}
            onArrange={arrange}
            onAlign={align}
            onDuplicate={duplicate}
            onDelete={removeSelected}
            onReplaceImage={() => {
              replaceRef.current = selected?.id || null;
              fileRef.current?.click();
            }}
          />
          <div className="sc-panel">
            <p className="sc-panel-title">Layers <span className="sc-muted-inline">{doc.layers.length}</span></p>
            <ul className="sc-layers">
              {[...doc.layers].reverse().map((l) => (
                <li key={l.id} className={l.id === selectedId ? 'is-active' : ''}>
                  <button type="button" className="sc-layer-name" onClick={() => setSelectedId(l.id)}>
                    <span className="sc-layer-icon"><Icon name={l.type === 'text' ? 'text' : l.type === 'image' ? 'image' : l.type === 'ellipse' ? 'circle' : 'rect'} /></span>
                    <span className={l.hidden ? 'is-hidden' : ''}>{l.name || l.type}</span>
                  </button>
                  <button type="button" className="sc-mini" title={l.hidden ? 'Show' : 'Hide'} aria-label={l.hidden ? 'Show layer' : 'Hide layer'} onClick={() => updateLayer(l.id, { hidden: !l.hidden })}>
                    <Icon name={l.hidden ? 'eyeOff' : 'eye'} />
                  </button>
                  <button type="button" className={`sc-mini${l.locked ? ' is-on' : ''}`} title={l.locked ? 'Unlock' : 'Lock'} aria-label={l.locked ? 'Unlock layer' : 'Lock layer'} onClick={() => updateLayer(l.id, { locked: !l.locked })}>
                    <Icon name={l.locked ? 'lock' : 'unlock'} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className={`sc-toast${toast ? ' is-visible' : ''}`} role="status">{toast}</div>
      <span hidden>{zoomPct}{clamp(0, 0, 1)}</span>
    </div>
  );
}

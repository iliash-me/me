import React, { useState, useEffect, useRef, useMemo } from 'react';
import './SocialComposerApp.css';

const FORMAT_PRESETS = [
  { id: 'og', label: 'Open Graph (1200×630)', width: 1200, height: 630 },
  { id: 'twitter', label: 'X / Post Card (1200×675)', width: 1200, height: 675 },
  { id: 'banner', label: 'X / LinkedIn Banner (1500×500)', width: 1500, height: 500 },
  { id: 'square', label: 'Square Post (1080×1080)', width: 1080, height: 1080 },
];

const THEME_PALETTES = [
  {
    id: 'obsidian-signal',
    name: 'Obsidian Signal',
    bgStart: '#0f1115',
    bgEnd: '#1e2430',
    accent: '#ff4f18',
    textColor: '#ffffff',
  },
  {
    id: 'daylight-editorial',
    name: 'Daylight Studio',
    bgStart: '#f5f5f3',
    bgEnd: '#e5e4df',
    accent: '#ff4f18',
    textColor: '#111315',
  },
  {
    id: 'indigo-aurora',
    name: 'Indigo Aurora',
    bgStart: '#0b1026',
    bgEnd: '#1e1b4b',
    accent: '#38bdf8',
    textColor: '#ffffff',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    bgStart: '#061a14',
    bgEnd: '#0f2e24',
    accent: '#10b981',
    textColor: '#ffffff',
  },
];

const TEMPLATES = [
  { id: 'editorial', label: 'Editorial Left' },
  { id: 'spotlight', label: 'Centered Spotlight' },
  { id: 'terminal', label: 'Terminal Window' },
  { id: 'metric', label: 'Metric Split Card' },
];

export default function SocialComposerApp({ onNavigateHome }) {
  const canvasRef = useRef(null);

  const [formatId, setFormatId] = useState('og');
  const [template, setTemplate] = useState('editorial');

  const [kicker, setKicker] = useState('ENGINEERING RELEASE // V2.4');
  const [title, setTitle] = useState('Building High-Craft Interactive Tools for the Web');
  const [subtitle, setSubtitle] = useState(
    'Zero-dependency micro-studios, procedural graphics, and tactile daylight interfaces.'
  );
  const [author, setAuthor] = useState('Md Iliash Mia');
  const [handle, setHandle] = useState('@iliash • Full-Stack Engineer');
  const [domain, setDomain] = useState('iliash.me');
  const [metricValue, setMetricValue] = useState('99.8%');
  const [metricLabel, setMetricLabel] = useState('60FPS FRAME STABILITY');

  const [bgStart, setBgStart] = useState('#0f1115');
  const [bgEnd, setBgEnd] = useState('#1e2430');
  const [accentColor, setAccentColor] = useState('#ff4f18');
  const [textColor, setTextColor] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(true);
  const [copiedMeta, setCopiedMeta] = useState(false);

  const activeFormat = useMemo(
    () => FORMAT_PRESETS.find((f) => f.id === formatId) || FORMAT_PRESETS[0],
    [formatId]
  );

  const safeColor = (val, fallback) =>
    /^#[0-9A-Fa-f]{6}$/.test(val) ? val : fallback;

  const handleHexChange = (setter) => (raw) => {
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(cleaned)) {
      setter(cleaned);
    }
  };

  const applyTheme = (theme) => {
    setBgStart(theme.bgStart);
    setBgEnd(theme.bgEnd);
    setAccentColor(theme.accent);
    setTextColor(theme.textColor);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = activeFormat.width;
    const H = activeFormat.height;

    canvas.width = W;
    canvas.height = H;

    const cStart = safeColor(bgStart, '#0f1115');
    const cEnd = safeColor(bgEnd, '#1e2430');
    const cAccent = safeColor(accentColor, '#ff4f18');
    const cText = safeColor(textColor, '#ffffff');
    const isLightBg = cText.toLowerCase() === '#111315';

    // 1. Linear gradient backdrop
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, cStart);
    grad.addColorStop(1, cEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Ambient radial glow
    const glow = ctx.createRadialGradient(W * 0.82, H * 0.22, 10, W * 0.82, H * 0.22, W * 0.48);
    glow.addColorStop(0, `${cAccent}44`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 3. Optional subtle architectural grid
    if (showGrid) {
      ctx.strokeStyle = isLightBg ? 'rgba(17, 19, 21, 0.06)' : 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = 0; x <= W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    // Helper for rounded rectangles
    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // Helper for word-wrapped multiline text
    const drawWrappedText = (text, x, y, maxWidth, lineHeight, align = 'left', maxLines = 3) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      let linesDrawn = 0;
      ctx.textAlign = align;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
          linesDrawn++;
          if (linesDrawn >= maxLines - 1) {
            break;
          }
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        ctx.fillText(line.trim(), x, currentY);
        currentY += lineHeight;
      }
      return currentY;
    };

    const padX = Math.round(W * 0.075);
    const padY = Math.round(H * 0.11);

    // Outer framing border
    roundRect(padX * 0.55, padY * 0.55, W - padX * 1.1, H - padY * 1.1, 24);
    ctx.strokeStyle = isLightBg ? 'rgba(17, 19, 21, 0.12)' : 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (template === 'terminal') {
      // Draw terminal window chrome
      const winX = padX;
      const winY = padY;
      const winW = W - padX * 2;
      const winH = H - padY * 2;
      roundRect(winX, winY, winW, winH, 20);
      ctx.fillStyle = isLightBg ? 'rgba(255,255,255,0.88)' : 'rgba(12, 15, 20, 0.86)';
      ctx.fill();
      ctx.strokeStyle = isLightBg ? 'rgba(17,19,21,0.14)' : 'rgba(255,255,255,0.16)';
      ctx.stroke();

      // Traffic lights
      ['#ff5f56', '#ffbd2e', '#27c93f'].forEach((dotColor, i) => {
        ctx.beginPath();
        ctx.arc(winX + 34 + i * 24, winY + 30, 7, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      });

      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillStyle = cAccent;
      ctx.textAlign = 'left';
      ctx.fillText(`~/studio/${domain} — ${kicker}`, winX + 120, winY + 36);

      const titleSize = H < 550 ? 44 : 56;
      ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = cText;
      const nextY = drawWrappedText(
        title,
        winX + 44,
        winY + 125,
        winW - 88,
        titleSize * 1.18,
        'left',
        3
      );

      ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isLightBg ? 'rgba(17,19,21,0.72)' : 'rgba(255,255,255,0.74)';
      drawWrappedText(subtitle, winX + 44, nextY + 14, winW - 88, 34, 'left', 2);

      // Footer bar inside terminal
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.fillStyle = cText;
      ctx.fillText(`${author}  //  ${handle}`, winX + 44, winY + winH - 36);
    } else if (template === 'spotlight') {
      const centerX = W / 2;

      // Kicker pill
      ctx.font = '700 18px "JetBrains Mono", monospace';
      const kickerWidth = ctx.measureText(kicker).width + 44;
      roundRect(centerX - kickerWidth / 2, padY + 10, kickerWidth, 40, 20);
      ctx.fillStyle = `${cAccent}24`;
      ctx.fill();
      ctx.strokeStyle = cAccent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = cAccent;
      ctx.textAlign = 'center';
      ctx.fillText(kicker, centerX, padY + 36);

      const titleSize = H < 550 ? 48 : 62;
      ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = cText;
      const afterTitleY = drawWrappedText(
        title,
        centerX,
        padY + 125,
        W - padX * 2.4,
        titleSize * 1.16,
        'center',
        3
      );

      ctx.font = '500 25px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isLightBg ? 'rgba(17,19,21,0.72)' : 'rgba(255,255,255,0.75)';
      drawWrappedText(subtitle, centerX, afterTitleY + 16, W - padX * 3, 36, 'center', 2);

      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.fillStyle = cText;
      ctx.textAlign = 'center';
      ctx.fillText(`${author}  •  ${domain}`, centerX, H - padY);
    } else {
      // 'editorial' or 'metric'
      const contentWidth = template === 'metric' ? W * 0.56 : W - padX * 2;

      // Kicker badge
      ctx.font = '700 18px "JetBrains Mono", monospace';
      const kw = ctx.measureText(kicker).width + 36;
      roundRect(padX, padY, kw, 38, 19);
      ctx.fillStyle = cAccent;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(kicker, padX + 18, padY + 25);

      const titleSize = H < 550 ? 46 : 60;
      ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = cText;
      const afterTitleY = drawWrappedText(
        title,
        padX,
        padY + 115,
        contentWidth,
        titleSize * 1.15,
        'left',
        3
      );

      ctx.font = '500 25px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isLightBg ? 'rgba(17,19,21,0.72)' : 'rgba(255,255,255,0.76)';
      drawWrappedText(subtitle, padX, afterTitleY + 14, contentWidth, 35, 'left', 2);

      // Author & Domain Footer
      ctx.beginPath();
      ctx.arc(padX + 22, H - padY - 12, 22, 0, Math.PI * 2);
      ctx.fillStyle = cAccent;
      ctx.fill();
      ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(author.slice(0, 2).toUpperCase(), padX + 22, H - padY - 6);

      ctx.textAlign = 'left';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = cText;
      ctx.fillText(author, padX + 58, H - padY - 16);

      ctx.font = '500 17px "JetBrains Mono", monospace';
      ctx.fillStyle = isLightBg ? 'rgba(17,19,21,0.65)' : 'rgba(255,255,255,0.65)';
      ctx.fillText(handle, padX + 58, H - padY + 8);

      ctx.textAlign = 'right';
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.fillStyle = cAccent;
      ctx.fillText(domain, W - padX, H - padY - 4);

      if (template === 'metric') {
        const boxW = W * 0.26;
        const boxH = H * 0.46;
        const boxX = W - padX - boxW;
        const boxY = (H - boxH) / 2 - 10;

        roundRect(boxX, boxY, boxW, boxH, 24);
        ctx.fillStyle = isLightBg ? 'rgba(17,19,21,0.06)' : 'rgba(255,255,255,0.07)';
        ctx.fill();
        ctx.strokeStyle = cAccent;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '800 64px "JetBrains Mono", monospace';
        ctx.fillStyle = cAccent;
        ctx.fillText(metricValue, boxX + boxW / 2, boxY + boxH * 0.52);

        ctx.font = '700 16px "JetBrains Mono", monospace';
        ctx.fillStyle = cText;
        ctx.fillText(metricLabel, boxX + boxW / 2, boxY + boxH * 0.72);
      }
    }
  }, [
    activeFormat,
    template,
    kicker,
    title,
    subtitle,
    author,
    handle,
    domain,
    metricValue,
    metricLabel,
    bgStart,
    bgEnd,
    accentColor,
    textColor,
    showGrid,
  ]);

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `social-${formatId}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const metaTagsSnippet = useMemo(
    () => `<!-- Open Graph / Social Meta Tags -->
<meta property="og:type" content="website" />
<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
<meta property="og:description" content="${subtitle.replace(/"/g, '&quot;')}" />
<meta property="og:image" content="https://${domain}/og-cover.png" />
<meta property="og:image:width" content="${activeFormat.width}" />
<meta property="og:image:height" content="${activeFormat.height}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
<meta name="twitter:description" content="${subtitle.replace(/"/g, '&quot;')}" />
<meta name="twitter:image" content="https://${domain}/og-cover.png" />`,
    [title, subtitle, domain, activeFormat]
  );

  const handleCopyMeta = async () => {
    try {
      await navigator.clipboard.writeText(metaTagsSnippet);
      setCopiedMeta(true);
      setTimeout(() => setCopiedMeta(false), 1800);
    } catch {
      setCopiedMeta(false);
    }
  };

  return (
    <div className="social-studio-shell">
      <header className="social-studio-topbar">
        <div className="social-studio-topbar-inner">
          <div className="social-studio-brand">
            <a
              href="/"
              className="social-studio-back"
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
              <span className="social-studio-kicker">TOOL // OPEN GRAPH &amp; SHARE CARD STUDIO</span>
              <h1 className="social-studio-title">Social Media Image Composer</h1>
            </div>
          </div>

          <div className="social-format-pills" role="group" aria-label="Canvas aspect ratios">
            {FORMAT_PRESETS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                className={`social-format-pill ${formatId === fmt.id ? 'is-active' : ''}`}
                onClick={() => setFormatId(fmt.id)}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="social-studio-workspace">
        <aside className="social-studio-sidebar">
          <section className="social-card">
            <div className="social-card-head">
              <h2 className="social-card-title">1. Layout Template</h2>
              <span className="social-card-badge">{template.toUpperCase()}</span>
            </div>

            <div className="social-template-grid">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`social-template-btn ${template === tpl.id ? 'is-active' : ''}`}
                  onClick={() => setTemplate(tpl.id)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </section>

          <section className="social-card">
            <div className="social-card-head">
              <h2 className="social-card-title">2. Editorial Copy &amp; Branding</h2>
              <span className="social-card-badge">LIVE CANVAS</span>
            </div>

            <div className="social-field-group">
              <label className="social-field">
                <span className="social-label">Kicker Badge</span>
                <input
                  type="text"
                  className="social-input"
                  value={kicker}
                  onChange={(e) => setKicker(e.target.value)}
                />
              </label>

              <label className="social-field">
                <span className="social-label">Headline</span>
                <textarea
                  className="social-textarea"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label className="social-field">
                <span className="social-label">Subtitle / Summary</span>
                <textarea
                  className="social-textarea"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                />
              </label>

              <div className="social-row-2">
                <label className="social-field">
                  <span className="social-label">Author Name</span>
                  <input
                    type="text"
                    className="social-input"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </label>
                <label className="social-field">
                  <span className="social-label">Domain Watermark</span>
                  <input
                    type="text"
                    className="social-input"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </label>
              </div>

              <label className="social-field">
                <span className="social-label">Author Handle / Role</span>
                <input
                  type="text"
                  className="social-input"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </label>

              {template === 'metric' && (
                <div className="social-row-2">
                  <label className="social-field">
                    <span className="social-label">Metric Callout</span>
                    <input
                      type="text"
                      className="social-input"
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                    />
                  </label>
                  <label className="social-field">
                    <span className="social-label">Metric Caption</span>
                    <input
                      type="text"
                      className="social-input"
                      value={metricLabel}
                      onChange={(e) => setMetricLabel(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          <section className="social-card">
            <div className="social-card-head">
              <h2 className="social-card-title">3. Custom Colors &amp; Surface</h2>
              <button
                type="button"
                className="social-theme-chip"
                onClick={() => setShowGrid((v) => !v)}
              >
                Grid: {showGrid ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="social-theme-chips">
              {THEME_PALETTES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  className="social-theme-chip"
                  onClick={() => applyTheme(th)}
                >
                  <span
                    className="social-theme-swatch"
                    style={{ background: th.accent }}
                  />
                  {th.name}
                </button>
              ))}
            </div>

            <div className="social-field-group">
              {[
                { label: 'Gradient Start', val: bgStart, set: setBgStart, fb: '#0f1115' },
                { label: 'Gradient End', val: bgEnd, set: setBgEnd, fb: '#1e2430' },
                { label: 'Signal Accent', val: accentColor, set: setAccentColor, fb: '#ff4f18' },
                { label: 'Primary Ink', val: textColor, set: setTextColor, fb: '#ffffff' },
              ].map((item) => (
                <div key={item.label} className="social-color-row">
                  <span className="social-color-label">{item.label}</span>
                  <div className="social-color-controls">
                    <input
                      type="color"
                      className="social-native-color"
                      value={safeColor(item.val, item.fb)}
                      onChange={(e) => item.set(e.target.value)}
                      aria-label={`${item.label} color picker`}
                    />
                    <input
                      type="text"
                      className="social-hex-input"
                      value={item.val}
                      onChange={(e) => handleHexChange(item.set)(e.target.value)}
                      maxLength={7}
                      aria-label={`${item.label} hex input`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="social-studio-main">
          <div className="social-stage-card">
            <div className="social-stage-toolbar">
              <div className="social-stage-meta">
                <span>
                  EXPORT RESOLUTION // {activeFormat.width} × {activeFormat.height} PX
                </span>
                <span>•</span>
                <span>HIGH-DPI CANVAS</span>
              </div>

              <button
                type="button"
                className="social-download-btn"
                onClick={handleDownloadPng}
              >
                ↓ Download PNG ({activeFormat.width}×{activeFormat.height})
              </button>
            </div>

            <div className="social-canvas-stage">
              <div className="social-canvas-frame">
                <canvas ref={canvasRef} className="social-canvas-el" />
              </div>
            </div>
          </div>

          <div className="social-card">
            <div className="social-card-head">
              <h2 className="social-card-title">HTML Open Graph &amp; Twitter Meta Tags</h2>
              <button
                type="button"
                className="social-format-pill is-active"
                onClick={handleCopyMeta}
              >
                {copiedMeta ? '✓ Copied Meta Tags' : 'Copy HTML Meta Tags'}
              </button>
            </div>
            <pre className="social-code-pre">
              <code>{metaTagsSnippet}</code>
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

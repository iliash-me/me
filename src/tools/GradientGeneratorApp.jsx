import React, { useState, useMemo } from 'react';
import './GradientGeneratorApp.css';

const CURATED_PRESETS = [
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    mode: 'mesh',
    angle: 135,
    baseColor: '#0f172a',
    stops: [
      { color: '#ff4f18', x: 18, y: 22, spread: 62 },
      { color: '#f59e0b', x: 82, y: 28, spread: 55 },
      { color: '#ec4899', x: 26, y: 80, spread: 60 },
      { color: '#6366f1', x: 78, y: 76, spread: 64 },
    ],
  },
  {
    id: 'nordic-aurora',
    name: 'Nordic Aurora',
    mode: 'mesh',
    angle: 120,
    baseColor: '#091526',
    stops: [
      { color: '#10b981', x: 20, y: 25, spread: 60 },
      { color: '#06b6d4', x: 78, y: 22, spread: 58 },
      { color: '#3b82f6', x: 30, y: 78, spread: 62 },
      { color: '#8b5cf6', x: 82, y: 75, spread: 56 },
    ],
  },
  {
    id: 'daylight-silk',
    name: 'Daylight Silk',
    mode: 'mesh',
    angle: 145,
    baseColor: '#f8fafc',
    stops: [
      { color: '#fde68a', x: 16, y: 20, spread: 62 },
      { color: '#fbcfe8', x: 84, y: 24, spread: 58 },
      { color: '#bfdbfe', x: 25, y: 82, spread: 64 },
      { color: '#ddd6fe', x: 80, y: 78, spread: 58 },
    ],
  },
  {
    id: 'infrared-beam',
    name: 'Infrared Prism',
    mode: 'linear',
    angle: 135,
    baseColor: '#111315',
    stops: [
      { color: '#ff4f18', x: 0, y: 0, spread: 0 },
      { color: '#e11d48', x: 35, y: 35, spread: 35 },
      { color: '#7c3aed', x: 70, y: 70, spread: 70 },
      { color: '#0ea5e9', x: 100, y: 100, spread: 100 },
    ],
  },
  {
    id: 'cyber-conic',
    name: 'Conic Vortex',
    mode: 'conic',
    angle: 45,
    baseColor: '#090d16',
    stops: [
      { color: '#06b6d4', x: 50, y: 50, spread: 25 },
      { color: '#8b5cf6', x: 50, y: 50, spread: 50 },
      { color: '#ff4f18', x: 50, y: 50, spread: 75 },
      { color: '#06b6d4', x: 50, y: 50, spread: 100 },
    ],
  },
];

const PATTERNS = [
  { id: 'none', label: 'None' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'diagonal', label: 'Hatch' },
];

export default function GradientGeneratorApp({ onNavigateHome }) {
  const [presetId, setPresetId] = useState('solar-flare');
  const [mode, setMode] = useState('mesh'); // 'mesh' | 'linear' | 'radial' | 'conic'
  const [angle, setAngle] = useState(135);
  const [baseColor, setBaseColor] = useState('#0f172a');
  const [stops, setStops] = useState(CURATED_PRESETS[0].stops);
  const [pattern, setPattern] = useState('grid');
  const [patternOpacity, setPatternOpacity] = useState(0.14);
  const [patternScale, setPatternScale] = useState(28);
  const [showOverlayCard, setShowOverlayCard] = useState(true);
  const [darkInkCard, setDarkInkCard] = useState(false);
  const [exportFormat, setExportFormat] = useState('css');
  const [copied, setCopied] = useState(false);

  const applyPreset = (preset) => {
    setPresetId(preset.id);
    setMode(preset.mode);
    setAngle(preset.angle);
    setBaseColor(preset.baseColor);
    setStops(preset.stops.map((s) => ({ ...s })));
    setDarkInkCard(preset.id === 'daylight-silk');
  };

  const updateStop = (index, field, value) => {
    setStops((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleStopHexInput = (index, raw) => {
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(cleaned)) {
      updateStop(index, 'color', cleaned);
    }
  };

  const handleBaseHexInput = (raw) => {
    const cleaned = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(cleaned)) {
      setBaseColor(cleaned);
    }
  };

  const safeColor = (val, fallback = '#ff4f18') =>
    /^#[0-9A-Fa-f]{6}$/.test(val) ? val : fallback;

  const randomizeStops = () => {
    const randomHex = () =>
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0');
    setPresetId('custom');
    setStops((prev) =>
      prev.map((s) => ({
        ...s,
        color: randomHex(),
        x: Math.floor(15 + Math.random() * 70),
        y: Math.floor(15 + Math.random() * 70),
      }))
    );
  };

  const gradientCssValue = useMemo(() => {
    const s0 = safeColor(stops[0]?.color, '#ff4f18');
    const s1 = safeColor(stops[1]?.color, '#f59e0b');
    const s2 = safeColor(stops[2]?.color, '#ec4899');
    const s3 = safeColor(stops[3]?.color, '#6366f1');

    if (mode === 'mesh') {
      return [
        `radial-gradient(at ${stops[0].x}% ${stops[0].y}%, ${s0} 0px, transparent ${stops[0].spread}%)`,
        `radial-gradient(at ${stops[1].x}% ${stops[1].y}%, ${s1} 0px, transparent ${stops[1].spread}%)`,
        `radial-gradient(at ${stops[2].x}% ${stops[2].y}%, ${s2} 0px, transparent ${stops[2].spread}%)`,
        `radial-gradient(at ${stops[3].x}% ${stops[3].y}%, ${s3} 0px, transparent ${stops[3].spread}%)`,
      ].join(',\n    ');
    }

    if (mode === 'linear') {
      return `linear-gradient(${angle}deg, ${s0} 0%, ${s1} 33%, ${s2} 66%, ${s3} 100%)`;
    }

    if (mode === 'radial') {
      return `radial-gradient(circle at ${stops[0].x}% ${stops[0].y}%, ${s0} 0%, ${s1} 35%, ${s2} 70%, ${s3} 100%)`;
    }

    return `conic-gradient(from ${angle}deg at ${stops[0].x}% ${stops[0].y}%, ${s0} 0deg, ${s1} 120deg, ${s2} 240deg, ${s3} 360deg)`;
  }, [mode, angle, stops]);

  const patternStyle = useMemo(() => {
    const strokeRgba = darkInkCard
      ? `rgba(17, 19, 21, ${patternOpacity})`
      : `rgba(255, 255, 255, ${patternOpacity})`;

    if (pattern === 'dots') {
      return {
        backgroundImage: `radial-gradient(${strokeRgba} 1.25px, transparent 1.25px)`,
        backgroundSize: `${patternScale}px ${patternScale}px`,
      };
    }
    if (pattern === 'grid') {
      return {
        backgroundImage: `linear-gradient(to right, ${strokeRgba} 1px, transparent 1px), linear-gradient(to bottom, ${strokeRgba} 1px, transparent 1px)`,
        backgroundSize: `${patternScale}px ${patternScale}px`,
      };
    }
    if (pattern === 'diagonal') {
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${strokeRgba} 0, ${strokeRgba} 1px, transparent 0, transparent 50%)`,
        backgroundSize: `${patternScale}px ${patternScale}px`,
      };
    }
    return {};
  }, [pattern, patternOpacity, patternScale, darkInkCard]);

  const svgWallpaperCode = useMemo(() => {
    const s0 = safeColor(stops[0]?.color, '#ff4f18');
    const s1 = safeColor(stops[1]?.color, '#f59e0b');
    const s2 = safeColor(stops[2]?.color, '#ec4899');
    const s3 = safeColor(stops[3]?.color, '#6366f1');
    const base = safeColor(baseColor, '#0f172a');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="100%" height="100%">
  <defs>
    <filter id="mesh-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="120" />
    </filter>
  </defs>
  <rect width="1600" height="900" fill="${base}" />
  <g filter="url(#mesh-blur)">
    <circle cx="${Math.round((stops[0].x / 100) * 1600)}" cy="${Math.round((stops[0].y / 100) * 900)}" r="${stops[0].spread * 6}" fill="${s0}" />
    <circle cx="${Math.round((stops[1].x / 100) * 1600)}" cy="${Math.round((stops[1].y / 100) * 900)}" r="${stops[1].spread * 6}" fill="${s1}" />
    <circle cx="${Math.round((stops[2].x / 100) * 1600)}" cy="${Math.round((stops[2].y / 100) * 900)}" r="${stops[2].spread * 6}" fill="${s2}" />
    <circle cx="${Math.round((stops[3].x / 100) * 1600)}" cy="${Math.round((stops[3].y / 100) * 900)}" r="${stops[3].spread * 6}" fill="${s3}" />
  </g>
</svg>`;
  }, [stops, baseColor]);

  const codeOutput = useMemo(() => {
    const base = safeColor(baseColor, '#0f172a');
    if (exportFormat === 'svg') {
      return svgWallpaperCode;
    }

    if (exportFormat === 'tailwind') {
      return `<!-- Tailwind Arbitrary Background Layer -->
<div
  class="relative overflow-hidden"
  style="background-color: ${base}; background-image: ${gradientCssValue.replace(/\n\s+/g, ' ')};"
>
  <!-- Content goes here -->
</div>`;
    }

    let css = `.surface-backdrop {
  background-color: ${base};
  background-image:
    ${gradientCssValue};
}`;

    if (pattern !== 'none') {
      css += `\n\n.surface-pattern-overlay {
  background-image: ${patternStyle.backgroundImage};
  background-size: ${patternStyle.backgroundSize};
}`;
    }
    return css;
  }, [exportFormat, baseColor, gradientCssValue, pattern, patternStyle, svgWallpaperCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgWallpaperCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gradient-mesh-${presetId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grad-studio-shell">
      <header className="grad-studio-topbar">
        <div className="grad-studio-topbar-inner">
          <div className="grad-studio-brand">
            <a
              href="/"
              className="grad-studio-back"
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
            <div className="grad-studio-title-group">
              <span className="grad-studio-kicker">TOOL // ATMOSPHERIC SURFACE LAB</span>
              <h1 className="grad-studio-title">Gradient &amp; Background Generator</h1>
            </div>
          </div>

          <div className="grad-studio-presets" role="group" aria-label="Gradient presets">
            {CURATED_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`grad-preset-pill ${presetId === preset.id ? 'is-active' : ''}`}
                onClick={() => applyPreset(preset)}
              >
                <span className="grad-preset-dots">
                  {preset.stops.map((st, idx) => (
                    <span
                      key={idx}
                      className="grad-preset-dot"
                      style={{ backgroundColor: st.color }}
                    />
                  ))}
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="grad-studio-workspace">
        <aside className="grad-studio-sidebar">
          <section className="grad-card">
            <div className="grad-card-head">
              <h2 className="grad-card-title">1. Gradient Architecture</h2>
              <button type="button" className="grad-action-btn" onClick={randomizeStops}>
                Shuffle Colors
              </button>
            </div>

            <div className="grad-mode-grid" role="tablist">
              {['mesh', 'linear', 'radial', 'conic'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`grad-mode-btn ${mode === m ? 'is-active' : ''}`}
                  onClick={() => setMode(m)}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <div className="grad-control-group">
              <div className="grad-control-row">
                <div className="grad-control-label-row">
                  <span>Base Canvas Color</span>
                  <div className="grad-stop-color-pick">
                    <input
                      type="color"
                      className="grad-native-color"
                      value={safeColor(baseColor, '#0f172a')}
                      onChange={(e) => setBaseColor(e.target.value)}
                      aria-label="Base canvas color picker"
                    />
                    <input
                      type="text"
                      className="grad-hex-input"
                      value={baseColor}
                      onChange={(e) => handleBaseHexInput(e.target.value)}
                      maxLength={7}
                      aria-label="Base canvas hex color"
                    />
                  </div>
                </div>
              </div>

              {(mode === 'linear' || mode === 'conic') && (
                <div className="grad-control-row">
                  <div className="grad-control-label-row">
                    <span>Gradient Angle</span>
                    <span className="grad-control-value">{angle}°</span>
                  </div>
                  <input
                    type="range"
                    className="grad-slider"
                    min="0"
                    max="360"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="grad-card">
            <div className="grad-card-head">
              <h2 className="grad-card-title">2. Custom Color Stops</h2>
              <span className="grad-card-badge">4 Nodes</span>
            </div>

            <div className="grad-stops-list">
              {stops.map((stop, idx) => (
                <div key={idx} className="grad-stop-item">
                  <div className="grad-stop-top">
                    <div className="grad-stop-color-pick">
                      <input
                        type="color"
                        className="grad-native-color"
                        value={safeColor(stop.color)}
                        onChange={(e) => updateStop(idx, 'color', e.target.value)}
                        aria-label={`Stop ${idx + 1} color picker`}
                      />
                      <input
                        type="text"
                        className="grad-hex-input"
                        value={stop.color}
                        onChange={(e) => handleStopHexInput(idx, e.target.value)}
                        maxLength={7}
                        aria-label={`Stop ${idx + 1} hex code`}
                      />
                    </div>
                    <span className="grad-stop-tag">
                      NODE 0{idx + 1} ({stop.x}%, {stop.y}%)
                    </span>
                  </div>

                  {mode === 'mesh' && (
                    <div className="grad-stop-xy">
                      <label className="grad-mini-slider-wrap">
                        <span>X</span>
                        <input
                          type="range"
                          className="grad-slider"
                          min="0"
                          max="100"
                          value={stop.x}
                          onChange={(e) => updateStop(idx, 'x', Number(e.target.value))}
                        />
                      </label>
                      <label className="grad-mini-slider-wrap">
                        <span>Y</span>
                        <input
                          type="range"
                          className="grad-slider"
                          min="0"
                          max="100"
                          value={stop.y}
                          onChange={(e) => updateStop(idx, 'y', Number(e.target.value))}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="grad-card">
            <div className="grad-card-head">
              <h2 className="grad-card-title">3. Architectural Pattern Overlay</h2>
              <span className="grad-card-badge">{pattern.toUpperCase()}</span>
            </div>

            <div className="grad-mode-grid">
              {PATTERNS.map((pat) => (
                <button
                  key={pat.id}
                  type="button"
                  className={`grad-mode-btn ${pattern === pat.id ? 'is-active' : ''}`}
                  onClick={() => setPattern(pat.id)}
                >
                  {pat.label}
                </button>
              ))}
            </div>

            {pattern !== 'none' && (
              <div className="grad-control-group">
                <div className="grad-control-row">
                  <div className="grad-control-label-row">
                    <span>Pattern Opacity</span>
                    <span className="grad-control-value">{Math.round(patternOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    className="grad-slider"
                    min="0.03"
                    max="0.45"
                    step="0.01"
                    value={patternOpacity}
                    onChange={(e) => setPatternOpacity(Number(e.target.value))}
                  />
                </div>

                <div className="grad-control-row">
                  <div className="grad-control-label-row">
                    <span>Grid Cell Spacing</span>
                    <span className="grad-control-value">{patternScale}px</span>
                  </div>
                  <input
                    type="range"
                    className="grad-slider"
                    min="14"
                    max="64"
                    step="2"
                    value={patternScale}
                    onChange={(e) => setPatternScale(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </section>
        </aside>

        <section className="grad-studio-main">
          <div className="grad-stage-card">
            <div className="grad-stage-toolbar">
              <div className="grad-stage-meta">
                <span>SURFACE // {mode.toUpperCase()}</span>
                <span>•</span>
                <span>BASE {baseColor.toUpperCase()}</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="grad-action-btn"
                  onClick={() => setShowOverlayCard((v) => !v)}
                >
                  {showOverlayCard ? 'Hide Specimen Card' : 'Show Specimen Card'}
                </button>
                <button
                  type="button"
                  className="grad-action-btn"
                  onClick={() => setDarkInkCard((v) => !v)}
                >
                  {darkInkCard ? 'Light Ink Mode' : 'Dark Ink Mode'}
                </button>
                <button type="button" className="grad-action-btn" onClick={handleDownloadSvg}>
                  Download SVG Wallpaper
                </button>
              </div>
            </div>

            <div
              className="grad-stage-viewport"
              style={{
                backgroundColor: safeColor(baseColor, '#0f172a'),
                backgroundImage: gradientCssValue,
              }}
            >
              {pattern !== 'none' && (
                <div className="grad-pattern-layer" style={patternStyle} />
              )}

              {showOverlayCard && (
                <div className={`grad-hero-preview-card ${darkInkCard ? 'is-dark-ink' : ''}`}>
                  <div className="grad-hero-kicker">ATMOSPHERIC SPECIMEN // {mode.toUpperCase()}</div>
                  <h3 className="grad-hero-heading">
                    Precision multi-stop meshes &amp; procedural grid backdrops.
                  </h3>
                  <p className="grad-hero-desc">
                    Crafted for hero sections, feature cards, and modern landing pages with zero
                    raster artifacts.
                  </p>
                  <div className="grad-hero-swatches">
                    {stops.map((st, i) => (
                      <span key={i} className="grad-hero-chip">
                        <span
                          className="grad-hero-chip-dot"
                          style={{ backgroundColor: safeColor(st.color) }}
                        />
                        {st.color.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grad-card">
            <div className="grad-code-header">
              <div className="grad-export-tabs">
                {[
                  { id: 'css', label: 'CSS Background' },
                  { id: 'tailwind', label: 'Tailwind / HTML' },
                  { id: 'svg', label: 'SVG Mesh Wallpaper' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`grad-export-tab ${exportFormat === tab.id ? 'is-active' : ''}`}
                    onClick={() => setExportFormat(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button type="button" className="grad-copy-btn" onClick={handleCopy}>
                {copied ? '✓ Copied to Clipboard' : 'Copy Code'}
              </button>
            </div>

            <pre className="grad-code-pre">
              <code>{codeOutput}</code>
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

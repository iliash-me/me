import { useMemo, useState } from "react";
import "./ShadowLabApp.css";

const PRESETS = [
  {
    id: "soft-elevated",
    name: "Soft Elevation",
    layers: 5,
    angle: 135,
    distance: 28,
    blur: 56,
    spread: -6,
    alpha: 0.08,
    glass: false,
    surfaceAlpha: 1,
    backdropBlur: 0,
    borderAlpha: 0.08,
    backdrop: "daylight"
  },
  {
    id: "ambient-float",
    name: "Ambient Float",
    layers: 6,
    angle: 120,
    distance: 44,
    blur: 84,
    spread: -10,
    alpha: 0.14,
    glass: false,
    surfaceAlpha: 1,
    backdropBlur: 0,
    borderAlpha: 0.07,
    backdrop: "daylight"
  },
  {
    id: "frosted-glass",
    name: "Frosted Glass",
    layers: 4,
    angle: 135,
    distance: 24,
    blur: 48,
    spread: -4,
    alpha: 0.16,
    glass: true,
    surfaceAlpha: 0.62,
    backdropBlur: 18,
    borderAlpha: 0.38,
    backdrop: "mesh"
  },
  {
    id: "obsidian-glass",
    name: "Obsidian Glass",
    layers: 5,
    angle: 145,
    distance: 32,
    blur: 64,
    spread: -4,
    alpha: 0.35,
    glass: true,
    surfaceAlpha: 0.22,
    backdropBlur: 22,
    borderAlpha: 0.24,
    backdrop: "dark"
  },
  {
    id: "crisp-tactile",
    name: "Crisp Tactile",
    layers: 3,
    angle: 90,
    distance: 8,
    blur: 16,
    spread: 0,
    alpha: 0.12,
    glass: false,
    surfaceAlpha: 1,
    backdropBlur: 0,
    borderAlpha: 0.14,
    backdrop: "daylight"
  }
];

export default function ShadowLabApp({ onNavigateHome }) {
  const [activePreset, setActivePreset] = useState("soft-elevated");
  const [layersCount, setLayersCount] = useState(5);
  const [angle, setAngle] = useState(135);
  const [distance, setDistance] = useState(28);
  const [blur, setBlur] = useState(56);
  const [spread, setSpread] = useState(-6);
  const [alpha, setAlpha] = useState(0.08);
  const [radius, setRadius] = useState(22);

  const [glassEnabled, setGlassEnabled] = useState(false);
  const [surfaceAlpha, setSurfaceAlpha] = useState(1);
  const [backdropBlur, setBackdropBlur] = useState(16);
  const [borderAlpha, setBorderAlpha] = useState(0.08);
  const [backdrop, setBackdrop] = useState("daylight"); // daylight | mesh | dark

  const [exportFormat, setExportFormat] = useState("css"); // css | tailwind
  const [copied, setCopied] = useState(false);

  const applyPreset = (p) => {
    setActivePreset(p.id);
    setLayersCount(p.layers);
    setAngle(p.angle);
    setDistance(p.distance);
    setBlur(p.blur);
    setSpread(p.spread);
    setAlpha(p.alpha);
    setGlassEnabled(p.glass);
    setSurfaceAlpha(p.surfaceAlpha);
    setBackdropBlur(p.backdropBlur);
    setBorderAlpha(p.borderAlpha);
    setBackdrop(p.backdrop);
  };

  const computedLayers = useMemo(() => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const list = [];
    for (let i = 1; i <= layersCount; i++) {
      const t = i / layersCount;
      // Exponential distribution for natural penumbra falloff
      const curve = Math.pow(t, 2.1);
      const dist = Math.round(distance * curve * 10) / 10;
      const x = Math.round(cos * dist * 10) / 10;
      const y = Math.round(sin * dist * 10) / 10;
      const b = Math.round(blur * Math.pow(t, 1.85) * 10) / 10;
      const s = Math.round(spread * t * 10) / 10;
      const a = +(alpha * (0.35 + 0.65 * t) / Math.sqrt(layersCount / 2)).toFixed(3);
      list.push({
        index: i,
        x,
        y,
        blur: b,
        spread: s,
        alpha: Math.min(0.6, Math.max(0.01, a)),
        css: `${x}px ${y}px ${b}px ${s}px rgba(17, 19, 21, ${Math.min(0.6, Math.max(0.01, a))})`
      });
    }
    return list;
  }, [layersCount, angle, distance, blur, spread, alpha]);

  const boxShadowValue = useMemo(
    () => computedLayers.map((l) => l.css).join(",\n    "),
    [computedLayers]
  );

  const isDarkStage = backdrop === "dark";
  const bgRgba = glassEnabled
    ? isDarkStage
      ? `rgba(24, 26, 32, ${surfaceAlpha})`
      : `rgba(255, 255, 255, ${surfaceAlpha})`
    : isDarkStage
      ? "#1b1e24"
      : "#ffffff";

  const borderRgba = isDarkStage
    ? `rgba(255, 255, 255, ${borderAlpha})`
    : glassEnabled
      ? `rgba(255, 255, 255, ${borderAlpha})`
      : `rgba(0, 0, 0, ${borderAlpha})`;

  const exportCode = useMemo(() => {
    if (exportFormat === "tailwind") {
      const compactShadow = computedLayers
        .map((l) => `${l.x}px_${l.y}px_${l.blur}px_${l.spread}px_rgba(17,19,21,${l.alpha})`)
        .join(",");
      const classes = [
        `rounded-[${radius}px]`,
        `shadow-[${compactShadow}]`
      ];
      if (glassEnabled) {
        classes.push(`backdrop-blur-[${backdropBlur}px]`);
        classes.push(`bg-white/${Math.round(surfaceAlpha * 100)}`);
      }
      return classes.join(" ");
    }

    const lines = [
      `.elevated-surface {`,
      `  background: ${bgRgba};`,
      `  border-radius: ${radius}px;`,
      `  border: 1px solid ${borderRgba};`
    ];
    if (glassEnabled && backdropBlur > 0) {
      lines.push(`  backdrop-filter: blur(${backdropBlur}px);`);
      lines.push(`  -webkit-backdrop-filter: blur(${backdropBlur}px);`);
    }
    lines.push(`  box-shadow:\n    ${boxShadowValue};`);
    lines.push(`}`);
    return lines.join("\n");
  }, [exportFormat, computedLayers, radius, glassEnabled, backdropBlur, surfaceAlpha, bgRgba, borderRgba, boxShadowValue]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="shadow-lab-app">
      <header className="shadow-nav">
        <div className="shadow-nav-left">
          <button
            type="button"
            className="shadow-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="shadow-nav-title">Shadow & Glassmorphism Lab</h1>
        </div>

        <div className="shadow-presets" role="radiogroup" aria-label="Surface Presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={activePreset === p.id}
              className={`shadow-preset-pill ${activePreset === p.id ? "is-active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="shadow-nav-right">
          <div className="shadow-backdrop-pills" role="group" aria-label="Stage Backdrop">
            {[
              { id: "daylight", label: "Daylight" },
              { id: "mesh", label: "Mesh" },
              { id: "dark", label: "Dark" }
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                className={`shadow-backdrop-pill ${backdrop === b.id ? "is-active" : ""}`}
                onClick={() => setBackdrop(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="shadow-main">
        {/* Left Controls */}
        <aside className="shadow-panel" aria-label="Shadow & Glass Controls">
          <div className="shadow-section">
            <div className="shadow-heading">
              <span>Multi-Layer Shadow</span>
              <span>{layersCount} Layers</span>
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Cascading Layers</span>
                <span className="shadow-val">{layersCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={layersCount}
                onChange={(e) => {
                  setActivePreset("custom");
                  setLayersCount(Number(e.target.value));
                }}
                className="shadow-slider"
              />
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Light Angle</span>
                <span className="shadow-val">{angle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={angle}
                onChange={(e) => {
                  setActivePreset("custom");
                  setAngle(Number(e.target.value));
                }}
                className="shadow-slider"
              />
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Max Offset Distance</span>
                <span className="shadow-val">{distance}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="80"
                step="1"
                value={distance}
                onChange={(e) => {
                  setActivePreset("custom");
                  setDistance(Number(e.target.value));
                }}
                className="shadow-slider"
              />
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Max Blur Radius</span>
                <span className="shadow-val">{blur}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="120"
                step="2"
                value={blur}
                onChange={(e) => {
                  setActivePreset("custom");
                  setBlur(Number(e.target.value));
                }}
                className="shadow-slider"
              />
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Spread</span>
                <span className="shadow-val">{spread}px</span>
              </div>
              <input
                type="range"
                min="-24"
                max="24"
                step="1"
                value={spread}
                onChange={(e) => {
                  setActivePreset("custom");
                  setSpread(Number(e.target.value));
                }}
                className="shadow-slider"
              />
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Shadow Intensity</span>
                <span className="shadow-val">{Math.round(alpha * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.45"
                step="0.01"
                value={alpha}
                onChange={(e) => {
                  setActivePreset("custom");
                  setAlpha(Number(e.target.value));
                }}
                className="shadow-slider"
              />
            </div>
          </div>

          <div className="shadow-divider" />

          <div className="shadow-section">
            <div className="shadow-heading">
              <span>Glass & Surface</span>
              <button
                type="button"
                className={`shadow-toggle-btn ${glassEnabled ? "is-on" : ""}`}
                onClick={() => {
                  const next = !glassEnabled;
                  setGlassEnabled(next);
                  if (next && backdrop === "daylight") setBackdrop("mesh");
                  if (next && surfaceAlpha === 1) setSurfaceAlpha(0.65);
                }}
              >
                {glassEnabled ? "Glass ON" : "Solid"}
              </button>
            </div>

            {glassEnabled && (
              <>
                <div className="shadow-control">
                  <div className="shadow-label-row">
                    <span>Backdrop Blur</span>
                    <span className="shadow-val">{backdropBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={backdropBlur}
                    onChange={(e) => setBackdropBlur(Number(e.target.value))}
                    className="shadow-slider"
                  />
                </div>

                <div className="shadow-control">
                  <div className="shadow-label-row">
                    <span>Surface Opacity</span>
                    <span className="shadow-val">{Math.round(surfaceAlpha * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.95"
                    step="0.02"
                    value={surfaceAlpha}
                    onChange={(e) => setSurfaceAlpha(Number(e.target.value))}
                    className="shadow-slider"
                  />
                </div>
              </>
            )}

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Corner Radius</span>
                <span className="shadow-val">{radius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="2"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="shadow-slider"
              />
            </div>

            <div className="shadow-control">
              <div className="shadow-label-row">
                <span>Border Highlight</span>
                <span className="shadow-val">{Math.round(borderAlpha * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.02"
                value={borderAlpha}
                onChange={(e) => setBorderAlpha(Number(e.target.value))}
                className="shadow-slider"
              />
            </div>
          </div>
        </aside>

        {/* Right Stage & Code */}
        <div className="shadow-stage-col">
          <div className={`shadow-preview-stage bg-${backdrop}`}>
            {(glassEnabled || backdrop !== "daylight") && (
              <>
                <div className="shadow-orb shadow-orb-1" />
                <div className="shadow-orb shadow-orb-2" />
              </>
            )}

            <div
              className="shadow-specimen-card"
              style={{
                backgroundColor: bgRgba,
                borderRadius: `${radius}px`,
                border: `1px solid ${borderRgba}`,
                backdropFilter: glassEnabled ? `blur(${backdropBlur}px)` : "none",
                WebkitBackdropFilter: glassEnabled ? `blur(${backdropBlur}px)` : "none",
                boxShadow: computedLayers.map((l) => l.css).join(", "),
                color: isDarkStage ? "#f4f4f6" : "#111315"
              }}
            >
              <span className="shadow-specimen-badge">
                {glassEnabled ? "Translucent Material" : "Layered Elevation"}
              </span>
              <h2 className="shadow-specimen-title">Spatial Depth Studio</h2>
              <p className="shadow-specimen-desc">
                Smooth multi-layered umbra and penumbra shadows create natural depth without muddy single-layer halos.
              </p>
              <div className="shadow-specimen-footer">
                <span>{layersCount} stacked layers</span>
                <span>{angle}° light</span>
              </div>
            </div>
          </div>

          <section className="shadow-layers-card" aria-label="Shadow Layer Breakdown">
            <div className="shadow-heading">
              <span>Computed Penumbra Stack</span>
              <span>Exponential Falloff</span>
            </div>
            <div className="shadow-layers-grid">
              {computedLayers.map((l) => (
                <div key={l.index} className="shadow-layer-chip">
                  <span className="shadow-layer-idx">Layer 0{l.index}</span>
                  <span className="shadow-layer-val">
                    {l.x}px {l.y}px / {l.blur}px
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="shadow-export-card" aria-label="CSS Export">
            <div className="shadow-export-top">
              <div className="shadow-format-pills">
                <button
                  type="button"
                  className={`shadow-format-pill ${exportFormat === "css" ? "is-active" : ""}`}
                  onClick={() => setExportFormat("css")}
                >
                  CSS Rules
                </button>
                <button
                  type="button"
                  className={`shadow-format-pill ${exportFormat === "tailwind" ? "is-active" : ""}`}
                  onClick={() => setExportFormat("tailwind")}
                >
                  Tailwind Arbitrary
                </button>
              </div>

              <button
                type="button"
                className="shadow-copy-btn"
                onClick={handleCopy}
              >
                {copied ? "Copied CSS ✓" : "Copy Code"}
              </button>
            </div>

            <pre className="shadow-code-pre">
              <code>{exportCode}</code>
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}

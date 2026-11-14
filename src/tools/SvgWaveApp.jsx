import { useMemo, useState } from "react";
import "./SvgWaveApp.css";

const COLOR_THEMES = [
  { id: "sunset", name: "Vermilion", start: "#ff4f18", end: "#f59e0b" },
  { id: "ocean", name: "Cobalt", start: "#2563eb", end: "#06b6d4" },
  { id: "forest", name: "Emerald", start: "#059669", end: "#34d399" },
  { id: "violet", name: "Iris", start: "#7c3aed", end: "#ec4899" },
  { id: "monochrome", name: "Graphite", start: "#111315", end: "#71717a" },
  { id: "warm", name: "Sand", start: "#d97706", end: "#fbbf24" }
];

// Deterministic PRNG from integer seed
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth Catmull-Rom to Cubic Bezier SVG path
function buildSmoothWavePath(points, width, height, flipY) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = +(p1.x + (p2.x - p0.x) / 6).toFixed(1);
    const cp1y = +(p1.y + (p2.y - p0.y) / 6).toFixed(1);
    const cp2x = +(p2.x - (p3.x - p1.x) / 6).toFixed(1);
    const cp2y = +(p2.y - (p3.y - p1.y) / 6).toFixed(1);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const closeY = flipY ? 0 : height;
  d += ` L ${width} ${closeY} L 0 ${closeY} Z`;
  return d;
}

function buildClosedBlobPath(points, tension = 1) {
  const n = points.length;
  if (n < 3) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = +(p1.x + ((p2.x - p0.x) / 6) * tension).toFixed(1);
    const cp1y = +(p1.y + ((p2.y - p0.y) / 6) * tension).toFixed(1);
    const cp2x = +(p2.x - ((p3.x - p1.x) / 6) * tension).toFixed(1);
    const cp2y = +(p2.y - ((p3.y - p1.y) / 6) * tension).toFixed(1);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + " Z";
}

export default function SvgWaveApp({ onNavigateHome }) {
  const [shapeMode, setShapeMode] = useState("wave"); // wave | blob
  const [layersCount, setLayersCount] = useState(3);
  const [complexity, setComplexity] = useState(6);
  const [amplitude, setAmplitude] = useState(75);
  const [seed, setSeed] = useState(42);
  const [flipY, setFlipY] = useState(false);
  const [themeId, setThemeId] = useState("sunset");

  const [exportFormat, setExportFormat] = useState("svg"); // svg | jsx | css
  const [copied, setCopied] = useState(false);

  const activeTheme = useMemo(
    () => COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[0],
    [themeId]
  );

  const wavePaths = useMemo(() => {
    const width = 1440;
    const height = 360;
    const rand = mulberry32(seed);
    const list = [];

    for (let l = 0; l < layersCount; l++) {
      const layerProgress = layersCount === 1 ? 1 : l / (layersCount - 1);
      const baseY = flipY
        ? 110 + (1 - layerProgress) * 140
        : 120 + layerProgress * 135;

      const pts = [];
      for (let i = 0; i <= complexity; i++) {
        const x = +((i / complexity) * width).toFixed(1);
        const offset = (rand() - 0.5) * 2 * amplitude;
        const y = +Math.max(24, Math.min(height - 24, baseY + offset)).toFixed(1);
        pts.push({ x, y });
      }

      const d = buildSmoothWavePath(pts, width, height, flipY);
      const opacity = layersCount === 1 ? 1 : +(0.35 + layerProgress * 0.65).toFixed(2);
      list.push({ index: l, d, opacity });
    }
    return list;
  }, [layersCount, complexity, amplitude, seed, flipY]);

  const blobPaths = useMemo(() => {
    const cx = 200;
    const cy = 200;
    const baseRadius = 125;
    const rand = mulberry32(seed);
    const list = [];

    for (let l = 0; l < layersCount; l++) {
      const layerScale = 1 - l * 0.16;
      const pts = [];
      const count = Math.max(4, complexity);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const variance = (rand() - 0.5) * (amplitude * 0.9);
        const r = Math.max(40, (baseRadius + variance) * layerScale);
        pts.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r
        });
      }
      const d = buildClosedBlobPath(pts, 1.05);
      const opacity = layersCount === 1 ? 1 : +(0.35 + (l / (layersCount - 1)) * 0.65).toFixed(2);
      list.push({ index: l, d, opacity });
    }
    return list;
  }, [layersCount, complexity, amplitude, seed]);

  const rawSvgMarkup = useMemo(() => {
    if (shapeMode === "blob") {
      const paths = blobPaths
        .map(
          (p) =>
            `  <path d="${p.d}" fill="url(#shapeGrad)" fill-opacity="${p.opacity}" />`
        )
        .join("\n");
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">\n  <defs>\n    <linearGradient id="shapeGrad" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="${activeTheme.start}" />\n      <stop offset="100%" stop-color="${activeTheme.end}" />\n    </linearGradient>\n  </defs>\n${paths}\n</svg>`;
    }

    const paths = wavePaths
      .map(
        (p) =>
          `  <path d="${p.d}" fill="url(#waveGrad)" fill-opacity="${p.opacity}" />`
      )
      .join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 360" preserveAspectRatio="none" width="100%" height="100%">\n  <defs>\n    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">\n      <stop offset="0%" stop-color="${activeTheme.start}" />\n      <stop offset="100%" stop-color="${activeTheme.end}" />\n    </linearGradient>\n  </defs>\n${paths}\n</svg>`;
  }, [shapeMode, wavePaths, blobPaths, activeTheme]);

  const exportCode = useMemo(() => {
    if (exportFormat === "jsx") {
      const jsxBody = rawSvgMarkup
        .replace(/fill-opacity=/g, "fillOpacity=")
        .replace(/stop-color=/g, "stopColor=");
      return `export function OrganicShape(props) {\n  return (\n    ${jsxBody.replace(/\n/g, "\n    ")}\n  );\n}`;
    }

    if (exportFormat === "css") {
      const encoded = encodeURIComponent(rawSvgMarkup.replace(/\s+/g, " ").trim());
      return `.section-divider {\n  background-image: url("data:image/svg+xml,${encoded}");\n  background-size: cover;\n  background-repeat: no-repeat;\n}`;
    }

    return rawSvgMarkup;
  }, [exportFormat, rawSvgMarkup]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([rawSvgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iliash-${shapeMode}-${seed}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wave-studio-app">
      <header className="wave-nav">
        <div className="wave-nav-left">
          <button
            type="button"
            className="wave-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="wave-nav-title">SVG Wave & Organic Shape Studio</h1>
        </div>

        <div className="wave-mode-pills" role="radiogroup" aria-label="Shape Mode">
          <button
            type="button"
            role="radio"
            aria-checked={shapeMode === "wave"}
            className={`wave-mode-pill ${shapeMode === "wave" ? "is-active" : ""}`}
            onClick={() => setShapeMode("wave")}
          >
            Section Waves
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={shapeMode === "blob"}
            className={`wave-mode-pill ${shapeMode === "blob" ? "is-active" : ""}`}
            onClick={() => setShapeMode("blob")}
          >
            Organic Blobs
          </button>
        </div>

        <div className="wave-nav-right">
          <button
            type="button"
            className="wave-shuffle-btn"
            onClick={() => setSeed((prev) => prev + Math.floor(Math.random() * 900 + 7))}
          >
            ↻ Randomize Seed
          </button>
        </div>
      </header>

      <main className="wave-main">
        {/* Left Controls */}
        <aside className="wave-panel" aria-label="Geometry Parameters">
          <div className="wave-section">
            <div className="wave-heading">
              <span>Curve Geometry</span>
              <span>Seed #{seed}</span>
            </div>

            <div className="wave-control">
              <div className="wave-label-row">
                <span>Stacked Layers</span>
                <span className="wave-val">{layersCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={layersCount}
                onChange={(e) => setLayersCount(Number(e.target.value))}
                className="wave-slider"
              />
            </div>

            <div className="wave-control">
              <div className="wave-label-row">
                <span>Nodes / Complexity</span>
                <span className="wave-val">{complexity}</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="1"
                value={complexity}
                onChange={(e) => setComplexity(Number(e.target.value))}
                className="wave-slider"
              />
            </div>

            <div className="wave-control">
              <div className="wave-label-row">
                <span>Wave Amplitude</span>
                <span className="wave-val">{amplitude}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="130"
                step="5"
                value={amplitude}
                onChange={(e) => setAmplitude(Number(e.target.value))}
                className="wave-slider"
              />
            </div>

            {shapeMode === "wave" && (
              <div className="wave-heading" style={{ marginTop: "0.25rem" }}>
                <span>Orientation</span>
                <button
                  type="button"
                  className={`wave-flip-btn ${flipY ? "is-on" : ""}`}
                  onClick={() => setFlipY((prev) => !prev)}
                >
                  {flipY ? "Top Ceiling ↕" : "Bottom Floor ↕"}
                </button>
              </div>
            )}
          </div>

          <div className="wave-divider" />

          <div className="wave-section">
            <div className="wave-heading">
              <span>Gradient Palette</span>
              <span>{activeTheme.name}</span>
            </div>

            <div className="wave-swatches">
              {COLOR_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`wave-swatch-chip ${themeId === t.id ? "is-active" : ""}`}
                  style={{
                    background: `linear-gradient(135deg, ${t.start}, ${t.end})`
                  }}
                  onClick={() => setThemeId(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Stage & Code */}
        <div className="wave-stage-col">
          <div className="wave-canvas-card">
            {shapeMode === "wave" ? (
              <svg
                className="wave-svg-preview"
                viewBox="0 0 1440 360"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="waveGradPreview" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={activeTheme.start} />
                    <stop offset="100%" stopColor={activeTheme.end} />
                  </linearGradient>
                </defs>
                {wavePaths.map((p) => (
                  <path
                    key={p.index}
                    d={p.d}
                    fill="url(#waveGradPreview)"
                    fillOpacity={p.opacity}
                  />
                ))}
              </svg>
            ) : (
              <svg className="wave-blob-svg" viewBox="0 0 400 400">
                <defs>
                  <linearGradient id="blobGradPreview" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={activeTheme.start} />
                    <stop offset="100%" stopColor={activeTheme.end} />
                  </linearGradient>
                </defs>
                {blobPaths.map((p) => (
                  <path
                    key={p.index}
                    d={p.d}
                    fill="url(#blobGradPreview)"
                    fillOpacity={p.opacity}
                  />
                ))}
              </svg>
            )}
          </div>

          <section className="wave-export-card" aria-label="SVG Export">
            <div className="wave-export-top">
              <div className="wave-format-pills">
                {[
                  { id: "svg", label: "Raw SVG" },
                  { id: "jsx", label: "React JSX" },
                  { id: "css", label: "CSS Data URI" }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    className={`wave-format-pill ${exportFormat === fmt.id ? "is-active" : ""}`}
                    onClick={() => setExportFormat(fmt.id)}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              <div className="wave-export-actions">
                <button
                  type="button"
                  className="wave-download-btn"
                  onClick={handleDownload}
                >
                  ↓ Download .SVG
                </button>
                <button
                  type="button"
                  className="wave-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? "Copied ✓" : "Copy Code"}
                </button>
              </div>
            </div>

            <pre className="wave-code-pre">
              <code>{exportCode}</code>
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}

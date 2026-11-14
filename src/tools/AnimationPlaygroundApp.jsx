import { useMemo, useState } from "react";
import "./AnimationPlaygroundApp.css";

const SCENES = [
  { id: "stroke-draw", name: "SVG Path Draw" },
  { id: "orbit-spinner", name: "Dual Orbit Spinner" },
  { id: "pulse-rings", name: "Radar Pulse Rings" },
  { id: "morph-loader", name: "Kinetic Bars" },
  { id: "float-badge", name: "3D Float Badge" }
];

const EASINGS = [
  { label: "ease-in-out", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
  { label: "spring-overshoot", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { label: "expo-out", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { label: "linear", value: "linear" },
  { label: "ease-in-back", value: "cubic-bezier(0.68, -0.55, 0.27, 1.55)" }
];

export default function AnimationPlaygroundApp({ onNavigateHome }) {
  const [scene, setScene] = useState("stroke-draw");
  const [duration, setDuration] = useState(1.8);
  const [delay, setDelay] = useState(0);
  const [easing, setEasing] = useState("cubic-bezier(0.4, 0, 0.2, 1)");
  const [direction, setDirection] = useState("alternate");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [size, setSize] = useState(140);
  const [primaryColor, setPrimaryColor] = useState("#ff4f18");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [primaryHex, setPrimaryHex] = useState("#FF4F18");
  const [accentHex, setAccentHex] = useState("#2563EB");

  const [paused, setPaused] = useState(false);
  const [darkStage, setDarkStage] = useState(false);
  const [exportFormat, setExportFormat] = useState("css"); // css | svg | jsx
  const [copied, setCopied] = useState(false);

  const normalizeHex = (val) => {
    const clean = val.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(clean)) return "#" + clean.toLowerCase();
    return null;
  };

  const keyframesCss = useMemo(() => {
    if (scene === "stroke-draw") {
      return `@keyframes svgStrokeDraw {\n  0% {\n    stroke-dashoffset: 320;\n    transform: rotate(-8deg) scale(0.94);\n  }\n  100% {\n    stroke-dashoffset: 0;\n    transform: rotate(0deg) scale(1);\n  }\n}`;
    }
    if (scene === "orbit-spinner") {
      return `@keyframes orbitSpin {\n  0% { transform: rotate(0deg); }\n  100% { transform: rotate(360deg); }\n}`;
    }
    if (scene === "pulse-rings") {
      return `@keyframes radarPulse {\n  0% {\n    transform: scale(0.55);\n    opacity: 0.95;\n  }\n  100% {\n    transform: scale(1.35);\n    opacity: 0;\n  }\n}`;
    }
    if (scene === "morph-loader") {
      return `@keyframes barWave {\n  0%, 100% { transform: scaleY(0.35); }\n  50% { transform: scaleY(1); }\n}`;
    }
    return `@keyframes floatCard {\n  0% { transform: translateY(0px) rotate(-2deg); }\n  100% { transform: translateY(-16px) rotate(2deg); }\n}`;
  }, [scene]);

  const animName = useMemo(() => {
    if (scene === "stroke-draw") return "svgStrokeDraw";
    if (scene === "orbit-spinner") return "orbitSpin";
    if (scene === "pulse-rings") return "radarPulse";
    if (scene === "morph-loader") return "barWave";
    return "floatCard";
  }, [scene]);

  const animShorthand = `${animName} ${duration}s ${easing} ${delay}s infinite ${direction}`;

  const exportCode = useMemo(() => {
    if (exportFormat === "svg") {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 120 120" fill="none">\n  <style>\n    ${keyframesCss.replace(/\n/g, "\n    ")}\n    .anim-target {\n      animation: ${animShorthand};\n      transform-origin: center;\n      stroke-dasharray: 320;\n    }\n  </style>\n  <path class="anim-target" d="M60 14 L102 38 L102 82 L60 106 L18 82 L18 38 Z" stroke="${primaryColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />\n</svg>`;
    }

    if (exportFormat === "jsx") {
      return `export function AnimatedGraphic() {\n  return (\n    <div className="anim-wrapper">\n      <style>{\`${keyframesCss}\`}</style>\n      <svg width={${size}} height={${size}} viewBox="0 0 120 120" fill="none">\n        <path\n          d="M60 14 L102 38 L102 82 L60 106 L18 82 L18 38 Z"\n          stroke="${primaryColor}"\n          strokeWidth={${strokeWidth}}\n          strokeLinecap="round"\n          strokeDasharray="320"\n          style={{ animation: "${animShorthand}", transformOrigin: "center" }}\n        />\n      </svg>\n    </div>\n  );\n}`;
    }

    return `${keyframesCss}\n\n.animated-element {\n  animation: ${animShorthand};\n  transform-origin: center;\n  stroke: ${primaryColor};\n  stroke-width: ${strokeWidth}px;\n}`;
  }, [exportFormat, size, keyframesCss, animShorthand, primaryColor, strokeWidth]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="anim-studio-app">
      <style>{keyframesCss}</style>

      <header className="anim-nav">
        <div className="anim-nav-left">
          <button
            type="button"
            className="anim-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="anim-nav-title">SVG & CSS Animation Playground</h1>
        </div>

        <div className="anim-presets" role="radiogroup" aria-label="Animation Scene">
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={scene === s.id}
              className={`anim-preset-pill ${scene === s.id ? "is-active" : ""}`}
              onClick={() => setScene(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="anim-nav-right">
          <button
            type="button"
            className={`anim-play-btn ${paused ? "is-paused" : ""}`}
            onClick={() => setPaused((prev) => !prev)}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </header>

      <main className="anim-main">
        {/* Left Controls */}
        <aside className="anim-panel" aria-label="Animation Parameters">
          <div className="anim-section">
            <div className="anim-heading">
              <span>Timing & Curve</span>
              <span>{duration}s</span>
            </div>

            <div className="anim-control">
              <div className="anim-label-row">
                <span>Duration</span>
                <span className="anim-val">{duration}s</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="5.0"
                step="0.1"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="anim-slider"
              />
            </div>

            <div className="anim-control">
              <div className="anim-label-row">
                <span>Start Delay</span>
                <span className="anim-val">{delay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="anim-slider"
              />
            </div>

            <div className="anim-control">
              <div className="anim-label-row">
                <span>Easing Function</span>
              </div>
              <select
                className="anim-select"
                value={easing}
                onChange={(e) => setEasing(e.target.value)}
              >
                {EASINGS.map((ez) => (
                  <option key={ez.label} value={ez.value}>
                    {ez.label} ({ez.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="anim-control">
              <div className="anim-label-row">
                <span>Direction</span>
              </div>
              <select
                className="anim-select"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="normal">normal</option>
                <option value="alternate">alternate</option>
                <option value="reverse">reverse</option>
                <option value="alternate-reverse">alternate-reverse</option>
              </select>
            </div>
          </div>

          <div className="anim-divider" />

          <div className="anim-section">
            <div className="anim-heading">
              <span>Vector & Colors</span>
              <span>{size}px</span>
            </div>

            <div className="anim-control">
              <div className="anim-label-row">
                <span>Element Scale</span>
                <span className="anim-val">{size}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="220"
                step="4"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="anim-slider"
              />
            </div>

            <div className="anim-control">
              <div className="anim-label-row">
                <span>Stroke Width</span>
                <span className="anim-val">{strokeWidth}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="anim-slider"
              />
            </div>

            <div className="anim-color-grid">
              <div className="anim-color-field">
                <span className="anim-color-field-label">Primary</span>
                <div className="anim-color-wrap">
                  <input
                    type="color"
                    aria-label="Primary color picker"
                    className="anim-color-well"
                    value={primaryColor}
                    onChange={(e) => {
                      setPrimaryColor(e.target.value);
                      setPrimaryHex(e.target.value.toUpperCase());
                    }}
                  />
                  <input
                    type="text"
                    aria-label="Primary HEX code"
                    className="anim-hex-input"
                    value={primaryHex}
                    maxLength={7}
                    onChange={(e) => {
                      setPrimaryHex(e.target.value);
                      const p = normalizeHex(e.target.value);
                      if (p) setPrimaryColor(p);
                    }}
                    onBlur={() => setPrimaryHex(primaryColor.toUpperCase())}
                  />
                </div>
              </div>

              <div className="anim-color-field">
                <span className="anim-color-field-label">Secondary</span>
                <div className="anim-color-wrap">
                  <input
                    type="color"
                    aria-label="Secondary color picker"
                    className="anim-color-well"
                    value={accentColor}
                    onChange={(e) => {
                      setAccentColor(e.target.value);
                      setAccentHex(e.target.value.toUpperCase());
                    }}
                  />
                  <input
                    type="text"
                    aria-label="Secondary HEX code"
                    className="anim-hex-input"
                    value={accentHex}
                    maxLength={7}
                    onChange={(e) => {
                      setAccentHex(e.target.value);
                      const p = normalizeHex(e.target.value);
                      if (p) setAccentColor(p);
                    }}
                    onBlur={() => setAccentHex(accentColor.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Stage & Code */}
        <div className="anim-stage-col">
          <div className={`anim-preview-stage ${darkStage ? "is-dark" : ""}`}>
            <div className="anim-stage-toolbar">
              <span className="anim-stage-badge">
                {animName} · {duration}s
              </span>
              <button
                type="button"
                className="anim-bg-toggle"
                onClick={() => setDarkStage((prev) => !prev)}
              >
                {darkStage ? "☀ Light Stage" : "☾ Dark Stage"}
              </button>
            </div>

            {scene === "stroke-draw" && (
              <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
                <path
                  d="M60 14 L102 38 L102 82 L60 106 L18 82 L18 38 Z"
                  stroke={accentColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity="0.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M60 14 L102 38 L102 82 L60 106 L18 82 L18 38 Z"
                  stroke={primaryColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="320"
                  style={{
                    animation: animShorthand,
                    animationPlayState: paused ? "paused" : "running",
                    transformOrigin: "center"
                  }}
                />
                <circle
                  cx="60"
                  cy="60"
                  r="14"
                  stroke={accentColor}
                  strokeWidth={strokeWidth * 0.8}
                  strokeDasharray="90"
                  style={{
                    animation: animShorthand,
                    animationPlayState: paused ? "paused" : "running",
                    transformOrigin: "center"
                  }}
                />
              </svg>
            )}

            {scene === "orbit-spinner" && (
              <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  stroke={primaryColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray="130 160"
                  style={{
                    animation: animShorthand,
                    animationPlayState: paused ? "paused" : "running",
                    transformOrigin: "center"
                  }}
                />
                <circle
                  cx="60"
                  cy="60"
                  r="26"
                  stroke={accentColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray="75 110"
                  style={{
                    animation: `${animName} ${+(duration * 0.75).toFixed(2)}s ${easing} infinite reverse`,
                    animationPlayState: paused ? "paused" : "running",
                    transformOrigin: "center"
                  }}
                />
              </svg>
            )}

            {scene === "pulse-rings" && (
              <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
                {[0, 0.35, 0.7].map((offset, idx) => (
                  <circle
                    key={idx}
                    cx="60"
                    cy="60"
                    r="34"
                    stroke={idx % 2 === 0 ? primaryColor : accentColor}
                    strokeWidth={strokeWidth}
                    style={{
                      animation: `${animName} ${duration}s ${easing} ${+(delay + offset).toFixed(2)}s infinite ${direction}`,
                      animationPlayState: paused ? "paused" : "running",
                      transformOrigin: "center"
                    }}
                  />
                ))}
                <circle cx="60" cy="60" r="8" fill={primaryColor} />
              </svg>
            )}

            {scene === "morph-loader" && (
              <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
                {[0, 1, 2, 3, 4].map((i) => (
                  <rect
                    key={i}
                    x={22 + i * 17}
                    y="24"
                    width="10"
                    height="72"
                    rx="5"
                    fill={i % 2 === 0 ? primaryColor : accentColor}
                    style={{
                      animation: `${animName} ${duration}s ${easing} ${+(i * 0.12).toFixed(2)}s infinite ${direction}`,
                      animationPlayState: paused ? "paused" : "running",
                      transformOrigin: "center"
                    }}
                  />
                ))}
              </svg>
            )}

            {scene === "float-badge" && (
              <div
                style={{
                  width: `${size * 1.35}px`,
                  padding: "1.1rem 1.25rem",
                  borderRadius: "18px",
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                  color: "#ffffff",
                  boxShadow: "0 20px 38px -12px rgba(0,0,0,0.22)",
                  animation: animShorthand,
                  animationPlayState: paused ? "paused" : "running",
                  textAlign: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.78rem",
                  fontWeight: 700
                }}
              >
                ✦ KEYFRAME STUDIO
              </div>
            )}
          </div>

          <section className="anim-export-card" aria-label="Export Animation Code">
            <div className="anim-export-top">
              <div className="anim-format-pills">
                {[
                  { id: "css", label: "CSS @keyframes" },
                  { id: "svg", label: "Self-Contained SVG" },
                  { id: "jsx", label: "React JSX Component" }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    className={`anim-format-pill ${exportFormat === fmt.id ? "is-active" : ""}`}
                    onClick={() => setExportFormat(fmt.id)}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="anim-copy-btn"
                onClick={handleCopy}
              >
                {copied ? "Copied Code ✓" : "Copy Code"}
              </button>
            </div>

            <pre className="anim-code-pre">
              <code>{exportCode}</code>
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}

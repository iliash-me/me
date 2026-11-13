import { useRef, useState } from "react";
import "./SpringTunerApp.css";

const PRESETS = [
  { id: "spring", name: "Spring", points: [0.34, 1.56, 0.64, 1.0], duration: 420 },
  { id: "sheet", name: "Sheet", points: [0.22, 1.0, 0.36, 1.0], duration: 460 },
  { id: "popover", name: "Popover", points: [0.16, 1.0, 0.3, 1.0], duration: 240 },
  { id: "bounce", name: "Bounce", points: [0.68, -0.4, 0.27, 1.4], duration: 520 }
];

const SCENES = [
  { id: "toast", label: "Toast" },
  { id: "modal", label: "Modal" },
  { id: "dropdown", label: "Menu" },
  { id: "drawer", label: "Sheet" },
  { id: "tabs", label: "Tabs" }
];

export default function SpringTunerApp({ onNavigateHome }) {
  const [activePreset, setActivePreset] = useState("spring");
  const [x1, setX1] = useState(0.34);
  const [y1, setY1] = useState(1.56);
  const [x2, setX2] = useState(0.64);
  const [y2, setY2] = useState(1.0);
  const [duration, setDuration] = useState(420);

  const [activeScene, setActiveScene] = useState("toast");
  const [isEntered, setIsEntered] = useState(true);
  const [tabIdx, setTabIdx] = useState(0);
  const [switchOn, setSwitchOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const svgRef = useRef(null);
  const [draggingHandle, setDraggingHandle] = useState(null);

  const bezierStr = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
  const cssCode = `transition: all ${duration}ms ${bezierStr};`;

  const triggerReplay = () => {
    if (activeScene === "tabs") {
      setTabIdx((prev) => (prev + 1) % 3);
      setSwitchOn((prev) => !prev);
      return;
    }
    setIsEntered(false);
    setTimeout(() => {
      setIsEntered(true);
    }, 180);
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setX1(preset.points[0]);
    setY1(preset.points[1]);
    setX2(preset.points[2]);
    setY2(preset.points[3]);
    setDuration(preset.duration);
    triggerReplay();
  };

  // 240x240 SVG coordinate space
  // X: 0..1 -> 36..204 (span 168)
  // Y: -0.5..1.6 -> 180..60 (span 120 per 1.0 unit)
  const mapX = (val) => 36 + val * 168;
  const mapY = (val) => 180 - val * 120;
  const unmapX = (px) => Math.min(1, Math.max(0, (px - 36) / 168));
  const unmapY = (py) => Math.min(1.75, Math.max(-0.55, (180 - py) / 120));

  const handlePointerMove = (e) => {
    if (!draggingHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 240;
    const py = ((e.clientY - rect.top) / rect.height) * 240;

    const nx = Number(unmapX(px).toFixed(2));
    const ny = Number(unmapY(py).toFixed(2));

    setActivePreset("custom");
    if (draggingHandle === "p1") {
      setX1(nx);
      setY1(ny);
    } else if (draggingHandle === "p2") {
      setX2(nx);
      setY2(ny);
    }
  };

  const handlePointerUp = () => {
    if (draggingHandle) {
      setDraggingHandle(null);
      triggerReplay();
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const startX = mapX(0);
  const startY = mapY(0);
  const endX = mapX(1);
  const endY = mapY(1);
  const cp1X = mapX(x1);
  const cp1Y = mapY(y1);
  const cp2X = mapX(x2);
  const cp2Y = mapY(y2);

  return (
    <div
      className="tuner-minimal-app"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Minimal Header */}
      <header className="tuner-nav">
        <button
          type="button"
          id="tuner-back-btn"
          className="tuner-back-link"
          onClick={onNavigateHome}
        >
          ← iliash.me
        </button>

        <span className="tuner-nav-title">Spring & Easing</span>

        <div className="tuner-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              id={`preset-btn-${p.id}`}
              className={`tuner-preset-pill ${activePreset === p.id ? "is-active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Centered Studio */}
      <main className="tuner-main">
        <div className="tuner-workspace">
          {/* Left: Minimal Curve Editor */}
          <section className="tuner-card tuner-curve-card" aria-label="Curve editor">
            <div className="tuner-card-head">
              <span>Curve</span>
              <span className="tuner-hint">Drag points</span>
            </div>

            <div className="tuner-pad-wrap">
              <svg
                ref={svgRef}
                viewBox="0 0 240 240"
                className="tuner-svg"
                aria-label="Cubic bezier curve"
              >
                {/* Guide box */}
                <rect
                  x={startX}
                  y={endY}
                  width={endX - startX}
                  height={startY - endY}
                  rx="4"
                  fill="rgba(0,0,0,0.02)"
                  stroke="rgba(0,0,0,0.07)"
                  strokeDasharray="3 3"
                />

                {/* Linear diagonal */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="rgba(0,0,0,0.08)"
                  strokeWidth="1"
                />

                {/* Control lines */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={cp1X}
                  y2={cp1Y}
                  stroke="#ff4f18"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />
                <line
                  x1={endX}
                  y1={endY}
                  x2={cp2X}
                  y2={cp2Y}
                  stroke="#111315"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />

                {/* Bezier curve */}
                <path
                  d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                  fill="none"
                  stroke="#111315"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                />

                <circle cx={startX} cy={startY} r="3.5" fill="#9ca3af" />
                <circle cx={endX} cy={endY} r="3.5" fill="#9ca3af" />

                {/* Draggable Handle 1 */}
                <g
                  className="tuner-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle("p1");
                  }}
                >
                  <circle cx={cp1X} cy={cp1Y} r="14" fill="transparent" />
                  <circle cx={cp1X} cy={cp1Y} r="6.5" fill="#ff4f18" stroke="#ffffff" strokeWidth="2" />
                </g>

                {/* Draggable Handle 2 */}
                <g
                  className="tuner-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle("p2");
                  }}
                >
                  <circle cx={cp2X} cy={cp2Y} r="14" fill="transparent" />
                  <circle cx={cp2X} cy={cp2Y} r="6.5" fill="#111315" stroke="#ffffff" strokeWidth="2" />
                </g>
              </svg>
            </div>

            <label className="tuner-duration-row" htmlFor="minimal-duration-slider">
              <span>Duration</span>
              <input
                id="minimal-duration-slider"
                type="range"
                min="120"
                max="800"
                step="10"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                onPointerUp={triggerReplay}
              />
              <code>{duration}ms</code>
            </label>
          </section>

          {/* Right: Realistic UI Preview Stage */}
          <section className="tuner-card tuner-preview-card" aria-label="UI component preview">
            <div className="tuner-card-head">
              <div className="tuner-scene-pills" role="tablist">
                {SCENES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    id={`scene-pill-${s.id}`}
                    aria-selected={activeScene === s.id}
                    className={`tuner-scene-pill ${activeScene === s.id ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveScene(s.id);
                      setIsEntered(true);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                id="tuner-replay-btn"
                className="tuner-replay-btn"
                onClick={() => {
                  if (activeScene === "tabs") {
                    triggerReplay();
                  } else {
                    setIsEntered((prev) => !prev);
                  }
                }}
              >
                {activeScene === "tabs" ? "Step ↻" : isEntered ? "Hide" : "Show"}
              </button>
            </div>

            {/* Stage Canvas */}
            <div className="tuner-stage">
              {/* 1. Toast */}
              {activeScene === "toast" && (
                <div
                  className={`min-toast ${isEntered ? "is-in" : "is-out"}`}
                  style={{
                    transition: `transform ${duration}ms ${bezierStr}, opacity ${duration}ms ${bezierStr}`
                  }}
                  onClick={triggerReplay}
                >
                  <span className="min-toast-dot" />
                  <div className="min-toast-text">
                    <strong>Changes saved</strong>
                    <span>Synced across workspace</span>
                  </div>
                  <button type="button" className="min-toast-action">
                    Undo
                  </button>
                </div>
              )}

              {/* 2. Modal */}
              {activeScene === "modal" && (
                <div
                  className={`min-modal ${isEntered ? "is-in" : "is-out"}`}
                  style={{
                    transition: `transform ${duration}ms ${bezierStr}, opacity ${duration}ms ${bezierStr}`
                  }}
                >
                  <div className="min-modal-title">Publish update?</div>
                  <p className="min-modal-desc">
                    Your new motion curve will go live immediately.
                  </p>
                  <div className="min-modal-actions">
                    <button
                      type="button"
                      className="min-btn-ghost"
                      onClick={() => setIsEntered(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="min-btn-solid"
                      onClick={triggerReplay}
                    >
                      Publish
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Menu */}
              {activeScene === "dropdown" && (
                <div className="min-menu-wrap">
                  <button
                    type="button"
                    className="min-menu-trigger"
                    onClick={() => setIsEntered((p) => !p)}
                  >
                    <span>Options</span>
                    <span
                      style={{
                        display: "inline-block",
                        transform: isEntered ? "rotate(180deg)" : "rotate(0deg)",
                        transition: `transform ${duration}ms ${bezierStr}`
                      }}
                    >
                      ▾
                    </span>
                  </button>
                  <div
                    className={`min-menu-list ${isEntered ? "is-in" : "is-out"}`}
                    style={{
                      transition: `transform ${duration}ms ${bezierStr}, opacity ${duration}ms ${bezierStr}`
                    }}
                  >
                    <div className="min-menu-item" onClick={triggerReplay}>
                      <span>Copy CSS</span>
                      <kbd>⌘C</kbd>
                    </div>
                    <div className="min-menu-item" onClick={triggerReplay}>
                      <span>Duplicate</span>
                      <kbd>⌘D</kbd>
                    </div>
                    <div className="min-menu-item" onClick={triggerReplay}>
                      <span>Share Link</span>
                      <kbd>⌘S</kbd>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Bottom Sheet */}
              {activeScene === "drawer" && (
                <div className="min-sheet-frame" onClick={triggerReplay}>
                  <div
                    className={`min-bottom-sheet ${isEntered ? "is-in" : "is-out"}`}
                    style={{
                      transition: `transform ${duration}ms ${bezierStr}`
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="min-sheet-handle" onClick={() => setIsEntered((p) => !p)} />
                    <div className="min-sheet-row">
                      <div>
                        <div className="min-modal-title">Quick Share</div>
                        <div className="min-modal-desc">Anyone with the link can view</div>
                      </div>
                      <button type="button" className="min-btn-solid" onClick={triggerReplay}>
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Tabs & Switch */}
              {activeScene === "tabs" && (
                <div className="min-tabs-stack">
                  <div className="min-segmented">
                    <div
                      className="min-segmented-pill"
                      style={{
                        transform: `translate3d(${tabIdx * 100}%, 0, 0)`,
                        transition: `transform ${duration}ms ${bezierStr}`
                      }}
                    />
                    {["Design", "Code", "Preview"].map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        className={`min-segmented-tab ${tabIdx === idx ? "is-active" : ""}`}
                        onClick={() => setTabIdx(idx)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="min-switch-card" onClick={() => setSwitchOn((s) => !s)}>
                    <span>Spring Physics</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={switchOn}
                      className={`min-switch ${switchOn ? "is-on" : ""}`}
                    >
                      <span
                        className="min-switch-thumb"
                        style={{
                          transform: switchOn ? "translate3d(18px, 0, 0)" : "translate3d(0, 0, 0)",
                          transition: `transform ${duration}ms ${bezierStr}`
                        }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Minimal Bottom Copy Bar */}
        <div className="tuner-copy-bar">
          <code className="tuner-css-text">{cssCode}</code>
          <button
            type="button"
            id="tuner-copy-btn"
            className="tuner-copy-button"
            onClick={handleCopy}
          >
            {copied ? "Copied ✓" : "Copy CSS"}
          </button>
        </div>
      </main>
    </div>
  );
}

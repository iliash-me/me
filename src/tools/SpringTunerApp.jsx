import { useEffect, useRef, useState } from "react";
import "./SpringTunerApp.css";

const PRESETS = [
  { id: "spring", name: "Spring", points: [0.34, 1.56, 0.64, 1.0], duration: 420 },
  { id: "sheet", name: "Sheet", points: [0.22, 1.0, 0.36, 1.0], duration: 460 },
  { id: "popover", name: "Popover", points: [0.16, 1.0, 0.3, 1.0], duration: 240 },
  { id: "bounce", name: "Bounce", points: [0.68, -0.45, 0.27, 1.45], duration: 540 },
  { id: "crisp", name: "Crisp", points: [0.4, 0.0, 0.2, 1.0], duration: 200 }
];

const SCENES = [
  { id: "toast", label: "Toast" },
  { id: "modal", label: "Modal" },
  { id: "dropdown", label: "Menu" },
  { id: "drawer", label: "Sheet" },
  { id: "tabs", label: "Tabs & Switch" }
];

const EXPORT_FORMATS = [
  { id: "css", label: "CSS Transition" },
  { id: "bezier", label: "cubic-bezier()" },
  { id: "tailwind", label: "Tailwind" },
  { id: "waapi", label: "JS Web Animations" }
];

export default function SpringTunerApp({ onNavigateHome }) {
  const [activePreset, setActivePreset] = useState("spring");
  const [x1, setX1] = useState(0.34);
  const [y1, setY1] = useState(1.56);
  const [x2, setX2] = useState(0.64);
  const [y2, setY2] = useState(1.0);
  const [duration, setDuration] = useState(420);
  const [speedScale, setSpeedScale] = useState(1); // 1 | 0.5 | 0.25

  const [activeScene, setActiveScene] = useState("toast");
  const [isEntered, setIsEntered] = useState(true);
  const [autoLoop, setAutoLoop] = useState(false);
  const [tabIdx, setTabIdx] = useState(0);
  const [switchOn, setSwitchOn] = useState(true);

  const [exportFormat, setExportFormat] = useState("css");
  const [copied, setCopied] = useState(false);

  const svgRef = useRef(null);
  const [draggingHandle, setDraggingHandle] = useState(null);

  const effectiveDuration = Math.round(duration / speedScale);
  const bezierStr = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;

  const getExportCode = () => {
    if (exportFormat === "bezier") {
      return bezierStr;
    }
    if (exportFormat === "tailwind") {
      return `duration-[${duration}ms] ease-[cubic-bezier(${x1.toFixed(2)},_${y1.toFixed(2)},_${x2.toFixed(2)},_${y2.toFixed(2)})]`;
    }
    if (exportFormat === "waapi") {
      return `element.animate(keyframes, { duration: ${duration}, easing: "${bezierStr}", fill: "forwards" });`;
    }
    return `transition: transform ${duration}ms ${bezierStr}, opacity ${duration}ms ${bezierStr};`;
  };

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

  useEffect(() => {
    if (!autoLoop) return;
    const interval = setInterval(() => {
      if (activeScene === "tabs") {
        setTabIdx((prev) => (prev + 1) % 3);
        setSwitchOn((prev) => !prev);
      } else {
        setIsEntered((prev) => !prev);
      }
    }, Math.max(effectiveDuration + 650, 1200));
    return () => clearInterval(interval);
  }, [autoLoop, effectiveDuration, activeScene]);

  // 240x195 SVG coordinate space
  // X: 0..1 -> 38..202 (span 164)
  // Y: -0.6..1.8 -> 152..54 (span 98 per 1.0 unit)
  const mapX = (val) => 38 + val * 164;
  const mapY = (val) => 152 - val * 98;
  const unmapX = (px) => Math.min(1, Math.max(0, (px - 38) / 164));
  const unmapY = (py) => Math.min(1.8, Math.max(-0.6, (152 - py) / 98));

  const handlePointerMove = (e) => {
    if (!draggingHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 240;
    const py = ((e.clientY - rect.top) / rect.height) * 195;

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
    navigator.clipboard?.writeText(getExportCode());
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
        <div className="tuner-nav-left">
          <button
            type="button"
            id="tuner-back-btn"
            className="tuner-back-link"
            onClick={onNavigateHome}
          >
            ← iliash.me
          </button>
          <span className="tuner-nav-title">Spring & Easing</span>
        </div>

        <div className="tuner-presets" role="group" aria-label="Curve presets">
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

        <div className="tuner-nav-right">
          <div className="tuner-speed-pills" role="group" aria-label="Playback speed">
            {[1, 0.5, 0.25].map((spd) => (
              <button
                key={spd}
                type="button"
                id={`speed-pill-${spd}`}
                className={`tuner-mini-pill ${speedScale === spd ? "is-active" : ""}`}
                onClick={() => setSpeedScale(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            id="tuner-loop-pill"
            className={`tuner-loop-pill ${autoLoop ? "is-active" : ""}`}
            onClick={() => setAutoLoop((l) => !l)}
          >
            <span className="loop-dot" />
            <span>{autoLoop ? "Looping" : "Auto-Loop"}</span>
          </button>
        </div>
      </header>

      {/* Main Centered Studio */}
      <main className="tuner-main">
        <div className="tuner-workspace">
          {/* Left: Minimal Curve Editor + All 5 Fine-Tuning Sliders */}
          <section className="tuner-card tuner-curve-card" aria-label="Curve editor and parameters">
            <div className="tuner-card-head">
              <span>Bezier Curve</span>
              <code className="tuner-curve-readout">
                ({x1.toFixed(2)}, {y1.toFixed(2)}, {x2.toFixed(2)}, {y2.toFixed(2)})
              </code>
            </div>

            <div className="tuner-pad-wrap">
              <svg
                ref={svgRef}
                viewBox="0 0 240 195"
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
                  strokeOpacity="0.65"
                />
                <line
                  x1={endX}
                  y1={endY}
                  x2={cp2X}
                  y2={cp2Y}
                  stroke="#111315"
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
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

                {/* Draggable Handle 1 (Orange) */}
                <g
                  className="tuner-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle("p1");
                  }}
                >
                  <circle cx={cp1X} cy={cp1Y} r="14" fill="rgba(255, 79, 24, 0.1)" />
                  <circle cx={cp1X} cy={cp1Y} r="6.5" fill="#ff4f18" stroke="#ffffff" strokeWidth="2" />
                </g>

                {/* Draggable Handle 2 (Ink) */}
                <g
                  className="tuner-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle("p2");
                  }}
                >
                  <circle cx={cp2X} cy={cp2Y} r="14" fill="rgba(17, 19, 21, 0.08)" />
                  <circle cx={cp2X} cy={cp2Y} r="6.5" fill="#111315" stroke="#ffffff" strokeWidth="2" />
                </g>
              </svg>
            </div>

            {/* All 5 Precision Parameter Sliders */}
            <div className="tuner-sliders-stack">
              <label className="tuner-param-row" htmlFor="param-duration">
                <span className="param-label">Duration</span>
                <input
                  id="param-duration"
                  type="range"
                  min="100"
                  max="1000"
                  step="10"
                  value={duration}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setDuration(Number(e.target.value));
                  }}
                />
                <code>{duration}ms</code>
              </label>

              <label className="tuner-param-row" htmlFor="param-x1">
                <span className="param-label">
                  <i className="param-dot is-p1" /> P1 · X1 (Time)
                </span>
                <input
                  id="param-x1"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={x1}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setX1(Number(e.target.value));
                  }}
                />
                <code>{x1.toFixed(2)}</code>
              </label>

              <label className="tuner-param-row" htmlFor="param-y1">
                <span className="param-label">
                  <i className="param-dot is-p1" /> P1 · Y1 (Overshoot)
                </span>
                <input
                  id="param-y1"
                  type="range"
                  min="-0.6"
                  max="1.8"
                  step="0.02"
                  value={y1}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setY1(Number(e.target.value));
                  }}
                />
                <code>{y1.toFixed(2)}</code>
              </label>

              <label className="tuner-param-row" htmlFor="param-x2">
                <span className="param-label">
                  <i className="param-dot is-p2" /> P2 · X2 (Settle)
                </span>
                <input
                  id="param-x2"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={x2}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setX2(Number(e.target.value));
                  }}
                />
                <code>{x2.toFixed(2)}</code>
              </label>

              <label className="tuner-param-row" htmlFor="param-y2">
                <span className="param-label">
                  <i className="param-dot is-p2" /> P2 · Y2 (Bounce)
                </span>
                <input
                  id="param-y2"
                  type="range"
                  min="-0.5"
                  max="1.6"
                  step="0.02"
                  value={y2}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setY2(Number(e.target.value));
                  }}
                />
                <code>{y2.toFixed(2)}</code>
              </label>
            </div>
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

              <div className="tuner-stage-actions">
                <button
                  type="button"
                  id="tuner-toggle-in-out-btn"
                  className="tuner-replay-btn"
                  onClick={() => {
                    if (activeScene === "tabs") {
                      triggerReplay();
                    } else {
                      setIsEntered((prev) => !prev);
                    }
                  }}
                >
                  {activeScene === "tabs"
                    ? "Step State ↻"
                    : isEntered
                    ? "Animate Out ↓"
                    : "Animate In ↑"}
                </button>
              </div>
            </div>

            {/* Stage Canvas */}
            <div className="tuner-stage">
              {/* 1. Toast */}
              {activeScene === "toast" && (
                <div className="stage-centered-col">
                  <span className="stage-subtle-note">
                    Click toast or button to test enter/exit curve ({effectiveDuration}ms)
                  </span>
                  <div
                    className={`min-toast ${isEntered ? "is-in" : "is-out"}`}
                    style={{
                      transition: `transform ${effectiveDuration}ms ${bezierStr}, opacity ${effectiveDuration}ms ${bezierStr}`
                    }}
                    onClick={triggerReplay}
                  >
                    <span className="min-toast-dot" />
                    <div className="min-toast-text">
                      <strong>Deployment complete</strong>
                      <span>Production bundle live in {duration}ms</span>
                    </div>
                    <button
                      type="button"
                      className="min-toast-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerReplay();
                      }}
                    >
                      Replay
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Modal */}
              {activeScene === "modal" && (
                <div
                  className={`min-modal ${isEntered ? "is-in" : "is-out"}`}
                  style={{
                    transition: `transform ${effectiveDuration}ms ${bezierStr}, opacity ${effectiveDuration}ms ${bezierStr}`
                  }}
                >
                  <div className="min-modal-top">
                    <span className="min-modal-badge">RELEASE v2.4</span>
                    <span className="min-modal-meta">{duration}ms</span>
                  </div>
                  <div className="min-modal-title">Publish motion tokens?</div>
                  <p className="min-modal-desc">
                    Updates the spring easing curve across all dialogs, menus, and sheets.
                  </p>
                  <div className="min-modal-actions">
                    <button
                      type="button"
                      className="min-btn-ghost"
                      onClick={() => setIsEntered(false)}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="min-btn-solid"
                      onClick={triggerReplay}
                    >
                      Confirm & Replay
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
                    <span>Workspace Actions</span>
                    <span
                      style={{
                        display: "inline-block",
                        transform: isEntered ? "rotate(180deg)" : "rotate(0deg)",
                        transition: `transform ${effectiveDuration}ms ${bezierStr}`
                      }}
                    >
                      ▾
                    </span>
                  </button>
                  <div
                    className={`min-menu-list ${isEntered ? "is-in" : "is-out"}`}
                    style={{
                      transition: `transform ${effectiveDuration}ms ${bezierStr}, opacity ${effectiveDuration}ms ${bezierStr}`
                    }}
                  >
                    <div className="min-menu-item" onClick={triggerReplay}>
                      <span>Copy Cubic-Bezier</span>
                      <kbd>⌘C</kbd>
                    </div>
                    <div className="min-menu-item" onClick={triggerReplay}>
                      <span>Inspect Keyframes</span>
                      <kbd>⌘K</kbd>
                    </div>
                    <div className="min-menu-divider" />
                    <div className="min-menu-item is-accent" onClick={triggerReplay}>
                      <span>Replay Popover</span>
                      <kbd>⌘R</kbd>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Bottom Sheet */}
              {activeScene === "drawer" && (
                <div className="min-sheet-frame" onClick={triggerReplay}>
                  <span className="stage-subtle-note">Click anywhere to bounce bottom sheet</span>
                  <div
                    className={`min-bottom-sheet ${isEntered ? "is-in" : "is-out"}`}
                    style={{
                      transition: `transform ${effectiveDuration}ms ${bezierStr}`
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="min-sheet-handle" onClick={() => setIsEntered((p) => !p)} />
                    <div className="min-sheet-row">
                      <div>
                        <div className="min-modal-title">Mobile Bottom Sheet</div>
                        <div className="min-modal-desc">Slides up with your active curve</div>
                      </div>
                      <button type="button" className="min-btn-solid" onClick={triggerReplay}>
                        Bounce ↻
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
                        transition: `transform ${effectiveDuration}ms ${bezierStr}`
                      }}
                    />
                    {["Design", "Kinematics", "Tokens"].map((label, idx) => (
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
                    <div>
                      <div className="min-switch-title">Hardware Acceleration</div>
                      <div className="min-switch-sub">60fps GPU layer promotion</div>
                    </div>
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
                          transition: `transform ${effectiveDuration}ms ${bezierStr}`
                        }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Minimal Bottom Export & Copy Bar with Format Switcher */}
        <div className="tuner-copy-card">
          <div className="tuner-export-tabs" role="tablist" aria-label="Export format">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                role="tab"
                id={`export-tab-${fmt.id}`}
                aria-selected={exportFormat === fmt.id}
                className={`tuner-export-tab ${exportFormat === fmt.id ? "is-active" : ""}`}
                onClick={() => setExportFormat(fmt.id)}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          <div className="tuner-copy-row">
            <code className="tuner-css-text">{getExportCode()}</code>
            <button
              type="button"
              id="tuner-copy-btn"
              className="tuner-copy-button"
              onClick={handleCopy}
            >
              {copied ? "Copied ✓" : "Copy Code"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

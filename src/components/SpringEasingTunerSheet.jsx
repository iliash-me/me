import { useEffect, useState } from "react";

const CURVE_PRESETS = [
  {
    id: "spring",
    name: "Tactile Spring",
    points: [0.34, 1.56, 0.64, 1],
    duration: 420,
    useCase: "Toasts, floating badges & playful toggles"
  },
  {
    id: "sheet",
    name: "Sheet Glide",
    points: [0.22, 1, 0.36, 1],
    duration: 480,
    useCase: "Bottom sheets, drawers & page reveals"
  },
  {
    id: "snappy",
    name: "Snappy Popover",
    points: [0.16, 1, 0.3, 1],
    duration: 260,
    useCase: "Dropdowns, command menus & modals"
  },
  {
    id: "elastic",
    name: "Elastic Overshoot",
    points: [0.68, -0.45, 0.27, 1.45],
    duration: 540,
    useCase: "Expressive cards &segmented indicators"
  },
  {
    id: "crisp",
    name: "Crisp Linear-Out",
    points: [0.4, 0, 0.2, 1],
    duration: 200,
    useCase: "Micro-switches, checkboxes & hover states"
  }
];

const UI_SCENES = [
  { id: "toast", label: "Toast Notification" },
  { id: "modal", label: "Dialog Modal" },
  { id: "dropdown", label: "Dropdown Menu" },
  { id: "tabs", label: "Segmented Tabs & Switch" }
];

export default function SpringEasingTunerSheet({ isOpen, onClose }) {
  const [activePreset, setActivePreset] = useState("spring");
  const [x1, setX1] = useState(0.34);
  const [y1, setY1] = useState(1.56);
  const [x2, setX2] = useState(0.64);
  const [y2, setY2] = useState(1.0);
  const [duration, setDuration] = useState(420);

  const [activeScene, setActiveScene] = useState("toast");
  const [isEntered, setIsEntered] = useState(true);
  const [autoLoop, setAutoLoop] = useState(false);

  // Interactive states for the Segmented Tabs & Switch scene
  const [tabIdx, setTabIdx] = useState(0);
  const [switchOn, setSwitchOn] = useState(true);

  const [copiedType, setCopiedType] = useState("");

  const bezierString = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
  const fullCssString = `transition: transform ${duration}ms ${bezierString}, opacity ${duration}ms ${bezierString};`;

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setX1(preset.points[0]);
    setY1(preset.points[1]);
    setX2(preset.points[2]);
    setY2(preset.points[3]);
    setDuration(preset.duration);
    replayAnimation();
  };

  const replayAnimation = () => {
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

  useEffect(() => {
    if (!isOpen || !autoLoop) return;
    const interval = setInterval(() => {
      if (activeScene === "tabs") {
        setTabIdx((prev) => (prev + 1) % 3);
        setSwitchOn((prev) => !prev);
      } else {
        setIsEntered((prev) => !prev);
      }
    }, Math.max(duration + 650, 1200));
    return () => clearInterval(interval);
  }, [isOpen, autoLoop, duration, activeScene]);

  const handleCopy = (text, type) => {
    navigator.clipboard?.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(""), 1800);
  };

  // Map (0..1, -0.6..1.6) to SVG coordinates (20..180, 130..20)
  const mapX = (val) => 24 + val * 152;
  const mapY = (val) => 118 - val * 76;

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
      className={`sheet-backdrop ${isOpen ? "is-open" : ""}`}
      role="dialog"
      aria-modal={isOpen}
      aria-hidden={!isOpen}
      aria-labelledby="tuner-sheet-title"
      onClick={onClose}
    >
      <aside
        className={`contact-sheet tuner-sheet ${isOpen ? "is-open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grab-bar" onClick={onClose} aria-hidden="true">
          <span className="sheet-grab-pill" />
        </div>

        {/* Header */}
        <div className="sheet-header">
          <div>
            <span className="sheet-kicker">// FRONT-END MICRO-TOOL 01</span>
            <h2 id="tuner-sheet-title" className="sheet-title">
              CSS Spring & Easing Tuner
            </h2>
          </div>

          <div className="sheet-header-right">
            <div className="tuner-preset-strip" role="group" aria-label="Easing presets">
              {CURVE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  id={`tuner-preset-${preset.id}`}
                  className={`preview-chip ${activePreset === preset.id ? "is-active" : ""}`}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="close-tuner-sheet-btn"
              className="sheet-close-btn"
              onClick={onClose}
              aria-label="Close easing tuner"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body: Left Curve Controls + Right Realistic UI Stage */}
        <div className="sheet-body tuner-body">
          <div className="tuner-workbench-grid">
            {/* Left Column: Curve Graph & Sliders */}
            <div className="tuner-controls-col">
              <div className="bezier-graph-card">
                <div className="bezier-graph-meta">
                  <code>{bezierString}</code>
                  <span>{duration}ms</span>
                </div>
                <svg viewBox="0 0 200 145" className="bezier-svg" aria-label="Cubic bezier curve graph">
                  {/* Baseline & Target Guides */}
                  <line x1={startX} y1={startY} x2={endX} y2={startY} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <line x1={startX} y1={endY} x2={endX} y2={endY} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="var(--border-subtle)" />

                  {/* Control Handles */}
                  <line x1={startX} y1={startY} x2={cp1X} y2={cp1Y} stroke="var(--accent-warm)" strokeWidth="1.25" strokeOpacity="0.65" />
                  <line x1={endX} y1={endY} x2={cp2X} y2={cp2Y} stroke="var(--accent-emerald)" strokeWidth="1.25" strokeOpacity="0.65" />

                  {/* Main Cubic Bezier Path */}
                  <path
                    d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                    fill="none"
                    stroke="var(--text-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Endpoints & Control Points */}
                  <circle cx={startX} cy={startY} r="3.5" fill="var(--text-muted)" />
                  <circle cx={endX} cy={endY} r="3.5" fill="var(--text-muted)" />
                  <circle cx={cp1X} cy={cp1Y} r="5" fill="var(--accent-warm)" />
                  <circle cx={cp2X} cy={cp2Y} r="5" fill="var(--accent-emerald)" />
                </svg>
              </div>

              <div className="tuner-sliders-box">
                <label className="tuner-slider-row" htmlFor="slider-duration">
                  <span>Duration</span>
                  <input
                    id="slider-duration"
                    type="range"
                    min="100"
                    max="900"
                    step="10"
                    value={duration}
                    onChange={(e) => {
                      setActivePreset("custom");
                      setDuration(Number(e.target.value));
                    }}
                  />
                  <code>{duration}ms</code>
                </label>

                <label className="tuner-slider-row" htmlFor="slider-x1">
                  <span>P1 · X1 (Time)</span>
                  <input
                    id="slider-x1"
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

                <label className="tuner-slider-row" htmlFor="slider-y1">
                  <span>P1 · Y1 (Overshoot)</span>
                  <input
                    id="slider-y1"
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

                <label className="tuner-slider-row" htmlFor="slider-x2">
                  <span>P2 · X2 (Settle Time)</span>
                  <input
                    id="slider-x2"
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

                <label className="tuner-slider-row" htmlFor="slider-y2">
                  <span>P2 · Y2 (Final Bounce)</span>
                  <input
                    id="slider-y2"
                    type="range"
                    min="-0.4"
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
            </div>

            {/* Right Column: Realistic UI Component Stage */}
            <div className="tuner-stage-col">
              <div className="tuner-stage-toolbar">
                <div className="tuner-scene-tabs" role="tablist" aria-label="Select UI component preview">
                  {UI_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      role="tab"
                      id={`scene-tab-${scene.id}`}
                      aria-selected={activeScene === scene.id}
                      className={`scene-tab-btn ${activeScene === scene.id ? "is-active" : ""}`}
                      onClick={() => {
                        setActiveScene(scene.id);
                        setIsEntered(true);
                      }}
                    >
                      {scene.label}
                    </button>
                  ))}
                </div>

                <div className="tuner-playback-btns">
                  <button
                    type="button"
                    id="tuner-toggle-state-btn"
                    className="preview-chip is-active"
                    onClick={() => {
                      if (activeScene === "tabs") {
                        replayAnimation();
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

                  <button
                    type="button"
                    id="tuner-autoloop-btn"
                    className={`preview-chip ${autoLoop ? "is-active" : ""}`}
                    onClick={() => setAutoLoop((l) => !l)}
                  >
                    {autoLoop ? "Loop: ON" : "Auto-Loop"}
                  </button>
                </div>
              </div>

              {/* Realistic UI Preview Canvas */}
              <div className="ui-preview-viewport">
                {/* SCENE 1: Realistic Toast Notification */}
                {activeScene === "toast" && (
                  <div className="scene-toast-container">
                    <div className="scene-hint-label">
                      Click card or "Animate Out / In" to test toast physics
                    </div>
                    <div
                      className={`realistic-toast ${isEntered ? "is-entered" : "is-exited"}`}
                      style={{
                        transition: `transform ${duration}ms ${bezierString}, opacity ${duration}ms ${bezierString}`
                      }}
                      onClick={replayAnimation}
                    >
                      <div className="toast-status-icon">✓</div>
                      <div className="toast-content">
                        <div className="toast-title">Deployment complete</div>
                        <div className="toast-desc">
                          Production bundle live on <code>iliash.me</code> in 180ms.
                        </div>
                      </div>
                      <button type="button" className="toast-action-btn" onClick={(e) => { e.stopPropagation(); replayAnimation(); }}>
                        Replay
                      </button>
                    </div>
                  </div>
                )}

                {/* SCENE 2: Realistic Dialog Modal */}
                {activeScene === "modal" && (
                  <div className="scene-modal-container" onClick={replayAnimation}>
                    <div
                      className={`realistic-modal-card ${isEntered ? "is-entered" : "is-exited"}`}
                      style={{
                        transition: `transform ${duration}ms ${bezierString}, opacity ${duration}ms ${bezierString}`
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="modal-card-top">
                        <span className="modal-badge">RELEASE v2.4</span>
                        <span className="modal-time">Just now</span>
                      </div>
                      <h3 className="modal-card-title">Promote build to production?</h3>
                      <p className="modal-card-body">
                        All 24 edge checks passed with zero layout shift. Traffic will switch immediately.
                      </p>
                      <div className="modal-card-actions">
                        <button type="button" className="modal-btn-cancel" onClick={() => setIsEntered(false)}>
                          Dismiss
                        </button>
                        <button type="button" className="modal-btn-confirm" onClick={replayAnimation}>
                          Confirm & Replay
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 3: Realistic Dropdown / Command Menu */}
                {activeScene === "dropdown" && (
                  <div className="scene-dropdown-container">
                    <div className="dropdown-anchor-wrap">
                      <button
                        type="button"
                        className="dropdown-trigger-btn"
                        onClick={() => setIsEntered((p) => !p)}
                      >
                        <span>Workspace Actions</span>
                        <span
                          className="dropdown-chevron"
                          style={{
                            transform: isEntered ? "rotate(180deg)" : "rotate(0deg)",
                            transition: `transform ${duration}ms ${bezierString}`
                          }}
                        >
                          ▾
                        </span>
                      </button>

                      <div
                        className={`realistic-dropdown-menu ${isEntered ? "is-entered" : "is-exited"}`}
                        style={{
                          transition: `transform ${duration}ms ${bezierString}, opacity ${duration}ms ${bezierString}`
                        }}
                      >
                        <div className="dropdown-menu-item" onClick={replayAnimation}>
                          <span>Inspect Design Tokens</span>
                          <kbd>⌘I</kbd>
                        </div>
                        <div className="dropdown-menu-item" onClick={replayAnimation}>
                          <span>Export Cubic Bezier</span>
                          <kbd>⌘E</kbd>
                        </div>
                        <div className="dropdown-menu-divider" />
                        <div className="dropdown-menu-item is-accent" onClick={replayAnimation}>
                          <span>Run Lighthouse Audit</span>
                          <kbd>⌘L</kbd>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 4: Realistic Segmented Tabs & Tactile Switch */}
                {activeScene === "tabs" && (
                  <div className="scene-tabs-container">
                    <div className="realistic-segmented-control">
                      <div
                        className="segmented-active-pill"
                        style={{
                          transform: `translate3d(${tabIdx * 100}%, 0, 0)`,
                          transition: `transform ${duration}ms ${bezierString}`
                        }}
                      />
                      {["Overview", "Kinematics", "Tokens"].map((label, idx) => (
                        <button
                          key={label}
                          type="button"
                          className={`segmented-tab-item ${tabIdx === idx ? "is-active" : ""}`}
                          onClick={() => setTabIdx(idx)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div
                      className="realistic-switch-row"
                      onClick={() => setSwitchOn((s) => !s)}
                    >
                      <div>
                        <div className="switch-row-title">Hardware Acceleration</div>
                        <div className="switch-row-sub">Compositor layer promotion (`translate3d`)</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={switchOn}
                        className={`realistic-toggle-switch ${switchOn ? "is-on" : ""}`}
                      >
                        <span
                          className="toggle-switch-thumb"
                          style={{
                            transform: switchOn ? "translate3d(20px, 0, 0)" : "translate3d(0, 0, 0)",
                            transition: `transform ${duration}ms ${bezierString}`
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Live CSS Output & One-Click Copy */}
        <div className="sheet-footer tuner-footer">
          <code className="tuner-code-output">{fullCssString}</code>
          <div className="tuner-copy-actions">
            <button
              type="button"
              id="copy-bezier-only-btn"
              className="btn-secondary btn-compact"
              onClick={() => handleCopy(bezierString, "bezier")}
            >
              {copiedType === "bezier" ? "Copied Curve ✓" : "Copy cubic-bezier()"}
            </button>
            <button
              type="button"
              id="copy-full-transition-btn"
              className="btn-primary btn-compact"
              onClick={() => handleCopy(fullCssString, "css")}
            >
              {copiedType === "css" ? "Copied CSS ✓" : "Copy CSS Transition"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import "./SpringTunerApp.css";

const PRESETS = [
  {
    id: "spring",
    code: "BNK-01",
    name: "Tactile Spring",
    points: [0.34, 1.56, 0.64, 1.0],
    duration: 440,
    tag: "Overshoot"
  },
  {
    id: "sheet",
    code: "BNK-02",
    name: "Sheet Glide",
    points: [0.22, 1.0, 0.36, 1.0],
    duration: 480,
    tag: "Smooth Out"
  },
  {
    id: "snappy",
    code: "BNK-03",
    name: "Snappy Popover",
    points: [0.16, 1.0, 0.3, 1.0],
    duration: 260,
    tag: "Fast Attack"
  },
  {
    id: "elastic",
    code: "BNK-04",
    name: "Elastic Bounce",
    points: [0.68, -0.45, 0.27, 1.45],
    duration: 560,
    tag: "Dual Whip"
  },
  {
    id: "crisp",
    code: "BNK-05",
    name: "Precision Snap",
    points: [0.4, 0.0, 0.2, 1.0],
    duration: 200,
    tag: "Utility"
  }
];

const SCENES = [
  { id: "toast", code: "UI-01", label: "Action Toast" },
  { id: "modal", code: "UI-02", label: "Dialog Modal" },
  { id: "dropdown", code: "UI-03", label: "Popover Menu" },
  { id: "drawer", code: "UI-04", label: "Bottom Drawer" },
  { id: "dock", code: "UI-05", label: "Segmented Dock" }
];

export default function SpringTunerApp({ onNavigateHome }) {
  const [activePreset, setActivePreset] = useState("spring");
  const [x1, setX1] = useState(0.34);
  const [y1, setY1] = useState(1.56);
  const [x2, setX2] = useState(0.64);
  const [y2, setY2] = useState(1.0);
  const [duration, setDuration] = useState(440);
  const [speedScale, setSpeedScale] = useState(1); // 1 | 0.5 | 0.25 (slow-mo)

  const [activeScene, setActiveScene] = useState("toast");
  const [isEntered, setIsEntered] = useState(true);
  const [autoLoop, setAutoLoop] = useState(false);
  const [exportFormat, setExportFormat] = useState("css"); // "css" | "tailwind" | "waapi"
  const [copied, setCopied] = useState(false);

  // Interactive states for Segmented Dock scene
  const [dockIdx, setDockIdx] = useState(0);
  const [toggleActive, setToggleActive] = useState(true);

  // Draggable SVG pad state
  const svgRef = useRef(null);
  const [draggingHandle, setDraggingHandle] = useState(null); // "p1" | "p2" | null

  const effectiveDuration = Math.round(duration / speedScale);
  const bezierStr = `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;

  const getExportCode = () => {
    if (exportFormat === "tailwind") {
      return `duration-[${duration}ms] ease-[cubic-bezier(${x1.toFixed(2)},_${y1.toFixed(2)},_${x2.toFixed(2)},_${y2.toFixed(2)})]`;
    }
    if (exportFormat === "waapi") {
      return `element.animate(keyframes, {\n  duration: ${duration},\n  easing: "${bezierStr}",\n  fill: "forwards"\n});`;
    }
    return `transition: transform ${duration}ms ${bezierStr}, opacity ${duration}ms ${bezierStr};`;
  };

  const triggerImpulse = () => {
    if (activeScene === "dock") {
      setDockIdx((prev) => (prev + 1) % 4);
      setToggleActive((prev) => !prev);
      return;
    }
    setIsEntered(false);
    setTimeout(() => {
      setIsEntered(true);
    }, 200);
  };

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setX1(preset.points[0]);
    setY1(preset.points[1]);
    setX2(preset.points[2]);
    setY2(preset.points[3]);
    setDuration(preset.duration);
    triggerImpulse();
  };

  useEffect(() => {
    if (!autoLoop) return;
    const interval = setInterval(() => {
      if (activeScene === "dock") {
        setDockIdx((prev) => (prev + 1) % 4);
        setToggleActive((prev) => !prev);
      } else {
        setIsEntered((prev) => !prev);
      }
    }, Math.max(effectiveDuration + 650, 1200));
    return () => clearInterval(interval);
  }, [autoLoop, effectiveDuration, activeScene]);

  // Coordinate mapping for 300x240 SVG oscilloscope
  // X domain: 0..1 -> 44..256 (span 212)
  // Y domain: -0.6..1.8 -> 196..36 (0 is at 164, 1 is at 76, span 88 per unit)
  const mapX = (val) => 44 + val * 212;
  const mapY = (val) => 164 - val * 88;
  const unmapX = (px) => Math.min(1, Math.max(0, (px - 44) / 212));
  const unmapY = (py) => Math.min(1.8, Math.max(-0.6, (164 - py) / 88));

  const handlePointerMove = (e) => {
    if (!draggingHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 300 / rect.width;
    const scaleY = 220 / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

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
    }
  };

  const handleCopyCode = () => {
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
      className="synth-app"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Top Hardware Rack Bar */}
      <header className="synth-topbar">
        <div className="synth-topbar-left">
          <button
            type="button"
            id="synth-back-home-btn"
            className="synth-back-btn"
            onClick={onNavigateHome}
          >
            <span>← iliash.me</span>
          </button>

          <div className="synth-brand-block">
            <span className="synth-model-code">KINETIC-01</span>
            <h1 className="synth-title">SPRING & EASING SYNTHESIZER</h1>
          </div>
        </div>

        <div className="synth-preset-bank" role="group" aria-label="Curve preset bank">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              id={`synth-preset-${preset.id}`}
              className={`synth-bank-btn ${activePreset === preset.id ? "is-engaged" : ""}`}
              onClick={() => applyPreset(preset)}
            >
              <span className="bank-led" />
              <span className="bank-code">{preset.code}</span>
              <span className="bank-name">{preset.name}</span>
            </button>
          ))}
        </div>

        <div className="synth-topbar-right">
          <div className="synth-speed-selector" role="group" aria-label="Playback speed">
            {[1, 0.5, 0.25].map((spd) => (
              <button
                key={spd}
                type="button"
                id={`synth-speed-${spd}`}
                className={`synth-mini-btn ${speedScale === spd ? "is-active" : ""}`}
                onClick={() => setSpeedScale(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            id="synth-autoloop-toggle"
            className={`synth-loop-btn ${autoLoop ? "is-looping" : ""}`}
            onClick={() => setAutoLoop((l) => !l)}
          >
            <span className="loop-led" />
            <span>{autoLoop ? "LOOP ON" : "AUTO-LOOP"}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Module Hardware Console */}
      <main className="synth-console-grid">
        {/* MODULE A: OSCILLOSCOPE PAD & PARAMETER FADERS */}
        <section className="synth-module" aria-label="Bezier Oscilloscope and Faders">
          <div className="synth-module-header">
            <span className="module-tag">MOD.A // BEZIER OSCILLOSCOPE</span>
            <span className="module-hint">DRAG P1 (ORANGE) OR P2 (LIME) HANDLES</span>
          </div>

          <div className="oscilloscope-screen">
            <div className="scope-readout-top">
              <span className="scope-coord is-p1">
                P1 ({x1.toFixed(2)}, {y1.toFixed(2)})
              </span>
              <span className="scope-duration-badge">
                T = {duration}ms {speedScale !== 1 ? `(${effectiveDuration}ms @ ${speedScale}x)` : ""}
              </span>
              <span className="scope-coord is-p2">
                P2 ({x2.toFixed(2)}, {y2.toFixed(2)})
              </span>
            </div>

            <svg
              ref={svgRef}
              viewBox="0 0 300 220"
              className="scope-svg"
              aria-label="Interactive cubic bezier oscilloscope"
            >
              {/* Oscilloscope Reference Lines */}
              <rect
                x={startX}
                y={endY}
                width={endX - startX}
                height={startY - endY}
                fill="rgba(255, 255, 255, 0.015)"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="3 3"
              />
              {/* Overshoot ceiling & floor guides */}
              <line x1="24" y1={endY} x2="276" y2={endY} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
              <line x1="24" y1={startY} x2="276" y2={startY} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
              <text x="16" y={endY + 3} className="scope-axis-label">1.0</text>
              <text x="16" y={startY + 3} className="scope-axis-label">0.0</text>

              {/* Linear reference diagonal */}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="rgba(255, 255, 255, 0.14)"
                strokeWidth="1"
              />

              {/* Control Tethers */}
              <line
                x1={startX}
                y1={startY}
                x2={cp1X}
                y2={cp1Y}
                stroke="#FF5500"
                strokeWidth="1.75"
              />
              <line
                x1={endX}
                y1={endY}
                x2={cp2X}
                y2={cp2Y}
                stroke="#B8FF01"
                strokeWidth="1.75"
              />

              {/* Main Phosphor Bezier Curve */}
              <path
                d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                fill="none"
                stroke="#F5F6F8"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Fixed Origin & Destination Anchors */}
              <circle cx={startX} cy={startY} r="4" fill="#6E737D" />
              <circle cx={endX} cy={endY} r="4" fill="#6E737D" />

              {/* Draggable P1 Handle */}
              <g
                className="scope-handle"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingHandle("p1");
                }}
              >
                <circle cx={cp1X} cy={cp1Y} r="14" fill="rgba(255, 85, 0, 0.16)" />
                <circle cx={cp1X} cy={cp1Y} r="6.5" fill="#FF5500" stroke="#0B0C0E" strokeWidth="2" />
              </g>

              {/* Draggable P2 Handle */}
              <g
                className="scope-handle"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingHandle("p2");
                }}
              >
                <circle cx={cp2X} cy={cp2Y} r="14" fill="rgba(184, 255, 1, 0.16)" />
                <circle cx={cp2X} cy={cp2Y} r="6.5" fill="#B8FF01" stroke="#0B0C0E" strokeWidth="2" />
              </g>
            </svg>
          </div>

          {/* Hardware Parameter Faders */}
          <div className="synth-fader-bank">
            <label className="synth-fader-row" htmlFor="fader-duration">
              <span className="fader-label">TIME (MS)</span>
              <input
                id="fader-duration"
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
              <code className="fader-val">{duration}ms</code>
            </label>

            <label className="synth-fader-row" htmlFor="fader-x1">
              <span className="fader-label is-p1">P1 · TIME (X1)</span>
              <input
                id="fader-x1"
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
              <code className="fader-val">{x1.toFixed(2)}</code>
            </label>

            <label className="synth-fader-row" htmlFor="fader-y1">
              <span className="fader-label is-p1">P1 · BIAS (Y1)</span>
              <input
                id="fader-y1"
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
              <code className="fader-val">{y1.toFixed(2)}</code>
            </label>

            <label className="synth-fader-row" htmlFor="fader-x2">
              <span className="fader-label is-p2">P2 · TIME (X2)</span>
              <input
                id="fader-x2"
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
              <code className="fader-val">{x2.toFixed(2)}</code>
            </label>

            <label className="synth-fader-row" htmlFor="fader-y2">
              <span className="fader-label is-p2">P2 · SETTLE (Y2)</span>
              <input
                id="fader-y2"
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
              <code className="fader-val">{y2.toFixed(2)}</code>
            </label>
          </div>
        </section>

        {/* MODULE B: REALISTIC UI COMPONENT TEST BENCH */}
        <section className="synth-module synth-stage-module" aria-label="Realistic UI Component Stage">
          <div className="synth-module-header">
            <div className="synth-scene-selector" role="tablist" aria-label="Select UI component">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  role="tab"
                  id={`synth-scene-${scene.id}`}
                  aria-selected={activeScene === scene.id}
                  className={`synth-scene-tab ${activeScene === scene.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setActiveScene(scene.id);
                    setIsEntered(true);
                  }}
                >
                  <span className="scene-code">{scene.code}</span>
                  <span>{scene.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              id="synth-trigger-impulse-btn"
              className="synth-trigger-btn"
              onClick={() => {
                if (activeScene === "dock") {
                  triggerImpulse();
                } else {
                  setIsEntered((prev) => !prev);
                }
              }}
            >
              <span>
                {activeScene === "dock"
                  ? "STEP STATE ↻"
                  : isEntered
                  ? "ANIMATE OUT ↓"
                  : "ANIMATE IN ↑"}
              </span>
            </button>
          </div>

          {/* Interactive Stage Well */}
          <div className="synth-stage-well">
            {/* SCENE 1: Action Toast */}
            {activeScene === "toast" && (
              <div className="stage-scene-wrap">
                <div className="stage-caption">
                  CLICK TOAST OR "ANIMATE OUT / IN" TO TEST ENTER & EXIT PHYSICS
                </div>
                <div
                  className={`hw-toast-card ${isEntered ? "is-in" : "is-out"}`}
                  style={{
                    transition: `transform ${effectiveDuration}ms ${bezierStr}, opacity ${effectiveDuration}ms ${bezierStr}`
                  }}
                  onClick={triggerImpulse}
                >
                  <div className="hw-toast-led" />
                  <div className="hw-toast-body">
                    <div className="hw-toast-title">Build #409 deployed to edge</div>
                    <div className="hw-toast-sub">
                      Zero layout shift · <code>{duration}ms</code> curve verified
                    </div>
                  </div>
                  <button
                    type="button"
                    className="hw-toast-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerImpulse();
                    }}
                  >
                    REPLAY
                  </button>
                </div>
              </div>
            )}

            {/* SCENE 2: Dialog Modal */}
            {activeScene === "modal" && (
              <div className="stage-scene-wrap">
                <div
                  className={`hw-modal-card ${isEntered ? "is-in" : "is-out"}`}
                  style={{
                    transition: `transform ${effectiveDuration}ms ${bezierStr}, opacity ${effectiveDuration}ms ${bezierStr}`
                  }}
                >
                  <div className="hw-modal-header">
                    <span className="hw-modal-chip">PRODUCTION RELEASE</span>
                    <span className="hw-modal-id">REV 8.4</span>
                  </div>
                  <h2 className="hw-modal-title">Commit motion tokens to main?</h2>
                  <p className="hw-modal-desc">
                    This updates the global spring easing curve across all interactive dialogs, popovers, and sheets.
                  </p>
                  <div className="hw-modal-footer">
                    <button
                      type="button"
                      className="hw-btn-muted"
                      onClick={() => setIsEntered(false)}
                    >
                      Hide Modal
                    </button>
                    <button
                      type="button"
                      className="hw-btn-orange"
                      onClick={triggerImpulse}
                    >
                      Confirm & Replay ↻
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 3: Popover / Command Menu */}
            {activeScene === "dropdown" && (
              <div className="stage-scene-wrap">
                <div className="hw-popover-rig">
                  <button
                    type="button"
                    className="hw-popover-trigger"
                    onClick={() => setIsEntered((p) => !p)}
                  >
                    <span>Quick Actions Menu</span>
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
                    className={`hw-popover-menu ${isEntered ? "is-in" : "is-out"}`}
                    style={{
                      transition: `transform ${effectiveDuration}ms ${bezierStr}, opacity ${effectiveDuration}ms ${bezierStr}`
                    }}
                  >
                    <div className="hw-menu-row" onClick={triggerImpulse}>
                      <span>Copy Cubic-Bezier Token</span>
                      <kbd>⌘C</kbd>
                    </div>
                    <div className="hw-menu-row" onClick={triggerImpulse}>
                      <span>Inspect Keyframe Graph</span>
                      <kbd>⌘G</kbd>
                    </div>
                    <div className="hw-menu-sep" />
                    <div className="hw-menu-row is-highlight" onClick={triggerImpulse}>
                      <span>Replay Popover Physics</span>
                      <kbd>⌘R</kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 4: Bottom Drawer / Notification Sheet */}
            {activeScene === "drawer" && (
              <div className="stage-drawer-viewport" onClick={triggerImpulse}>
                <div className="stage-drawer-bg-label">
                  MOCK VIEWPORT — CLICK ANYWHERE TO TOGGLE DRAWER
                </div>
                <div
                  className={`hw-bottom-drawer ${isEntered ? "is-in" : "is-out"}`}
                  style={{
                    transition: `transform ${effectiveDuration}ms ${bezierStr}`
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="hw-drawer-pill" onClick={() => setIsEntered((p) => !p)} />
                  <div className="hw-drawer-content">
                    <div>
                      <div className="hw-drawer-title">Mobile Bottom Sheet</div>
                      <div className="hw-drawer-sub">
                        Slides from <code>translate3d(0, 105%, 0)</code> using your active curve
                      </div>
                    </div>
                    <button
                      type="button"
                      className="hw-btn-orange"
                      onClick={triggerImpulse}
                    >
                      Bounce ↻
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE 5: Segmented Dock & Tactile Switch */}
            {activeScene === "dock" && (
              <div className="stage-scene-wrap">
                <div className="hw-dock-stack">
                  <div className="hw-segmented-bar">
                    <div
                      className="hw-segmented-indicator"
                      style={{
                        transform: `translate3d(${dockIdx * 100}%, 0, 0)`,
                        transition: `transform ${effectiveDuration}ms ${bezierStr}`
                      }}
                    />
                    {["Synth", "Envelope", "Filter", "Output"].map((tab, idx) => (
                      <button
                        key={tab}
                        type="button"
                        className={`hw-segmented-btn ${dockIdx === idx ? "is-active" : ""}`}
                        onClick={() => setDockIdx(idx)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div
                    className="hw-switch-unit"
                    onClick={() => setToggleActive((t) => !t)}
                  >
                    <div>
                      <div className="hw-switch-title">60fps GPU Layer Promotion</div>
                      <div className="hw-switch-sub">Click to test thumb spring travel</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={toggleActive}
                      className={`hw-toggle-track ${toggleActive ? "is-on" : ""}`}
                    >
                      <span
                        className="hw-toggle-thumb"
                        style={{
                          transform: toggleActive
                            ? "translate3d(24px, 0, 0)"
                            : "translate3d(0, 0, 0)",
                          transition: `transform ${effectiveDuration}ms ${bezierStr}`
                        }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Code Export Console */}
          <div className="synth-export-bar">
            <div className="export-format-tabs">
              {[
                { id: "css", label: "CSS Transition" },
                { id: "tailwind", label: "Tailwind Arbitrary" },
                { id: "waapi", label: "JS Web Animations" }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  id={`export-fmt-${fmt.id}`}
                  className={`export-tab-btn ${exportFormat === fmt.id ? "is-active" : ""}`}
                  onClick={() => setExportFormat(fmt.id)}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            <div className="export-code-row">
              <pre className="export-code-pre">{getExportCode()}</pre>
              <button
                type="button"
                id="synth-copy-code-btn"
                className="synth-copy-btn"
                onClick={handleCopyCode}
              >
                {copied ? "COPIED TO CLIPBOARD ✓" : "COPY CODE"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

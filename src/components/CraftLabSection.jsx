import { useState } from "react";

const EASING_PRESETS = [
  {
    id: "expo",
    name: "Expo Out",
    curve: "cubic-bezier(0.16, 1, 0.3, 1)",
    desc: "Crisp deceleration for drawers, modals, and layout shifts"
  },
  {
    id: "spring",
    name: "Tactile Spring",
    curve: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    desc: "Subtle overshoot for micro-interactions and toggle switches"
  },
  {
    id: "editorial",
    name: "Editorial Glide",
    curve: "cubic-bezier(0.22, 1, 0.36, 1)",
    desc: "Balanced momentum for page transitions and reveal sequences"
  }
];

export default function CraftLabSection() {
  const [selectedEasing, setSelectedEasing] = useState(EASING_PRESETS[0]);
  const [durationMs, setDurationMs] = useState(420);
  const [displaced, setDisplaced] = useState(false);

  const [trackingEm, setTrackingEm] = useState(-0.03);
  const [lineHeightVal, setLineHeightVal] = useState(1.12);
  const [useEditorialSerif, setUseEditorialSerif] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);

  const generatedCss = `/* UI Token Export — iliash.me */
--motion-ease: ${selectedEasing.curve};
--motion-duration: ${durationMs}ms;
--heading-tracking: ${trackingEm}em;
--heading-leading: ${lineHeightVal};`;

  const handleCopyTokens = () => {
    navigator.clipboard?.writeText(generatedCss);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  return (
    <section id="craft" className="section-block" aria-labelledby="craft-heading">
      <div className="section-meta-row">
        <div>
          <div className="section-index">
            <span className="index-num">03</span>
            <span>// INTERACTIVE INTERFACE LAB</span>
          </div>
          <h2 id="craft-heading" className="section-heading">
            Engineering the <span className="serif-italic">tactile details</span>
          </h2>
        </div>
        <p className="section-subnote">
          Great front-end engineering lives in the millisecond curves and optical spacing. Test the live tokens powering this interface below.
        </p>
      </div>

      <div className="craft-lab-grid">
        {/* Left Workbench: Motion & Kinematics */}
        <div className="craft-panel">
          <div className="craft-panel-header">
            <span className="craft-panel-code">LAB.01 // KINEMATICS & EASING</span>
            <button
              type="button"
              id="trigger-motion-test-btn"
              className="btn-secondary btn-compact"
              onClick={() => setDisplaced((d) => !d)}
            >
              Trigger Impulse ⇄
            </button>
          </div>

          <div className="motion-track-stage" onClick={() => setDisplaced((d) => !d)}>
            <div className="motion-track-rail">
              <div
                className={`motion-puck ${displaced ? "is-displaced" : ""}`}
                style={{
                  transition: `transform ${durationMs}ms ${selectedEasing.curve}`
                }}
              >
                <span className="puck-label">{durationMs}ms</span>
              </div>
            </div>
            <div className="motion-stage-caption">
              Click track or button to test <code>{selectedEasing.curve}</code>
            </div>
          </div>

          <div className="craft-controls-group">
            <div className="preset-pill-row">
              {EASING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  id={`easing-preset-btn-${preset.id}`}
                  className={`craft-option-btn ${selectedEasing.id === preset.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedEasing(preset);
                    setDisplaced((d) => !d);
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <p className="craft-preset-desc">{selectedEasing.desc}</p>

            <label className="craft-range-row" htmlFor="duration-range-input">
              <span>Transition Duration</span>
              <div className="craft-range-control">
                <input
                  id="duration-range-input"
                  type="range"
                  min="160"
                  max="800"
                  step="20"
                  value={durationMs}
                  onChange={(e) => setDurationMs(Number(e.target.value))}
                />
                <code>{durationMs}ms</code>
              </div>
            </label>
          </div>
        </div>

        {/* Right Workbench: Optical Typography & Token Export */}
        <div className="craft-panel">
          <div className="craft-panel-header">
            <span className="craft-panel-code">LAB.02 // OPTICAL TYPOGRAPHY & TOKENS</span>
            <button
              type="button"
              id="toggle-serif-specimen-btn"
              className="btn-secondary btn-compact"
              onClick={() => setUseEditorialSerif((s) => !s)}
            >
              {useEditorialSerif ? "Font: Instrument Serif" : "Font: Plus Jakarta Sans"}
            </button>
          </div>

          <div className="type-specimen-stage">
            <p
              className="type-specimen-text"
              style={{
                letterSpacing: `${trackingEm}em`,
                lineHeight: lineHeightVal,
                fontFamily: useEditorialSerif ? "var(--font-serif)" : "var(--font-sans)",
                fontStyle: useEditorialSerif ? "italic" : "normal"
              }}
            >
              Form follows function, refined to the sub-pixel.
            </p>
          </div>

          <div className="craft-controls-group">
            <label className="craft-range-row" htmlFor="tracking-range-input">
              <span>Letter Spacing (Tracking)</span>
              <div className="craft-range-control">
                <input
                  id="tracking-range-input"
                  type="range"
                  min="-0.06"
                  max="0.04"
                  step="0.005"
                  value={trackingEm}
                  onChange={(e) => setTrackingEm(Number(e.target.value))}
                />
                <code>{trackingEm.toFixed(3)}em</code>
              </div>
            </label>

            <label className="craft-range-row" htmlFor="leading-range-input">
              <span>Line Height (Leading)</span>
              <div className="craft-range-control">
                <input
                  id="leading-range-input"
                  type="range"
                  min="0.95"
                  max="1.45"
                  step="0.02"
                  value={lineHeightVal}
                  onChange={(e) => setLineHeightVal(Number(e.target.value))}
                />
                <code>{lineHeightVal.toFixed(2)}</code>
              </div>
            </label>

            <div className="token-export-box">
              <pre className="token-code-pre">{generatedCss}</pre>
              <button
                type="button"
                id="copy-lab-tokens-btn"
                className="token-copy-btn"
                onClick={handleCopyTokens}
              >
                {copiedCss ? "Copied ✓" : "Copy CSS"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import "./TypeScaleApp.css";

const RATIOS = [
  { label: "1.125 — Major Second", value: 1.125 },
  { label: "1.200 — Minor Third", value: 1.2 },
  { label: "1.250 — Major Third", value: 1.25 },
  { label: "1.333 — Perfect Fourth", value: 1.333 },
  { label: "1.414 — Augmented Fourth", value: 1.414 },
  { label: "1.500 — Perfect Fifth", value: 1.5 },
  { label: "1.618 — Golden Ratio", value: 1.618 }
];

const PRESETS = [
  {
    id: "saas",
    name: "Product UI",
    minVw: 360,
    maxVw: 1280,
    minBase: 15,
    maxBase: 17,
    minRatio: 1.18,
    maxRatio: 1.25
  },
  {
    id: "editorial",
    name: "Editorial",
    minVw: 375,
    maxVw: 1440,
    minBase: 16,
    maxBase: 19,
    minRatio: 1.22,
    maxRatio: 1.333
  },
  {
    id: "display",
    name: "Display Poster",
    minVw: 375,
    maxVw: 1536,
    minBase: 16,
    maxBase: 20,
    minRatio: 1.25,
    maxRatio: 1.414
  },
  {
    id: "compact",
    name: "Dense App",
    minVw: 320,
    maxVw: 1200,
    minBase: 14,
    maxBase: 15,
    minRatio: 1.125,
    maxRatio: 1.18
  }
];

const TYPE_STEPS = [
  { token: "xs", exp: -2, sample: "Captions, timestamps & legal metadata" },
  { token: "sm", exp: -1, sample: "Secondary UI labels & compact controls" },
  { token: "base", exp: 0, sample: "Primary body copy engineered for effortless reading" },
  { token: "lg", exp: 1, sample: "Lead paragraphs & emphasized callouts" },
  { token: "xl", exp: 2, sample: "Section subheadings & card titles" },
  { token: "2xl", exp: 3, sample: "Feature headlines & metric counters" },
  { token: "3xl", exp: 4, sample: "Page headers & hero statements" },
  { token: "4xl", exp: 5, sample: "Display typography at scale" }
];

const SPACE_MULTIPLIERS = [
  { token: "2xs", mult: 0.25 },
  { token: "xs", mult: 0.5 },
  { token: "sm", mult: 0.75 },
  { token: "md", mult: 1.0 },
  { token: "lg", mult: 1.5 },
  { token: "xl", mult: 2.0 },
  { token: "2xl", mult: 3.0 },
  { token: "3xl", mult: 4.0 }
];

function buildClamp(minPx, maxPx, minVw, maxVw, useRem) {
  const minVal = Math.min(minPx, maxPx);
  const maxVal = Math.max(minPx, maxPx);
  const slope = (maxPx - minPx) / (maxVw - minVw);
  const interceptPx = minPx - slope * minVw;
  const slopeVw = +(slope * 100).toFixed(4);

  if (useRem) {
    const minR = +(minVal / 16).toFixed(3);
    const maxR = +(maxVal / 16).toFixed(3);
    const intR = +(interceptPx / 16).toFixed(3);
    const sign = intR >= 0 ? "+" : "-";
    return `clamp(${minR}rem, ${Math.abs(intR)}rem ${sign} ${slopeVw}vw, ${maxR}rem)`;
  }

  const minP = +minVal.toFixed(2);
  const maxP = +maxVal.toFixed(2);
  const intP = +interceptPx.toFixed(2);
  const sign = intP >= 0 ? "+" : "-";
  return `clamp(${minP}px, ${Math.abs(intP)}px ${sign} ${slopeVw}vw, ${maxP}px)`;
}

export default function TypeScaleApp({ onNavigateHome }) {
  const [activePreset, setActivePreset] = useState("editorial");
  const [minVw, setMinVw] = useState(375);
  const [maxVw, setMaxVw] = useState(1440);
  const [minBase, setMinBase] = useState(16);
  const [maxBase, setMaxBase] = useState(19);
  const [minRatio, setMinRatio] = useState(1.22);
  const [maxRatio, setMaxRatio] = useState(1.333);
  const [useRem, setUseRem] = useState(true);

  const [simVw, setSimVw] = useState(960);
  const [activeTab, setActiveTab] = useState("ladder"); // ladder | editorial | spacing
  const [exportFormat, setExportFormat] = useState("css"); // css | tailwind | json
  const [copiedToken, setCopiedToken] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const applyPreset = (p) => {
    setActivePreset(p.id);
    setMinVw(p.minVw);
    setMaxVw(p.maxVw);
    setMinBase(p.minBase);
    setMaxBase(p.maxBase);
    setMinRatio(p.minRatio);
    setMaxRatio(p.maxRatio);
  };

  const scaleItems = useMemo(() => {
    const t = Math.max(0, Math.min(1, (simVw - minVw) / Math.max(1, maxVw - minVw)));
    return TYPE_STEPS.map((s) => {
      const minPx = minBase * Math.pow(minRatio, s.exp);
      const maxPx = maxBase * Math.pow(maxRatio, s.exp);
      const currentPx = minPx + (maxPx - minPx) * t;
      const clampStr = buildClamp(minPx, maxPx, minVw, maxVw, useRem);
      return {
        ...s,
        minPx,
        maxPx,
        currentPx,
        clampStr
      };
    });
  }, [minVw, maxVw, minBase, maxBase, minRatio, maxRatio, simVw, useRem]);

  const spacingItems = useMemo(() => {
    const t = Math.max(0, Math.min(1, (simVw - minVw) / Math.max(1, maxVw - minVw)));
    return SPACE_MULTIPLIERS.map((sp) => {
      const minPx = minBase * sp.mult;
      const maxPx = maxBase * sp.mult;
      const currentPx = minPx + (maxPx - minPx) * t;
      const clampStr = buildClamp(minPx, maxPx, minVw, maxVw, useRem);
      return {
        ...sp,
        minPx,
        maxPx,
        currentPx,
        clampStr
      };
    });
  }, [minVw, maxVw, minBase, maxBase, simVw, useRem]);

  const exportCode = useMemo(() => {
    if (exportFormat === "tailwind") {
      const fontObj = {};
      scaleItems.forEach((item) => {
        fontObj[item.token] = item.clampStr;
      });
      const spaceObj = {};
      spacingItems.forEach((sp) => {
        spaceObj[`fluid-${sp.token}`] = sp.clampStr;
      });
      return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      fontSize: ${JSON.stringify(fontObj, null, 2).replace(/\n/g, "\n      ")},\n      spacing: ${JSON.stringify(spaceObj, null, 2).replace(/\n/g, "\n      ")}\n    }\n  }\n};`;
    }

    if (exportFormat === "json") {
      const tokens = {
        typography: Object.fromEntries(scaleItems.map((i) => [i.token, { value: i.clampStr, minPx: +i.minPx.toFixed(2), maxPx: +i.maxPx.toFixed(2) }])),
        spacing: Object.fromEntries(spacingItems.map((s) => [s.token, { value: s.clampStr, minPx: +s.minPx.toFixed(2), maxPx: +s.maxPx.toFixed(2) }]))
      };
      return JSON.stringify(tokens, null, 2);
    }

    const typeLines = scaleItems.map((item) => `  --text-${item.token}: ${item.clampStr};`);
    const spaceLines = spacingItems.map((sp) => `  --space-${sp.token}: ${sp.clampStr};`);
    return `:root {\n  /* Fluid Typography (${minVw}px → ${maxVw}px) */\n${typeLines.join("\n")}\n\n  /* Fluid Spacing Tokens */\n${spaceLines.join("\n")}\n}`;
  }, [exportFormat, scaleItems, spacingItems, minVw, maxVw]);

  const handleCopySingle = (token, str) => {
    navigator.clipboard?.writeText(str);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const handleCopyAll = () => {
    navigator.clipboard?.writeText(exportCode);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  const getStepPx = (token) => {
    const found = scaleItems.find((i) => i.token === token);
    return found ? found.currentPx : 16;
  };

  return (
    <div className="type-studio-app">
      <header className="type-nav">
        <div className="type-nav-left">
          <button
            type="button"
            className="type-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="type-nav-title">Fluid Type & Spacing Studio</h1>
        </div>

        <div className="type-presets" role="radiogroup" aria-label="Scale Presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={activePreset === p.id}
              className={`type-preset-pill ${activePreset === p.id ? "is-active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="type-nav-right">
          <div className="type-unit-pills" role="group" aria-label="Output Unit">
            <button
              type="button"
              className={`type-unit-pill ${useRem ? "is-active" : ""}`}
              onClick={() => setUseRem(true)}
            >
              REM
            </button>
            <button
              type="button"
              className={`type-unit-pill ${!useRem ? "is-active" : ""}`}
              onClick={() => setUseRem(false)}
            >
              PX
            </button>
          </div>
        </div>
      </header>

      <main className="type-main">
        {/* Left Control Panel */}
        <aside className="type-panel" aria-label="Scale Parameters">
          <div className="type-panel-section">
            <div className="type-panel-heading">
              <span>Min Viewport (Mobile)</span>
              <span>{minVw}px</span>
            </div>

            <div className="type-control-row">
              <div className="type-control-label">
                <span>Viewport Width</span>
                <span className="type-control-val">{minVw}px</span>
              </div>
              <input
                type="range"
                min="320"
                max="640"
                step="5"
                value={minVw}
                onChange={(e) => {
                  setActivePreset("custom");
                  setMinVw(Number(e.target.value));
                }}
                className="type-slider"
              />
            </div>

            <div className="type-control-row">
              <div className="type-control-label">
                <span>Base Size</span>
                <span className="type-control-val">{minBase}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="22"
                step="0.5"
                value={minBase}
                onChange={(e) => {
                  setActivePreset("custom");
                  setMinBase(Number(e.target.value));
                }}
                className="type-slider"
              />
            </div>

            <div className="type-control-row">
              <div className="type-control-label">
                <span>Type Ratio</span>
                <span className="type-control-val">{minRatio}</span>
              </div>
              <select
                className="type-select"
                value={minRatio}
                onChange={(e) => {
                  setActivePreset("custom");
                  setMinRatio(Number(e.target.value));
                }}
              >
                {RATIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
                {!RATIOS.some((r) => r.value === minRatio) && (
                  <option value={minRatio}>{minRatio} — Custom</option>
                )}
              </select>
            </div>
          </div>

          <div className="type-divider" />

          <div className="type-panel-section">
            <div className="type-panel-heading">
              <span>Max Viewport (Desktop)</span>
              <span>{maxVw}px</span>
            </div>

            <div className="type-control-row">
              <div className="type-control-label">
                <span>Viewport Width</span>
                <span className="type-control-val">{maxVw}px</span>
              </div>
              <input
                type="range"
                min="960"
                max="1920"
                step="16"
                value={maxVw}
                onChange={(e) => {
                  setActivePreset("custom");
                  setMaxVw(Number(e.target.value));
                }}
                className="type-slider"
              />
            </div>

            <div className="type-control-row">
              <div className="type-control-label">
                <span>Base Size</span>
                <span className="type-control-val">{maxBase}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="26"
                step="0.5"
                value={maxBase}
                onChange={(e) => {
                  setActivePreset("custom");
                  setMaxBase(Number(e.target.value));
                }}
                className="type-slider"
              />
            </div>

            <div className="type-control-row">
              <div className="type-control-label">
                <span>Type Ratio</span>
                <span className="type-control-val">{maxRatio}</span>
              </div>
              <select
                className="type-select"
                value={maxRatio}
                onChange={(e) => {
                  setActivePreset("custom");
                  setMaxRatio(Number(e.target.value));
                }}
              >
                {RATIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
                {!RATIOS.some((r) => r.value === maxRatio) && (
                  <option value={maxRatio}>{maxRatio} — Custom</option>
                )}
              </select>
            </div>
          </div>
        </aside>

        {/* Right Preview & Export Stage */}
        <div className="type-stage-col">
          <section className="type-stage-card" aria-label="Interactive Scale Preview">
            <div className="type-stage-header">
              <div className="type-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "ladder"}
                  className={`type-tab-btn ${activeTab === "ladder" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("ladder")}
                >
                  Type Ladder
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "editorial"}
                  className={`type-tab-btn ${activeTab === "editorial" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("editorial")}
                >
                  Specimen
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "spacing"}
                  className={`type-tab-btn ${activeTab === "spacing" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("spacing")}
                >
                  Spacing Tokens
                </button>
              </div>

              <div className="type-vp-simulator">
                <span className="type-vp-label">
                  Simulate Viewport: <strong>{simVw}px</strong>
                </span>
                <input
                  type="range"
                  min={minVw}
                  max={maxVw}
                  value={Math.max(minVw, Math.min(maxVw, simVw))}
                  onChange={(e) => setSimVw(Number(e.target.value))}
                  className="type-slider"
                  style={{ width: "120px" }}
                />
              </div>
            </div>

            {activeTab === "ladder" && (
              <div className="type-ladder">
                {scaleItems.map((item) => (
                  <div key={item.token} className="type-step-row">
                    <div className="type-step-meta">
                      <span className="type-step-token">--text-{item.token}</span>
                      <span className="type-step-range">
                        {Math.round(item.minPx)}px → {Math.round(item.maxPx)}px ({item.currentPx.toFixed(1)}px)
                      </span>
                    </div>
                    <div
                      className="type-step-sample"
                      style={{ fontSize: `${item.currentPx}px` }}
                    >
                      {item.sample}
                    </div>
                    <button
                      type="button"
                      className="type-step-copy-btn"
                      onClick={() => handleCopySingle(item.token, item.clampStr)}
                      title={item.clampStr}
                    >
                      {copiedToken === item.token ? "Copied ✓" : "Copy clamp()"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "editorial" && (
              <div className="type-editorial-preview">
                <span
                  className="type-editorial-kicker"
                  style={{ fontSize: `${getStepPx("xs")}px` }}
                >
                  Design Systems · Fluid Typography
                </span>
                <h2
                  className="type-editorial-h1"
                  style={{ fontSize: `${getStepPx("3xl")}px` }}
                >
                   Proportional harmony across every screen dimension.
                </h2>
                <p
                  className="type-editorial-lead"
                  style={{ fontSize: `${getStepPx("lg")}px` }}
                >
                  Instead of snapping awkwardly at arbitrary media query breakpoints, fluid scales interpolate smoothly between mobile and desktop viewports.
                </p>
                <h3
                  className="type-editorial-h2"
                  style={{ fontSize: `${getStepPx("xl")}px` }}
                >
                  Mathematical Precision with CSS clamp()
                </h3>
                <p
                  className="type-editorial-body"
                  style={{ fontSize: `${getStepPx("base")}px` }}
                >
                  By anchoring a modest modular ratio on small handsets and expanding into a more expressive typographic hierarchy on wide monitors, interfaces maintain both legibility and editorial presence without manual overrides.
                </p>
              </div>
            )}

            {activeTab === "spacing" && (
              <div className="type-spacing-list">
                {spacingItems.map((sp) => (
                  <div key={sp.token} className="type-spacing-row">
                    <span className="type-step-token">--space-{sp.token}</span>
                    <span className="type-step-range">
                      {Math.round(sp.minPx)}px → {Math.round(sp.maxPx)}px
                    </span>
                    <div className="type-spacing-bar-wrap">
                      <div
                        className="type-spacing-bar"
                        style={{ width: `${Math.min(100, (sp.currentPx / 96) * 100)}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      className="type-step-copy-btn"
                      onClick={() => handleCopySingle(`sp-${sp.token}`, sp.clampStr)}
                      title={sp.clampStr}
                    >
                      {copiedToken === `sp-${sp.token}` ? "Copied ✓" : `${sp.currentPx.toFixed(1)}px`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Code Export */}
          <section className="type-export-card" aria-label="Export Tokens">
            <div className="type-export-top">
              <div className="type-export-formats" role="tablist">
                {[
                  { id: "css", label: "CSS Custom Properties" },
                  { id: "tailwind", label: "Tailwind Config" },
                  { id: "json", label: "JSON Design Tokens" }
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    className={`type-format-pill ${exportFormat === fmt.id ? "is-active" : ""}`}
                    onClick={() => setExportFormat(fmt.id)}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="type-copy-all-btn"
                onClick={handleCopyAll}
              >
                {copiedAll ? "Copied Tokens ✓" : "Copy All Tokens"}
              </button>
            </div>

            <pre className="type-code-pre">
              <code>{exportCode}</code>
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}

import { useMemo, useState } from "react";
import "./OklchLabApp.css";

const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const COLOR_PRESETS = [
  { id: "cobalt", name: "Cobalt", hue: 258, chroma: 0.19, shift: -6, curve: "parabolic" },
  { id: "vermilion", name: "Vermilion", hue: 28, chroma: 0.21, shift: 8, curve: "parabolic" },
  { id: "emerald", name: "Emerald", hue: 156, chroma: 0.17, shift: -5, curve: "parabolic" },
  { id: "amber", name: "Amber", hue: 78, chroma: 0.17, shift: 10, curve: "parabolic" },
  { id: "iris", name: "Iris", hue: 292, chroma: 0.18, shift: -8, curve: "parabolic" },
  { id: "slate", name: "Slate", hue: 250, chroma: 0.03, shift: 0, curve: "flat" }
];

const CURVE_MODES = [
  { id: "parabolic", label: "Natural" },
  { id: "vivid", label: "Vivid" },
  { id: "pastel", label: "Soft" },
  { id: "flat", label: "Uniform" }
];

const EXPORT_FORMATS = [
  { id: "oklch-css", label: "CSS (OKLCH)" },
  { id: "hex-css", label: "CSS (HEX)" },
  { id: "tailwind", label: "Tailwind" },
  { id: "json", label: "JSON Tokens" }
];

// Accurate OKLCH (L in 0..1, C in 0..0.4, H in 0..360) -> sRGB [0..255] + gamut check
function oklchToSrgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const toGamma = (c) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const inGamut =
    rLin >= -0.002 &&
    rLin <= 1.002 &&
    gLin >= -0.002 &&
    gLin <= 1.002 &&
    bLin >= -0.002 &&
    bLin <= 1.002;

  const r = Math.round(toGamma(rLin) * 255);
  const g = Math.round(toGamma(gLin) * 255);
  const bVal = Math.round(toGamma(bLin) * 255);

  const toHex = (n) => n.toString(16).padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(bVal)}`.toUpperCase();

  const lumChannel = (v) => {
    const srgb = v / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * lumChannel(r) + 0.7152 * lumChannel(g) + 0.0722 * lumChannel(bVal);

  return { r, g, b: bVal, hex, luminance, inGamut };
}

function getGamutSafeOklch(L, targetC, H) {
  const initial = oklchToSrgb(L, targetC, H);
  if (initial.inGamut) {
    return { L, C: targetC, H, ...initial };
  }
  let low = 0;
  let high = targetC;
  let bestC = 0;
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2;
    const test = oklchToSrgb(L, mid, H);
    if (test.inGamut) {
      bestC = mid;
      low = mid;
    } else {
      high = mid;
    }
  }
  const finalRgb = oklchToSrgb(L, bestC, H);
  return { L, C: bestC, H, ...finalRgb };
}

function getWcagContrast(lum1, lum2) {
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

function getApcaLc(textLum, bgLum) {
  const txtY = Math.pow(Math.max(textLum, 0), 0.57);
  const bgY = Math.pow(Math.max(bgLum, 0), 0.56);
  const raw = (bgY - txtY) * 1.14 * 100;
  return Math.round(Math.abs(raw));
}

// Convert #RRGGBB or #RGB to OKLCH { L, C, H }
function hexToOklch(hexStr) {
  const clean = hexStr.trim().replace(/^#/, "");
  let fullHex = clean;
  if (clean.length === 3) {
    fullHex = clean
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) return null;

  const r8 = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g8 = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b8 = parseInt(fullHex.slice(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bOk * bOk);
  const H = ((Math.atan2(bOk, a) * 180) / Math.PI + 360) % 360;

  return {
    L: Math.max(0.05, Math.min(0.99, L)),
    C: Math.max(0, Math.min(0.32, C)),
    H: Math.round(H),
    hex: `#${fullHex.toUpperCase()}`
  };
}

const DEFAULT_LIGHTNESS_MAP = {
  standard: [0.975, 0.94, 0.88, 0.8, 0.71, 0.62, 0.53, 0.44, 0.35, 0.25, 0.17],
  high: [0.985, 0.95, 0.89, 0.81, 0.72, 0.62, 0.52, 0.42, 0.32, 0.22, 0.13],
  soft: [0.96, 0.92, 0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3, 0.22]
};

function getChromaFactor(t, curveMode) {
  if (curveMode === "parabolic") {
    return Math.sin(Math.PI * Math.pow(t, 0.88)) * 0.92 + 0.08;
  }
  if (curveMode === "vivid") {
    return Math.sin(Math.PI * t) * 0.78 + 0.28;
  }
  if (curveMode === "pastel") {
    return (Math.sin(Math.PI * t) * 0.6 + 0.15) * 0.65;
  }
  return 0.75;
}

export default function OklchLabApp({ onNavigateHome }) {
  const [paletteName, setPaletteName] = useState("cobalt");
  const [hue, setHue] = useState(258);
  const [peakChroma, setPeakChroma] = useState(0.19);
  const [hueShift, setHueShift] = useState(-6);
  const [curveMode, setCurveMode] = useState("parabolic");
  const [contrastSpan, setContrastSpan] = useState("standard");

  // Base color + anchor stop state
  const [baseStop, setBaseStop] = useState(500);
  const [anchorL, setAnchorL] = useState(null); // When set, pins baseStop lightness to anchorL
  const [hexInput, setHexInput] = useState(() => oklchToSrgb(0.62, 0.19, 258).hex);

  const [selectedStep, setSelectedStep] = useState(500);
  const [compareBgStep, setCompareBgStep] = useState(50);
  const [previewTheme, setPreviewTheme] = useState("light");
  const [activeTab, setActiveTab] = useState("components"); // components | pair | matrix | tokens
  const [exportFormat, setExportFormat] = useState("oklch-css");
  const [copiedSwatch, setCopiedSwatch] = useState(null);
  const [copiedValueType, setCopiedValueType] = useState(null);
  const [copiedExport, setCopiedExport] = useState(false);

  const applyPreset = (preset) => {
    setPaletteName(preset.id);
    setHue(preset.hue);
    setPeakChroma(preset.chroma);
    setHueShift(preset.shift);
    setCurveMode(preset.curve);
    setBaseStop(500);
    setAnchorL(null);
    setSelectedStep(500);
    setHexInput(oklchToSrgb(0.62, preset.chroma, preset.hue).hex);
  };

  // Apply a user-entered Base Color and anchor it to targetStop
  const applyBaseColorHex = (rawHex, targetStop = baseStop) => {
    setHexInput(rawHex);
    const parsed = hexToOklch(rawHex);
    if (!parsed) return;

    const stopIdx = SCALE_STEPS.indexOf(targetStop);
    const tAnchor = stopIdx >= 0 ? stopIdx / (SCALE_STEPS.length - 1) : 0.5;
    const factorAtAnchor = Math.max(0.12, getChromaFactor(tAnchor, curveMode));

    setPaletteName("custom");
    setHue(parsed.H);
    setPeakChroma(Math.min(0.32, parsed.C / factorAtAnchor));
    setAnchorL(parsed.L);
    setSelectedStep(targetStop);
  };

  const handleBaseStopChange = (newStop) => {
    const numericStop = Number(newStop);
    setBaseStop(numericStop);
    setSelectedStep(numericStop);
    const parsed = hexToOklch(hexInput);
    if (parsed) {
      const stopIdx = SCALE_STEPS.indexOf(numericStop);
      const tAnchor = stopIdx >= 0 ? stopIdx / (SCALE_STEPS.length - 1) : 0.5;
      const factorAtAnchor = Math.max(0.12, getChromaFactor(tAnchor, curveMode));
      setPeakChroma(Math.min(0.32, parsed.C / factorAtAnchor));
      setAnchorL(parsed.L);
    }
  };

  const handleAutoDetectStop = () => {
    const parsed = hexToOklch(hexInput);
    if (!parsed) return;
    const refLightness = DEFAULT_LIGHTNESS_MAP[contrastSpan];
    let bestIdx = 5;
    let minDiff = Infinity;
    refLightness.forEach((lVal, idx) => {
      const diff = Math.abs(lVal - parsed.L);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });
    const bestStop = SCALE_STEPS[bestIdx];
    setBaseStop(bestStop);
    applyBaseColorHex(parsed.hex, bestStop);
  };

  const scale = useMemo(() => {
    const baseLightness = DEFAULT_LIGHTNESS_MAP[contrastSpan];
    const anchorIdx = SCALE_STEPS.indexOf(baseStop);
    const tAnchor = anchorIdx >= 0 ? anchorIdx / (SCALE_STEPS.length - 1) : 0.5;

    return SCALE_STEPS.map((step, idx) => {
      const t = idx / (SCALE_STEPS.length - 1);

      // Compute lightness L, smoothly interpolated around anchorL at anchorIdx if set
      let L = baseLightness[idx];
      if (anchorL !== null && anchorIdx >= 0) {
        if (idx === anchorIdx) {
          L = anchorL;
        } else if (idx < anchorIdx) {
          const maxL = Math.max(baseLightness[0], Math.min(0.99, anchorL + 0.04));
          const ratio = idx / anchorIdx;
          L = maxL - ratio * (maxL - anchorL);
        } else {
          const minL = Math.min(baseLightness[SCALE_STEPS.length - 1], Math.max(0.06, anchorL - 0.04));
          const ratio = (idx - anchorIdx) / (SCALE_STEPS.length - 1 - anchorIdx);
          L = anchorL - ratio * (anchorL - minL);
        }
      }

      const chromaFactor = getChromaFactor(t, curveMode);
      const rawC = Math.max(0, peakChroma * chromaFactor);
      const stepHue = (hue + (t - tAnchor) * 2 * hueShift + 360) % 360;
      const color = getGamutSafeOklch(L, rawC, stepHue);
      const oklchCss = `oklch(${(color.L * 100).toFixed(1)}% ${color.C.toFixed(3)} ${color.H.toFixed(1)})`;
      const rgbCss = `rgb(${color.r}, ${color.g}, ${color.b})`;

      return {
        step,
        ...color,
        oklchCss,
        rgbCss
      };
    });
  }, [hue, peakChroma, hueShift, curveMode, contrastSpan, baseStop, anchorL]);

  const scaleMap = useMemo(() => {
    const map = {};
    scale.forEach((s) => {
      map[s.step] = s;
    });
    return map;
  }, [scale]);

  const activeStop = scaleMap[selectedStep] || scale[5];
  const bgStop = scaleMap[compareBgStep] || scale[0];
  const currentBaseStopColor = scaleMap[baseStop] || scale[5];

  const activeWcag = getWcagContrast(activeStop.luminance, bgStop.luminance);
  const activeApca = getApcaLc(activeStop.luminance, bgStop.luminance);

  const cssVarsStyle = useMemo(() => {
    const vars = {};
    scale.forEach((s) => {
      vars[`--c-${s.step}`] = s.hex;
    });
    return vars;
  }, [scale]);

  const getExportString = () => {
    if (exportFormat === "hex-css") {
      return `:root {\n${scale
        .map((s) => `  --color-${paletteName}-${s.step}: ${s.hex};`)
        .join("\n")}\n}`;
    }
    if (exportFormat === "tailwind") {
      return `@theme {\n${scale
        .map((s) => `  --color-${paletteName}-${s.step}: ${s.oklchCss};`)
        .join("\n")}\n}`;
    }
    if (exportFormat === "json") {
      const obj = {};
      scale.forEach((s) => {
        obj[s.step] = { hex: s.hex, oklch: s.oklchCss };
      });
      return JSON.stringify({ [paletteName]: obj }, null, 2);
    }
    return `:root {\n${scale
      .map((s) => `  --color-${paletteName}-${s.step}: ${s.oklchCss};`)
      .join("\n")}\n}`;
  };

  const handleCopySwatch = (stop) => {
    setSelectedStep(stop.step);
    navigator.clipboard?.writeText(stop.hex);
    setCopiedSwatch(stop.step);
    setTimeout(() => setCopiedSwatch(null), 1400);
  };

  const handleCopyStopValue = (type, val) => {
    navigator.clipboard?.writeText(val);
    setCopiedValueType(type);
    setTimeout(() => setCopiedValueType(null), 1400);
  };

  const handleCopyExport = () => {
    navigator.clipboard?.writeText(getExportString());
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 1800);
  };

  return (
    <div className="oklch-studio-root" style={cssVarsStyle}>
      {/* Minimal Header (Matches Spring Tuner Header Structure) */}
      <header className="oklch-nav">
        <div className="oklch-nav-left">
          <button
            type="button"
            id="oklch-back-home"
            className="oklch-back-link"
            onClick={onNavigateHome}
          >
            ← iliash.me
          </button>
          <span className="oklch-nav-title">Palette & Contrast</span>
        </div>

        <div className="oklch-presets-row" role="group" aria-label="Color presets">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              id={`oklch-preset-${p.id}`}
              className={`oklch-preset-pill ${paletteName === p.id ? "is-active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              <span
                className="preset-color-dot"
                style={{ backgroundColor: oklchToSrgb(0.62, p.chroma, p.hue).hex }}
              />
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        <div className="oklch-nav-right">
          <div className="oklch-span-pills" role="group" aria-label="Lightness contrast span">
            {[
              { id: "soft", label: "Soft" },
              { id: "standard", label: "Standard" },
              { id: "high", label: "High" }
            ].map((sp) => (
              <button
                key={sp.id}
                type="button"
                className={`oklch-mini-pill ${contrastSpan === sp.id ? "is-active" : ""}`}
                onClick={() => setContrastSpan(sp.id)}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Studio Container */}
      <main className="oklch-container oklch-main">
        {/* 1. Top 11-Stop Swatch Strip */}
        <section className="oklch-swatch-strip-card" aria-label="Generated 50 to 950 color scale">
          <div className="oklch-strip-header">
            <span className="oklch-section-label">Color Scale (50 – 950)</span>
            <span className="oklch-hint-text">Click any stop to inspect & copy HEX</span>
          </div>

          <div className="oklch-swatches-grid">
            {scale.map((s) => {
              const isDarkTile = s.L < 0.6;
              const whiteRatio = getWcagContrast(s.luminance, 1.0);
              const darkRatio = getWcagContrast(s.luminance, scaleMap[950].luminance);
              const displayRatio = isDarkTile ? whiteRatio : darkRatio;
              const isBaseAnchor = baseStop === s.step;

              return (
                <button
                  key={s.step}
                  type="button"
                  id={`swatch-stop-${s.step}`}
                  className={`oklch-swatch-tile ${selectedStep === s.step ? "is-selected" : ""} ${
                    isDarkTile ? "is-dark-text" : "is-light-text"
                  }`}
                  style={{ backgroundColor: s.hex }}
                  onClick={() => handleCopySwatch(s)}
                >
                  <div className="swatch-tile-top">
                    <span className="swatch-step-num">
                      {s.step}
                      {isBaseAnchor && <span className="swatch-base-pin" title="Base stop">●</span>}
                    </span>
                    <span className="swatch-contrast-tag">{displayRatio.toFixed(1)}:1</span>
                  </div>
                  <div className="swatch-tile-bottom">
                    <span className="swatch-hex-code">
                      {copiedSwatch === s.step ? "COPIED" : s.hex}
                    </span>
                    <span className="swatch-lch-micro">
                      L{Math.round(s.L * 100)} C{s.C.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Middle Two-Column Workbench */}
        <div className="oklch-workbench-grid">
          {/* LEFT: Base Color + Scale Parameters + Selected Stop Readout */}
          <section className="oklch-card oklch-controls-card" aria-label="Scale parameters">
            {/* Base Color & Stop Generator Box */}
            <div className="base-color-generator-box">
              <div className="base-gen-header">
                <span className="oklch-section-label">Base Color & Stop</span>
                <button
                  type="button"
                  className="base-auto-btn"
                  onClick={handleAutoDetectStop}
                  title="Automatically assign this color to its closest natural lightness stop"
                >
                  Auto-Fit Stop
                </button>
              </div>

              <div className="base-gen-controls">
                <label className="base-color-picker-wrap" title="Pick base color">
                  <input
                    type="color"
                    id="base-color-native-picker"
                    value={currentBaseStopColor.hex}
                    onChange={(e) => applyBaseColorHex(e.target.value, baseStop)}
                    aria-label="Pick base color"
                  />
                  <span
                    className="base-color-swatch-preview"
                    style={{ backgroundColor: currentBaseStopColor.hex }}
                  />
                </label>

                <input
                  type="text"
                  id="base-color-hex-input"
                  className="base-hex-input"
                  value={hexInput}
                  onChange={(e) => applyBaseColorHex(e.target.value, baseStop)}
                  placeholder="#2563EB"
                  maxLength={7}
                  aria-label="Base color HEX"
                />

                <div className="base-stop-select-wrap">
                  <span className="base-stop-prefix">Stop</span>
                  <select
                    id="base-color-stop-select"
                    className="base-stop-select"
                    value={baseStop}
                    onChange={(e) => handleBaseStopChange(e.target.value)}
                    aria-label="Assign base color to stop"
                  >
                    {SCALE_STEPS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="oklch-card-head">
              <span className="oklch-section-label">Parameters</span>
              <div className="oklch-curve-pills">
                {CURVE_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`oklch-mini-pill ${curveMode === m.id ? "is-active" : ""}`}
                    onClick={() => setCurveMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="oklch-sliders-group">
              <label className="oklch-slider-row">
                <div className="slider-row-head">
                  <span>Hue (H)</span>
                  <code>{hue}°</code>
                </div>
                <input
                  type="range"
                  className="oklch-hue-range"
                  min="0"
                  max="360"
                  step="1"
                  value={hue}
                  onChange={(e) => {
                    const nextH = Number(e.target.value);
                    setPaletteName("custom");
                    setHue(nextH);
                    setHexInput(oklchToSrgb(currentBaseStopColor.L, currentBaseStopColor.C, nextH).hex);
                  }}
                />
              </label>

              <label className="oklch-slider-row">
                <div className="slider-row-head">
                  <span>Peak Chroma (C)</span>
                  <code>{peakChroma.toFixed(3)}</code>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.30"
                  step="0.005"
                  value={peakChroma}
                  onChange={(e) => {
                    const nextC = Number(e.target.value);
                    setPaletteName("custom");
                    setPeakChroma(nextC);
                  }}
                />
              </label>

              <label className="oklch-slider-row">
                <div className="slider-row-head">
                  <span>Hue Rotation (ΔH)</span>
                  <code>{hueShift > 0 ? `+${hueShift}°` : `${hueShift}°`}</code>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={hueShift}
                  onChange={(e) => {
                    setPaletteName("custom");
                    setHueShift(Number(e.target.value));
                  }}
                />
              </label>
            </div>

            {/* Clean Active Stop Inspector Card */}
            <div className="active-stop-box">
              <div className="active-stop-header">
                <div className="active-stop-title-row">
                  <span
                    className="active-stop-Chip-swatch"
                    style={{ backgroundColor: activeStop.hex }}
                  />
                  <div>
                    <strong className="active-stop-name">
                      Stop {activeStop.step}
                    </strong>
                    <span className="active-stop-gamut">sRGB Gamut Safe</span>
                  </div>
                </div>
                <span className="active-stop-lum">
                  Lum {(activeStop.luminance * 100).toFixed(1)}%
                </span>
              </div>

              <div className="active-stop-values-list">
                {[
                  { key: "hex", label: "HEX", val: activeStop.hex },
                  { key: "oklch", label: "OKLCH", val: activeStop.oklchCss },
                  { key: "rgb", label: "RGB", val: activeStop.rgbCss }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="active-stop-copy-row"
                    onClick={() => handleCopyStopValue(item.key, item.val)}
                  >
                    <span className="stop-val-label">{item.label}</span>
                    <code className="stop-val-code">{item.val}</code>
                    <span className="stop-val-action">
                      {copiedValueType === item.key ? "Copied ✓" : "Copy"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT: Realistic UI Components, Contrast Pair Lab, Matrix, Tokens */}
          <section className="oklch-card oklch-preview-card" aria-label="Realistic UI preview">
            <div className="oklch-card-head">
              <div className="oklch-view-tabs" role="tablist">
                {[
                  { id: "components", label: "UI Components" },
                  { id: "pair", label: "Pair Contrast" },
                  { id: "matrix", label: "Matrix" },
                  { id: "tokens", label: "Tokens" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`oklch-tab-pill ${activeTab === tab.id ? "is-active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="oklch-theme-switch" role="group" aria-label="Preview surface theme">
                <button
                  type="button"
                  className={`oklch-mini-pill ${previewTheme === "light" ? "is-active" : ""}`}
                  onClick={() => setPreviewTheme("light")}
                >
                  Light UI
                </button>
                <button
                  type="button"
                  className={`oklch-mini-pill ${previewTheme === "dark" ? "is-active" : ""}`}
                  onClick={() => setPreviewTheme("dark")}
                >
                  Dark UI
                </button>
              </div>
            </div>

            {/* Stage */}
            <div className={`oklch-stage ${previewTheme === "dark" ? "is-dark-ui" : "is-light-ui"}`}>
              {activeTab === "components" && (
                <div className="min-preview-card">
                  <div className="min-preview-top">
                    <div className="min-preview-brand">
                      <span className="min-preview-dot" />
                      <div>
                        <h3 className="min-preview-title">Interface Specimen</h3>
                        <span className="min-preview-sub">Live scale binding</span>
                      </div>
                    </div>
                    <span className="min-preview-badge">v2.4</span>
                  </div>

                  <p className="min-preview-text">
                    Surfaces, borders, badges, and actions adapt automatically across light and dark
                    modes.
                  </p>

                  <div className="min-preview-tags">
                    <span className="min-tag">Surface {previewTheme === "light" ? "50" : "900"}</span>
                    <span className="min-tag">Border {previewTheme === "light" ? "200" : "800"}</span>
                    <span className="min-tag is-accent">Accent 600</span>
                  </div>

                  <div className="min-preview-footer">
                    <button type="button" className="min-btn-secondary">
                      Dismiss
                    </button>
                    <button type="button" className="min-btn-primary">
                      Apply Palette
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "pair" && (
                <div className="pair-stage-panel">
                  <div className="pair-selectors-grid">
                    <div className="pair-selector-row">
                      <span className="pair-select-label">Text</span>
                      <div className="pair-step-chips">
                        {SCALE_STEPS.map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={`pair-chip ${selectedStep === st ? "is-active" : ""}`}
                            onClick={() => setSelectedStep(st)}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pair-selector-row">
                      <span className="pair-select-label">Surface</span>
                      <div className="pair-step-chips">
                        {SCALE_STEPS.map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={`pair-chip ${compareBgStep === st ? "is-active" : ""}`}
                            onClick={() => setCompareBgStep(st)}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    className="pair-live-specimen"
                    style={{
                      backgroundColor: bgStop.hex,
                      color: activeStop.hex,
                      borderColor: scaleMap[compareBgStep < 500 ? 200 : 800].hex
                    }}
                  >
                    <div className="specimen-top-row">
                      <span className="specimen-tag">
                        {selectedStep} on {compareBgStep}
                      </span>
                      <div className="pair-badges">
                        <span className="pair-metric-pill">
                          {activeWcag.toFixed(2)}:1{" "}
                          {activeWcag >= 7
                            ? "AAA"
                            : activeWcag >= 4.5
                            ? "AA"
                            : activeWcag >= 3
                            ? "AA+"
                            : "Fail"}
                        </span>
                        <span className="pair-metric-pill">Lc {activeApca}</span>
                      </div>
                    </div>
                    <h4 className="specimen-headline">Aa — Clean Typographic Contrast</h4>
                    <p className="specimen-paragraph">
                      4.5:1+ (Lc 60+) recommended for body copy; 3.0:1+ for headings and icons.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "matrix" && (
                <div className="oklch-matrix-view">
                  <div className="matrix-grid">
                    {[
                      { fg: 950, bg: 50, role: "Body on Light" },
                      { fg: 700, bg: 100, role: "Badge on Tint" },
                      { fg: 50, bg: 600, role: "Primary Button" },
                      { fg: 50, bg: 950, role: "Body on Dark" },
                      { fg: 200, bg: 900, role: "Muted on Dark" },
                      { fg: 300, bg: 900, role: "Accent on Dark" }
                    ].map((pair, idx) => {
                      const fgS = scaleMap[pair.fg];
                      const bgS = scaleMap[pair.bg];
                      const ratio = getWcagContrast(fgS.luminance, bgS.luminance);
                      const passLevel = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "AA+";

                      return (
                        <div
                          key={idx}
                          className="matrix-pair-card"
                          style={{ backgroundColor: bgS.hex, color: fgS.hex }}
                        >
                          <div className="matrix-pair-top">
                            <span>
                              {pair.fg} / {pair.bg}
                            </span>
                            <span className="matrix-pair-badge">
                              {ratio.toFixed(1)}:1 {passLevel}
                            </span>
                          </div>
                          <div className="matrix-pair-role">{pair.role}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "tokens" && (
                <div className="oklch-tokens-list">
                  {[
                    { name: "bg-canvas", light: 50, dark: 950, desc: "Canvas" },
                    { name: "bg-surface", light: 100, dark: 900, desc: "Card surface" },
                    { name: "border", light: 200, dark: 800, desc: "Hairline border" },
                    { name: "accent", light: 600, dark: 500, desc: "Primary fill" },
                    { name: "text-muted", light: 700, dark: 300, desc: "Secondary text" },
                    { name: "text-primary", light: 950, dark: 50, desc: "Primary text" }
                  ].map((tok) => {
                    const activeStepNum = previewTheme === "light" ? tok.light : tok.dark;
                    const s = scaleMap[activeStepNum];
                    return (
                      <div key={tok.name} className="token-row-item">
                        <div className="token-row-left">
                          <span
                            className="token-swatch-circle"
                            style={{ backgroundColor: s.hex }}
                          />
                          <code className="token-name">--{tok.name}</code>
                          <span className="token-desc">{tok.desc}</span>
                        </div>
                        <div className="token-row-right">
                          <span className="token-step-badge">{activeStepNum}</span>
                          <code className="token-hex">{s.hex}</code>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 3. Restructured Bottom Export Card */}
        <section className="oklch-export-card" aria-label="Export color scale">
          <div className="oklch-export-header">
            <div className="oklch-export-header-left">
              <span className="oklch-section-label">Export Palette</span>
              <div className="oklch-export-tabs" role="tablist">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    role="tab"
                    aria-selected={exportFormat === fmt.id}
                    className={`oklch-export-tab ${exportFormat === fmt.id ? "is-active" : ""}`}
                    onClick={() => setExportFormat(fmt.id)}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              id="oklch-copy-export-btn"
              className={`oklch-copy-btn ${copiedExport ? "is-copied" : ""}`}
              onClick={handleCopyExport}
            >
              {copiedExport ? "Copied All 11 Stops ✓" : "Copy Code"}
            </button>
          </div>

          <div className="oklch-export-tokens-grid">
            {scale.map((s) => {
              const displayValue =
                exportFormat === "hex-css" || exportFormat === "json" ? s.hex : s.oklchCss;
              return (
                <button
                  key={s.step}
                  type="button"
                  className="export-token-chip"
                  onClick={() => handleCopySwatch(s)}
                  title={`Click to copy ${displayValue}`}
                >
                  <span
                    className="export-chip-dot"
                    style={{ backgroundColor: s.hex }}
                  />
                  <span className="export-chip-name">
                    --{paletteName}-{s.step}
                  </span>
                  <code className="export-chip-val">{displayValue}</code>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

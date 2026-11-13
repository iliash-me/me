import { useState } from "react";

const SHOWCASE_VARIATIONS = [
  { name: "Nexora", role: "HTML Site Template", hue: "hsl(34, 78%, 58%)", surface: "#131722" },
  { name: "Vantage", role: "Admin Dashboard", hue: "hsl(198, 76%, 52%)", surface: "#0f1722" },
  { name: "Aurelia", role: "Editorial Theme", hue: "hsl(12, 72%, 58%)", surface: "#1b1416" },
  { name: "Stockly", role: "POS & Inventory", hue: "hsl(156, 58%, 46%)", surface: "#0e1a16" },
  { name: "Replyo", role: "Automation Suite", hue: "hsl(174, 62%, 45%)", surface: "#0e191b" }
];

const PERSONAS = [
  { name: "Tariq Rahman", region: "Dhaka, BD", role: "Staff UI Engineer", locale: "bn_BD" },
  { name: "Clara Lindqvist", region: "Stockholm, SE", role: "Design Systems Lead", locale: "sv_SE" },
  { name: "Kenji Takahashi", region: "Tokyo, JP", role: "Creative Technologist", locale: "ja_JP" },
  { name: "Elena Rostova", region: "Berlin, DE", role: "Graphics Programmer", locale: "de_DE" },
  { name: "Mateo Valdés", region: "Madrid, ES", role: "Product Designer", locale: "es_ES" }
];

const AI_CATEGORIES = [
  { tag: "3D & Spatial", tool: "img2threejs", note: "Procedural Three.js mesh synthesis from 2D refs" },
  { tag: "UI Engineering", tool: "Token Compiler", note: "Semantic CSS custom property pipeline" },
  { tag: "Code Audit", tool: "AST Verifier", note: "Deterministic static analysis & bundle budget" }
];

export default function InteractiveProjectPreview({ previewType, projectId }) {
  // 1. Wireframe 3D state (img2threejs)
  const [rotY, setRotY] = useState(28);
  const [meshPreset, setMeshPreset] = useState("octa");

  // 2. Theme Matrix state (Showcase Suite)
  const [activeThemeIdx, setActiveThemeIdx] = useState(0);

  // 3. Telemetry HUD state (Mario-Kart-3.js)
  const [turboActive, setTurboActive] = useState(false);

  // 4. Identity Generator state (uinames)
  const [personaIdx, setPersonaIdx] = useState(0);
  const [copiedPersona, setCopiedPersona] = useState(false);

  // 5. AI Directory state
  const [selectedCategory, setSelectedCategory] = useState(0);

  if (previewType === "wireframe-3d") {
    const presets = {
      octa: { label: "Octahedral Rig", vertices: 148, tokens: "1.1k", scale: 1 },
      lattice: { label: "Procedural Turret", vertices: 312, tokens: "1.8k", scale: 1.08 },
      rotor: { label: "Articulated Drone", vertices: 420, tokens: "2.3k", scale: 0.96 }
    };
    const current = presets[meshPreset];

    return (
      <div className="preview-widget" aria-label="Interactive Three.js procedural preview">
        <div className="preview-toolbar">
          <span className="preview-badge">PROCEDURAL MESH INSPECTOR</span>
          <div className="preview-PresetGroup">
            {Object.keys(presets).map((key) => (
              <button
                key={key}
                type="button"
                id={`mesh-preset-${projectId}-${key}`}
                className={`preview-chip ${meshPreset === key ? "is-active" : ""}`}
                onClick={() => setMeshPreset(key)}
              >
                {presets[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="wireframe-stage">
          <svg
            viewBox="0 0 260 140"
            className="wireframe-svg"
            style={{
              transform: `perspective(500px) rotateY(${rotY}deg) scale(${current.scale})`
            }}
          >
            <g stroke="currentColor" strokeWidth="1.25" fill="none">
              {meshPreset === "octa" && (
                <>
                  <polygon points="130,16 205,70 130,124 55,70" strokeOpacity="0.85" />
                  <polygon points="130,16 175,70 130,124 85,70" strokeOpacity="0.45" />
                  <line x1="55" y1="70" x2="205" y2="70" strokeOpacity="0.65" />
                  <line x1="130" y1="16" x2="130" y2="124" strokeOpacity="0.5" />
                  <circle cx="130" cy="16" r="3" fill="var(--accent-warm)" />
                  <circle cx="205" cy="70" r="3" fill="var(--accent-warm)" />
                  <circle cx="55" cy="70" r="3" fill="var(--accent-warm)" />
                  <circle cx="130" cy="124" r="3" fill="var(--accent-warm)" />
                </>
              )}
              {meshPreset === "lattice" && (
                <>
                  <rect x="75" y="28" width="110" height="84" rx="4" strokeOpacity="0.7" />
                  <polygon points="130,14 198,52 198,98 130,126 62,98 62,52" strokeOpacity="0.85" />
                  <line x1="62" y1="52" x2="198" y2="98" strokeOpacity="0.35" />
                  <line x1="198" y1="52" x2="62" y2="98" strokeOpacity="0.35" />
                  <circle cx="130" cy="70" r="18" stroke="var(--accent-warm)" strokeOpacity="0.9" />
                </>
              )}
              {meshPreset === "rotor" && (
                <>
                  <ellipse cx="130" cy="70" rx="76" ry="30" strokeOpacity="0.8" />
                  <ellipse cx="130" cy="70" rx="32" ry="52" strokeOpacity="0.55" />
                  <line x1="54" y1="70" x2="206" y2="70" strokeOpacity="0.4" />
                  <circle cx="130" cy="70" r="8" fill="var(--accent-warm)" />
                </>
              )}
            </g>
          </svg>
        </div>

        <div className="preview-footer-bar">
          <label className="preview-slider-label" htmlFor={`azimuth-slider-${projectId}`}>
            <span>AZIMUTH: {rotY}°</span>
            <input
              id={`azimuth-slider-${projectId}`}
              type="range"
              min="-60"
              max="60"
              value={rotY}
              onChange={(e) => setRotY(Number(e.target.value))}
            />
          </label>
          <div className="preview-readout">
            <span>VERTS: {current.vertices}</span>
            <span>TOKENS: {current.tokens}</span>
          </div>
        </div>
      </div>
    );
  }

  if (previewType === "theme-matrix") {
    const activeTheme = SHOWCASE_VARIATIONS[activeThemeIdx];
    return (
      <div className="preview-widget" aria-label="Interactive multi-theme token customizer">
        <div className="preview-toolbar">
          <span className="preview-badge">LIVE TOKEN ENGINE</span>
          <div className="preview-PresetGroup">
            {SHOWCASE_VARIATIONS.map((item, idx) => (
              <button
                key={item.name}
                type="button"
                id={`showcase-var-${projectId}-${item.name.toLowerCase()}`}
                className={`preview-chip ${activeThemeIdx === idx ? "is-active" : ""}`}
                onClick={() => setActiveThemeIdx(idx)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div
          className="theme-matrix-stage"
          style={{
            backgroundColor: activeTheme.surface,
            borderColor: activeTheme.hue
          }}
        >
          <div className="theme-matrix-header">
            <span className="theme-dot" style={{ backgroundColor: activeTheme.hue }} />
            <strong style={{ color: "#f4f2ed", fontSize: "0.85rem" }}>{activeTheme.name}</strong>
            <span className="theme-role-tag">{activeTheme.role}</span>
          </div>
          <div className="theme-matrix-bars">
            <div className="theme-bar-primary" style={{ backgroundColor: activeTheme.hue, width: "68%" }} />
            <div className="theme-bar-muted" style={{ width: "88%" }} />
            <div className="theme-bar-muted" style={{ width: "52%" }} />
          </div>
        </div>

        <div className="preview-footer-bar">
          <span>--brand-accent: {activeTheme.hue}</span>
          <span>0 EXTERNAL DEPS</span>
        </div>
      </div>
    );
  }

  if (previewType === "telemetry-hud") {
    return (
      <div className="preview-widget" aria-label="WebGL physics telemetry preview">
        <div className="preview-toolbar">
          <span className="preview-badge">WEBGL PHYSICS TELEMETRY</span>
          <button
            type="button"
            id={`turbo-toggle-btn-${projectId}`}
            className={`preview-chip ${turboActive ? "is-active" : ""}`}
            onClick={() => setTurboActive((prev) => !prev)}
          >
            {turboActive ? "DRIFT BOOST: ACTIVE" : "ENGAGE DRIFT BOOST"}
          </button>
        </div>

        <div className="telemetry-grid">
          <div className="telemetry-cell">
            <span className="telemetry-label">VELOCITY</span>
            <strong className="telemetry-val">{turboActive ? "148 km/h" : "94 km/h"}</strong>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-label">FRAME BUDGET</span>
            <strong className="telemetry-val">16.6 ms (60fps)</strong>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-label">SPRING DAMPING</span>
            <strong className="telemetry-val">{turboActive ? "ζ = 0.62" : "ζ = 0.85"}</strong>
          </div>
        </div>

        <div className="telemetry-track">
          <div
            className="telemetry-fill"
            style={{
              width: turboActive ? "92%" : "54%",
              backgroundColor: turboActive ? "var(--accent-warm)" : "var(--accent-emerald)"
            }}
          />
        </div>
      </div>
    );
  }

  if (previewType === "identity-generator") {
    const persona = PERSONAS[personaIdx];
    const handleCopyPersona = () => {
      navigator.clipboard?.writeText(JSON.stringify(persona, null, 2));
      setCopiedPersona(true);
      setTimeout(() => setCopiedPersona(false), 1800);
    };

    return (
      <div className="preview-widget" aria-label="Mockup persona generator">
        <div className="preview-toolbar">
          <span className="preview-badge">MOCKUP IDENTITY SYNTHESIS</span>
          <div className="preview-PresetGroup">
            <button
              type="button"
              id={`next-persona-btn-${projectId}`}
              className="preview-chip is-active"
              onClick={() => setPersonaIdx((prev) => (prev + 1) % PERSONAS.length)}
            >
              Shuffle Persona ↻
            </button>
            <button
              type="button"
              id={`copy-persona-btn-${projectId}`}
              className="preview-chip"
              onClick={handleCopyPersona}
            >
              {copiedPersona ? "Copied JSON ✓" : "Copy JSON"}
            </button>
          </div>
        </div>

        <div className="persona-card-mini">
          <div>
            <div className="persona-name">{persona.name}</div>
            <div className="persona-meta">{persona.role} · {persona.region}</div>
          </div>
          <code className="persona-locale">{persona.locale}</code>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-widget" aria-label="Curated AI tooling index">
      <div className="preview-toolbar">
        <span className="preview-badge">TAXONOMY SNAPSHOT</span>
        <div className="preview-PresetGroup">
          {AI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.tag}
              type="button"
              id={`ai-cat-btn-${projectId}-${idx}`}
              className={`preview-chip ${selectedCategory === idx ? "is-active" : ""}`}
              onClick={() => setSelectedCategory(idx)}
            >
              {cat.tag}
            </button>
          ))}
        </div>
      </div>
      <div className="persona-card-mini">
        <div>
          <div className="persona-name">{AI_CATEGORIES[selectedCategory].tool}</div>
          <div className="persona-meta">{AI_CATEGORIES[selectedCategory].note}</div>
        </div>
        <code className="persona-locale">VERIFIED</code>
      </div>
    </div>
  );
}

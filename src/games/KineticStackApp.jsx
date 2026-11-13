import { useCallback, useEffect, useRef, useState } from "react";
import "./KineticStackApp.css";
import { useGameFullscreen } from "./useGameFullscreen";

const MODES = [
  { id: "zen", name: "Zen", speed: 1.45, tolerance: 3.5, label: "Gentle speed & relaxed slice" },
  { id: "classic", name: "Classic", speed: 2.2, tolerance: 2.8, label: "Balanced arcade pace" },
  { id: "insane", name: "Insane", speed: 3.3, tolerance: 2.0, label: "Lightning speed & pinpoint precision" }
];

// Pentatonic scale frequencies for ascending stack chords
const PENTATONIC_SCALE = [
  261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
  523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00 // C6, D6, E6, G6, A6
];

// Minimal tactile Web Audio API synthesizer
function playStackSound(type, combo = 0, enabled = true) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._stackAudioCtx) {
      window._stackAudioCtx = new AudioCtx();
    }
    const ctx = window._stackAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === "place" || type === "perfect") {
      const noteIdx = combo % PENTATONIC_SCALE.length;
      const freq = PENTATONIC_SCALE[noteIdx];

      // Primary tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(type === "perfect" ? 0.16 : 0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === "perfect" ? 0.45 : 0.28));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // In perfect stack, play a harmonic third/fifth chime
      if (type === "perfect") {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = "triangle";
        chordOsc.frequency.setValueAtTime(freq * 1.5, now);
        chordGain.gain.setValueAtTime(0.08, now);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        chordOsc.connect(chordGain);
        chordGain.connect(ctx.destination);
        chordOsc.start(now);
        chordOsc.stop(now + 0.55);
      }
    } else if (type === "slice") {
      // Crisp slice / click percussion
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "gameover") {
      // Descending low resonant crash
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    }
  } catch {
    // Graceful fallback if Web Audio is unsupported
  }
}

// Isometric helper: converts 3D world space (x, y, z) into 2D canvas pixel coordinates
function toIso(x, y, z, originX, originY, tileW, tileD, blockH) {
  // x moves down-right (+X, +Y*ratio)
  // z moves down-left  (-X, +Y*ratio)
  // y moves vertically up (-Y)
  return {
    px: originX + (x - z) * tileW,
    py: originY + (x + z) * tileD - y * blockH
  };
}

// Constants for isometric world scale
const INITIAL_SIZE = 130;
const BLOCK_HEIGHT = 18;
const TILE_W = 0.85; // cos(30) ratio
const TILE_D = 0.49; // sin(30) ratio
const SWEEP_BOUND = 185;

function createInitialGameState() {
  const startHue = Math.floor(Math.random() * 360);
  const baseBlock = {
    x: 0,
    z: 0,
    width: INITIAL_SIZE,
    depth: INITIAL_SIZE,
    y: 0,
    hue: startHue
  };
  const firstActive = {
    x: -SWEEP_BOUND,
    z: 0,
    width: INITIAL_SIZE,
    depth: INITIAL_SIZE,
    y: 1,
    hue: (startHue + 32) % 360
  };
  return {
    blocks: [baseBlock],
    debris: [],
    effects: [],
    active: firstActive,
    prev: baseBlock,
    direction: 1,
    axis: "x",
    cameraY: 0,
    targetCameraY: 0,
    baseHue: startHue,
    animationFrameId: null,
    lastTime: performance.now()
  };
}

// LocalStorage Persistence Helpers for Kinetic Stack
function loadStackStats() {
  try {
    const raw = localStorage.getItem("iliash_stack_stats");
    return raw ? JSON.parse(raw) : { totalLayers: 0, totalPerfects: 0, maxCombo: 0, gamesPlayed: 0 };
  } catch {
    return { totalLayers: 0, totalPerfects: 0, maxCombo: 0, gamesPlayed: 0 };
  }
}

function updateStackStats(layersDelta = 0, perfectsDelta = 0, comboReached = 0, gamesPlayedDelta = 0) {
  try {
    const stats = loadStackStats();
    stats.totalLayers = (stats.totalLayers || 0) + layersDelta;
    stats.totalPerfects = (stats.totalPerfects || 0) + perfectsDelta;
    stats.gamesPlayed = (stats.gamesPlayed || 0) + gamesPlayedDelta;
    if (comboReached > (stats.maxCombo || 0)) {
      stats.maxCombo = comboReached;
    }
    localStorage.setItem("iliash_stack_stats", JSON.stringify(stats));
    return stats;
  } catch {
    return null;
  }
}

export default function KineticStackApp({ onNavigateHome }) {
  // Restore difficulty mode from localStorage
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem("iliash_stack_mode");
      if (saved && MODES.some((m) => m.id === saved)) return saved;
    } catch {
      // ignore
    }
    return "classic";
  });

  // Restore audio preference from localStorage
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("iliash_stack_sfx");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("iliash_stack_sfx", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState("idle"); // 'idle' | 'playing' | 'gameover'
  const [bestScore, setBestScore] = useState(() => {
    try {
      const saved = localStorage.getItem(`iliash_stack_best_${mode}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useGameFullscreen(appRef);
  const gameRef = useRef(createInitialGameState());

  const handleSelectMode = (newMode) => {
    setMode(newMode);
    try {
      localStorage.setItem("iliash_stack_mode", newMode);
      const saved = localStorage.getItem(`iliash_stack_best_${newMode}`);
      setBestScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setBestScore(0);
    }
    resetGame();
  };

  // Initialize a fresh game state
  const resetGame = useCallback(() => {
    gameRef.current = createInitialGameState();
    setScore(0);
    setCombo(0);
    setGameState("idle");
  }, []);

  // Handle Action (Tap / Click / Spacebar)
  const handleAction = useCallback(() => {
    const g = gameRef.current;
    const currentModeConfig = MODES.find((m) => m.id === mode) || MODES[1];

    if (gameState === "gameover") {
      resetGame();
      setGameState("playing");
      return;
    }

    if (gameState === "idle") {
      setGameState("playing");
    }

    if (!g.active || !g.prev) return;

    const { active, prev, axis } = g;
    let isPerfect = false;
    let placedBlock = null;
    let debrisBlock = null;

    if (axis === "x") {
      const delta = active.x - prev.x;
      const absDelta = Math.abs(delta);

      if (absDelta <= currentModeConfig.tolerance) {
        // Perfect stack snap!
        isPerfect = true;
        placedBlock = {
          ...active,
          x: prev.x,
          width: prev.width
        };
      } else if (absDelta < prev.width) {
        // Successful slice
        const newWidth = prev.width - absDelta;
        const newX = delta > 0 ? active.x : prev.x;

        placedBlock = {
          ...active,
          x: newX,
          width: newWidth
        };

        // Falling debris piece
        const debrisX = delta > 0 ? prev.x + prev.width : active.x;
        debrisBlock = {
          x: debrisX,
          z: active.z,
          width: absDelta,
          depth: active.depth,
          y: active.y,
          hue: active.hue,
          vy: 0,
          rotX: 0,
          rotZ: 0,
          vRotZ: delta > 0 ? 0.04 : -0.04,
          opacity: 1
        };
      } else {
        // Complete miss -> Game Over
        debrisBlock = {
          ...active,
          vy: 0,
          rotX: 0,
          rotZ: 0,
          vRotZ: 0.05,
          opacity: 1
        };
        g.debris.push(debrisBlock);
        g.active = null;

        playStackSound("gameover", 0, sfxEnabled);
        setGameState("gameover");

        setBestScore((prevBest) => {
          const newBest = Math.max(prevBest, g.blocks.length - 1);
          try {
            localStorage.setItem(`iliash_stack_best_${mode}`, String(newBest));
          } catch {
            // ignore
          }
          return newBest;
        });
        return;
      }
    } else {
      // Z Axis
      const delta = active.z - prev.z;
      const absDelta = Math.abs(delta);

      if (absDelta <= currentModeConfig.tolerance) {
        // Perfect stack snap!
        isPerfect = true;
        placedBlock = {
          ...active,
          z: prev.z,
          depth: prev.depth
        };
      } else if (absDelta < prev.depth) {
        // Successful slice
        const newDepth = prev.depth - absDelta;
        const newZ = delta > 0 ? active.z : prev.z;

        placedBlock = {
          ...active,
          z: newZ,
          depth: newDepth
        };

        // Falling debris piece
        const debrisZ = delta > 0 ? prev.z + prev.depth : active.z;
        debrisBlock = {
          x: active.x,
          z: debrisZ,
          width: active.width,
          depth: absDelta,
          y: active.y,
          hue: active.hue,
          vy: 0,
          rotX: 0,
          rotZ: 0,
          vRotX: delta > 0 ? 0.04 : -0.04,
          opacity: 1
        };
      } else {
        // Complete miss -> Game Over
        debrisBlock = {
          ...active,
          vy: 0,
          rotX: 0,
          rotZ: 0,
          vRotX: 0.05,
          opacity: 1
        };
        g.debris.push(debrisBlock);
        g.active = null;

        playStackSound("gameover", 0, sfxEnabled);
        setGameState("gameover");
        updateStackStats(0, 0, 0, 1);

        setBestScore((prevBest) => {
          const newBest = Math.max(prevBest, g.blocks.length - 1);
          try {
            localStorage.setItem(`iliash_stack_best_${mode}`, String(newBest));
          } catch {
            // ignore
          }
          return newBest;
        });
        return;
      }
    }

    // Process successful placement
    let nextCombo = 0;
    if (isPerfect) {
      nextCombo = combo + 1;
      setCombo(nextCombo);

      // Reward combo: after 4 consecutive perfects, slightly restore block size
      if (nextCombo >= 4) {
        if (axis === "x" && placedBlock.width < INITIAL_SIZE) {
          placedBlock.width = Math.min(INITIAL_SIZE, placedBlock.width + 4);
        } else if (axis === "z" && placedBlock.depth < INITIAL_SIZE) {
          placedBlock.depth = Math.min(INITIAL_SIZE, placedBlock.depth + 4);
        }
      }

      // Add a shockwave ring effect at the top of the placed block
      g.effects.push({
        x: placedBlock.x,
        z: placedBlock.z,
        width: placedBlock.width,
        depth: placedBlock.depth,
        y: placedBlock.y,
        hue: placedBlock.hue,
        radius: 0,
        maxRadius: 28,
        opacity: 0.85
      });

      playStackSound("perfect", nextCombo, sfxEnabled);
    } else {
      setCombo(0);
      playStackSound("slice", 0, sfxEnabled);
    }

    g.blocks.push(placedBlock);
    if (debrisBlock) {
      g.debris.push(debrisBlock);
    }

    const newScore = g.blocks.length - 1;
    setScore(newScore);

    // Save best score immediately if higher
    setBestScore((prevBest) => {
      const nextBest = Math.max(prevBest, newScore);
      if (nextBest > prevBest) {
        try {
          localStorage.setItem(`iliash_stack_best_${mode}`, String(nextBest));
        } catch {
          // ignore
        }
      }
      return nextBest;
    });

    // Update lifetime statistics
    updateStackStats(1, isPerfect ? 1 : 0, nextCombo, 0);

    // Update camera smooth tracking
    g.targetCameraY = newScore * BLOCK_HEIGHT;

    // Prepare next moving layer
    const nextY = newScore + 1;
    const nextAxis = axis === "x" ? "z" : "x";
    const nextHue = (g.baseHue + nextY * 32) % 360;

    g.active = {
      x: nextAxis === "x" ? -SWEEP_BOUND : placedBlock.x,
      z: nextAxis === "z" ? -SWEEP_BOUND : placedBlock.z,
      width: placedBlock.width,
      depth: placedBlock.depth,
      y: nextY,
      hue: nextHue
    };
    g.prev = placedBlock;
    g.axis = nextAxis;
    g.direction = 1;
  }, [mode, gameState, combo, sfxEnabled, resetGame]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleAction();
      } else if (e.key === "r" || e.key === "R") {
        resetGame();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animId;

    const render = (time) => {
      const g = gameRef.current;
      const dt = Math.min((time - (g.lastTime || time)) / 1000, 0.1);
      g.lastTime = time;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayW = Math.floor(rect.width * dpr);
      const displayH = Math.floor(rect.height * dpr);

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const cw = rect.width;
      const ch = rect.height;

      // Clear Canvas with clean daylight background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);

      // Camera smooth damping
      g.cameraY += (g.targetCameraY - g.cameraY) * 0.12;

      const originX = cw / 2;
      // Position base higher to eliminate excess top blank space and keep active block centered
      const originY = ch * 0.48 + g.cameraY;

      const currentModeConfig = MODES.find((m) => m.id === mode) || MODES[1];

      // Update active block position
      if (g.active && gameState !== "gameover") {
        const speed = currentModeConfig.speed * 115 * dt;
        if (g.axis === "x") {
          g.active.x += speed * g.direction;
          if (g.active.x > SWEEP_BOUND) {
            g.active.x = SWEEP_BOUND;
            g.direction = -1;
          } else if (g.active.x < -SWEEP_BOUND) {
            g.active.x = -SWEEP_BOUND;
            g.direction = 1;
          }
        } else {
          g.active.z += speed * g.direction;
          if (g.active.z > SWEEP_BOUND) {
            g.active.z = SWEEP_BOUND;
            g.direction = -1;
          } else if (g.active.z < -SWEEP_BOUND) {
            g.active.z = -SWEEP_BOUND;
            g.direction = 1;
          }
        }
      }

      // Update falling debris physics
      for (let i = g.debris.length - 1; i >= 0; i--) {
        const d = g.debris[i];
        d.vy += 320 * dt;
        d.y -= d.vy * dt * 0.05;
        d.rotX += (d.vRotX || 0);
        d.rotZ += (d.vRotZ || 0);
        d.opacity -= 0.65 * dt;

        if (d.opacity <= 0 || d.y < -35) {
          g.debris.splice(i, 1);
        }
      }

      // Update shockwave effects
      for (let i = g.effects.length - 1; i >= 0; i--) {
        const eff = g.effects[i];
        eff.radius += 55 * dt;
        eff.opacity -= 1.8 * dt;
        if (eff.opacity <= 0) {
          g.effects.splice(i, 1);
        }
      }

      // Helper to draw an isometric 3D block with multicolored gradient facets
      const drawBlock = (b, opacity = 1) => {
        const { x, z, width, depth, y, hue } = b;
        if (width <= 0 || depth <= 0) return;

        const hue1 = hue;
        const hue2 = (hue + 28) % 360;

        // 8 vertices in 3D world space
        const _p000 = toIso(x, y, z, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);
        const p100 = toIso(x + width, y, z, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);
        const p101 = toIso(x + width, y, z + depth, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);
        const p001 = toIso(x, y, z + depth, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);

        const p010 = toIso(x, y + 1, z, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);
        const p110 = toIso(x + width, y + 1, z, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);
        const p111 = toIso(x + width, y + 1, z + depth, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);
        const p011 = toIso(x, y + 1, z + depth, originX, originY, TILE_W, TILE_D, BLOCK_HEIGHT);

        // Multicolored dynamic gradients for each facet
        // Top Face: Vibrant smooth blend between hue1 and hue2
        const topGrad = ctx.createLinearGradient(p010.px, p010.py, p111.px, p111.py);
        topGrad.addColorStop(0, `hsla(${hue1}, 85%, 74%, ${opacity})`);
        topGrad.addColorStop(1, `hsla(${hue2}, 85%, 68%, ${opacity})`);

        // Left / Front Face
        const leftGrad = ctx.createLinearGradient(p011.px, p011.py, p101.px, p101.py);
        leftGrad.addColorStop(0, `hsla(${hue1}, 80%, 58%, ${opacity})`);
        leftGrad.addColorStop(1, `hsla(${hue2}, 80%, 50%, ${opacity})`);

        // Right / Side Face
        const rightGrad = ctx.createLinearGradient(p110.px, p110.py, p101.px, p101.py);
        rightGrad.addColorStop(0, `hsla(${hue2}, 76%, 48%, ${opacity})`);
        rightGrad.addColorStop(1, `hsla(${hue1}, 76%, 38%, ${opacity})`);

        const strokeColor = `rgba(0, 0, 0, ${0.09 * opacity})`;
        ctx.lineWidth = 0.75;
        ctx.strokeStyle = strokeColor;

        // 1. Left / Front Face (facing viewer along +Z)
        ctx.beginPath();
        ctx.moveTo(p011.px, p011.py);
        ctx.lineTo(p111.px, p111.py);
        ctx.lineTo(p101.px, p101.py);
        ctx.lineTo(p001.px, p001.py);
        ctx.closePath();
        ctx.fillStyle = leftGrad;
        ctx.fill();
        ctx.stroke();

        // 2. Right / Side Face (facing viewer along +X)
        ctx.beginPath();
        ctx.moveTo(p110.px, p110.py);
        ctx.lineTo(p111.px, p111.py);
        ctx.lineTo(p101.px, p101.py);
        ctx.lineTo(p100.px, p100.py);
        ctx.closePath();
        ctx.fillStyle = rightGrad;
        ctx.fill();
        ctx.stroke();

        // 3. Top Face
        ctx.beginPath();
        ctx.moveTo(p010.px, p010.py);
        ctx.lineTo(p110.px, p110.py);
        ctx.lineTo(p111.px, p111.py);
        ctx.lineTo(p011.px, p011.py);
        ctx.closePath();
        ctx.fillStyle = topGrad;
        ctx.fill();
        ctx.stroke();

        // Subtle inner rim highlight on top face for crisp tactile depth
        ctx.beginPath();
        ctx.moveTo(p011.px, p011.py);
        ctx.lineTo(p010.px, p010.py);
        ctx.lineTo(p110.px, p110.py);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      };

      // Draw all stacked blocks from base upwards
      for (let i = 0; i < g.blocks.length; i++) {
        drawBlock(g.blocks[i], 1);
      }

      // Draw shockwave halo effects
      for (const eff of g.effects) {
        ctx.save();
        const center = toIso(
          eff.x + eff.width / 2,
          eff.y + 1,
          eff.z + eff.depth / 2,
          originX,
          originY,
          TILE_W,
          TILE_D,
          BLOCK_HEIGHT
        );
        ctx.beginPath();
        ctx.ellipse(center.px, center.py, eff.radius * 1.6, eff.radius * 0.85, 0, 0, Math.PI * 2);
        const haloHue = eff.hue !== undefined ? eff.hue : 18;
        ctx.strokeStyle = `hsla(${haloHue}, 90%, 55%, ${eff.opacity})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // Draw falling debris pieces
      for (const d of g.debris) {
        drawBlock(d, Math.max(0, d.opacity));
      }

      // Draw active sliding block
      if (g.active) {
        drawBlock(g.active, 1);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode, gameState]);

  return (
    <div ref={appRef} className={`stack-minimal-app ${isFullscreen ? "is-fullscreen" : ""}`}>
      {/* Unified 3-Column Minimal Header */}
      <header className="stack-nav" role="banner">
        <div className="stack-nav-left">
          <button
            type="button"
            id="back-to-portfolio-btn"
            className="stack-back-link"
            onClick={() => {
              if (document.fullscreenElement) {
                try {
                  document.exitFullscreen();
                } catch {
                  // ignore
                }
              }
              onNavigateHome?.();
            }}
          >
            ← iliash.me
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="stack-nav-title">Kinetic Stack</h1>
        </div>

        <div className="stack-presets" role="radiogroup" aria-label="Game Difficulty Mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              id={`mode-pill-${m.id}`}
              role="radio"
              aria-checked={mode === m.id}
              className={`stack-preset-pill ${mode === m.id ? "is-active" : ""}`}
              onClick={() => handleSelectMode(m.id)}
              title={m.label}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="stack-nav-right">
          <div className="stack-best-pill" aria-label={`Best score: ${bestScore}`}>
            BEST<strong>{bestScore}</strong>
          </div>
          <button
            type="button"
            id="toggle-sfx-btn"
            className="stack-audio-btn"
            onClick={toggleSfx}
            aria-label={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {sfxEnabled ? "SFX On" : "Muted"}
          </button>
          <button
            type="button"
            id="toggle-fullscreen-btn"
            className={`stack-fullscreen-btn ${isFullscreen ? "is-active" : ""}`}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Expand to Fullscreen (F)"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
                <span>Exit</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="stack-stage-wrapper">
        <div
          className="stack-canvas-card"
          onClick={handleAction}
          role="region"
          aria-label="Kinetic Stack play field"
        >
          {/* Card Top Expand Button */}
          <button
            type="button"
            id="stack-card-fs-btn"
            className="stack-card-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Expand to Fullscreen (F)"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
          >
            <span className="stack-btn-icon" aria-hidden="true">{isFullscreen ? "⤓" : "⛶"}</span>
          </button>

          {/* Background Score Watermark */}
          <div className="stack-bg-watermark" aria-hidden="true">
            {score}
          </div>

          {/* Current Score & Combo Tag */}
          <div className="stack-hud-top">
            <span className="stack-hud-score-label">Tower Height</span>
            <span className="stack-hud-score-val">{score}</span>
            {combo > 1 && (
              <span className="stack-hud-combo-tag">
                PERFECT ×{combo}
              </span>
            )}
          </div>

          {/* Idle / Initial Click Prompt */}
          {gameState === "idle" && (
            <div className="stack-prompt-overlay">
              <span>Tap or press</span>
              <kbd>Space</kbd>
              <span>to stack</span>
            </div>
          )}

          {/* Game Over Sheet */}
          {gameState === "gameover" && (
            <div className="stack-gameover-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="stack-gameover-card">
                <h2 className="stack-gameover-title">Tower Collapsed</h2>

                <div className="stack-gameover-metrics">
                  <div className="stack-gameover-metric-item">
                    <span className="stack-gameover-metric-label">Layers</span>
                    <span className="stack-gameover-metric-val">{score}</span>
                  </div>
                  <div className="stack-gameover-metric-item">
                    <span className="stack-gameover-metric-label">Best</span>
                    <span className={`stack-gameover-metric-val ${score >= bestScore ? "is-best" : ""}`}>
                      {bestScore}
                    </span>
                  </div>
                </div>

                {(() => {
                  const st = loadStackStats();
                  if (st.totalLayers > 0) {
                    return (
                      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.72rem", color: "#71717a", fontFamily: "'JetBrains Mono', monospace", margin: "0.15rem 0" }}>
                        <span>Peak Combo: <strong style={{ color: "#111315" }}>{st.maxCombo}</strong></span>
                        <span>•</span>
                        <span>Total Stacked: <strong style={{ color: "#111315" }}>{st.totalLayers}</strong></span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="stack-gameover-actions">
                  <button
                    type="button"
                    id="stack-play-again-btn"
                    className="stack-restart-btn"
                    onClick={() => {
                      resetGame();
                      setGameState("playing");
                    }}
                  >
                    Play Again (Space)
                  </button>
                </div>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="stack-canvas" />
        </div>

        <div className="stack-hint-bar" aria-hidden="true">
          <span><kbd>Space</kbd> / <kbd>Click</kbd> Drop & Slice</span>
          <span>•</span>
          <span><kbd>R</kbd> Restart</span>
          <span>•</span>
          <span>Consecutive perfects restore width</span>
        </div>
      </main>
    </div>
  );
}

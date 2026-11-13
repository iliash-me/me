import { useCallback, useEffect, useRef, useState } from "react";
import "./HexaMergeApp.css";

const MODES = [
  { id: "compact", name: "Compact", radius: 1, label: "7 cells — quick & intense" },
  { id: "classic", name: "Classic", radius: 2, label: "19 cells — balanced strategy" },
  { id: "expansive", name: "Expansive", radius: 3, label: "37 cells — deep high-number merges" }
];

// The 6 hexagonal unit directions in pointy-topped axial coordinates (dq, dr)
const HEX_DIRECTIONS = [
  { id: "E", name: "East", dq: 1, dr: 0, angle: 0 },
  { id: "SE", name: "South-East", dq: 0, dr: 1, angle: Math.PI / 3 },
  { id: "SW", name: "South-West", dq: -1, dr: 1, angle: (2 * Math.PI) / 3 },
  { id: "W", name: "West", dq: -1, dr: 0, angle: Math.PI },
  { id: "NW", name: "North-West", dq: 0, dr: -1, angle: -(2 * Math.PI) / 3 },
  { id: "NE", name: "North-East", dq: 1, dr: -1, angle: -Math.PI / 3 }
];

// Distinct vibrant designer color scheme for tile values
const TILE_STYLES = {
  2: { bg: ["#f4f1ea", "#ece7dc"], text: "#3f3a34", border: "rgba(0,0,0,0.06)" },
  4: { bg: ["#ede3d0", "#e2d5bd"], text: "#3f3a34", border: "rgba(0,0,0,0.06)" },
  8: { bg: ["#ff9d5c", "#ff7e36"], text: "#ffffff", border: "rgba(255,126,54,0.3)" },
  16: { bg: ["#ff733b", "#ff531d"], text: "#ffffff", border: "rgba(255,83,29,0.3)" },
  32: { bg: ["#ff5328", "#e63810"], text: "#ffffff", border: "rgba(230,56,16,0.3)" },
  64: { bg: ["#e9352c", "#c81e15"], text: "#ffffff", border: "rgba(200,30,21,0.3)" },
  128: { bg: ["#ffd147", "#f3b924"], text: "#ffffff", border: "rgba(243,185,36,0.4)" },
  256: { bg: ["#f5be27", "#df9f12"], text: "#ffffff", border: "rgba(223,159,18,0.4)" },
  512: { bg: ["#3ecfa4", "#20b588"], text: "#ffffff", border: "rgba(32,181,136,0.4)" },
  1024: { bg: ["#38b6f6", "#1a94d8"], text: "#ffffff", border: "rgba(26,148,216,0.4)" },
  2048: { bg: ["#896cfc", "#6c4af5"], text: "#ffffff", border: "rgba(108,74,245,0.4)" },
  4096: { bg: ["#1e2024", "#111315"], text: "#ffd147", border: "rgba(255,209,71,0.6)" }
};

// Web Audio API Synthesizer for tactile slides and harmonic merge chimes
function playHexaSound(type, value = 2, combo = 1, enabled = true) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._hexaAudioCtx) {
      window._hexaAudioCtx = new AudioCtx();
    }
    const ctx = window._hexaAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === "slide") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.05);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "merge") {
      const scale = [
        261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50
      ];
      const tier = Math.min(Math.round(Math.log2(value)) - 2, scale.length - 1);
      const baseFreq = scale[Math.max(0, tier)];

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);

      // Add harmonic sparkle for high value merges or combos
      if (combo > 1 || value >= 128) {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = "triangle";
        chordOsc.frequency.setValueAtTime(baseFreq * 1.5, now);

        chordGain.gain.setValueAtTime(0.07, now);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        chordOsc.connect(chordGain);
        chordGain.connect(ctx.destination);
        chordOsc.start(now);
        chordOsc.stop(now + 0.35);
      }
    } else if (type === "gameover") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(196, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.4);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);
    }
  } catch {
    // Graceful fallback
  }
}

// Generate all valid hexagonal coordinates for given board radius
function getHexCells(radius) {
  const cells = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      cells.push({ q, r, key: `${q},${r}` });
    }
  }
  return cells;
}

// Check if a coordinate is within board boundary
function isInsideBoard(q, r, radius) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= radius;
}

function createInitialHexaTiles(boardRadius) {
  const allCells = getHexCells(boardRadius);
  const chosenIndices = [];
  while (chosenIndices.length < 2 && chosenIndices.length < allCells.length) {
    const rIdx = Math.floor(Math.random() * allCells.length);
    if (!chosenIndices.includes(rIdx)) chosenIndices.push(rIdx);
  }
  return chosenIndices.map((idx, i) => ({
    id: i + 1,
    q: allCells[idx].q,
    r: allCells[idx].r,
    value: Math.random() < 0.9 ? 2 : 4,
    scale: 1,
    isNew: false
  }));
}

export default function HexaMergeApp({ onNavigateHome }) {
  const [mode, setMode] = useState("classic");
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      const saved = localStorage.getItem("iliash_hexa_best_classic");
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState("playing"); // 'playing' | 'gameover' | 'won'
  const [canUndo, setCanUndo] = useState(false);

  const canvasRef = useRef(null);
  const boardCardRef = useRef(null);

  const currentConfig = MODES.find((m) => m.id === mode) || MODES[1];
  const radius = currentConfig.radius;

  // Tile structure: { id, q, r, value, currentX, currentY, targetX, targetY, scale: 0..1, isNew, isMerged }
  const gameRef = useRef({
    tiles: createInitialHexaTiles(radius),
    history: null,
    nextTileId: 3,
    dragStart: null,
    lastTime: 0
  });

  // Spawn random tile (2 with 90% probability, 4 with 10%)
  const spawnTile = useCallback((tilesList, boardRadius) => {
    const allCells = getHexCells(boardRadius);
    const occupiedKeys = new Set(tilesList.map((t) => `${t.q},${t.r}`));
    const emptyCells = allCells.filter((c) => !occupiedKeys.has(c.key));

    if (emptyCells.length === 0) return null;

    const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const tile = {
      id: gameRef.current.nextTileId++,
      q: chosen.q,
      r: chosen.r,
      value: val,
      scale: 0.1,
      isNew: true
    };
    return tile;
  }, []);

  // Initialize a fresh board
  const resetGame = useCallback(
    (targetRadius = radius) => {
      const initialTiles = createInitialHexaTiles(targetRadius);
      gameRef.current.nextTileId = initialTiles.length + 1;
      gameRef.current.tiles = initialTiles;
      gameRef.current.history = null;

      setScore(0);
      setCombo(0);
      setGameState("playing");
      setCanUndo(false);
    },
    [radius]
  );

  const handleSelectMode = (newMode) => {
    setMode(newMode);
    try {
      const saved = localStorage.getItem(`iliash_hexa_best_${newMode}`);
      setBestScore(saved ? parseInt(saved, 10) : 0);
    } catch {
      setBestScore(0);
    }
    const targetConfig = MODES.find((m) => m.id === newMode) || MODES[1];
    resetGame(targetConfig.radius);
  };

  // Check if any valid move remains
  const checkGameOver = (tilesList, boardRadius) => {
    const allCells = getHexCells(boardRadius);
    if (tilesList.length < allCells.length) return false;

    const tileMap = new Map();
    tilesList.forEach((t) => tileMap.set(`${t.q},${t.r}`, t.value));

    for (const t of tilesList) {
      for (const d of HEX_DIRECTIONS) {
        const nq = t.q + d.dq;
        const nr = t.r + d.dr;
        if (isInsideBoard(nq, nr, boardRadius)) {
          const neighborVal = tileMap.get(`${nq},${nr}`);
          if (neighborVal === t.value) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Move tiles in one of the 6 hexagonal directions
  const move = useCallback(
    (dir) => {
      if (gameState !== "playing") return;

      const g = gameRef.current;
      const currentTiles = g.tiles;

      // Deep copy for Undo
      const previousState = {
        tiles: currentTiles.map((t) => ({ ...t })),
        score
      };

      // Sort tiles along the direction vector so leading tiles move first
      // Projection along (dq, dr): for pointy-topped, dot product with movement vector
      const sortedTiles = [...currentTiles].sort((a, b) => {
        const projA = a.q * dir.dq + a.r * dir.dr + (-a.q - a.r) * (-dir.dq - dir.dr);
        const projB = b.q * dir.dq + b.r * dir.dr + (-b.q - b.r) * (-dir.dq - dir.dr);
        return projB - projA;
      });

      const nextTiles = [];
      const mergedCellKeys = new Set();
      let movedAny = false;
      let roundScore = 0;
      let roundMerges = 0;

      for (const t of sortedTiles) {
        let curQ = t.q;
        let curR = t.r;

        while (true) {
          const nextQ = curQ + dir.dq;
          const nextR = curR + dir.dr;

          if (!isInsideBoard(nextQ, nextR, radius)) {
            break;
          }

          const targetOccupant = nextTiles.find((nt) => nt.q === nextQ && nt.r === nextR);

          if (!targetOccupant) {
            curQ = nextQ;
            curR = nextR;
            movedAny = true;
          } else if (
            targetOccupant.value === t.value &&
            !mergedCellKeys.has(`${nextQ},${nextR}`)
          ) {
            // Merge with existing tile
            targetOccupant.value *= 2;
            targetOccupant.isMerged = true;
            targetOccupant.scale = 1.28;
            mergedCellKeys.add(`${nextQ},${nextR}`);
            roundScore += targetOccupant.value;
            roundMerges++;
            movedAny = true;
            curQ = null; // Tile merged away
            break;
          } else {
            break;
          }
        }

        if (curQ !== null) {
          if (curQ !== t.q || curR !== t.r) {
            movedAny = true;
          }
          nextTiles.push({
            ...t,
            q: curQ,
            r: curR,
            isNew: false
          });
        }
      }

      if (!movedAny) return;

      // Store history for undo
      g.history = previousState;
      setCanUndo(true);

      // Play audio feedback
      if (roundMerges > 0) {
        playHexaSound("merge", roundScore, roundMerges, sfxEnabled);
        setCombo((prev) => prev + roundMerges);
      } else {
        playHexaSound("slide", 2, 0, sfxEnabled);
        setCombo(0);
      }

      // Spawn new tile
      const spawned = spawnTile(nextTiles, radius);
      if (spawned) {
        nextTiles.push(spawned);
      }

      g.tiles = nextTiles;

      const newScore = score + roundScore;
      setScore(newScore);

      setBestScore((prevBest) => {
        const nextBest = Math.max(prevBest, newScore);
        try {
          localStorage.setItem(`iliash_hexa_best_${mode}`, String(nextBest));
        } catch {
          // ignore
        }
        return nextBest;
      });

      // Check win or game over
      const has2048 = nextTiles.some((t) => t.value >= 2048);
      if (has2048 && gameState !== "won") {
        setGameState("won");
      } else if (checkGameOver(nextTiles, radius)) {
        playHexaSound("gameover", 0, 0, sfxEnabled);
        setGameState("gameover");
      }
    },
    [gameState, score, radius, sfxEnabled, mode, spawnTile]
  );

  // Undo move
  const handleUndo = () => {
    const g = gameRef.current;
    if (!g.history) return;

    g.tiles = g.history.tiles;
    setScore(g.history.score);
    g.history = null;
    setCanUndo(false);
    setGameState("playing");
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        move(HEX_DIRECTIONS[0]); // East
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        move(HEX_DIRECTIONS[3]); // West
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        move(HEX_DIRECTIONS[4]); // NW
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        move(HEX_DIRECTIONS[5]); // NE
      } else if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        move(HEX_DIRECTIONS[2]); // SW
      } else if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        move(HEX_DIRECTIONS[1]); // SE
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(HEX_DIRECTIONS[4]); // NW
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move(HEX_DIRECTIONS[1]); // SE
      } else if (e.key === "r" || e.key === "R") {
        resetGame();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move, resetGame]);

  // Touch and Mouse Drag / Swipe Handlers
  const handlePointerDown = (e) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined) return;
    gameRef.current.dragStart = { x: clientX, y: clientY };
  };

  const handlePointerUp = (e) => {
    const start = gameRef.current.dragStart;
    if (!start) return;
    gameRef.current.dragStart = null;

    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY;
    if (clientX === undefined) return;

    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 22) return; // Threshold to prevent accidental moves

    const angle = Math.atan2(dy, dx); // -PI to +PI

    // Find closest hex direction by angular distance
    let bestDir = HEX_DIRECTIONS[0];
    let minDiff = Infinity;

    for (const d of HEX_DIRECTIONS) {
      let diff = Math.abs(angle - d.angle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < minDiff) {
        minDiff = diff;
        bestDir = d;
      }
    }

    move(bestDir);
  };

  // Main Canvas Render & Animation Loop
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

      // Clear canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);

      const centerX = cw / 2;
      const centerY = ch / 2;

      // Calculate hex tile radius according to board radius
      const hexRadius = Math.min(cw, ch) / (2 * radius + 2.2);

      // Helper: converts (q, r) to pixel coordinates
      const hexToPixel = (q, r) => ({
        x: centerX + hexRadius * Math.sqrt(3) * (q + r / 2),
        y: centerY + hexRadius * 1.5 * r
      });

      // Helper: draws a rounded pointy-topped hexagon path
      const drawHexagonPath = (cx, cy, rSize) => {
        const sideLength = rSize * 0.94;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + sideLength * Math.cos(angle);
          const py = cy + sideLength * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };

      // 1. Draw empty background grid cells
      const allCells = getHexCells(radius);
      for (const cell of allCells) {
        const pos = hexToPixel(cell.q, cell.r);
        drawHexagonPath(pos.x, pos.y, hexRadius);
        ctx.fillStyle = "#f6f6f4";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
        ctx.stroke();
      }

      // 2. Draw active numbered tiles with spring interpolation
      for (const t of g.tiles) {
        const targetPos = hexToPixel(t.q, t.r);

        if (t.currentX === undefined) {
          t.currentX = targetPos.x;
          t.currentY = targetPos.y;
        } else {
          // Smooth spring damping towards target position
          t.currentX += (targetPos.x - t.currentX) * 0.28;
          t.currentY += (targetPos.y - t.currentY) * 0.28;
        }

        // Scale-in & pop animations
        if (t.scale === undefined) t.scale = 1;
        if (t.scale < 1) {
          t.scale = Math.min(1, t.scale + 6.5 * dt);
        } else if (t.scale > 1) {
          t.scale = Math.max(1, t.scale - 1.8 * dt);
        }

        const tileStyle = TILE_STYLES[t.value] || TILE_STYLES[4096];
        const tileSize = hexRadius * t.scale;

        ctx.save();
        drawHexagonPath(t.currentX, t.currentY, tileSize);

        // Radiant multi-stop gradient for tile body
        const grad = ctx.createLinearGradient(
          t.currentX - tileSize,
          t.currentY - tileSize,
          t.currentX + tileSize,
          t.currentY + tileSize
        );
        grad.addColorStop(0, tileStyle.bg[0]);
        grad.addColorStop(1, tileStyle.bg[1]);

        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 1.25;
        ctx.strokeStyle = tileStyle.border;
        ctx.stroke();

        // Inner rim highlight for tactile depth
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.stroke();

        // Render Tile Number
        ctx.fillStyle = tileStyle.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const valStr = String(t.value);
        let fontSize = tileSize * 0.52;
        if (valStr.length >= 4) fontSize = tileSize * 0.36;
        else if (valStr.length >= 3) fontSize = tileSize * 0.44;

        ctx.font = `700 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillText(valStr, t.currentX, t.currentY + 1);

        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [radius]);

  return (
    <div className="hexa-minimal-app">
      {/* Unified 3-Column Minimal Header */}
      <header className="hexa-nav" role="banner">
        <div className="hexa-nav-left">
          <button
            type="button"
            id="back-to-portfolio-btn"
            className="hexa-back-link"
            onClick={onNavigateHome}
          >
            ← iliash.me
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="hexa-nav-title">Hexa Merge</h1>
        </div>

        <div className="hexa-presets" role="radiogroup" aria-label="Board Size">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              id={`mode-pill-${m.id}`}
              role="radio"
              aria-checked={mode === m.id}
              className={`hexa-preset-pill ${mode === m.id ? "is-active" : ""}`}
              onClick={() => handleSelectMode(m.id)}
              title={m.label}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="hexa-nav-right">
          <div className="hexa-best-pill" aria-label={`Best score: ${bestScore}`}>
            BEST<strong>{bestScore}</strong>
          </div>
          <button
            type="button"
            id="toggle-sfx-btn"
            className="hexa-audio-btn"
            onClick={() => setSfxEnabled((prev) => !prev)}
            aria-label={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {sfxEnabled ? "SFX On" : "Muted"}
          </button>
        </div>
      </header>

      {/* Main Interactive Board */}
      <main className="hexa-stage-wrapper">
        <div
          ref={boardCardRef}
          className="hexa-board-card"
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          role="region"
          aria-label="Hexa Merge Board"
        >
          {/* Top HUD */}
          <div className="hexa-hud-top">
            <div className="hexa-hud-score-col">
              <span className="hexa-hud-score-label">Score</span>
              <span className="hexa-hud-score-val">{score}</span>
            </div>

            <div className="hexa-hud-actions">
              <button
                type="button"
                id="hexa-undo-btn"
                className="hexa-hud-btn"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo last move (⌘Z)"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                id="hexa-restart-btn"
                className="hexa-hud-btn"
                onClick={() => resetGame()}
                title="New Game (R)"
              >
                ↻ Restart
              </button>
            </div>
          </div>

          {/* Combo Indicator */}
          {combo > 1 && (
            <div className="hexa-combo-badge" aria-live="polite">
              COMBO ×{combo}
            </div>
          )}

          {/* Game Over / Win Modal Overlay */}
          {gameState !== "playing" && (
            <div className="hexa-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="hexa-overlay-card">
                <h2 className="hexa-overlay-title">
                  {gameState === "won" ? "2048 Achieved!" : "No Moves Left"}
                </h2>
                <p className="hexa-overlay-sub">
                  {gameState === "won"
                    ? "Magnificent job reaching the legendary hexagonal summit!"
                    : "The hexagonal grid is locked with no possible merges."}
                </p>

                <div className="hexa-overlay-metrics">
                  <div className="hexa-overlay-metric-item">
                    <span className="hexa-overlay-metric-label">Final Score</span>
                    <span className="hexa-overlay-metric-val">{score}</span>
                  </div>
                  <div className="hexa-overlay-metric-item">
                    <span className="hexa-overlay-metric-label">High Score</span>
                    <span className={`hexa-overlay-metric-val ${score >= bestScore ? "is-best" : ""}`}>
                      {bestScore}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  id="hexa-play-again-btn"
                  className="hexa-restart-btn"
                  onClick={() => resetGame()}
                >
                  {gameState === "won" ? "Continue Playing (R)" : "Try Again (R)"}
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hexa-canvas" />
        </div>

        {/* Tactile Directional Dial Controller */}
        <div className="hexa-controls-row">
          <div className="hexa-dial-pad" aria-label="6-Directional Hex Controls">
            <button
              type="button"
              id="dir-btn-nw"
              className="hexa-dial-btn"
              onClick={() => move(HEX_DIRECTIONS[4])}
              title="North-West (W)"
              aria-label="North-West"
            >
              ↖
            </button>
            <div />
            <button
              type="button"
              id="dir-btn-ne"
              className="hexa-dial-btn"
              onClick={() => move(HEX_DIRECTIONS[5])}
              title="North-East (E)"
              aria-label="North-East"
            >
              ↗
            </button>
            <button
              type="button"
              id="dir-btn-w"
              className="hexa-dial-btn"
              onClick={() => move(HEX_DIRECTIONS[3])}
              title="West (A / Left)"
              aria-label="West"
            >
              ←
            </button>
            <div />
            <button
              type="button"
              id="dir-btn-e"
              className="hexa-dial-btn"
              onClick={() => move(HEX_DIRECTIONS[0])}
              title="East (D / Right)"
              aria-label="East"
            >
              →
            </button>
            <button
              type="button"
              id="dir-btn-sw"
              className="hexa-dial-btn"
              onClick={() => move(HEX_DIRECTIONS[2])}
              title="South-West (Z)"
              aria-label="South-West"
            >
              ↙
            </button>
            <div />
            <button
              type="button"
              id="dir-btn-se"
              className="hexa-dial-btn"
              onClick={() => move(HEX_DIRECTIONS[1])}
              title="South-East (X)"
              aria-label="South-East"
            >
              ↘
            </button>
          </div>
        </div>

        <div className="hexa-hint-bar" aria-hidden="true">
          <span><kbd>Swipe</kbd> or <kbd>W E A D Z X</kbd> / <kbd>Arrows</kbd> to slide</span>
          <span>•</span>
          <span><kbd>⌘Z</kbd> Undo</span>
          <span>•</span>
          <span><kbd>R</kbd> Restart</span>
        </div>
      </main>
    </div>
  );
}

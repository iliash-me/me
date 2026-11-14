import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ColorFloodApp.css";
import { useGameFullscreen } from "./useGameFullscreen";

const PALETTE = [
  { id: 0, name: "Signal Orange", color: "#ff4f18" },
  { id: 1, name: "Cobalt", color: "#2563eb" },
  { id: 2, name: "Emerald", color: "#10b981" },
  { id: 3, name: "Amber", color: "#f59e0b" },
  { id: 4, name: "Violet", color: "#8b5cf6" },
  { id: 5, name: "Graphite", color: "#18181b" }
];

const MODES = [
  { id: "compact", name: "10×10", size: 10, maxMoves: 18, label: "Compact 10×10 Grid" },
  { id: "classic", name: "14×14", size: 14, maxMoves: 25, label: "Classic 14×14 Grid" },
  { id: "large", name: "18×18", size: 18, maxMoves: 32, label: "Large 18×18 Grid" }
];

function getBestStorageKey(modeId) {
  return `iliash-color-flood-best-${modeId}`;
}

function getProgressStorageKey(modeId) {
  return `iliash-color-flood-progress-${modeId}`;
}

function loadBestMoves(modeId) {
  try {
    const val = parseInt(localStorage.getItem(getBestStorageKey(modeId)) || "0", 10);
    return Number.isFinite(val) && val > 0 ? val : null;
  } catch {
    return null;
  }
}

function saveBestMoves(modeId, moves) {
  try {
    localStorage.setItem(getBestStorageKey(modeId), String(moves));
  } catch {
    // ignore storage errors
  }
}

function loadProgress(modeId, expectedSize) {
  try {
    const raw = localStorage.getItem(getProgressStorageKey(modeId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      data &&
      Array.isArray(data.grid) &&
      data.grid.length === expectedSize * expectedSize &&
      typeof data.moves === "number"
    ) {
      return data;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveProgress(modeId, data) {
  try {
    localStorage.setItem(getProgressStorageKey(modeId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function createRandomGrid(size) {
  const grid = new Array(size * size);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.floor(Math.random() * PALETTE.length);
  }
  return grid;
}

function getFloodRegion(grid, size) {
  const targetColor = grid[0];
  const visited = new Set([0]);
  const queue = [0];
  let head = 0;

  while (head < queue.length) {
    const idx = queue[head++];
    const r = Math.floor(idx / size);
    const c = idx % size;

    const neighbors = [];
    if (r > 0) neighbors.push((r - 1) * size + c);
    if (r < size - 1) neighbors.push((r + 1) * size + c);
    if (c > 0) neighbors.push(r * size + (c - 1));
    if (c < size - 1) neighbors.push(r * size + (c + 1));

    for (const n of neighbors) {
      if (!visited.has(n) && grid[n] === targetColor) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited;
}

function playFloodSound(type, gainCount, enabled) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._floodAudioCtx) {
      window._floodAudioCtx = new AudioCtx();
    }
    const ctx = window._floodAudioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    if (type === "flood") {
      const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
      const idx = Math.min(notes.length - 1, Math.floor(gainCount / 3));
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(notes[idx], now);
      osc.frequency.exponentialRampToValueAtTime(notes[idx] * 1.03, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.25);
      });
    } else if (type === "lose") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(196, now);
      osc.frequency.exponentialRampToValueAtTime(88, now + 0.3);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // ignore audio errors
  }
}

export default function ColorFloodApp({ onNavigateHome }) {
  const [mode, setMode] = useState("classic");
  const modeCfg = useMemo(() => MODES.find((m) => m.id === mode) || MODES[1], [mode]);

  const [sfxEnabled, setSfxEnabled] = useState(() => {
    try {
      return localStorage.getItem("iliash-color-flood-sfx") !== "false";
    } catch {
      return true;
    }
  });

  const [bestMoves, setBestMoves] = useState(() => loadBestMoves("classic"));
  const [grid, setGrid] = useState(() => {
    const saved = loadProgress("classic", 14);
    return saved ? saved.grid : createRandomGrid(14);
  });
  const [moves, setMoves] = useState(() => {
    const saved = loadProgress("classic", 14);
    return saved ? saved.moves : 0;
  });
  const [history, setHistory] = useState(() => {
    const saved = loadProgress("classic", 14);
    return saved && Array.isArray(saved.history) ? saved.history : [];
  });

  const appContainerRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useGameFullscreen(appContainerRef);

  const floodedSet = useMemo(() => getFloodRegion(grid, modeCfg.size), [grid, modeCfg.size]);
  const capturedPercent = Math.round((floodedSet.size / grid.length) * 100);
  const isWon = floodedSet.size === grid.length;
  const isLost = !isWon && moves >= modeCfg.maxMoves;
  const currentColor = grid[0];

  useEffect(() => {
    saveProgress(mode, { grid, moves, history });
  }, [mode, grid, moves, history]);

  const handleSelectMode = useCallback((nextModeId) => {
    if (nextModeId === mode) return;
    const cfg = MODES.find((m) => m.id === nextModeId) || MODES[1];
    const saved = loadProgress(nextModeId, cfg.size);
    setMode(nextModeId);
    setBestMoves(loadBestMoves(nextModeId));
    if (saved) {
      setGrid(saved.grid);
      setMoves(saved.moves);
      setHistory(Array.isArray(saved.history) ? saved.history : []);
    } else {
      setGrid(createRandomGrid(cfg.size));
      setMoves(0);
      setHistory([]);
    }
  }, [mode]);

  const resetGame = useCallback(() => {
    const fresh = createRandomGrid(modeCfg.size);
    setGrid(fresh);
    setMoves(0);
    setHistory([]);
  }, [modeCfg.size]);

  const handleFloodColor = useCallback(
    (newColor) => {
      if (isWon || isLost) return;
      if (newColor === currentColor) return;

      const prevRegion = getFloodRegion(grid, modeCfg.size);
      const nextGrid = [...grid];
      for (const idx of prevRegion) {
        nextGrid[idx] = newColor;
      }

      const nextRegion = getFloodRegion(nextGrid, modeCfg.size);
      const gained = nextRegion.size - prevRegion.size;
      const nextMoves = moves + 1;

      setHistory((prev) => [...prev.slice(-29), { grid, moves }]);
      setGrid(nextGrid);
      setMoves(nextMoves);

      if (nextRegion.size === nextGrid.length) {
        playFloodSound("win", gained, sfxEnabled);
        if (bestMoves === null || nextMoves < bestMoves) {
          setBestMoves(nextMoves);
          saveBestMoves(mode, nextMoves);
        }
      } else if (nextMoves >= modeCfg.maxMoves) {
        playFloodSound("lose", 0, sfxEnabled);
      } else {
        playFloodSound("flood", gained, sfxEnabled);
      }
    },
    [isWon, isLost, currentColor, grid, modeCfg.size, modeCfg.maxMoves, moves, sfxEnabled, bestMoves, mode]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setGrid(last.grid);
    setMoves(last.moves);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("iliash-color-flood-sfx", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        handleFloodColor(Number(e.key) - 1);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        resetGame();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFloodColor, resetGame, handleUndo]);

  return (
    <div
      ref={appContainerRef}
      className={`flood-minimal-app ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      <header className="flood-nav">
        <div className="flood-nav-left">
          <button
            type="button"
            id="back-to-portfolio-btn"
            className="flood-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="flood-nav-title">Color Flood</h1>
        </div>

        <div className="flood-presets" role="radiogroup" aria-label="Grid Size">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              className={`flood-preset-pill ${mode === m.id ? "is-active" : ""}`}
              onClick={() => handleSelectMode(m.id)}
              title={m.label}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="flood-nav-right">
          <div className="flood-best-pill" aria-label={`Best moves: ${bestMoves ?? "none"}`}>
            BEST<strong>{bestMoves !== null ? `${bestMoves} mv` : "—"}</strong>
          </div>
          <button
            type="button"
            className="flood-audio-btn"
            onClick={toggleSfx}
            aria-label={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {sfxEnabled ? "SFX On" : "Muted"}
          </button>
          <button
            type="button"
            className={`flood-fullscreen-btn ${isFullscreen ? "is-active" : ""}`}
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

      <main className="flood-stage-wrapper">
        <div className="flood-board-card" role="region" aria-label="Color Flood Board">
          <div className="flood-hud-top">
            <div className="flood-hud-metrics">
              <div className="flood-hud-metric">
                <span className="flood-hud-label">Moves</span>
                <span className={`flood-hud-val ${modeCfg.maxMoves - moves <= 3 && !isWon ? "is-warning" : ""}`}>
                  {moves}
                  <span className="flood-hud-val-sub">/{modeCfg.maxMoves}</span>
                </span>
              </div>
              <div className="flood-hud-metric">
                <span className="flood-hud-label">Captured</span>
                <span className="flood-hud-val">{capturedPercent}%</span>
              </div>
            </div>

            <div className="flood-hud-actions">
              <button
                type="button"
                className="flood-hud-btn"
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Undo last move (⌘Z)"
                aria-label="Undo last move"
              >
                <span aria-hidden="true">↶</span>
              </button>
              <button
                type="button"
                className="flood-hud-btn"
                onClick={resetGame}
                title="Restart game (R)"
                aria-label="Restart game"
              >
                <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                className="flood-hud-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Expand to Fullscreen (F)"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
              >
                <span aria-hidden="true">{isFullscreen ? "⤓" : "⛶"}</span>
              </button>
            </div>
          </div>

          <div
            className="flood-grid-wrap"
            style={{ gridTemplateColumns: `repeat(${modeCfg.size}, 1fr)` }}
          >
            {grid.map((colorIdx, i) => (
              <div
                key={i}
                className={`flood-cell ${i === 0 ? "is-origin" : ""}`}
                style={{ backgroundColor: PALETTE[colorIdx].color }}
              />
            ))}
          </div>

          <div className="flood-swatches" role="group" aria-label="Color Swatches">
            {PALETTE.map((swatch, idx) => {
              const isCurrent = swatch.id === currentColor;
              return (
                <button
                  key={swatch.id}
                  type="button"
                  className={`flood-swatch-btn ${isCurrent ? "is-current" : ""}`}
                  style={{ backgroundColor: swatch.color }}
                  onClick={() => handleFloodColor(swatch.id)}
                  disabled={isCurrent || isWon || isLost}
                  title={`${swatch.name} (Key ${idx + 1})`}
                  aria-label={`Flood with ${swatch.name}`}
                >
                  <span className="flood-swatch-key">{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {(isWon || isLost) && (
            <div className="flood-overlay">
              <div className="flood-overlay-card">
                <h2 className="flood-overlay-title">
                  {isWon ? "Grid Flooded!" : "Out of Moves"}
                </h2>
                <p className="flood-overlay-sub">
                  {isWon
                    ? "Every tile unified from the top-left origin."
                    : `Reached ${capturedPercent}% coverage in ${moves} moves.`}
                </p>

                <div className="flood-overlay-metrics">
                  <div className="flood-overlay-metric">
                    <span className="flood-overlay-metric-label">Moves</span>
                    <span className="flood-overlay-metric-val">{moves}</span>
                  </div>
                  <div className="flood-overlay-metric">
                    <span className="flood-overlay-metric-label">Best</span>
                    <span className={`flood-overlay-metric-val ${isWon && bestMoves === moves ? "is-best" : ""}`}>
                      {bestMoves !== null ? bestMoves : "—"}
                    </span>
                  </div>
                </div>

                <div className="flood-overlay-actions">
                  {isLost && history.length > 0 && (
                    <button
                      type="button"
                      className="flood-secondary-btn"
                      onClick={handleUndo}
                    >
                      ↶ Undo
                    </button>
                  )}
                  <button
                    type="button"
                    className="flood-primary-btn"
                    onClick={resetGame}
                  >
                    Play Again ↻
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flood-hint-bar">
          <span><kbd>1</kbd>–<kbd>6</kbd> Flood Color</span>
          <span><kbd>⌘Z</kbd> Undo</span>
          <span><kbd>R</kbd> Restart</span>
          <span><kbd>F</kbd> Fullscreen</span>
        </div>
      </main>
    </div>
  );
}

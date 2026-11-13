import { useCallback, useEffect, useRef, useState } from "react";
import "./HexaMergeApp.css";
import { useGameFullscreen } from "./useGameFullscreen";

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

// LocalStorage Persistence Helpers for Game Progress & Lifetime Stats
function loadHexaProgress(modeId) {
  try {
    const raw = localStorage.getItem(`iliash_hexa_progress_${modeId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tiles) && parsed.tiles.length > 0) {
      return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function saveHexaProgress(modeId, progress) {
  try {
    if (!progress) {
      localStorage.removeItem(`iliash_hexa_progress_${modeId}`);
    } else {
      localStorage.setItem(`iliash_hexa_progress_${modeId}`, JSON.stringify(progress));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function loadHexaStats() {
  try {
    const raw = localStorage.getItem("iliash_hexa_stats");
    return raw ? JSON.parse(raw) : { gamesPlayed: 0, totalMerges: 0, highestTile: 2 };
  } catch {
    return { gamesPlayed: 0, totalMerges: 0, highestTile: 2 };
  }
}

function updateHexaStats(mergesDelta = 0, newTileValue = 0, gamesPlayedDelta = 0) {
  try {
    const stats = loadHexaStats();
    stats.gamesPlayed = (stats.gamesPlayed || 0) + gamesPlayedDelta;
    stats.totalMerges = (stats.totalMerges || 0) + mergesDelta;
    if (newTileValue > (stats.highestTile || 2)) {
      stats.highestTile = newTileValue;
    }
    localStorage.setItem("iliash_hexa_stats", JSON.stringify(stats));
    return stats;
  } catch {
    return null;
  }
}

export default function HexaMergeApp({ onNavigateHome }) {
  // Restore preferred difficulty mode from localStorage
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem("iliash_hexa_mode");
      if (saved && MODES.some((m) => m.id === saved)) return saved;
    } catch {
      // ignore
    }
    return "classic";
  });

  // Restore audio preference from localStorage
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("iliash_hexa_sfx");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("iliash_hexa_sfx", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentConfig = MODES.find((m) => m.id === mode) || MODES[1];
  const radius = currentConfig.radius;

  // Restore saved in-progress board if available
  const savedInit = loadHexaProgress(mode);

  const [score, setScore] = useState(() => (savedInit ? savedInit.score || 0 : 0));
  const [bestScore, setBestScore] = useState(() => {
    try {
      const saved = localStorage.getItem(`iliash_hexa_best_${mode}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [combo, setCombo] = useState(() => (savedInit ? savedInit.combo || 0 : 0));
  const [gameState, setGameState] = useState(() => (savedInit ? savedInit.gameState || "playing" : "playing"));
  const [canUndo, setCanUndo] = useState(() => Boolean(savedInit?.canUndo));
  const [hasWon2048, setHasWon2048] = useState(() => Boolean(savedInit?.hasWon2048));
  const [showMilestone, setShowMilestone] = useState(false);

  const canvasRef = useRef(null);
  const boardCardRef = useRef(null);
  const appRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useGameFullscreen(appRef);

  // Tile structure: { id, q, r, value, currentX, currentY, targetX, targetY, scale: 0..1, isNew, isMerged }
  const gameRef = useRef({
    tiles: savedInit
      ? savedInit.tiles.map((t) => ({ id: t.id, q: t.q, r: t.r, value: t.value, scale: 1, isNew: false }))
      : createInitialHexaTiles(radius),
    history: savedInit?.history || null,
    nextTileId: savedInit ? Math.max(...savedInit.tiles.map((t) => t.id || 0), 1) + 1 : 3,
    dragStart: null,
    lastTime: 0
  });

  const stateRef = useRef({
    mode,
    score,
    combo,
    canUndo,
    gameState,
    hasWon2048
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      score,
      combo,
      canUndo,
      gameState,
      hasWon2048
    };
  }, [mode, score, combo, canUndo, gameState, hasWon2048]);

  // Auto-save active board to localStorage on page exit or component unmount (never overwrites other modes)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const g = gameRef.current;
      const st = stateRef.current;
      if (g?.tiles?.length) {
        saveHexaProgress(st.mode, {
          tiles: g.tiles.map((t) => ({ id: t.id, q: t.q, r: t.r, value: t.value })),
          score: st.score,
          combo: st.combo,
          canUndo: st.canUndo,
          history: g.history,
          gameState: st.gameState,
          hasWon2048: st.hasWon2048
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

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

  // Initialize a fresh board & clear in-progress storage for this mode
  const resetGame = useCallback(
    (targetRadius = radius, targetMode = mode) => {
      const initialTiles = createInitialHexaTiles(targetRadius);
      gameRef.current.nextTileId = initialTiles.length + 1;
      gameRef.current.tiles = initialTiles;
      gameRef.current.history = null;

      setScore(0);
      setCombo(0);
      setGameState("playing");
      setCanUndo(false);
      setHasWon2048(false);
      setShowMilestone(false);

      // Persist fresh board & record games played stat
      saveHexaProgress(targetMode, {
        tiles: initialTiles,
        score: 0,
        combo: 0,
        canUndo: false,
        history: null,
        gameState: "playing",
        hasWon2048: false
      });
      updateHexaStats(0, 0, 1);
    },
    [radius, mode]
  );

  // Switch difficulty mode cleanly preserving all other modes and options
  const handleSelectMode = (newMode) => {
    if (newMode === mode) return;

    // 1. Cleanly save current mode's active board state before switching
    const currentG = gameRef.current;
    if (currentG?.tiles?.length > 0) {
      saveHexaProgress(mode, {
        tiles: currentG.tiles.map((t) => ({ id: t.id, q: t.q, r: t.r, value: t.value })),
        score,
        combo,
        canUndo,
        history: currentG.history,
        gameState,
        hasWon2048
      });
    }

    // 2. Switch to new mode and update mode preference
    setMode(newMode);
    try {
      localStorage.setItem("iliash_hexa_mode", newMode);
      const savedBest = localStorage.getItem(`iliash_hexa_best_${newMode}`);
      setBestScore(savedBest ? parseInt(savedBest, 10) : 0);
    } catch {
      setBestScore(0);
    }

    // 3. Load or initialize target mode's independent progress without resetting anything else
    const targetConfig = MODES.find((m) => m.id === newMode) || MODES[1];
    const progress = loadHexaProgress(newMode);

    if (progress && Array.isArray(progress.tiles) && progress.tiles.length > 0) {
      currentG.tiles = progress.tiles.map((t) => ({
        id: t.id,
        q: t.q,
        r: t.r,
        value: t.value,
        scale: 1,
        isNew: false
      }));
      currentG.history = progress.history || null;
      currentG.nextTileId = Math.max(...progress.tiles.map((t) => t.id || 0), 1) + 1;
      setScore(progress.score || 0);
      setCombo(progress.combo || 0);
      setCanUndo(Boolean(progress.canUndo));
      setGameState(progress.gameState || "playing");
      setHasWon2048(Boolean(progress.hasWon2048));
      setShowMilestone(false);
    } else {
      const freshTiles = createInitialHexaTiles(targetConfig.radius);
      currentG.tiles = freshTiles;
      currentG.history = null;
      currentG.nextTileId = freshTiles.length + 1;
      setScore(0);
      setCombo(0);
      setCanUndo(false);
      setGameState("playing");
      setHasWon2048(false);
      setShowMilestone(false);

      saveHexaProgress(newMode, {
        tiles: freshTiles,
        score: 0,
        combo: 0,
        canUndo: false,
        history: null,
        gameState: "playing",
        hasWon2048: false
      });
      updateHexaStats(0, 0, 1);
    }
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

      const nextCombo = roundMerges > 0 ? combo + roundMerges : 0;

      // Update lifetime merges and highest tile reached
      const highestInMove = Math.max(...nextTiles.map((t) => t.value));
      updateHexaStats(roundMerges, highestInMove, 0);

      // Check 2048 milestone celebration (displayed once, never blocks gameplay)
      let newlyWon = false;
      const has2048Now = nextTiles.some((t) => t.value >= 2048);
      if (has2048Now && !hasWon2048) {
        setHasWon2048(true);
        setShowMilestone(true);
        newlyWon = true;
        playHexaSound("merge", 2048, 4, sfxEnabled);
        setTimeout(() => setShowMilestone(false), 5000);
      }

      // Check game over (only when no valid moves remain)
      let nextGameState = gameState === "won" ? "playing" : gameState;
      if (checkGameOver(nextTiles, radius)) {
        playHexaSound("gameover", 0, 0, sfxEnabled);
        nextGameState = "gameover";
        setGameState("gameover");
      }

      // Persist active board state
      saveHexaProgress(mode, {
        tiles: nextTiles.map((t) => ({ id: t.id, q: t.q, r: t.r, value: t.value })),
        score: newScore,
        combo: nextCombo,
        canUndo: nextGameState === "playing",
        history: previousState,
        gameState: nextGameState,
        hasWon2048: hasWon2048 || newlyWon
      });
    },
    [gameState, score, combo, radius, sfxEnabled, mode, spawnTile, hasWon2048]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    const g = gameRef.current;
    if (!g.history) return;

    g.tiles = g.history.tiles;
    const restoredScore = g.history.score;
    const restoredCombo = g.history.combo || 0;
    setScore(restoredScore);
    setCombo(restoredCombo);
    g.history = null;
    setCanUndo(false);
    setGameState("playing");

    // Persist undone board state to localStorage
    saveHexaProgress(mode, {
      tiles: g.tiles.map((t) => ({ id: t.id, q: t.q, r: t.r, value: t.value })),
      score: restoredScore,
      combo: restoredCombo,
      canUndo: false,
      history: null,
      gameState: "playing",
      hasWon2048
    });
  }, [mode, hasWon2048]);

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
  }, [move, resetGame, handleUndo]);

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

      if (cw <= 0 || ch <= 0) {
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);

      // Responsive horizontal and vertical margins to ensure the hex grid never touches or clips borders
      const padX = cw < 480 ? 32 : 56;
      const topOffset = cw < 480 ? 76 : 84;
      const bottomPad = cw < 480 ? 24 : 32;

      // In pointy-topped axial coordinates:
      // Total board width  = sqrt(3) * (2 * radius + 1) * hexRadius
      // Total board height = (3 * radius + 2) * hexRadius
      const maxRFromWidth = (cw - padX) / (Math.sqrt(3) * (2 * radius + 1));
      const maxRFromHeight = (ch - (topOffset + bottomPad)) / (3 * radius + 2);
      const hexRadius = Math.max(16, Math.min(maxRFromWidth, maxRFromHeight));

      const centerX = cw / 2;
      const centerY = topOffset + (ch - topOffset - bottomPad) / 2;

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
    <div ref={appRef} className={`hexa-minimal-app ${isFullscreen ? "is-fullscreen" : ""}`}>
      {/* Unified 3-Column Minimal Header */}
      <header className="hexa-nav" role="banner">
        <div className="hexa-nav-left">
          <button
            type="button"
            id="back-to-portfolio-btn"
            className="hexa-back-link"
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
            onClick={toggleSfx}
            aria-label={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {sfxEnabled ? "SFX On" : "Muted"}
          </button>
          <button
            type="button"
            id="toggle-fullscreen-btn"
            className={`hexa-fullscreen-btn ${isFullscreen ? "is-active" : ""}`}
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
            <div className="hexa-hud-scores-group">
              <div className="hexa-hud-score-col">
                <span className="hexa-hud-score-label">Score</span>
                <span className="hexa-hud-score-val">{score}</span>
              </div>
              <div className={`hexa-hud-score-col is-best ${score >= bestScore && score > 0 ? "is-new-high" : ""}`}>
                <span className="hexa-hud-score-label">Best</span>
                <span className="hexa-hud-score-val">{bestScore}</span>
              </div>
            </div>

            <div className="hexa-hud-actions">
              <button
                type="button"
                id="hexa-undo-btn"
                className="hexa-hud-btn"
                onClick={handleUndo}
                disabled={!canUndo || gameState !== "playing"}
                title="Undo last move (⌘Z)"
                aria-label="Undo"
              >
                <span className="hexa-btn-icon" aria-hidden="true">↶</span>
                <span className="hexa-hud-btn-label">Undo</span>
              </button>
              <button
                type="button"
                id="hexa-restart-btn"
                className="hexa-hud-btn"
                onClick={() => resetGame()}
                title="New Game (R)"
                aria-label="Restart game"
              >
                <span className="hexa-btn-icon" aria-hidden="true">↻</span>
                <span className="hexa-hud-btn-label">Restart</span>
              </button>
              <button
                type="button"
                id="hexa-fullscreen-hud-btn"
                className="hexa-hud-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (F)" : "Expand to Fullscreen (F)"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
              >
                <span className="hexa-btn-icon" aria-hidden="true">{isFullscreen ? "⤓" : "⛶"}</span>
                <span className="hexa-hud-btn-label">{isFullscreen ? "Exit" : "Expand"}</span>
              </button>
            </div>
          </div>

          {/* Combo Indicator */}
          {combo > 1 && (
            <div className="hexa-combo-badge" aria-live="polite">
              COMBO ×{combo}
            </div>
          )}

          {/* 2048 Milestone Celebration Banner (Non-blocking) */}
          {showMilestone && (
            <div className="hexa-milestone-banner" role="status" aria-live="polite">
              <div className="hexa-milestone-content">
                <span className="hexa-milestone-icon">🏆</span>
                <div className="hexa-milestone-text">
                  <strong>2048 Achieved!</strong>
                  <span>Infinite mode unlocked — keep merging!</span>
                </div>
              </div>
              <button
                type="button"
                className="hexa-milestone-dismiss"
                onClick={() => setShowMilestone(false)}
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          )}

          {/* Game Over Modal Overlay */}
          {gameState === "gameover" && (
            <div className="hexa-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="hexa-overlay-card">
                <h2 className="hexa-overlay-title">
                  {hasWon2048 ? "2048 Master!" : "No Moves Left"}
                </h2>
                <p className="hexa-overlay-sub">
                  {hasWon2048
                    ? "Incredible hexagonal conquest reaching 2048 and beyond!"
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

                {(() => {
                  const st = loadHexaStats();
                  if (st.highestTile > 2 || st.totalMerges > 0) {
                    return (
                      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.72rem", color: "#71717a", fontFamily: "'JetBrains Mono', monospace" }}>
                        <span>Peak Tile: <strong style={{ color: "#111315" }}>{st.highestTile}</strong></span>
                        <span>•</span>
                        <span>Merges: <strong style={{ color: "#111315" }}>{st.totalMerges}</strong></span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <button
                  type="button"
                  id="hexa-play-again-btn"
                  className="hexa-restart-btn"
                  onClick={() => resetGame()}
                >
                  Play Again (R)
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hexa-canvas" />
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

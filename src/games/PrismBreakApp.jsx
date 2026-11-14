import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./PrismBreakApp.css";
import { useGameFullscreen } from "./useGameFullscreen";

const MODES = [
  { id: "zen", name: "Zen", speed: 300, paddleWidthRatio: 0.24, multiplier: 1, label: "Zen Mode (Wide paddle)" },
  { id: "arcade", name: "Arcade", speed: 390, paddleWidthRatio: 0.19, multiplier: 1, label: "Arcade Mode" },
  { id: "hyper", name: "Hyper", speed: 490, paddleWidthRatio: 0.15, multiplier: 1.5, label: "Hyper Mode (1.5× Score)" }
];

const BRICK_COLORS = [
  "#ff4f18",
  "#f59e0b",
  "#10b981",
  "#2563eb",
  "#8b5cf6"
];

function getBestKey(modeId) {
  return `iliash-prism-break-best-${modeId}`;
}

function loadBestScore(modeId) {
  try {
    const val = parseInt(localStorage.getItem(getBestKey(modeId)) || "0", 10);
    return Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(modeId, score) {
  try {
    localStorage.setItem(getBestKey(modeId), String(score));
  } catch {
    // ignore
  }
}

function playPrismSound(type, combo, enabled) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._prismAudioCtx) {
      window._prismAudioCtx = new AudioCtx();
    }
    const ctx = window._prismAudioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "paddle") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "wall") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "brick") {
      const notes = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
      const freq = notes[Math.min(notes.length - 1, combo)];
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "loseLife") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.28);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === "levelClear") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, now + i * 0.06);
        g.gain.setValueAtTime(0.07, now + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.22);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.06);
        o.stop(now + i * 0.06 + 0.22);
      });
    }
  } catch {
    // ignore
  }
}

function buildBricks(level, width) {
  const cols = 8;
  const rows = Math.min(7, 4 + Math.floor((level - 1) / 2));
  const padX = 16;
  const gap = 6;
  const brickW = (width - padX * 2 - gap * (cols - 1)) / cols;
  const brickH = 18;
  const topOffset = 22;

  const bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const armored = level >= 2 && r === 0 && (c + level) % 2 === 0;
      bricks.push({
        x: padX + c * (brickW + gap),
        y: topOffset + r * (brickH + gap),
        w: brickW,
        h: brickH,
        hp: armored ? 2 : 1,
        maxHp: armored ? 2 : 1,
        color: BRICK_COLORS[r % BRICK_COLORS.length]
      });
    }
  }
  return bricks;
}

export default function PrismBreakApp({ onNavigateHome }) {
  const [mode, setMode] = useState("arcade");
  const modeCfg = useMemo(() => MODES.find((m) => m.id === mode) || MODES[1], [mode]);

  const [sfxEnabled, setSfxEnabled] = useState(() => {
    try {
      return localStorage.getItem("iliash-prism-break-sfx") !== "false";
    } catch {
      return true;
    }
  });

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => loadBestScore("arcade"));
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState("ready"); // ready | playing | paused | gameover

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const appContainerRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useGameFullscreen(appContainerRef);

  const stateRef = useRef({
    width: 560,
    height: 400,
    paddleX: 280,
    paddleW: 100,
    paddleH: 12,
    ballX: 280,
    ballY: 340,
    ballVX: 0,
    ballVY: 0,
    ballR: 7,
    bricks: [],
    particles: [],
    combo: 0,
    keys: { left: false, right: false },
    status: "ready",
    level: 1,
    lives: 3,
    score: 0,
    bestScore: loadBestScore("arcade"),
    modeCfg: MODES[1],
    sfxEnabled: true
  });

  useEffect(() => {
    stateRef.current.modeCfg = modeCfg;
    stateRef.current.sfxEnabled = sfxEnabled;
  }, [modeCfg, sfxEnabled]);

  const resetBallOnPaddle = useCallback((st) => {
    st.ballX = st.paddleX;
    st.ballY = st.height - 28 - st.paddleH - st.ballR - 1;
    st.ballVX = 0;
    st.ballVY = 0;
    st.combo = 0;
  }, []);

  const initGame = useCallback(
    (nextModeCfg = modeCfg, nextBest = bestScore) => {
      const st = stateRef.current;
      st.modeCfg = nextModeCfg;
      st.paddleW = Math.max(64, st.width * nextModeCfg.paddleWidthRatio);
      st.paddleX = st.width / 2;
      st.level = 1;
      st.lives = 3;
      st.score = 0;
      st.bestScore = nextBest;
      st.status = "ready";
      st.particles = [];
      st.bricks = buildBricks(1, st.width);
      resetBallOnPaddle(st);

      setLevel(1);
      setLives(3);
      setScore(0);
      setStatus("ready");
    },
    [modeCfg, bestScore, resetBallOnPaddle]
  );

  const launchBall = useCallback(() => {
    const st = stateRef.current;
    if (st.status === "ready") {
      const angle = (Math.random() * 0.5 - 0.25) - Math.PI / 2;
      const spd = st.modeCfg.speed * (1 + (st.level - 1) * 0.06);
      st.ballVX = Math.cos(angle) * spd;
      st.ballVY = Math.sin(angle) * spd;
      st.status = "playing";
      setStatus("playing");
    } else if (st.status === "paused") {
      st.status = "playing";
      setStatus("playing");
    } else if (st.status === "gameover") {
      initGame();
    }
  }, [initGame]);

  const togglePause = useCallback(() => {
    const st = stateRef.current;
    if (st.status === "playing") {
      st.status = "paused";
      setStatus("paused");
    } else if (st.status === "paused" || st.status === "ready") {
      launchBall();
    }
  }, [launchBall]);

  const handleSelectMode = useCallback(
    (nextModeId) => {
      if (nextModeId === mode) return;
      const cfg = MODES.find((m) => m.id === nextModeId) || MODES[1];
      const nextBest = loadBestScore(nextModeId);
      setMode(nextModeId);
      setBestScore(nextBest);
      initGame(cfg, nextBest);
    },
    [mode, initGame]
  );

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("iliash-prism-break-sfx", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Resize observer
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const updateSize = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const st = stateRef.current;
      const prevW = st.width;
      st.width = rect.width;
      st.height = rect.height;
      st.paddleW = Math.max(64, rect.width * st.modeCfg.paddleWidthRatio);
      st.paddleX = Math.max(
        st.paddleW / 2,
        Math.min(rect.width - st.paddleW / 2, (st.paddleX / prevW) * rect.width)
      );

      if (st.bricks.length === 0) {
        st.bricks = buildBricks(st.level, st.width);
      } else {
        // Rescale brick positions horizontally
        const scaleX = rect.width / prevW;
        st.bricks.forEach((b) => {
          b.x *= scaleX;
          b.w *= scaleX;
        });
      }

      if (st.status === "ready") {
        resetBallOnPaddle(st);
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [resetBallOnPaddle]);

  // Main game loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      const st = stateRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const dpr = canvas.width / Math.max(1, st.width);
        ctx.save();
        ctx.scale(dpr, dpr);

        // Keyboard paddle movement
        const paddleSpeed = 520;
        if (st.keys.left) st.paddleX -= paddleSpeed * dt;
        if (st.keys.right) st.paddleX += paddleSpeed * dt;
        st.paddleX = Math.max(st.paddleW / 2 + 8, Math.min(st.width - st.paddleW / 2 - 8, st.paddleX));

        if (st.status === "ready") {
          st.ballX = st.paddleX;
        } else if (st.status === "playing") {
          st.ballX += st.ballVX * dt;
          st.ballY += st.ballVY * dt;

          // Wall collisions
          if (st.ballX - st.ballR < 0) {
            st.ballX = st.ballR;
            st.ballVX = Math.abs(st.ballVX);
            playPrismSound("wall", 0, st.sfxEnabled);
          } else if (st.ballX + st.ballR > st.width) {
            st.ballX = st.width - st.ballR;
            st.ballVX = -Math.abs(st.ballVX);
            playPrismSound("wall", 0, st.sfxEnabled);
          }

          if (st.ballY - st.ballR < 0) {
            st.ballY = st.ballR;
            st.ballVY = Math.abs(st.ballVY);
            playPrismSound("wall", 0, st.sfxEnabled);
          }

          // Paddle collision
          const paddleTop = st.height - 28 - st.paddleH;
          if (
            st.ballVY > 0 &&
            st.ballY + st.ballR >= paddleTop &&
            st.ballY - st.ballR <= paddleTop + st.paddleH &&
            st.ballX >= st.paddleX - st.paddleW / 2 - st.ballR &&
            st.ballX <= st.paddleX + st.paddleW / 2 + st.ballR
          ) {
            const hitOffset = (st.ballX - st.paddleX) / (st.paddleW / 2);
            const clamped = Math.max(-0.92, Math.min(0.92, hitOffset));
            const speed = Math.hypot(st.ballVX, st.ballVY);
            const bounceAngle = clamped * (Math.PI / 3) - Math.PI / 2;
            st.ballVX = Math.cos(bounceAngle) * speed;
            st.ballVY = Math.sin(bounceAngle) * speed;
            st.ballY = paddleTop - st.ballR - 0.5;
            st.combo = 0;
            playPrismSound("paddle", 0, st.sfxEnabled);
          }

          // Brick collisions
          for (let i = st.bricks.length - 1; i >= 0; i--) {
            const b = st.bricks[i];
            const closestX = Math.max(b.x, Math.min(st.ballX, b.x + b.w));
            const closestY = Math.max(b.y, Math.min(st.ballY, b.y + b.h));
            const dx = st.ballX - closestX;
            const dy = st.ballY - closestY;

            if (dx * dx + dy * dy <= st.ballR * st.ballR) {
              if (Math.abs(dx) > Math.abs(dy)) {
                st.ballVX = -st.ballVX;
              } else {
                st.ballVY = -st.ballVY;
              }

              b.hp -= 1;
              st.combo += 1;
              playPrismSound("brick", st.combo - 1, st.sfxEnabled);

              const pts = Math.round((10 + (st.combo - 1) * 5) * st.modeCfg.multiplier);
              st.score += pts;
              setScore(st.score);

              if (st.score > st.bestScore) {
                st.bestScore = st.score;
                setBestScore(st.bestScore);
                saveBestScore(st.modeCfg.id, st.bestScore);
              }

              // Spawn particles
              for (let p = 0; p < 6; p++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 60 + Math.random() * 120;
                st.particles.push({
                  x: b.x + b.w / 2,
                  y: b.y + b.h / 2,
                  vx: Math.cos(a) * spd,
                  vy: Math.sin(a) * spd,
                  life: 0.38,
                  color: b.color
                });
              }

              if (b.hp <= 0) {
                st.bricks.splice(i, 1);
              }
              break;
            }
          }

          // Level clear
          if (st.bricks.length === 0) {
            st.level += 1;
            setLevel(st.level);
            st.bricks = buildBricks(st.level, st.width);
            st.status = "ready";
            setStatus("ready");
            resetBallOnPaddle(st);
            playPrismSound("levelClear", 0, st.sfxEnabled);
          }

          // Bottom miss
          if (st.ballY - st.ballR > st.height) {
            st.lives -= 1;
            setLives(st.lives);
            playPrismSound("loseLife", 0, st.sfxEnabled);
            if (st.lives <= 0) {
              st.status = "gameover";
              setStatus("gameover");
            } else {
              st.status = "ready";
              setStatus("ready");
              resetBallOnPaddle(st);
            }
          }
        }

        // Update particles
        for (let i = st.particles.length - 1; i >= 0; i--) {
          const p = st.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) st.particles.splice(i, 1);
        }

        // Render
        ctx.clearRect(0, 0, st.width, st.height);

        // Subtle grid dots background
        ctx.fillStyle = "rgba(0, 0, 0, 0.035)";
        for (let gx = 24; gx < st.width; gx += 28) {
          for (let gy = 24; gy < st.height; gy += 28) {
            ctx.fillRect(gx, gy, 1.5, 1.5);
          }
        }

        // Bricks
        for (const b of st.bricks) {
          ctx.fillStyle = b.color;
          ctx.globalAlpha = b.hp === 2 ? 1 : 0.92;
          ctx.beginPath();
          ctx.roundRect(b.x, b.y, b.w, b.h, 5);
          ctx.fill();

          if (b.hp > 1) {
            ctx.strokeStyle = "#111315";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // Particles
        for (const p of st.particles) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life / 0.38);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Paddle
        const paddleTop = st.height - 28 - st.paddleH;
        ctx.fillStyle = "#111315";
        ctx.beginPath();
        ctx.roundRect(st.paddleX - st.paddleW / 2, paddleTop, st.paddleW, st.paddleH, 6);
        ctx.fill();

        // Ball
        ctx.fillStyle = "#ff4f18";
        ctx.beginPath();
        ctx.arc(st.ballX, st.ballY, st.ballR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [resetBallOnPaddle]);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        stateRef.current.keys.left = true;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        stateRef.current.keys.right = true;
      } else if (e.key === " ") {
        e.preventDefault();
        togglePause();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        initGame();
      }
    };

    const onKeyUp = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        stateRef.current.keys.left = false;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        stateRef.current.keys.right = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [togglePause, initGame]);

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const st = stateRef.current;
    st.paddleX = Math.max(st.paddleW / 2 + 8, Math.min(st.width - st.paddleW / 2 - 8, x));
  };

  return (
    <div
      ref={appContainerRef}
      className={`prism-minimal-app ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      <header className="prism-nav">
        <div className="prism-nav-left">
          <button
            type="button"
            id="back-to-portfolio-btn"
            className="prism-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="prism-nav-title">Prism Break</h1>
        </div>

        <div className="prism-presets" role="radiogroup" aria-label="Difficulty Mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              className={`prism-preset-pill ${mode === m.id ? "is-active" : ""}`}
              onClick={() => handleSelectMode(m.id)}
              title={m.label}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="prism-nav-right">
          <div className="prism-best-pill" aria-label={`Best score: ${bestScore}`}>
            BEST<strong>{bestScore}</strong>
          </div>
          <button
            type="button"
            className="prism-audio-btn"
            onClick={toggleSfx}
            aria-label={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {sfxEnabled ? "SFX On" : "Muted"}
          </button>
          <button
            type="button"
            className={`prism-fullscreen-btn ${isFullscreen ? "is-active" : ""}`}
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

      <main className="prism-stage-wrapper">
        <div className="prism-board-card" role="region" aria-label="Prism Break Stage">
          <div className="prism-hud-top">
            <div className="prism-hud-metrics">
              <div className="prism-hud-metric">
                <span className="prism-hud-label">Score</span>
                <span className="prism-hud-val">{score}</span>
              </div>
              <div className="prism-hud-metric">
                <span className="prism-hud-label">Level</span>
                <span className="prism-hud-val">{level}</span>
              </div>
              <div className="prism-hud-metric">
                <span className="prism-hud-label">Lives</span>
                <div className="prism-lives-dots" aria-label={`${lives} lives remaining`}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={`prism-life-dot ${i >= lives ? "is-lost" : ""}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="prism-hud-actions">
              <button
                type="button"
                className="prism-hud-btn"
                onClick={togglePause}
                title={status === "playing" ? "Pause (Space)" : "Launch / Resume (Space)"}
                aria-label={status === "playing" ? "Pause game" : "Launch or resume game"}
              >
                <span aria-hidden="true">{status === "playing" ? "⏸" : "▶"}</span>
              </button>
              <button
                type="button"
                className="prism-hud-btn"
                onClick={() => initGame()}
                title="Restart game (R)"
                aria-label="Restart game"
              >
                <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                className="prism-hud-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Expand to Fullscreen (F)"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
              >
                <span aria-hidden="true">{isFullscreen ? "⤓" : "⛶"}</span>
              </button>
            </div>
          </div>

          <div ref={wrapRef} className="prism-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="prism-canvas"
              onMouseMove={handlePointerMove}
              onTouchMove={handlePointerMove}
              onClick={() => {
                if (status === "ready" || status === "paused") launchBall();
              }}
            />

            {status === "ready" && (
              <div className="prism-launch-pill">
                Tap or press Space to launch
              </div>
            )}
            {status === "paused" && (
              <div className="prism-launch-pill">
                Paused — tap or press Space
              </div>
            )}
          </div>

          {status === "gameover" && (
            <div className="prism-overlay">
              <div className="prism-overlay-card">
                <h2 className="prism-overlay-title">Game Over</h2>
                <p className="prism-overlay-sub">
                  Reached Level {level} in {modeCfg.name} mode.
                </p>

                <div className="prism-overlay-metrics">
                  <div className="prism-overlay-metric">
                    <span className="prism-overlay-metric-label">Score</span>
                    <span className="prism-overlay-metric-val">{score}</span>
                  </div>
                  <div className="prism-overlay-metric">
                    <span className="prism-overlay-metric-label">Best</span>
                    <span className={`prism-overlay-metric-val ${score >= bestScore && score > 0 ? "is-best" : ""}`}>
                      {bestScore}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="prism-primary-btn"
                  onClick={() => initGame()}
                >
                  Play Again ↻
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="prism-hint-bar">
          <span><kbd>Mouse</kbd> / <kbd>←</kbd><kbd>→</kbd> Move Paddle</span>
          <span><kbd>Space</kbd> Launch / Pause</span>
          <span><kbd>R</kbd> Restart</span>
          <span><kbd>F</kbd> Fullscreen</span>
        </div>
      </main>
    </div>
  );
}

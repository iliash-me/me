import { useCallback, useEffect, useRef, useState } from "react";
import "./OrbitDashApp.css";

const MODES = [
  { id: "chill", name: "Chill", baseSpeed: 1.65, spawnGap: 1.15, accel: 0.04 },
  { id: "arcade", name: "Arcade", baseSpeed: 2.2, spawnGap: 0.92, accel: 0.075 },
  { id: "hyper", name: "Hyper", baseSpeed: 2.85, spawnGap: 0.78, accel: 0.11 }
];

// Minimal Web Audio API Synthesizer for tactile arcade clicks & chimes
function playSynthSound(type, enabled) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._orbitAudioCtx) {
      window._orbitAudioCtx = new AudioCtx();
    }
    const ctx = window._orbitAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "flip") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.055);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "pickup") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.045); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "lap") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.11);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "crash") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.24);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

function normalizeAngleDiff(a, b) {
  let diff = (a - b) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

export default function OrbitDashApp({ onNavigateHome }) {
  const [modeId, setModeId] = useState("arcade");
  const [soundOn, setSoundOn] = useState(true);
  const [gameState, setGameState] = useState("ready"); // ready | playing | gameover
  const [score, setScore] = useState(0);
  const [laps, setLaps] = useState(0);
  const [combo, setCombo] = useState(1);
  const [bestScores, setBestScores] = useState(() => {
    try {
      const saved = localStorage.getItem("iliash-orbit-best");
      return saved ? JSON.parse(saved) : { chill: 0, arcade: 0, hyper: 0 };
    } catch {
      return { chill: 0, arcade: 0, hyper: 0 };
    }
  });

  const canvasRef = useRef(null);
  const stateRef = useRef({
    status: "ready",
    mode: MODES[1],
    angle: -Math.PI / 2,
    totalAngle: 0,
    side: 1, // 1 = outer track, -1 = inner track
    radiusLerp: 1, // smooth spring interpolation between -1 and 1
    radiusVel: 0,
    speed: MODES[1].baseSpeed,
    score: 0,
    laps: 0,
    combo: 1,
    shake: 0,
    trail: [],
    obstacles: [],
    orbs: [],
    particles: [],
    popups: [],
    nextSpawnAngle: 0.9
  });

  const currentMode = MODES.find((m) => m.id === modeId) || MODES[1];
  const currentBest = bestScores[modeId] || 0;

  const saveBestScore = useCallback(
    (newScore) => {
      setBestScores((prev) => {
        const prevBest = prev[modeId] || 0;
        if (newScore <= prevBest) return prev;
        const updated = { ...prev, [modeId]: newScore };
        try {
          localStorage.setItem("iliash-orbit-best", JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [modeId]
  );

  // Spawn an obstacle + optional energy orb ahead of the player
  const spawnAhead = (st, atAngle) => {
    const wrappedAngle = ((atAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const side = Math.random() > 0.5 ? 1 : -1;
    st.obstacles.push({
      angle: wrappedAngle,
      side,
      passed: false,
      scale: 0
    });

    // 55% chance to spawn a collectible orb either on the safe side or slightly ahead
    if (Math.random() < 0.58) {
      const orbSide = Math.random() < 0.7 ? -side : side;
      const orbOffset = orbSide === side ? 0.34 : 0.0;
      st.orbs.push({
        angle: (wrappedAngle + orbOffset) % (Math.PI * 2),
        side: orbSide,
        collected: false,
        pulse: Math.random() * Math.PI * 2
      });
    }
  };

  const startGame = useCallback(
    (customMode = currentMode) => {
      const st = stateRef.current;
      st.status = "playing";
      st.mode = customMode;
      st.angle = -Math.PI / 2;
      st.totalAngle = 0;
      st.side = 1;
      st.radiusLerp = 1;
      st.radiusVel = 0;
      st.speed = customMode.baseSpeed;
      st.score = 0;
      st.laps = 0;
      st.combo = 1;
      st.shake = 0;
      st.trail = [];
      st.obstacles = [];
      st.orbs = [];
      st.particles = [];
      st.popups = [];

      // Seed initial obstacles starting 95 degrees ahead
      let cursor = st.angle + 1.45;
      for (let i = 0; i < 4; i++) {
        spawnAhead(st, cursor);
        cursor += customMode.spawnGap + Math.random() * 0.25;
      }

      setScore(0);
      setLaps(0);
      setCombo(1);
      setGameState("playing");
      playSynthSound("flip", soundOn);
    },
    [currentMode, soundOn]
  );

  const handleAction = useCallback(() => {
    const st = stateRef.current;
    if (st.status === "ready" || st.status === "gameover") {
      startGame(currentMode);
      return;
    }

    if (st.status === "playing") {
      st.side *= -1;
      playSynthSound("flip", soundOn);

      // Burst subtle flip particles
      const ringR = 122;
      const trackOffset = 20;
      const r = ringR + st.radiusLerp * trackOffset;
      const px = Math.cos(st.angle) * r;
      const py = Math.sin(st.angle) * r;
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 25 + Math.random() * 55;
        st.particles.push({
          x: px,
          y: py,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 1,
          decay: 3.2,
          size: 2.5,
          color: "#9ca3af"
        });
      }
    }
  }, [currentMode, soundOn, startGame]);

  // Keyboard listener (Space / Up / Down / W / S / Enter)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "KeyW" ||
        e.code === "KeyS"
      ) {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAction]);

  // Main 60/120fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let rafId;
    let lastTime = performance.now();

    const render = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const cx = width / 2;
      const cy = height / 2;
      const ringR = Math.min(width, height) * 0.29; // ~120px
      const trackOffset = 20;

      const st = stateRef.current;

      // Update physics
      if (st.status === "ready") {
        st.angle = (st.angle + 1.2 * dt) % (Math.PI * 2);
        st.radiusLerp += (st.side - st.radiusLerp) * Math.min(1, dt * 18);
      } else if (st.status === "playing") {
        const dTheta = st.speed * dt;
        st.angle = (st.angle + dTheta) % (Math.PI * 2);
        st.totalAngle += dTheta;

        // Check lap completion
        const completedLaps = Math.floor(st.totalAngle / (Math.PI * 2));
        if (completedLaps > st.laps) {
          st.laps = completedLaps;
          st.score += 10 * st.combo;
          st.speed = Math.min(st.mode.baseSpeed * 1.9, st.speed + st.mode.accel);
          setLaps(st.laps);
          setScore(st.score);
          saveBestScore(st.score);
          playSynthSound("lap", soundOn);

          st.popups.push({
            x: 0,
            y: -ringR - 46,
            text: `LAP ${st.laps}  +${10 * st.combo}`,
            life: 1,
            color: "#111315"
          });
        }

        // Spring interpolation for track switching
        const springStiffness = 280;
        const springDamping = 22;
        const force = (st.side - st.radiusLerp) * springStiffness;
        st.radiusVel = (st.radiusVel + force * dt) * Math.max(0, 1 - springDamping * dt);
        st.radiusLerp += st.radiusVel * dt;

        // Player coordinates relative to center
        const playerR = ringR + st.radiusLerp * trackOffset;
        const px = Math.cos(st.angle) * playerR;
        const py = Math.sin(st.angle) * playerR;

        // Record trail
        st.trail.push({ x: px, y: py, life: 1 });
        if (st.trail.length > 22) st.trail.shift();

        // Update obstacles & check collisions
        for (let i = st.obstacles.length - 1; i >= 0; i--) {
          const obs = st.obstacles[i];
          obs.scale = Math.min(1, obs.scale + dt * 6);

          const diff = normalizeAngleDiff(st.angle, obs.angle);

          // Collision zone
          if (Math.abs(diff) < 0.085) {
            const sameSide =
              (obs.side === 1 && st.radiusLerp > 0.15) ||
              (obs.side === -1 && st.radiusLerp < -0.15);

            if (sameSide) {
              // Crash!
              st.status = "gameover";
              st.shake = 12;
              setGameState("gameover");
              saveBestScore(st.score);
              playSynthSound("crash", soundOn);

              for (let k = 0; k < 26; k++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 40 + Math.random() * 160;
                st.particles.push({
                  x: px,
                  y: py,
                  vx: Math.cos(a) * spd,
                  vy: Math.sin(a) * spd,
                  life: 1,
                  decay: 1.8 + Math.random(),
                  size: 3 + Math.random() * 3,
                  color: k % 2 === 0 ? "#ff4f18" : "#111315"
                });
              }
              break;
            }
          }

          // Passed obstacle cleanly!
          if (!obs.passed && diff > 0.11 && diff < 0.6) {
            obs.passed = true;
            st.score += 1;
            setScore(st.score);
            saveBestScore(st.score);
          }

          // Recycle passed obstacle and spawn a new one ahead
          if (obs.passed && diff > 0.65) {
            st.obstacles.splice(i, 1);
            // Find furthest obstacle ahead
            let maxAhead = 0;
            st.obstacles.forEach((other) => {
              const d = ((other.angle - st.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
              if (d > maxAhead) maxAhead = d;
            });
            const nextDelta = Math.max(maxAhead, 1.2) + st.mode.spawnGap + Math.random() * 0.35;
            spawnAhead(st, st.angle + nextDelta);
          }
        }

        // Update collectible energy orbs
        for (let i = st.orbs.length - 1; i >= 0; i--) {
          const orb = st.orbs[i];
          orb.pulse += dt * 6;
          const diff = normalizeAngleDiff(st.angle, orb.angle);

          if (Math.abs(diff) < 0.11) {
            const sameSide =
              (orb.side === 1 && st.radiusLerp > 0) || (orb.side === -1 && st.radiusLerp < 0);
            if (sameSide) {
              const pts = 5 * st.combo;
              st.score += pts;
              st.combo = Math.min(8, st.combo + 1);
              setScore(st.score);
              setCombo(st.combo);
              saveBestScore(st.score);
              playSynthSound("pickup", soundOn);

              const orbR = ringR + orb.side * trackOffset;
              const ox = Math.cos(orb.angle) * orbR;
              const oy = Math.sin(orb.angle) * orbR;

              st.popups.push({
                x: ox,
                y: oy - 14,
                text: `+${pts}`,
                life: 1,
                color: "#ff4f18"
              });

              for (let k = 0; k < 10; k++) {
                const a = Math.random() * Math.PI * 2;
                const spd = 30 + Math.random() * 80;
                st.particles.push({
                  x: ox,
                  y: oy,
                  vx: Math.cos(a) * spd,
                  vy: Math.sin(a) * spd,
                  life: 1,
                  decay: 2.6,
                  size: 2.5,
                  color: "#ff4f18"
                });
              }

              st.orbs.splice(i, 1);
              continue;
            }
          }

          // Remove missed orb behind player
          if (diff > 0.7 && diff < 1.5) {
            st.combo = 1;
            setCombo(1);
            st.orbs.splice(i, 1);
          }
        }
      }

      // Update trail, particles, popups, and screen shake
      for (let i = st.trail.length - 1; i >= 0; i--) {
        st.trail[i].life -= dt * 3.8;
        if (st.trail[i].life <= 0) st.trail.splice(i, 1);
      }

      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) st.particles.splice(i, 1);
      }

      for (let i = st.popups.length - 1; i >= 0; i--) {
        const pop = st.popups[i];
        pop.y -= 24 * dt;
        pop.life -= dt * 1.6;
        if (pop.life <= 0) st.popups.splice(i, 1);
      }

      if (st.shake > 0) {
        st.shake = Math.max(0, st.shake - dt * 45);
      }

      // ==================== RENDER STAGE ====================
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fafaf9";
      ctx.fillRect(0, 0, width, height);

      const shakeX = st.shake > 0 ? (Math.random() - 0.5) * st.shake : 0;
      const shakeY = st.shake > 0 ? (Math.random() - 0.5) * st.shake : 0;

      ctx.save();
      ctx.translate(cx + shakeX, cy + shakeY);

      // Subtle inner and outer dashed guide tracks
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(17, 19, 21, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, ringR + trackOffset, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ringR - trackOffset, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Main Center Orbit Ring
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = "#111315";
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Center Minimal Score Telemetry inside the Ring
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#111315";
      ctx.font = "700 42px 'JetBrains Mono', monospace";
      ctx.fillText(String(st.score), 0, -4);

      ctx.fillStyle = "#9ca3af";
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillText(
        st.status === "playing" ? `LAP ${st.laps + 1} · x${st.combo}` : st.mode.name.toUpperCase(),
        0,
        26
      );

      // Draw Collectible Energy Orbs
      st.orbs.forEach((orb) => {
        const orbR = ringR + orb.side * trackOffset;
        const ox = Math.cos(orb.angle) * orbR;
        const oy = Math.sin(orb.angle) * orbR;
        const pulseRadius = 5.5 + Math.sin(orb.pulse) * 1.2;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(orb.angle + Math.PI / 4);
        ctx.fillStyle = "#ff4f18";
        ctx.fillRect(-pulseRadius, -pulseRadius, pulseRadius * 2, pulseRadius * 2);
        ctx.restore();
      });

      // Draw Obstacles (Sharp Architectural Wedges/Spikes attached to the main ring)
      st.obstacles.forEach((obs) => {
        ctx.save();
        ctx.rotate(obs.angle);
        const h = 23 * obs.scale;
        const baseW = 7.5 * obs.scale;

        ctx.beginPath();
        if (obs.side === 1) {
          // Outer spike pointing outward from ringR
          ctx.moveTo(ringR - 1, -baseW);
          ctx.lineTo(ringR + h, 0);
          ctx.lineTo(ringR - 1, baseW);
        } else {
          // Inner spike pointing inward from ringR
          ctx.moveTo(ringR + 1, -baseW);
          ctx.lineTo(ringR - h, 0);
          ctx.lineTo(ringR + 1, baseW);
        }
        ctx.closePath();
        ctx.fillStyle = "#111315";
        ctx.fill();
        ctx.restore();
      });

      // Draw Player Trail
      st.trail.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1.5, 6 * pt.life), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 79, 24, ${pt.life * 0.28})`;
        ctx.fill();
      });

      // Draw Player Orb (if not crashed)
      if (st.status !== "gameover") {
        const playerR = ringR + st.radiusLerp * trackOffset;
        const px = Math.cos(st.angle) * playerR;
        const py = Math.sin(st.angle) * playerR;

        // Subtle connector line to the ring
        ctx.beginPath();
        ctx.moveTo(Math.cos(st.angle) * ringR, Math.sin(st.angle) * ringR);
        ctx.lineTo(px, py);
        ctx.strokeStyle = "rgba(255, 79, 24, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Player Orb
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4f18";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      // Draw Particles
      st.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Floating Popups
      st.popups.forEach((pop) => {
        ctx.globalAlpha = Math.max(0, pop.life);
        ctx.fillStyle = pop.color;
        ctx.font = "700 11px 'JetBrains Mono', monospace";
        ctx.fillText(pop.text, pop.x, pop.y);
      });
      ctx.globalAlpha = 1;

      ctx.restore();
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [saveBestScore, soundOn]);

  const handleModeSwitch = (mode) => {
    setModeId(mode.id);
    stateRef.current.mode = mode;
    stateRef.current.status = "ready";
    stateRef.current.score = 0;
    stateRef.current.laps = 0;
    stateRef.current.combo = 1;
    stateRef.current.obstacles = [];
    stateRef.current.orbs = [];
    setScore(0);
    setLaps(0);
    setCombo(1);
    setGameState("ready");
  };

  return (
    <div className="orbit-minimal-app">
      {/* Minimal Header (Matches Spring & Easing + Palette Studio Header Structure) */}
      <header className="orbit-nav">
        <div className="orbit-nav-left">
          <button
            type="button"
            id="orbit-back-btn"
            className="orbit-back-link"
            onClick={onNavigateHome}
          >
            ← iliash.me
          </button>
          <span className="orbit-nav-title">Orbit Dash</span>
        </div>

        <div className="orbit-presets" role="group" aria-label="Game difficulty mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              id={`orbit-mode-${m.id}`}
              className={`orbit-preset-pill ${modeId === m.id ? "is-active" : ""}`}
              onClick={() => handleModeSwitch(m)}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="orbit-nav-right">
          <div className="orbit-best-pill" title="Personal Best Score">
            <span>BEST</span>
            <strong>{currentBest}</strong>
          </div>

          <button
            type="button"
            id="orbit-sound-pill"
            className={`orbit-sound-pill ${soundOn ? "is-active" : ""}`}
            onClick={() => setSoundOn((s) => !s)}
          >
            <span className="sound-dot" />
            <span>{soundOn ? "SFX On" : "Muted"}</span>
          </button>
        </div>
      </header>

      {/* Main Centered Game Card */}
      <main className="orbit-main">
        <section className="orbit-stage-card" aria-label="Orbit Dash game stage">
          <div className="orbit-card-head">
            <div className="orbit-telemetry-pills">
              <span className="orbit-stat-pill">
                Score <strong>{score}</strong>
              </span>
              <span className="orbit-stat-pill">
                Laps <strong>{laps}</strong>
              </span>
              <span className="orbit-stat-pill is-combo">
                Multiplier <strong>x{combo}</strong>
              </span>
            </div>

            <button
              type="button"
              className="orbit-action-btn"
              onClick={handleAction}
            >
              {gameState === "playing" ? "Flip Track (Space)" : gameState === "gameover" ? "Play Again ↻" : "Start Game →"}
            </button>
          </div>

          {/* Interactive Canvas Stage */}
          <div
            className="orbit-canvas-wrap"
            onPointerDown={(e) => {
              e.preventDefault();
              handleAction();
            }}
            role="button"
            tabIndex={0}
            aria-label="Tap or press Space to flip orbit track"
          >
            <canvas ref={canvasRef} className="orbit-canvas" />

            {gameState === "ready" && (
              <div className="orbit-overlay-banner">
                <span className="overlay-kicker">ONE-BUTTON ARCADE</span>
                <p className="overlay-instruction">
                  Tap anywhere or press <kbd>Space</kbd> to flip between inner & outer orbit tracks.
                </p>
              </div>
            )}

            {gameState === "gameover" && (
              <div className="orbit-overlay-banner is-gameover">
                <span className="overlay-kicker">CRASHED AT LAP {laps + 1}</span>
                <p className="overlay-instruction">
                  Final Score: <strong>{score}</strong> · Tap or press <kbd>Space</kbd> to retry
                </p>
              </div>
            )}
          </div>

          {/* Minimal Legend Footer */}
          <div className="orbit-card-footer">
            <div className="orbit-legend-row">
              <span className="legend-item">
                <span className="legend-dot is-player" /> Player Orb
              </span>
              <span className="legend-item">
                <span className="legend-dot is-spike" /> Dodge Spikes (+1)
              </span>
              <span className="legend-item">
                <span className="legend-dot is-node" /> Energy Nodes (+5 × Combo)
              </span>
              <span className="legend-item">
                <span className="legend-dot is-lap" /> Full Orbit (+10 × Combo)
              </span>
            </div>
            <span className="orbit-controls-hint">
              Controls: <kbd>Space</kbd> / <kbd>Click</kbd> / <kbd>Tap</kbd>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

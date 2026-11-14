import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./PulseGridApp.css";
import { useGameFullscreen } from "./useGameFullscreen";

const MODES = [
  { id: "focus", name: "3×3", size: 3, label: "3×3 Focus Grid" },
  { id: "classic", name: "4×4", size: 4, label: "4×4 Classic Grid" },
  { id: "master", name: "5×5", size: 5, label: "5×5 Master Grid" }
];

const PENTATONIC = [
  261.63, 293.66, 329.63, 392.0, 440.0,
  523.25, 587.33, 659.25, 783.99, 880.0,
  1046.5, 1174.66, 1318.51
];

function getBestKey(modeId) {
  return `iliash-pulse-grid-best-${modeId}`;
}

function loadBestRound(modeId) {
  try {
    const val = parseInt(localStorage.getItem(getBestKey(modeId)) || "0", 10);
    return Number.isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

function saveBestRound(modeId, round) {
  try {
    localStorage.setItem(getBestKey(modeId), String(round));
  } catch {
    // ignore
  }
}

function playPadTone(padIdx, totalPads, enabled, isError = false) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._pulseAudioCtx) {
      window._pulseAudioCtx = new AudioCtx();
    }
    const ctx = window._pulseAudioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isError) {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.3);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      return;
    }

    const noteIdx = Math.floor((padIdx / Math.max(1, totalPads - 1)) * (PENTATONIC.length - 1));
    const freq = PENTATONIC[noteIdx] || 440;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // ignore
  }
}

export default function PulseGridApp({ onNavigateHome }) {
  const [mode, setMode] = useState("classic");
  const modeCfg = useMemo(() => MODES.find((m) => m.id === mode) || MODES[1], [mode]);
  const totalPads = modeCfg.size * modeCfg.size;

  const [sfxEnabled, setSfxEnabled] = useState(() => {
    try {
      return localStorage.getItem("iliash-pulse-grid-sfx") !== "false";
    } catch {
      return true;
    }
  });

  const [bestRound, setBestRound] = useState(() => loadBestRound("classic"));
  const [phase, setPhase] = useState("idle"); // idle | watching | input | gameover
  const [sequence, setSequence] = useState([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [litPad, setLitPad] = useState(null);
  const [errorPad, setErrorPad] = useState(null);
  const [successPad, setSuccessPad] = useState(null);

  const timersRef = useRef([]);
  const appContainerRef = useRef(null);
  const { isFullscreen, toggleFullscreen } = useGameFullscreen(appContainerRef);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const playSequence = useCallback(
    (seq, padCount) => {
      clearTimers();
      setPhase("watching");
      setInputIndex(0);
      setLitPad(null);
      setErrorPad(null);
      setSuccessPad(null);

      const stepDelay = Math.max(240, 480 - seq.length * 16);
      const litDuration = Math.max(150, stepDelay - 90);

      seq.forEach((padIdx, i) => {
        const startAt = 320 + i * stepDelay;
        const t1 = setTimeout(() => {
          setLitPad(padIdx);
          playPadTone(padIdx, padCount, sfxEnabled);
        }, startAt);
        const t2 = setTimeout(() => {
          setLitPad(null);
        }, startAt + litDuration);
        timersRef.current.push(t1, t2);
      });

      const endAt = 320 + seq.length * stepDelay + 60;
      const tEnd = setTimeout(() => {
        setPhase("input");
      }, endAt);
      timersRef.current.push(tEnd);
    },
    [clearTimers, sfxEnabled]
  );

  const startGame = useCallback(() => {
    const firstPad = Math.floor(Math.random() * totalPads);
    const nextSeq = [firstPad];
    setSequence(nextSeq);
    playSequence(nextSeq, totalPads);
  }, [totalPads, playSequence]);

  const handleSelectMode = useCallback(
    (nextModeId) => {
      if (nextModeId === mode) return;
      clearTimers();
      setMode(nextModeId);
      setBestRound(loadBestRound(nextModeId));
      setPhase("idle");
      setSequence([]);
      setInputIndex(0);
      setLitPad(null);
      setErrorPad(null);
      setSuccessPad(null);
    },
    [mode, clearTimers]
  );

  const handlePadClick = useCallback(
    (padIdx) => {
      if (phase !== "input") return;

      const expected = sequence[inputIndex];
      if (padIdx === expected) {
        playPadTone(padIdx, totalPads, sfxEnabled);
        setSuccessPad(padIdx);
        const tClear = setTimeout(() => setSuccessPad(null), 160);
        timersRef.current.push(tClear);

        const nextIndex = inputIndex + 1;
        if (nextIndex >= sequence.length) {
          const completedRound = sequence.length;
          if (completedRound > bestRound) {
            setBestRound(completedRound);
            saveBestRound(mode, completedRound);
          }

          setPhase("watching");
          const nextPad = Math.floor(Math.random() * totalPads);
          const nextSeq = [...sequence, nextPad];
          setSequence(nextSeq);

          const tNext = setTimeout(() => {
            playSequence(nextSeq, totalPads);
          }, 420);
          timersRef.current.push(tNext);
        } else {
          setInputIndex(nextIndex);
        }
      } else {
        playPadTone(padIdx, totalPads, sfxEnabled, true);
        setErrorPad(padIdx);
        setLitPad(expected);
        setPhase("gameover");
      }
    },
    [phase, sequence, inputIndex, totalPads, sfxEnabled, bestRound, mode, playSequence]
  );

  const toggleSfx = () => {
    setSfxEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("iliash-pulse-grid-sfx", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === " " && (phase === "idle" || phase === "gameover")) {
        e.preventDefault();
        startGame();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, startGame]);

  const currentRound = sequence.length;
  const completedRounds = phase === "gameover" ? Math.max(0, currentRound - 1) : Math.max(0, currentRound - 1);

  return (
    <div
      ref={appContainerRef}
      className={`pulse-minimal-app ${isFullscreen ? "is-fullscreen" : ""}`}
    >
      <header className="pulse-nav">
        <div className="pulse-nav-left">
          <button
            type="button"
            id="back-to-portfolio-btn"
            className="pulse-back-link"
            onClick={onNavigateHome}
          >
            ← Portfolio
          </button>
          <span className="orbit-header-sep" aria-hidden="true">/</span>
          <h1 className="pulse-nav-title">Pulse Grid</h1>
        </div>

        <div className="pulse-presets" role="radiogroup" aria-label="Grid Size">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              className={`pulse-preset-pill ${mode === m.id ? "is-active" : ""}`}
              onClick={() => handleSelectMode(m.id)}
              title={m.label}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="pulse-nav-right">
          <div className="pulse-best-pill" aria-label={`Best round: ${bestRound}`}>
            BEST<strong>R{bestRound}</strong>
          </div>
          <button
            type="button"
            className="pulse-audio-btn"
            onClick={toggleSfx}
            aria-label={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {sfxEnabled ? "SFX On" : "Muted"}
          </button>
          <button
            type="button"
            className={`pulse-fullscreen-btn ${isFullscreen ? "is-active" : ""}`}
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

      <main className="pulse-stage-wrapper">
        <div className="pulse-board-card" role="region" aria-label="Pulse Grid Sequencer">
          <div className="pulse-hud-top">
            <div className="pulse-hud-left">
              <div className="pulse-hud-metric">
                <span className="pulse-hud-label">Round</span>
                <span className="pulse-hud-val">{currentRound}</span>
              </div>
              <span
                className={`pulse-status-pill ${
                  phase === "watching" ? "is-watch" : phase === "input" ? "is-turn" : ""
                }`}
              >
                {phase === "idle" && "Ready"}
                {phase === "watching" && "Watch Pattern"}
                {phase === "input" && `Repeat (${inputIndex}/${sequence.length})`}
                {phase === "gameover" && "Missed"}
              </span>
            </div>

            <div className="pulse-hud-actions">
              <button
                type="button"
                className="pulse-hud-btn"
                onClick={startGame}
                title="Restart game (R)"
                aria-label="Restart game"
              >
                <span aria-hidden="true">↻</span>
              </button>
              <button
                type="button"
                className="pulse-hud-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Expand to Fullscreen (F)"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Expand to Fullscreen"}
              >
                <span aria-hidden="true">{isFullscreen ? "⤓" : "⛶"}</span>
              </button>
            </div>
          </div>

          <div
            className="pulse-grid-wrap"
            style={{ gridTemplateColumns: `repeat(${modeCfg.size}, 1fr)` }}
          >
            {Array.from({ length: totalPads }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`pulse-pad ${litPad === idx ? "is-lit" : ""} ${
                  successPad === idx ? "is-success" : ""
                } ${errorPad === idx ? "is-error" : ""}`}
                onClick={() => handlePadClick(idx)}
                disabled={phase !== "input"}
                aria-label={`Pad ${idx + 1}`}
              />
            ))}
          </div>

          <div className="pulse-footer-bar">
            {phase === "idle" ? (
              <button type="button" className="pulse-start-btn" onClick={startGame}>
                Start Sequence →
              </button>
            ) : (
              <div className="pulse-progress-dots" aria-hidden="true">
                {sequence.map((_, i) => (
                  <span
                    key={i}
                    className={`pulse-dot ${i < inputIndex ? "is-done" : ""}`}
                  />
                ))}
              </div>
            )}
          </div>

          {phase === "gameover" && (
            <div className="pulse-overlay">
              <div className="pulse-overlay-card">
                <h2 className="pulse-overlay-title">Sequence Broken</h2>
                <p className="pulse-overlay-sub">
                  You cleared {completedRounds} {completedRounds === 1 ? "round" : "rounds"} in {modeCfg.name} mode.
                </p>

                <div className="pulse-overlay-metrics">
                  <div className="pulse-overlay-metric">
                    <span className="pulse-overlay-metric-label">Cleared</span>
                    <span className="pulse-overlay-metric-val">{completedRounds}</span>
                  </div>
                  <div className="pulse-overlay-metric">
                    <span className="pulse-overlay-metric-label">Best</span>
                    <span className={`pulse-overlay-metric-val ${completedRounds >= bestRound && completedRounds > 0 ? "is-best" : ""}`}>
                      R{bestRound}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="pulse-primary-btn"
                  onClick={startGame}
                >
                  Play Again ↻
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pulse-hint-bar">
          <span><kbd>Space</kbd> Start</span>
          <span><kbd>R</kbd> Restart</span>
          <span><kbd>F</kbd> Fullscreen</span>
        </div>
      </main>
    </div>
  );
}

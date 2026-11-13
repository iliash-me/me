import { useCallback, useEffect, useRef, useState } from "react";
import "./TerminalApp.css";
import { DISCIPLINES, PROFILE, PROJECTS } from "../data/portfolioData";

const THEMES = ["dark", "matrix", "amber", "cyberpunk", "nord", "paper"];

const VIRTUAL_FS = {
  "~": {
    type: "dir",
    children: ["about.txt", "skills.txt", "contact.txt", "resume.txt", "socials.txt", "projects", "tools", "games"]
  },
  "~/projects": {
    type: "dir",
    children: PROJECTS.map((p) => `${p.id}.md`)
  },
  "~/tools": {
    type: "dir",
    children: ["spring-tuner.sh", "palette-studio.sh"]
  },
  "~/games": {
    type: "dir",
    children: ["kinetic-stack.exe", "orbit-dash.exe"]
  }
};

const QUOTES = [
  "“Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra",
  "“Make it work, make it right, make it fast.” — Kent Beck",
  "“Good design is as little design as possible.” — Dieter Rams",
  "“First, solve the problem. Then, write the code.” — John Johnson",
  "“The details are not the details. They make the design.” — Charles Eames",
  "“Any fool can write code that a computer can understand. Good programmers write code that humans can understand.” — Martin Fowler"
];

// Tactile Web Audio Synthesizer for Mechanical Keyboard & Terminal Sounds
function playTerminalSound(type, enabled) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._termAudioCtx) {
      window._termAudioCtx = new AudioCtx();
    }
    const ctx = window._termAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "key") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1400 + Math.random() * 250, now);
      gain.gain.setValueAtTime(0.012, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
      osc.start(now);
      osc.stop(now + 0.022);
    } else if (type === "enter") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "bell") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(780, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch {
    // Audio context not allowed or failed
  }
}

export default function TerminalApp({ onNavigateHome, onNavigateTo }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("iliash-term-theme") || "dark";
  });
  const [crtEnabled, setCrtEnabled] = useState(() => {
    return localStorage.getItem("iliash-term-crt") !== "false";
  });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [matrixRain, setMatrixRain] = useState(false);

  const [cwd, setCwd] = useState("~");
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [startTime] = useState(() => Date.now());

  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const canvasRef = useRef(null);
  const executeCommandRef = useRef(null);

  // Initial welcome message banner
  const [logs, setLogs] = useState(() => [
    {
      id: "init-welcome",
      type: "system",
      content: (
        <div className="term-entry">
          <pre className="term-ascii" aria-hidden="true">
{` ___ _ _           _        __  __     
|_ _| (_) __ _ ___| |__    |  \\/  | ___ 
 | || | |/ _\` / __| '_ \\   | |\\/| |/ _ \\
 | || | | (_| \\__ \\ | | |  | |  | |  __/
|___|_|_|\\__,_|___/_| |_|  |_|  |_|\\___|`}
          </pre>
          <div className="term-output-block">
            <strong>iliash-sh (x86_64-pc-web) v2.4.0-release</strong>
            <br />
            Welcome to the interactive terminal portfolio of{" "}
            <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>{PROFILE.name}</span>.
            <br />
            Type <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>help</span> to view available commands, or{" "}
            <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>neofetch</span> for system summary.
            <br />
            Explore: <span style={{ color: "var(--t-prompt)" }}>about</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>projects</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>skills</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>tools</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>games</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>contact</span>
            <br />
            Switch back anytime with <span style={{ color: "var(--t-prompt)" }}>gui</span> or{" "}
            <span style={{ color: "var(--t-prompt)" }}>exit</span>.
          </div>
        </div>
      )
    }
  ]);

  // Keep input focused
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync theme with localStorage
  useEffect(() => {
    localStorage.setItem("iliash-term-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("iliash-term-crt", String(crtEnabled));
  }, [crtEnabled]);

  // Auto-scroll to bottom on log changes
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs, inputVal]);

  // Matrix falling rain animation on canvas
  useEffect(() => {
    if (!matrixRain) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const characters = "0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = theme === "amber" ? "#ffb000" : "#00ff66";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [matrixRain, theme]);

  const getDhakaTime = () => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: PROFILE.timezone,
        dateStyle: "medium",
        timeStyle: "medium",
        hour12: false
      }).format(new Date());
    } catch {
      return new Date().toISOString();
    }
  };

  // Execute Command Logic
  const executeCommand = useCallback(
    (rawCmd) => {
      const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
      const uptimeStr = `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s`;

      const trimmed = rawCmd.trim();
      playTerminalSound("enter", soundEnabled);

      if (!trimmed) {
        setLogs((prev) => [
          ...prev,
          {
            id: `cmd-${Date.now()}`,
            type: "command",
            cwd,
            command: "",
            content: null
          }
        ]);
        return;
      }

      // Add to history
      setHistory((prev) => [...prev, trimmed]);
      setHistoryIdx(-1);

      const parts = trimmed.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      let outputContent = null;

      switch (cmd) {
        case "clear":
        case "cls": {
          setLogs([]);
          return;
        }

        case "help":
        case "?": {
          outputContent = (
            <div className="term-output-block">
              <div className="term-category-kicker">// PORTFOLIO & WORK</div>
              <table className="term-table">
                <tbody>
                  <tr>
                    <td className="term-cmd-col">about / bio</td>
                    <td className="term-desc-col">Background, engineering philosophy, and bio</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">projects</td>
                    <td className="term-desc-col">List all production projects and interactive work</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">project &lt;id&gt;</td>
                    <td className="term-desc-col">Deep-dive into architecture, highlights & stack</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">skills / tech</td>
                    <td className="term-desc-col">Core frontend engineering disciplines & technologies</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">tools</td>
                    <td className="term-desc-col">Interactive web tools (Spring Tuner, Palette Studio)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">games</td>
                    <td className="term-desc-col">Playable WebGL/Canvas games (Kinetic Stack, Orbit Dash)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">contact</td>
                    <td className="term-desc-col">Direct email address, socials, and contact channels</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">resume</td>
                    <td className="term-desc-col">Experience highlights, qualifications, and focus</td>
                  </tr>
                </tbody>
              </table>

              <div className="term-category-kicker">// NAVIGATION & SYSTEM</div>
              <table className="term-table">
                <tbody>
                  <tr>
                    <td className="term-cmd-col">gui / exit</td>
                    <td className="term-desc-col">Return to the standard graphic portfolio at /</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">open &lt;app&gt;</td>
                    <td className="term-desc-col">Launch tool/game (tuner, palette, kinetic, orbit)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">ls [dir]</td>
                    <td className="term-desc-col">List simulated files and subdirectories</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">cd &lt;dir&gt;</td>
                    <td className="term-desc-col">Change directory (e.g. cd projects, cd ..)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">cat &lt;file&gt;</td>
                    <td className="term-desc-col">Display file contents (e.g. cat about.txt)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">pwd</td>
                    <td className="term-desc-col">Print current working directory path</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">neofetch</td>
                    <td className="term-desc-col">System info card with ASCII logo and specs</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">theme [name]</td>
                    <td className="term-desc-col">Switch color theme (dark, matrix, amber, cyberpunk, nord, paper)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">crt [on|off]</td>
                    <td className="term-desc-col">Toggle CRT scanline raster and vignette effect</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">sound [on|off]</td>
                    <td className="term-desc-col">Toggle mechanical keyboard audio synthesizer</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">history</td>
                    <td className="term-desc-col">Display session command history</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">clear</td>
                    <td className="term-desc-col">Clear terminal screen (or Ctrl+L)</td>
                  </tr>
                </tbody>
              </table>

              <div className="term-category-kicker">// EXTRAS & FUN</div>
              <table className="term-table">
                <tbody>
                  <tr>
                    <td className="term-cmd-col">matrix</td>
                    <td className="term-desc-col">Toggle falling digital rain canvas overlay</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">time / date</td>
                    <td className="term-desc-col">Current time in Asia/Dhaka and local machine</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">weather</td>
                    <td className="term-desc-col">Dhaka atmospheric report</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">quote</td>
                    <td className="term-desc-col">Engineering or design philosophy quote</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">sudo &lt;cmd&gt;</td>
                    <td className="term-desc-col">Root privilege request</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
          break;
        }

        case "neofetch":
        case "fetch": {
          const ansiColors = [
            "#000000",
            "#ff5555",
            "#50fa7b",
            "#f1fa8c",
            "#bd93f9",
            "#ff79c6",
            "#8be9fd",
            "#f8f8f2"
          ];
          outputContent = (
            <div className="term-neofetch-grid">
              <pre className="term-neofetch-logo" aria-hidden="true">
{`   ████████   
   ██    ██   
   ██    ██   
   ████████   
   ██    ██   
   ██    ██   
   ██    ██   `}
              </pre>
              <div className="term-neofetch-info">
                <div className="term-neofetch-title">
                  guest@{PROFILE.domain}
                </div>
                <div className="term-neofetch-divider">
                  ---------------------------------
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">OS</span>
                  <span className="term-neofetch-val">React 19 / Vite / WebGL Engine</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Host</span>
                  <span className="term-neofetch-val">{PROFILE.domain} ({PROFILE.name})</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Uptime</span>
                  <span className="term-neofetch-val">{uptimeStr}</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Shell</span>
                  <span className="term-neofetch-val">iliash-sh v2.4 (x86_64)</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Role</span>
                  <span className="term-neofetch-val">{PROFILE.role}</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Stack</span>
                  <span className="term-neofetch-val">React · TypeScript · Three.js · CSS</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Timezone</span>
                  <span className="term-neofetch-val">{PROFILE.timezone} ({PROFILE.timezoneLabel})</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Lighthouse</span>
                  <span className="term-neofetch-val" style={{ color: "var(--t-success)" }}>
                    100 / 100 Performance
                  </span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Theme</span>
                  <span className="term-neofetch-val">{theme.toUpperCase()}</span>
                </div>
                <div className="term-ansi-swatches">
                  {ansiColors.map((c) => (
                    <span key={c} className="term-ansi-box" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          );
          break;
        }

        case "about":
        case "bio":
        case "whoami": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, fontSize: "1rem" }}>
                {PROFILE.name} — {PROFILE.role}
              </div>
              <div style={{ margin: "0.4rem 0", color: "var(--t-highlight)" }}>
                "{PROFILE.tagline}"
              </div>
              <p style={{ margin: "0.4rem 0" }}>{PROFILE.summary}</p>
              <div style={{ marginTop: "0.6rem" }}>
                {PROFILE.metrics.map((m) => (
                  <div key={m.label} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--t-muted)", minWidth: "150px" }}>• {m.label}:</span>
                    <span>{m.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "0.6rem", color: "var(--t-muted)" }}>
                💡 Tip: Type <span style={{ color: "var(--t-prompt)" }}>projects</span> to view featured builds, or <span style={{ color: "var(--t-prompt)" }}>contact</span> to reach out.
              </div>
            </div>
          );
          break;
        }

        case "projects": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                FEATURED PRODUCTION PROJECTS ({PROJECTS.length})
              </div>
              {PROJECTS.map((p) => (
                <div key={p.id} className="term-card">
                  <div className="term-card-header">
                    <div>
                      <span style={{ color: "var(--t-muted)", marginRight: "0.5rem" }}>
                        [{p.index}]
                      </span>
                      <strong className="term-card-title">{p.title}</strong>
                      <span style={{ color: "var(--t-muted)", marginLeft: "0.5rem" }}>
                        — {p.subtitle}
                      </span>
                    </div>
                    <span className="term-card-badge">{p.year} · {p.category}</span>
                  </div>
                  <div className="term-card-desc">{p.description}</div>
                  <div className="term-tag-list">
                    {p.stack.map((s) => (
                      <span key={s} className="term-tag">{s}</span>
                    ))}
                  </div>
                  <div className="term-link-row">
                    {p.liveUrl && (
                      <a
                        href={p.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="term-interactive-link"
                      >
                        [Live Demo ↗]
                      </a>
                    )}
                    {p.repoUrl && (
                      <a
                        href={p.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="term-interactive-link"
                      >
                        [Source Code ↗]
                      </a>
                    )}
                    <button
                      type="button"
                      className="term-interactive-link"
                      onClick={() => executeCommandRef.current?.(`project ${p.id}`)}
                    >
                      [Details: project {p.id}]
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "0.5rem", color: "var(--t-muted)" }}>
                Type <span style={{ color: "var(--t-prompt)" }}>project &lt;id&gt;</span> (e.g. <code>project img2threejs</code>) for architectural highlights.
              </div>
            </div>
          );
          break;
        }

        case "project": {
          const targetId = args[0]?.toLowerCase();
          if (!targetId) {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                Usage: project &lt;id&gt; (Available: {PROJECTS.map((p) => p.id).join(", ")})
              </div>
            );
            break;
          }
          const found = PROJECTS.find((p) => p.id.toLowerCase() === targetId);
          if (!found) {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                Project '{targetId}' not found. Available: {PROJECTS.map((p) => p.id).join(", ")}
              </div>
            );
            break;
          }
          outputContent = (
            <div className="term-card">
              <div className="term-card-header">
                <div>
                  <span style={{ color: "var(--t-prompt)", fontWeight: 700, fontSize: "1.1rem" }}>
                    {found.title}
                  </span>
                  <div style={{ color: "var(--t-muted)", fontSize: "0.85rem" }}>
                    {found.subtitle}
                  </div>
                </div>
                <span className="term-card-badge">{found.year} · {found.category}</span>
              </div>
              <p style={{ margin: "0.5rem 0" }}>{found.description}</p>
              <div style={{ margin: "0.4rem 0" }}>
                <strong style={{ color: "var(--t-highlight)" }}>Key Highlights:</strong>
                <ul style={{ paddingLeft: "1.2rem", marginTop: "0.2rem" }}>
                  {found.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
              <div className="term-tag-list">
                {found.stack.map((s) => (
                  <span key={s} className="term-tag">{s}</span>
                ))}
              </div>
              <div className="term-link-row">
                {found.liveUrl && (
                  <a
                    href={found.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="term-interactive-link"
                  >
                    Launch Live Demo ↗
                  </a>
                )}
                {found.repoUrl && (
                  <a
                    href={found.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="term-interactive-link"
                  >
                    View GitHub Repo ↗
                  </a>
                )}
              </div>
            </div>
          );
          break;
        }

        case "skills":
        case "tech":
        case "disciplines":
        case "stack": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                CORE DISCIPLINES & TECHNICAL EXPERTISE
              </div>
              {DISCIPLINES.map((d) => (
                <div key={d.number} className="term-card">
                  <div className="term-card-header">
                    <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>
                      [{d.number}] {d.title}
                    </span>
                  </div>
                  <div className="term-card-desc">{d.summary}</div>
                  <div className="term-tag-list">
                    {d.tags.map((t) => (
                      <span key={t} className="term-tag">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
          break;
        }

        case "tools": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                DEVELOPER TOOLS BUILT BY ILIASH
              </div>
              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Spring & Easing Tuner</strong>
                  <span className="term-card-badge">/tools/spring-tuner</span>
                </div>
                <div className="term-card-desc">
                  Interactive physics-based spring simulator, cubic-bezier visualizer, and UI motion lab.
                </div>
                <div className="term-link-row">
                  <button
                    type="button"
                    className="term-interactive-link"
                    onClick={() => {
                      if (onNavigateTo) onNavigateTo("/tools/spring-tuner");
                      else window.location.href = "/tools/spring-tuner";
                    }}
                  >
                    [Launch Spring Tuner ↗]
                  </button>
                </div>
              </div>

              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Palette & Contrast Studio</strong>
                  <span className="term-card-badge">/tools/palette-studio</span>
                </div>
                <div className="term-card-desc">
                  OKLCH color scale generator with WCAG 2.1 & APCA accessible contrast testing lab.
                </div>
                <div className="term-link-row">
                  <button
                    type="button"
                    className="term-interactive-link"
                    onClick={() => {
                      if (onNavigateTo) onNavigateTo("/tools/palette-studio");
                      else window.location.href = "/tools/palette-studio";
                    }}
                  >
                    [Launch Palette Studio ↗]
                  </button>
                </div>
              </div>
            </div>
          );
          break;
        }

        case "games": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                INTERACTIVE BROWSER GAMES BUILT BY ILIASH
              </div>
              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Kinetic Stack</strong>
                  <span className="term-card-badge">/games/kinetic-stack</span>
                </div>
                <div className="term-card-desc">
                  3D isometric slice & chord progression tower builder with Web Audio chime harmony.
                </div>
                <div className="term-link-row">
                  <button
                    type="button"
                    className="term-interactive-link"
                    onClick={() => {
                      if (onNavigateTo) onNavigateTo("/games/kinetic-stack");
                      else window.location.href = "/games/kinetic-stack";
                    }}
                  >
                    [Play Kinetic Stack ↗]
                  </button>
                </div>
              </div>

              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Orbit Dash</strong>
                  <span className="term-card-badge">/games/orbit-dash</span>
                </div>
                <div className="term-card-desc">
                  One-button rhythm arcade game featuring dual concentric orbits and obstacle dodging.
                </div>
                <div className="term-link-row">
                  <button
                    type="button"
                    className="term-interactive-link"
                    onClick={() => {
                      if (onNavigateTo) onNavigateTo("/games/orbit-dash");
                      else window.location.href = "/games/orbit-dash";
                    }}
                  >
                    [Play Orbit Dash ↗]
                  </button>
                </div>
              </div>
            </div>
          );
          break;
        }

        case "contact":
        case "email": {
          outputContent = (
            <div className="term-card">
              <div className="term-card-header">
                <span style={{ color: "var(--t-prompt)", fontWeight: 700 }}>DIRECT CONTACT</span>
                <span className="term-card-badge">Available for Projects</span>
              </div>
              <div style={{ margin: "0.4rem 0" }}>
                Email:{" "}
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="term-interactive-link"
                  style={{ fontWeight: 600 }}
                >
                  {PROFILE.email}
                </a>
              </div>
              <div style={{ margin: "0.4rem 0" }}>
                Timezone: {PROFILE.timezone} ({PROFILE.timezoneLabel})
              </div>
              <div className="term-link-row">
                <a
                  href={`mailto:${PROFILE.email}?subject=Project%20Inquiry%20via%20Terminal`}
                  className="term-interactive-link"
                >
                  [Open in Mail Client ↗]
                </a>
                <a
                  href="https://github.com/iliash-me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="term-interactive-link"
                >
                  [GitHub ↗]
                </a>
                <a
                  href="https://www.facebook.com/iliashhosain"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="term-interactive-link"
                >
                  [Facebook ↗]
                </a>
              </div>
            </div>
          );
          break;
        }

        case "socials":
        case "links": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                VERIFIED SOCIAL PROFILES
              </div>
              {PROFILE.socials.map((s) => (
                <div key={s.id} style={{ margin: "0.25rem 0" }}>
                  <span style={{ color: "var(--t-muted)", minWidth: "100px", display: "inline-block" }}>
                    • {s.label}:
                  </span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="term-interactive-link"
                  >
                    {s.handle} ({s.url}) ↗
                  </a>
                </div>
              ))}
            </div>
          );
          break;
        }

        case "resume": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700 }}>
                RESUME SUMMARY — {PROFILE.name}
              </div>
              <div style={{ color: "var(--t-highlight)", margin: "0.2rem 0" }}>
                {PROFILE.role} · {PROFILE.domain}
              </div>
              <p style={{ margin: "0.4rem 0" }}>
                Specialized in architecting high-performance React applications, zero-dependency design token systems, and interactive 3D WebGL scenes.
              </p>
              <div style={{ margin: "0.4rem 0" }}>
                <strong>Key Focus Areas:</strong>
                <div>• Modern Web Standards: React 19, TypeScript, Vanilla CSS Tokens</div>
                <div>• 3D & Graphics: Three.js, Canvas 2D, GLSL Shaders, Physics Engines</div>
                <div>• Performance & Auditing: 100/100 Core Web Vitals, ARIA Keyboard Accessibility</div>
              </div>
              <div style={{ marginTop: "0.4rem" }}>
                Type <span style={{ color: "var(--t-prompt)" }}>contact</span> to discuss open opportunities or contract work.
              </div>
            </div>
          );
          break;
        }

        case "theme": {
          const newTheme = args[0]?.toLowerCase();
          if (!newTheme) {
            outputContent = (
              <div className="term-output-block">
                Current theme: <strong style={{ color: "var(--t-prompt)" }}>{theme}</strong>
                <br />
                Available themes: {THEMES.join(", ")}
                <br />
                Usage: <code>theme &lt;name&gt;</code> (e.g. <code>theme matrix</code>, <code>theme amber</code>)
              </div>
            );
          } else if (THEMES.includes(newTheme)) {
            setTheme(newTheme);
            outputContent = (
              <div style={{ color: "var(--t-success)" }}>
                Theme switched to '{newTheme}'.
              </div>
            );
          } else {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                Unknown theme '{newTheme}'. Choose from: {THEMES.join(", ")}
              </div>
            );
          }
          break;
        }

        case "crt": {
          const arg = args[0]?.toLowerCase();
          if (arg === "on") {
            setCrtEnabled(true);
            outputContent = <div style={{ color: "var(--t-success)" }}>CRT scanline overlay: ENABLED</div>;
          } else if (arg === "off") {
            setCrtEnabled(false);
            outputContent = <div style={{ color: "var(--t-muted)" }}>CRT scanline overlay: DISABLED</div>;
          } else {
            const next = !crtEnabled;
            setCrtEnabled(next);
            outputContent = (
              <div style={{ color: next ? "var(--t-success)" : "var(--t-muted)" }}>
                CRT scanline overlay: {next ? "ENABLED" : "DISABLED"}
              </div>
            );
          }
          break;
        }

        case "sound": {
          const arg = args[0]?.toLowerCase();
          if (arg === "on") {
            setSoundEnabled(true);
            playTerminalSound("enter", true);
            outputContent = <div style={{ color: "var(--t-success)" }}>Mechanical keyboard sound FX: ON</div>;
          } else if (arg === "off") {
            setSoundEnabled(false);
            outputContent = <div style={{ color: "var(--t-muted)" }}>Mechanical keyboard sound FX: OFF</div>;
          } else {
            const next = !soundEnabled;
            setSoundEnabled(next);
            if (next) playTerminalSound("enter", true);
            outputContent = (
              <div style={{ color: next ? "var(--t-success)" : "var(--t-muted)" }}>
                Mechanical keyboard sound FX: {next ? "ON" : "OFF"}
              </div>
            );
          }
          break;
        }

        case "matrix": {
          const next = !matrixRain;
          setMatrixRain(next);
          outputContent = (
            <div style={{ color: "var(--t-prompt)" }}>
              {next ? "Digital rain matrix sequence ACTIVATED." : "Matrix simulation TERMINATED."}
            </div>
          );
          break;
        }

        case "open":
        case "goto": {
          const target = args[0]?.toLowerCase();
          if (!target) {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                Usage: open &lt;app&gt; (tuner, palette, kinetic, orbit, gui, github)
              </div>
            );
            break;
          }
          if (target === "tuner" || target === "spring-tuner") {
            outputContent = <div>Opening Spring & Easing Tuner...</div>;
            if (onNavigateTo) onNavigateTo("/tools/spring-tuner");
            else window.location.href = "/tools/spring-tuner";
          } else if (target === "palette" || target === "palette-studio" || target === "oklch") {
            outputContent = <div>Opening Palette & Contrast Studio...</div>;
            if (onNavigateTo) onNavigateTo("/tools/palette-studio");
            else window.location.href = "/tools/palette-studio";
          } else if (target === "kinetic" || target === "kinetic-stack") {
            outputContent = <div>Launching Kinetic Stack...</div>;
            if (onNavigateTo) onNavigateTo("/games/kinetic-stack");
            else window.location.href = "/games/kinetic-stack";
          } else if (target === "orbit" || target === "orbit-dash") {
            outputContent = <div>Launching Orbit Dash...</div>;
            if (onNavigateTo) onNavigateTo("/games/orbit-dash");
            else window.location.href = "/games/orbit-dash";
          } else if (target === "gui" || target === "portfolio" || target === "home") {
            outputContent = <div>Returning to GUI portfolio...</div>;
            onNavigateHome?.();
          } else if (target === "github") {
            window.open("https://github.com/iliash-me", "_blank", "noopener,noreferrer");
            outputContent = <div>Opening GitHub in new window...</div>;
          } else {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                Cannot open '{target}'. Valid targets: tuner, palette, kinetic, orbit, gui, github
              </div>
            );
          }
          break;
        }

        case "gui":
        case "exit":
        case "quit": {
          outputContent = <div>Navigating to graphic portfolio...</div>;
          onNavigateHome?.();
          break;
        }

        case "ls":
        case "dir": {
          const targetDir = args[0] || cwd;
          let normalized = targetDir === "." ? cwd : targetDir;
          if (normalized === "projects") normalized = "~/projects";
          if (normalized === "tools") normalized = "~/tools";
          if (normalized === "games") normalized = "~/games";

          const dir = VIRTUAL_FS[normalized];
          if (!dir) {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                ls: cannot access '{targetDir}': No such file or directory
              </div>
            );
          } else {
            outputContent = (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", margin: "0.25rem 0" }}>
                {dir.children.map((item) => {
                  const isDir = !item.includes(".");
                  return (
                    <span
                      key={item}
                      style={{
                        color: isDir ? "var(--t-prompt)" : "var(--t-text)",
                        fontWeight: isDir ? 700 : 400
                      }}
                    >
                      {item}{isDir ? "/" : ""}
                    </span>
                  );
                })}
              </div>
            );
          }
          break;
        }

        case "cd": {
          const target = args[0] || "~";
          if (target === "~" || target === "") {
            setCwd("~");
            outputContent = null;
          } else if (target === "..") {
            setCwd("~");
            outputContent = null;
          } else if (target === "projects" || target === "~/projects") {
            setCwd("~/projects");
            outputContent = null;
          } else if (target === "tools" || target === "~/tools") {
            setCwd("~/tools");
            outputContent = null;
          } else if (target === "games" || target === "~/games") {
            setCwd("~/games");
            outputContent = null;
          } else {
            outputContent = (
              <div style={{ color: "var(--t-error)" }}>
                cd: no such file or directory: {target}
              </div>
            );
          }
          break;
        }

        case "pwd": {
          const fullPath = cwd === "~" ? "/home/guest" : `/home/guest/${cwd.replace("~/", "")}`;
          outputContent = <div>{fullPath}</div>;
          break;
        }

        case "cat": {
          const file = args[0];
          if (!file) {
            outputContent = <div style={{ color: "var(--t-error)" }}>Usage: cat &lt;filename&gt;</div>;
            break;
          }
          if (file === "about.txt") {
            executeCommandRef.current?.("about");
            return;
          }
          if (file === "skills.txt") {
            executeCommandRef.current?.("skills");
            return;
          }
          if (file === "contact.txt") {
            executeCommandRef.current?.("contact");
            return;
          }
          if (file === "resume.txt") {
            executeCommandRef.current?.("resume");
            return;
          }
          if (file === "socials.txt") {
            executeCommandRef.current?.("socials");
            return;
          }
          // Check if project markdown file
          const cleanId = file.replace(/\.md$/, "");
          const p = PROJECTS.find((proj) => proj.id === cleanId);
          if (p) {
            executeCommandRef.current?.(`project ${p.id}`);
            return;
          }
          outputContent = (
            <div style={{ color: "var(--t-error)" }}>
              cat: {file}: No such file or directory
            </div>
          );
          break;
        }

        case "time":
        case "date": {
          outputContent = (
            <div className="term-output-block">
              <div>Asia/Dhaka (GMT+6): <strong>{getDhakaTime()}</strong></div>
              <div style={{ color: "var(--t-muted)" }}>Session Uptime: {uptimeStr}</div>
            </div>
          );
          break;
        }

        case "weather": {
          outputContent = (
            <div className="term-output-block">
              <pre className="term-ascii" style={{ color: "var(--t-warning)" }}>
{`   \\  /       Dhaka, Bangladesh
 _ /""\\ _     Condition: Clear & Humid
   \\__/       Temperature: 28°C / 82°F
   /  \\       Wind: 6 km/h SSW · Humidity: 65%`}
              </pre>
            </div>
          );
          break;
        }

        case "quote":
        case "fortune": {
          const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
          outputContent = <div style={{ fontStyle: "italic", color: "var(--t-highlight)" }}>{q}</div>;
          break;
        }

        case "echo": {
          outputContent = <div>{args.join(" ")}</div>;
          break;
        }

        case "history": {
          outputContent = (
            <div className="term-output-block">
              {history.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: "1rem" }}>
                  <span style={{ color: "var(--t-muted)", width: "35px" }}>{i + 1}</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          );
          break;
        }

        case "sudo": {
          playTerminalSound("bell", soundEnabled);
          outputContent = (
            <div style={{ color: "var(--t-error)" }}>
              guest is not in the sudoers file. This incident will be reported to santa.
            </div>
          );
          break;
        }

        case "ping": {
          const host = args[0] || PROFILE.domain;
          outputContent = (
            <div className="term-output-block">
              <div>PING {host} (104.21.78.11): 56 data bytes</div>
              <div>64 bytes from 104.21.78.11: icmp_seq=0 ttl=58 time=14.2 ms</div>
              <div>64 bytes from 104.21.78.11: icmp_seq=1 ttl=58 time=12.8 ms</div>
              <div>64 bytes from 104.21.78.11: icmp_seq=2 ttl=58 time=13.1 ms</div>
              <div style={{ color: "var(--t-success)", marginTop: "0.2rem" }}>
                --- {host} ping statistics: 3 packets transmitted, 3 received, 0% packet loss ---
              </div>
            </div>
          );
          break;
        }

        case "curl": {
          const url = args[0] || `https://${PROFILE.domain}`;
          outputContent = (
            <div className="term-output-block">
              <div>HTTP/2 200 OK</div>
              <div>server: cloudflare</div>
              <div>content-type: text/html; charset=utf-8</div>
              <div>cache-control: public, max-age=3600</div>
              <div style={{ color: "var(--t-success)", marginTop: "0.2rem" }}>
                ✓ Connected to {url} (status: 200 OK, latency: 18ms)
              </div>
            </div>
          );
          break;
        }

        default: {
          playTerminalSound("bell", soundEnabled);
          outputContent = (
            <div style={{ color: "var(--t-error)" }}>
              command not found: {cmd}. Type <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>help</span> for available commands.
            </div>
          );
          break;
        }
      }

      setLogs((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}-${Math.random()}`,
          type: "command",
          cwd,
          command: trimmed,
          content: outputContent
        }
      ]);
    },
    [cwd, soundEnabled, history, theme, crtEnabled, matrixRain, onNavigateHome, onNavigateTo, startTime]
  );

  useEffect(() => {
    executeCommandRef.current = executeCommand;
  }, [executeCommand]);

  // Tab Autocomplete
  const handleTabCompletion = () => {
    const raw = inputVal.trimStart();
    const parts = raw.split(/\s+/);

    const ALL_COMMANDS = [
      "help",
      "about",
      "bio",
      "whoami",
      "projects",
      "project",
      "skills",
      "tech",
      "stack",
      "disciplines",
      "tools",
      "games",
      "contact",
      "email",
      "socials",
      "resume",
      "neofetch",
      "fetch",
      "theme",
      "crt",
      "sound",
      "matrix",
      "weather",
      "time",
      "date",
      "quote",
      "open",
      "goto",
      "gui",
      "exit",
      "ls",
      "cd",
      "cat",
      "pwd",
      "history",
      "clear",
      "echo",
      "sudo",
      "ping",
      "curl"
    ];

    if (parts.length === 1) {
      const matchPrefix = parts[0].toLowerCase();
      const matches = ALL_COMMANDS.filter((c) => c.startsWith(matchPrefix));

      if (matches.length === 1) {
        setInputVal(matches[0] + " ");
      } else if (matches.length > 1) {
        setLogs((prev) => [
          ...prev,
          {
            id: `tab-${Date.now()}`,
            type: "tab-match",
            content: (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "var(--t-muted)" }}>
                {matches.map((m) => (
                  <span key={m} style={{ color: "var(--t-prompt)" }}>
                    {m}
                  </span>
                ))}
              </div>
            )
          }
        ]);
      }
    } else if (parts.length === 2) {
      const sub = parts[0].toLowerCase();
      const arg = parts[1].toLowerCase();

      let candidateList = [];
      if (sub === "project") {
        candidateList = PROJECTS.map((p) => p.id);
      } else if (sub === "theme") {
        candidateList = THEMES;
      } else if (sub === "open") {
        candidateList = ["tuner", "palette", "kinetic", "orbit", "gui", "github"];
      } else if (sub === "cat" || sub === "cd" || sub === "ls") {
        const dir = VIRTUAL_FS[cwd];
        if (dir) candidateList = dir.children;
      }

      const matches = candidateList.filter((c) => c.toLowerCase().startsWith(arg));
      if (matches.length === 1) {
        setInputVal(`${parts[0]} ${matches[0]}`);
      }
    }
  };

  // Keyboard Handlers
  const handleKeyDown = (e) => {
    playTerminalSound("key", soundEnabled);

    if (e.key === "Enter") {
      e.preventDefault();
      const cmdToRun = inputVal;
      setInputVal("");
      executeCommand(cmdToRun);
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleTabCompletion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal("");
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLogs([]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setLogs((prev) => [
        ...prev,
        {
          id: `int-${Date.now()}`,
          type: "command",
          cwd,
          command: inputVal + "^C",
          content: null
        }
      ]);
      setInputVal("");
    }
  };

  const handleCycleTheme = () => {
    const nextIdx = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIdx]);
  };

  const handleTrafficLightClose = () => {
    onNavigateHome?.();
  };

  const handleTrafficLightMinimize = () => {
    executeCommand("clear");
  };

  const handleTrafficLightExpand = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      className="term-viewport"
      data-term-theme={theme}
      onClick={() => inputRef.current?.focus()}
    >
      {/* CRT Scanline & Vignette Effect Overlays */}
      {crtEnabled && <div className="term-crt-overlay" aria-hidden="true" />}
      {crtEnabled && <div className="term-crt-vignette" aria-hidden="true" />}

      {/* Falling Matrix Rain Canvas */}
      {matrixRain && <canvas ref={canvasRef} className="term-matrix-canvas" />}

      {/* Top Header Bar */}
      <header className="term-header">
        <div className="term-header-left">
          <div className="term-traffic-lights">
            <button
              type="button"
              className="term-traffic-light is-red"
              onClick={handleTrafficLightClose}
              title="Close terminal and return to GUI"
              aria-label="Exit to GUI"
            />
            <button
              type="button"
              className="term-traffic-light is-yellow"
              onClick={handleTrafficLightMinimize}
              title="Clear terminal screen"
              aria-label="Clear screen"
            />
            <button
              type="button"
              className="term-traffic-light is-green"
              onClick={handleTrafficLightExpand}
              title="Toggle Fullscreen"
              aria-label="Toggle Fullscreen"
            />
          </div>

          <div className="term-title-wrapper">
            <span className="term-session-badge">guest@{PROFILE.domain}</span>
            <span>:</span>
            <span>{cwd} (bash)</span>
            <span className="term-live-indicator">
              <span className="term-live-dot" />
              <span>LIVE</span>
            </span>
          </div>
        </div>

        <div className="term-header-right">
          <button
            type="button"
            className="term-btn-pill"
            onClick={handleCycleTheme}
            title="Cycle terminal theme"
          >
            🎨 {theme.toUpperCase()}
          </button>

          <button
            type="button"
            className={`term-btn-pill ${crtEnabled ? "is-active" : ""}`}
            onClick={() => setCrtEnabled((v) => !v)}
            title="Toggle CRT Scanline Overlay"
          >
            CRT: {crtEnabled ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            className={`term-btn-pill ${soundEnabled ? "is-active" : ""}`}
            onClick={() => setSoundEnabled((v) => !v)}
            title="Toggle Mechanical Key Sound FX"
          >
            SFX: {soundEnabled ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            className="term-btn-pill term-btn-exit"
            onClick={onNavigateHome}
            title="Exit terminal mode and return to GUI"
          >
            ← GUI Portfolio
          </button>
        </div>
      </header>

      {/* Main Terminal Output Body */}
      <main className="term-body" ref={bodyRef}>
        {logs.map((log) => {
          if (log.type === "system" || log.type === "tab-match") {
            return <div key={log.id}>{log.content}</div>;
          }
          return (
            <div key={log.id} className="term-entry">
              <div className="term-cmd-row">
                <span className="term-prompt-tag">
                  guest@{PROFILE.domain}:{log.cwd}$
                </span>
                <span className="term-cmd-text">{log.command}</span>
              </div>
              {log.content && <div className="term-output-block">{log.content}</div>}
            </div>
          );
        })}

        {/* Active Typing Input Line */}
        <div className="term-active-line">
          <span className="term-prompt-tag">
            guest@{PROFILE.domain}:{cwd}$
          </span>
          <div className="term-input-display">
            <span>{inputVal}</span>
            <span className="term-cursor" aria-hidden="true" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="term-input-hidden"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Terminal command input"
          />
        </div>
      </main>

      {/* Bottom Quick Command Dock */}
      <footer className="term-footer">
        <div className="term-dock-label">QUICK CMDS:</div>
        <div className="term-dock-chips">
          <button
            type="button"
            className="term-dock-chip chip-highlight"
            onClick={() => executeCommand("help")}
          >
            help
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("neofetch")}
          >
            neofetch
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("about")}
          >
            about
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("projects")}
          >
            projects
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("skills")}
          >
            skills
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("tools")}
          >
            tools
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("games")}
          >
            games
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("contact")}
          >
            contact
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("matrix")}
          >
            matrix
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("clear")}
          >
            clear
          </button>
          <button
            type="button"
            className="term-dock-chip"
            onClick={() => executeCommand("gui")}
          >
            exit
          </button>
        </div>

        <div className="term-mobile-keys">
          <button
            type="button"
            className="term-key-btn"
            onClick={handleTabCompletion}
            title="Tab completion"
          >
            TAB ⇥
          </button>
          <button
            type="button"
            className="term-key-btn"
            onClick={() => {
              if (history.length === 0) return;
              const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
              setHistoryIdx(nextIdx);
              setInputVal(history[nextIdx]);
            }}
            title="Previous command"
          >
            ↑
          </button>
          <button
            type="button"
            className="term-key-btn"
            onClick={() => {
              if (historyIdx === -1) return;
              const nextIdx = historyIdx + 1;
              if (nextIdx >= history.length) {
                setHistoryIdx(-1);
                setInputVal("");
              } else {
                setHistoryIdx(nextIdx);
                setInputVal(history[nextIdx]);
              }
            }}
            title="Next command"
          >
            ↓
          </button>
          <button
            type="button"
            className="term-key-btn"
            onClick={() => setInputVal("")}
            title="Clear line"
          >
            ⌫
          </button>
        </div>
      </footer>
    </div>
  );
}

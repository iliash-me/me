import { useCallback, useEffect, useRef, useState } from "react";
import "./TerminalApp.css";
import { PROFILE } from "../data/portfolioData";

const THEMES = ["dark", "matrix", "amber", "cyberpunk", "nord", "paper"];

const VIRTUAL_FS = {
  "~": {
    type: "dir",
    children: ["about.txt", "contact.txt", "socials.txt", "tools", "games"]
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

  const [cwd, setCwd] = useState("~");
  const [inputVal, setInputVal] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [startTime] = useState(() => Date.now());

  const inputRef = useRef(null);
  const bodyRef = useRef(null);
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
            Welcome to the interactive terminal of{" "}
            <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>{PROFILE.name}</span> ({PROFILE.role}).
            <br />
            Type <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>help</span> to view available commands, or{" "}
            <span style={{ color: "var(--t-prompt)", fontWeight: 600 }}>neofetch</span> for profile overview.
            <br />
            Explore: <span style={{ color: "var(--t-prompt)" }}>about</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>tools</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>games</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>contact</span> ·{" "}
            <span style={{ color: "var(--t-prompt)" }}>socials</span>
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
              <div className="term-category-kicker">// SITE SECTIONS & APPS</div>
              <table className="term-table">
                <tbody>
                  <tr>
                    <td className="term-cmd-col">about / whoami</td>
                    <td className="term-desc-col">Profile overview, role, and core metrics</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">tools</td>
                    <td className="term-desc-col">Interactive web tools (Spring Tuner, Palette Studio)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">games</td>
                    <td className="term-desc-col">Playable arcade games (Kinetic Stack, Orbit Dash)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">contact</td>
                    <td className="term-desc-col">Direct email address & copy email command</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">socials</td>
                    <td className="term-desc-col">GitHub, Facebook, and Email links</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">copy</td>
                    <td className="term-desc-col">Copy {PROFILE.email} to clipboard</td>
                  </tr>
                </tbody>
              </table>

              <div className="term-category-kicker">// NAVIGATION & SYSTEM</div>
              <table className="term-table">
                <tbody>
                  <tr>
                    <td className="term-cmd-col">gui / exit</td>
                    <td className="term-desc-col">Return to the standard graphic site at /</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">open &lt;app&gt;</td>
                    <td className="term-desc-col">Launch tool/game (tuner, palette, kinetic, orbit, github)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">neofetch</td>
                    <td className="term-desc-col">Profile dossier card with ASCII monogram</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">ls [dir]</td>
                    <td className="term-desc-col">List directory contents</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">cd &lt;dir&gt;</td>
                    <td className="term-desc-col">Change directory (tools, games, ..)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">cat &lt;file&gt;</td>
                    <td className="term-desc-col">Read file contents (about.txt, contact.txt, socials.txt)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">pwd</td>
                    <td className="term-desc-col">Print working directory</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">time / date</td>
                    <td className="term-desc-col">Local time in {PROFILE.timezone} (GMT+6)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">theme [name]</td>
                    <td className="term-desc-col">Switch color theme (dark, matrix, amber, cyberpunk, nord, paper)</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">crt [on|off]</td>
                    <td className="term-desc-col">Toggle CRT scanline overlay</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">sound [on|off]</td>
                    <td className="term-desc-col">Toggle mechanical keyboard sound effects</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">history</td>
                    <td className="term-desc-col">Display command history</td>
                  </tr>
                  <tr>
                    <td className="term-cmd-col">clear</td>
                    <td className="term-desc-col">Clear terminal screen (or Ctrl+L)</td>
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
                  {PROFILE.name} (@{PROFILE.handle})
                </div>
                <div className="term-neofetch-divider">
                  ---------------------------------
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Domain</span>
                  <span className="term-neofetch-val">{PROFILE.domain}</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Role</span>
                  <span className="term-neofetch-val">{PROFILE.role}</span>
                </div>
                {PROFILE.metrics.map((m) => (
                  <div key={m.label} className="term-neofetch-row">
                    <span className="term-neofetch-label">{m.label}</span>
                    <span className="term-neofetch-val">{m.value}</span>
                  </div>
                ))}
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Timezone</span>
                  <span className="term-neofetch-val">{PROFILE.timezone} ({PROFILE.timezoneLabel})</span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Status</span>
                  <span className="term-neofetch-val" style={{ color: "var(--t-success)" }}>
                    AVAILABLE FOR PROJECTS
                  </span>
                </div>
                <div className="term-neofetch-row">
                  <span className="term-neofetch-label">Uptime</span>
                  <span className="term-neofetch-val">{uptimeStr}</span>
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
                Hi, I’m Iliash. {PROFILE.tagline}
              </div>
              <div style={{ color: "var(--t-muted)", margin: "0.2rem 0" }}>
                // {PROFILE.role.toUpperCase()} · @{PROFILE.handle}
              </div>
              <p style={{ margin: "0.45rem 0" }}>{PROFILE.summary}</p>
              <div style={{ marginTop: "0.6rem" }}>
                {PROFILE.metrics.map((m) => (
                  <div key={m.label} style={{ display: "flex", gap: "0.5rem", fontSize: "0.84rem" }}>
                    <span style={{ color: "var(--t-muted)", minWidth: "165px" }}>• {m.label}:</span>
                    <span>{m.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "0.6rem", color: "var(--t-success)" }}>
                ● AVAILABLE FOR PROJECTS
              </div>
            </div>
          );
          break;
        }

        case "tools": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                DEVELOPER TOOLS
              </div>
              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Spring & Easing Tuner</strong>
                  <span className="term-card-badge">/tools/spring-tuner</span>
                </div>
                <div className="term-card-desc">
                  Interactive curve & UI motion studio
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
                    [Launch Spring & Easing Tuner ↗]
                  </button>
                </div>
              </div>

              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Palette & Contrast Studio</strong>
                  <span className="term-card-badge">/tools/palette-studio</span>
                </div>
                <div className="term-card-desc">
                  Color scale generator & WCAG/APCA contrast lab
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
                    [Launch Palette & Contrast Studio ↗]
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
                GAMES
              </div>
              <div className="term-card">
                <div className="term-card-header">
                  <strong className="term-card-title">Kinetic Stack</strong>
                  <span className="term-card-badge">/games/kinetic-stack</span>
                </div>
                <div className="term-card-desc">
                  3D isometric slice & chord progression tower
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
                  <strong className="term-card-title">Orbit Dash (Arcade Game)</strong>
                  <span className="term-card-badge">/games/orbit-dash</span>
                </div>
                <div className="term-card-desc">
                  One-button rhythm & dual-ring orbit dodge
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
                <span style={{ color: "var(--t-prompt)", fontWeight: 700 }}>// DIRECT MESSAGE</span>
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
                  href={`mailto:${PROFILE.email}`}
                  className="term-interactive-link"
                >
                  [Open in Email App ↗]
                </a>
                <button
                  type="button"
                  className="term-interactive-link"
                  onClick={() => {
                    navigator.clipboard?.writeText(PROFILE.email);
                    executeCommandRef.current?.("copy");
                  }}
                >
                  [Copy Email]
                </button>
              </div>
            </div>
          );
          break;
        }

        case "copy": {
          navigator.clipboard?.writeText(PROFILE.email);
          outputContent = (
            <div style={{ color: "var(--t-success)" }}>
              ✓ Copied {PROFILE.email} to clipboard.
            </div>
          );
          break;
        }

        case "socials":
        case "links": {
          outputContent = (
            <div className="term-output-block">
              <div style={{ color: "var(--t-prompt)", fontWeight: 700, marginBottom: "0.4rem" }}>
                SOCIAL LINKS
              </div>
              {PROFILE.socials.map((s) => (
                <div key={s.id} style={{ margin: "0.25rem 0" }}>
                  <span style={{ color: "var(--t-muted)", minWidth: "100px", display: "inline-block" }}>
                    • {s.label}:
                  </span>
                  <a
                    href={s.url}
                    target={s.url.startsWith("http") ? "_blank" : undefined}
                    rel={s.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="term-interactive-link"
                  >
                    {s.handle} ↗
                  </a>
                </div>
              ))}
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
          if (target === "tuner" || target === "spring-tuner" || target === "spring-tuner.sh") {
            outputContent = <div>Opening Spring & Easing Tuner...</div>;
            if (onNavigateTo) onNavigateTo("/tools/spring-tuner");
            else window.location.href = "/tools/spring-tuner";
          } else if (target === "palette" || target === "palette-studio" || target === "palette-studio.sh") {
            outputContent = <div>Opening Palette & Contrast Studio...</div>;
            if (onNavigateTo) onNavigateTo("/tools/palette-studio");
            else window.location.href = "/tools/palette-studio";
          } else if (target === "kinetic" || target === "kinetic-stack" || target === "kinetic-stack.exe") {
            outputContent = <div>Launching Kinetic Stack...</div>;
            if (onNavigateTo) onNavigateTo("/games/kinetic-stack");
            else window.location.href = "/games/kinetic-stack";
          } else if (target === "orbit" || target === "orbit-dash" || target === "orbit-dash.exe") {
            outputContent = <div>Launching Orbit Dash...</div>;
            if (onNavigateTo) onNavigateTo("/games/orbit-dash");
            else window.location.href = "/games/orbit-dash";
          } else if (target === "gui" || target === "home") {
            outputContent = <div>Returning to GUI site...</div>;
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
          outputContent = <div>Navigating to main site...</div>;
          onNavigateHome?.();
          break;
        }

        case "ls":
        case "dir": {
          const targetDir = args[0] || cwd;
          let normalized = targetDir === "." ? cwd : targetDir;
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
          if (target === "~" || target === "" || target === "..") {
            setCwd("~");
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
          if (file === "contact.txt") {
            executeCommandRef.current?.("contact");
            return;
          }
          if (file === "socials.txt") {
            executeCommandRef.current?.("socials");
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
    [cwd, soundEnabled, history, theme, crtEnabled, onNavigateHome, onNavigateTo, startTime]
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
      "tools",
      "games",
      "contact",
      "email",
      "copy",
      "socials",
      "links",
      "neofetch",
      "fetch",
      "theme",
      "crt",
      "sound",
      "time",
      "date",
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
      "echo"
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
      if (sub === "theme") {
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
            ← GUI Site
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
            onClick={() => executeCommand("socials")}
          >
            socials
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

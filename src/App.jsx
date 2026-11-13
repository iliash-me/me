import { useEffect, useRef, useState } from "react";
import "./App.css";
import { PROFILE } from "./data/portfolioData";
import CommandPalette from "./components/CommandPalette";
import SpringTunerApp from "./tools/SpringTunerApp";
import OklchLabApp from "./tools/OklchLabApp";
import OrbitDashApp from "./games/OrbitDashApp";
import KineticStackApp from "./games/KineticStackApp";
import TerminalApp from "./terminal/TerminalApp";

const INQUIRY_TOPICS = ["Web App / UI", "Design System", "3D / Creative", "General Inquiry"];

function getNormalizedRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (
    path === "/t" ||
    path === "/terminal" ||
    window.location.hash === "#/t" ||
    window.location.hash === "#t" ||
    window.location.hash === "#/terminal"
  ) {
    return "/t";
  }
  if (path === "/tools/spring-tuner" || window.location.hash === "#/tools/spring-tuner") {
    return "/tools/spring-tuner";
  }
  if (
    path === "/tools/palette-studio" ||
    path === "/tools/oklch-lab" ||
    window.location.hash === "#/tools/palette-studio" ||
    window.location.hash === "#/tools/oklch-lab"
  ) {
    return "/tools/palette-studio";
  }
  if (path === "/games/orbit-dash" || window.location.hash === "#/games/orbit-dash") {
    return "/games/orbit-dash";
  }
  if (path === "/games/kinetic-stack" || window.location.hash === "#/games/kinetic-stack") {
    return "/games/kinetic-stack";
  }
  return "/";
}

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  const [route, setRoute] = useState(getNormalizedRoute);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("iliash-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const toolsDropdownRef = useRef(null);
  const [gamesMenuOpen, setGamesMenuOpen] = useState(false);
  const gamesDropdownRef = useRef(null);
  const [localTime, setLocalTime] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(INQUIRY_TOPICS[0]);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const navigateTo = (targetPath) => {
    window.history.pushState({}, "", targetPath);
    setRoute(targetPath);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getNormalizedRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("iliash-theme", theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      if (route === "/t") {
        metaTheme.setAttribute("content", "#0b0d13");
      } else if (
        route === "/tools/spring-tuner" ||
        route === "/games/orbit-dash" ||
        route === "/games/kinetic-stack"
      ) {
        metaTheme.setAttribute("content", "#f5f5f3");
      } else if (route === "/tools/palette-studio") {
        metaTheme.setAttribute("content", "#f6f6f4");
      } else {
        metaTheme.setAttribute("content", theme === "dark" ? "#0B0D11" : "#F6F4EF");
      }
    }
  }, [theme, route]);

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: PROFILE.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        setLocalTime(formatter.format(new Date()));
      } catch {
        setLocalTime("UTC+6");
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (contactOpen) setContactOpen(false);
        if (toolsMenuOpen) setToolsMenuOpen(false);
        if (gamesMenuOpen) setGamesMenuOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target)) {
        setToolsMenuOpen(false);
      }
      if (gamesDropdownRef.current && !gamesDropdownRef.current.contains(e.target)) {
        setGamesMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contactOpen, toolsMenuOpen, gamesMenuOpen]);

  // Render standalone tools and games with their own dedicated vibes
  if (route === "/tools/spring-tuner") {
    return <SpringTunerApp onNavigateHome={() => navigateTo("/")} />;
  }
  if (route === "/tools/palette-studio") {
    return <OklchLabApp onNavigateHome={() => navigateTo("/")} />;
  }
  if (route === "/games/orbit-dash") {
    return <OrbitDashApp onNavigateHome={() => navigateTo("/")} />;
  }
  if (route === "/games/kinetic-stack") {
    return <KineticStackApp onNavigateHome={() => navigateTo("/")} />;
  }

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(PROFILE.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const openTerminalRoute = () => {
    setToolsMenuOpen(false);
    setGamesMenuOpen(false);
    setContactOpen(false);
    navigateTo("/t");
  };

  const openTunerRoute = () => {
    setToolsMenuOpen(false);
    setGamesMenuOpen(false);
    setContactOpen(false);
    navigateTo("/tools/spring-tuner");
  };

  const openOklchRoute = () => {
    setToolsMenuOpen(false);
    setGamesMenuOpen(false);
    setContactOpen(false);
    navigateTo("/tools/palette-studio");
  };

  const openOrbitDashRoute = () => {
    setToolsMenuOpen(false);
    setGamesMenuOpen(false);
    setContactOpen(false);
    navigateTo("/games/orbit-dash");
  };

  const openKineticStackRoute = () => {
    setToolsMenuOpen(false);
    setGamesMenuOpen(false);
    setContactOpen(false);
    navigateTo("/games/kinetic-stack");
  };

  const openContact = () => {
    setToolsMenuOpen(false);
    setGamesMenuOpen(false);
    setContactOpen(true);
  };

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwHilL8l8-NXCRjPD27DuPmsjNmEyvIrNXxxGKqtIxqJZ1NaTFMm7NLItJF5JiUKWxF/exec";

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!senderEmail.trim() || !customNote.trim()) {
      setSubmitStatus("error");
      setStatusMessage("Please enter your email address and a message.");
      return;
    }

    setSubmitStatus("sending");
    setStatusMessage("");

    const payload = JSON.stringify({
      name: senderName.trim() || "Website Visitor",
      email: senderEmail.trim(),
      topic: selectedTopic,
      message: customNote.trim()
    });

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: payload
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok || data.success) {
        setSubmitStatus("success");
        setStatusMessage("Message sent directly to iliashhosain@gmail.com.");
        setSenderName("");
        setSenderEmail("");
        setCustomNote("");
      } else {
        setSubmitStatus("error");
        setStatusMessage(
          "Could not send automatically right now. Please click 'Open in Email App' below."
        );
      }
    } catch {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: payload
        });
        setSubmitStatus("success");
        setStatusMessage("Message sent directly to iliashhosain@gmail.com.");
        setSenderName("");
        setSenderEmail("");
        setCustomNote("");
      } catch {
        setSubmitStatus("error");
        setStatusMessage(
          "Network error while sending. Please use 'Open in Email App' or copy my email above."
        );
      }
    }
  };

  const mailtoHref = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
    `${selectedTopic}${senderName ? ` — from ${senderName}` : ""}`
  )}&body=${encodeURIComponent(
    `${customNote ? `${customNote}\n\n` : `Hi Iliash,\n\nI'd love to connect regarding ${selectedTopic}.\n\n`}${
      senderName || senderEmail ? `— ${senderName} ${senderEmail ? `<${senderEmail}>` : ""}` : ""
    }`
  )}`;

  return (
    <div className="site-wrapper minimal-shell">
      {/* Minimal Top Bar */}
      <header className="topbar" role="banner">
        <div className="page-shell topbar-inner">
          <a href="#top" id="brand-home-link" className="brand-identity">
            <span className="brand-monogram">IH</span>
            <div className="brand-text">
              <span className="brand-domain">{PROFILE.domain}</span>
              <span className="brand-clock" aria-label="Local time">
                {localTime ? `${localTime} · GMT+6` : "GMT+6"}
              </span>
            </div>
          </a>

          <div className="topbar-actions">
            {/* Tools Dropdown */}
            <div className="tools-dropdown-wrap" ref={toolsDropdownRef}>
              <button
                type="button"
                id="nav-tools-dropdown-btn"
                className={`action-chip tools-dropdown-trigger ${toolsMenuOpen ? "is-open" : ""}`}
                aria-expanded={toolsMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setToolsMenuOpen((prev) => !prev);
                  setGamesMenuOpen(false);
                }}
              >
                <span>Tools</span>
                <span className="tools-caret" aria-hidden="true">▾</span>
              </button>

              {toolsMenuOpen && (
                <div className="tools-dropdown-menu" role="menu" aria-label="Developer tools">
                  <a
                    href="/tools/spring-tuner"
                    id="dropdown-spring-tuner-link"
                    role="menuitem"
                    className="tools-dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      openTunerRoute();
                    }}
                  >
                    <div className="tools-dropdown-item-text">
                      <span className="tools-dropdown-item-title">Spring & Easing Tuner</span>
                      <span className="tools-dropdown-item-sub">Interactive curve & UI motion studio</span>
                    </div>
                    <span className="tools-dropdown-item-arrow" aria-hidden="true">↗</span>
                  </a>

                  <a
                    href="/tools/palette-studio"
                    id="dropdown-palette-studio-link"
                    role="menuitem"
                    className="tools-dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      openOklchRoute();
                    }}
                  >
                    <div className="tools-dropdown-item-text">
                      <span className="tools-dropdown-item-title">Palette & Contrast Studio</span>
                      <span className="tools-dropdown-item-sub">Color scale generator & WCAG/APCA contrast lab</span>
                    </div>
                    <span className="tools-dropdown-item-arrow" aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>

            {/* Games Dropdown */}
            <div className="tools-dropdown-wrap" ref={gamesDropdownRef}>
              <button
                type="button"
                id="nav-games-dropdown-btn"
                className={`action-chip tools-dropdown-trigger ${gamesMenuOpen ? "is-open" : ""}`}
                aria-expanded={gamesMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setGamesMenuOpen((prev) => !prev);
                  setToolsMenuOpen(false);
                }}
              >
                <span>Games</span>
                <span className="tools-caret" aria-hidden="true">▾</span>
              </button>

              {gamesMenuOpen && (
                <div className="tools-dropdown-menu" role="menu" aria-label="Games">
                  <a
                    href="/games/kinetic-stack"
                    id="dropdown-kinetic-stack-link"
                    role="menuitem"
                    className="tools-dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      openKineticStackRoute();
                    }}
                  >
                    <div className="tools-dropdown-item-text">
                      <span className="tools-dropdown-item-title">Kinetic Stack</span>
                      <span className="tools-dropdown-item-sub">3D isometric slice & chord progression tower</span>
                    </div>
                    <span className="tools-dropdown-item-arrow" aria-hidden="true">↗</span>
                  </a>

                  <a
                    href="/games/orbit-dash"
                    id="dropdown-orbit-dash-link"
                    role="menuitem"
                    className="tools-dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      openOrbitDashRoute();
                    }}
                  >
                    <div className="tools-dropdown-item-text">
                      <span className="tools-dropdown-item-title">Orbit Dash (Arcade Game)</span>
                      <span className="tools-dropdown-item-sub">One-button rhythm & dual-ring orbit dodge</span>
                    </div>
                    <span className="tools-dropdown-item-arrow" aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>

            <a
              href={route === "/t" ? "/" : "/t"}
              id="nav-terminal-btn"
              className={`action-chip ${route === "/t" ? "tools-dropdown-trigger is-open" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                if (route === "/t") {
                  navigateTo("/");
                } else {
                  openTerminalRoute();
                }
              }}
              title="Toggle Draggable Terminal Window (/t)"
            >
              <span>&gt;_ /t</span>
            </a>

            <button
              type="button"
              id="nav-open-contact-btn"
              className="action-chip"
              onClick={openContact}
            >
              <span>Contact</span>
            </button>

            <button
              type="button"
              id="open-command-palette-btn"
              className="action-chip"
              onClick={() => setCmdOpen(true)}
              title="Command Palette (⌘K)"
            >
              <kbd>⌘K</kbd>
            </button>

            <button
              type="button"
              id="theme-toggle-btn"
              className="action-chip theme-icon-btn"
              onClick={handleToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <svg
                  className="theme-svg-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg
                  className="theme-svg-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Minimal Centered Main Stage */}
      <main id="top" className="page-shell minimal-main">
        <section className="hero-section minimal-hero" aria-labelledby="hero-headline">
          <div className="hero-grid">
            <div className="hero-main-col">
              <div className="section-index hero-index">
                <span className="index-num">//</span>
                <span>FRONT-END DEVELOPER & UI ENGINEER</span>
              </div>

              <h1 id="hero-headline" className="hero-title">
                Hi, I’m Iliash. I build fast, <span className="serif-italic">tactile</span> web interfaces.
              </h1>

              <p className="hero-lead">{PROFILE.summary}</p>

              <div className="hero-cta-row">
                <button
                  type="button"
                  id="hero-open-contact-sheet-btn"
                  className="btn-primary"
                  onClick={openContact}
                >
                  <span>Get in Touch</span>
                  <span aria-hidden="true">→</span>
                </button>

                <button
                  type="button"
                  id="hero-copy-email-btn"
                  className="btn-secondary"
                  onClick={handleCopyEmail}
                >
                  <span>{copiedEmail ? "Copied Email ✓" : "Copy Email"}</span>
                </button>

                <a
                  href="https://github.com/iliash-me"
                  id="hero-github-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  <span>GitHub</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {/* Minimal Profile Card */}
            <aside className="hero-dossier-col" aria-label="Profile overview">
              <div className="dossier-card">
                <div className="dossier-profile-body">
                  <div className="dossier-identity-row">
                    <img
                      src={PROFILE.avatar}
                      alt="Iliash Hosain"
                      className="dossier-avatar"
                      width="64"
                      height="64"
                    />
                    <div>
                      <div className="dossier-name">{PROFILE.name}</div>
                      <div className="dossier-role">{PROFILE.role}</div>
                      <a
                        href={`https://github.com/${PROFILE.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dossier-handle"
                      >
                        @{PROFILE.handle} ↗
                      </a>
                    </div>
                  </div>

                  <dl className="dossier-metrics-list">
                    {PROFILE.metrics.map((m) => (
                      <div key={m.label} className="dossier-metric-item">
                        <dt>{m.label}</dt>
                        <dd>{m.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="dossier-card-footer">
                  <span>AVAILABLE FOR PROJECTS</span>
                  <button
                    type="button"
                    id="dossier-open-sheet-btn"
                    className="dossier-footer-link"
                    onClick={openContact}
                  >
                    Message →
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="site-footer" role="contentinfo">
        <div className="page-shell footer-inner">
          <div className="footer-left">
            <span>© {CURRENT_YEAR} {PROFILE.name}</span>
          </div>
          <div className="footer-right">
            {PROFILE.socials.map((soc) => (
              <a
                key={soc.id}
                id={`footer-${soc.id}`}
                href={soc.url}
                target={soc.url.startsWith("http") ? "_blank" : undefined}
                rel={soc.url.startsWith("http") ? "noopener noreferrer" : undefined}
                className="footer-social-link"
              >
                {soc.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Bottom Slide-Up Contact Sheet */}
      <div
        className={`sheet-backdrop ${contactOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal={contactOpen}
        aria-hidden={!contactOpen}
        aria-labelledby="contact-sheet-title"
        onClick={() => setContactOpen(false)}
      >
        <aside
          className={`contact-sheet ${contactOpen ? "is-open" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sheet-grab-bar" onClick={() => setContactOpen(false)} aria-hidden="true">
            <span className="sheet-grab-pill" />
          </div>

          <div className="sheet-header">
            <div>
              <span className="sheet-kicker">// DIRECT MESSAGE</span>
              <h2 id="contact-sheet-title" className="sheet-title">
                Get in touch
              </h2>
            </div>
            <div className="sheet-header-right">
              <div className="sheet-email-bar">
                <a href={`mailto:${PROFILE.email}`} className="sheet-email-link">
                  {PROFILE.email}
                </a>
                <button
                  type="button"
                  id="sheet-copy-email-btn"
                  className="btn-secondary btn-compact"
                  onClick={handleCopyEmail}
                >
                  {copiedEmail ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                id="close-contact-sheet-btn"
                className="sheet-close-btn"
                onClick={() => setContactOpen(false)}
                aria-label="Close contact sheet"
              >
                ✕
              </button>
            </div>
          </div>

          <form className="sheet-form" onSubmit={handleSubmitForm}>
            <div className="sheet-body">
              <div className="sheet-grid">
                <div className="sheet-col-left">
                  <div className="composer-field">
                    <span className="composer-label">Topic</span>
                    <div className="composer-topic-list">
                      {INQUIRY_TOPICS.map((topic, idx) => (
                        <button
                          key={topic}
                          type="button"
                          id={`sheet-topic-btn-${idx}`}
                          className={`composer-topic-btn ${selectedTopic === topic ? "is-selected" : ""}`}
                          onClick={() => setSelectedTopic(topic)}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sheet-input-row">
                    <div className="composer-field">
                      <label htmlFor="sheet-sender-name" className="composer-label">
                        Your Name
                      </label>
                      <input
                        id="sheet-sender-name"
                        name="name"
                        type="text"
                        className="composer-input"
                        placeholder="Jane Doe"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                      />
                    </div>

                    <div className="composer-field">
                      <label htmlFor="sheet-sender-email" className="composer-label">
                        Your Email *
                      </label>
                      <input
                        id="sheet-sender-email"
                        name="email"
                        type="email"
                        required
                        className="composer-input"
                        placeholder="jane@example.com"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="sheet-col-right">
                  <div className="composer-field sheet-message-field">
                    <label htmlFor="sheet-custom-note" className="composer-label">
                      Message *
                    </label>
                    <textarea
                      id="sheet-custom-note"
                      name="message"
                      rows="4"
                      required
                      className="composer-textarea"
                      placeholder="Tell me briefly about what you're building..."
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {statusMessage && (
                <div
                  className={`sheet-status-banner ${
                    submitStatus === "success" ? "is-success" : "is-error"
                  }`}
                  role="status"
                >
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>

            <div className="sheet-footer">
              <a href={mailtoHref} id="sheet-mailto-fallback-btn" className="btn-ghost">
                <span>Open in Email App ↗</span>
              </a>
              <button
                type="submit"
                id="sheet-submit-btn"
                className="btn-primary sheet-primary-btn"
                disabled={submitStatus === "sending"}
              >
                <span>
                  {submitStatus === "sending"
                    ? "Sending..."
                    : submitStatus === "success"
                    ? "Sent ✓"
                    : "Send Message"}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </aside>
      </div>

      {/* Draggable Floating Terminal Window (/t) */}
      {route === "/t" && (
        <TerminalApp
          onNavigateHome={() => navigateTo("/")}
          onNavigateTo={navigateTo}
        />
      )}

      {/* Keyboard-Accessible Command Palette Modal */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={(arg) => setCmdOpen(arg === "open")}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onCopyEmail={handleCopyEmail}
        onOpenContactSheet={openContact}
        onOpenTunerSheet={openTunerRoute}
        onOpenOklchLab={openOklchRoute}
        onOpenOrbitDash={openOrbitDashRoute}
        onOpenKineticStack={openKineticStackRoute}
        onOpenTerminal={openTerminalRoute}
      />
    </div>
  );
}

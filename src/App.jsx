import { useEffect, useState } from "react";
import "./App.css";
import { PROFILE } from "./data/portfolioData";
import CommandPalette from "./components/CommandPalette";
import SpringTunerApp from "./tools/SpringTunerApp";

const INQUIRY_TOPICS = ["Web App / UI", "Design System", "3D / Creative", "General Inquiry"];

function getNormalizedRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/tools/spring-tuner" || window.location.hash === "#/tools/spring-tuner") {
    return "/tools/spring-tuner";
  }
  return "/";
}

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
      if (route === "/tools/spring-tuner") {
        metaTheme.setAttribute("content", "#15171b");
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
      if (e.key === "Escape" && contactOpen) {
        setContactOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [contactOpen]);

  // If on /tools/spring-tuner route, render standalone tool with its own Hardware Synth vibe
  if (route === "/tools/spring-tuner") {
    return <SpringTunerApp onNavigateHome={() => navigateTo("/")} />;
  }

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(PROFILE.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const openTunerRoute = () => {
    setContactOpen(false);
    navigateTo("/tools/spring-tuner");
  };

  const openContact = () => {
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
            <a
              href="/tools/spring-tuner"
              id="nav-open-tuner-btn"
              className="action-chip"
              onClick={(e) => {
                e.preventDefault();
                openTunerRoute();
              }}
            >
              <span>Spring Tuner ↗</span>
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
              className="action-chip theme-switch-btn"
              onClick={handleToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span className="theme-indicator-dot" />
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
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

              {/* Minimal Interactive Micro-Tool Route Card */}
              <a
                href="/tools/spring-tuner"
                id="launch-tuner-strip-link"
                className="micro-tool-launcher"
                onClick={(e) => {
                  e.preventDefault();
                  openTunerRoute();
                }}
              >
                <div className="micro-tool-left">
                  <span className="micro-tool-tag">TOOL 01</span>
                  <div>
                    <div className="micro-tool-name">CSS Spring & Easing Synthesizer</div>
                    <div className="micro-tool-desc">
                      Standalone oscilloscope & realistic UI test bench at <code>/tools/spring-tuner</code>
                    </div>
                  </div>
                </div>
                <span className="micro-tool-open-btn">
                  <span>Open Tool</span>
                  <span aria-hidden="true">→</span>
                </span>
              </a>
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
            <span>© {new Date().getFullYear()} {PROFILE.name}</span>
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

      {/* Keyboard-Accessible Command Palette Modal */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={(arg) => setCmdOpen(arg === "open")}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onCopyEmail={handleCopyEmail}
        onOpenContactSheet={openContact}
        onOpenTunerSheet={openTunerRoute}
      />
    </div>
  );
}

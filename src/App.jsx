import { useEffect, useState } from "react";
import "./App.css";
import { PROFILE, DISCIPLINES } from "./data/portfolioData";
import CommandPalette from "./components/CommandPalette";

const INQUIRY_TOPICS = [
  "Design System & UI Architecture",
  "Interactive 3D / Three.js Web Experience",
  "High-Conversion Product Landing Page",
  "Frontend Engineering Collaboration"
];

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("iliash-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  const [inspectMode, setInspectMode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [localTime, setLocalTime] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(INQUIRY_TOPICS[0]);
  const [customNote, setCustomNote] = useState("");
  const [copiedBrief, setCopiedBrief] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("iliash-theme", theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", theme === "dark" ? "#0B0D11" : "#F6F4EF");
    }
  }, [theme]);

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: PROFILE.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        setLocalTime(formatter.format(new Date()));
      } catch {
        setLocalTime("UTC+06:00");
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(PROFILE.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  const handleCopyBrief = () => {
    const brief = `To: ${PROFILE.email}\nSubject: ${selectedTopic} — Inquiry via iliash.me\n\nHi Iliash,\n\nI'd love to discuss ${selectedTopic}.${customNote ? `\n\nContext: ${customNote}` : ""}`;
    navigator.clipboard?.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2200);
  };

  const mailtoHref = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
    `${selectedTopic} — via iliash.me`
  )}&body=${encodeURIComponent(
    `Hi Iliash,\n\nI came across iliash.me and would love to connect regarding ${selectedTopic}.\n\n${
      customNote ? `Project notes: ${customNote}\n\n` : ""
    }Best regards,`
  )}`;

  return (
    <div className="site-wrapper">
      {/* Top Architectural Navigation Bar */}
      <header className="topbar" role="banner">
        <div className="page-shell topbar-inner">
          <a href="#top" id="brand-home-link" className="brand-identity">
            <span className="brand-monogram">IH</span>
            <div className="brand-text">
              <span className="brand-domain">{PROFILE.domain}</span>
              <span className="brand-clock" aria-label="Local time in Dhaka">
                {localTime ? `${localTime} · ${PROFILE.timezoneLabel}` : PROFILE.timezoneLabel}
              </span>
            </div>
          </a>

          <nav className="primary-nav" aria-label="Primary Navigation">
            <a href="#disciplines" id="nav-link-disciplines" className="nav-item">
              <span className="nav-num">02</span> Disciplines
            </a>
            <a href="#contact" id="nav-link-contact" className="nav-item">
              <span className="nav-num">03</span> Contact
            </a>
          </nav>

          <div className="topbar-actions">
            <button
              type="button"
              id="open-command-palette-btn"
              className="action-chip"
              onClick={() => setCmdOpen(true)}
              title="Open Command Palette (Ctrl+K or Cmd+K)"
            >
              <span>Command</span>
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

      <main id="top" className="page-shell">
        {/* 01 // HERO SECTION */}
        <section className="hero-section" aria-labelledby="hero-headline">
          <div className="hero-grid">
            <div className="hero-main-col">
              <div className="section-index hero-index">
                <span className="index-num">01</span>
                <span>// FRONT-END DEVELOPER & UI ENGINEER</span>
              </div>

              <h1 id="hero-headline" className="hero-title">
                Iliash Hosain builds fast,{" "}
                <span className="serif-italic">tactile web interfaces</span> where engineering
                meets typographic craft.
              </h1>

              <p className="hero-lead">{PROFILE.summary}</p>

              <div className="hero-cta-row">
                <a href="#contact" id="hero-initiate-dialogue-btn" className="btn-primary">
                  <span>Initiate Dialogue</span>
                  <span aria-hidden="true">↓</span>
                </a>

                <button
                  type="button"
                  id="hero-copy-email-btn"
                  className="btn-secondary"
                  onClick={handleCopyEmail}
                >
                  <span>{copiedEmail ? "Copied iliashhosain@gmail.com ✓" : "Copy Email Address"}</span>
                </button>

                <a
                  href="https://github.com/iliash-me"
                  id="hero-github-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  <span>GitHub @iliash-me</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Architect Dossier Card */}
            <aside className="hero-dossier-col" aria-label="Developer dossier and live specification">
              <div className="dossier-card">
                <div className="dossier-card-top">
                  <span className="dossier-label">
                    {inspectMode ? "SPEC // DOM & TOKEN TELEMETRY" : "DOSSIER // ARCHITECT PROFILE"}
                  </span>
                  <button
                    type="button"
                    id="toggle-dossier-inspect-btn"
                    className="dossier-toggle-btn"
                    onClick={() => setInspectMode((m) => !m)}
                  >
                    {inspectMode ? "View Profile" : "Inspect Specs"}
                  </button>
                </div>

                {!inspectMode ? (
                  <div className="dossier-profile-body">
                    <div className="dossier-identity-row">
                      <img
                        src={PROFILE.avatar}
                        alt="Iliash Hosain portrait"
                        className="dossier-avatar"
                        width="72"
                        height="72"
                      />
                      <div>
                        <div className="dossier-name">{PROFILE.name}</div>
                        <div className="dossier-role">{PROFILE.role}</div>
                        <div className="dossier-handle">github.com/{PROFILE.handle}</div>
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
                ) : (
                  <div className="dossier-spec-body">
                    <div className="spec-row">
                      <span>Active Surface Palette</span>
                      <code>{theme === "dark" ? "Obsidian Ink (#0B0D11)" : "Warm Paper (#F6F4EF)"}</code>
                    </div>
                    <div className="spec-row">
                      <span>Typography System</span>
                      <code>Plus Jakarta Sans + Instrument Serif</code>
                    </div>
                    <div className="spec-row">
                      <span>Runtime Stack</span>
                      <code>React 19 · Vite · Vanilla CSS Tokens</code>
                    </div>
                    <div className="spec-row">
                      <span>Motion Curve</span>
                      <code>cubic-bezier(0.16, 1, 0.3, 1)</code>
                    </div>
                    <div className="spec-row">
                      <span>Layout Grid</span>
                      <code>1180px Fluid Asymmetric Split</code>
                    </div>
                  </div>
                )}

                <div className="dossier-card-footer">
                  <span>STATUS: AVAILABLE FOR SELECT ROLES & PROJECTS</span>
                  <a href="#contact" id="dossier-contact-jump" className="dossier-footer-link">
                    Connect →
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* 02 // ENGINEERING DISCIPLINES */}
        <section id="disciplines" className="section-block" aria-labelledby="disciplines-heading">
          <div className="section-meta-row">
            <div>
              <div className="section-index">
                <span className="index-num">02</span>
                <span>// ARCHITECTURAL DISCIPLINES</span>
              </div>
              <h2 id="disciplines-heading" className="section-heading">
                Built on <span className="serif-italic">first principles</span>
              </h2>
            </div>
            <p className="section-subnote">
              Every project is structured for long-term maintainability, accessible semantics, and resilient performance across devices.
            </p>
          </div>

          <div className="disciplines-matrix">
            {DISCIPLINES.map((item) => (
              <div key={item.number} className="discipline-cell">
                <div className="discipline-top">
                  <span className="discipline-num">{item.number}</span>
                  <h3 className="discipline-title">{item.title}</h3>
                </div>
                <p className="discipline-summary">{item.summary}</p>
                <div className="discipline-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="stack-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 03 // INITIATE DIALOGUE / CONTACT */}
        <section id="contact" className="section-block contact-section" aria-labelledby="contact-heading">
          <div className="contact-grid">
            <div className="contact-left-col">
              <div className="section-index">
                <span className="index-num">03</span>
                <span>// INITIATE DIALOGUE</span>
              </div>
              <h2 id="contact-heading" className="contact-headline">
                Have an ambitious interface to build?{" "}
                <span className="serif-italic">Let’s talk.</span>
              </h2>
              <p className="contact-lead">
                Whether you need a cohesive design system, a high-converting product surface, or an interactive 3D web experience, reach out directly.
              </p>

              <div className="direct-email-box">
                <span className="direct-email-label">DIRECT ELECTRONIC MAIL</span>
                <div className="direct-email-row">
                  <a href={`mailto:${PROFILE.email}`} id="direct-mailto-anchor" className="direct-email-address">
                    {PROFILE.email}
                  </a>
                  <button
                    type="button"
                    id="contact-copy-email-btn"
                    className="btn-secondary btn-compact"
                    onClick={handleCopyEmail}
                  >
                    {copiedEmail ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="social-links-strip">
                {PROFILE.socials.map((soc) => (
                  <a
                    key={soc.id}
                    id={soc.id}
                    href={soc.url}
                    target={soc.url.startsWith("http") ? "_blank" : undefined}
                    rel={soc.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="social-strip-item"
                  >
                    <span className="social-strip-label">{soc.label}</span>
                    <span className="social-strip-handle">{soc.handle} ↗</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Interactive Quick Brief Composer */}
            <div className="contact-composer-card">
              <div className="composer-header">
                <span>QUICK BRIEF COMPOSER</span>
                <code>READY TO DISPATCH</code>
              </div>

              <div className="composer-field">
                <span className="composer-label">1. Select Topic</span>
                <div className="composer-topic-list">
                  {INQUIRY_TOPICS.map((topic, idx) => (
                    <button
                      key={topic}
                      type="button"
                      id={`inquiry-topic-btn-${idx}`}
                      className={`composer-topic-btn ${selectedTopic === topic ? "is-selected" : ""}`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="composer-field">
                <label htmlFor="inquiry-custom-note" className="composer-label">
                  2. Project Context or Timeline (Optional)
                </label>
                <textarea
                  id="inquiry-custom-note"
                  rows="3"
                  className="composer-textarea"
                  placeholder="e.g., Launching a new React product in Q2, looking for front-end architecture..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                />
              </div>

              <div className="composer-actions">
                <a href={mailtoHref} id="send-email-client-btn" className="btn-primary">
                  <span>Open in Email Client</span>
                  <span aria-hidden="true">↗</span>
                </a>
                <button
                  type="button"
                  id="copy-formatted-brief-btn"
                  className="btn-secondary"
                  onClick={handleCopyBrief}
                >
                  {copiedBrief ? "Brief Copied to Clipboard ✓" : "Copy Formatted Brief"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer" role="contentinfo">
        <div className="page-shell footer-inner">
          <div className="footer-left">
            <strong>{PROFILE.name}</strong>
            <span>— {PROFILE.role}</span>
          </div>
          <div className="footer-right">
            <span>Engineered with React & CSS Tokens</span>
            <span className="footer-sep">·</span>
            <span>© {new Date().getFullYear()} {PROFILE.domain}</span>
          </div>
        </div>
      </footer>

      {/* Keyboard-Accessible Command Palette Modal */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={(arg) => setCmdOpen(arg === "open")}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onCopyEmail={handleCopyEmail}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { PROFILE } from "../data/portfolioData";

export default function CommandPalette({ isOpen, onClose, theme, onToggleTheme, onCopyEmail }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onClose("open");
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: "cmd-disciplines",
      group: "Navigation",
      label: "View Engineering Disciplines",
      shortcut: "02",
      action: () => {
        document.getElementById("disciplines")?.scrollIntoView({ behavior: "smooth" });
        onClose();
      }
    },
    {
      id: "cmd-contact",
      group: "Navigation",
      label: "Initiate Dialogue / Contact",
      shortcut: "03",
      action: () => {
        document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
        onClose();
      }
    },
    {
      id: "cmd-theme",
      group: "Preferences",
      label: `Switch to ${theme === "dark" ? "Light (Warm Paper)" : "Dark (Obsidian Ink)"} Theme`,
      shortcut: "T",
      action: () => {
        onToggleTheme();
        onClose();
      }
    },
    {
      id: "cmd-copy-email",
      group: "Direct Action",
      label: `Copy Email (${PROFILE.email})`,
      shortcut: "C",
      action: () => {
        onCopyEmail();
        onClose();
      }
    },
    {
      id: "cmd-github",
      group: "Profile",
      label: "Open GitHub (@iliash-me)",
      shortcut: "↗",
      action: () => {
        window.open("https://github.com/iliash-me", "_blank", "noopener,noreferrer");
        onClose();
      }
    }
  ];

  const filtered = actions.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.group.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="cmd-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={onClose}
    >
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-row">
          <span className="cmd-prompt-symbol">⌘</span>
          <input
            id="command-palette-search"
            type="text"
            className="cmd-input"
            placeholder="Type a command or section..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            id="close-command-palette-btn"
            className="cmd-esc-btn"
            onClick={() => onClose()}
          >
            ESC
          </button>
        </div>

        <div className="cmd-list">
          {filtered.length === 0 ? (
            <div className="cmd-empty">No matching commands found.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                id={item.id}
                type="button"
                className="cmd-item"
                onClick={item.action}
              >
                <div className="cmd-item-left">
                  <span className="cmd-item-group">{item.group}</span>
                  <span className="cmd-item-label">{item.label}</span>
                </div>
                <kbd className="cmd-item-shortcut">{item.shortcut}</kbd>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

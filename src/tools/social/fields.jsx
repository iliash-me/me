// Small form controls for the Social Composer side panels.
import { useState } from 'react';
import { isHex } from './engine';

export function ColorField({ label, value, onChange }) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  return (
    <label className="sc-field sc-color">
      {label && <span className="sc-label">{label}</span>}
      <span className="sc-color-row">
        <input
          type="color"
          value={isHex(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label || 'Color'} picker`}
        />
        <input
          className="sc-hex"
          value={draft}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            let v = e.target.value.trim();
            if (v && v[0] !== '#') v = `#${v}`;
            setDraft(v);
            if (isHex(v)) onChange(v.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
          aria-label={`${label || 'Color'} hex`}
        />
      </span>
    </label>
  );
}

export function SliderField({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return (
    <label className="sc-field sc-slider">
      <span className="sc-label">
        {label}
        <span className="sc-slider-num">
          <input
            type="number"
            value={Number.isFinite(value) ? value : 0}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v)) onChange(v);
            }}
          />
          {suffix}
        </span>
      </span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function NumberField({ label, value, onChange, step = 1, min, max }) {
  return (
    <label className="sc-num">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="sc-field">
      {label && <span className="sc-label">{label}</span>}
      <div className="sc-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
            title={o.title || o.label}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CustomSizeForm({ w, h, onApply }) {
  const [vals, setVals] = useState({ w, h });
  const [prev, setPrev] = useState(`${w}x${h}`);
  if (prev !== `${w}x${h}`) {
    setPrev(`${w}x${h}`);
    setVals({ w, h });
  }
  const submit = (e) => {
    e.preventDefault();
    const nw = Math.round(Number(vals.w));
    const nh = Math.round(Number(vals.h));
    if (nw >= 100 && nh >= 100 && nw <= 4000 && nh <= 4000) onApply(nw, nh);
  };
  return (
    <form className="sc-custom-size" onSubmit={submit}>
      <input type="number" min={100} max={4000} value={vals.w} onChange={(e) => setVals((v) => ({ ...v, w: e.target.value }))} aria-label="Width" />
      <span>×</span>
      <input type="number" min={100} max={4000} value={vals.h} onChange={(e) => setVals((v) => ({ ...v, h: e.target.value }))} aria-label="Height" />
      <button type="submit">Set</button>
    </form>
  );
}

const PATHS = {
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  unlock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>,
  undo: <><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  redo: <><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  text: <><path d="M5 6V4h14v2M12 4v16M9 20h6" /></>,
  rect: <rect x="4" y="6" width="16" height="12" rx="2" />,
  circle: <circle cx="12" cy="12" r="8" />,
  line: <path d="M4 12h16" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  badge: <rect x="3" y="8" width="18" height="8" rx="4" />,
};

export function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

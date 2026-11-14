// DOM rendering of layers + selection overlay. Geometry mirrors render.js exactly.
import { fontCss, getBox, measureTextLayer } from './engine';

const shadowCss = (on, blur) => (on ? `0 ${blur / 3}px ${blur}px rgba(0,0,0,0.3)` : 'none');

function textStyle(l) {
  return {
    fontFamily: fontCss(l.fontFamily),
    fontWeight: l.fontWeight,
    fontSize: `${l.fontSize}px`,
    letterSpacing: `${l.letterSpacing || 0}px`,
    color: l.color,
    textAlign: l.align,
  };
}

export function LayerView({ layer: l, editing, onPointerDown, onDoubleClick, onTextChange, onEditEnd }) {
  const b = getBox(l);
  const style = {
    left: b.x,
    top: b.y,
    width: b.w,
    height: b.h,
    opacity: l.opacity ?? 1,
    transform: l.rotation ? `rotate(${l.rotation}deg)` : undefined,
    cursor: l.locked ? 'default' : 'move',
  };
  const common = {
    className: `sc-layer sc-layer-${l.type}${l.locked ? ' is-locked' : ''}`,
    'data-layer-id': l.id,
    onPointerDown: (e) => onPointerDown(e, l),
    onDoubleClick: (e) => onDoubleClick(e, l),
  };

  if (l.type === 'text') {
    const m = measureTextLayer(l);
    const ts = textStyle(l);
    return (
      <div
        {...common}
        style={{
          ...style,
          padding: m.pad,
          background: l.bgEnabled ? l.bgColor : 'transparent',
          borderRadius: l.bgEnabled ? Math.min(l.radius, b.w / 2, b.h / 2) : 0,
          cursor: editing ? 'text' : style.cursor,
        }}
      >
        {editing ? (
          <textarea
            className="sc-inline-edit"
            autoFocus
            value={l.text}
            spellCheck={false}
            style={{ ...ts, lineHeight: `${m.lh}px`, whiteSpace: l.autoWidth ? 'pre' : 'pre-wrap' }}
            onChange={(e) => onTextChange(l.id, e.target.value)}
            onBlur={onEditEnd}
            onPointerDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.currentTarget.blur();
              }
              e.stopPropagation();
            }}
          />
        ) : (
          m.lines.map((line, i) => (
            <div key={i} className="sc-line" style={{ ...ts, height: m.lh, lineHeight: `${m.lh}px` }}>
              {line || '\u200b'}
            </div>
          ))
        )}
      </div>
    );
  }

  if (l.type === 'image') {
    return (
      <div {...common} style={{ ...style, borderRadius: Math.min(l.radius, b.w / 2, b.h / 2), boxShadow: shadowCss(l.shadow, l.shadowBlur) }}>
        <div className="sc-img-clip" style={{ borderRadius: Math.min(l.radius, b.w / 2, b.h / 2) }}>
          {l.src
            ? <img src={l.src} alt="" draggable={false} style={{ objectFit: l.fit }} />
            : <div className="sc-img-empty">Image</div>}
        </div>
        {l.strokeWidth > 0 && (
          <div className="sc-img-border" style={{ border: `${l.strokeWidth}px solid ${l.stroke}`, borderRadius: Math.min(l.radius, b.w / 2, b.h / 2) }} />
        )}
      </div>
    );
  }

  const sw = Math.min(l.strokeWidth || 0, b.w / 2, b.h / 2);
  return (
    <div
      {...common}
      style={{
        ...style,
        background: l.fillEnabled ? l.fill : 'transparent',
        border: sw > 0 ? `${sw}px solid ${l.stroke}` : 'none',
        borderRadius: l.type === 'ellipse' ? '50%' : Math.min(l.radius, b.w / 2, b.h / 2),
        boxShadow: shadowCss(l.shadow, l.shadowBlur),
      }}
    />
  );
}

const ALL_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const TEXT_HANDLES = ['nw', 'ne', 'e', 'se', 'sw', 'w'];

export function SelectionBox({ layer: l, onHandleDown }) {
  const b = getBox(l);
  const handles = l.locked ? [] : l.type === 'text' ? TEXT_HANDLES : ALL_HANDLES;
  return (
    <div
      className={`sc-selection${l.locked ? ' is-locked' : ''}`}
      style={{ left: b.x, top: b.y, width: b.w, height: b.h, transform: l.rotation ? `rotate(${l.rotation}deg)` : undefined }}
    >
      {handles.map((h) => (
        <span
          key={h}
          className={`sc-handle sc-h-${h}`}
          onPointerDown={(e) => onHandleDown(e, 'resize', h)}
        />
      ))}
      {!l.locked && (
        <>
          <span className="sc-rotate-stem" />
          <span className="sc-rotate" title="Rotate (Shift snaps 15°)" onPointerDown={(e) => onHandleDown(e, 'rotate')} />
        </>
      )}
    </div>
  );
}

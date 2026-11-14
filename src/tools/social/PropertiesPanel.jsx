// Right-hand properties panel for the selected layer.
import { FONT_FAMILIES, FONT_WEIGHTS, getBox, round1 } from './engine';
import { ColorField, SliderField, NumberField, Segmented } from './fields';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="sc-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="sc-toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

const ARRANGE = [
  { id: 'front', label: '⤒', title: 'Bring to front' },
  { id: 'forward', label: '↑', title: 'Bring forward ( ] )' },
  { id: 'backward', label: '↓', title: 'Send backward ( [ )' },
  { id: 'back', label: '⤓', title: 'Send to back' },
];

const ALIGN = [
  { id: 'left', label: '⇤', title: 'Align left' },
  { id: 'hcenter', label: '↔', title: 'Center horizontally' },
  { id: 'right', label: '⇥', title: 'Align right' },
  { id: 'top', label: '⤒', title: 'Align top' },
  { id: 'vcenter', label: '↕', title: 'Center vertically' },
  { id: 'bottom', label: '⤓', title: 'Align bottom' },
];

export default function PropertiesPanel({ layer: l, update, onArrange, onAlign, onDuplicate, onDelete, onReplaceImage }) {
  if (!l) {
    return (
      <div className="sc-panel sc-empty">
        <p className="sc-panel-title">Properties</p>
        <p className="sc-muted">Select a layer on the canvas or in the list below to edit it. Drag to move, use the handles to resize and rotate, double-click text to edit inline.</p>
      </div>
    );
  }
  const b = getBox(l);
  const set = (key) => (v) => update({ [key]: v }, `${l.id}:${key}`);

  return (
    <div className="sc-panel">
      <div className="sc-panel-head">
        <input className="sc-name" value={l.name} onChange={(e) => update({ name: e.target.value }, `${l.id}:name`)} aria-label="Layer name" />
        <span className="sc-type-pill">{l.type === 'ellipse' ? 'circle' : l.type}</span>
      </div>

      <div className="sc-grid4">
        <NumberField label="X" value={l.x} onChange={set('x')} />
        <NumberField label="Y" value={l.y} onChange={set('y')} />
        <NumberField label="W" value={b.w} min={4} onChange={(v) => update(l.type === 'text' ? { w: Math.max(20, v), autoWidth: false } : { w: Math.max(4, v) }, `${l.id}:w`)} />
        {l.type === 'text'
          ? <label className="sc-num is-disabled" title="Text height follows its content"><span>H</span><input value={round1(b.h)} readOnly /></label>
          : <NumberField label="H" value={l.h} min={2} onChange={(v) => update({ h: Math.max(2, v) }, `${l.id}:h`)} />}
      </div>

      <SliderField label="Rotation" value={round1(l.rotation)} min={-180} max={180} step={1} suffix="°" onChange={set('rotation')} />
      <SliderField label="Opacity" value={Math.round((l.opacity ?? 1) * 100)} min={0} max={100} suffix="%" onChange={(v) => update({ opacity: v / 100 }, `${l.id}:opacity`)} />

      <div className="sc-btnrow">
        {ARRANGE.map((a) => <button key={a.id} type="button" title={a.title} aria-label={a.title} onClick={() => onArrange(a.id)}>{a.label}</button>)}
        <span className="sc-sep" />
        <button type="button" title="Duplicate (⌘D)" onClick={onDuplicate}>⧉</button>
        <button type="button" title="Delete (Del)" className="is-danger" onClick={onDelete}>✕</button>
      </div>
      <div className="sc-btnrow">
        {ALIGN.map((a) => <button key={a.id} type="button" title={a.title} aria-label={a.title} onClick={() => onAlign(a.id)}>{a.label}</button>)}
      </div>

      {l.type === 'text' && (
        <>
          <p className="sc-panel-sub">Text</p>
          <textarea className="sc-textarea" rows={3} value={l.text} onChange={(e) => update({ text: e.target.value }, `${l.id}:text`)} />
          <div className="sc-row2">
            <label className="sc-field">
              <span className="sc-label">Font</span>
              <select value={l.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}>
                {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="sc-field">
              <span className="sc-label">Weight</span>
              <select value={l.fontWeight} onChange={(e) => update({ fontWeight: Number(e.target.value) })}>
                {FONT_WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <SliderField label="Size" value={l.fontSize} min={8} max={240} suffix="px" onChange={set('fontSize')} />
          <SliderField label="Line height" value={l.lineHeight} min={0.8} max={2.4} step={0.05} onChange={set('lineHeight')} />
          <SliderField label="Letter spacing" value={l.letterSpacing} min={-6} max={20} step={0.5} suffix="px" onChange={set('letterSpacing')} />
          <Segmented
            label="Align"
            value={l.align}
            onChange={set('align')}
            options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
          />
          <ColorField label="Color" value={l.color} onChange={(v) => update({ color: v, role: null }, `${l.id}:color`)} />
          <Toggle label="Auto width (hug content)" checked={l.autoWidth} onChange={(v) => update(v ? { autoWidth: true } : { autoWidth: false, w: b.w })} />
          <Toggle label="Background pill" checked={l.bgEnabled} onChange={(v) => update({ bgEnabled: v, padding: v && !l.padding ? Math.round(l.fontSize * 0.5) : l.padding })} />
          {l.bgEnabled && (
            <>
              <ColorField label="Background" value={l.bgColor} onChange={(v) => update({ bgColor: v, bgRole: null }, `${l.id}:bg`)} />
              <SliderField label="Padding" value={l.padding} min={0} max={120} onChange={set('padding')} />
              <SliderField label="Radius" value={Math.min(l.radius, 200)} min={0} max={200} onChange={set('radius')} />
            </>
          )}
        </>
      )}

      {(l.type === 'rect' || l.type === 'ellipse') && (
        <>
          <p className="sc-panel-sub">Shape</p>
          <Toggle label="Fill" checked={l.fillEnabled} onChange={set('fillEnabled')} />
          {l.fillEnabled && <ColorField label="Fill" value={l.fill} onChange={(v) => update({ fill: v, role: null }, `${l.id}:fill`)} />}
          <SliderField label="Stroke width" value={l.strokeWidth} min={0} max={40} suffix="px" onChange={set('strokeWidth')} />
          {l.strokeWidth > 0 && <ColorField label="Stroke" value={l.stroke} onChange={(v) => update({ stroke: v, strokeRole: null }, `${l.id}:stroke`)} />}
          {l.type === 'rect' && <SliderField label="Corner radius" value={l.radius} min={0} max={400} onChange={set('radius')} />}
          <Toggle label="Drop shadow" checked={l.shadow} onChange={set('shadow')} />
          {l.shadow && <SliderField label="Shadow blur" value={l.shadowBlur} min={0} max={120} onChange={set('shadowBlur')} />}
        </>
      )}

      {l.type === 'image' && (
        <>
          <p className="sc-panel-sub">Image</p>
          <Segmented label="Fit" value={l.fit} onChange={set('fit')} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} />
          <SliderField label="Corner radius" value={l.radius} min={0} max={400} onChange={set('radius')} />
          <SliderField label="Border width" value={l.strokeWidth} min={0} max={40} suffix="px" onChange={set('strokeWidth')} />
          {l.strokeWidth > 0 && <ColorField label="Border" value={l.stroke} onChange={(v) => update({ stroke: v }, `${l.id}:stroke`)} />}
          <Toggle label="Drop shadow" checked={l.shadow} onChange={set('shadow')} />
          {l.shadow && <SliderField label="Shadow blur" value={l.shadowBlur} min={0} max={120} onChange={set('shadowBlur')} />}
          <button type="button" className="sc-btn sc-btn-block" onClick={onReplaceImage}>Replace image…</button>
        </>
      )}
    </div>
  );
}

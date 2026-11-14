// Background controls: base fill, glow, and pattern overlay.
import { ColorField, SliderField, Segmented } from './fields';

export default function BackgroundPanel({ bg, update }) {
  const set = (key) => (v) => update({ [key]: v }, key);
  return (
    <div className="sc-panel">
      <p className="sc-panel-title">Background</p>
      <Segmented
        value={bg.type}
        onChange={set('type')}
        options={[{ value: 'solid', label: 'Solid' }, { value: 'linear', label: 'Linear' }, { value: 'radial', label: 'Radial' }]}
      />
      <ColorField label={bg.type === 'solid' ? 'Color' : 'Start'} value={bg.c1} onChange={set('c1')} />
      {bg.type !== 'solid' && <ColorField label="End" value={bg.c2} onChange={set('c2')} />}
      {bg.type === 'linear' && <SliderField label="Angle" value={bg.angle} min={0} max={360} suffix="°" onChange={set('angle')} />}

      <label className="sc-toggle">
        <input type="checkbox" checked={!!bg.glow} onChange={(e) => update({ glow: e.target.checked })} />
        <span className="sc-toggle-track" aria-hidden="true" />
        <span>Accent glow</span>
      </label>
      {bg.glow && (
        <>
          <ColorField label="Glow color" value={bg.glowColor} onChange={set('glowColor')} />
          <SliderField label="Intensity" value={Math.round(bg.glowAlpha * 100)} min={0} max={100} suffix="%" onChange={(v) => update({ glowAlpha: v / 100 }, 'glowAlpha')} />
          <SliderField label="Size" value={bg.glowSize} min={5} max={150} suffix="%" onChange={set('glowSize')} />
          <SliderField label="Position X" value={bg.glowX} min={0} max={100} suffix="%" onChange={set('glowX')} />
          <SliderField label="Position Y" value={bg.glowY} min={0} max={100} suffix="%" onChange={set('glowY')} />
        </>
      )}

      <Segmented
        label="Pattern"
        value={bg.pattern}
        onChange={set('pattern')}
        options={[{ value: 'none', label: 'None' }, { value: 'grid', label: 'Grid' }, { value: 'dots', label: 'Dots' }]}
      />
      {bg.pattern !== 'none' && (
        <>
          <ColorField label="Pattern color" value={bg.patternColor} onChange={set('patternColor')} />
          <SliderField label="Opacity" value={Math.round(bg.patternOpacity * 100)} min={1} max={40} suffix="%" onChange={(v) => update({ patternOpacity: v / 100 }, 'patternOpacity')} />
          <SliderField label="Cell size" value={bg.patternSize} min={8} max={160} suffix="px" onChange={set('patternSize')} />
        </>
      )}
    </div>
  );
}

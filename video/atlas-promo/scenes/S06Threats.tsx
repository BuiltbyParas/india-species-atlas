/**
 * 06 · Threats. First one species traced to its threat — species, habitat,
 * threat — in the bustard's own record's words. Then the map comes apart
 * while the threats the atlas records most often are counted.
 *
 * The fragmenting map is a drawing device, and the scene says so: threats are
 * recorded per species, not per place, so no threat is drawn on a place.
 */
import { AbsoluteFill } from 'remotion';
import { featuredSpecies, FEATURED, habitatLabel, threatName, STATS } from '../data/atlas';
import { TYPE, COLOR, ink, withAlpha } from '../styles/tokens';
import { useTime, prog, clamp01, windowed } from '../utils/anim';
import { Label, MaskLine, StatusChip } from '../components/type/Type';
import { THREATS, SCENE_DUR } from '../timeline';

/** The first sentence of a record's text, verbatim. */
const firstSentence = (s: string) => (s.match(/^.*?\.(?=\s|$)/)?.[0] ?? s).trim();

export function S06Threats() {
  const t = useTime();
  const dur = SCENE_DUR.threats;
  const s = featuredSpecies(0);
  const habitat = habitatLabel(FEATURED[0].habitat);
  const chainOut = prog(t, THREATS.chainEnd - 0.3, 0.5, 'inExpo');
  const out = prog(t, dur - 0.7, 0.6, 'inExpo');
  const rows = STATS.threats.slice(0, 4);
  const listX = 1290;

  const step = (label: string, value: React.ReactNode, d: number, color: string = COLOR.ink) => {
    const p = prog(t, d, 0.8);
    return (
      <div style={{ opacity: 1 - chainOut }}>
        <div style={{ ...TYPE.micro, fontSize: 12, color: ink(0.45), opacity: p }}>{label}</div>
        <MaskLine p={p} out={chainOut}>
          <div style={{ ...TYPE.heading, fontSize: 50, color, marginTop: 8 }}>{value}</div>
        </MaskLine>
      </div>
    );
  };
  const arrow = (d: number) => {
    const p = prog(t, d, 0.5, 'cinema');
    return <div style={{ width: 1, height: 44 * p, background: ink(0.4), margin: '14px 0 14px 2px', opacity: 1 - chainOut }} />;
  };

  return (
    <AbsoluteFill>
      {/* One species, traced */}
      {t < THREATS.chainEnd + 0.4 && (
        <div style={{ position: 'absolute', left: 120, top: 188, width: 640 }}>
          <Label p={prog(t, 0.1, 0.6)} style={{ opacity: 1 - chainOut, marginBottom: 36 }}>
            Threats
          </Label>
          {step('Species', <span>{s.commonName} <span style={{ verticalAlign: 'middle', display: 'inline-block', marginLeft: 10 }}><StatusChip status={s.status} p={prog(t, 0.6, 0.6)} showName={false} scale={1.3} /></span></span>, 0.35)}
          {arrow(0.8)}
          {step('Habitat', habitat, 1.0)}
          {arrow(1.45)}
          {step('Threat', threatName('power-lines'), 1.65, COLOR.threat)}
          <div style={{ ...TYPE.italic, fontSize: 25, color: ink(0.72), marginTop: 26, maxWidth: 600, opacity: prog(t, 2.1, 0.8) * (1 - chainOut) }}>
            “{firstSentence(s.threatNote)}”
          </div>
        </div>
      )}

      {/* Everything: the threats the atlas records most often */}
      <div style={{ position: 'absolute', left: listX, top: 196, width: 520 }}>
        <Label p={prog(t, THREATS.chainEnd + 0.4, 0.7)} style={{ opacity: 1 - out }}>
          {`Most recorded threats  ·  of ${STATS.species} species`}
        </Label>
        {rows.map((r, i) => {
          const d = THREATS.chainEnd + 0.7 + i * 0.32;
          const p = prog(t, d, 0.8);
          const barP = prog(t, d + 0.15, 1.0, 'cinema');
          return (
            <div key={r.id} style={{ marginTop: i === 0 ? 34 : 30, opacity: clamp01(p * 1.5) * (1 - out) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
                <MaskLine p={p} out={out}>
                  <div style={{ ...TYPE.heading, fontSize: 32, color: i === 0 ? COLOR.ink : ink(0.86) }}>{r.name}</div>
                </MaskLine>
                <div style={{ ...TYPE.heading, fontSize: 32, color: withAlpha(COLOR.threat, 0.95), fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(barP * r.value)}
                </div>
              </div>
              <div style={{ height: 2, background: ink(0.1), marginTop: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: 2, width: `${(r.value / r.of) * 100 * barP}%`, background: COLOR.threat }} />
              </div>
            </div>
          );
        })}
        <div style={{ ...TYPE.micro, fontSize: 12, letterSpacing: '0.16em', color: ink(0.4), marginTop: 36, opacity: windowed(t, THREATS.chainEnd + 2.4, dur - 0.5, 0.8, 0.4) }}>
          Threats are recorded per species, not per place
        </div>
      </div>
    </AbsoluteFill>
  );
}

/**
 * 05 · The data. Every locality in the atlas lands on the map while the
 * counter beside it counts them — the number IS the markers. Then the
 * headline figures and the status split, all computed from src/data.
 */
import { AbsoluteFill } from 'remotion';
import { STATS } from '../data/atlas';
import { TYPE, COLOR, ink, EASE } from '../styles/tokens';
import { useTime, prog, clamp01, countTo } from '../utils/anim';
import { Label, MaskLine, Rule } from '../components/type/Type';
import { DATA, SCENE_DUR } from '../timeline';

const X = 1080;
const W = 720;

function Figure({ value, label, p, out }: { value: number | string; label: string; p: number; out: number }) {
  return (
    <div style={{ opacity: clamp01(p * 2) * (1 - out) }}>
      <MaskLine p={p} out={out}>
        <div style={{ ...TYPE.number, fontSize: 132, color: COLOR.ink }}>{value}</div>
      </MaskLine>
      <div style={{ ...TYPE.micro, fontSize: 13, color: ink(0.55), marginTop: 14 }}>{label}</div>
    </div>
  );
}

export function S05Data() {
  const t = useTime();
  const dur = SCENE_DUR.data;
  const out = prog(t, dur - 0.7, 0.6, 'inExpo');
  // Localities land west→east over DATA.markersDur; count them as they land.
  const landed = Math.min(STATS.locations, Math.floor(clamp01((t - DATA.markersFrom) / DATA.markersDur) * STATS.locations + (t > DATA.markersFrom ? 1 : 0)));
  const barP = prog(t, 5.6, 1.4, 'cinema');
  const total = STATS.byStatus.reduce((n, s) => n + s.count, 0);

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: X, top: 150 }}>
        <Label p={prog(t, 0.2, 0.7)} style={{ opacity: 1 - out }}>
          The data
        </Label>
      </div>
      <div style={{ position: 'absolute', left: X, top: 206, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 48, rowGap: 44, width: W }}>
        <Figure value={Math.max(0, landed)} label="Mapped localities" p={prog(t, DATA.markersFrom - 0.2, 0.7)} out={out} />
        <Figure value={countTo(t, 1.4, 1.6, STATS.species)} label="Threatened species" p={prog(t, 1.2, 0.7)} out={out} />
        <Figure value={countTo(t, 2.4, 1.4, STATS.regions)} label="Ecological regions" p={prog(t, 2.2, 0.7)} out={out} />
        <Figure value={countTo(t, 3.2, 1.4, STATS.programmes)} label="Conservation programmes" p={prog(t, 3.0, 0.7)} out={out} />
      </div>

      {/* The status split: a single bar, the site's status colours, counts as text too */}
      <div style={{ position: 'absolute', left: X, top: 720, width: W, opacity: 1 - out }}>
        <Label p={prog(t, 5.2, 0.7)} rule={0}>
          IUCN Red List status
        </Label>
        <div style={{ display: 'flex', gap: 4, marginTop: 22, height: 10 }}>
          {STATS.byStatus.map((s, i) => {
            const share = s.count / total;
            const p = clamp01(barP * 3 - i);
            return <div key={s.code} style={{ width: `${share * 100 * EASE.outExpo(p)}%`, background: s.hex, transition: 'none' }} />;
          })}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 18 }}>
          {STATS.byStatus.map((s, i) => {
            const p = prog(t, 6.0 + i * 0.25, 0.8);
            return (
              <div key={s.code} style={{ width: `${(s.count / total) * 100}%`, opacity: p, transform: `translateY(${(1 - p) * 8}px)` }}>
                <div style={{ ...TYPE.heading, fontSize: 44, color: s.hex }}>{s.count}</div>
                <div style={{ ...TYPE.micro, fontSize: 12, color: ink(0.6), marginTop: 6, letterSpacing: '0.18em' }}>{s.name}</div>
              </div>
            );
          })}
        </div>
        <Rule p={prog(t, 7.6, 1.0)} width={W} color={ink(0.18)} style={{ marginTop: 34 }} />
        <div style={{ ...TYPE.micro, fontSize: 12, letterSpacing: '0.16em', color: ink(0.42), marginTop: 14, opacity: prog(t, 8.0, 0.8) }}>
          {`Counted from the Atlas's records  ·  ${STATS.endemic} endemic to India`}
        </div>
      </div>
    </AbsoluteFill>
  );
}

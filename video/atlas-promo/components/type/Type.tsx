/**
 * Kinetic typography. Each component takes a 0–1 progress (or a time and a
 * start) rather than animating itself, so a scene decides *when* and these
 * decide *how*. Motion is precise: masks, tracking and short travel. Nothing
 * bounces.
 */
import type { CSSProperties, ReactNode } from 'react';
import { EASE } from '../../styles/tokens';
import { clamp01, prog } from '../../utils/anim';
import { TYPE, ink, COLOR, withAlpha } from '../../styles/tokens';
import { STATUS_INFO } from '../../data/atlas';
import type { IucnStatus } from '../../../../src/types';

/** A line revealed upward through a mask; exits upward too when `out` > 0. */
export function MaskLine({ p, out = 0, children, style, travel = 1.05 }: { p: number; out?: number; children: ReactNode; style?: CSSProperties; travel?: number }) {
  const y = (1 - EASE.outExpo(clamp01(p))) * travel * 100 - EASE.inExpo(clamp01(out)) * travel * 100;
  return (
    <div style={{ overflow: 'hidden', paddingBottom: '0.08em', marginBottom: '-0.08em', ...style }}>
      <div style={{ transform: `translateY(${y}%)`, willChange: 'transform' }}>{children}</div>
    </div>
  );
}

/** Characters arriving in sequence: each rises a little and sharpens from transparent. */
export function Chars({ text, t, start, stagger = 0.035, dur = 0.7, style, out = 0 }: { text: string; t: number; start: number; stagger?: number; dur?: number; style?: CSSProperties; out?: number }) {
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'pre', ...style }}>
      {[...text].map((ch, i) => {
        const p = prog(t, start + i * stagger, dur, 'outExpo');
        const o = clamp01(out * 1.4 - (i / text.length) * 0.4);
        return (
          <span key={i} style={{ display: 'inline-block', opacity: p * (1 - o), transform: `translateY(${(1 - p) * 0.28 - o * 0.2}em)` }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}

/** Wide tracking closing to its set value as the text arrives — the opening gesture of the film. */
export function Tracked({ text, p, from = 0.6, to = -0.045, style }: { text: string; p: number; from?: number; to?: number; style?: CSSProperties }) {
  const e = EASE.outExpo(clamp01(p));
  return <span style={{ ...style, letterSpacing: `${from + (to - from) * e}em`, opacity: clamp01(p * 2.5) }}>{text}</span>;
}

/** Micro label with a leading hairline that draws first. */
export function Label({ p, children, color = ink(0.62), rule = 36, style }: { p: number; children: ReactNode; color?: string; rule?: number; style?: CSSProperties }) {
  const e = EASE.outExpo(clamp01(p));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...TYPE.micro, color, ...style }}>
      {rule > 0 && <span style={{ display: 'inline-block', width: rule * e, height: 1, background: color }} />}
      <span style={{ opacity: clamp01((p - 0.25) * 2), transform: `translateX(${(1 - e) * -10}px)` }}>{children}</span>
    </div>
  );
}

/** The site's IUCN status chip (src/components/ui/StatusBadge.tsx), drawn at film scale. */
export function StatusChip({ status, p = 1, showName = true, scale = 1.6 }: { status: IucnStatus; p?: number; showName?: boolean; scale?: number }) {
  const info = STATUS_INFO[status];
  const e = EASE.outExpo(clamp01(p));
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6 * scale,
        padding: `${4 * scale}px ${10 * scale}px`,
        border: `${Math.max(1, scale)}px solid ${info.hex}`,
        borderRadius: 999,
        color: info.hex,
        fontFamily: TYPE.micro.fontFamily,
        fontWeight: 600,
        fontSize: 12 * scale,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        opacity: e,
        transform: `translateY(${(1 - e) * 8}px)`,
        background: withAlpha(COLOR.ground, 0.6),
      }}
    >
      <span style={{ width: 8 * scale, height: 8 * scale, borderRadius: 999, background: info.hex }} />
      <span>{info.code}</span>
      {showName && <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: ink(0.85) }}>{info.name}</span>}
    </span>
  );
}

/** A hairline that draws from one end, the film's recurring line. */
export function Rule({ p, width, color = ink(0.35), from = 'left', style }: { p: number; width: number; color?: string; from?: 'left' | 'right'; style?: CSSProperties }) {
  const e = EASE.outExpo(clamp01(p));
  return (
    <div style={{ width, height: 1, position: 'relative', ...style }}>
      <div style={{ position: 'absolute', top: 0, [from]: 0, width: width * e, height: 1, background: color }} />
    </div>
  );
}

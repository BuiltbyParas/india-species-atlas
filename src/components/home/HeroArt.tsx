import { PALETTE, STATUS_HEX } from '../../theme';

/** Decorative, non-geographic composition evoking a distribution atlas. */
const DOTS: Array<{ x: number; y: number; s: keyof typeof STATUS_HEX; r: number }> = [
  { x: 40, y: 30, s: 'VU', r: 4 },
  { x: 68, y: 22, s: 'VU', r: 3 },
  { x: 120, y: 44, s: 'EN', r: 5 },
  { x: 95, y: 70, s: 'EN', r: 3.5 },
  { x: 150, y: 92, s: 'EN', r: 4 },
  { x: 60, y: 96, s: 'CR', r: 4.5 },
  { x: 44, y: 128, s: 'CR', r: 3.5 },
  { x: 108, y: 140, s: 'EN', r: 4 },
  { x: 138, y: 168, s: 'VU', r: 3 },
  { x: 82, y: 176, s: 'EN', r: 4.5 },
  { x: 118, y: 200, s: 'VU', r: 3.5 },
  { x: 150, y: 128, s: 'EN', r: 3 },
];

/**
 * Flat hero artwork. Also the fallback whenever the 3D relief is skipped —
 * reduced motion, no WebGL, a low-end device or a failed load.
 */
export function HeroArt() {
  return (
    <svg viewBox="0 0 200 230" className="h-full w-full" role="img" aria-label="Stylised distribution-atlas graphic">
      <defs>
        <radialGradient id="glow" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor={PALETTE.forest600} stopOpacity="0.5" />
          <stop offset="100%" stopColor={PALETTE.forest950} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="230" fill="url(#glow)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line key={`h${i}`} x1="0" x2="200" y1={i * 32 + 8} y2={i * 32 + 8} stroke={PALETTE.forest700} strokeWidth="0.5" opacity="0.6" />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={`v${i}`} x1={i * 32 + 8} x2={i * 32 + 8} y1="0" y2="230" stroke={PALETTE.forest700} strokeWidth="0.5" opacity="0.6" />
      ))}
      {[26, 52, 80].map((r) => (
        <circle key={r} cx="96" cy="112" r={r} fill="none" stroke={PALETTE.forest500} strokeWidth="0.8" opacity="0.5" />
      ))}
      {DOTS.map((d, i) => (
        <g key={i}>
          <circle cx={d.x} cy={d.y} r={d.r + 4} fill={STATUS_HEX[d.s]} opacity="0.15" />
          <circle cx={d.x} cy={d.y} r={d.r} fill={STATUS_HEX[d.s]} />
        </g>
      ))}
    </svg>
  );
}

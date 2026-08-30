import { Link } from 'react-router-dom';
import { ArrowRight, MapPinned } from 'lucide-react';
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

function HeroArt() {
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

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-forest-800 bg-forest-950">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-forest-700 bg-forest-900/60 px-3 py-1 text-xs font-medium text-forest-200">
            <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
            Interactive biodiversity atlas
          </p>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.1] text-canvas sm:text-5xl lg:text-6xl">
            India Species Atlas
          </h1>
          <p className="mt-3 text-lg font-medium text-forest-200 sm:text-xl">
            Mapping Endangered Species and Their Conservation Status in India
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-canvas/70">
            Explore where India&rsquo;s threatened species live, the pressures they face, and the conservation
            efforts protecting them — on an interactive map, backed by IUCN Red List assessments and
            government conservation programmes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/atlas"
              className="inline-flex items-center gap-2 rounded-lg bg-forest-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-forest-400"
            >
              Explore the Map
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-forest-600 px-5 py-3 text-sm font-semibold text-canvas transition hover:bg-forest-900"
            >
              Learn About the Project
            </Link>
          </div>
        </div>

        <div className="relative mx-auto aspect-[200/230] w-full max-w-sm rounded-2xl border border-forest-800 bg-forest-900/40 p-2">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}

import type { FieldStudy } from '../../content/fieldStudies';
import { GeoLine } from '../../geo/line/GeoLine';
import { cn } from '../../utils/cn';

/**
 * Where the reader is in a field study: not a progress bar, a survey line.
 *
 * A GeoLine (role `route`, the reader's own path) runs under the chapter
 * name and count — `RANGE 02 / 07` — drawn as far as the chapter reached,
 * with a tick for every chapter. The ticks are buttons: each jumps to its
 * chapter, so the line is also the study's table of contents.
 */
export function StudyProgress({ study, current, onJump }: { study: FieldStudy; current: number; onJump: (i: number) => void }) {
  const n = study.stages.length;
  const W = 240;
  const x = (i: number) => (i / (n - 1)) * W;
  return (
    <nav className="fs-progress" aria-label={`${study.species.commonName}: chapters`}>
      <p className="fs-progress-label" aria-hidden="true">
        <span className="fs-progress-name">{study.stages[current].label}</span>
        <span className="tabular-nums">
          {String(current + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </span>
      </p>
      <div className="fs-progress-line">
        <svg viewBox={`-6 -8 ${W + 12} 16`} preserveAspectRatio="none" aria-hidden="true">
          <GeoLine d={`M0 0H${W}`} role="survey" still />
          <GeoLine d={`M0 0H${W}`} role="route" draw={current / (n - 1)} className="fs-progress-route" />
        </svg>
        <ol>
          {study.stages.map((s, i) => (
            <li key={s.label} style={{ left: `${(x(i) / W) * 100}%` }}>
              <button
                type="button"
                className={cn('fs-tick', i <= current && 'is-passed', i === current && 'is-current')}
                aria-current={i === current ? 'step' : undefined}
                onClick={() => onJump(i)}
              >
                <span className="sr-only">
                  Chapter {i + 1}: {s.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

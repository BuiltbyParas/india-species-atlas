import { Fragment, useEffect, useRef, type ElementType } from 'react';
import { cubicBezier } from '../../motion/gsap';
import { hasFinePointer, useReducedMotion } from '../../motion/preferences';
import { useInView } from '../../motion/useInView';
import { schedule } from '../../interaction/loop';
import { sampleFn, toPath } from '../../interaction/morph';
import { Spring, springDriver } from '../../interaction/spring';
import { cn } from '../../utils/cn';

/**
 * A title written along a line, which then becomes the rule beneath it.
 *
 * CONTOUR → TYPOGRAPHIC PATH → RULE. A pen draws a gentle contour under where
 * the title will stand, and the letters are set onto it as the nib passes,
 * each tilted to the line's slope. Then the contour relaxes and straightens;
 * the letters settle with it onto a level baseline; and what is left is a
 * hairline rule under an editorial title. The contour is a typographic device,
 * not a mapped feature, and claims nothing about any place.
 *
 * Afterwards the rule stays a little alive: the hand near the baseline pulls
 * it, like a ruled string, and the letters above that point ride with it.
 * A few pixels at most, on a spring, and only with a fine pointer.
 *
 * The title is real text (read once by assistive technology, as a whole);
 * the split letters and the rule are presentation. Reduced motion sets it
 * level and ruled from the start.
 */
const ease = cubicBezier(0.7, 0, 0.2, 1);
const SAMPLES = 72;

export function LineTitle({
  text,
  as: Tag = 'span',
  className,
  play,
  delay = 0,
  seed = 0,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** Drive it from outside; otherwise it plays on entering the viewport. */
  play?: boolean;
  delay?: number;
  /** Shifts the contour's phase, so two titles on one page are not the same shape. */
  seed?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ruleRef = useRef<SVGPathElement>(null);
  const seen = useInView(ref);
  const shown = play ?? seen;
  const reduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const el = ref.current;
    const svg = svgRef.current;
    const rule = ruleRef.current;
    if (!el || !svg || !rule) return;
    const letters = [...el.querySelectorAll<HTMLElement>('.lt-l')];

    let W = 0;
    let base = 0;
    let amp = 0;
    const phase = 0.4 + seed * 1.7;
    let centres: number[] = [];
    let bend = reduced ? 0 : 1;
    const pull = new Spring(0, { stiffness: 170, damping: 11, precision: 0.02 });
    let pullAt = 0;
    let sigma = 40;

    const contour = (x: number) => {
      // Two gentle waves; tapered so the rule starts and ends level.
      const u = x / Math.max(W, 1);
      const taper = Math.sin(Math.PI * Math.min(Math.max(u, 0), 1)) ** 0.6;
      return amp * taper * (Math.sin(u * Math.PI * 2.1 + phase) * 0.75 + Math.sin(u * Math.PI * 4.3 + phase * 2) * 0.25);
    };
    const pluck = (x: number) => pull.value * Math.exp(-(((x - pullAt) / sigma) ** 2));
    const at = (x: number) => contour(x) * bend + pluck(x);

    const measure = () => {
      W = el.clientWidth;
      const size = Number.parseFloat(getComputedStyle(el).fontSize) || 48;
      amp = size * 0.2;
      sigma = size * 1.1;
      base = el.clientHeight + size * 0.08;
      centres = letters.map((l) => l.offsetLeft + l.offsetWidth / 2);
      svg.setAttribute('width', String(W));
      svg.setAttribute('height', String(Math.ceil(base + amp + 8)));
      svg.setAttribute('viewBox', `0 0 ${W} ${Math.ceil(base + amp + 8)}`);
    };

    const render = () => {
      const h = 1e-2;
      for (let i = 0; i < letters.length; i++) {
        const x = centres[i];
        const y = at(x);
        const slope = (at(x + h) - at(x - h)) / (2 * h);
        letters[i].style.transform =
          Math.abs(y) < 0.01 && Math.abs(slope) < 1e-4
            ? ''
            : `translateY(${y.toFixed(2)}px) rotate(${Math.atan(slope).toFixed(4)}rad)`;
      }
      rule.setAttribute('d', toPath(sampleFn((x) => base + at(x), 0, W, SAMPLES)));
    };

    measure();
    if (!shown) {
      el.dataset.lt = 'pre';
      render();
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    if (reduced) {
      bend = 0;
      el.dataset.lt = 'done';
      render();
    } else {
      el.dataset.lt = 'pre';
      render();
      // Written: the rule draws and the letters appear as the nib passes them.
      for (let i = 0; i < letters.length; i++) {
        letters[i].style.transitionDelay = `${(delay + 0.12 + (centres[i] / Math.max(W, 1)) * 0.8).toFixed(3)}s`;
      }
      el.style.setProperty('--lt-delay', `${delay}s`);
      requestAnimationFrame(() => {
        if (!cancelled) el.dataset.lt = 'write';
      });
      // Then the contour straightens into a rule.
      timers.push(
        window.setTimeout(() => {
          const start = performance.now();
          const dur = 1250;
          schedule((_dt, now) => {
            if (cancelled) return false;
            const t = Math.min((now - start) / dur, 1);
            bend = 1 - ease(t);
            render();
            if (t >= 1) {
              el.dataset.lt = 'done';
              return false;
            }
            return true;
          });
        }, (delay + 1.15) * 1000),
      );
    }

    const kick = springDriver([pull], render);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || el.dataset.lt !== 'done') return;
      const r = el.getBoundingClientRect();
      const y = e.clientY - r.top - base;
      pullAt = e.clientX - r.left;
      // Pulled towards the hand, a few pixels at most.
      pull.target = Math.max(-7, Math.min(7, y * 0.3));
      kick();
    };
    const onLeave = () => {
      pull.target = 0;
      kick();
    };
    const zone = el.parentElement ?? el;
    const fine = hasFinePointer() && !reduced;
    if (fine) {
      zone.addEventListener('pointermove', onMove);
      zone.addEventListener('pointerleave', onLeave);
    }

    const ro = new ResizeObserver(() => {
      measure();
      render();
    });
    ro.observe(el);
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      measure();
      render();
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      ro.disconnect();
      if (fine) {
        zone.removeEventListener('pointermove', onMove);
        zone.removeEventListener('pointerleave', onLeave);
      }
    };
  }, [shown, reduced, delay, seed, text]);

  return (
    <Tag ref={ref} className={cn('line-title', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <Fragment key={w}>
            <span className="lt-word">
              {[...word].map((ch, i) => (
                <span key={i} className="lt-l">
                  {ch}
                </span>
              ))}
            </span>
            {w < words.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </span>
      <svg ref={svgRef} className="lt-svg" aria-hidden="true">
        <path ref={ruleRef} className="lt-rule" pathLength={1} />
      </svg>
    </Tag>
  );
}

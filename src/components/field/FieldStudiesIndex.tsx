import './field.css';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FIELD_STUDIES, type FieldStudy } from '../../content/fieldStudies';
import { formatDeg } from '../../geo/india';
import { onScroll } from '../../interaction/scroll';
import { scrollToTarget, getLenis } from '../../motion/SmoothScroll';
import { ScrollTrigger } from '../../motion/gsap';
import { useReducedMotion } from '../../motion/preferences';
import { photoSources } from '../../utils/photo';
import { cn } from '../../utils/cn';
import { STATUS_INFO } from '../../data/statusInfo';
import { enterStudy, preloadStudyPage, releaseOnArrival, takeReturn } from './fieldNav';
import { useFieldStage } from './useFieldStage';
import { habitatBand } from './studyFacts';

/**
 * FEATURED FIELD STUDIES: the five flagship species as five works.
 *
 * Not a grid of cards. One screen holds still while the page scrolls past
 * it, and behind its type the field stage shows one world at a time: the
 * Thar, the high Himalaya, the river, the forest, the floodplain. Each study
 * has its own composition — its name sits where its world puts weight (on
 * the bustard's horizon, high on the leopard's mountain, along the river's
 * current, small in the forest's dark, heavy on the floodplain) — and the
 * scroll moves from one to the next, the world turning into the next as it
 * does. Hovering a work engages it before any click: the line begins to
 * trace, the contours brighten, the water answers, the light follows, the
 * form turns; the instrument carries the study's verb. Pressing it enters
 * the world (fieldNav.ts): the camera goes in, and the study's own page
 * arrives around it.
 *
 * The list at the side names all five and is the keyboard's way through:
 * each entry is a real link, focus previews its world, Enter goes in.
 *
 * With reduced motion the worlds still change, as cuts; nothing travels.
 * Without WebGL each composition stands over its photograph instead.
 */
export function FieldStudiesIndex() {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const location = useLocation();
  // Back from a study, or sent here by the header's "Field studies" (/#field-studies): open at the index.
  const [returning] = useState(() => takeReturn() ?? (location.hash === '#field-studies' ? FIELD_STUDIES[0].id : null));
  const [scrollActive, setScrollActive] = useState(() => Math.max(0, FIELD_STUDIES.findIndex((f) => f.id === returning)));
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [near, setNear] = useState(Boolean(returning));
  const { stage, status } = useFieldStage(hostRef, near);
  const active = FIELD_STUDIES.find((f) => f.id === hoverId) ?? FIELD_STUDIES[scrollActive];

  // Start loading the stage a screen or two before the section arrives.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '150% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // Which study the scroll has reached: one viewport of scroll each.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let top = 0;
    let last = -1;
    const measure = () => {
      top = section.getBoundingClientRect().top + window.scrollY;
    };
    const update = () => {
      const local = (window.scrollY - top) / window.innerHeight;
      const i = Math.min(FIELD_STUDIES.length - 1, Math.max(0, Math.round(local)));
      if (i !== last) setScrollActive((last = i));
    };
    measure();
    update();
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(document.body);
    const off = onScroll(update);
    return () => {
      ro.disconnect();
      off();
    };
  }, []);

  // Coming back from a study: open at it, with the world already showing it.
  useLayoutEffect(() => {
    if (!returning) return;
    const i = FIELD_STUDIES.findIndex((f) => f.id === returning);
    const jump = () => {
      const section = sectionRef.current;
      if (!section) return;
      ScrollTrigger.refresh();
      const y = section.getBoundingClientRect().top + window.scrollY + i * window.innerHeight;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    };
    jump();
    const raf = requestAnimationFrame(jump);
    const t = window.setTimeout(jump, 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [returning]);

  // Already on the home page when "Field studies" is chosen: travel down to the index.
  const firstHash = useRef(location.key);
  useEffect(() => {
    if (location.hash !== '#field-studies' || location.key === firstHash.current) return;
    // After the menu (if it was the way here) has folded and given the scroll back.
    const t = window.setTimeout(() => {
      const section = sectionRef.current;
      if (section) scrollToTarget(section.getBoundingClientRect().top + window.scrollY);
    }, 420);
    return () => window.clearTimeout(t);
  }, [location.hash, location.key]);

  // The world on screen follows the active study; the hand engages it.
  useEffect(() => {
    if (!stage || leaving) return;
    void stage.show(active.id, { duration: reduced ? 0 : 1200 });
  }, [stage, active.id, leaving, reduced]);

  useEffect(() => {
    if (!stage || leaving) return;
    stage.set({ engage: engaged || hoverId ? 1 : 0, progress: 0, drag: 0 });
  }, [stage, engaged, hoverId, leaving]);

  // Arrived back from a study: give the screen back once the page is in place.
  useEffect(() => {
    if (!stage || !returning) return;
    if (stage.layerMode !== 'front') return;
    return releaseOnArrival(() => stage.release(), 900);
  }, [stage, returning]);

  // Build the other worlds before the scroll reaches them, nearest first, one per idle moment.
  useEffect(() => {
    if (!stage) return;
    const i = FIELD_STUDIES.findIndex((f) => f.id === active.id);
    const order = [...FIELD_STUDIES.slice(i), ...FIELD_STUDIES.slice(0, i)].map((f) => f.id);
    stage.prepareInIdle(order);
    // Only once the stage exists; the order is a hint, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const go = (f: FieldStudy) => {
    preloadStudyPage();
    setHoverId(f.id);
    void enterStudy(navigate, f.id, () => setLeaving(f.id));
  };

  const jumpTo = (i: number) => {
    const section = sectionRef.current;
    if (!section) return;
    scrollToTarget(section.getBoundingClientRect().top + window.scrollY + i * window.innerHeight);
  };

  return (
    <section
      ref={sectionRef}
      id="field-studies"
      className={cn('fs-index', leaving && 'is-leaving')}
      style={{ ['--n' as string]: FIELD_STUDIES.length } as CSSProperties}
      aria-labelledby="fs-index-title"
      data-status={status}
    >
      <div
        ref={hostRef}
        className="fs-index-stage"
        data-study={active.id}
        data-tone={active.id === 'great-indian-bustard' || active.id === 'snow-leopard' || active.id === 'ganges-river-dolphin' || active.id === 'indian-rhinoceros' ? 'light' : 'dark'}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return;
          setEngaged(true);
          preloadStudyPage();
        }}
        onPointerLeave={() => setEngaged(false)}
      >
        {status !== 'ready' && <FlatGround study={active} />}
        <span className="fs-scrim" aria-hidden="true" />

        <header className="fs-index-head">
          <h2 id="fs-index-title" className="fs-kicker">
            Featured field studies
          </h2>
          <p className="fs-index-count tabular-nums" aria-hidden="true">
            {active.n} <span>/ {String(FIELD_STUDIES.length).padStart(2, '0')}</span>
          </p>
        </header>

        {FIELD_STUDIES.map((f) => (
          <Composition key={f.id} study={f} active={f.id === active.id} entering={leaving === f.id} onEnter={() => go(f)} />
        ))}

        <nav className="fs-index-list" aria-label="Field studies">
          <ol>
            {FIELD_STUDIES.map((f, i) => (
              <li key={f.id}>
                <Link
                  to={`/field/${f.id}`}
                  data-transition="none"
                  data-cursor="Enter"
                  aria-current={f.id === active.id ? 'true' : undefined}
                  className={cn('fs-list-item', f.id === active.id && 'is-active')}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setHoverId(f.id)}
                  onPointerLeave={() => setHoverId(null)}
                  onFocus={() => {
                    setHoverId(f.id);
                    jumpTo(i);
                  }}
                  onBlur={() => setHoverId(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(f);
                  }}
                >
                  <span className="fs-list-n tabular-nums">{f.n}</span>
                  <span className="fs-list-name">{f.species.commonName}</span>
                  <span className="fs-list-verb">{f.habitat}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="fs-index-runway" aria-hidden="true">
        {FIELD_STUDIES.map((f, i) => (
          <div key={f.id} className="fs-index-panel" data-env={f.env} data-route-stop={i} />
        ))}
      </div>
    </section>
  );
}

/** Each study's own arrangement of the same few facts. */
function Composition({ study, active, entering, onEnter }: { study: FieldStudy; active: boolean; entering: boolean; onEnter: () => void }) {
  const s = study.species;
  const anchor = s.distributionPoints[0];
  const status = STATUS_INFO[s.status];
  const band = study.id === 'snow-leopard' ? habitatBand(s) : null;
  return (
    <div className={cn('fs-comp', `fs-comp--${study.n}`, active && 'is-active', entering && 'is-entering')} aria-hidden={!active}>
      <p className="fs-comp-n tabular-nums">Field study {study.n}</p>
      <h3 className="fs-comp-name">
        <Link
          to={`/field/${study.id}`}
          data-transition="none"
          data-cursor="Enter"
          tabIndex={active ? 0 : -1}
          onClick={(e) => {
            e.preventDefault();
            onEnter();
          }}
        >
          {s.commonName.split(' ').map((w, i) => (
            <span key={i} className="fs-word" style={{ ['--i' as string]: i } as CSSProperties}>
              <span>{w}</span>
            </span>
          ))}
          <span className="sr-only">. Enter the field study.</span>
        </Link>
      </h3>
      <p className="fs-comp-place">{study.place}</p>
      <dl className="fs-comp-meta">
        <div>
          <dt>Status</dt>
          <dd>
            <span className="fs-dot" style={{ background: status.colorVar }} aria-hidden="true" />
            {status.name}
          </dd>
        </div>
        <div>
          <dt>Anchor</dt>
          <dd className="tabular-nums">
            {formatDeg(anchor.lat, 'lat')} {formatDeg(anchor.lng, 'lng')}
          </dd>
        </div>
        {band && (
          <div>
            <dt>Habitat band</dt>
            <dd className="tabular-nums">{band}</dd>
          </div>
        )}
      </dl>
      {/* The verb is also the visible way in (the name is the keyboard's; this one is for the eye and the hand). */}
      <button type="button" className="fs-comp-verb" aria-hidden="true" tabIndex={-1} data-cursor="Enter" onClick={onEnter}>
        <span className="fs-verb-rule" />
        {study.habitat}
        <span className="fs-comp-enter">
          Enter
          <svg viewBox="0 0 16 8" aria-hidden="true">
            <path d="M0 4h14M11 1l3 3-3 3" />
          </svg>
        </span>
      </button>
    </div>
  );
}

/** Without WebGL: the study's photograph, set in its ground, stands in for its world. */
export function FlatGround({ study }: { study: FieldStudy }) {
  const photo = photoSources(study.species);
  return (
    <div className="fs-flat" data-study={study.id} aria-hidden="true">
      {photo && <img key={study.id} src={photo.small} alt="" className="fs-flat-img" decoding="async" />}
    </div>
  );
}

import './field.css';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FIELD_STUDIES, studyTone, type FieldStudy } from '../../content/fieldStudies';
import { localityCoords } from '../../geo/india';
import { onScroll } from '../../interaction/scroll';
import { useSectionProgress } from '../../interaction/sectionProgress';
import { scrollToTarget, getLenis } from '../../motion/SmoothScroll';
import { ScrollTrigger } from '../../motion/gsap';
import { useReducedMotion } from '../../motion/preferences';
import { excuseFrames } from '../../world/quality';
import { photoSources } from '../../utils/photo';
import { cn } from '../../utils/cn';
import { STATUS_INFO } from '../../data/statusInfo';
import { enterStudy, preloadStudyPage, releaseOnArrival, takeReturn } from './fieldNav';
import { useFieldStage } from './useFieldStage';
import { habitatBand } from './studyFacts';
import { PLATE_FOOTAGE } from '../../content/footage';
import { ADAPTATIONS, ADAPTATION_SOURCE, ENCOUNTER_STUDY, SPECIMEN_URL } from '../../content/encounter';
import { FocusText } from '../cinema/FocusText';
import { LivingPlate } from './LivingPlate';
import { Encounter } from './Encounter';
import { StudyReading } from './StudyReading';
import { SECTIONS, sectionId, type SectionId } from '../../content/speciesReading';

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
 * Each study's screen of scroll reads in three beats (`phase`): the world and
 * the name; then the field notes (the scientific name, the record's summary)
 * and, where wild footage of the animal exists, its living plate opening out
 * of the world (LivingPlate.tsx); then the plate's credit and, for the snow
 * leopard, the way into the flagship encounter (Encounter.tsx).
 *
 * Then the study is read (StudyReading.tsx, phase 3): its article rises in the page's own flow over the held
 * world, at the reader's pace, in three movements — Encounter; Discover (adaptation beside the field note);
 * Protect (threat beside conservation, closing on the reflection) — while the name steps back, a veil of the world's own dark settles behind the column, and the camera leans slowly in (the
 * same lean the hand gives it; never with reduced motion). The list marks the movement being read, and each is a
 * link. The river's reading goes under the surface: a turbid, silt-laden depth rises over the drawn river as the
 * reader goes down the article. The article's last line carries the reader into the next study's ground, whose
 * world then sweeps in from that direction.
 *
 * With reduced motion the worlds still change, as cuts; nothing travels.
 * Without WebGL each composition stands over its photograph instead.
 */

/** How long a study's world is held, name first, before its reading rises: in screens. */
const ARRIVAL = 0.8;
export function FieldStudiesIndex() {
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dawnRef = useRef<HTMLSpanElement>(null);
  // On the small dawn element only: a value written on the section would restyle the whole stage every frame.
  useSectionProgress(dawnRef, { settle: false, enterOnly: true });
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const location = useLocation();
  // Back from a study, or sent here by the header's "Field studies" (/#field-studies): open at the index.
  const [returning] = useState(() => takeReturn() ?? (location.hash === '#field-studies' ? FIELD_STUDIES[0].id : null));
  const [scrollActive, setScrollActive] = useState(() =>
    Math.max(
      0,
      FIELD_STUDIES.findIndex((f) => f.id === returning),
    ),
  );
  /** The beat within the scrolled study's screen: 0 the name, 1 the field notes and the plate, 2 the credit and the way on. */
  const [phase, setPhase] = useState(returning ? 1 : 0);
  const [encounter, setEncounter] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [near, setNear] = useState(Boolean(returning));
  /** Back from a study, the world is held over the page until the route settles; the index's words and scrim wait for it. */
  const [held, setHeld] = useState(false);
  /** The movement of the scrolled study's reading the reader is at: -1 before it begins. */
  const [beat, setBeat] = useState(-1);
  const { stage, status } = useFieldStage(hostRef, near);
  const active = FIELD_STUDIES.find((f) => f.id === hoverId) ?? FIELD_STUDIES[scrollActive];
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const readRefs = useRef<Array<HTMLElement | null>>([]);
  const railRef = useRef<HTMLSpanElement>(null);
  // One ref setter per article for the section's life: a new callback each render would defeat StudyReading's memo.
  const [readRefSetters] = useState(() => FIELD_STUDIES.map((_, i) => (el: HTMLElement | null) => void (readRefs.current[i] = el)));
  const depthRef = useRef<HTMLSpanElement>(null);
  /** How far through its reading the scrolled study is, 0 → 1; the camera's lean follows it (applyEngage). */
  const readRef = useRef(0);
  const handRef = useRef(false);
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  /** The hand engages the world fully; reading leans the camera in slowly, as far as two-thirds of that. */
  const applyEngage = () => {
    const st = stageRef.current;
    if (!st || leavingRef.current) return;
    const r = reducedRef.current ? 0 : readRef.current;
    const lean = r * r * (3 - 2 * r) * 0.66;
    st.set({ engage: handRef.current ? 1 : lean, progress: 0, drag: 0 });
  };

  /** The top of a study's arrival on the page. */
  const studyTop = (i: number) => {
    const panel = panelRefs.current[i];
    return panel ? panel.getBoundingClientRect().top + window.scrollY : 0;
  };

  // Start loading the stage a screen or two before the section arrives.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '150% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // Which study the scroll has reached, which beat of it, and how far through its reading. Each study holds its
  // arrival (ARRIVAL screens), then its article; the positions are measured, not assumed, since the articles'
  // heights follow their text.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let tops: number[] = [];
    let reads: Array<{ top: number; end: number; beats: number[] }> = [];
    let last = -1;
    let lastPhase = -1;
    let lastBeat = -2;
    let leaving = false;
    let sectionEnd = 0;
    const abs = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : 0);
    const measure = () => {
      sectionEnd = abs(section) + section.offsetHeight;
      tops = FIELD_STUDIES.map((_, i) => abs(panelRefs.current[i]));
      reads = FIELD_STUDIES.map((_, i) => {
        const a = readRefs.current[i];
        if (!a) return { top: Infinity, end: Infinity, beats: [] };
        const top = abs(a);
        return {
          top,
          end: top + a.offsetHeight,
          beats: [...a.querySelectorAll('.fs-sec')].map(abs),
        };
      });
    };
    const update = () => {
      const H = window.innerHeight;
      const y = window.scrollY;
      let i = 0;
      while (i < tops.length - 1 && tops[i + 1] <= y + H * 0.5) i++;
      // A study, a phase or a movement changing re-renders the index and starts its reveals; the section's last screen
      // is where the next chapter builds its canvases under the still-visible world. Neither moment is a measure of
      // whether the world can be held, so the stage's governor does not judge it (world/quality.ts).
      const exiting = y + H * 1.5 > sectionEnd && y < sectionEnd;
      if (exiting !== leaving) {
        leaving = exiting;
        if (exiting) excuseFrames(1200);
      }
      if (i !== last) {
        excuseFrames(700);
        setScrollActive((last = i));
      }
      // Where in its arrival the study is: 0 as it comes, 0.5 held (where a jump to it lands); its reading begins
      // once the article's head has risen two-fifths of the way up the screen.
      const p = (y - tops[i]) / H + 0.5;
      const r = reads[i];
      const reading = r && r.top <= y + H * 0.62;
      // Read, its bridge gone up the screen: the world alone a moment, no name and no veil, before the next turns in.
      const after = r && r.end <= y + H * 0.2;
      const ph = after ? 4 : reading ? 3 : p < 0.34 ? 0 : p < 0.56 ? 1 : 2;
      if (ph !== lastPhase) {
        excuseFrames(700);
        setPhase((lastPhase = ph));
      }
      let b = -1;
      if (r) while (b < r.beats.length - 1 && r.beats[b + 1] <= y + H * 0.55) b++;
      if (b !== lastBeat) setBeat((lastBeat = b));
      const read = r && r.end > r.top ? Math.min(1, Math.max(0, (y + H * 0.5 - r.top) / (r.end - r.top))) : 0;
      if (Math.abs(read - readRef.current) > 0.002 || (read === 0) !== (readRef.current === 0)) {
        readRef.current = read;
        railRef.current?.style.setProperty('transform', `scaleY(${read.toFixed(4)})`);
        applyEngage();
      }
      // The river's depth: the surface rises out of the frame as the reader goes down its article.
      const depth = depthRef.current;
      if (depth) {
        // With reduced motion the depth is a still: under the surface at once, nothing travelling with the scroll.
        const d = FIELD_STUDIES[i].id === 'ganges-river-dolphin' && reading ? (reducedRef.current ? 0.5 : read) : 0;
        depth.style.opacity = String(Math.min(1, d * 4));
        depth.style.setProperty('--surface', `${(-d * 55).toFixed(2)}%`);
      }
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
    // applyEngage reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The reading's beats come in as small groups when they reach the eye, once each, and never hold text back:
  // the reveal is short and starts while the beat is still low on the screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reduced || !('IntersectionObserver' in window)) return;
    section.dataset.reveal = '';
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = '';
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    section.querySelectorAll('.fs-beat, .fs-read-head, .fs-sec-head').forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      delete section.dataset.reveal;
    };
  }, [reduced]);

  // Under the survey plate's last screen (GroundsPlate): the section starts a screen early, and while it is still
  // coming up the stage is held at the top of the screen, so the Thar is already whole when the plate dissolves into
  // it instead of sliding up from below. Kept on the scroll event and on ScrollTrigger's update (which Lenis calls as
  // it moves the page), so the box the field stage reads for its layer agrees with the scroll in either order.
  useEffect(() => {
    const section = sectionRef.current;
    const host = hostRef.current;
    if (!section || !host) return;
    let top = 0;
    let last = 0;
    const update = () => {
      const under = section.previousElementSibling?.matches('.grounds.is-pinned') ?? false;
      const at = top - window.scrollY;
      const lift = under && at > 0 && at < window.innerHeight ? at : 0;
      if (lift === last) return;
      last = lift;
      host.style.transform = lift ? `translate3d(0, ${(-lift).toFixed(1)}px, 0)` : '';
    };
    const measure = () => {
      top = section.getBoundingClientRect().top + window.scrollY;
      update();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    const off = onScroll(update);
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'top top',
      onUpdate: update,
    });
    return () => {
      ro.disconnect();
      off();
      st.kill();
      host.style.transform = '';
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
      const y = studyTop(i);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    };
    jump();
    const raf = requestAnimationFrame(jump);
    // studyTop reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    handRef.current = Boolean(engaged || hoverId);
    applyEngage();
    // applyEngage reads refs, kept current above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, engaged, hoverId, leaving, reduced]);

  // Arrived back from a study: give the screen back once the page is in place.
  useEffect(() => {
    if (!stage || !returning) return;
    if (stage.layerMode !== 'front') return;
    setHeld(true);
    return releaseOnArrival(() => {
      stage.release();
      setHeld(false);
    }, 900);
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
  // Stable, so the memoised compositions and articles are not re-rendered by every beat the scroll crosses.
  const goRef = useRef(go);
  goRef.current = go;
  const enterById = useCallback((id: string) => {
    const f = FIELD_STUDIES.find((x) => x.id === id);
    if (f) goRef.current(f);
  }, []);
  const openEncounter = useCallback(() => setEncounter(true), []);

  const jumpTo = (i: number) => scrollToTarget(studyTop(i));

  /** A movement of the scrolled study's reading, its head a little below the top of the screen. */
  const jumpToSection = (study: string, sec: SectionId) => {
    const el = document.getElementById(sectionId(study, sec));
    if (el) scrollToTarget(el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.18);
  };
  // Hovering the list while reading previews a world under the text, never a name over it: the reading holds.
  const reading = phase === 3;
  /** Read or past it: the compositions stay down. */
  const read = phase >= 3;

  return (
    <section
      ref={sectionRef}
      id="field-studies"
      className={cn('fs-index', leaving && 'is-leaving')}
      style={{ ['--n' as string]: FIELD_STUDIES.length } as CSSProperties}
      aria-labelledby="fs-index-title"
      data-status={status}
      data-held={held || undefined}
      data-reading={reading || undefined}
    >
      <a
        className="fs-skip"
        href="#selection-chapter"
        onClick={(e) => {
          const to = document.getElementById('selection-chapter') ?? sectionRef.current?.nextElementSibling;
          if (!(to instanceof HTMLElement)) return;
          e.preventDefault();
          // A skip jumps, as a return from a study does: gliding thirty screens would play every world on the way.
          const jump = () => {
            const y = to.getBoundingClientRect().top + window.scrollY;
            const lenis = getLenis();
            if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
          };
          jump();
          requestAnimationFrame(jump);
          to.setAttribute('tabindex', '-1');
          to.focus({ preventScroll: true });
        }}
      >
        Skip the field studies
      </a>
      {/* Chapter 02's warm foot, continued under the world's feathered edge so the two grounds meet without a dark seam. */}
      <span ref={dawnRef} className="fs-dawn" aria-hidden="true" />
      <div
        ref={hostRef}
        className="fs-index-stage"
        data-study={active.id}
        data-tone={studyTone(active.id)}
        data-encounter={encounter || undefined}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return;
          setEngaged(true);
          preloadStudyPage();
        }}
        onPointerLeave={() => setEngaged(false)}
      >
        {status !== 'ready' && <FlatGround study={active} />}
        <span className="fs-scrim" aria-hidden="true" />
        {/* Behind the reading column: the world's own dark, deepening as the article rises. */}
        <span className="fs-veil" aria-hidden="true" />
        {/* The river read from under its surface: turbid water and drifting silt (a drawing, not footage). */}
        <span ref={depthRef} className="fs-depth" aria-hidden="true" style={{ opacity: 0 }}>
          <span className="fs-depth-water" />
          <span className="fs-depth-silt" />
        </span>

        <header className="fs-index-head">
          <h2 id="fs-index-title" className="fs-kicker">
            Featured field studies
          </h2>
          <p className="fs-index-count tabular-nums" aria-hidden="true">
            {active.n} <span>/ {String(FIELD_STUDIES.length).padStart(2, '0')}</span>
          </p>
        </header>

        {FIELD_STUDIES.map((f, i) => (
          <Composition
            key={f.id}
            study={f}
            active={f.id === active.id && !held}
            // The beats follow the scroll's study; a study previewed from the list shows its name only.
            phase={i === scrollActive && f.id === active.id ? phase : 0}
            reading={read}
            current={i === scrollActive && near}
            entering={leaving === f.id}
            onEnter={enterById}
            onEncounter={openEncounter}
          />
        ))}

        {encounter && (
          <Encounter
            study={FIELD_STUDIES.find((f) => f.id === ENCOUNTER_STUDY)!}
            footage={PLATE_FOOTAGE[ENCOUNTER_STUDY]}
            onClose={() => setEncounter(false)}
            onEnterStudy={() => {
              setEncounter(false);
              go(FIELD_STUDIES.find((f) => f.id === ENCOUNTER_STUDY)!);
            }}
          />
        )}

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
                {/* The study being read: its movements, the one being read marked, each a way to it. */}
                {i === scrollActive && (
                  <div className={cn('fs-list-beats', read && 'is-reading')}>
                    <span className="fs-list-rail" aria-hidden="true">
                      <span ref={railRef} className="fs-list-rail-fill" style={{ transform: `scaleY(${readRef.current})` }} />
                    </span>
                    <ol aria-label={`Reading ${f.species.commonName}`}>
                      {SECTIONS.map((b, j) => (
                        <li key={b.id}>
                          <a
                            href={`#${sectionId(f.id, b.id)}`}
                            aria-current={read && j === beat ? 'step' : undefined}
                            className={cn(read && j === beat && 'is-current', read && j < beat && 'is-read')}
                            onClick={(e) => {
                              e.preventDefault();
                              jumpToSection(f.id, b.id);
                            }}
                          >
                            {b.label}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="fs-index-runway" style={{ ['--arrival' as string]: ARRIVAL } as CSSProperties}>
        {FIELD_STUDIES.map((f, i) => (
          <div key={f.id} className="fs-index-stretch" data-study={f.id} data-env={f.env} data-reading={(i === scrollActive && read) || undefined}>
            <div ref={(el) => void (panelRefs.current[i] = el)} className="fs-index-panel" data-route-stop={i} aria-hidden="true" />
            <StudyReading ref={readRefSetters[i]} study={f} onEnter={enterById} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Each study's own arrangement of the same few facts. */
const Composition = memo(function Composition({
  study,
  active,
  phase,
  reading,
  current,
  entering,
  onEnter,
  onEncounter,
}: {
  study: FieldStudy;
  active: boolean;
  phase: number;
  /** Its article is being read: the composition steps back. */
  reading: boolean;
  /** The study the scroll is on (its plate's clip is loaded). */
  current: boolean;
  entering: boolean;
  onEnter: (id: string) => void;
  onEncounter: () => void;
}) {
  const s = study.species;
  const anchor = s.distributionPoints[0];
  const status = STATUS_INFO[s.status];
  const band = study.id === 'snow-leopard' ? habitatBand(s) : null;
  const plate = PLATE_FOOTAGE[study.id];
  const notes = active && phase >= 1;
  const tail = study.id === ENCOUNTER_STUDY ? ADAPTATIONS.find((a) => a.id === 'tail') : undefined;
  return (
    <div
      className={cn('fs-comp', `fs-comp--${study.n}`, active && 'is-active', entering && 'is-entering')}
      aria-hidden={!active}
      data-phase={active ? phase : 0}
      data-reading={reading || undefined}
    >
      <p className="fs-comp-n tabular-nums">
        <span className="fs-comp-n-label">Field study {study.n}</span>
        <FocusText className="fs-comp-sci" text={s.scientificName} sci play={notes} />
      </p>
      {plate && (
        <LivingPlate
          footage={plate}
          study={study.id}
          shown={notes && !reading && !entering}
          current={current}
          focusable={notes && !reading}
        >
          {tail && (
            <span className="fs-plate-adapt">
              <span className="fs-plate-k">{tail.part}</span> “{tail.quote}”{' '}
              <span className="fs-plate-src">{ADAPTATION_SOURCE.label.split(',')[0]}</span>
            </span>
          )}
          {study.id === ENCOUNTER_STUDY && (
            <button type="button" className="fs-encounter" tabIndex={notes && !reading ? 0 : -1} data-cursor="Open" onClick={onEncounter}>
              <span className="fs-verb-rule" aria-hidden="true" />
              Encounter
              <span className="fs-encounter-sub">Footage · adaptations{SPECIMEN_URL ? ' · specimen' : ''}</span>
              <svg viewBox="0 0 16 8" aria-hidden="true">
                <path d="M0 4h14M11 1l3 3-3 3" />
              </svg>
            </button>
          )}
        </LivingPlate>
      )}
      <p className="fs-comp-note">
        <span className="fs-comp-note-k">From the record</span>
        {s.summary}
      </p>
      {/* The study's heading is its article's (StudyReading); this is the world's title and the way in. */}
      <p className="fs-comp-name">
        <Link
          to={`/field/${study.id}`}
          data-transition="none"
          data-cursor="Enter"
          tabIndex={active && !reading ? 0 : -1}
          onClick={(e) => {
            e.preventDefault();
            onEnter(study.id);
          }}
        >
          {s.commonName.split(' ').map((w, i) => (
            <span key={i} className="fs-word" style={{ ['--i' as string]: i } as CSSProperties}>
              <span>{w}</span>
            </span>
          ))}
          <span className="sr-only">. Enter the field study.</span>
        </Link>
      </p>
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
          <dd className="tabular-nums">{localityCoords(anchor)}</dd>
        </div>
        {band && (
          <div>
            <dt>Habitat band</dt>
            <dd className="tabular-nums">{band}</dd>
          </div>
        )}
      </dl>
      {/* The verb is also the visible way in (the name is the keyboard's; this one is for the eye and the hand). */}
      <button type="button" className="fs-comp-verb" aria-hidden="true" tabIndex={-1} data-cursor="Enter" onClick={() => onEnter(study.id)}>
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
});

/** Without WebGL: the study's photograph, set in its ground, stands in for its world. */
export function FlatGround({ study }: { study: FieldStudy }) {
  const photo = photoSources(study.species);
  return (
    <div className="fs-flat" data-study={study.id} aria-hidden="true">
      {photo && <img key={study.id} src={photo.small} alt="" className="fs-flat-img" decoding="async" />}
    </div>
  );
}

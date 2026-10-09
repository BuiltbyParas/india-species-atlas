import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nextStudy as nextOf, STUDY_BY_ID, type FieldStudy } from '../content/fieldStudies';
import { formatDeg } from '../geo/india';
import { onScroll } from '../interaction/scroll';
import { useOpenMedia } from '../interaction/media';
import { scrollToTarget } from '../motion/SmoothScroll';
import { useReducedMotion } from '../motion/preferences';
import { cn } from '../utils/cn';
import { useFieldStage } from '../components/field/useFieldStage';
import { exitStudy, nextStudy, releaseOnArrival } from '../components/field/fieldNav';
import { FlatGround } from '../components/field/FieldStudiesIndex';
import { StudyProgress } from '../components/field/StudyProgress';
import { StudyChapters, StudyInstrument } from '../components/field/chapters';
import { NotFoundPage } from './NotFoundPage';

/**
 * A field study: one species' world, entered.
 *
 * The world holds the screen (the field stage, painted behind this page's
 * pinned frame) and the scroll drives it — camera, light, line, photograph,
 * data — through the study's chapters. Each chapter is a block of the page
 * the reader scrolls through; its words hold beside the world while its
 * moment plays, then move on. Nothing is hidden behind the motion: every
 * chapter's text is in the page, in order, for a screen reader, a keyboard
 * or a reader who simply scrolls fast.
 *
 * The frame's furniture is shared by all five studies: the study's number
 * and verb, its chapter in the running progress (a GeoLine with a tick per
 * chapter, which is also a way to jump), the anchor's coordinates, and the
 * way back. Esc goes back too. The last chapter offers the next study, which
 * the world turns into without leaving the screen.
 *
 * Reduced motion: the scroll still moves through the chapters, but each one
 * is a composition the world cuts to, not a camera move. No WebGL: the
 * study's photograph stands in its ground, and every chapter reads the same.
 */
export function FieldStudyPage() {
  const { id = '' } = useParams();
  const study = STUDY_BY_ID[id];
  if (!study) return <NotFoundPage />;
  return <Study key={study.id} study={study} />;
}

function Study({ study }: { study: FieldStudy }) {
  const articleRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const media = useOpenMedia();
  const { stage, status } = useFieldStage(hostRef);
  const N = study.stages.length;
  const next = nextOf(study.id);
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [arrived, setArrived] = useState(false);
  const anchor = study.species.distributionPoints[0];

  useEffect(() => {
    document.title = `${study.species.commonName} · Field study ${study.n} · India Species Atlas`;
  }, [study]);

  // Arriving: through the index or the previous study, the world is already
  // standing here; opened directly, it comes up from its preview.
  useEffect(() => {
    if (!stage) return;
    const via = stage.showing === study.id && stage.enterValue > 0.98;
    let release: (() => void) | undefined;
    if (via) {
      if (stage.layerMode === 'front') release = releaseOnArrival(() => stage.release());
      setArrived(true);
    } else {
      void stage
        .show(study.id, { cut: true, reset: { progress: 0, enter: 0, engage: 0, drag: 0 } })
        .then(() => {
          setArrived(true);
          return stage.enter(1, reduced ? 0 : 1700);
        });
    }
    return () => release?.();
    // Only on arrival: the stage and study identify it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, study.id]);

  useEffect(() => {
    if (status === 'flat') setArrived(true);
  }, [status]);

  // Scroll → the study's progress, 0 → 1, and the current chapter. Chapters
  // differ in length (a chapter with a map holds longer), so progress is
  // measured chapter by chapter: chapter i spans i/N → (i+1)/N of the world's
  // timeline however tall it is, read at the middle of the screen.
  const chapterBox = useRef<Array<{ top: number; height: number }>>([]);
  const runwayTop = useRef(0);
  useEffect(() => {
    const runway = runwayRef.current;
    if (!runway) return;
    let last = -1;
    const measure = () => {
      runwayTop.current = runway.getBoundingClientRect().top + window.scrollY;
      chapterBox.current = [...runway.children].map((c) => ({
        top: (c as HTMLElement).offsetTop,
        height: Math.max(1, (c as HTMLElement).offsetHeight),
      }));
    };
    const update = () => {
      const boxes = chapterBox.current;
      if (!boxes.length) return;
      const y = window.scrollY - runwayTop.current + window.innerHeight * 0.5;
      let i = 0;
      while (i < boxes.length - 1 && y >= boxes[i + 1].top) i++;
      const local = Math.min(1, Math.max(0, (y - boxes[i].top) / boxes[i].height));
      const p = Math.min(1, (i + local) / N);
      // Reduced motion: each chapter is one composition, held at its middle.
      stage?.set({ progress: reduced ? (i + 0.5) / N : p });
      typeRef.current?.style.setProperty('--p', p.toFixed(4));
      if (i !== last) setCurrent((last = i));
    };
    measure();
    update();
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(runway);
    const off = onScroll(update);
    return () => {
      ro.disconnect();
      off();
    };
  }, [stage, reduced, N]);

  const exit = () => void exitStudy(navigate, study.id, () => setLeaving(true));
  const goNext = () => void nextStudy(navigate, study.id, next.id, () => setLeaving(true));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || media || e.defaultPrevented) return;
      // The menu and the profile sheet take Esc for themselves while they are open.
      const open = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].some((d) =>
        d.checkVisibility ? d.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : d.offsetParent !== null,
      );
      if (open || document.querySelector('.site-header[data-open="true"]')) return;
      exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const jumpTo = (i: number) => {
    const box = chapterBox.current[i];
    if (!box) return;
    scrollToTarget(runwayTop.current + box.top + box.height * 0.5 - window.innerHeight * 0.5);
  };

  const stageLabel = study.stages[current].label;

  return (
    <article
      ref={articleRef}
      className={cn('fs-study', leaving && 'is-leaving', arrived && 'is-arrived')}
      data-study={study.id}
      data-tone={study.id === 'great-indian-bustard' ? 'light' : 'dark'}
      data-env={study.env}
      data-current={current}
      data-status={status}
      style={{ ['--n' as string]: N } as CSSProperties}
      aria-labelledby="fs-title"
    >
      <div ref={hostRef} className="fs-study-stage">
        {status !== 'ready' && <FlatGround study={study} />}
        <span className="fs-scrim" aria-hidden="true" />

        <div ref={typeRef} className="fs-type">
          <p className="fs-type-n tabular-nums">
            Field study {study.n} <span aria-hidden="true">·</span> {study.verb}
          </p>
          <h1 id="fs-title" className="fs-title">
            {study.species.commonName.split(' ').map((w, i) => (
              <span key={i} className="fs-word" style={{ ['--i' as string]: i } as CSSProperties}>
                <span>{w}</span>
              </span>
            ))}
          </h1>
          <p className="fs-type-sci">{study.species.scientificName}</p>
          <p className="fs-type-place" aria-hidden="true">
            {study.place}
          </p>
        </div>

        <StudyInstrument study={study} current={current} stage={stage} />

        <p className="sr-only" aria-live="polite">
          Chapter {current + 1} of {N}: {stageLabel}
        </p>
      </div>

      <div ref={runwayRef} className="fs-runway">
        <StudyChapters study={study} current={current} next={next} onNext={goNext} onExit={exit} />
      </div>

      {/* The frame's furniture sits above the chapters, so a long chapter scrolls under it, not over it. */}
      <div className="fs-hud-layer">
        <div className="fs-hud">
          <StudyProgress study={study} current={current} onJump={jumpTo} />
          <p className="fs-hud-coord tabular-nums" aria-hidden="true">
            <span>{anchor.label.split(',')[0]}</span>
            {formatDeg(anchor.lat, 'lat')} {formatDeg(anchor.lng, 'lng')}
          </p>
          <button type="button" className="fs-exit" onClick={exit} data-cursor="Return" data-magnetic="0.2">
            <span className="fs-exit-rule" aria-hidden="true" />
            Field studies
            <span className="sr-only">: leave the {study.species.commonName} study (Esc)</span>
          </button>
        </div>
      </div>
    </article>
  );
}

import './encounter.css';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { FieldStudy } from '../../content/fieldStudies';
import { footageSources, type PlateFootage } from '../../content/footage';
import { ADAPTATIONS, ADAPTATION_SOURCE, SPECIMEN_CALIBRATION, SPECIMEN_META, SPECIMEN_URL } from '../../content/encounter';
import { STATUS_INFO } from '../../data/statusInfo';
import { lockScroll } from '../../motion/SmoothScroll';
import { useReducedMotion } from '../../motion/preferences';
import { FocusText } from '../cinema/FocusText';
import { cn } from '../../utils/cn';
import type { SpecimenScene } from '../../world/encounter/specimenScene';

/**
 * THE ENCOUNTER: the flagship study, met closer.
 *
 * Opened from the snow leopard's living plate on the index, it takes the index's frame (the drawn Himalaya stays
 * faintly behind it) and holds the page still until it is closed. On the left is the living subject: the wild pair
 * from Spiti, full frame, or — once the museum's scan is installed (content/encounter.ts) — the specimen itself,
 * turned by hand. On the right are the field notes: the record's name and status, and six adaptations quoted from the
 * Snow Leopard Trust, which the specimen turns to when they are pinned on it.
 *
 * A dialog: Escape and the close button end it, Tab stays inside it, and focus goes back where it came from.
 * Without WebGL, or before the scan is installed, it is the footage alone, which needs neither.
 */
type Mode = 'footage' | 'specimen';

let webgl: boolean | null = null;
function canWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    webgl = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

export function Encounter({ study, footage, onClose, onEnterStudy }: { study: FieldStudy; footage: PlateFootage; onClose: () => void; onEnterStudy: () => void }) {
  const reduced = useReducedMotion();
  const s = study.species;
  const status = STATUS_INFO[s.status];
  const specimenAvailable = Boolean(SPECIMEN_URL) && canWebGL();
  const [chosen, setMode] = useState<Mode>('footage');
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<string>('tail');
  const [specimenState, setSpecimenState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  // A specimen that cannot load gives the footage back.
  const mode: Mode = specimenState === 'failed' ? 'footage' : chosen;
  const [pinned, setPinned] = useState<string[]>([]);
  const [playing, setPlaying] = useState(!reduced);
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scene = useRef<SpecimenScene | null>(null);
  const pins = useRef(new Map<string, HTMLElement>());
  // Where focus was when the encounter was asked for (read once, before any effect moves it).
  const [opener] = useState<Element | null>(() => document.activeElement);
  const restoring = useRef(0);

  // Open: hold the page, take focus, play in.
  useLayoutEffect(() => {
    // (A remount in development's strict mode would otherwise have its focus taken back by the first unmount.)
    cancelAnimationFrame(restoring.current);
    lockScroll(true);
    // The page's fixed furniture that would print over the panel (the route map) steps back while it is open.
    document.documentElement.classList.add('has-encounter');
    heading.current?.focus({ preventScroll: true });
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => {
      cancelAnimationFrame(raf);
      lockScroll(false);
      document.documentElement.classList.remove('has-encounter');
      // After the index has taken its frame back (its furniture is hidden under the dialog until then).
      const back = opener as HTMLElement | null;
      restoring.current = requestAnimationFrame(() => {
        if (back?.isConnected) back.focus({ preventScroll: true });
      });
    };
  }, [opener]);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    window.setTimeout(onClose, reduced ? 0 : 520);
  };

  // The page's own wheel and touch scrolling stop at the dialog (the page is held; this keeps a trackpad's momentum
  // from leaking through to the index underneath).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const stop = (e: Event) => {
      if ((e.target as HTMLElement).closest('.enc-panel-scroll')) return;
      e.preventDefault();
    };
    el.addEventListener('wheel', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => {
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, []);

  // The footage plays while it is the subject (and is wanted); it is paused, not removed, behind the specimen.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (mode === 'footage' && playing && open) {
      v.play().catch(() => setPlaying(false));
    } else v.pause();
  }, [mode, playing, open]);

  // The specimen: its viewer is built when chosen and disposed when left or closed.
  useEffect(() => {
    if (mode !== 'specimen' || !SPECIMEN_URL) return;
    const host = viewer.current;
    if (!host) return;
    let live = true;
    setSpecimenState('loading');
    void import('../../world/encounter/specimenScene')
      .then(({ createSpecimenScene }) => {
        if (!live) return;
        const narrow = window.matchMedia('(max-width: 900px)').matches;
        scene.current = createSpecimenScene(host, {
          url: SPECIMEN_URL!,
          calibration: SPECIMEN_CALIBRATION,
          reduced,
          centreX: narrow ? 0.5 : 0.36,
          anchorEl: (id) => pins.current.get(id) ?? null,
          onState: (st) => {
            if (!live) return;
            setSpecimenState(st);
            if (st === 'ready') setPinned(scene.current?.pinned ?? []);
          },
        });
      })
      .catch(() => live && setSpecimenState('failed'));
    return () => {
      live = false;
      scene.current?.dispose();
      scene.current = null;
      setPinned([]);
    };
  }, [mode, reduced]);


  const choose = (id: string) => {
    setSelected(id);
    scene.current?.focus(pinned.includes(id) ? id : null);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // Keep Tab inside the dialog.
    const items = [...(root.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? [])].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onViewerKey = (e: ReactKeyboardEvent) => {
    const step = Math.PI / 12;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06] };
    if (map[e.key]) {
      e.preventDefault();
      scene.current?.nudge(...map[e.key]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      scene.current?.reset();
    }
  };

  const note = ADAPTATIONS.find((a) => a.id === selected) ?? ADAPTATIONS[0];

  return (
    <div
      ref={root}
      className={cn('enc', open && 'is-open')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="enc-title"
      data-mode={mode}
      data-specimen={specimenState}
      onKeyDown={onKeyDown}
    >
      <div className="enc-backdrop" aria-hidden="true" onClick={close} />

      <div className="enc-subject">
        <video
          ref={video}
          className="enc-video"
          poster={footage.poster}
          style={{ objectPosition: footage.focus }}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label={`Footage: ${footage.title}`}
          onPlaying={() => setPlaying(true)}
        >
          {footageSources(footage).map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
        {specimenAvailable && (
          <div
            ref={viewer}
            className="enc-viewer"
            tabIndex={mode === 'specimen' ? 0 : -1}
            role="group"
            aria-roledescription="3D viewer"
            aria-label={`${SPECIMEN_META.title}. Drag, or use the arrow keys, to turn it; Home returns to the first view.`}
            aria-hidden={mode !== 'specimen'}
            onKeyDown={onViewerKey}
          >
            {ADAPTATIONS.filter((a) => pinned.includes(a.id)).map((a) => (
              <button
                key={a.id}
                type="button"
                className={cn('enc-pin', a.id === selected && 'is-selected')}
                ref={(el) => {
                  if (el) pins.current.set(a.id, el);
                  else pins.current.delete(a.id);
                }}
                aria-label={`${a.part}: show the note`}
                onClick={() => choose(a.id)}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        {mode === 'footage' && (
          <button type="button" className="enc-play" aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? 'Pause' : 'Play'}
            <span className="sr-only"> footage</span>
          </button>
        )}
        {mode === 'specimen' && specimenState === 'loading' && (
          <p className="enc-loading" role="status">
            Loading the specimen…
          </p>
        )}
      </div>

      <aside className="enc-panel">
        <div className="enc-panel-scroll">
          <p className="enc-k">
            Encounter <span aria-hidden="true">·</span> Field study {study.n}
          </p>
          <h2 id="enc-title" ref={heading} tabIndex={-1} className="enc-title">
            {s.commonName}
          </h2>
          <p className="enc-sci">
            <FocusText text={s.scientificName} sci cut={!reduced} />
          </p>
          <p className="enc-status">
            <span className="fs-dot" style={{ background: status.colorVar }} aria-hidden="true" />
            {status.name} <span className="enc-faint">· IUCN Red List, {s.statusPublishedYear}</span>
          </p>

          {specimenAvailable && (
            <div className="enc-modes" role="radiogroup" aria-label="Show">
              {(['footage', 'specimen'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} className={cn('enc-mode', mode === m && 'is-on')} onClick={() => setMode(m)}>
                  {m === 'footage' ? 'Footage' : 'Specimen'}
                </button>
              ))}
            </div>
          )}

          <p className="enc-what">
            {mode === 'footage' ? (
              <>
                <span className="enc-label">Footage</span> {footage.title}.{' '}
                <a href={footage.sourceUrl} target="_blank" rel="noreferrer">
                  {footage.credit}
                </a>
                ,{' '}
                <a href={footage.licenseUrl} target="_blank" rel="noreferrer">
                  {footage.license}
                </a>
                . {footage.note}
              </>
            ) : (
              <>
                <span className="enc-label">Specimen</span> {SPECIMEN_META.disclosure}{' '}
                <a href={SPECIMEN_META.sourceUrl} target="_blank" rel="noreferrer">
                  {SPECIMEN_META.credit}
                </a>
                ,{' '}
                <a href={SPECIMEN_META.licenseUrl} target="_blank" rel="noreferrer">
                  {SPECIMEN_META.license}
                </a>
                .
              </>
            )}
          </p>

          <h3 className="enc-h">Adaptations</h3>
          <ul className="enc-adapt">
            {ADAPTATIONS.map((a) => (
              <li key={a.id}>
                <button type="button" aria-pressed={a.id === selected} className={cn('enc-part', a.id === selected && 'is-on')} onClick={() => choose(a.id)}>
                  {a.part}
                  {pinned.includes(a.id) && <span className="enc-pinned" aria-label=" (pinned on the specimen)" />}
                </button>
              </li>
            ))}
          </ul>
          <blockquote className="enc-note" aria-live="polite" key={note.id}>
            <p>{note.quote}</p>
          </blockquote>
          <p className="enc-src">
            Quoted from{' '}
            <a href={ADAPTATION_SOURCE.url} target="_blank" rel="noreferrer">
              {ADAPTATION_SOURCE.label}
            </a>
            , read {ADAPTATION_SOURCE.checked}.
          </p>

          <div className="enc-actions">
            {mode === 'specimen' && specimenState === 'ready' && (
              <button type="button" className="enc-action" onClick={() => scene.current?.reset()}>
                Reset view
              </button>
            )}
            <button
              type="button"
              className="enc-action enc-action--go"
              data-cursor="Enter"
              onClick={() => {
                onEnterStudy();
              }}
            >
              Enter the field study
              <svg viewBox="0 0 16 8" aria-hidden="true">
                <path d="M0 4h14M11 1l3 3-3 3" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <button type="button" className="enc-close" onClick={close} aria-label="Close the encounter">
        <span aria-hidden="true">Close</span>
      </button>
    </div>
  );
}

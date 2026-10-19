import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Species } from '../../types';
import { SPECIES } from '../../data/species';
import { STATUS_INFO, THREATENED_ORDER } from '../../data/statusInfo';
import { HABITAT_LABELS } from '../../data/regions';
import { MAP_HEIGHT, MAP_WIDTH } from '../../geo/india';
import { useChapter } from '../../motion/chapters';
import { useInView } from '../../motion/useInView';
import { useReducedMotion, useWideLayout } from '../../motion/preferences';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { onScroll } from '../../interaction/scroll';
import { useSectionProgress } from '../../interaction/sectionProgress';
import { cn } from '../../utils/cn';
import { loadRelief, metresAt } from '../home/heroRelief';
import { DomeGallery, type DomeControl } from './DomeGallery';
import { InkText } from './InkText';
import { InteractiveStat } from './InteractiveStat';
import { SelectionGround } from './SelectionGround';

/**
 * CHAPTER 03 — THE SELECTION: the ground under the dome.
 *
 * The field studies end; the survey's sheet comes back (GroundsPlate's 500 m contours of the same ETOPO grid),
 * and this time everyone is on it. The twelve's indicative localities are set on the sheet species by species,
 * in Red List order — the order of the index and of Chapter 04's strips — fifty-two marks in all. Then the sheet
 * lies back into a ground, and the dome comes up out of it, band by band: the lower band of localities first,
 * then the photographs, then the upper band. The dome is made of the same records the ground is marked with.
 *
 * Once it has risen, the ground answers the dome. The species in front lights its own ground — the contours
 * around each of its localities and the line through them — and the index beside it previews any other's ground
 * under the pointer or focus and turns the dome to it when chosen. Choosing the species in front is played
 * before its profile opens (DomeGallery `commit`). As the chapter leaves, the dome goes back into its ground and
 * the sheet comes up towards the map Chapter 04 opens on.
 *
 * On a wide screen it is one pinned plate. On a phone or a narrow window it is read in the flow, and the same
 * emergence runs as the dome comes up the screen. With reduced motion everything is set and risen from the
 * start, and every interaction still works. Every figure is counted from the dataset; the heights are the
 * elevation grid's, read at the localities.
 */
const rank = (s: Species) => {
  const i = THREATENED_ORDER.indexOf(s.status);
  return i < 0 ? THREATENED_ORDER.length : i;
};
/** Red List order, dataset order within a category (Array.prototype.sort is stable). */
const SELECTION = [...SPECIES].sort((a, b) => rank(a) - rank(b));
const GROUPS = THREATENED_ORDER.map((code) => ({ code, species: SELECTION.filter((s) => s.status === code) })).filter((g) => g.species.length > 0);
const LOCALITIES = SPECIES.reduce((n, s) => n + s.distributionPoints.length, 0);

/** The pinned plate's scroll, as fractions of its run (the run starts while the plate is still coming up). */
const SET_FROM = 0.1;
const SET_TO = 0.34;
const TILT_FROM = 0.38;
const TILT_TO = 0.6;
const RISE_FROM = 0.42;
const RISE_TO = 0.68;
/** From here the index and the dome are in hand. */
const RISEN_AT = 0.5;
/** Where a reader who reaches for the index or the dome early is taken: the plate at rest. */
const HOLD_AT = 0.72;
const EXIT_FROM = 0.87;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

interface Pose {
  set: number;
  tilt: number;
  rise: number;
  exit: number;
  risen: boolean;
}
const AT_REST: Pose = { set: SELECTION.length, tilt: 1, rise: 1, exit: 0, risen: true };

/** The ground under each species' localities, from the elevation grid: [lowest, highest], metres, rounded to 10. */
function useLocalityHeights(): Map<string, [number, number]> | null {
  const [heights, setHeights] = useState<Map<string, [number, number]> | null>(null);
  useEffect(() => {
    let live = true;
    loadRelief()
      .then((grid) => {
        if (!live) return;
        const out = new Map<string, [number, number]>();
        for (const s of SELECTION) {
          const m = s.distributionPoints.map((p) => Math.max(0, Math.round(metresAt(grid, p.lng, p.lat) / 10) * 10));
          out.set(s.id, [Math.min(...m), Math.max(...m)]);
        }
        setHeights(out);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return heights;
}

const metres = (m: number) => m.toLocaleString('en-GB');

export function SelectionChapter() {
  const reduced = useReducedMotion();
  const wide = useWideLayout();
  const pinned = wide && !reduced;
  const ref = useRef<HTMLElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);
  const domeRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const settingRef = useRef<HTMLSpanElement>(null);
  const control = useRef<DomeControl | null>(null);
  const holdY = useRef<number | null>(null);
  const [center, setCenter] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [risen, setRisen] = useState(!pinned);
  /** Past the hold, going on to Chapter 04: the words step back and the dome goes down into its ground. */
  const [leaving, setLeaving] = useState(false);
  const heights = useLocalityHeights();
  useChapter(ref, { index: 3, title: 'The selection' });
  // Only its arrival hairline reads it; the plate writes its own choreography.
  useSectionProgress(ref, { enterOnly: true });
  const inView = useInView(indexRef, { rootMargin: '0px 0px -18% 0px' });
  const shown = pinned ? risen : inView;
  const active = pinned ? risen && !leaving : true;

  // The scroll: where the sheet lies, how many species are set on it, how far the dome has risen.
  useEffect(() => {
    const section = ref.current;
    const box = domeRef.current;
    const ground = groundRef.current;
    if (!section || !box || !ground) return;
    let top = 0;
    let runway = 1;
    let lead = 0;
    let boxTop = 0;
    let vh = 1;
    let bh = 1;
    let raf = 0;
    let lastKey = '';
    let lastSet = -1;
    let lastRisen: boolean | null = null;
    let lastLeaving: boolean | null = null;

    const poseAt = (): Pose => {
      if (reduced) return AT_REST;
      if (pinned) {
        const p = clamp01((window.scrollY - top + lead) / (runway + lead));
        return {
          set: Math.ceil(clamp01((p - SET_FROM) / (SET_TO - SET_FROM)) * SELECTION.length),
          tilt: smooth((p - TILT_FROM) / (TILT_TO - TILT_FROM)),
          rise: clamp01((p - RISE_FROM) / (RISE_TO - RISE_FROM)),
          exit: smooth((p - EXIT_FROM) / (1 - EXIT_FROM)),
          risen: p >= RISEN_AT,
        };
      }
      // In the flow: the same emergence, run as the dome's box comes up the screen.
      const e = clamp01((window.scrollY + vh - boxTop) / (vh * 0.8));
      return {
        set: Math.ceil(clamp01(e / 0.45) * SELECTION.length),
        tilt: smooth((e - 0.2) / 0.5),
        rise: clamp01((e - 0.3) / 0.6),
        exit: 0,
        risen: true,
      };
    };

    const frame = () => {
      raf = 0;
      const pose = poseAt();
      const key = `${pose.set}|${pose.tilt.toFixed(4)}|${pose.rise.toFixed(4)}|${pose.exit.toFixed(4)}`;
      if (key === lastKey) return;
      lastKey = key;
      // Flat and framed in the dome's box; then laid back under the sphere; leaving, lifted a little back towards a map.
      const lie = pose.tilt * (1 - pose.exit * 0.4);
      const angle = 63 * lie;
      // In the flow the box runs on past the sphere into the caption, so the ground lies back less far down it.
      const ty = bh * ((pinned ? 0.2 : 0.06) * lie + 0.03 * pose.exit);
      const scale = 1 + 1.1 * lie;
      ground.style.transform = `translate(-50%, -50%) translate3d(0, ${ty.toFixed(1)}px, 0) perspective(${Math.round(bh * 1.7)}px) rotateX(${angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      // Leaving, the sheet lets go of the species' ground and comes back to the whole country.
      ground.classList.toggle('is-leaving', pose.exit > 0.25);
      if (pose.set !== lastSet) {
        lastSet = pose.set;
        ground.style.setProperty('--set', String(pose.set));
        const node = settingRef.current;
        if (node) {
          const s = SELECTION[Math.max(0, pose.set - 1)];
          node.textContent =
            pose.set === 0
              ? `00 / ${SELECTION.length}`
              : `${String(pose.set).padStart(2, '0')} / ${SELECTION.length} · ${s.commonName} · ${s.distributionPoints.length} localities`;
        }
      }
      // Leaving, the dome goes back into its ground, the upper band first.
      control.current?.rise(pose.rise * (1 - pose.exit * 0.7));
      if (pose.risen !== lastRisen) setRisen((lastRisen = pose.risen));
      const isLeaving = pose.exit > 0.12;
      if (isLeaving !== lastLeaving) setLeaving((lastLeaving = isLeaving));
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const measure = () => {
      vh = window.innerHeight;
      const r = section.getBoundingClientRect();
      top = r.top + window.scrollY;
      runway = Math.max(1, r.height - vh);
      lead = vh * 0.6;
      boxTop = box.getBoundingClientRect().top + window.scrollY;
      bh = box.offsetHeight || vh;
      holdY.current = pinned ? top - lead + HOLD_AT * (runway + lead) : null;
      lastKey = '';
      request();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(box);
    const off = onScroll(request);
    return () => {
      off();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [pinned, reduced]);

  // Reaching for the index or the dome before the plate has risen takes the reader to where it is at rest.
  useEffect(() => {
    const section = ref.current;
    if (!section || !pinned) return;
    const onFocus = (e: FocusEvent) => {
      const target = e.target as Node;
      const inPlay = indexRef.current?.contains(target) || domeRef.current?.contains(target);
      if (inPlay && (!risen || leaving) && holdY.current !== null) scrollToTarget(holdY.current);
    };
    section.addEventListener('focusin', onFocus);
    return () => section.removeEventListener('focusin', onFocus);
  }, [pinned, risen, leaving]);

  const choose = useCallback(
    (i: number) => {
      control.current?.goTo(i);
      if (pinned) {
        if ((!risen || leaving) && holdY.current !== null) scrollToTarget(holdY.current);
        return;
      }
      // In the flow: down to the dome, held where it fills the screen.
      const dome = domeRef.current;
      if (!dome) return;
      const r = dome.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.2 || r.bottom < window.innerHeight * 0.8) {
        scrollToTarget(r.top + window.scrollY + (r.height - window.innerHeight) / 2);
      }
    },
    [pinned, risen, leaving],
  );

  const detail = useCallback(
    (s: Species) => {
      const h = heights?.get(s.id);
      const n = s.distributionPoints.length;
      return (
        <p className="dome-ground">
          <span className="dome-ground-k">On the ground</span>
          <span>{s.habitats.map((x) => HABITAT_LABELS[x]).join(' · ')}</span>
          <span className="tabular-nums">
            {n} {n === 1 ? 'locality' : 'localities'}
            {h && h[1] > 0 ? (h[0] === h[1] ? ` · ground ≈ ${metres(h[0])} m` : ` · ground ≈ ${metres(h[0])}–${metres(h[1])} m`) : ''}
          </span>
        </p>
      );
    },
    [heights],
  );

  const lit = active ? (preview ?? center) : null;

  return (
    // Night after the field studies: the floodplain's light goes out into the canopy (documentation/HOMEPAGE_DARK_JOURNEY.md).
    // Quiet for the route map: its corner is the index's last rows and the dome's controls, and the route has nothing to add here.
    <section
      ref={ref}
      id="selection-chapter"
      data-trail
      data-geo-quiet
      data-ground="canopy"
      data-env="canopy"
      className={cn('selection ground-grain relative', pinned ? 'is-pinned' : 'is-flow', risen && 'is-risen', pinned && leaving && 'is-leaving')}
      aria-labelledby="selection-title"
    >
      {/* Night falls on the floodplain: the canopy's dark rises into the foot of the last world as it leaves, so its light goes
          out rather than ending on a cut. An element, not a pseudo, so the running head reads it as canopy. */}
      <div className="sel-dusk" data-env="canopy" aria-hidden="true" />
      <div className="sel-stage">
        <div className="sel-text">
          {/* The register's running line: what the plate is, in the instrument's hand. */}
          <p className={cn('sel-runhead mo', (pinned || inView) && 'is-shown')} aria-hidden="true">
            <span className="mo-meta">Plate 03</span>
            <span className="sel-runhead-rule mo-rule" />
            <span className="mo-meta tabular-nums">
              {SPECIES.length} species · {GROUPS.length} IUCN categories · {LOCALITIES} indicative localities
            </span>
          </p>
          <div className="selection-lead">
            <p className="plate-label">
              <span className="plate-label-n tabular-nums" aria-hidden="true">
                03
              </span>
              <span className="plate-label-rule" aria-hidden="true" />
              <span className="sr-only">Chapter 03, </span>
              The selection
            </p>
            <h2 id="selection-title" className="selection-title font-serif font-light">
              <InkText text={`All ${SPECIES.length}, in the round.`} focus />
            </h2>
          </div>

          <div className="sel-sheet">
            <p className="selection-body font-serif font-light">
              <InkText text={`First the ground they are recorded on: ${LOCALITIES} indicative localities, set on the survey’s sheet in Red List order.`} focus />
            </p>
            {pinned && (
              <p className="sel-setting" aria-hidden="true">
                <span className="sel-setting-rule" />
                <span ref={settingRef} className="tabular-nums">
                  00 / {SELECTION.length}
                </span>
              </p>
            )}
            <p className="selection-how">
              The dome stands on that ground. Choose a name to turn it; the ground under the species in front is lit.
              The order is the Red List&rsquo;s, most at risk first.
            </p>
          </div>

          <div ref={indexRef} className={cn('sel-index mo', shown && 'is-shown')} onPointerLeave={() => setPreview(null)}>
            <p className="sel-index-head">
              <span>{SPECIES.length} species, by IUCN category</span>
              <span className="tabular-nums">Indicative localities</span>
            </p>
            {GROUPS.map((g, gi) => {
              const first = GROUPS.slice(0, gi).reduce((n, x) => n + x.species.length, 0);
              return (
                <div key={g.code} className="sel-group" style={{ ['--c' as string]: STATUS_INFO[g.code].colorVar } as CSSProperties}>
                  <p className="sel-group-name">
                    <span className="sel-group-slot" aria-hidden="true" style={{ ['--mo-i' as string]: first } as CSSProperties} />
                    {STATUS_INFO[g.code].name}
                    <span className="sel-group-n tabular-nums">{g.species.length}</span>
                  </p>
                  <ol className="sel-list">
                    {g.species.map((s, k) => {
                      const i = first + k;
                      const n = s.distributionPoints.length;
                      return (
                        <li key={s.id} style={{ ['--mo-i' as string]: i } as CSSProperties}>
                          <button
                            type="button"
                            className={cn('sel-row', i === center && 'is-current', i === preview && i !== center && 'is-preview')}
                            aria-current={i === center ? 'true' : undefined}
                            onClick={() => choose(i)}
                            onPointerEnter={(e) => e.pointerType === 'mouse' && setPreview(i)}
                            onFocus={() => setPreview(i)}
                            onBlur={() => setPreview(null)}
                            data-cursor="Turn"
                          >
                            <span className="sel-n tabular-nums" aria-hidden="true">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="sel-name">
                              <span>{s.commonName}</span>
                            </span>
                            <span className="sel-sci">{s.scientificName}</span>
                            <span className="sel-loc tabular-nums">
                              {/* A tally: one stroke per recorded locality, so the column can be read by eye down the page. */}
                              <span className="sel-tally" aria-hidden="true">
                                {s.distributionPoints.map((p) => (
                                  <span key={p.label} />
                                ))}
                              </span>
                              {n}
                              <span className="sr-only"> indicative {n === 1 ? 'locality' : 'localities'}</span>
                            </span>
                            <span className="sr-only">. Turn the gallery to it.</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
            <div className="sel-foot">
              <p className="sel-foot-note">
                Indicative localities: named reserves and landscapes where each is recorded, not range edges. They are the
                marks on the ground and the dome&rsquo;s upper and lower bands.
              </p>
              <InteractiveStat size="md" value={LOCALITIES} label="indicative localities, in all" className="sel-foot-stat" />
            </div>
          </div>
        </div>

        <div
          ref={domeRef}
          className={cn('sel-dome', !active && 'is-waiting')}
          style={{ ['--aspect' as string]: (MAP_WIDTH / MAP_HEIGHT).toFixed(4) } as CSSProperties}
        >
          <DomeGallery
            species={SELECTION}
            control={control}
            onCenter={setCenter}
            detail={detail}
            ground={<SelectionGround species={SELECTION} lit={lit} pan={active} groundRef={groundRef} />}
          />
          <p className="sel-ground-key" aria-hidden="true">
            Ground: contours every 500 m, ETOPO 2022 (NOAA) · marks: the {LOCALITIES} indicative localities · lit: about
            80 km around each locality of the species in front
          </p>
        </div>
      </div>
    </section>
  );
}

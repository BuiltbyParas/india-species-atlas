import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Move3d, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { Species } from '../../types';
import { canRender3D } from '../../utils/canRender3D';
import type { GeoCollection } from '../../utils/geoExtrude';
import { buttonClasses } from '../ui/buttonClasses';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { ProgrammeShape } from './ProgrammeShape';
import { programmeSitesFor, programmeStatesFor, type ProgrammeSite } from './programmeSites';
import type { ConservationScene, SceneSite } from './conservationScene';

/**
 * The opt-in 3D companion to the Conservation map mode.
 *
 * Everything it shows is derived from the same dataset the flat map draws,
 * and everything it claims is deliberately modest: a state is raised a step
 * if a programme in this dataset covers a species that occurs there, and a
 * marker is a plan shape standing at a locality the dataset already holds.
 * The note under the stage says both of those things on screen, because a
 * reader should not have to infer what a height means.
 *
 * If the device cannot render it — no WebGL, reduced motion asked for, a
 * low-end machine, or a frame rate that stays poor after the scene softens
 * itself — `onUnavailable` hands the reader back to the flat map instead.
 */
export function ConservationView({
  results,
  onUnavailable,
}: {
  results: Species[];
  onUnavailable: (reason: 'unsupported' | 'slow') => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ConservationScene | null>(null);
  const { open } = useSpeciesProfile();

  const [geojson, setGeojson] = useState<GeoCollection | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(-1);

  const sites = useMemo<ProgrammeSite[]>(() => programmeSitesFor(results), [results]);
  const raisedStates = useMemo(() => programmeStatesFor(results), [results]);

  // The identity of the set, so a filter change rebuilds the scene and a
  // re-render for any other reason does not.
  const signature = sites.map((s) => `${s.programme.id}:${s.species.id}`).join(',');

  useEffect(() => {
    if (!canRender3D()) onUnavailable('unsupported');
  }, [onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}india-states.geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('geojson unavailable'))))
      .then((data) => {
        if (!cancelled) setGeojson(data as GeoCollection);
      })
      .catch(() => {
        // Without the boundary file there is no landmass to raise, so this
        // view has nothing to say and the flat map does.
        if (!cancelled) onUnavailable('unsupported');
      });
    return () => {
      cancelled = true;
    };
  }, [onUnavailable]);

  useEffect(() => {
    if (!geojson || !sites.length || !canRender3D()) return;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let cancelled = false;
    let scene: ConservationScene | null = null;
    const cleanups: Array<() => void> = [];
    setReady(false);
    setSelected(-1);

    const sceneSites: SceneSite[] = sites.map((site) => ({
      lat: site.lat,
      lng: site.lng,
      sides: site.identity.sides,
      rotation: site.identity.rotation,
      hex: site.identity.hex,
      fanIndex: site.fanIndex,
      fanCount: site.fanCount,
    }));

    import('./conservationScene')
      .then((module) =>
        module.createConservationScene({
          canvas,
          geojson,
          sites: sceneSites,
          raisedStates,
          onSelect: (index) => {
            if (!cancelled) setSelected(index);
          },
          onFirstFrame: () => {
            if (!cancelled) setReady(true);
          },
          onTooSlow: () => {
            if (!cancelled) onUnavailable('slow');
          },
        }),
      )
      .then((instance) => {
        if (cancelled) {
          instance.dispose();
          return;
        }
        scene = instance;
        sceneRef.current = instance;

        const resizeObserver = new ResizeObserver(() => {
          const rect = stage.getBoundingClientRect();
          instance.resize(Math.round(rect.width), Math.round(rect.height));
        });
        resizeObserver.observe(stage);
        cleanups.push(() => resizeObserver.disconnect());
        const rect = stage.getBoundingClientRect();
        instance.resize(Math.round(rect.width), Math.round(rect.height));

        // Idle whenever it is off-screen or the tab is in the background.
        let onScreen = true;
        const sync = () => instance.setActive(onScreen && !document.hidden);
        const visibility = new IntersectionObserver((entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          sync();
        });
        visibility.observe(stage);
        cleanups.push(() => visibility.disconnect());
        document.addEventListener('visibilitychange', sync);
        cleanups.push(() => document.removeEventListener('visibilitychange', sync));

        const lost = () => onUnavailable('slow');
        canvas.addEventListener('webglcontextlost', lost);
        cleanups.push(() => canvas.removeEventListener('webglcontextlost', lost));
      })
      .catch(() => {
        if (!cancelled) onUnavailable('unsupported');
      });

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
      scene?.dispose();
      sceneRef.current = null;
    };
    // `signature` stands in for the contents of `sites`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, signature, raisedStates, onUnavailable]);

  const select = useCallback((index: number) => {
    setSelected(index);
    sceneRef.current?.select(index);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => scene.turn(-1),
      ArrowRight: () => scene.turn(1),
      ArrowUp: () => scene.tilt(1),
      ArrowDown: () => scene.tilt(-1),
      '+': () => scene.zoom(1),
      '=': () => scene.zoom(1),
      '-': () => scene.zoom(-1),
      Home: () => scene.reset(),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const current = selected >= 0 ? sites[selected] : null;

  if (!sites.length) {
    return (
      <div className="grid h-full place-items-center bg-forest-900 p-6 text-center text-sm text-canvas/55">
        <p className="max-w-sm">
          None of the species in the current selection is linked to a conservation programme, so there is
          nothing for this view to raise. Clear a filter, or switch back to the map.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(120%_100%_at_50%_0%,var(--color-forest-900),var(--color-forest-950)_70%)]">
      <div
        ref={stageRef}
        role="group"
        tabIndex={0}
        aria-label="Conservation programmes in three dimensions. Drag to turn the view; arrow keys turn and tilt it; plus and minus zoom."
        onKeyDown={onKeyDown}
        className="relative min-h-0 flex-1 outline-none ring-forest-500/70 transition-shadow focus-visible:ring-2"
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full transition-opacity duration-700"
          style={{ opacity: ready ? 1 : 0 }}
        />

        {!ready && (
          <p className="absolute inset-0 grid place-items-center text-sm text-canvas/45">
            Raising the programme states…
          </p>
        )}

        <div className="absolute right-3 top-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => sceneRef.current?.turn(-1)}
            aria-label="Turn left"
            className={buttonClasses('secondary', 'sm', 'h-8 w-8 rounded-md p-0')}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => sceneRef.current?.turn(1)}
            aria-label="Turn right"
            className={buttonClasses('secondary', 'sm', 'h-8 w-8 rounded-md p-0')}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => sceneRef.current?.zoom(1)}
            aria-label="Zoom in"
            className={buttonClasses('secondary', 'sm', 'h-8 w-8 rounded-md p-0')}
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => sceneRef.current?.zoom(-1)}
            aria-label="Zoom out"
            className={buttonClasses('secondary', 'sm', 'h-8 w-8 rounded-md p-0')}
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              sceneRef.current?.reset();
              select(-1);
            }}
            aria-label="Reset the view"
            className={buttonClasses('secondary', 'sm', 'h-8 w-8 rounded-md p-0')}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="pointer-events-none absolute bottom-3 left-4 hidden items-center gap-1.5 text-[10px] text-forest-300/45 sm:flex">
          <Move3d className="h-3.5 w-3.5" aria-hidden="true" />
          Drag to turn · click a marker for its programme
        </p>

        <p className="pointer-events-none absolute bottom-3 right-4 max-w-[17rem] text-right text-[10px] leading-snug text-forest-300/45">
          The step marks whether a state has a programme in this dataset, not how much. Markers are plan
          shapes, not depictions of species.
        </p>
      </div>

      {/* The caption for whatever is selected. Kept out of the canvas so it
          stays real text: selectable, translatable and crisp at any zoom. */}
      <div
        aria-live="polite"
        className="min-h-[6.5rem] shrink-0 border-t border-forest-800 bg-forest-950/70 px-4 py-3"
      >
        {current ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-serif text-base font-semibold text-canvas">
                <ProgrammeShape identity={current.identity} />
                {current.programme.name}
              </p>
              <p className="mt-0.5 text-xs text-canvas/55">{current.programme.authority}</p>
              <p className="mt-1.5 text-sm text-canvas/75">
                {current.species.commonName}{' '}
                <span className="italic text-canvas/50">({current.species.scientificName})</span> ·{' '}
                <span style={{ color: 'var(--color-forest-300)' }}>{current.label}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => open(current.species.id)}
              className={buttonClasses('primary', 'sm')}
            >
              Open full profile
            </button>
          </div>
        ) : (
          <p className="text-sm text-canvas/55">
            {sites.length} programme site{sites.length === 1 ? '' : 's'} across {raisedStates.size} state
            {raisedStates.size === 1 ? '' : 's'} and union territories. Click a marker to see the programme it
            stands for.
          </p>
        )}
      </div>

      {/* The whole set, for assistive technology and for anyone navigating by
          keyboard who would rather jump than turn. Focusing an entry selects
          its marker, so the two views never disagree. */}
      <ul className="sr-only">
        {sites.map((site, i) => (
          <li key={`${site.programme.id}:${site.species.id}`}>
            <button
              type="button"
              onFocus={() => select(i)}
              onClick={() => open(site.species.id)}
            >
              {site.programme.name} — {site.species.commonName} at {site.label}. Open profile.
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

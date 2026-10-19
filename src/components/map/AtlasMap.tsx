import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvent,
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { ConservationMode, Species } from '../../types';
import { coincidentOffsets, iconForSpecies } from './markerIcons';
import { countSpeciesByState, recordedInDrawnState, densityOpacity, densityStep } from '../../utils/stateCounts';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { formatDeg, localityCoords, loadIndiaGeoJson } from '../../geo/india';
import { threadRuns } from '../../geo/line/paths';
import { hasFinePointer } from '../../motion/preferences';
import { STATUS_INFO } from '../../data/statusInfo';
import { SPECIES } from '../../data/species';
import { PALETTE } from '../../theme';
import { project } from '../../geo/india';
import { getWorld, setWorld, useWorld } from '../../world/worldState';
import { registerAtlasCamera } from '../../world/journeys';
import { cn } from '../../utils/cn';

const INDIA_CENTER: L.LatLngExpression = [22.6, 80.5];
const INDIA_BOUNDS = L.latLngBounds([5.5, 66.5], [37.6, 98.5]);

interface MapPoint {
  species: Species;
  lat: number;
  lng: number;
  label: string;
  note?: string;
  captive?: true;
  withholdCoordinates?: true;
}

const FIT_PADDING: L.PointExpression = [12, 12];

/**
 * Frames the whole country on first paint.
 *
 * A fixed `zoom={4}` suits a wide desktop map and crops India badly on a
 * phone, where the container is both narrower and a different shape. The zoom
 * that fits the country is a property of the container, so it is measured
 * rather than assumed — and `minZoom` is lowered to match, since otherwise the
 * fit would be clamped to a zoom at which the country does not fit.
 *
 * It runs once: re-fitting on every resize would throw away a pan the reader
 * had made, and an on-screen keyboard opening counts as a resize.
 */
function FitIndia() {
  const map = useMap();
  useEffect(() => {
    // The container may still be settling when the lazy chunk mounts, and a
    // zoom measured against the wrong size is worse than none.
    map.invalidateSize();
    const zoom = map.getBoundsZoom(INDIA_BOUNDS, false, L.point(FIT_PADDING));
    map.setMinZoom(Math.min(4, zoom));
    // Back on the map, the reader is where they left it (world/worldState.ts).
    const view = getWorld().atlasView;
    if (view) map.setView([view.lat, view.lng], Math.max(view.zoom, map.getMinZoom()), { animate: false });
    else map.fitBounds(INDIA_BOUNDS, { padding: FIT_PADDING });
  }, [map]);
  return null;
}

/**
 * The map writes where it is looking into the world, in the sheet's own
 * units, so the journey to a species starts from this exact framing and a
 * return to the map lands on it.
 */
function WorldSync() {
  const map = useMap();
  useEffect(() => {
    const write = () => {
      const b = map.getBounds();
      const [x0, y0] = project(b.getWest(), b.getNorth());
      const [x1, y1] = project(b.getEast(), b.getSouth());
      const c = map.getCenter();
      setWorld({
        camera: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0 },
        atlasView: { lat: c.lat, lng: c.lng, zoom: map.getZoom() },
      });
    };
    map.on('moveend', write);
    // The first framing is set before this listens; record it too.
    map.whenReady(() => requestAnimationFrame(write));
    return () => {
      map.off('moveend', write);
    };
  }, [map]);
  return null;
}

/**
 * Leaflet closes a popup on Escape only while the map container itself holds
 * focus; a focused marker (the keyboard route to a popup) never gives it
 * that, so Escape did nothing. Listen on the container instead.
 */
function PopupEscape() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') map.closePopup();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [map]);
  return null;
}

/**
 * The map's camera, lent to the journey: entering a species from here, the
 * map itself first leans in to the chosen locality — the popup folds away
 * and the real map moves — before the journey's sheet takes over from the
 * framing it settles on.
 */
function JourneyCamera() {
  const map = useMap();
  useEffect(() => {
    registerAtlasCamera({
      approach: (lng, lat) =>
        new Promise<void>((resolve) => {
          map.closePopup();
          const zoom = Math.min(Math.max(map.getZoom() + 1.25, 5.5), 7);
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            map.off('moveend', finish);
            resolve();
          };
          map.once('moveend', finish);
          window.setTimeout(finish, 1100);
          map.flyTo([lat, lng], zoom, { duration: 0.8, easeLinearity: 0.35 });
        }),
    });
    return () => registerAtlasCamera(null);
  }, [map]);
  return null;
}

/**
 * When the filters change, the map breathes to the localities that remain —
 * a slow fit, never closer than a region — rather than leaving the reader
 * looking at faded marks. It does not move on first paint, or while a state
 * is selected (the state is then what the reader is looking at).
 */
function Breathe({ points, selectedState }: { points: Array<{ lat: number; lng: number }>; selectedState: string | null }) {
  const map = useMap();
  const first = useRef(true);
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (selectedState || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as L.LatLngTuple));
    map.flyToBounds(bounds.pad(0.35), { maxZoom: 6, duration: 1.2, easeLinearity: 0.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

/**
 * Survey furniture: a metric scale bar, and — on a mouse — the coordinates
 * under the pointer, written straight into the readout rather than through
 * React, since it changes on every move.
 */
function Instruments() {
  const map = useMap();
  const readout = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const scale = L.control.scale({ metric: true, imperial: false, position: 'bottomright', maxWidth: 120 }).addTo(map);
    const el = readout.current;
    const fine = hasFinePointer();
    const onMove = (e: L.LeafletMouseEvent) => {
      if (el) el.textContent = `${formatDeg(e.latlng.lat, 'lat')}  ${formatDeg(e.latlng.lng, 'lng')}`;
    };
    const onOut = () => {
      if (el) el.textContent = '';
    };
    if (fine) {
      map.on('mousemove', onMove);
      map.on('mouseout', onOut);
    }
    return () => {
      scale.remove();
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
    };
  }, [map]);
  return (
    <p
      ref={readout}
      aria-hidden="true"
      className="map-readout pointer-events-none absolute bottom-9 right-2.5 z-(--z-map-ui) empty:hidden"
    />
  );
}

/** Hands every click or tap on the map's own ground to `onTap` (state outlines hand theirs over themselves). */
function GroundTap({ onTap }: { onTap: (e: L.LeafletMouseEvent) => void }) {
  useMapEvent('click', onTap);
  return null;
}

/**
 * Wheel zoom that waits to be asked for, where the map sits in a scrolling page (the home page's working map): the wheel
 * scrolls the page past the map until the reader clicks or focuses it, and the map lets go again when the pointer
 * leaves or focus moves on. A wheel over the sleeping map says so, rather than doing nothing silently.
 */
function WheelOnRequest() {
  const map = useMap();
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const el = map.getContainer();
    let timer = 0;
    const wake = () => {
      map.scrollWheelZoom.enable();
      setHint(false);
    };
    const sleep = () => map.scrollWheelZoom.disable();
    const onWheel = () => {
      if (map.scrollWheelZoom.enabled()) return;
      setHint(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHint(false), 1600);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) sleep();
    };
    map.on('click', wake);
    el.addEventListener('focusin', wake);
    el.addEventListener('focusout', onFocusOut);
    el.addEventListener('mouseleave', sleep);
    el.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.clearTimeout(timer);
      map.off('click', wake);
      el.removeEventListener('focusin', wake);
      el.removeEventListener('focusout', onFocusOut);
      el.removeEventListener('mouseleave', sleep);
      el.removeEventListener('wheel', onWheel);
    };
  }, [map]);
  return (
    <p className={cn('map-wheel-hint pointer-events-none absolute inset-x-0 top-1/2 z-(--z-map-ui) mx-auto w-fit', hint && 'is-on')} aria-hidden="true">
      Click the map to zoom with the wheel
    </p>
  );
}

function ResetView({ onReset }: { onReset: () => void }) {
  const map = useMap();
  return (
    <button
      type="button"
      data-magnetic="0.2"
      onClick={() => {
        map.flyToBounds(INDIA_BOUNDS, { padding: FIT_PADDING });
        onReset();
      }}
      className="absolute right-3 top-3 z-(--z-map-ui) inline-flex min-h-11 items-center rounded-xs border border-canvas/20 bg-forest-950/85 px-3 py-1.5 text-xs text-canvas shadow-lg hover:border-canvas/50 sm:min-h-0"
    >
      Reset to India view
    </button>
  );
}

export function AtlasMap({
  results,
  mode,
  selectedState,
  onSelectState,
  shadeByCount = false,
  showThreads = false,
  wheelZoom = 'always',
}: {
  results: Species[];
  mode: ConservationMode;
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
  /** Shade each state by how many of the selected species occur in it. */
  shadeByCount?: boolean;
  /** Draw each species' thread through its localities. */
  showThreads?: boolean;
  /** `on-request` where the map sits in a scrolling page: the wheel zooms only once the map is clicked or focused. */
  wheelZoom?: 'always' | 'on-request';
}) {
  const { open } = useSpeciesProfile();
  const [statesGeo, setStatesGeo] = useState<GeoJsonObject | null>(null);
  const geoRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The same shared request every map on the site uses, so the file is
    // fetched once per visit rather than once per component.
    loadIndiaGeoJson()
      .then((data) => {
        if (!cancelled) setStatesGeo(data as unknown as GeoJsonObject);
      })
      .catch(() => {
        /* Map still works without the boundary layer. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every locality keeps its marker; the filters decide which are in view.
  // A filtered-out marker fades and shrinks away rather than being removed,
  // so narrowing the atlas reads as the map changing, not being replaced.
  const shown = useMemo(
    () => new Set(results.filter((s) => !selectedState || recordedInDrawnState(s, selectedState)).map((s) => s.id)),
    [results, selectedState],
  );
  const points = useMemo<MapPoint[]>(
    () =>
      SPECIES.flatMap((s) =>
        s.distributionPoints.map((p) => ({
          species: s,
          lat: p.lat,
          lng: p.lng,
          label: p.label,
          note: p.note,
          captive: p.captive,
          withholdCoordinates: p.withholdCoordinates,
        })),
      ),
    [],
  );
  // Localities two species share are set side by side, each with a hairline back to the one true point.
  const offsets = useMemo(() => coincidentOffsets(points), [points]);
  // Built once per mode: a new icon object on every render made Leaflet replace each marker's element.
  const icons = useMemo(
    () => points.map((p, i) => iconForSpecies(p.species, mode, { captive: p.captive, offset: offsets[i] })),
    [points, offsets, mode],
  );
  const inView = useMemo(() => points.filter((p) => shown.has(p.species.id)), [points, shown]);
  const visited = useWorld((w) => w.visited);
  const [hot, setHot] = useState<string | null>(null);
  const markerEls = useRef(new Map<string, L.Marker>());

  /**
   * A click or tap that misses every disc but lands within reach of one opens that marker. The discs stay 20 px;
   * the target grows to a 44 px circle on touch (24 px with a mouse), and is resolved to the nearest disc, so in a
   * crowd one marker's reach never hides another's disc. Returns whether a marker was opened.
   */
  const openNearest = (e: L.LeafletMouseEvent) => {
    const event = e.originalEvent;
    if (!event || typeof event.clientX !== 'number') return false;
    let best: L.Marker | null = null;
    let bestDistance = hasFinePointer() ? 12 : 22;
    for (const marker of markerEls.current.values()) {
      const el = marker.getElement();
      if (!el || el.classList.contains('is-out')) continue;
      const r = el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - event.clientX, r.top + r.height / 2 - event.clientY);
      if (d < bestDistance) {
        best = marker;
        bestDistance = d;
      }
    }
    best?.openPopup();
    return best !== null;
  };
  /** Where the pointer entered the hovered species, for the kin ping's timing. */
  const hotFrom = useRef<[number, number] | null>(null);

  useEffect(() => {
    for (const [key, marker] of markerEls.current) {
      const el = marker.getElement();
      if (!el) continue;
      const id = key.slice(0, key.lastIndexOf('-'));
      const out = !shown.has(id);
      el.classList.toggle('is-out', out);
      el.classList.toggle('is-surveyed', visited.includes(id));
      const kin = hot !== null && hot === id;
      // The species' other localities answer the hovered one in order of
      // distance from it: a survey ping that travels across the country.
      if (kin && hotFrom.current) {
        const at = marker.getLatLng();
        const d = Math.hypot(at.lat - hotFrom.current[0], at.lng - hotFrom.current[1]);
        el.style.setProperty('--kin-delay', `${Math.min(Math.round(d * 28), 520)}ms`);
      }
      el.classList.toggle('is-kin', kin);
      el.classList.toggle('is-quiet', hot !== null && hot !== id && !out);
      if (out) el.setAttribute('tabindex', '-1');
      else el.setAttribute('tabindex', '0');
      // The instrument's grammar on the map: the reticle locks onto a marker,
      // and moving from one marker to another rules the distance between them.
      // Its coordinates are already in the marker's own preview, so the reticle
      // does not repeat them (data-geo-quiet).
      const at = marker.getLatLng();
      el.dataset.geo = `${at.lng},${at.lat}`;
      el.dataset.geoQuiet = '';
      if (out) {
        delete el.dataset.magnetic;
        delete el.dataset.cursor;
      } else {
        el.dataset.magnetic = '0.35';
        el.dataset.cursor = 'Locate';
      }
      el.setAttribute('aria-hidden', out ? 'true' : 'false');
    }
  }, [shown, visited, hot, mode]);

  // The documentary's threads, on the working map: the same chained localities,
  // broken where they are too far apart to join, in each species' status colour.
  const threads = useMemo(
    () =>
      SPECIES.flatMap((s) =>
        threadRuns(s.distributionPoints).map((run, i) => ({
          key: `${s.id}-${i}`,
          id: s.id,
          color: STATUS_INFO[s.status].hex,
          positions: run.map((p) => [p.lat, p.lng] as L.LatLngTuple),
        })),
      ),
    [],
  );

  const counts = useMemo(() => countSpeciesByState(results), [results]);
  const maxCount = useMemo(() => Math.max(0, ...counts.values()), [counts]);

  // Leaflet writes these onto SVG presentation attributes, which do not
  // resolve CSS custom properties — so use literal colours here. Boundaries are
  // the sheet's canvas hairline; a chosen state is outlined in contour copper;
  // the count shading is the same sage as its legend.
  const styleFor = (isSelected: boolean, name?: string) => {
    if (shadeByCount && !isSelected) {
      const n = name ? (counts.get(name) ?? 0) : 0;
      return {
        color: 'rgba(232,225,207,0.28)',
        weight: 0.8,
        fillColor: PALETTE.forest400,
        fillOpacity: densityOpacity(densityStep(n, maxCount)),
      };
    }
    return {
      color: isSelected ? PALETTE.contour : 'rgba(232,225,207,0.28)',
      weight: isSelected ? 2 : 0.8,
      fillColor: isSelected ? PALETTE.contour : PALETTE.canvas,
      fillOpacity: isSelected ? 0.18 : 0.03,
    };
  };

  return (
    <div className="relative h-full w-full" data-cursor-area="Explore">
      <MapContainer
        center={INDIA_CENTER}
        zoom={4}
        minZoom={4}
        maxZoom={9}
        zoomSnap={0.25}
        maxBounds={INDIA_BOUNDS.pad(0.3)}
        className="h-full w-full"
        scrollWheelZoom={wheelZoom === 'always'}
        worldCopyJump={false}
      >
        {/* Esri World Ocean Base (no API key): relief, vegetation and rivers,
            with no national or disputed boundary lines, so the only border on
            the map is the one drawn from india-states.geojson. A CSS filter on
            .leaflet-tile-pane recolours the tiles to match the dark theme. */}
        <TileLayer
          attribution='Basemap &copy; <a href="https://www.esri.com/">Esri</a>, Garmin, GEBCO, NOAA NGDC and other contributors'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={13}
        />

        {statesGeo && (
          <GeoJSON
            // Leaflet styles a layer once, on creation, so the boundary layer
            // is remounted whenever anything it is styled or labelled by
            // changes — the selection, the shading, or the species in view.
            key={`${selectedState ?? 'none'}|${shadeByCount}|${results.map((r) => r.id).join(',')}`}
            ref={geoRef}
            data={statesGeo}
            style={(feature) =>
              styleFor(
                !!feature && feature.properties?.state === selectedState,
                feature?.properties?.state as string | undefined,
              )
            }
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.state as string | undefined;
              if (!name) return;
              const n = counts.get(name) ?? 0;
              layer.on({
                click: (e) => {
                  // A tap just beside a marker is meant for the marker, not for the state under it.
                  if (openNearest(e)) return;
                  onSelectState(name === selectedState ? null : name);
                },
                mouseover: (e) =>
                  (e.target as L.Path).setStyle({
                    fillOpacity: Math.max(0.12, densityOpacity(densityStep(n, maxCount))),
                    weight: 1.4,
                  }),
                mouseout: (e) => (e.target as L.Path).setStyle(styleFor(name === selectedState, name)),
              });
              // The count is given as a number as well as a shade: the shading
              // is a summary, and colour alone is never the value.
              layer.bindTooltip(shadeByCount ? `${name} — ${n} species` : name, {
                sticky: true,
                className: 'region-label',
                opacity: 1,
              });
            }}
          />
        )}

        {showThreads &&
          threads.map((t) => (
            <Polyline
              key={t.key}
              positions={t.positions}
              interactive={false}
              pathOptions={{
                color: t.color,
                // A hovered marker's species line activates; the others step back.
                weight: hot === t.id ? 2.6 : 1.4,
                opacity: !shown.has(t.id) ? 0 : hot === null ? 0.75 : hot === t.id ? 1 : 0.25,
                lineCap: 'round',
                lineJoin: 'round',
                className: 'atlas-thread',
              }}
            />
          ))}

        {points.map((p, i) => (
          <Marker
            key={`${p.species.id}-${i}`}
            ref={(m) => {
              const k = `${p.species.id}-${i}`;
              if (m) markerEls.current.set(k, m);
              else markerEls.current.delete(k);
            }}
            position={[p.lat, p.lng]}
            icon={icons[i]}
            eventHandlers={{
              mouseover: () => {
                hotFrom.current = [p.lat, p.lng];
                setHot(p.species.id);
              },
              mouseout: () => setHot(null),
            }}
            title={`${p.species.commonName} — ${p.label}`}
          >
            {/* The preview: the marker names itself and its place before it is opened. */}
            <Tooltip direction="top" offset={[0, -12]} opacity={1} className="marker-preview">
              <span className="mp-name">{p.species.commonName}</span>
              <span className="mp-meta">
                <span style={{ color: STATUS_INFO[p.species.status].colorVar }}>{p.species.status}</span> ·{' '}
                {localityCoords(p)}
              </span>
              <span className="mp-place">{p.label}</span>
              {p.captive && <span className="mp-place">Breeding centre: captive birds, not a wild population</span>}
            </Tooltip>
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-serif text-lg font-normal tracking-tight text-canvas">{p.species.commonName}</p>
                <p className="text-xs italic text-canvas/60">{p.species.scientificName}</p>
                <p className="mt-1 text-xs text-canvas/70">
                  <span className="font-semibold" style={{ color: 'var(--color-forest-300)' }}>
                    {p.label}
                  </span>
                </p>
                {p.note && <p className="mt-1 text-xs text-canvas/60">{p.note}</p>}
                {mode === 'threats' && (
                  <p className="mt-1.5 text-xs text-canvas/70">
                    Main threats: {p.species.majorThreats.slice(0, 3).join(', ').replaceAll('-', ' ')}
                  </p>
                )}
                {mode === 'conservation' && p.species.conservationProgrammes.length > 0 && (
                  <p className="mt-1.5 text-xs text-canvas/70">
                    Programmes: {p.species.conservationProgrammes.length}
                  </p>
                )}
                {/* The way in: a journey from this marker down to the species' ground. */}
                <Link
                  to={`/species/${p.species.id}`}
                  data-geo={`${p.lng},${p.lat}`}
                  data-geo-kind="marker"
                  data-cursor="Enter"
                  className="mt-2.5 flex w-full items-center justify-between rounded-xs bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink! no-underline hover:bg-parchment"
                >
                  Enter its world <span aria-hidden="true">→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => open(p.species.id)}
                  className="mt-1.5 w-full rounded-xs border border-canvas/25 px-2 py-1.5 text-xs text-canvas/80 hover:border-canvas/60 hover:text-canvas"
                >
                  Quick profile
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        <GroundTap onTap={openNearest} />
        <FitIndia />
        <WorldSync />
        <JourneyCamera />
        <PopupEscape />
        <Breathe points={inView} selectedState={selectedState} />
        <Instruments />
        <ResetView onReset={() => onSelectState(null)} />
        {wheelZoom === 'on-request' && <WheelOnRequest />}
      </MapContainer>

      <p className="pointer-events-none absolute bottom-12 left-1 z-(--z-map-ui) max-w-[70%] sm:max-w-[min(70%,calc(100%-30rem))] bg-forest-950/75 px-2 py-1 text-micro leading-tight text-canvas/70 sm:bottom-1">
        Map locations are simplified educational representations and should not be interpreted as exact
        population boundaries.
      </p>
    </div>
  );
}

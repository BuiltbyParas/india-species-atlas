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
} from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { ConservationMode, Species } from '../../types';
import { iconForSpecies } from './markerIcons';
import { countSpeciesByState, recordedInDrawnState, densityOpacity, densityStep } from '../../utils/stateCounts';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';
import { formatDeg, loadIndiaGeoJson } from '../../geo/india';
import { threadRuns } from '../../geo/line/paths';
import { hasFinePointer } from '../../motion/preferences';
import { STATUS_INFO } from '../../data/statusInfo';
import { SPECIES } from '../../data/species';
import { project } from '../../geo/india';
import { getWorld, setWorld, useWorld } from '../../world/worldState';

const INDIA_CENTER: L.LatLngExpression = [22.6, 80.5];
const INDIA_BOUNDS = L.latLngBounds([5.5, 66.5], [37.6, 98.5]);

interface MapPoint {
  species: Species;
  lat: number;
  lng: number;
  label: string;
  note?: string;
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

function ResetView({ onReset }: { onReset: () => void }) {
  const map = useMap();
  return (
    <button
      type="button"
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
}: {
  results: Species[];
  mode: ConservationMode;
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
  /** Shade each state by how many of the selected species occur in it. */
  shadeByCount?: boolean;
  /** Draw each species' thread through its localities. */
  showThreads?: boolean;
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
        s.distributionPoints.map((p) => ({ species: s, lat: p.lat, lng: p.lng, label: p.label, note: p.note })),
      ),
    [],
  );
  const inView = useMemo(() => points.filter((p) => shown.has(p.species.id)), [points, shown]);
  const visited = useWorld((w) => w.visited);
  const [hot, setHot] = useState<string | null>(null);
  const markerEls = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    for (const [key, marker] of markerEls.current) {
      const el = marker.getElement();
      if (!el) continue;
      const id = key.slice(0, key.lastIndexOf('-'));
      const out = !shown.has(id);
      el.classList.toggle('is-out', out);
      el.classList.toggle('is-surveyed', visited.includes(id));
      el.classList.toggle('is-kin', hot !== null && hot === id);
      el.classList.toggle('is-quiet', hot !== null && hot !== id && !out);
      if (out) el.setAttribute('tabindex', '-1');
      else el.setAttribute('tabindex', '0');
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
  // resolve CSS custom properties — so use literal colours here.
  const styleFor = (isSelected: boolean, name?: string) => {
    if (shadeByCount && !isSelected) {
      const n = name ? (counts.get(name) ?? 0) : 0;
      return {
        color: 'rgba(143,199,170,0.35)',
        weight: 0.8,
        fillColor: '#5aa47e',
        fillOpacity: densityOpacity(densityStep(n, maxCount)),
      };
    }
    return {
      color: isSelected ? '#8fc7aa' : 'rgba(143,199,170,0.35)',
      weight: isSelected ? 2 : 0.8,
      fillColor: isSelected ? '#347d59' : '#5aa47e',
      fillOpacity: isSelected ? 0.28 : 0.06,
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
        scrollWheelZoom
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
                click: () => onSelectState(name === selectedState ? null : name),
                mouseover: (e) =>
                  (e.target as L.Path).setStyle({
                    fillOpacity: Math.max(0.2, densityOpacity(densityStep(n, maxCount))),
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
            icon={iconForSpecies(p.species, mode)}
            eventHandlers={{
              mouseover: () => setHot(p.species.id),
              mouseout: () => setHot(null),
            }}
            title={`${p.species.commonName} — ${p.label}`}
          >
            {/* The preview: the marker names itself and its place before it is opened. */}
            <Tooltip direction="top" offset={[0, -12]} opacity={1} className="marker-preview">
              <span className="mp-name">{p.species.commonName}</span>
              <span className="mp-meta">
                <span style={{ color: STATUS_INFO[p.species.status].colorVar }}>{p.species.status}</span> ·{' '}
                {formatDeg(p.lat, 'lat')} {formatDeg(p.lng, 'lng')}
              </span>
              <span className="mp-place">{p.label}</span>
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

        <FitIndia />
        <WorldSync />
        <Breathe points={inView} selectedState={selectedState} />
        <Instruments />
        <ResetView onReset={() => onSelectState(null)} />
      </MapContainer>

      <p className="pointer-events-none absolute bottom-12 left-1 z-(--z-map-ui) max-w-[70%] bg-forest-950/75 px-2 py-1 text-micro leading-tight text-canvas/55 sm:bottom-1">
        Map locations are simplified educational representations and should not be interpreted as exact
        population boundaries.
      </p>
    </div>
  );
}

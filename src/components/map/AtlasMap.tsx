import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { ConservationMode, Species } from '../../types';
import { iconForSpecies } from './markerIcons';
import { useSpeciesProfile } from '../species/SpeciesProfileProvider';

const INDIA_CENTER: L.LatLngExpression = [22.6, 80.5];
const INDIA_BOUNDS = L.latLngBounds([5.5, 66.5], [36.5, 98.5]);

interface MapPoint {
  species: Species;
  lat: number;
  lng: number;
  label: string;
  note?: string;
}

function ResetView({ onReset }: { onReset: () => void }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => {
        map.flyToBounds(INDIA_BOUNDS, { padding: [20, 20] });
        onReset();
      }}
      className="absolute right-3 top-3 z-[500] rounded-md border border-forest-700 bg-forest-900/90 px-3 py-1.5 text-xs font-medium text-canvas shadow-lg hover:bg-forest-800"
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
}: {
  results: Species[];
  mode: ConservationMode;
  selectedState: string | null;
  onSelectState: (state: string | null) => void;
}) {
  const { open } = useSpeciesProfile();
  const [statesGeo, setStatesGeo] = useState<GeoJsonObject | null>(null);
  const geoRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}india-states.geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('geojson unavailable'))))
      .then((data) => {
        if (!cancelled) setStatesGeo(data);
      })
      .catch(() => {
        /* Map still works without the boundary layer. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const points = useMemo<MapPoint[]>(() => {
    const list: MapPoint[] = [];
    for (const s of results) {
      const relevant = selectedState
        ? s.states.includes(selectedState)
        : true;
      if (!relevant) continue;
      for (const p of s.distributionPoints) {
        list.push({ species: s, lat: p.lat, lng: p.lng, label: p.label, note: p.note });
      }
    }
    return list;
  }, [results, selectedState]);

  // Leaflet writes these onto SVG presentation attributes, which do not
  // resolve CSS custom properties — so use literal colours here.
  const styleFor = (isSelected: boolean) => ({
    color: isSelected ? '#8fc7aa' : 'rgba(143,199,170,0.35)',
    weight: isSelected ? 2 : 0.8,
    fillColor: isSelected ? '#347d59' : '#5aa47e',
    fillOpacity: isSelected ? 0.28 : 0.06,
  });

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={INDIA_CENTER}
        zoom={4}
        minZoom={4}
        maxZoom={9}
        maxBounds={INDIA_BOUNDS.pad(0.3)}
        className="h-full w-full"
        scrollWheelZoom
        worldCopyJump={false}
      >
        {/* OpenStreetMap standard tiles (no API key). A CSS filter on
            .leaflet-tile-pane recolours them to match the dark theme. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {statesGeo && (
          <GeoJSON
            key={selectedState ?? 'none'}
            ref={geoRef}
            data={statesGeo}
            style={(feature) =>
              styleFor(!!feature && feature.properties?.state === selectedState)
            }
            onEachFeature={(feature, layer) => {
              const name = feature.properties?.state as string | undefined;
              if (!name) return;
              layer.on({
                click: () => onSelectState(name === selectedState ? null : name),
                mouseover: (e) => (e.target as L.Path).setStyle({ fillOpacity: 0.2, weight: 1.4 }),
                mouseout: (e) =>
                  (e.target as L.Path).setStyle(styleFor(name === selectedState)),
              });
              layer.bindTooltip(name, { sticky: true, className: 'region-label', opacity: 1 });
            }}
          />
        )}

        {points.map((p, i) => (
          <Marker
            key={`${p.species.id}-${i}`}
            position={[p.lat, p.lng]}
            icon={iconForSpecies(p.species, mode)}
            eventHandlers={{ keydown: () => undefined }}
            title={`${p.species.commonName} — ${p.label}`}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-serif text-base font-semibold text-canvas">{p.species.commonName}</p>
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
                <button
                  type="button"
                  onClick={() => open(p.species.id)}
                  className="mt-2 w-full rounded-md bg-forest-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-forest-500"
                >
                  Open full profile
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        <ResetView onReset={() => onSelectState(null)} />
      </MapContainer>

      <p className="pointer-events-none absolute bottom-1 left-1 z-[500] max-w-[70%] rounded bg-forest-950/70 px-2 py-1 text-[10px] leading-tight text-canvas/55">
        Map locations are simplified educational representations and should not be interpreted as exact
        population boundaries.
      </p>
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { SPECIES } from '../../data/species';
import { STATUS_INFO } from '../../data/statusInfo';
import { THREAT_BY_ID } from '../../data/threats';
import { PROGRAMMES } from '../../data/programmes';
import { formatDeg, MAP_VIEWBOX, project, smoothPath, useIndiaGeo } from '../../geo/india';
import { conservationRegionCount, statesCovered, threatChartData, totalSpecies } from '../../utils/stats';
import { SpeciesMap } from '../cinema/SpeciesMap';
import { NationalMap } from '../cinema/ConservationMap';
import type { Species } from '../../types';
import {
  BEAT,
  CLOSE,
  CONS,
  DOC_SPECIES,
  easeInOut,
  easeOut,
  MAP,
  seg,
  SPECIES_LEN,
  SPECIES_START,
  TITLE,
  window01,
} from './timeline';

/**
 * The documentary, drawn at a fixed 1920×1080 and scaled to fit. Every value
 * below is computed from `t`; there are no CSS transitions and no timers, so
 * the same `t` always draws the same frame.
 */

const LOCALITIES = SPECIES.flatMap((s) => s.distributionPoints.map((p) => ({ s, p })))
  .sort((a, b) => b.p.lat - a.p.lat);

function Layer({ opacity, children, style }: { opacity: number; children: ReactNode; style?: CSSProperties }) {
  if (opacity <= 0.001) return null;
  return (
    <div className="absolute inset-0" style={{ opacity, ...style }}>
      {children}
    </div>
  );
}

/** A line of type that rises into place over [a, a+0.9]. */
function Rise({ t, a, children, className, style }: { t: number; a: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  const k = easeOut(seg(t, a, a + 1.1));
  return (
    <div className={className} style={{ overflow: 'hidden', ...style }}>
      <div style={{ transform: `translateY(${((1 - k) * 105).toFixed(2)}%)`, opacity: k }}>{children}</div>
    </div>
  );
}

function Country({ draw = 1, className = 'doc-country' }: { draw?: number; className?: string }) {
  const geo = useIndiaGeo();
  return (
    <svg viewBox={MAP_VIEWBOX} className="h-full w-full overflow-visible">
      {geo?.states.map((s, i) => {
        const k = seg(draw, (i / geo.states.length) * 0.5, (i / geo.states.length) * 0.5 + 0.5);
        return <path key={s.name} d={s.d} pathLength={1} className={className} style={{ strokeDashoffset: 1 - k }} />;
      })}
    </svg>
  );
}

function TitleScene({ t }: { t: number }) {
  const geo = useIndiaGeo();
  const ext = geo?.extent;
  const rule = easeInOut(seg(t, 0.4, 3));
  const out = 1 - easeInOut(seg(t, TITLE.end - 1.2, TITLE.end));
  return (
    <Layer opacity={out}>
      <div className="absolute left-0 top-[380px] h-px bg-canvas/40" style={{ width: `${rule * 100}%`, opacity: 1 - seg(t, 7, 9) }} />
      {ext && (
        <>
          <p className="doc-coord absolute left-[80px] top-[396px]" style={{ opacity: seg(t, 2, 3) * (1 - seg(t, 7, 9)) }}>
            {formatDeg(ext.minLng, 'lng')}
          </p>
          <p className="doc-coord absolute right-[80px] top-[396px]" style={{ opacity: seg(t, 2.3, 3.3) * (1 - seg(t, 7, 9)) }}>
            {formatDeg(ext.maxLng, 'lng')}
          </p>
        </>
      )}
      <div className="absolute right-[110px] top-[120px] h-[840px] w-[760px]">
        <Country draw={seg(t, 2.4, 9)} />
      </div>
      <div className="absolute bottom-[130px] left-[120px]">
        <Rise t={t} a={4}>
          <p className="font-serif text-[150px] font-light leading-[0.86] tracking-[-0.045em] text-canvas">India Species</p>
        </Rise>
        <Rise t={t} a={4.35}>
          <p className="font-serif text-[150px] font-light leading-[0.86] tracking-[-0.045em] text-canvas">Atlas</p>
        </Rise>
        <Rise t={t} a={6.2} className="mt-10">
          <p className="font-serif text-[40px] font-light text-canvas/85">Mapping endangered species.</p>
        </Rise>
        <Rise t={t} a={6.7}>
          <p className="font-serif text-[40px] font-light text-canvas/60">Tracing the lines that shape survival.</p>
        </Rise>
      </div>
    </Layer>
  );
}

function MapScene({ t }: { t: number }) {
  const u = t - MAP.start;
  const fade = window01(t, MAP.start, MAP.end, 1, 1.2);
  const captions = [
    { a: 1.5, b: 9, title: 'Start with the country.', body: 'Every map here is drawn from one file of state boundaries.' },
    { a: 9, b: 17, title: `${LOCALITIES.length} places.`, body: `Indicative localities for ${totalSpecies} species, coloured by IUCN category. Not range boundaries.` },
    { a: 17, b: 24, title: `${conservationRegionCount} regions, ${statesCovered().length} states.`, body: 'Chosen for spread across the country, not for number.' },
    { a: 24, b: 28.5, title: 'Now, one species at a time.', body: '' },
  ];
  return (
    <Layer opacity={fade}>
      <div className="absolute right-[160px] top-[70px] h-[940px] w-[850px]">
        <svg viewBox={MAP_VIEWBOX} className="h-full w-full overflow-visible">
          <Country draw={1} className="doc-country is-drawn" />
          {LOCALITIES.map(({ s, p }, i) => {
            const at = 5 + (i / LOCALITIES.length) * 12;
            const k = easeOut(seg(u, at, at + 0.9));
            if (k <= 0) return null;
            const [x, y] = project(p.lng, p.lat);
            return (
              <g key={`${s.id}-${i}`} opacity={k}>
                <circle cx={x} cy={y} r={5} fill={STATUS_INFO[s.status].hex} />
                <circle cx={x} cy={y} r={5 + (1 - k) * 22} fill="none" stroke={STATUS_INFO[s.status].hex} strokeOpacity={(1 - k) * 0.8} />
              </g>
            );
          })}
        </svg>
      </div>
      {captions.map((c) => {
        const o = window01(u, c.a, c.b, 0.9, 0.9);
        if (o <= 0) return null;
        return (
          <div key={c.title} className="absolute left-[120px] top-[400px] w-[700px]" style={{ opacity: o, transform: `translateY(${((1 - easeOut(seg(u, c.a, c.a + 1.2))) * 30).toFixed(1)}px)` }}>
            <p className="font-serif text-[88px] font-light leading-[1] tracking-[-0.03em] text-canvas">{c.title}</p>
            {c.body && <p className="mt-6 max-w-[560px] text-[26px] leading-[1.45] text-canvas/65">{c.body}</p>}
          </div>
        );
      })}
    </Layer>
  );
}

function SpeciesSegment({ s, u, index }: { s: Species; u: number; index: number }) {
  const info = STATUS_INFO[s.status];
  const fade = window01(u, 0, SPECIES_LEN, 1, 1.2);
  const nameBig = 1 - easeInOut(seg(u, BEAT.photo - 0.5, BEAT.photo + 0.8));
  const photoO = window01(u, BEAT.photo, BEAT.range + 1, 1.2, 1.4);
  const mapO = easeOut(seg(u, BEAT.range, BEAT.range + 1.4));
  const vars = {
    range: easeInOut(seg(u, BEAT.range + 0.3, BEAT.range + 4)),
    zoom: easeInOut(seg(u, BEAT.range + 0.5, BEAT.range + 5)),
    threat: easeInOut(seg(u, BEAT.threats, BEAT.threats + 3.5)),
    cons: easeInOut(seg(u, BEAT.cons, BEAT.cons + 3.5)),
  };
  const threatIdx = Math.floor((u - BEAT.threats - 3.5) / 1.3);
  const hlThreat = u > BEAT.threats + 3.5 && u < BEAT.cons ? s.majorThreats[threatIdx % s.majorThreats.length] : null;
  const anchor = s.distributionPoints[0];
  const [ax, ay] = project(anchor.lng, anchor.lat);

  return (
    <Layer opacity={fade}>
      {/* Name card */}
      <Layer opacity={nameBig}>
        <div className="absolute right-[200px] top-[160px] h-[760px] w-[690px] opacity-70">
          <svg viewBox={MAP_VIEWBOX} className="h-full w-full overflow-visible">
            <Country draw={1} className="doc-country is-drawn" />
            <circle cx={ax} cy={ay} r={8} fill={info.hex} />
            <circle cx={ax} cy={ay} r={8 + ((u * 14) % 36)} fill="none" stroke={info.hex} strokeOpacity={1 - ((u * 14) % 36) / 36} />
          </svg>
        </div>
        <div className="absolute left-[120px] top-[250px] w-[1000px]">
          <p className="text-[24px] tabular-nums text-canvas/45">{index + 1} of {DOC_SPECIES.length}</p>
          <Rise t={u} a={0.5} className="mt-6">
            <p className="font-serif text-[164px] font-light leading-[0.9] tracking-[-0.04em] text-canvas">{s.commonName}</p>
          </Rise>
          <Rise t={u} a={1.4} className="mt-6">
            <p className="font-serif text-[46px] italic text-canvas/65">{s.scientificName}</p>
          </Rise>
          <Rise t={u} a={2.2} className="mt-10">
            <p className="flex items-center gap-4 text-[28px] text-canvas/85">
              <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: info.hex }} />
              {info.name}
              <span className="text-canvas/45">IUCN {info.code}, assessed {s.statusAssessedYear}</span>
            </p>
          </Rise>
          <Rise t={u} a={3} className="mt-6">
            <p className="text-[24px] tabular-nums text-canvas/45">
              {anchor.label} · {formatDeg(anchor.lat, 'lat')} {formatDeg(anchor.lng, 'lng')}
            </p>
          </Rise>
        </div>
      </Layer>

      {/* Photograph */}
      <Layer opacity={photoO}>
        {s.image.src && (
          <div className="absolute inset-y-0 right-0 w-[1180px] overflow-hidden">
            <img
              src={s.image.src}
              alt=""
              className="h-full w-full object-cover"
              style={{ transform: `scale(${(1.12 - 0.1 * seg(u, BEAT.photo, BEAT.range + 1)).toFixed(4)})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-forest-950 via-forest-950/10 to-transparent" />
          </div>
        )}
        <p className="absolute bottom-[40px] right-[60px] text-[18px] text-canvas/55">
          Photograph: {s.image.credit} · {s.image.license} · via Wikimedia Commons
        </p>
      </Layer>

      {/* Persistent title once the name card has gone */}
      <Layer opacity={1 - nameBig}>
        <div className="absolute left-[120px] top-[90px]">
          <p className="font-serif text-[72px] font-light leading-none tracking-[-0.03em] text-canvas">{s.commonName}</p>
          <p className="mt-3 font-serif text-[28px] italic text-canvas/60">{s.scientificName}</p>
        </div>
      </Layer>

      {/* Map with its three layers */}
      <Layer opacity={mapO}>
        <div className="absolute right-[140px] top-[60px] h-[960px] w-[870px]">
          <SpeciesMap species={s} vars={vars} highlightThreat={hlThreat} highlightSites={u > BEAT.cons + 3} interactive={false} showLegend={false} className="h-full w-full" />
        </div>
        <div className="absolute left-[120px] top-[330px] w-[760px]">
          <Layer opacity={window01(u, BEAT.range + 0.6, BEAT.threats, 1, 0.8)}>
            <p className="doc-beat">Where it lives</p>
            <p className="mt-6 font-serif text-[36px] font-light leading-[1.4] text-canvas/90">{s.habitatNote}</p>
            <div className="mt-12 flex gap-20">
              {[
                [s.states.length, 'States and UTs of record'],
                [s.distributionPoints.length, 'Indicative localities'],
              ].map(([v, l], i) => (
                <div key={String(l)}>
                  <p className="font-serif text-[96px] font-light leading-none tabular-nums text-canvas">
                    {Math.round(Number(v) * easeOut(seg(u, BEAT.range + 1 + i * 0.3, BEAT.range + 3.5 + i * 0.3)))}
                  </p>
                  <p className="mt-3 text-[22px] text-canvas/60">{l}</p>
                </div>
              ))}
            </div>
          </Layer>
          <Layer opacity={window01(u, BEAT.threats + 0.4, BEAT.cons, 1, 0.8)}>
            <p className="doc-beat">What cuts through it</p>
            <ul className="mt-6 space-y-4">
              {s.majorThreats.map((th, i) => (
                <li
                  key={th}
                  className="font-serif text-[46px] font-light leading-tight"
                  style={{
                    opacity: easeOut(seg(u, BEAT.threats + 0.8 + i * 0.5, BEAT.threats + 1.8 + i * 0.5)) * (hlThreat && hlThreat !== th ? 0.35 : 1),
                    color: 'var(--color-canvas)',
                  }}
                >
                  {THREAT_BY_ID[th].name}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[20px] leading-snug text-canvas/45">Each hatch is one recorded threat, laid over the states of record. Threats are recorded for the species, not mapped by place.</p>
          </Layer>
          <Layer opacity={window01(u, BEAT.cons + 0.4, SPECIES_LEN - 0.4, 1, 0.8)}>
            <p className="doc-beat">What protects it</p>
            <ul className="mt-6 space-y-5">
              {s.conservationActions.slice(0, 4).map((a, i) => (
                <li key={a} className="text-[28px] leading-snug text-canvas/85" style={{ opacity: easeOut(seg(u, BEAT.cons + 0.8 + i * 0.5, BEAT.cons + 1.8 + i * 0.5)) }}>
                  {a}
                </li>
              ))}
            </ul>
          </Layer>
        </div>
      </Layer>
    </Layer>
  );
}

const THREAT_ROWS = threatChartData();

function ConsScene({ u }: { u: number }) {
  const fade = window01(u, 0, CONS.len, 1, 1);
  const frag = easeInOut(seg(u, 2, 9)) * (1 - easeInOut(seg(u, 13, 20)));
  const prot = easeInOut(seg(u, 13, 20));
  const hlThreat = u > 5 && u < 12.5 ? THREAT_ROWS[Math.floor((u - 5) / 1.2) % THREAT_ROWS.length].id : null;
  const programmes = [...PROGRAMMES].sort((a, b) => (a.startedYear ?? 0) - (b.startedYear ?? 0));
  const hlProgramme = u > 20 && u < 27 ? programmes[Math.floor((u - 20) / 0.8) % programmes.length].id : null;
  return (
    <Layer opacity={fade}>
      <div className="absolute right-[140px] top-[60px] h-[960px] w-[870px]">
        <NationalMap frag={frag} prot={prot} draw={easeOut(seg(u, 0, 2.5))} hlThreat={hlThreat} hlProgramme={hlProgramme} className="h-full w-full" />
      </div>
      <div className="absolute left-[120px] top-[110px] w-[820px]">
        <p className="font-serif text-[104px] font-light leading-[0.94] tracking-[-0.035em]">
          <span style={{ color: `rgba(232,225,207,${(0.35 + 0.65 * (1 - prot)).toFixed(3)})` }}>From fragmentation</span>
          <br />
          <span style={{ color: `rgba(232,225,207,${(0.35 + 0.65 * prot).toFixed(3)})` }}>to protection</span>
        </p>
        <div className="relative mt-16 h-[600px]">
          <Layer opacity={window01(u, 2.5, 13, 1, 1)}>
            <ul className="space-y-3">
              {THREAT_ROWS.map((r) => (
                <li key={r.id} style={{ opacity: hlThreat && hlThreat !== r.id ? 0.4 : 1 }}>
                  <p className="flex justify-between text-[24px] text-canvas/85">
                    <span>{r.name}</span>
                    <span className="tabular-nums text-canvas/50">{r.value} of {totalSpecies}</span>
                  </p>
                  <div className="mt-2 h-px bg-canvas/10">
                    <div className="h-px bg-[var(--color-contour)]" style={{ width: `${(r.value / THREAT_ROWS[0].value) * 100 * easeOut(seg(u, 3, 6))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Layer>
          <Layer opacity={window01(u, 14, CONS.len - 0.5, 1, 1)}>
            <ul className="space-y-2">
              {programmes.map((p) => (
                <li key={p.id} className="flex gap-6 text-[24px]" style={{ opacity: hlProgramme && hlProgramme !== p.id ? 0.4 : 1 }}>
                  <span className="w-20 tabular-nums text-canvas/45">{p.startedYear}</span>
                  <span className="text-canvas/85">{p.name.split(' (')[0]}</span>
                </li>
              ))}
            </ul>
          </Layer>
        </div>
      </div>
    </Layer>
  );
}

function CloseScene({ u }: { u: number }) {
  const geo = useIndiaGeo();
  const statements = window01(u, 0, 11, 0.8, 1);
  const end = window01(u, 11, CLOSE.len, 1, 1.4);
  const centre = project(79, 22.5);
  return (
    <>
      <Layer opacity={statements}>
        <div className="absolute left-[120px] top-[340px] w-[1600px]">
          <Rise t={u} a={0.6}>
            <p className="font-serif text-[104px] font-light leading-[1.02] tracking-[-0.03em] text-canvas/55">Mapping is not just about where species are.</p>
          </Rise>
          <Rise t={u} a={4.2} className="mt-8">
            <p className="font-serif text-[104px] font-light leading-[1.02] tracking-[-0.03em] text-canvas">It is about where we choose to protect them.</p>
          </Rise>
        </div>
      </Layer>
      <Layer opacity={end}>
        <div className="absolute right-[220px] top-[110px] h-[860px] w-[780px]">
          <svg viewBox={MAP_VIEWBOX} className="h-full w-full overflow-visible">
            <path d={geo?.all ?? ''} className="doc-country is-drawn" />
            {SPECIES.map((s, i) => {
              const a = project(s.distributionPoints[0].lng, s.distributionPoints[0].lat);
              const mid: [number, number] = [(a[0] + centre[0]) / 2 + (a[1] - centre[1]) * 0.18, (a[1] + centre[1]) / 2 - (a[0] - centre[0]) * 0.18];
              const k = easeInOut(seg(u, 11.5 + i * 0.25, 15 + i * 0.25));
              return (
                <g key={s.id}>
                  <path d={smoothPath([a, mid, centre], 0.8)} pathLength={1} fill="none" stroke="var(--color-river)" strokeWidth={1.5} strokeDasharray={1} strokeDashoffset={1 - k} vectorEffect="non-scaling-stroke" />
                  <circle cx={a[0]} cy={a[1]} r={5} fill={STATUS_INFO[s.status].hex} />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="absolute bottom-[140px] left-[120px]">
          <Rise t={u} a={12}>
            <p className="font-serif text-[170px] font-light leading-[0.86] tracking-[-0.045em] text-canvas">India Species</p>
          </Rise>
          <Rise t={u} a={12.3}>
            <p className="font-serif text-[170px] font-light leading-[0.86] tracking-[-0.045em] text-canvas">Atlas</p>
          </Rise>
          <div className="mt-12 space-y-2 font-serif text-[40px] font-light">
            <Rise t={u} a={14}><p className="text-canvas/90">Mapping what remains.</p></Rise>
            <Rise t={u} a={14.8}><p className="text-canvas/70">Understanding what is at risk.</p></Rise>
            <Rise t={u} a={15.6}><p className="text-canvas/50">Protecting what can still be saved.</p></Rise>
          </div>
        </div>
      </Layer>
    </>
  );
}

export function DocumentaryStage({ t }: { t: number }) {
  const speciesIndex = Math.floor((t - SPECIES_START) / SPECIES_LEN);
  const inSpecies = t >= SPECIES_START && speciesIndex >= 0 && speciesIndex < DOC_SPECIES.length;
  return (
    <div className="doc-frame relative h-[1080px] w-[1920px] overflow-hidden bg-forest-950 text-canvas">
      {t < TITLE.end && <TitleScene t={t} />}
      {t >= MAP.start - 0.01 && t < MAP.end && <MapScene t={t} />}
      {inSpecies && (
        <SpeciesSegment
          key={DOC_SPECIES[speciesIndex].id}
          s={DOC_SPECIES[speciesIndex]}
          u={t - (SPECIES_START + speciesIndex * SPECIES_LEN)}
          index={speciesIndex}
        />
      )}
      {t >= CONS.start && t < CONS.start + CONS.len && <ConsScene u={t - CONS.start} />}
      {t >= CLOSE.start && <CloseScene u={t - CLOSE.start} />}
      <div className="doc-grain pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}

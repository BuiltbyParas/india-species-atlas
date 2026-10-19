import './reading.css';
import { forwardRef, memo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MISSING_CONTENT, nextStudy, FIELD_STUDIES, type FieldStudy } from '../../content/fieldStudies';
import { BEATS, SECTIONS, beatId, readingFor, sectionId, type BeatId, type SectionId } from '../../content/speciesReading';
import { STATUS_INFO, redListYears } from '../../data/statusInfo';
import { THREAT_LABELS } from '../../data/threats';
import { PROGRAMME_BY_ID } from '../../data/programmes';
import type { SourceRef } from '../../types';

/**
 * A field study read, after its world has been met on the index (FieldStudiesIndex.tsx).
 *
 * One article per study, in the page's own flow: it scrolls up over the held world at the reader's pace. Its six beats
 * (content/speciesReading.ts) are read in three movements, so no short sentence is given a screen of its own:
 *
 *   Encounter  the animal in its ground
 *   Discover   the adaptation beside the field note: one figure, with what it counts, when, how and whose it is
 *   Protect    what cuts through the ground beside what is being done, closing on why it matters
 *
 * and the article ends on the line that carries the reader into the next study's ground. Every sentence is the
 * record's. The record's longer prose, its sources and what the atlas does not hold wait behind "The full record".
 *
 * Nothing here is drawn into the world's canvas: it is text, read by a screen reader in order and selectable.
 * Memoised: the index re-renders on every beat the scroll crosses, and five articles re-rendered with it were the
 * long tasks that stalled the world's frames at each hand-over.
 */

const Source = ({ source }: { source: SourceRef }) => (
  <a className="fs-read-src" href={source.url} target="_blank" rel="noreferrer">
    {source.publisher}
    {source.published ? `, ${source.published.slice(0, 4)}` : ''}
    <span className="sr-only"> (opens in a new tab)</span>
  </a>
);

/** One of the six beats, inside its movement: a small label over its own few lines. */
function Beat({
  study,
  id,
  className,
  unlabelled,
  children,
}: {
  study: string;
  id: BeatId;
  className?: string;
  unlabelled?: boolean;
  children: ReactNode;
}) {
  const label = BEATS.find((b) => b.id === id)!.label;
  return (
    <div className={className ? `fs-beat ${className}` : 'fs-beat'} data-beat={id} id={beatId(study, id)}>
      {/* A movement of one beat is named by its movement. */}
      {!unlabelled && <h5 className="fs-beat-k">{label}</h5>}
      {children}
    </div>
  );
}

/** One of the three movements: its number and name, its title, its beats. */
function Movement({ study, id, title, lead, children }: { study: string; id: SectionId; title: ReactNode; lead?: ReactNode; children: ReactNode }) {
  const n = SECTIONS.findIndex((s) => s.id === id) + 1;
  const label = SECTIONS[n - 1].label;
  const sid = sectionId(study, id);
  return (
    <section className="fs-sec" data-sec={id} id={sid} aria-labelledby={`${sid}-h`}>
      {lead}
      <div className="fs-sec-head">
        <p className="fs-sec-k" aria-hidden="true">
          <span className="tabular-nums">{String(n).padStart(2, '0')}</span>
          {label}
        </p>
        <h4 id={`${sid}-h`} className="fs-sec-title">
          <span className="sr-only">{label}: </span>
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}

export const StudyReading = memo(
  forwardRef<HTMLElement, { study: FieldStudy; onEnter: (id: string) => void }>(function StudyReading({ study, onEnter }, ref) {
    const s = study.species;
    const r = readingFor(study.id, s);
    if (!r) return null;
    const status = STATUS_INFO[s.status];
    const iucn = s.sources.find((src) => src.publisher.startsWith('IUCN Red List'));
    const last = FIELD_STUDIES[FIELD_STUDIES.length - 1].id === study.id;
    const next = nextStudy(study.id);
    const [lede, ...rest] = s.threatNote.split(/(?<=\.)\s+/);
    const missing = MISSING_CONTENT[study.id] ?? [];
    const [encLede, ...encRest] = r.encounter.sentences;

    return (
      <article ref={ref} className="fs-read" data-study={study.id} data-tone="dark" aria-labelledby={`read-${study.id}-title`}>
        <Movement
          study={study.id}
          id="encounter"
          title={r.encounter.title}
          lead={
            <header className="fs-read-head">
              <p className="fs-read-k">
                Field study {study.n} · {study.habitat}
              </p>
              <h3 id={`read-${study.id}-title`} className="fs-read-title">
                {s.commonName}
              </h3>
              <p className="fs-read-sci">
                <i lang="la">{s.scientificName}</i>
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                {study.place}
              </p>
            </header>
          }
        >
          <Beat study={study.id} id="encounter" unlabelled>
            {encLede && <p className="fs-beat-lede">{encLede}</p>}
            {encRest.map((t, i) => (
              <p key={i} className="fs-beat-body">
                {t}
              </p>
            ))}
          </Beat>
        </Movement>

        <Movement study={study.id} id="discover" title={r.adaptation.title}>
          <div className="fs-sec-grid">
            <Beat study={study.id} id="adaptation">
              {r.adaptation.sentences.map((t, i) => (
                <p key={i} className="fs-beat-lede">
                  {t}
                </p>
              ))}
              {r.adaptation.quotes.length > 0 && r.adaptation.quoteSource && (
                <figure className="fs-callouts">
                  <ul>
                    {r.adaptation.quotes.map((q) => (
                      <li key={q.id}>
                        <span className="fs-callout-k">{q.part}</span>
                        <blockquote cite={r.adaptation.quoteSource!.url}>
                          <p>“{q.quote}”</p>
                        </blockquote>
                      </li>
                    ))}
                  </ul>
                  <figcaption className="fs-read-note">
                    Quoted from{' '}
                    <a href={r.adaptation.quoteSource.url} target="_blank" rel="noreferrer">
                      {r.adaptation.quoteSource.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    , checked {r.adaptation.quoteSource.checked}.
                  </figcaption>
                </figure>
              )}
            </Beat>

            <Beat study={study.id} id="field-note">
              {s.population?.map((p, i) => (
                <figure key={i} className={i === 0 ? 'fs-fn' : 'fs-fn fs-fn--minor'}>
                  <p className="fs-fn-figure tabular-nums">
                    {/* The figure large, the source's own qualification of it after, smaller: "3,682" · "(average; range …)". */}
                    {p.value.split(/ (?=\()/)[0]}
                    {p.value.includes(' (') && <span className="fs-fn-qual">{p.value.slice(p.value.indexOf(' (') + 1)}</span>}
                  </p>
                  <figcaption>
                    <p className="fs-fn-scope">{p.scope}</p>
                    <dl className="fs-fn-rows">
                      <div>
                        <dt>Surveyed</dt>
                        <dd>{p.surveyed}</dd>
                      </div>
                      {p.method && (
                        <div>
                          <dt>Method</dt>
                          <dd>{p.method}</dd>
                        </div>
                      )}
                      {p.caveat && (
                        <div>
                          <dt>Caveat</dt>
                          <dd>{p.caveat}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Source</dt>
                        <dd>
                          <Source source={p.source} />
                        </dd>
                      </div>
                    </dl>
                  </figcaption>
                </figure>
              ))}
              {r.band && (
                <p className="fs-fn-band">
                  <span className="fs-fn-k">Altitude</span>
                  <span className="tabular-nums">{r.band}</span>
                  <span className="fs-fn-band-x">the band the record gives for its habitat</span>
                </p>
              )}
            </Beat>
          </div>
        </Movement>

        <Movement study={study.id} id="protect" title="What cuts through this ground">
          <div className="fs-sec-grid fs-sec-grid--protect">
            <Beat study={study.id} id="threat">
              <p className="fs-beat-lede">{lede}</p>
              {rest.map((t, i) => (
                <p key={i} className="fs-beat-body">
                  {t}
                </p>
              ))}
              <ul className="fs-tags" aria-label="Threats the record lists">
                {s.majorThreats.map((t) => (
                  <li key={t}>{THREAT_LABELS[t]}</li>
                ))}
              </ul>
            </Beat>
            <Beat study={study.id} id="conservation">
              <ul className="fs-actions">
                {s.conservationActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <dl className="fs-standing">
                <div>
                  <dt>Red List</dt>
                  <dd>
                    <span className="fs-dot" style={{ background: status.colorVar }} aria-hidden="true" />
                    <strong>{status.name}</strong> — {status.short}{' '}
                    <span className="fs-read-note">
                      {redListYears(s)}
                      {iucn && (
                        <>
                          {' · '}
                          <Source source={iucn} />
                        </>
                      )}
                    </span>
                  </dd>
                </div>
                {s.statusHistory?.map((h) => (
                  <div key={h.year}>
                    <dt className="tabular-nums">{h.year}</dt>
                    <dd>
                      {h.note} <Source source={h.source} />
                    </dd>
                  </div>
                ))}
                {s.conservationProgrammes.map((id) => {
                  const p = PROGRAMME_BY_ID[id];
                  if (!p) return null;
                  return (
                    <div key={id}>
                      <dt>Programme</dt>
                      <dd>
                        <strong>{p.name}</strong>
                        {p.startedYear ? <span className="tabular-nums">, since {p.startedYear}</span> : null}
                        <span className="fs-read-note"> · {p.authority}</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </Beat>
            <Beat study={study.id} id="reflection" className="fs-beat--close">
              <p className="fs-close-title">{r.reflection.title}</p>
              {r.reflection.sentences.map((t, i) => (
                <p key={i} className="fs-beat-lede fs-beat-lede--close">
                  {t}
                </p>
              ))}
            </Beat>
            <div className="fs-more">
              <p className="fs-read-onward">
                <button type="button" className="text-link" data-cursor="Enter" onClick={() => onEnter(study.id)}>
                  Enter the field study
                </button>
                <Link className="text-link" to={`/species/${s.id}`}>
                  The species profile
                </Link>
              </p>
              <details className="fs-read-more">
                <summary>
                  The full record
                  <span className="fs-read-note"> · the record’s own account, sources, protected areas, what the atlas does not hold</span>
                </summary>
                <div className="fs-read-more-body">
                  <p>{s.description}</p>
                  <h6>Protected areas the record names</h6>
                  <ul>
                    {s.protectedAreas.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <h6>Sources</h6>
                  <ul>
                    {s.sources.map((src) => (
                      <li key={src.url}>
                        <a href={src.url} target="_blank" rel="noreferrer">
                          {src.label}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>{' '}
                        <span className="fs-read-note">
                          {src.publisher}
                          {src.published ? `, ${src.published}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {missing.length > 0 && (
                    <>
                      <h6>Not in the record, so not shown</h6>
                      <ul>
                        {missing.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="fs-read-note">
                    The record was last checked against its sources on <time dateTime={s.lastVerified}>{s.lastVerified}</time>. Where a landscape
                    stands behind this text it is drawn, and the animal in it is cut out of a credited photograph.
                  </p>
                  {s.image.credit && s.image.sourceUrl && (
                    <p className="fs-read-note">
                      Photograph:{' '}
                      <a href={s.image.sourceUrl} target="_blank" rel="noreferrer">
                        {s.image.credit}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      {s.image.license ? `, ${s.image.license}` : ''}.
                    </p>
                  )}
                </div>
              </details>
            </div>
            <p className="fs-bridge" data-next={last ? undefined : next.id}>
              <span className="fs-bridge-k">{last ? 'Onward' : `Next · ${next.habitat}`}</span>
              <span className="fs-bridge-t">{r.bridge}</span>
            </p>
          </div>
        </Movement>
      </article>
    );
  }),
);

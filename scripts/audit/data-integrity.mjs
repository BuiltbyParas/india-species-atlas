// Data integrity: the species, programmes and sources datasets checked against the rules the atlas states about
// itself. Bundles src/data with esbuild (images stubbed), imports it, and prints one PASS / FAIL line per rule.
// Exits 1 if any rule fails. Usage: node scripts/audit/data-integrity.mjs
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'ispa-data-'));
const out = join(dir, 'data.mjs');
await build({
  stdin: {
    contents: `export * from './src/data/species.ts'; export * from './src/data/programmes.ts'; export * from './src/data/sources.ts';`,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: out,
  loader: { '.jpg': 'empty', '.png': 'empty', '.webp': 'empty' },
  logLevel: 'error',
});
const { SPECIES, PROGRAMMES } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let failed = 0;
const rule = (name, problems) => {
  if (problems.length) failed++;
  console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${name}${problems.length ? `\n      ${problems.join('\n      ')}` : ''}`);
};
const thisYear = new Date().getFullYear();
const points = SPECIES.flatMap((s) => s.distributionPoints.map((p) => ({ ...p, species: s.id })));
const text = (s) => [s.summary, s.description, s.indianDistribution, s.habitatNote, s.threatNote, s.whyItMatters, ...s.conservationActions, ...s.distributionPoints.map((p) => p.note ?? '')].join(' ');

rule('12 species, 52 localities', [SPECIES.length !== 12 && `${SPECIES.length} species`, points.length !== 52 && `${points.length} localities`].filter(Boolean));

rule('Red List years: assessed <= published, both plausible', SPECIES.flatMap((s) =>
  s.statusAssessedYear > s.statusPublishedYear || s.statusAssessedYear < 1990 || s.statusPublishedYear > thisYear
    ? [`${s.id}: assessed ${s.statusAssessedYear}, published ${s.statusPublishedYear}`]
    : []));

rule('Each species cites its own assessment by DOI, and the DOI version is not later than the year published', SPECIES.flatMap((s) => {
  const a = s.sources.find((r) => r.url.startsWith('https://doi.org/10.2305/IUCN.UK.'));
  if (!a) return [`${s.id}: no Red List DOI`];
  const version = Number(a.url.match(/IUCN\.UK\.(\d{4})/)?.[1]);
  if (!a.url.toLowerCase().includes(s.scientificName.split(' ')[0].toLowerCase()) && !a.label.includes(s.scientificName)) return [`${s.id}: DOI label does not name ${s.scientificName}`];
  return version > s.statusPublishedYear ? [`${s.id}: DOI version ${version} after published ${s.statusPublishedYear}`] : [];
}));

const homePage = (u) => /^https?:\/\/[^/]+\/?$/.test(u);
rule('No species figure rests on a bare home-page link', SPECIES.flatMap((s) => s.sources.filter((r) => homePage(r.url)).map((r) => `${s.id}: ${r.url} (${r.label})`)));

rule('No citation to the unrelated PIB release 1884356', [...SPECIES.flatMap((s) => s.sources), ...PROGRAMMES.flatMap((p) => p.sources)].filter((r) => r.url.includes('1884356')).map((r) => r.label));

rule('Population figures carry scope, value, survey years and a source', SPECIES.flatMap((s) => (s.population ?? []).flatMap((e) =>
  !e.scope || !e.value || !e.surveyed || !e.source?.url ? [`${s.id}: ${e.scope ?? '(no scope)'}`] : [])));

const OUTDATED = ['200–250', 'low hundreds', 'low thousands', '27,000–30,000', 'more than two-thirds', 'strictly herbivorous marine mammal', 'over the 20th century'];
rule('No superseded or unsupported wording', SPECIES.flatMap((s) => OUTDATED.filter((w) => text(s).includes(w)).map((w) => `${s.id}: "${w}"`)));

rule('Localities inside India’s frame, at two decimals or fewer', points.flatMap((p) => [
  (p.lat < 5.5 || p.lat > 37.6 || p.lng < 66.5 || p.lng > 98.5) && `${p.species}: ${p.label} outside the frame`,
  (String(p.lat).split('.')[1]?.length > 2 || String(p.lng).split('.')[1]?.length > 2) && `${p.species}: ${p.label} finer than 0.01°`,
].filter(Boolean)));

rule('Captive records are marked, and are the breeding centres only', points.flatMap((p) => {
  const looksCaptive = /breeding centre|conservation breeding centre|zoo/i.test(p.label);
  return looksCaptive !== Boolean(p.captive) ? [`${p.species}: ${p.label} (captive: ${Boolean(p.captive)})`] : [];
}));

rule('Great Indian Bustard localities withhold their coordinates', points.filter((p) => p.species === 'great-indian-bustard' && !p.withholdCoordinates).map((p) => p.label));

const shared = new Map();
for (const p of points) shared.set(`${p.lat},${p.lng}`, [...(shared.get(`${p.lat},${p.lng}`) ?? []), `${p.species}: ${p.label}`]);
const pairs = [...shared.values()].filter((v) => v.length > 1);
console.log(`INFO  ${pairs.length} localities shared by more than one record (drawn side by side on /atlas):\n      ${pairs.map((v) => v.join(' | ')).join('\n      ')}`);
console.log(`INFO  ${points.filter((p) => p.captive).length} captive record(s); ${points.filter((p) => p.withholdCoordinates).length} record(s) withhold coordinates`);

process.exit(failed ? 1 : 0);

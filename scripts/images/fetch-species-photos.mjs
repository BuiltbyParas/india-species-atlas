#!/usr/bin/env node
/**
 * Sources one openly-licensed photograph per species from Wikimedia Commons.
 *
 *   node scripts/images/fetch-species-photos.mjs --check   # report only
 *   node scripts/images/fetch-species-photos.mjs           # download + write manifest
 *
 * The atlas cites its facts, so its pictures are held to the same standard:
 * every file is checked to be under a licence that permits reuse, checked to
 * actually depict the species it is filed under, and recorded with its
 * photographer, licence and source page so the credit can be shown in the
 * interface. Anything that fails a check is reported rather than guessed at.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const UA =
  'IndiaSpeciesAtlas/1.0 (educational student project; https://github.com/BuiltbyParas/india-species-atlas)';

const OUT_DIR = join(import.meta.dirname, '../../src/assets/species');
const MANIFEST = join(import.meta.dirname, 'photo-manifest.json');

/** Licences that allow reuse with attribution. Anything else is rejected. */
const ALLOWED = [
  /^cc0/i,
  /^cc[- ]by(-sa)?[- ][1-4]\.0/i,
  /^cc[- ]by(-sa)?[- ][23]\.[05]/i,
  /^public domain/i,
  /^pd/i,
];

/**
 * Files named here are used instead of the article's lead photograph.
 *
 * Two species need it. The Ganges river dolphin's lead image is 474 px wide —
 * far too small for a card face — and most of the large files in its Commons
 * category are museum skeletons and skull casts, which would be a strange
 * thing to put in a gallery of living animals. The Indian rhinoceros' lead
 * image is similarly small. Both are replaced with the largest well-licensed
 * photograph of a live animal in the species' own category.
 */
const OVERRIDES = {
  // The lead image is 474 px wide, and most of the large files in this
  // species' category are museum skeletons and skull casts. This is the
  // photographer's own crop of a live animal at Koshi Barrage.
  'ganges-river-dolphin': 'File:Ganges River Dolphin sighted in Koshi Barrage (cropped).jpg',
  // The lead image is 1000 px wide.
  'indian-rhinoceros': 'File:Payamfarahani - Rhinoceros unicornis (26).jpg',
  // Most bustard photographs on Commons — the article's lead included — are
  // habitat shots in which the bird is a speck. This one is still taken at
  // distance, but the birds are large enough in frame to be recognisable.
  'great-indian-bustard':
    'File:Great Indian Bustard Ardeotis nigriceps by Raju Kasambe DSCN9716 09.jpg',
};

/**
 * Which article to read the lead photograph from, and what has to appear in
 * the file's own metadata for it to count as a picture of that species.
 */
const TARGETS = [
  { id: 'great-indian-bustard', article: 'Great Indian bustard', match: /ardeotis nigriceps|great indian bustard/i },
  { id: 'bengal-tiger', article: 'Bengal tiger', match: /panthera tigris|tiger/i },
  { id: 'red-panda', article: 'Red panda', match: /ailurus fulgens|red panda/i },
  { id: 'ganges-river-dolphin', article: 'South Asian river dolphin', match: /platanista|river dolphin/i },
  { id: 'nilgiri-tahr', article: 'Nilgiri tahr', match: /nilgiritragus|hemitragus|nilgiri tahr/i },
  { id: 'gharial', article: 'Gharial', match: /gavialis gangeticus|gharial/i },
  { id: 'white-rumped-vulture', article: 'White-rumped vulture', match: /gyps bengalensis|white-rumped vulture/i },
  { id: 'snow-leopard', article: 'Snow leopard', match: /panthera uncia|uncia uncia|snow leopard/i },
  { id: 'indian-rhinoceros', article: 'Indian rhinoceros', match: /rhinoceros unicornis|indian rhino|one-horned/i },
  { id: 'dugong', article: 'Dugong', match: /dugong/i },
  { id: 'lion-tailed-macaque', article: 'Lion-tailed macaque', match: /macaca silenus|lion-tailed macaque/i },
  { id: 'asian-elephant', article: 'Asian elephant', match: /elephas maximus|asian elephant|indian elephant/i },
];

/** Retried, because a single dropped connection should not cost a species. */
const api = async (host, params, attempts = 3) => {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= attempts) throw new Error(`${host}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
};

/** Strips the HTML Commons puts in its metadata fields. */
const plain = (html) =>
  (html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();

async function leadFile(article) {
  const data = await api('en.wikipedia.org', {
    action: 'query',
    prop: 'pageimages',
    piprop: 'name',
    pilicense: 'any',
    redirects: '1',
    titles: article,
  });
  const page = Object.values(data.query.pages)[0];
  if (!page?.pageimage) throw new Error(`no lead image on "${article}"`);
  return { file: `File:${page.pageimage}`, resolved: page.title };
}

async function fileInfo(file, width) {
  const data = await api('commons.wikimedia.org', {
    action: 'query',
    prop: 'imageinfo|categories',
    cllimit: '100',
    titles: file,
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: String(width),
  });
  const page = Object.values(data.query.pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`no file info for ${file}`);
  const meta = info.extmetadata ?? {};
  return {
    file,
    width: info.width,
    height: info.height,
    mime: info.mime,
    thumb: info.thumburl,
    page: info.descriptionurl,
    licence: plain(meta.LicenseShortName?.value) || plain(meta.UsageTerms?.value),
    licenceUrl: plain(meta.LicenseUrl?.value),
    artist: plain(meta.Artist?.value),
    description: plain(meta.ImageDescription?.value),
    objectName: plain(meta.ObjectName?.value),
    restrictions: plain(meta.Restrictions?.value),
    categories: (page.categories ?? []).map((c) => c.title),
  };
}

function verify(target, info) {
  const problems = [];
  if (!ALLOWED.some((re) => re.test(info.licence))) {
    problems.push(`licence not on the allow-list: "${info.licence}"`);
  }
  if (info.restrictions) problems.push(`restrictions: ${info.restrictions}`);
  if (!info.artist) problems.push('no photographer recorded');
  // Identity: the species has to be named in the file's own metadata, not
  // merely in the article the file was found through.
  const haystack = [info.file, info.objectName, info.description, ...info.categories].join(' | ');
  if (!target.match.test(haystack)) problems.push('species not named in the file metadata');
  if (info.mime && !/jpeg|png|webp/.test(info.mime)) problems.push(`unusable format: ${info.mime}`);
  return problems;
}

/**
 * The species ids are the join between this script and the dataset, so they
 * are checked against `src/data/species.ts` rather than trusted: a renamed
 * species would otherwise silently leave a photograph orphaned.
 */
async function assertIdsMatchDataset() {
  const source = await readFile(join(import.meta.dirname, '../../src/data/species.ts'), 'utf8');
  const ids = new Set([...source.matchAll(/^    id: '([^']+)',$/gm)].map((m) => m[1]));
  const mine = new Set(TARGETS.map((t) => t.id));
  const missing = [...ids].filter((id) => !mine.has(id));
  const extra = [...mine].filter((id) => !ids.has(id));
  if (missing.length || extra.length) {
    throw new Error(
      `species ids out of sync with src/data/species.ts` +
        (missing.length ? `\n  no photograph configured for: ${missing.join(', ')}` : '') +
        (extra.length ? `\n  configured but not in the dataset: ${extra.join(', ')}` : ''),
    );
  }
}

/** Commons' thumbnailer drops the occasional connection; one failure out of
 *  twelve should not lose the other eleven. */
async function download(url, label, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= attempts) throw new Error(`download failed for ${label}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  await assertIdsMatchDataset();
  const width = 1400;
  const results = [];

  for (const target of TARGETS) {
    process.stdout.write(`${target.id.padEnd(30)} `);
    try {
      const override = OVERRIDES[target.id];
      const { file, resolved } = override
        ? { file: override, resolved: `(override) ${override}` }
        : await leadFile(target.article);
      const info = await fileInfo(file, width);
      const problems = verify(target, info);
      results.push({ ...target, resolved, info, problems });
      console.log(
        problems.length
          ? `✗ ${problems.join('; ')}`
          : `✓ ${info.licence}  ·  ${info.artist.slice(0, 40)}  ·  ${info.width}×${info.height}`,
      );
    } catch (err) {
      results.push({ ...target, error: err.message });
      console.log(`✗ ${err.message}`);
    }
  }

  const usable = results.filter((r) => r.info && !r.problems.length);
  console.log(`\n${usable.length}/${TARGETS.length} usable`);
  if (checkOnly) return;
  if (usable.length !== TARGETS.length) {
    throw new Error('not every species has a usable photograph — fix the failures first');
  }

  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];
  for (const r of usable) {
    const raw = join(OUT_DIR, `${r.id}.download`);
    await writeFile(raw, await download(r.info.thumb, r.id));
    // Re-encoded to a consistent width and quality: these are card faces and
    // WebGL textures, not archival copies.
    const out = join(OUT_DIR, `${r.id}.jpg`);
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', raw,
      '-vf', `scale=${width}:-2:flags=lanczos`,
      // These are card faces, WebGL textures and a panel image, not archival
      // copies. Quality 5 keeps every file comfortably under 400 kB with no
      // visible loss at the sizes they are actually displayed at.
      '-q:v', '5',
      out,
    ]);
    await run('rm', ['-f', raw]);
    manifest.push({
      id: r.id,
      file: r.info.file,
      artist: r.info.artist,
      licence: r.info.licence,
      licenceUrl: r.info.licenceUrl,
      source: r.info.page,
      objectName: r.info.objectName,
      fromArticle: r.resolved,
    });
    console.log(`  saved ${r.id}.jpg`);
  }
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nmanifest → ${MANIFEST}`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});

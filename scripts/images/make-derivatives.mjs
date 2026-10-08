// Small WebP copies of the bundled species photographs, and their sizes.
//
// The 1400 px JPGs in src/assets/species stay the masters and the large
// source. This writes a 720 px WebP beside each one for the small slots (cards,
// the dome, the gallery's textures, phones) and records every master's
// intrinsic size in photo-meta.json, so an <img> can reserve its box before
// the file arrives. Same photographs, same crops: nothing is retouched.
//
// Needs ImageMagick 7 (`magick`) with WebP support. Run: node scripts/images/make-derivatives.mjs
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../../src/assets/species/', import.meta.url).pathname;
const meta = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort()) {
  const id = f.replace(/\.jpg$/, '');
  execFileSync('magick', [join(dir, f), '-strip', '-resize', '720x', '-quality', '76', '-define', 'webp:method=6', join(dir, `${id}-720.webp`)]);
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', join(dir, f)]).toString().split(' ').map(Number);
  meta[id] = { w, h };
  console.log(id, w, h);
}
writeFileSync(join(dir, 'photo-meta.json'), JSON.stringify(meta, null, 2) + '\n');

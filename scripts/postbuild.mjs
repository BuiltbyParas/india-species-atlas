// After `vite build`, copy index.html to 404.html so that client-side routes
// (e.g. /atlas, /species) resolve on static hosts that do not rewrite unknown
// paths — notably GitHub Pages. Netlify (_redirects) and Vercel (vercel.json)
// handle this with their own config, but the extra file is harmless there.
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
await copyFile(join(dist, 'index.html'), join(dist, '404.html'));
console.log('postbuild: dist/404.html written');

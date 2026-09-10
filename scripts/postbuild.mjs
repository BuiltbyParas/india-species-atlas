// After `vite build`, give every client-side route a real file to be served.
//
// A static host has nothing at /atlas, so a visitor landing there directly gets
// the host's not-found handling. GitHub Pages serves 404.html for it, which
// boots the app and renders the right page — but under an HTTP 404, which link
// previews, crawlers and uptime checks all read as a broken page.
//
// Copying index.html to dist/atlas/index.html means the path genuinely exists
// and is served as 200. The router takes over from there exactly as before.
// 404.html is still written, and still the right answer for a path that is not
// a route: it renders NotFoundPage under a 404, which is what that is.
//
// Netlify (_redirects) and Vercel (vercel.json) rewrite unknown paths on their
// own, where these extra files are merely redundant rather than wrong.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

/**
 * The routes to materialise, read from the router itself.
 *
 * Kept derived rather than duplicated as a list here, because a route added to
 * App.tsx and forgotten here would 404 in exactly the way this script exists to
 * prevent — and it would do so only in production, on a deep link, which is the
 * least likely thing to be tested.
 */
async function staticRoutes() {
  const app = await readFile(join(root, 'src/App.tsx'), 'utf8');
  const paths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
  if (paths.length === 0) {
    throw new Error('postbuild: no <Route path="…"> found in src/App.tsx — has the router moved?');
  }
  // "/" is index.html already, and "*" is the catch-all that 404.html serves.
  return paths.filter((p) => p !== '/' && !p.includes('*') && !p.includes(':'));
}

const index = join(dist, 'index.html');
await copyFile(index, join(dist, '404.html'));

const routes = await staticRoutes();
for (const route of routes) {
  const dir = join(dist, route);
  await mkdir(dir, { recursive: true });
  await copyFile(index, join(dir, 'index.html'));
}

console.log(`postbuild: dist/404.html and ${routes.length} route pages written (${routes.join(', ')})`);

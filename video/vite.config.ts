import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * The promotional film's stage — a separate Vite entry from the site.
 *
 * It is never part of the site build: `npm run build` only sees the root
 * `index.html`. The film reads the atlas's own data and geometry from `src/`
 * and `public/` without changing them, so what the film states is exactly
 * what the atlas states.
 */
export default defineConfig({
  root: resolve(import.meta.dirname),
  publicDir: resolve(import.meta.dirname, 'public'),
  server: {
    host: '127.0.0.1',
    port: 4455,
    strictPort: true,
    fs: { allow: [resolve(import.meta.dirname, '..')] },
  },
  logLevel: 'warn',
});

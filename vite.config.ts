import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// If you deploy to GitHub Pages under https://<user>.github.io/<repo>/,
// set BASE to "/<repo>/". Netlify and Vercel serve from the root, so leave it "/".
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    // The hero's three.js relief is a lazy chunk (~536 kB raw / ~137 kB gzipped)
    // that most visitors never request. Raised just far enough to clear it,
    // so the eagerly-loaded bundles still trip the warning if they regress.
    chunkSizeWarningLimit: 600,
  },
})

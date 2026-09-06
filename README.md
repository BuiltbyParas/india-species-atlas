# India Species Atlas

**Mapping Endangered Species and Their Conservation Status in India**

An interactive, educational web application that connects the *geography* of a
selection of India's threatened species with their *IUCN conservation status*,
the *threats* they face and the *conservation programmes* responding to them.

Built as a college environmental-studies / Computer-Aided Instruction (CAI)
project.

---

## What it does

- **Interactive map of India** (Leaflet + OpenStreetMap) with pan/zoom, a
  status-coded marker for every mapped location, click-to-open species profiles,
  and a "reset to India view" control.
- **State interaction** — click any state/UT on the map to list the atlas
  species that occur there.
- **Three map modes** — *Species* (markers by IUCN status), *Threats* (markers by
  the species' most prominent threat) and *Conservation* (sites linked to
  government/partner programmes).
- **Search** across common name, scientific name, state and region, updating
  instantly.
- **Combinable filters** — conservation status, ecological region and habitat.
- **Species profiles** — image/placeholder, scientific name, IUCN status with a
  plain-language definition, Indian distribution, habitat, major threats,
  conservation measures, government programmes, protected areas, a "why it
  matters" note, and per-species sources with a "last checked" date. Profiles are
  deep-linkable via `?species=<id>`.
- **Conservation & status page** — the IUCN category ladder explained, the
  "extinction risk ≠ population count" distinction, dependency-free charts
  computed from the dataset, a threats overview and a programmes directory.
- **"Discover a species"** — opens a random species profile.
- **Presentation panel + QR code** — a screenshot-friendly summary card and a QR
  code generated at runtime from the live URL (no hard-coded address).
- **Scroll-linked 3D hero** — the landing page opens on a camera journey over a
  relief of India, built at runtime from the same state boundaries the map uses,
  with a marker for every occurrence point in the dataset. Scrolling flies the
  camera from an orbital view against a starfield down to a low pass over the
  country, revealing markers in a north-to-south sweep, with selective bloom on
  the markers, depth of field, vignette and a colour grade that warms as the
  camera descends. Confined to the hero on purpose: the map, cards, filters and
  charts stay flat and data-first.
- Responsive (desktop → phone), keyboard-navigable, with visible focus states and
  no reliance on colour alone for status.

## Species included (12)

Great Indian Bustard · Bengal Tiger · Red Panda · Ganges River Dolphin ·
Nilgiri Tahr · Gharial · White-rumped Vulture · Snow Leopard · Greater One-horned
Rhinoceros · Dugong · Lion-tailed Macaque · Asian Elephant

The selection is deliberately small and chosen for geographic spread (8 ecological
regions, 23 states/UTs) and a mix of IUCN categories (3 CR, 6 EN, 3 VU) and
animal groups. **Accuracy was prioritised over quantity.**

---

## Technology

| Area | Choice |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Map | Leaflet + react-leaflet, OpenStreetMap raster tiles (no API key) |
| Hero 3D | three.js, generated from the project's own GeoJSON — no 3D model files, textures or loaders. Custom post-processing chain (selective bloom, depth of field, vignette, colour grade) rather than `EffectComposer`. Lazy-loaded in a separate chunk and skipped entirely under `prefers-reduced-motion`, Save-Data, missing WebGL or low-end hardware; watches its own frame rate and steps quality down, then hands back to the flat hero if it still cannot keep up |
| Icons | lucide-react |
| QR code | `qrcode` (offline, no external service) |
| Charts | small custom component — no charting library |
| Data | local TypeScript modules in `src/data/` |
| Hosting | any static host (no backend, no database, no auth) |

## Project structure

```
src/
  components/   ui, layout, map, species, conservation, charts
  data/         species.ts, regions.ts, threats.ts, programmes.ts,
                sources.ts, statusInfo.ts
  hooks/        useSpeciesFilters.ts
  pages/        Home, Atlas, Species, Conservation, About, Sources, 404
  types/        domain types
  utils/        stats (all headline numbers computed here), cn
  theme.ts      literal palette values for SVG / canvas / Leaflet
  components/home/
    HeroScrollScene.tsx  capability checks, scroll wiring, SVG fallback
    heroScene.ts         camera journey + frame loop (lazy chunk; no React)
    heroTerrain.ts       GeoJSON -> extruded relief geometry
    heroPost.ts          bloom / depth of field / vignette / colour grade
public/
  india-states.geojson   simplified state boundaries
```

All species information lives in `src/data/` — components never hard-code it, and
every statistic on the site is derived from the dataset at runtime.

---

## Install

Requires **Node.js 20.19+ or 22.12+** and npm.

```bash
npm install
```

## Run (development)

```bash
npm run dev
```

Then open the printed URL (default `http://localhost:5173`).

## Build (production)

```bash
npm run build      # type-checks, builds to dist/, writes dist/404.html
npm run preview    # serve the production build locally
```

Other scripts: `npm run typecheck`, `npm run lint`.

---

## Deploy

The app is a fully static site. **Netlify** is the easiest option for a beginner.

### Netlify (recommended)

1. Push this repository to GitHub.
2. On <https://app.netlify.com> → *Add new site* → *Import an existing project* →
   pick the repo.
3. Netlify reads `netlify.toml` automatically: build command `npm run build`,
   publish directory `dist`. Click *Deploy*.
4. Your site is live at `https://<name>.netlify.app`. SPA routes work via
   `public/_redirects`.

### Vercel

Import the repo at <https://vercel.com/new>. Framework preset **Vite** is
detected; `vercel.json` handles SPA routing. Deploy.

### GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`.

1. Repository → *Settings* → *Pages* → *Build and deployment* → Source:
   **GitHub Actions**.
2. Push to `main`. The workflow builds with `VITE_BASE=/<repo-name>/` (so asset
   paths are correct for a project site) and deploys.
3. Site is served at `https://<user>.github.io/<repo-name>/`.

If you deploy Pages manually instead, set the base path when building:

```bash
VITE_BASE=/your-repo-name/ npm run build
```

### Generating a QR code for the deployed site

The Home page renders a QR code from `window.location.origin` once deployed, with
a *Copy link* button. To make one separately, paste the deployed URL into any QR
generator, or run:

```bash
npx qrcode "https://your-deployed-url/" -o atlas-qr.png
```

---

## Maintaining the data

### Add or edit a species

Edit `src/data/species.ts`. Each entry follows the `Species` type in
`src/types/index.ts`. Key fields:

- `status` — **must** be a real IUCN Red List category (`CR` / `EN` / `VU` / …).
  Check it at <https://www.iucnredlist.org/> (or BirdLife's Data Zone for birds)
  and set `statusAssessedYear` to the year of that assessment.
- `regions`, `states`, `habitats` — used by the filters, map and charts.
- `distributionPoints` — **indicative** locations (usually a well-known protected
  area), *not* range boundaries: `{ lat, lng, label, note? }`.
- `majorThreats` — IDs from `src/data/threats.ts`.
- `conservationProgrammes` — IDs from `src/data/programmes.ts`. Only link a
  programme where a government/IUCN source supports it.
- `sources` — at least the IUCN assessment plus one more authoritative source.
- `lastVerified` — set to today's date (`YYYY-MM-DD`) whenever you re-check it.

The charts, headline numbers and region lists update automatically.

### Update sources

Per-species sources live on each species' `sources` array. The general
bibliography is in `src/data/sources.ts` (`BIBLIOGRAPHY`). Use the `iucnSearch()`
helper for IUCN links so they stay valid across Red List updates.

### Replace or add images

The atlas ships **no bundled photographs**; each species uses a generated
placeholder tinted by IUCN status. To use a real image:

1. Find a legally reusable file — e.g. on
   [Wikimedia Commons](https://commons.wikimedia.org/) (public domain or a
   Creative Commons licence).
2. In that species' `image` object set:

   ```ts
   image: {
     src: 'https://upload.wikimedia.org/…/Example.jpg',
     alt: 'A short factual description of the photo',
     credit: 'Photographer name',
     license: 'CC BY-SA 4.0',
     licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
     sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
   }
   ```

3. If the image fails to load, the placeholder is shown automatically.

To bundle images instead, put them in `src/assets/` and `import` them.

### Update the map boundaries

`public/india-states.geojson` is a simplified open dataset (see the Sources page).
It predates some state reorganisations — Telangana and Ladakh appear within their
former parent states. Replace the file with any GeoJSON whose features expose a
`state` property to change this.

---

## Accuracy & limitations

- IUCN categories describe **global** extinction risk, not the size or trend of a
  species' Indian population.
- Map markers are simplified educational representations — indicative points, not
  population boundaries or full ranges.
- The atlas is a teaching tool, not a complete inventory or a substitute for
  official distribution datasets.
- Wikipedia was used only for orientation during research, never as the authority
  for a conservation status.

## Licence / attribution

- Code: free to reuse for educational purposes.
- Basemap © OpenStreetMap contributors (ODbL).
- State boundary data: community open dataset (see Sources page).
- Not affiliated with the IUCN or the Government of India.

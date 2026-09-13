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
- **3D Conservation view** — an *opt-in* companion to the Conservation mode,
  never a replacement for it: the flat map stays the default, and the toggle
  sits beside it. States where a programme-covered species occurs are raised a
  step out of an extruded relief of the same `india-states.geojson` the flat
  map draws, and a marker stands at every programme site. What the geometry
  claims is deliberately small — the step is a yes/no rather than a quantity,
  because the atlas has no data a varying height could honestly encode, and a
  marker is a plan shape rather than a picture of anything. Programmes are told
  apart by outline first and colour second, so the legend survives being
  printed in grey. Drag to turn (within about 30° of north-up, so the map stays
  a map), arrow keys turn and tilt, and clicking a marker names its programme
  in real text below the stage. Without WebGL, on a low-end device, or where
  reduced motion is asked for, the flat map is shown instead with a note
  saying why, and no three.js is ever fetched.
- **Species density shading** — an opt-in overlay on the flat map that shades
  each state by how many of the *currently selected* species are recorded there.
  It counts species, not pins: a species with four markers in Assam counts once,
  because the markers are illustrative locations and counting them would shade a
  state by how much attention this atlas paid to it. The count is always given as
  a number in the state's tooltip as well as a shade, so colour is never the
  value. The boundary file predates the 2019 reorganisation of Jammu & Kashmir,
  so Ladakh records are drawn on the Jammu and Kashmir shape and the legend says
  so.
- **Compare** (`/compare`) — two or three species side by side on every attribute
  the dataset holds, with the selection kept in the address bar so a comparison
  can be linked to or handed in. A cell that has nothing to show says so in
  words; it is never left blank, because a blank cell reads as "none" when it may
  mean "not recorded".
- **Saved species** — a heart on every card and profile keeps a list in this
  browser's `localStorage`. There are no accounts and no server, so a list is
  shared by link (`/species?list=id,id`): the recipient sees it, and chooses
  whether to keep it. Every storage read and write is wrapped, so a private
  window or blocked storage degrades to "no saved list" rather than a broken
  page.
- **Search** across common name, scientific name, state and region, updating
  instantly.
- **Combinable filters** — conservation status, ecological region and habitat.
- **3D species gallery** — the species directory opens on a ring of
  photographic cards standing in real 3D space, which you turn by dragging, by
  the arrow keys, or by clicking a card at the edge to bring it round. Each
  card is an extruded slab with thickness and a bevelled edge, lit by a key
  light it catches as it turns, backed by a soft halo in its IUCN status
  colour, and captioned in the texture so the lettering keeps its perspective.
  Moving the pointer moves the camera, so the ring parallaxes as an object
  rather than as stacked layers. The photographs are photographs: nothing here
  is a 3D model of an animal, and the stage says so. A *Grid* view sits beside
  it for scanning, and the search and filters drive both.
- **Species profiles** — photograph, scientific name, IUCN status with a
  plain-language definition, and then five tabs: *Overview* (status, habitat, why
  it matters, assessment history), *Distribution* (range in words, states, every
  mapped location), *Threats*, *Conservation* (measures, programmes, protected
  areas) and *Sources* (per-species references, "last checked" date and the
  photograph's credit). Tabs rather than one long column, so the sources sit one
  click from any claim instead of a scroll away; arrow keys move between them.
  Profiles are deep-linkable via `?species=<id>`.
- **Conservation & status page** — the IUCN category ladder explained, the
  "extinction risk ≠ population count" distinction, dependency-free charts
  computed from the dataset, a threats overview, a **timeline** and a programmes
  directory.
- **Timeline** — a year slider over two kinds of dated fact: the year a species
  was listed in the Red List category it still holds, and the year a conservation
  programme began. Deliberately not a population graph — the atlas holds no
  population series it could cite, and nothing between two events is
  interpolated. A listing year is recorded only where a source states it
  outright; the species for which none has been found and checked are **named
  underneath the timeline** rather than quietly omitted, so the gaps in the
  record are as visible as the record.
- **"Discover a species"** — opens a random species profile.
- **Presentation panel + QR code** — a screenshot-friendly summary card and a QR
  code generated at runtime from the live URL (no hard-coded address).
- **Scroll-linked 3D hero** — the landing page opens on a camera journey over a
  relief of India, built at runtime from the same state boundaries the map uses,
  with a marker for every occurrence point in the dataset. Scrolling flies the
  camera from an orbital view against a starfield down to a low pass over the
  country, revealing markers in a north-to-south sweep, with selective bloom on
  the markers, depth of field, vignette and a colour grade that warms as the
  camera descends. Each of the twelve species is then introduced in turn over
  its anchor locality on a silhouette plate — a drawn profile outline with the
  common name, scientific name and IUCN category beside it — which rises, holds
  and fades as the camera passes. Confined to the hero on purpose: the map,
  cards, filters and charts stay flat and data-first.
- Responsive (desktop → phone), keyboard-navigable, with visible focus states and
  no reliance on colour alone for status. Every 3D element degrades to the flat
  layout under `prefers-reduced-motion`, Save-Data, missing WebGL or low-end
  hardware — and fetches no three.js at all in that case.

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
| Species gallery | three.js — photographic cards on a ring of extruded rounded slabs, card faces composited on a 2D canvas at runtime (photo, scrim, status chip, caption) and uploaded as textures. Lazy-loaded, and only once the section is scrolled near, so it never competes with the hero for the GPU |
| Hero 3D | three.js, generated from the project's own GeoJSON — no 3D model files, textures or loaders. Species plates are drawn into a single canvas atlas at runtime and billboarded as one instanced draw call; their captions are DOM text positioned per frame. Custom post-processing chain (selective bloom, depth of field, vignette, colour grade) rather than `EffectComposer`. Lazy-loaded in a separate chunk and skipped entirely under `prefers-reduced-motion`, Save-Data, missing WebGL or low-end hardware; watches its own frame rate and steps quality down, then hands back to the flat hero if it still cannot keep up |
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
  hooks/        useSpeciesFilters.ts, useFavourites.ts (localStorage store)
  pages/        Home, Atlas, Species, Compare, Conservation, About, Sources, 404
  types/        domain types
  utils/        stats (all headline numbers computed here), cn,
                stateCounts (species-per-state for the density shading),
                timeline (dated listings + programme starts),
                geoExtrude (GeoJSON -> extruded geometry, shared by the hero
                relief and the 3D Conservation view), canRender3D
  theme.ts      literal palette values for SVG / canvas / Leaflet
  components/home/
    HeroScrollScene.tsx  capability checks, scroll wiring, SVG fallback
    heroScene.ts         camera journey + frame loop (lazy chunk; no React)
    heroTerrain.ts       GeoJSON -> extruded relief geometry
    heroPost.ts          bloom / depth of field / vignette / colour grade
    heroPlates.ts        species plate atlas (canvas 2D, no image assets)
    speciesSilhouettes.ts  hand-drawn profile outlines, one per species
  components/map/
    AtlasMap.tsx         the flat Leaflet map, and the default in every mode
    ConservationView.tsx opt-in 3D view: capability checks, mounting, fallback
    conservationScene.ts raised states + programme markers (lazy chunk; no React)
    programmeSites.ts    which markers stand where, derived from the dataset
    ProgrammeShape.tsx   a programme's plan outline, drawn flat for the legend
public/
  india-states.geojson   simplified state boundaries
src/assets/species/      one bundled photograph per species
scripts/
  postbuild.mjs          writes dist/404.html for static hosts
  images/                sources and licence-checks the species photographs
  promo/                 the promotional-video pipeline (see below)
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

## Promotional video

`npm run promo` builds a ~75-second, 1080×1920 (9:16) video of the site for
social media and for the project submission. It is a script, not a recording:
re-run it after changing the site and the video follows.

```bash
npm run promo                                    # uses the URL in scripts/promo/config.mjs
npm run promo -- --url https://your-url/         # bake a different address into the end card
npm run promo -- --no-voice                      # captions only
npm run promo -- --music path/to/track.mp3       # mix a royalty-free track under the narration
npm run promo -- --skip-record --no-build        # re-cut from the frames already captured
```

The output lands in `promo/` (git-ignored) together with the captured frames,
the narration audio and a `timeline.json` describing what happens when.

### What it does

1. **Speaks the narration** with [edge-tts](https://github.com/rany2/edge-tts)
   (free, no API key) and measures each line, so a section is never shorter
   than the sentence it has to carry.
2. **Drives a real browser** through the site with Playwright — the scroll-linked
   3D hero, a pan and zoom of the Leaflet map, a pin click through to a species
   profile, the Conservation mode's 3D sites view being switched on and turned,
   the species gallery's ring being dragged round, the search and the status
   filter, and the charts.
3. **Draws the captions and the closing card** in that same browser, using the
   site's own typefaces, and generates the end-card QR code offline from the
   public URL with the same `qrcode` library the site uses.
4. **Cuts it together** with ffmpeg: cross-dissolves between sections, captions
   faded in over the footage, narration laid on the timeline, fade to black.

No music ships with the repo, and none is added unless you pass `--music`.

### Why it looks the way it does

- **The mobile layout is recorded on purpose.** At 1080 px wide a desktop
  layout puts 14 px body text into a frame a phone shows at roughly 1:1, which
  is unreadable in a Reel. The page is driven at a 540×960 CSS viewport at 2×
  device pixels, which lands exactly on 1080×1920 with no rescaling — and it is
  what someone opening the link from Instagram would actually see.
- **Frames are captured one at a time, not screen-recorded.** `requestAnimationFrame`
  and `performance.now()` are replaced with a clock the recorder advances by
  hand, so motion is a pure function of the frame number: the same run always
  produces the same video, on any machine. It also keeps the hero alive — the 3D
  scene drops itself to the flat fallback when it measures frame times above
  32 ms, which a screenshot-per-frame recording would trigger immediately.

### Requirements

- `ffmpeg` with an H.264 encoder (`libx264`, or `libopenh264` on a
  patent-clean build such as Fedora's — the pipeline picks whichever is there).
- Chromium for Playwright: `npx playwright install chromium`.
- Python 3 for edge-tts. A virtualenv is created under `promo/.venv` on the
  first run if edge-tts is not already installed.
- A GPU helps: the hero renders about fifteen times faster than under
  SwiftShader. The pipeline falls back to software rendering automatically.

### Changing the video

`scripts/promo/config.mjs` holds the frame rate, capture geometry, voice and
palette. `scripts/promo/shots.mjs` holds the sequence — each shot carries its
own narration, captions and choreography, and is handed the exact number of
frames it must produce, so re-timing the narration re-times the choreography
with it.

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

### Species photographs

Every species carries one photograph, bundled in `src/assets/species/` rather
than hot-linked, so the atlas works offline and cannot suffer link rot.

They are sourced by `scripts/images/fetch-species-photos.mjs`, which is where
the provenance lives:

```bash
node scripts/images/fetch-species-photos.mjs --check   # report, change nothing
node scripts/images/fetch-species-photos.mjs           # download + write the manifest
```

For each species it reads the lead photograph of the species' English Wikipedia
article (or a file named explicitly in `OVERRIDES`, where the lead image is too
small or is a museum skeleton rather than a live animal), then asks Commons for
that file's metadata and **refuses anything that fails a check**:

- the licence must be public domain, CC0, or a CC BY / CC BY-SA version — no
  NonCommercial or NoDerivatives files, and no file with usage restrictions;
- the species must be named in the *file's own* title, description or
  categories, not merely in the article the file was reached through;
- a photographer must be recorded.

Every accepted file is then re-encoded to a consistent 1400 px width and
recorded in `scripts/images/photo-manifest.json` with its photographer, licence,
licence URL and Commons page. Those fields are copied onto the species entry in
`src/data/species.ts`, and `PhotoCredit` renders them everywhere the picture
appears — the gallery, the profile drawer — so no view can quietly drop the
credit the licences require.

The script also checks its species ids against `src/data/species.ts`, so
renaming a species fails loudly instead of orphaning a photograph.

### The hero silhouettes

The hero's species plates are **schematic silhouettes**, defined in
`src/components/home/speciesSilhouettes.ts` and drawn to a canvas atlas at
runtime. They are not photographs, scans or 3D models, and the interface says
so. This is deliberate: no openly-licensed 3D model of these twelve species
exists at a standard this project could cite — what museums have published
under open licences is skulls, skeletons and scans of taxidermy, and the rest
of what is freely available is stylised game art. Presenting either as a
depiction of, say, *Ardeotis nigriceps* would be exactly the sort of unsourced
claim the rest of the atlas avoids. A silhouette makes a weaker and therefore
honest claim: this is the animal's body plan and posture, at the level of
detail an outline can carry, drawn from the species' published description.

Each silhouette carries a `note` recording what it depicts. Features that vary
within a species are left out — the Asian Elephant is drawn without tusks,
because most Indian elephants have none.

### Replace a photograph

Either name a different Commons file in `OVERRIDES` in
`scripts/images/fetch-species-photos.mjs` and re-run it, or set the species'
`image` object by hand in `src/data/species.ts`:

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

If `src` is missing or the file fails to load, `SpeciesImage` falls back to a
generated placeholder tinted by IUCN status, so a missing picture degrades
rather than breaking the layout.

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
- Assessment history is **partial by design**. The Red List's published
  assessment history is not machine-readable, so a listing year is recorded only
  where a cited source states it outright — at present for 4 of the 12 species.
  The rest are shown as "not recorded" in the profile, the comparison and the
  timeline. An unchecked year would be indistinguishable on screen from a checked
  one, so none is guessed.
- Wikipedia was used only for orientation during research, never as the authority
  for a conservation status.

## Licence / attribution

- Code: free to reuse for educational purposes.
- Species photographs: © their individual photographers, used under the
  Creative Commons licence each one carries (CC BY, CC BY-SA, or public
  domain), via Wikimedia Commons. Photographer, licence and source page are
  shown beside every picture in the interface and recorded in
  `scripts/images/photo-manifest.json`.
- Basemap © OpenStreetMap contributors (ODbL).
- State boundary data: community open dataset (see Sources page).
- Not affiliated with the IUCN or the Government of India.

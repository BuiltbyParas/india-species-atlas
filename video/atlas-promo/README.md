# India Species Atlas — promotional film (Remotion)

A 97-second, 1920×1080, 30 fps motion-graphics film about the India Species
Atlas: **India → landscape → life → data → threats → conservation → the
Atlas → the system → the name.** The India map is the backbone — one map
layer runs under the whole film and the scenes move its camera and switch its
layers — the species are the emotional layer, the data is computed from
`src/data/`, and the product section uses screenshots of the real site.

It is separate from the website. `npm run build` never touches this folder;
the film only *reads* `src/data`, `src/geo/india.ts`, `src/theme.ts`,
`src/utils/*`, `src/components/map/programmeSites.ts` and
`public/india-states.geojson`. The older canvas documentary engine in
`video/src` and `scripts/video/*.mjs` is untouched; the two share only the
asset folder `video/public/`.

## Quick start

```sh
npm run video:data            # once: fonts, NOAA relief, Natural Earth, full-size photos
npm run video:promo:capture   # builds the site and screenshots the real interface (2×)
npm run video:promo:prep      # contours, rivers, outline, and the baked map rasters
npm run video:promo:audio     # optional: placeholder sound effects (-- --bed for a bed)

npm run video:promo:studio    # interactive preview — Remotion Studio, http://localhost:4477
npm run video:promo:still -- 12.5 40 77   # single frames (seconds) → exports/atlas-promo/stills/
npm run video:promo:contact   # one frame per second, tiled → exports/atlas-promo/contact-sheet.jpg
npm run video:promo:preview   # whole film at 720p → exports/atlas-promo/india-atlas-promo-preview-720p.mp4
npm run video:promo:render    # whole film at 1080p H.264 → exports/atlas-promo/india-atlas-promo.mp4
npm run video:promo:master    # 1080p ProRes 422 HQ master → exports/atlas-promo/india-atlas-promo-master.mov
npm run video:promo:qc        # checks a render: format, black spans, single-frame flashes
npm run video:promo:typecheck
```

`preview`, `render` and `master` accept `-- --scene <id>` to render one
scene, `-- --concurrency N` (default 1 — on the 6 GB laptop the film was built
on, two browser tabs thrash memory and run four times slower; raise it on a
bigger machine) and, through the Studio or
`--props`, a draft quality: `--props='{"quality":"draft"}'` drops the grain
and contour lines for fast timing checks.

`exports/` is git-ignored: renders are never committed.

H.264 comes from Remotion's bundled FFmpeg (libx264, CRF 16, `slow`). The
system FFmpeg on the build machine has no libx264, which is one reason
Remotion was chosen; the system FFmpeg is used only for QC and contact sheets.

## How it is built

| Part | File |
|---|---|
| **Timeline** — scene order and durations, the map's camera keys and layer fades, every scene's internal rhythm | `timeline.ts` |
| Design tokens — colours (from `src/theme.ts`), type scale, grid, easing (the site's curves) | `styles/tokens.ts` |
| The site's fonts, loaded before any frame | `styles/fonts.ts` |
| Real data: featured species, computed counts, threats, programmes, localities | `data/atlas.ts` |
| Geometry: the canonical GeoJSON through the site's projection | `data/geo.ts` |
| Site facts: public URL, taglines (from the site's own source) | `data/site.ts` |
| The map renderer (`AnimatedIndiaMap`), camera maths, map-sheet margin | `components/map/` |
| Kinetic type: mask lines, character reveals, tracking, labels, status chip | `components/type/Type.tsx` |
| Real-UI plates, browser frame, the site's cursor | `components/ui/UiPlates.tsx` |
| Grain and vignette | `components/fx/Finish.tsx` |
| Scenes, one file each | `scenes/S01Signal.tsx` … `scenes/S10Brand.tsx` |
| The product scene's script (plates, camera, cursor, clicks, captions) | `scenes/atlas-script.ts` |
| Audio cue sheet and player | `audio/cues.ts`, `audio/AudioBed.tsx`, `audio/README.md` |
| Compositions: the film, and each scene in context | `Root.tsx`, `compositions/AtlasPromo.tsx` |
| CLI, prep, capture, placeholder audio | `scripts/video/atlas-promo/*.mjs` |

Every frame is a pure function of time — no state, no unseeded randomness —
so rendering a frame twice gives the same picture, and any scene renders on
its own exactly as it does in the film.

### Timeline (seconds)

| # | Scene | Start | End |
|---|---|---|---|
| 01 | Black / signal | 0 | 5 |
| 02 | India emerges | 5 | 13 |
| 03 | The landscape | 13 | 24 |
| 04 | Life | 24 | 38 |
| 05 | The data | 38 | 49 |
| 06 | Threats | 49 | 59 |
| 07 | Conservation | 59 | 69 |
| 08 | The Atlas | 69 | 83 |
| 09 | System view | 83 | 90 |
| 10 | Brand reveal | 90 | 97 |

## Common changes

**Change the length or a scene's timing.** Edit `dur` in `SCENES`
(`timeline.ts`). Starts are derived, and everything that happens inside a
scene — camera keys, layer fades, audio cues — is written as
`at('scene', seconds)`, so it moves with the scene. A scene's internal pacing
is the constant block below `SCENES` (`LANDSCAPE.beat`, `LIFE.beat`,
`DATA.markersDur`, `THREATS.*`, `CONSERVATION.*`) and, for the product
scene, `scenes/atlas-script.ts`.

**Change the music.** Put a file at `video/public/promo/audio/music.wav`
(or `.mp3`). Effects go in `video/public/promo/audio/sfx/`. See
`audio/README.md`.

**Change the featured species or their photographs.** `FEATURED` in
`data/atlas.ts`: the species id, the landscape word, the region and habitat
(checked against the dataset at load — the film refuses to start if a
species is not recorded there), and the photo's focus point and crop.
Photographs come from `video/public/species/<id>.jpg` when present (full-size
copies of the site's credited Commons files, fetched by `npm run video:data`)
and otherwise from the site's own bundled copy. The credit shown on screen is
the dataset's `image.credit` and `image.license`.

**Change text.** Scene copy lives in the scene files. Factual text does not:
names, statuses, counts, threats, programmes, quotes and the URL are all read
from the data — change `src/data/` and re-render.

**Re-shoot the interface.** `npm run video:promo:capture` after the site
changes. It records element rectangles in `ui.json`; the cursor in
`atlas-script.ts` targets them by name (`atlas.pin`,
`profile-overview.tabThreats`), so it follows the layout.

## The map

There is one geographic source: `public/india-states.geojson`, the file the
site itself draws, imported directly into the film's bundle and projected
with the site's `project()`. It follows the political-map convention the site
uses — the north is a single "Jammu and Kashmir" feature that includes
Ladakh, so Ladakh is never outlined on its own; the Northeast and both island
groups are included. The outer outline the film traces is derived from the
same file. Relief and rivers (NOAA ETOPO1, Natural Earth) are clipped to it.
No web basemap and no other boundary dataset is drawn. Details and licences:
`SOURCES.md`.

## Other formats (9:16, 1:1, 4:5)

The map is resolution-independent (`AnimatedIndiaMap` takes any viewport,
and the camera's screen offsets scale with frame height), and every timing
lives in `timeline.ts`. A vertical cut would:

1. Register a composition at 1080×1920 in `Root.tsx`.
2. Add a `layout` to the timeline's camera keys (portrait framing puts India
   in the upper half: `ax: 0, ay: -360`, `z` about 0.75 for the whole
   country).
3. Give each scene a portrait arrangement — the scenes position text with
   the constants at the top of each file (`LEFT`, `PHOTO`, `X`), which is
   where a `useLayout()` switch would go.

This is not built yet; the 16:9 master was the priority.

## Honesty rules

- Facts are read from `src/data/` at render time and computed with the site's
  own helpers; nothing is typed in by hand. The few words that are
  interpretation rather than data are listed in `SOURCES.md`.
- The fragmenting map in scene 06 is a drawing device, and the scene says so
  on screen: threats are recorded per species, not per place.
- Lines joining a species' localities are a drawing device the site also uses
  (`smoothPath`); they are not ranges or corridors.
- Every photograph carries its credit and licence on screen.
- The interface is never redrawn: scene 08 shows real screenshots.

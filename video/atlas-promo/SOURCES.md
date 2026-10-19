# Sources and attribution — promotional film

Everything the film shows is either the India Species Atlas's own data and
interface, or a public dataset already in this repository. Nothing was
downloaded for the film except what the existing `npm run video:data` step
fetches (fonts, Natural Earth, NOAA relief, the same Commons photographs the
site credits). The YouTube references in the brief were used as references
for pacing and motion only; no footage, graphics, wording or assets from
them are used. The Bing map image mentioned in the brief is not used.

## Geography — one source

| Layer | Source | Licence | How the film uses it |
|---|---|---|---|
| India's states and outline | `public/india-states.geojson` — the site's one boundary file, built by `scripts/geo/build-india-states.py` from the India State and UT boundary layer (Jan 2020 update) plus Natural Earth's Shaksgam slivers | See `src/data/sources.ts` and the build script | Imported directly by the film's bundle (`data/geo.ts`), projected with the site's own `project()` from `src/geo/india.ts`. The outer outline is derived from the same file (shared borders cancel) by `prep-geo.mjs`. |
| Political-map convention | As on the site: the north is ONE feature, "Jammu and Kashmir", that includes Ladakh (and Shaksgam), so Ladakh is never drawn as a separate outline. Records naming Ladakh are drawn on that shape through `GEOJSON_STATE_ALIASES` (`src/utils/stateCounts.ts`). | — | No other boundary dataset is drawn. `video/public/data/world-borders.json` (used by the older documentary engine) is **not** used by this film. |
| Relief: hillshade and contours | NOAA ETOPO1 1 arc-minute Global Relief Model, via NOAA CoastWatch ERDDAP (`video/public/data/etopo-india.*`, 2 arc-minute subsample) | Free to use and redistribute (NOAA) | Contours traced at 300–6,000 m by `prep-geo.mjs` (d3-contour, 1-cell blur); hillshade computed in the browser (Horn's method, sun NW at 40°, heights ×4). Both clipped to India's outline. |
| Rivers | Natural Earth 1:10m rivers and lake centrelines (`video/public/data/rivers.geojson`) | Public domain | Projected by `prep-geo.mjs`, clipped to India's outline. |

The film uses **no web basemap**. The interface plates in scene 08 show the
site's own Leaflet map, whose basemap is Esri World Ocean Base (no national
or disputed boundary lines), as configured in `src/components/map/AtlasMap.tsx`.

## Species, threats, conservation

Read at render time from `src/data/` — `species.ts`, `threats.ts`,
`programmes.ts`, `regions.ts`, `statusInfo.ts` — and counted with the site's
own `src/utils/stats.ts`. Programme sites come from the site's
`programmeSitesFor()` (`src/components/map/programmeSites.ts`). Each entry's
own sources are listed in the dataset and on the site's Sources page.

On-screen text that is quoted from the dataset or the site:

| Where | Text | Origin |
|---|---|---|
| 06 Threats | "Collision with high-tension power lines crossing the Thar is now the single largest cause of mortality." | Great Indian Bustard `threatNote` (first sentence) |
| 09 System | "Mapping is not just about where species are. / It is about where we choose to protect them." | `src/components/cinema/ConservationMap.tsx` |
| 10 Brand | "Mapping endangered species. / Tracing the lines that shape survival." | `src/components/cinema/CinematicHero.tsx` |
| 10 Brand | builtbyparas.github.io/india-species-atlas | `scripts/promo/config.mjs` `PUBLIC_URL` |

Words the film adds as interpretation (no factual claim): "One country. Many
landscapes.", "Life, mapped.", the landscape words (each checked against the
featured species' recorded habitat or region in `data/atlas.ts`), "Know
where it lives. / Know what presses on it. / Know what protects it." (the
site's three map layers), and the scene-08 captions describing the
interface.

## Photographs

The five featured species' photographs are the same Wikimedia Commons files
the site uses, at larger size (`video/public/species/`, fetched by
`npm run video:data`; see `video/public/species/photos.json`). The credit and
licence are on screen with every photograph:

| Species | Photographer | Licence |
|---|---|---|
| Great Indian Bustard | Dr. Raju Kasambe | CC BY-SA 4.0 |
| Bengal Tiger | Tisha Mukherjee | CC BY-SA 4.0 |
| Ganges River Dolphin | Anant.wildlife | CC BY 4.0 |
| Greater One-horned Rhinoceros | Payamfarahani | CC BY-SA 4.0 |
| Snow Leopard | Irbis1983 | Public domain |

The tiger in the Atlas-scene plates is the site's own bundled copy of the
same Tisha Mukherjee photograph.

## Typefaces

Newsreader and Geist (Google Fonts), the site's own typefaces, under the SIL
Open Font License 1.1 (`video/public/fonts/*-OFL.txt`).

## Audio

None is bundled. See `audio/README.md`. The optional placeholder effects are
synthesised by `scripts/video/atlas-promo/placeholder-audio.mjs` (no samples,
no third-party material).

# Data sources for the promotional film

Everything the film draws from outside the atlas's own dataset is listed
here. Every file is fetched and processed by `npm run video:data`
(`scripts/video/fetch-data.mjs`). No coordinates are invented. Processing is
limited to clipping to India's surroundings (66–99°E, 5–38°N), rounding
coordinates to 0.001°, and subsampling the elevation grid.

| File | Source | Licence | Processing |
|---|---|---|---|
| `public/data/rivers.geojson` | Natural Earth 1:10m *Rivers + lake centerlines* (`ne_10m_rivers_lake_centerlines`) | Public domain | Lake centerlines dropped; lines clipped to the box |
| `public/data/roads.geojson` | Natural Earth 1:10m *Roads* (`ne_10m_roads`) | Public domain | Major highways and roads kept; clipped to the box; masked to India's outline when drawn |
| `public/data/etopo-india.bin/.json` | NOAA ETOPO1 1 Arc-Minute Global Relief Model (Ice Surface), via NOAA CoastWatch ERDDAP (`etopo180`) | Free to use and redistribute (NOAA) | Every second sample (2 arc-minutes, ~3.7 km), stored as Int16 metres |
| `public/data/etopo-himalaya.bin/.json` | As above | As above | Full 1 arc-minute for 75–80.5°E, 30–35.5°N |
| `public/fonts/*.woff2` | Newsreader and Geist (Google Fonts), the site's own typefaces | SIL Open Font License 1.1 (texts beside the fonts) | Basic Latin subset |
| `public/species/*.jpg` (fetched, not committed) | Larger renditions of the same Wikimedia Commons files the atlas already credits | Per photo; see `public/species/photos.json` | None; the film crops and grades them, credited on screen |

The film also reads the atlas's own `public/india-states.geojson` (state
boundaries) and `src/data/species.ts` (status, localities, threats), without
modifying them.

## What the film draws that is *not* data

These are drawing devices. Each is labelled on screen wherever it sits on a
map and could be mistaken for data:

- The power line across the Thar in the bustard map (*illustrative*). No
  power-line dataset is used.
- The links between tiger reserves (*illustrative*). They are not corridors.
- The breaks in the river network in the dolphin map (*illustrative*, not
  barrage positions).
- The close-up line, pylons, road and water shots, which are
  computer-generated illustrations, and the snow and haze.

## Considered and not used

- **SRTM15+** (15 arc-seconds) would give sharper Himalayan ridges. Its
  licence limits use to educational, research and non-profit purposes, so
  it is not used here, to keep every layer free to redistribute.
- **WDPA protected-area polygons**: the licence restricts redistribution.
  Protected areas appear as the atlas's own named localities instead.

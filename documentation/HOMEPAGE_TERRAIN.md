# Home page terrain — the relief on real elevation

11 October 2026 · branch `atlas/master-04-visual-quality` · uncommitted

The hero's relief of India used to be the boundary file extruded into a flat
slab 0.09 units thick. It now stands on NOAA's ETOPO 2022 elevation model: the
Himalaya, the Western Ghats escarpment, the Deccan, the Aravallis and the
north-east hills are the data's, lit from the north-west as a cartographer
lights a sheet, with contours every 500 m. Nothing else about the home page's
structure changed: the same title hung on the Tropic of Cancer, the same
captions, the same camera descent to Desert National Park, the same probe and
the same hand-off into the atlas.

## The data, and what the page claims

| | |
|---|---|
| Source | ETOPO 2022 15 Arc-Second Global Relief Model, NOAA NCEI, doi:10.25921/fd45-gt74 |
| Read through | CoastWatch ERDDAP, a 1′ subset (every 4th 15″ cell) over 6.0–37.6°N, 67.6–97.8°E |
| Licence | Free to use and redistribute; not intended for legal use (NOAA) |
| Grid | 604 × 632 cells of 3′ (~5.5 km), each the mean of 3 × 3 one-minute samples |
| Extent | India from `public/india-states.geojson` plus two cells; 0 m elsewhere; the sea clamped to 0 m |
| Files | `public/relief/india-relief.bin` (147 KB, int16 planar-predictor residuals, zlib) and `india-relief.json` (provenance) |
| Rebuild | `node scripts/geo/build-relief.mjs [--nc file] [--arcmin 3]` |

On screen the margin note reads "Relief of India · ETOPO 2022 elevation (NOAA),
heights ×20", the key gives the tint's range and the contour interval, and the
screen-reader description says the same. Heights are exaggerated twenty times,
as a relief model's are, and the page says so. The highest cell inside the
boundary is 6,688 m on the K2 massif — a 3′ mean, not the summit — and the probe
gives heights to the nearest 10 m with "≈" for the same reason. If the model
fails to load, the scene falls back to the old slab and the note reverts to
"drawn from one file of state boundaries"; it never claims elevation it does not
have (`data-relief` on the stage).

The contours, the tint and the shading are all derived from the grid. Nothing
in the relief is procedural noise.

## Architecture

- `heroRelief.ts` — loads and decodes the grid (`DecompressionStream`, no canvas
  read-back, so fingerprint protection cannot scramble it); `metresAt`;
  `shadeRelief` for the flat hero; the hypsometric palette and
  `RELIEF_EXAGGERATION`. No three.js, so the flat hero can import it.
- `heroTerrain.ts` — the ground mesh (nodes every 6′, every 9′ on phones and the
  low tier, tent-filtered from the 3′ grid; quads split along the flatter
  diagonal), the walls from the simplified rings down to the sea, state lines
  draped on the ground, the packed height texture (metres, gradient, Laplacian
  as RGBA half floats), the boundary mask and the soft contact-shadow mask.
  `groundAt`, `metresAt` and `onLand` for everything that stands on the ground.
  The slab path is kept intact as the fallback.
- `heroScene.ts` — the ground shader (Lambert plus hooks): the mask cuts the
  outline with alpha-to-coverage on the multisampled target; one texel gives
  height, slope and curvature; tint, curvature shading, contours, per-pixel
  normals. The rise (`uLift` × the light front) is applied in the vertex shader
  to the ground, the walls' top edge and the draped lines together. Markers,
  stems, focus rings, the tropic and the probe read the same ground; the probe
  ray-marches the heightfield.

## The sequence

1. **Arrival** (first visit, as the loader clears): the north-to-south light
   front draws the state lines and the contours, the land is lit a little
   behind it, and the ground rises out of the sheet behind that — the map
   becomes terrain. The title, lede and plate follow on their existing timings.
2. **Rest**: the camera is still (the scene renders only when something changes).
   The opening pitch is a little lower than before (1.12 rad, was 1.24) so the
   relief reads as an object on a table; the title is still measured onto the
   tropic every frame.
3. **Descent** (scroll): unchanged path. The key light swings from the
   north-west to a low western side light and warms, so the ground the camera
   comes down to is side-lit, not back-lit; the fill rises with it.
4. **Hand-off** to the atlas: the relief lies flat (`uLift` → 0) as the camera
   goes straight down, then the sheet takes over.

## Background theme

The three ground tokens moved to mineral charcoal: `forest-950` #0e1411 →
#0b0e0c, `forest-900` #131a16 → #111612, `forest-800` #1a231e → #171c17
(`index.css` and `theme.ts`). Text colours and the lighter steps are unchanged.
The 3D surround already lands on the new ground (corner pixels 11,14,12 against
the page's 11,14,12). Other routes compared before/after at 1440 × 900 were
pixel-identical at 4 % tolerance, with the same headings and link counts.

## Fallbacks

- Reduced motion, no WebGL, or a device that cannot hold the frame rate: the
  flat hero, now with the same grid shaded into a printed relief (light from the
  north-west at 35°, the same tint), clipped to the boundary and captioned
  "Shaded relief · ETOPO 2022 elevation (NOAA)".
- Context loss: tested by forcing `WEBGL_lose_context`; the hero drops to the
  flat layout with no errors.
- No `DecompressionStream`: the slab relief.

## Cost (measured, this laptop, integrated AMD GPU, live wallpaper running)

Production builds, 1440 × 900, wheel-scroll through the descent, three
interleaved runs per variant, frame intervals from `requestAnimationFrame`:

| | entrance | descent |
|---|---|---|
| before (slab) | 60 fps | 56.1–57.4 fps |
| after (terrain) | 60 fps | 55.4–56.3 fps |

A 3′ mesh (245k triangles) first measured 53–54 fps under the same load: its
triangles averaged two or three pixels each. The 6′ tent-filtered mesh (64k)
closed the gap and also reads better at the low pass. Whole frame in dev
(`renderer.info`, scene and post passes): 22 draw calls, 90k triangles (64k of
them the ground) at 1440 × 900; 51k on a phone (9′ mesh, 30k ground); 8
textures, 15 geometries, 19 programs; JS heap ~73 MB. The hitch at the
very end of the descent (scrollY ≈ 2,300, up to 100–133 ms) is in the old build
too. Phone figures are emulation on this laptop's GPU, not a real phone.

## Known limits

- 3′ cells: individual peaks are averaged away; the contours are smooth at
  country scale, not survey contours.
- The coastline is the boundary file's (simplified to ~3.9 km), not the model's
  0 m line.
- The elevation source is listed on `/sources` under "Home page terrain" (name,
  NCEI, DOI and official-page links, the ×20 exaggeration, the derived-file and
  own-rendering caveats, and that NOAA does not vouch for boundaries, species or
  status). The page note and `india-relief.json` carry the same citation. The
  licence line above is from NOAA via the sidecar; it is deliberately not
  repeated on `/sources`.
- Dev only: `window.__heroScene.info()` (whole-frame render statistics) and
  `?meshstep=1|2|3`.

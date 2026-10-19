# The species, read — immersive species editorial (18 Oct 2026)

The home page's Chapter 02 field studies (`#field-studies`, `FieldStudiesIndex.tsx`) used to hold each of the five
species for one screen: the world, the name, one summary sentence, status and anchor. There was almost nothing to
read. Each study is now a held world followed by an article that rises over it in the page's own flow.

## The grammar

Every study reads in the same order (`src/content/speciesReading.ts`):

| Beat | What it carries | Where the words come from |
| --- | --- | --- |
| Arrival | world, name, scientific name, place, status, footage plate | unchanged composition |
| 01 Encounter | the animal in its ground | record sentences found by phrase (`sentenceWith`) |
| 02 Adaptation | one adaptation, behaviour or ecological need | record sentence; the snow leopard's are Snow Leopard Trust quotes (already cited in `content/encounter.ts`) |
| 03 Field note | the population figure: value, scope, survey years, method, caveat, linked source; the snow leopard's altitude band | `species.population`, `habitatBand` |
| 04 Threat | the threat note and the record's threat categories | `threatNote`, `majorThreats` |
| 05 Conservation | actions, Red List category in plain words with assessed/published years and the IUCN DOI, status history, programmes | `conservationActions`, `STATUS_INFO`, `statusHistory`, `PROGRAMME_BY_ID` |
| 06 Reflection | why it matters; links into the study and the profile; “The full record” (`<details>`: description, protected areas, all sources, what the atlas does not hold, photo credit) | `whyItMatters` etc. |
| Bridge | one line into the next ground, ruled in the next study's line colour | the only editorial prose, each line checked against both records |

Headings and bridges are the only words written for this pass. If a record is rewritten and a sentence is gone, the
beat shows nothing rather than a remembered claim. No coordinates are printed anywhere in the reading (the bustard's
stay withheld; the data-integrity check still passes).

Per-study pacing (`reading.css`): grassland — beats ruled like horizons, `--gap 24svh`; mountain — the slowest,
`38svh`; river — column set out into open water, `32svh`; forest — narrow, close column, `20svh`; floodplain — the
heavier weight of its name carried into the titles, `26svh`.

## Motion

- Native vertical scroll only; nothing pins beyond the stage's existing `position: sticky`. The article is in the DOM
  (headings h3/h4, real lists, `<figure>`/`<blockquote cite>`), never in the canvas.
- Phase 3 (reading) — the composition steps back, a veil of the world's own ground settles behind the column, the
  footage plate closes. Phase 4 (after) — the bridge has gone up; the veil lifts and the world is alone for a moment
  before the next study turns in (this fixed a collision between each bridge line and the next name).
- The camera leans in as the article is read: `engage` = smoothstep(read) × 0.66, the same validated preview→engage
  lean the hand gives on hover (so the tiger's camera stays on its two hover-tested shots and never reaches the path).
  Off with reduced motion.
- The river is read from under its surface (`.fs-depth`): turbid, silt-laden water — the Ganga and Brahmaputra are
  not clear rivers, so not blue-green — with drifting silt; the surface light rises out of frame with the reading.
  A drawing, compositor-only (transform/opacity), still with reduced motion.
- Beats reveal once, in small staggered groups, as they come into view (≤ 0.9 s, starting 8 % below the fold). No
  reveal with reduced motion.

## Navigation and accessibility

- The list (desktop) shows the active study's six beats with an emerald reading rail; each beat is a link that scrolls
  to it; `aria-current="step"` on the beat being read. On a phone the list's foot row hides while reading; each beat's
  label carries its number.
- “Skip the field studies” link at the section's start (visible on focus) jumps to Chapter 03.
- The composition's name is no longer an `h3` (the article's title is the study's heading); it stays the way in.
- Without WebGL the flat photograph ground stands behind the same reading.

## Checks

`scripts/audit/read-walk.mjs` walks every arrival, every beat, every hand-over, the exit into Chapter 03 and back up:
study on screen, reading state, the list's marked beat, text present in every beat, video count, sideways overflow,
console errors, failed requests. `read-nav.mjs` checks return from a study, `/#field-studies`, Tab/Enter through the
beat links, focus ring and the skip link. `read-perf.mjs` records frame intervals while wheel-scrolling and holding.

Results, 18 Oct 2026 (production build unless noted): read-walk 53/53 at 1440 (dev), 1920, 390 touch, reduced motion
and no WebGL (dev); read-nav 7/7; fos-walk (updated to measured arrivals) unchanged from baseline, one `<video>` at a
time; route sweep 100/100; data-integrity 10/10; typecheck and build pass; lint: only the pre-existing
`video/src/scenes/himalaya.ts` parse error. Protected `stage.ts` / `useFieldStage.ts` hashes unchanged
(32cd817f… / d78d47f5…).

Frame rate, 1440×900, GPU headless, alternating builds: holding a study's arrival 60.0 fps before and after; wheel
through the first six screens 44.1 / 42.3 fps before (four world turns) vs 47.5 / 51.4 after (one world, reading);
the whole new section, 31 screens with all four turns, 53.5 fps, p95 33 ms.

Fixed during verification: the list dropped the active study's beats while another entry was hovered, re-centring
under the pointer so a click missed (the pre-change build navigated; now it does again); the skip link jumped by
gliding and is now immediate.

## Cost

The section is longer: about 32 screens at 1440×900 (was 6). The reading is the point of the pass; the list's beat
links and the skip link are the ways through it.

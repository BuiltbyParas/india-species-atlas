# Visual bible — India Species Atlas

What the site looks like and why, as built (12 October 2026, `atlas/master-04-visual-quality`). Where a rule is
enforced in code, the file is named. Decisions and the evidence behind them: `LUSION_LEVEL_PASS.md`.

## 1. Premise

**One relief of the subcontinent at night, read by a single low lamp.** The land is the subject: India's ground,
its neighbours' and the sea floor, from NOAA's ETOPO 2022 model, exaggerated ×20 and saying so. Light does the
modelling — a raking lamp casts the mountains' shadows across the plains — and the atlas's lines (state boundaries,
the Tropic, the species' threads) are drawn on that ground. The page is the room the relief stands in: dark grounds
in a family of hues, ivory type, one warm accent.

Not: a SaaS landing page, a dashboard, neon, glass, a planet in space, a game map.

## 2. References (principles taken, nothing copied)

Lusion (lusion.co, Of the Oak, Zero Tech, Synthetic Humans, Infinite Passerella), studied live with the GPU on:
the camera stands *in* a world; one dominant light, most of the frame allowed to fall into shadow; the subject fills
the frame; atmosphere carries scale; type is large and simple and sits in negative space; one event, then rest.

## 3. Typography

| Role | Face | Where set |
|---|---|---|
| Display, narrative | Newsreader (opsz 6–72, 200–700, italic) | hero title, chapter titles, captions |
| Interface | Geist (300–700) | navigation, controls, body copy |
| Instrument | Geist Mono (400, 500) | coordinates, keys, catalogue numbers, margin notes |

All SIL OFL, from Google Fonts (`index.html`). Hierarchy: the hero title is the largest thing on the page and is hung
from the Tropic of Cancer — the baseline of "Species" sits on the parallel the scene reports (`onMarks` →
`--tropic-y`). Display type light (300) with negative tracking; mono small, tracked +0.06–0.08 em, at 40–60 %
ivory. Reveals: word masks (`RevealText`); the hidden state sits below the mask by the box **plus 0.32 em**, so tight
display leading never leaves glyph tops waiting in the mask.

## 4. Colour

Page grounds (`src/index.css` `@theme`): night `#0b0e0c` (hero, Ch. 02), canopy, umber (Ch. 04 pressure), riverbed
(response), slate (closing). Ink: canvas `#e8e1cf` and its alpha scale. Accents: amber `#d6a25e` (a locality, a
figure that matters), contour sienna `#b07a52`, river `#7ea3b5`.

The relief (`heroScene.ts`, `heroRelief.ts`):

| Element | Value | Rule |
|---|---|---|
| India's ground | hypsometric tint, 0 → 5,500 m: `#2c3a2c` … `#ddd8ca` | close in value; the light models, the tint says height |
| Neighbours' ground | one neutral stone (luma of the 600 m tint) × 0.6 | form kept, colour withheld — an atlas prints neighbours grey |
| Water | `#1c2f3a` on the shelf → `#04090d` in the abyss, floor shaded by its slope | night water; per act, Ch. 04 retints it from the act's sea colour |
| Lamp | ember `#ff9d5c` at the horizon → warm `#ffd9a8` → key `#fff0d6` above ~25° | warm direct light |
| Sky fill | `#6f8ea8` over `#0a0806`, 0.3 | cool shadows, so the lamp reads as light rather than brightness |
| Grade | exposure 2.4 (×0.8 down the descent), saturation 0.82, ACES | exposure *before* the tone curve; ACES's toe otherwise crushes the dark ground |

## 5. Light

One key, the **lamp**: a directional light with real cast shadows over the relief (`heroLight.ts`, a heightfield
shadow worked out on the elevation grid) and sky occlusion in valleys. Rest: azimuth 295° (WNW), 12° up — low enough
to rake. The hand swings it ±46° across the north and ±8° in height; it never comes round to the camera's side,
where it would flatten the ground. Down the descent it settles into the west at 17°. A dim cool rim stays as fill.

## 6. Materials

Matte ground (Lambert, normals per pixel from the height texture, curvature shading from its Laplacian). Water: level
surface, depth tint, a tight glint plus a broad sheen where the lamp is not shadowed, Fresnel sky sheen at grazing
views. Markers: emissive cores with a halo that fades to its own silhouette (no visible edge for the bloom to trace).
Lines: ivory at 17–40 % over the lit ground; contours at 17/30 % over the regional relief.

## 7. Composition and camera

- Opening (wide): three-quarter view from due south, 46° up, 24° lens, the subcontinent filling the right two-thirds,
  the Himalaya a range across the top third, the title over the Arabian Sea. Shift right 0.40 of the half-frame at
  16:9 and wider, 0.44 at 1.4:1 (`OPENING_REGION`).
- Portrait: the country in the upper frame, title and lede below (existing drop logic).
- Entrance: plan view (where the loader's outline lands) → tilt into the three-quarter view as the lamp rises.
- Descent: as before — country, region, then low over the first species' locality (Desert National Park).
- Edges of the data never show: the grid sinks to black over its outer 16 % and the open sea beyond is black.

## 8. Motion

Eases (`index.css`): `--ease-out-expo` (arrivals), `--ease-cinema` (rules, plates), `--ease-emphasis`. Durations:
quick 180 ms, reveal 900 ms, draw 1.6 s, cinema 2.4 s. Physical responses use the one spring
(`interaction/spring.ts`), named tunings; the lamp is `SPRINGS.lamp` (k 42, c 10.1, ζ ≈ 0.78). Scroll-driven values
are position-derived and reverse exactly; the scene damps its own copies by time, not frames.

## 9. Interaction principles

The pointer is a lamp and a survey instrument: moving it turns the light (shadows swing), hovering the ground reads
its coordinates and its height — or the sea floor's depth — and snaps to a lit locality. Nothing interactive exists
only for the cursor: every control is a real link or button with focus styles; touch gets no cursor and no lamp swing.

## 10. Assets

No generated or invented imagery. Species photographs are the dataset's licensed Wikimedia files, credited; field
studies' animals are cut-outs of those photographs, labelled. The relief is measured data (ETOPO 2022), stated on the
page with its exaggeration. Silhouettes, where used, are labelled schematic.

## 11. Responsive and accessible

Captured at 1920 × 1080, 1440 × 900, 1280 × 800, 1024 × 768, 768 × 1024, 390 × 844. Reduced motion and no-WebGL show the
flat shaded relief (India's 3′ grid) and stacked chapters. Screen readers get a description of what the relief is
built from and how it is lit.

## 12. Performance constraints

Target: the author's laptop (integrated AMD GPU, ~5.7 GB RAM). Render on demand; the shadow pass only when the lamp
moves (≈0.6 ms GPU at half the grid's resolution; 1.4 ms at full); no permanent loop. Measured costs are in
`RENDERING_ARCHITECTURE.md` §8.

## 13. The field studies (12 October 2026, `FIELD_STUDIES_VISUAL_PASS.md`)

The same premise at ground level: **each habitat is one place at one hour, read by one low sun**, with the
homepage's light model (heightfield shadows cast by what is drawn, sky occlusion), its tone curve (exposure → ACES)
and its register (dark grounds, ivory type). The hours are chosen per habitat so the five are not recoloured copies:

| Study | Hour | Key / fill | Grade |
|---|---|---|---|
| Mountain | first light | gold `#ffb46e` at 4–11° from the east / sky blue `#6f94d6` | cool, warm highlights |
| Grassland | last light | orange `#ffae66` → `#ff8a45`, 4° → 2°, behind the subject / violet sky `#7a83ad` | warm, rose sky |
| River | sunrise | `#ffc684` 6–11° ahead-right over water / grey-blue `#8a9cb4` | neutral, glitter blooms |
| Forest | mid-morning | `#ffd9a0` ~32° behind, through the canopy / green shade `#6f8a76` | green shadows, warm shafts |
| Floodplain | storm break | `#ffc078` 6° under the cloud edge, behind the camera / slate `#56606e` | contrast up, slate sky |

Rules: the photograph takes the world's light (never the reverse) and says so on the page; the hand moves the sun a
few degrees — a mouse by moving, a finger by dragging sideways, the keyboard by the "Light" line in the study's
furniture (`FIELD_STUDIES_POLISH.md`); type stays in the darker part of the frame; veils fade long before their edge.
A phone held upright gets its own framing where a shot needs one (`Shot.narrow`): the subject whole, in the band
between the words above and the title below. Crowns seen from above are sprays of small leaves, domed, at varied
heights over a midstorey; a storm sky is a billowed deck lit from beneath its sunward edge over a scud layer — 2D
sheets, not volumes. Grounds and lines per
study are in `src/components/field/field.css` (top) and `src/index.css` (`[data-env]`).

Whole-experience review (`WHOLE_EXPERIENCE_REVIEW.md`): where a chapter faces the low sun the words still read — a
graduated filter over the river's sky (darkest at the top, nothing over the water), a halo of the world's own dark close
round chapter text and notes (invisible over dark ground), and on phones the chapter band laid twice. A subject is drawn
at its photograph's own value under the world's light, not brighter: the rhinoceros's gain was 0.48 (luminance ≈ 193
against the photograph's 164), now 0.30 (162).

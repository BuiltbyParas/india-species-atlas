# Final creative-director audit

Branch `atlas/final-polish`, cut from `atlas/spatial-world` at `393f5ef`. Audited on 8 Oct 2026, before any change. The fixes follow in the same branch, and the scores after them are given where they moved.

**Method**

- Every route was walked as a reader, using scroll tours at:
  - 1440 × 900 and 390 × 844, with eight evenly spaced frames per route;
  - 768 × 1024 and 1024 × 768, with four frames per route.
- The menu was captured open and closed on desktop and phone.
- The QA matrix covered 1920, 1440, 1280, tablet, 430 and 390, plus reduced motion on desktop and phone.
- Idle frame counting and scroll frame timing were measured against the baseline build, served side by side on a second port.

**The bar**

The brief set the bar as "would someone who builds digital experiences for a living see a serious maker here?" The rule from every earlier phase still holds: enhance, do not reinvent. A score below 8 has a finding beside it.

---

## 1. Scores (1–10)

Columns:

- **Vis** visual design
- **Int** interaction
- **Mot** motion
- **Typ** typography
- **Dep** spatial depth
- **3D** 3D quality
- **Sto** storytelling
- **Use** usability
- **A11y** accessibility
- **Perf** performance
- **Resp** responsive behaviour
- **Orig** originality
- **Pol** commercial polish

| Route | Vis | Int | Mot | Typ | Dep | 3D | Sto | Use | A11y | Perf | Resp | Orig | Pol |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` documentary | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 8 → **9** |
| `/atlas` | 8 | 8 | 7 | 8 | 7 | — | 7 | 9 | 8 | 8 | 8 | 7 | 8 |
| `/species` directory and gallery | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 8 | 7 → **8** |
| `/species/:id` | 9 | 8 | 8 | 9 | 8 | — | 9 | 8 | 9 | 8 | 8 | 9 | 8 |
| `/compare` | **5 → 8** | **5 → 8** | 6 → 7 | 7 | 7 | — | **5 → 8** | 7 → 8 | 8 | 9 | 8 | **4 → 8** | **4 → 8** |
| `/conservation` | 8 | 8 | 8 | 8 | 7 | 7 | 8 | 8 | 8 | 8 | 8 | 7 | 7 |
| `/documentary` | 8 | 7 | 8 | 9 | 7 | — | 8 | 8 | 8 | 9 | 8 | 8 | 8 |
| `/about` | 7 → 8 | 6 → 7 | 7 | 8 | 6 | — | 7 → 8 | 8 | 8 | 9 | 8 | 6 → 8 | **5 → 8** |
| `/sources` | 8 | 7 | 7 | 8 | 6 | — | 7 | 9 | 9 | 9 | 8 | 7 | 8 |
| Footer, on every page | **5 → 9** | 5 → 7 | 4 → 8 | 6 → 9 | — | — | **3 → 9** | 8 | 8 | 9 | 8 | **3 → 9** | **3 → 9** |
| Menu | 9 | 9 | 9 | 9 | 8 | — | 8 | 9 | 7 → **9** | 9 | **5 → 9** (phone) | 9 | 9 |
| Empty and error states | **4 → 8** | 6 | 5 → 7 | 5 → 8 | — | — | 4 → 8 | 7 → 8 | 8 | 9 | 8 | **3 → 8** | **4 → 8** |
| Route transitions and journeys | 9 | 9 | 9 | 8 | 9 | — | 9 | 8 | 9 | 8 | 8 | 9 | 9 |

---

## 2. Findings, worst first

### Fixed in this pass

1. **The site ended on a generic footer.**
   - The last thing on every page was a paragraph, a link row and a line of small print.
   - The documentary's own finale was followed by exactly that.
   - Nothing said who made the atlas.
   - **Now a colophon**, closing every page:
     - **A survey line** with a tick for each species' anchor locality, placed by longitude and coloured by status (data-derived).
     - **A statement:** "A digital field study of 12 threatened species, drawn on one sheet of India."
     - **A signature:** "Designed and built by Paras Attri", underlined by the survey line, which is drawn last.
     - **A colophon block:**
       - set in (Newsreader for the narrative, Geist for the data);
       - drawn on (one equirectangular sheet corrected at 22°N);
       - built with (React, three.js / WebGL, canvas and SVG, GSAP);
       - data (species, localities, citations and the last-checked date, all computed).
2. **Authorship read as "student project".**
   - The About page's subtitle and its "maker" chapter, and the footer's small print, led with "student project for an … assignment".
   - That is true, and it is kept: the origin is still stated on About and in the colophon.
   - It no longer leads. The page now says who designed and built the atlas, and what was made for it, before where it began.
3. **The phone menu was clipped.**
   - The labels were sized by viewport height alone, so at 390 × 844 "Conservation" ran out of the screen.
   - The figures ("52 localities") were pushed off the right edge.
   - The active-section dot wrapped onto its own line.
   - Because the list was centred with `align-content: center`, its top ("Atlas") sat under the header.
   - **Fixes:**
     - labels are capped by width;
     - figures stack under the label on phones;
     - the list uses `safe center`;
     - the active mark is now a survey ring.
4. **`/compare` opened on a generic empty state.**
   - It showed a dashed box reading "Nothing selected yet", a native `<select>` and a "Browse the directory" button.
   - It was the weakest first impression on the site.
   - **It now opens on the sheet itself:**
     - India, with every species' anchor locality as a survey mark;
     - hover or focus shows the name, status and coordinates, and a click starts the comparison;
     - beside it, the three pairs that share the most states of record, computed from the dataset;
     - the select is a ruled field, not a box.
5. **Empty and error states were generic.**
   - **No results** (directory) and **404:** these were dashed boxes. They now use `EmptySheet`, the outline of India with a dashed survey ring that found nothing.
   - **Missing photograph:**
     - **Before:** a Lucide animal icon in a circle.
     - **Now:** a field card with crop marks. It reads "Photograph unavailable" and gives the name and anchor coordinates. It never pretends to be a picture.
   - **Slow photograph** (documentary scenes, most visible on phones):
     - **Before:** an empty dark box until it loaded.
     - **Now:** the frame shows a faint survey graticule and the print fades up when it decodes. A photograph already decoded is never hidden, so journeys that hand a photograph over are unaffected.
6. **The working pages had no running head.**
   - The documentary's header names the chapter on screen; the working pages showed only the wordmark.
   - The header now carries the route's caption, the same words the page transition shows (for example "Species 06 of 12 — Gharial", "Compare — Side by side").
7. **Idle pages never went idle.**
   - ScrollTrigger keeps an empty `requestAnimationFrame` loop alive while it is enabled, as a Firefox repaint workaround. This was noted but left unfixed in the interaction phase.
   - It ran at 60 fps on every working page, though only the documentary creates triggers.
   - It is now enabled only while the documentary is mounted, through a reference-counted hold taken in a layout effect, before the scenes' effects create triggers.
   - **Measured idle callbacks** on `/atlas`, `/about`, `/compare` and `/species/:id`: **about 60 a second → 0**.
8. **Closing the menu dropped focus to `<body>`.** This was pre-existing; the baseline build does the same. Focus now returns to whatever opened the menu. Navigating from the menu still hands focus to the new page's `main`.
9. **The locality register waited for points off screen.**
   - On tablets and phones the register's rows stayed blank for up to 1.4 s.
   - The cause: the register waited for the map's points to draw so that it could lift them off, even when the map was not on screen and no flight could play.
   - It now writes the rows at once in that case.
10. **Hand-styled buttons.** About and the presentation panel carried their own button utility stacks. They now use the site's `cta`, `text-link` and `buttonClasses`, with magnetic pull and press compression from the interaction engine.

### Reviewed and kept

- **Hero, loader, cursor, transitions and journeys.** These already carry the signature: calibration, survey reticle, line → sheet, camera descent and ascent. A change for its own sake would have cost continuity. No defect was found.
- **The documentary's rhythm.** The tour shows it already alternates: quiet (title) → build (descent) → reveal (bustard shutter) → hold (scenes) → transition (dome) → climax (conservation) → silence (finale). It was not re-timed.
- **Atlas filters.** The FILTER → MAP grammar already fades and shrinks markers, fades threads and eases the view. It is unchanged.

### Still open, judged honestly

- **`/conservation`'s programme list** is a two-column grid of text blocks. It is legible and sourced, but it is the most "website-like" stretch left (originality 7). A stronger treatment would be a timeline sheet, which needs design time rather than a polish pass.
- **`/atlas`** keeps Leaflet's controls and attribution. They are restyled but recognisable, and are kept deliberately: the working map's credibility depends on standard affordances.
- **`/about` and `/sources`** are typographic pages with little depth. That is appropriate to their job.
- **On a phone, `/compare`'s marks** in the Western Ghats sit close together, and their 44 px hit areas overlap. The ruled select directly above lists every species by name, so no species is unreachable.
- **Main bundle.** Gzipped, it is 170.3 kB of JS (baseline 170.0 kB, +0.3 kB) and 36.3 kB of CSS (baseline 35.0 kB, +1.4 kB). GSAP and React dominate. Splitting the documentary's GSAP out of the entry would help first load on the working pages. It is a structural change and is left for a later phase.

## 3. Cheapness audit

| Pattern | Where it was | Now |
|---|---|---|
| Generic footer | every page | colophon with a data-derived survey line and signature |
| Generic empty box | `/compare`, directory, 404 | the sheet, survey marks, the empty survey ring |
| Generic icon placeholder | missing photographs | field card with crop marks and coordinates |
| Generic native select (boxed) | `/compare` | ruled field |
| Hand-written button stacks | About, presentation panel | the shared CTA, text-link and button system |
| Clipped type | phone menu | width-capped labels, stacked figures |
| Filled dot as "active" | menu | survey ring |
| Empty dark box while loading | documentary photographs | graticule, then the print develops |

No new effect was added for its own sake. Nothing uses gradients for decoration, glitch, blobs, particles beyond the existing hero dust, or a horizontal scroll.

## 4. Scientific integrity check

- **Colophon:**
  - longitudes from `distributionPoints[0]`;
  - status colours from `status`;
  - localities, citations and the last-checked date summed from the dataset;
  - the citation count matches `/sources`.
- **Compare pairs** are ranked by the count of `states` the two species share, and the label states exactly that.
- **The missing-photo card** says "Photograph unavailable"; it shows no stand-in image.
- **The empty-sheet ring** sits at the sheet's middle and is described in code as a search mark, not a place. It carries no label that could be read as a location.

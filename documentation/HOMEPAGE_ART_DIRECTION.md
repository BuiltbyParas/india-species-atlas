# Home page — art direction pass

11 October 2026 · branch `atlas/master-04-visual-quality` · uncommitted, on top of
the terrain and scroll-transition passes (`HOMEPAGE_TERRAIN.md`,
`HOMEPAGE_SCROLL_TRANSITIONS.md`).

This pass is about the parts of the home page that are not the hero, the descent
and Chapter 02. Those three are protected (scope map below) and were not
redesigned.

---

## 1. The page as it stood (audit, 1440 × 900, 1920 × 1080, 1280 × 800)

Baseline captures were taken on the dev server with the GPU on (scratchpad
`base/`), forward scroll through 24 positions at 1440 × 900, 9 each at the other
two sizes. There were no console errors.

| Section | Verdict | What the captures show |
|---|---|---|
| Hero, descent | successful | Protected. |
| Hero tail → Ch. 02 | functional | A straight seam where the hero's lit ground ends (14,18,16 → 11,14,12), under the region loop. |
| Ch. 02 *The species* | successful | Protected. |
| Ch. 02 → field studies | unfinished | A hard horizontal line where the world arrives. The canvas is feathered, but the DOM scrim over it (`.fs-scrim`, a cream wash on light worlds) is not, so its square edge prints across the screen. At 1920 × 1080 it reads as a grey band. |
| Field studies | successful, one defect | The same unfeathered scrim cuts a hard line where the rhinoceros hands over to Ch. 03. |
| Ch. 03 *The selection* | unfinished | A copy of Ch. 02's card, word for word in layout: numeral, statement, two counters. The right half of the screen is empty at every width. Nothing ties the 12 and the 52 to the dome below. |
| Dome | unfinished | The most visibly unfinished thing on the page. Its warm atmosphere is a hard-edged rectangle (top and bottom edges show; a darker band on the right). At 900 px the caption is cut by the bottom of the screen (the stage alone is 86 svh). The route map in the corner overlaps the scientific-name loop under it. |
| Scientific-name loop → Ch. 04 | functional | ~500 px of empty ground between the loop and the pinned map. |
| Ch. 04 (the conservation map) | successful in the middle, weak at its edges | The pinned scene (pressure → response → statement) is the page's best-developed chapter. Its opening is a cut: title, list and map are all simply there when the pin starts. Its exit collides with the closing: "protect them." is still on screen as a second display-size title ("India Species Atlas") arrives under it. |
| Closing | functional | Repeats the hero title at display size, then four equal links, then a 480 px film print floating in the lower left, then ~150 px of nothing before the footer. The converging map is good but captioned in a block of small type under it. |
| Footer (colophon) | good | Considered and data-driven; links have only a colour change for hover. |
| Global interface | good | Header follows the ground; route-progress map overlaps content in two places. |

## 2. Reference research (browsed, not summarised)

All six references were opened in headless Chromium with the GPU enabled
(1440 × 900), scrolled with real wheel events and captured (scratchpad `refs/`).
A1 Gallery's page for United Carriers shows only a thumbnail, so the original
site (unitedcarriers.com) was browsed as well. The Awwwards collection was not
needed and was not used.

| Reference | Technique observed | Why it works | Adapted here as | Not copied |
|---|---|---|---|---|
| **Lusion** | The opening 3D object sits in an inset, rounded media panel with "+" registration marks on a baseline grid; the reel panel grows from inset to full bleed as you scroll; a dark astronaut scene closes the page after a light editorial middle. | The 3D is framed as an object on a sheet, so the type around it can stay quiet. The light changes when the job of the section changes. | Chapters drawn as **plates**: a neatline and registration ticks around the dome and the closing, the same device the hero opens with. | Candy materials, the blue swoosh, rounded media cards, Aeonik. |
| **Maria Vasilyeva** | An index strip runs through the middle of the page; side rails carry rotated metadata; each work has a number, a name and an action on one baseline. | The index is the navigation and the composition at once; the rails make the frame a printed page. | Ch. 03's **selection index**: the twelve in order, each with its number, name, category and locality count, driving the dome. Vertical margin notes on plates (already the hero's idiom). | Handwritten annotations, the film-strip collage, the sound toggle. |
| **Jesper Landberg** | A concave wall of work panels on a perspective floor grid, in darkness, with only four corner labels as furniture. | The gallery is a place you stand in, not a widget: a ground, a horizon, darkness around it. | The dome gets a **ground and a lamp**: a pool of light under the facing species, darkness that dissolves to the page instead of a box, and corner furniture that says what the bands are and how to turn it. | The 3D room, the floor grid itself (the dome already has its place bands), the hover-to-play panels. |
| **Studio Parrôt** | One grade across every photograph and one colour field per section; type layered through images. | The site reads as one production because the imagery is consistent. | Consistency of **frame and grade**, not colour: every photograph on the page sits in the same plate language with the same credit line. | The olive/pink palette, the fashion imagery, layered collage. |
| **Edolus** | A preloader percentage, then a headline assembled letter by letter over a dark planet; mono micro-caption; a CTA with corner ticks. | One deliberate character-level moment, at the climax, and nothing else moves that way. | Character-level motion is **reserved** (not used); corner ticks on the primary CTA's focus state echo the print marks already on the film entry. | The sci-fi product voice, the letter scramble, the earth video. |
| **United Carriers** | A two-line statement that fills from grey to black as you scroll ("We move freight. / We own the outcome."); a pinned sequence where the *scene* changes (ground drops from white to black as the truck drives off). | Reading is scrubbed by the scroll, so the text arrives at the speed the reader moves, both ways. Transitions change the ground, not the cards. | **Ink fill**: statements in Ch. 03 and the closing fill from faint to full ink with the scroll, reversible and jump-safe. Ch. 04's opening is scrubbed in from the map's own `--draw`. | The bold condensed type, the logistics imagery, the giant outlined word. |

What carried over, in one line: one object per chapter, framed as a plate; text
that is read at the scroll's pace; light and ground that change with the job of
the section; furniture that carries data.

## 3. Scope map — protected zones

| Zone | Files | Rule |
|---|---|---|
| A · Hero animation | `components/cinema/CinematicHero.tsx`, `components/home/HeroScrollScene.tsx`, `heroScene.ts`, `heroTerrain.ts`, `heroRelief.ts`, `heroPost.ts`, `HeroArt.tsx`, `heroPlates.ts`, `.hero-*` and `.flat-*` CSS | Not edited. |
| B · Main scroll-driven map (the descent: "Start with the country", "8 regions, 23 states", Desert National Park, hand-off to the atlas) | the same files as A — the descent lives inside the hero | Not edited. |
| C · Ch. 02 *The species* with the StatusLedger | `ChapterIntro.tsx`, `StatusLedger.tsx`, `InteractiveStat.tsx`, `RevealText.tsx`, `.chapter-intro*`, `.status-*`, `.reveal-*` CSS, `--text-*` tokens | Not edited. `ChapterIntro` was shared with Ch. 03; Ch. 03 now has its own component instead of a variant, so nothing in Ch. 02's code path changed. Shared tokens were not changed; new styles are scoped to new classes. |
| Shared, read-only | `useShadedRelief.ts` (hero + closing), `interaction/sectionProgress.ts`, `motion/useInView.ts` | Used, not changed. |

Boundary refinements that touch nothing inside A–C: the field stage's feather now
also masks the field scrim (field.css + three lines in `world/field/stage.ts`);
the region loop under the hero's last screen gets a gradient foot.

## 4. Direction: the atlas as a set of plates

The opening is already a plate: a neatline drawn from the corners, a margin note
up the right edge, a title hung on the Tropic of Cancer. The pass extends that
one idea to the parts that lacked a composition, so the page reads as one
publication from the first frame to the colophon:

- **Ch. 03 — the selection plate.** The statement on the left, filling with ink
  as it is read; on the right the selection itself, as an index of twelve in Red
  List order (most at risk first, as in Ch. 04's strips), each with its category
  tick and how many localities the atlas records for it. The index is the
  dome's legend and its remote: choosing a species scrolls to the dome and turns
  it there. Its foot sums the column: 52 indicative localities.
- **The dome — an object on a lit table.** The box goes: the atmosphere
  dissolves into the page on every side. A pool of light under the facing
  species, the facing photograph sharp and the rest receding into dark.
  Stage and caption fit one screen at 900 px. Corner furniture says what the
  bands are and how to turn it. The dome's order is the index's order.
- **Ch. 04 — an opening.** The left column is drawn in with the map
  (`--draw`): label, title lines, the paragraph, then each threat row with its
  strip lighting slot by slot. Scrubbed, so it reverses.
- **The closing — the plate returns.** The hero's neatline and margin note come
  back around the converging map; the Tropic of Cancer is drawn across the plate
  again and the atlas's name sits on it, at heading size — a signature, not a
  second hero. The three closing lines fill with ink. The primary action leads;
  the rest are a quiet list; the film print sits beside them at a size that
  belongs to them.
- **Footer.** Unchanged in content; links draw an underline, the plate's foot
  meets the colophon's survey line with no dead band between.

Palette and type are the existing tokens: mineral charcoal grounds, ivory ink,
contour rust for lines, river blue for what is protected, IUCN colours only for
categories. No new typeface; Newsreader for statements and names, Geist for data
and furniture.

## 5. Motion specification

| Primitive | Trigger | Duration / ease | Distance | Reverses | Reduced motion |
|---|---|---|---|---|---|
| **Ink fill** (statements) | scrubbed from the section's `--cp` | — (position, not time) | words go from 28 % to 100 % ink, left to right | yes, with the scroll | full ink |
| **Plate rule** (neatline, hairlines) | first view | 1.6 s `ease-cinema`, edges 0.08 s apart | scale 0 → 1 from a corner | no (plays once) | drawn |
| **Line rise** (titles, index names) | first view | 1.1 s `ease-out-expo`, 70 ms per item | 105 % of the line, masked | no | shown |
| **Meta** (labels, coordinates, counts) | first view, after its heading | 0.7 s `ease-out-expo`, +250 ms | 8 px, opacity | no | shown |
| **Media** (photographs, the film print) | first view | 1.4 s `ease-cinema` clip, 1.6 s scale | inset 0 0 100 % 0 → 0; scale 1.06 → 1 | no | shown |
| **Scrubbed entrance** (Ch. 04 column) | `--draw` of the pinned map | — | 18–28 px, opacity | yes | shown |
| **Controls** | hover / focus / press | 180 ms `ease-emphasis` in, 120 ms out | arrow 4 px; press scale .96 | — | colour only |

Rules: a scrubbed value is always computed from position, so a reload or a jump
lands on the right frame. One-shot reveals use the existing `useInView`
(IntersectionObserver), never a scroll listener. No React state is written per
frame. No character-level animation. Nothing new animates when idle.

---

## 6. What was built

| Section | Change |
|---|---|
| **Ch. 03 + dome** (`SelectionChapter.tsx`, new) | Own composition instead of a copy of Ch. 02's card. Left: plate label, the statement and paragraph filling with ink, a note on how to use the index. Right: the selection index — 12 entries in Red List order, grouped by category with the category's slot, number, name, scientific name, indicative-locality count; the foot sums to 52 (counted, `InteractiveStat`). The index and the dome are one section: the dome turns in the index's order, its facing species is marked in the index (`aria-current`), choosing an entry scrolls to the dome and turns it. The two stand-alone counters were removed (their figures now live where they mean something: "All 12", the foot's 52). |
| **Dome** (`DomeGallery.tsx`, index.css) | Box removed: the atmosphere is masked to dissolve on every side. A lamp (pool of light) under the facing species. Corner furniture saying what the bands are and how to turn it. Stage 86 → 78 svh with the caption laid over its foot, so stage + caption fit 900 px. Caption rebuilt as a legend: "08 of 12" numeral, name rising from its mask, scientific name, category and regions, credit, each arriving in turn; a low shade keeps it clear of the lower band. The facing print no longer repeats the name the caption carries. Arrows: pressed state and a 2 px nudge. External control (`control`, `onCenter`). Route map hidden over the chapter (`data-geo-quiet`). |
| **Ch. 04** (`ConservationMap.tsx`, editorial.css) | Opening drawn in with the sheet's own `--draw`: label (now the plate label), the two title lines, the paragraph, then each threat row with its strip uncovered slot by slot, then the map key. Scrubbed, so it reverses; inert once the pin holds. Nothing in the pinned scene, lists, readout or statement changed. |
| **Closing** (`FinalChapter.tsx`, editorial.css) | Composed as the opening plate's twin: neatline drawn from the corners, provenance up the right margin (only when the elevation has loaded), the Tropic of Cancer drawn across the plate west to east, the atlas's name set on it at heading size (a signature, not a second title page), measured so the converging map's own parallel meets the name's baseline (`useTropicLine`, ResizeObserver, nothing on scroll). The three lines fill with ink. "Open the map" leads; the other routes are a quiet list (`.line-link`); the film print sits beside them and is uncovered from its foot. The plate's foot is the footer's rule (no doubled line, no dead band). |
| **Field-study boundaries** (`stage.ts`, field.css, `FieldStudiesIndex.tsx`) | The stage now writes its feather on the host too, so the type's scrim dissolves with the world instead of printing a square edge (entry from Ch. 02, exit to Ch. 03). A small `.fs-dawn` continues Ch. 02's warm foot under the world's feathered edge at the same strength, so there is no dark notch at the boundary (29,30,25 → 33,34,29 → 37,38,34 measured, was 29 → 13). |
| **Hero tail** (editorial.css) | A foot of the page's ground under the region loop covers the straight seam where the hero's lit ground ends. The hero is not edited. |
| **Footer / interface** | Footer links draw a rule from the left on hover and focus. `.line-link` for secondary routes. `.cta` answers focus as it answers hover. Index rows: hover, focus ring, pressed and current states. Route map quiet over the names loop between two chapters that hide it. |
| **Motion primitives** | `InkText` (scrubbed ink fill), `PlateFrame` (neatline + margin note), `.mo-line` / `.mo-meta` / `.mo-rule` (one-shot reveals with a shared stagger), all in `editorial.css`. |

### Changes outside the redesign targets, and why

- **Ch. 02 dawn, one declaration** (`index.css`, `.chapter-intro[data-dawn]::after`): the warm foot was a
  background inside a 1600 px box, so at 1920 × 1080 it printed a rectangle with hard vertical edges. It is
  now the same gradient painted as a border image with a sideways outset (ink overflow: no scrollbar at any
  size — checked at 1440, 1920, 1280, 390). Inside the box it is unchanged: at 1440 the dawn region differs
  from the baseline in 0 pixels.
- **`interaction/sectionProgress.ts`**: reads every rectangle before writing (one forced layout per pass
  instead of one per section), and two opt-in options (`enterOnly`, `settle: false`) for elements that only
  arrive. The defaults — what Ch. 02's card and ledger use — compute exactly what they did.

## 7. Checks (actually run)

- `npm run build` (tsc -b, vite, postbuild) passes. `oxlint` on every file touched: clean (one warning
  of mine fixed with `useImperativeHandle`); the three warnings left in `src` are in files this pass did not touch.
- **Protected zones**: all 16 protected files byte-identical to the pre-session snapshot. 1440 frames of the
  opening and the descent differ from the baseline in 5 and 1 pixels; the landing and Ch. 02 frames differ
  only where the loop's lettering drifts and the field world animates.
- **Captures** (GPU on): 24 positions at 1440 × 900 forward (`after/`), 6 in reverse from the footer
  (`reverse/`), 6 new-section positions each at 1920 × 1080 and 1280 × 800, reduced motion (4) and no WebGL (4).
  No console or page errors in any run.
- **Interaction**: clicking "Lion-tailed Macaque" in the index turned the dome to it and scrolled it into view
  (stage 0–702 px); the dome's own Next moved the index's mark; Tab reaches the 12 entries, the dome, its
  controls, Ch. 04's rows and the closing's links, each with a 2 px focus ring.
- **Scrub states**: the Ch. 04 entrance (`--draw` 0.7156) and the selection title's ink (0.626) are identical
  reached downwards and reached from below; reloading at the closing puts the name's baseline at 356 px and
  the map's parallel on it.
- **No horizontal overflow** at 1440, 1920, 1280 and 390 px wide.

## 8. Cost (measured)

Production builds, 1440 × 900, this laptop (integrated AMD GPU, live wallpaper running), wheel scroll in
90 px steps, frame intervals from `requestAnimationFrame`, three runs per build, order alternated. One page
visits the zones in order, as a reader would.

| Zone | Before | After |
|---|---|---|
| Ch. 02 → field studies | 52.4–56.8 fps | 54.0–54.4 |
| Ch. 03 index | 51.7–53.7 | 49.9–53.3 |
| Dome | 47.6–48.7 | 46.6–47.4 |
| Ch. 04 entrance | 55.2–56.7 | 52.8–54.3 |
| Closing, first arrival | 44.0–50.9 | 43.3–45.6 |
| Closing, after its entrance has played | 59.0–60.0 | 59.9–60.0 |

Ch. 02 → field, Ch. 03 and the dome are within noise. Ch. 04's opening costs about 1–2 fps while it scrubs
(about 20 elements restyled per frame; nothing once the pin holds). The closing costs nothing in steady state;
on its first arrival, while its entrance plays (neatline, parallel, name, film print, converging lines),
it runs about 3 fps lower on average, inside the baseline's own spread.

A first version cost the closing 6–8 fps on every pass. A CPU profile traced it to forced layout in
`sectionProgress`: any moving entry asked for a second full pass (meant for the ledger inside its transformed
card), so the ink lines doubled the layout work of every scroll event. The `settle`/`enterOnly` options
removed it; `getBoundingClientRect` self time in the zone went from 1,144 ms to 793 ms (before the pass: 742 ms).

## 9. Not done / limits

- No WebGL: the field world's edges still cut (the feather is written by the WebGL stage, which does not
  exist there); content is complete.
- The Ch. 04 pinned scene, the field-study compositions and the hero were not recomposed, by design.
- The Awwwards storytelling collection was not browsed.
- Real phones were not measured; the pass is desktop-first and phones get the stacked layouts as before
  (the closing and the selection index collapse to one column; the dome's right-hand note hides under 768 px).

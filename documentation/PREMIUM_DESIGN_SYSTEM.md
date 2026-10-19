# India Species Atlas: premium design system

Started in Gate 1 (8 October 2026). This records the decisions the code now enforces, so later gates extend the system instead of adding one-off values. The source of truth is `src/index.css` (`@theme` and `:root`); this file explains it.

The rule behind every entry: **the same Atlas, set by a more careful hand.** Nothing here replaces the documentary's identity. It gives the identity names, so it can be applied everywhere at once.

---

## 1. Palette (unchanged)

The Survey of India toposheet, printed at night. The palette is not touched by the upgrade.

| Token | Hex | Role |
|---|---|---|
| `forest-950 … 200` | `#0e1411` … `#d6e1d9` | the ground everything sits on |
| `canvas` | `#e8e1cf` | ink: type, hairlines, the primary button |
| `parchment`, `sand` | `#d9d0b8`, `#d8c9a3` | hover and pressed states of buff surfaces |
| `contour` (= `clay`) | `#b07a52` | **the line colour**: route lines, rules before labels, threat hatching, the cursor's ticks |
| `river` | `#7ea3b5` | what is protected |
| `status-cr/en/vu/nt/lc` | IUCN | signal only, and always paired with text |

`clay` is an alias of `contour`, kept so older class names still resolve. `src/theme.ts` mirrors the palette for three.js and must be kept in step by hand.

## 2. Type scale

Ten steps. Each carries its own leading and tracking, so one class is the whole decision. Nothing is set below 11 px.

| Class | Size | Leading / tracking | Face | Used for |
|---|---|---|---|---|
| `text-display` | clamp(3.2rem, 9vw, 10rem) | 0.86 / −0.045em | Newsreader 300 | the atlas's own name (finale) |
| *(hero h1)* | clamp(3.4rem, 10.5vw, 12rem) | 0.84 / −0.045em | Newsreader 300 | the opening title only; deliberately one step above display |
| `text-title` | clamp(3rem, 5.4vw, 6.4rem) | 0.9 / −0.035em | Newsreader 300 | a species' name; the conservation chapter title |
| `text-headline` | clamp(2.2rem, 4.8vw, 5rem) | 1.02 / −0.03em | Newsreader 300 | a chapter's statement |
| `text-heading` | clamp(2.1rem, 3.6vw, 3.4rem) | 1.02 / −0.03em | Newsreader 300 | a working page's title |
| `text-subheading` | clamp(1.35rem, 1.9vw, 1.7rem) | 1.15 / −0.015em | Newsreader 300 | a section inside a working page |
| `text-lede` | clamp(1.12rem, 1.35vw, 1.3rem) | 1.5 | Newsreader 300 | the serif paragraph that opens or carries a section |
| `text-body` | 15 px | 1.6 | Geist | running text |
| `text-small` | 13 px | 1.55 | Geist | notes, captions, the running header |
| `text-label` | 12 px | 1.4 | Geist | map keys, legends, loader steps, cursor label |
| `text-micro` | 11 px | 1.4 | Geist | the floor: credits, eyebrows, `caps` |

Trackings: `tracking-display` (−0.035em), `tracking-tight` (−0.02em), `tracking-caps` (0.14em, uppercase labels only).

**Not migrated, on purpose:** the 1920 × 1080 documentary stage (`components/documentary/*`) uses fixed pixel sizes because it is a fixed-size frame, and the 7–9 px glyphs inside the 16 px map-pin icons in `MapLegend.tsx` mirror the pins themselves.

## 3. Layers and rhythm

Stacking order is named, not numbered at each call site:

`--z-map-ui` 500 · `--z-progress` 900 · `--z-menu` 1400 · `--z-header` 1500 · `--z-dialog` 1600 · `--z-skip` 2000 · `--z-loader` 2500 · `--z-cursor` 3000

Rhythm: `--gutter` (1 / 2 / 3 rem at phone / ≥640 / ≥1024), `--space-chapter`, `--space-block`. These are ready for the later gates; existing chapter paddings were not changed in Gate 1, so the documentary's pacing is untouched.

## 4. Editorial furniture (the working pages)

Gate 1 brought the documentary's voice to `/atlas`, `/species`, `/compare`, `/conservation`, `/about` and `/sources`. Behaviour, layout and data are unchanged; only the chrome is.

| Before | After | Class |
|---|---|---|
| semibold serif headings | light Newsreader, tight tracking | `SectionHeading` (`text-heading` / `text-subheading`) |
| green uppercase eyebrow, 0.18em | a 2 rem contour rule, then the words in small sentence case | `.eyebrow` |
| `rounded-xl` bordered card boxes on `forest-900` | a hairline across the top, no box, wider gutters | `.sheet` |
| filled callout box with a 2 px green left border | a 1 px contour rule on the left | `.callout` |
| assorted uppercase labels (0.12–0.2em, green) | one map-key style: 11 px, 0.14em, canvas at 50% | `.caps` |
| green filled primary button, `rounded-lg`, semibold | buff (`canvas`) on ink, 2 px radius, medium | `buttonClasses('primary')` |
| pill status badge, semibold uppercase | 2 px tag, hairline in the status colour at 55%, medium | `StatusBadge` |
| segmented controls with a green active state | buff active state on a hairline track | `ModeSwitch`, directory view tabs |
| radii 6–16 px everywhere | 2 px (`rounded-xs`) | all working-page controls |

Status colours still carry the IUCN signal (e.g. the coloured top rule on each status sheet on `/conservation`).

## 5. The map key

The species scene's map captions follow one rule: **one caption at a time, and always one.** In the pinned scene the key follows the scene's phase (`data-phase`): the outgoing caption leaves (0.3 s) before the next arrives (0.6 s, after a 0.3 s delay). Driven by the documentary clock instead, each caption follows its layer variable with a gap rather than an overlap. Every caption sits under a 2 rem contour rule on a soft radial backing, so it reads over the hatching.

## 6. Cursor vocabulary

A survey reticle, fine pointer and motion only (off on touch and under reduced motion, as before).

- **Idle**: a 34 px hairline ring that trails the dot.
- **Hover**: the ring opens to 54 px and four ticks point in at the target.
- **Label**: 78 px, a dark fill (`forest-950` at 78%), contour ticks, and the action in 12 px canvas type. It never becomes a solid disc that hides what it points at.
- **Press**: contracts to 26 px; the contour splash still answers a click.

Words, by what the action does:

| Word | Where |
|---|---|
| **Discover** | open a species profile (scene, dome centre, "Open profile") |
| **Enter** | go to another part of the atlas (menu items, "Open the map") |
| **Trace** | highlight where a threat falls on the map (threat rows) |
| **Locate** | show a place: a locality, a programme's sites |
| **Turn** | rotate the dome |
| **Define** | open the IUCN definition |
| **Drag** | anything draggable (the curved loops, the dome) |

## 7. Photographs

Every species photograph is the credited Wikimedia Commons file already in the repository. Gate 1 adds only delivery:

- `scripts/images/make-derivatives.mjs` writes a 720 px WebP beside each 1400 px JPG master and records the masters' sizes in `photo-meta.json`. Nothing is cropped or retouched.
- `src/utils/photo.ts` (`photoSources`) gives each slot `srcSet` (WebP 720w, JPG 1400w), the intrinsic `width`/`height`, and the small WebP alone for blurred backdrops and dome tiles.
- **Credits** now appear on every photograph, including the directory cards and the compare table, where they were missing.
- The `/species` 3D gallery keeps the JPG masters for its textures: its card faces are 640 × 892 and the 720 px WebP would be upscaled and soften them.

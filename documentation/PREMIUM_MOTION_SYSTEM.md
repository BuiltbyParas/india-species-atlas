# India Species Atlas: motion and line system

Started in Gate 2 (8 October 2026). Every rule here is enforced in code: `src/geo/line/`, the line-system section of `src/index.css`, and `src/motion/gsap.ts`.

## 1. The line

The Atlas has one idea, and it has always had it: **lines on the map**. Before Gate 2 that idea was drawn by six separate systems, each with its own class, stroke weight, colour rule and driver:

1. the loader's survey rule;
2. the curved loops;
3. the route-line progress map;
4. the species thread;
5. the conservation threads;
6. the finale's convergence.

They now share one primitive, one vocabulary and one driver.

### `GeoLine` (`src/geo/line/GeoLine.tsx`)

`<GeoLine d role draw? nib? label? />`

| Role | Means | Stroke |
|---|---|---|
| `survey` | the neutral ruled line: frames, extents, guides, outlines | canvas at 38%, `--line-hair` (0.75 px) |
| `thread` | joins a species' recorded localities | canvas at 72%, `--line-fine` (1.1 px) |
| `route` | the reader's own path through the story | contour, `--line-firm` (1.5 px) |
| `protect` | what is protected; the return home | river, `--line-fine` |
| `schematic` | stands in for something the data does not map | contour, dashed 5/4, `--line-firm` (its caller must label it as schematic) |

- **Weights** are in screen pixels at any zoom (`vector-effect: non-scaling-stroke`). Emphasis is `--line-bold` (2.2 px).
- **Caps and joins** are round.
- **Drawing** is a dash offset along a unit `pathLength`. That measures true only in map units, so a drawn line's stroke is in map units. Its pixel weight is divided by `--gl-k`, the SVG's screen scale, which `geo/line/scale.ts` measures once per SVG on resize, and by `--gl-z` where a map zooms (the species map). The line therefore stays the same width at any size, and `draw: 0.5` is exactly half the line, under its nib.
- **Still lines** (`still`) are never drawn on. They keep a non-scaling stroke, so their dash patterns are in screen pixels (fragmentation, the route guide).
- **The schematic role** keeps one reveal mask, because its own dash pattern is visible.
- **History.**
  - The first version (Gate 2) dashed non-scaling strokes, which browsers measure in screen pixels, so lines drew at the wrong rate off 1:1.
  - The Gate 6 fix revealed every line through a mask, which was correct but cost a repaint per line per frame.
  - Gate 8 replaced it with this.
- **The nib** is a small mark at the drawing end of a line, shown only while `0 < draw < 1`, so a finished line is just a line. It is placed with CSS `offset-path`, at no JavaScript cost per frame, and it follows single-run paths only.
- **Labels** set words along the line with `textPath` and fade in once the line is more than half drawn. This is ready for the species world and the bustard transition.

### Geometry (`src/geo/line/paths.ts`)

- `chain()` orders localities nearest-next from the anchor.
- `threadRuns()` / `threadPath()` break the chain wherever consecutive localities are more than 5° apart (`MAX_JOIN_DEG`), so no line implies a corridor the data does not record.
- `bowedLeg(a, b, bow)` is the single "drawn hop" between two places. It replaces two hand-written copies of the same perpendicular midpoint maths (route progress and finale), and a third in the documentary.
- `isSingleRun()` says whether a nib can follow a path.

### The driver: `--draw`

`--draw` is a registered custom property (`@property`, `<number>`, inherited, initial 1). Because it is registered it can be scrubbed, transitioned and keyframed, and one value on a map drives every line inside it.

| System | How `--draw` is driven |
|---|---|
| Loader survey rule | keyframes `gl-draw` (0 → 1 over 1.3 s, `--ease-cinema`) |
| Species thread | follows `--range` from the scene's ScrollTrigger timeline (`draw="var(--range)"`); on the stacked layout, a GSAP tween when the map enters view |
| Protected outline (species map) | follows `--cons` |
| Conservation threads | inherit the chapter map's own `--draw`; fragmentation is a dash pattern from `--frag` |
| Route progress legs | one RAF-throttled scroll handler writes `--draw` on each leg |
| Finale | a CSS transition of `--draw`: the outline first (3.2 s), then each line with a 90 ms stagger |
| Documentary stage | the documentary clock passes `draw={k}` per frame (deterministic rendering) |

The curved loops keep their own text-on-a-curve device. Their hairline now takes the line tokens and stays one pixel wide at every screen width; before, it scaled down to a quarter of a pixel on phones.

### What the line now says

- **Route progress (desktop, pinned layout):**
  - the leg being drawn carries a nib;
  - a survey readout under the map gives the last anchor locality the line reached and its coordinates (for example *Desert National Park, 26°…N 70°…E*);
  - the return leg is drawn in river blue;
  - the map steps aside when the finale's own map arrives, and before the footer.
- **Species thread:** drawn by its nib as the range arrives, on every layout, including phones, where it now draws when the map comes into view instead of arriving pre-drawn.
- **Finale:** twelve nibs converge on one point. The point is captioned with its coordinates only, as "a drawing point rather than a place", because it carries no claim of its own.

## 2. Motion tokens

### Easing: three curves, shared by CSS and GSAP

| CSS token | GSAP name | Curve | Use |
|---|---|---|---|
| `--ease-out-expo` | `atlas.out` (GSAP default) | cubic-bezier(0.16, 1, 0.3, 1) | reveals and arrivals |
| `--ease-cinema` | `atlas.cinema` | cubic-bezier(0.7, 0, 0.2, 1) | scene changes; lines drawn |
| `--ease-emphasis` | `atlas.emphasis` | cubic-bezier(0.2, 0.75, 0.25, 1) | controls |

The GSAP curves are registered from the same numbers by a 40-line cubic-Bézier solver in `motion/gsap.ts`. The CustomEase plugin cost 3.5 kB gzip for the same result. Scroll-scrubbed timelines keep `ease: 'none'` with tuned sub-eases inside them; layer switches outside a scrub use `atlas.cinema`.

### Durations

`--dur-quick` 180 ms (a control answers) · `--dur-reveal` 900 ms (a reveal settles) · `--dur-draw` 1600 ms (a line is drawn) · `--dur-cinema` 2400 ms (a scene moves).

### Rules

1. **Nothing animates per frame through React.** Scroll and time write CSS variables or styles directly. React hears only discrete changes: a phase, a visibility.
2. **Scrubbed means reversible.** Anything tied to scroll plays backwards when the reader scrolls back.
3. **One orchestrated moment per section.** A line is drawn, *or* a photograph opens, *or* a statement reveals. They are not stacked.
4. **The line leads.** When a section has a line, it moves first, and type follows.
5. **Reduced motion lands everything in its final state.**
   - Lines are fully drawn (`--draw: 1`).
   - Reveals are shown.
   - Pinned scenes become stacked.
   - The loader is skipped.
   - The cursor is the system cursor.
   - The 3D hero is replaced by the flat map.
   No information depends on motion.

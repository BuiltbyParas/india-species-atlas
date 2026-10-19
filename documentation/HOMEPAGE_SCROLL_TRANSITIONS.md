# Home page — scroll audit and the three hand-offs it changed

11 October 2026 · branch `atlas/master-04-visual-quality` · uncommitted

The brief asked for the whole home page to become a scroll-driven cinematic
experience. An audit of the page as it stands (1440 × 900 desktop, 390 × 844
phone, reduced motion, no WebGL; 15 scroll positions each way) found that most
of that already exists, so the work was limited to what the audit showed was
broken. Nothing was rebuilt.

## What the page already does (kept as is)

| Range (px, 1440 × 900) | Section | Scroll drives |
|---|---|---|
| 0 – 3,420 | Hero (`CinematicHero`, `HeroStage`) | camera descent from the whole relief to Desert National Park, key-light swing, four captions on `--p`, hand-off to the atlas |
| 3,420 – 3,700 | Curved loop of ecological regions | marquee text on a curve |
| 3,700 – 4,436 | Ch. 02 *The species* (`ChapterIntro`) | word-mask reveal, counters |
| 4,436 – 9,836 | Field studies (`FieldStudiesIndex`) | one world per viewport on the shared field stage, name composition per study |
| 9,836 – 11,370 | Ch. 03 *The selection*, dome gallery | pointer-driven sphere |
| 11,650 – 15,790 | Ch. 04 *Fragmentation to protection* | pinned map: threats → species → programmes |
| 15,790 – end | Closing, footer | lines converge on the country |

One scroll signal (`interaction/scroll.ts`), one GSAP ScrollTrigger and Lenis
confined to this page, one shared renderer for the hero and one for the field
worlds. No second scroll system was added.

## What the audit found, and what changed

1. **The header turned light too early and too late.** The header's ink and veil
   follow `data-env`, which flips when a section crosses *mid-screen*. Arriving
   at the Thar the header turned cream-with-dark-ink while it still sat over
   the dark Chapter 02 headline, so cream type was printed on a cream veil
   (illegible); leaving the rhino's floodplain did the reverse.
   → `world/environment.ts` now also publishes `data-under`: the environment of
   the declared section behind the header's lower edge (48 px), `atlas` where
   none is declared. The header rules in `field.css` read it. `data-env`
   (mid-screen) still drives everything else.
2. **Dark → light was a hard cut.** The first field world met Chapter 02 on a
   straight line, and the last one met Chapter 03 the same way.
   → `FieldStage.feather()` masks the stage's fixed layer with a gradient as deep
   as a quarter of the stretch the edge still has to cross, top while arriving,
   bottom while leaving, and removes the mask once the world holds the screen
   (`data-feather` on `.field-layer`; `field.css`). It is scroll-position
   derived, so it scrubs both ways and survives a jump. Off under reduced motion.
3. **The close did not return to the opening.** The closing map was a bare
   outline. It now stands on the same elevation model as the hero, shaded flat
   (`useShadedRelief`, extracted from `CinematicHero` so both share it), loaded
   a screen ahead, faded in with the lines, with the caption "Ground: ETOPO 2022
   elevation (NOAA), shaded." Reduced motion shows it without the fade. If the
   model fails to load, nothing is claimed and the outline stands alone.

## Left alone, on purpose

The hero's dark tail between the last caption and Chapter 02 (about 400 px) is
empty but short and carries the curved loop; the descent's path, captions and
the field index's compositions are the page's identity and read well. The
Chapter 02 statement is not scrubbed because it enters by word mask and holds.

## Checks

- `tsc -b` and `npm run build` pass. `oxlint`: warnings only, none in files touched here.
- Direct load at y = 4,000, down-then-up to 4,000, and `/#field-studies` give the
  same `data-under` and feather state; no console or page errors in any run.
- Reduced motion and no-WebGL walks (9 positions each): content, header and
  closing map present; fallbacks show the photographs and the shaded flat relief.
- Phone (390 × 844, 11 positions): the dissolve and header behave the same.
- Frame rate, production build, 1440 × 900, wheel scroll through each edge,
  three interleaved runs per variant, rAF intervals, mask on / mask off:
  entry 54.1–58.8 / 55.1–58.7 fps; exit 43.9–49.6 / 49.3–50.5 fps. No
  difference at the entry within noise; the exit may cost 0–3 fps (the
  rhino world is the heaviest, and the machine runs a live wallpaper). A real
  phone was not measured.

## Not done

Context-loss recovery was not re-tested for this change (it adds a CSS mask
only). No scroll-scrubbed redesign of Chapters 02/03 and no new WebGL passes.

---

# Phase 2 — the hero hand-off, Chapters 02 and 03

## The dead zone was accidental

The hero section is 3,420 px: 2,520 px of descent plus the last screen, where
the sticky stage lets go and scrolls away. By then the stage's overlays are at
`1 − --sheet = 0`, so that screen showed only the landing's glow over an empty
ground, then a 280 px loop, then Chapter 02's 11 rem of top padding: about
650 px (y ≈ 2,900 – 3,550) with almost nothing on it. It was not breathing room;
nothing was being held. The loop (`.hero-tail-loop`) now starts 24 svh up into
the hero's last screen, so the region names are lettered along the Thar landing
and Chapter 02 arrives on that glow. Every later section moved up by about 215 px.

## One new scroll system piece, shared

`src/interaction/sectionProgress.ts` — `useSectionProgress(ref)` writes `--enter`,
`--cp` and `--leave` (0 → 1) on a section from its rectangle on every sample of
the existing scroll signal (no second listener, no React state). They scrub both
ways and are right on the first frame after a jump because they are computed from
position, not history. A section inside a moving section gets a second pass.
Reduced motion: `1`, `0.5`, `0` (shown, still).

## Motion specification

| Section | Initial state | Scroll range | Motion | Final state |
|---|---|---|---|---|
| Hero tail → Ch. 02 | landing glow, caption | last 900 px of the hero | loop and chapter rise into the glow | chapter at rest |
| Ch. 02 *The species* | hairline undrawn, copy masked | top from screen bottom to 35 % | hairline draws; word-mask reveal; numeral drifts down, statement up (layered); 12 status slots light in Red List order as the ledger rises; counters count | all shown, dawn glow at the foot warming from cp 0.4 |
| Ch. 02 → field studies | dark | bottom 55 % → top | card lifts 3.5 svh and quietens to 30 %; warm first light under the stage's feathered edge | the Thar world holds the screen |
| Ch. 03 *The selection* | as Ch. 02 | same | same chapter plane; dome block (`SectionArrive`) rises 7 svh into place | dome at rest, pointer-driven |
| Field studies, Ch. 04, closing | unchanged | | | |

## What changed in the content design

- `ChapterIntro` takes `lead` (first sentence, large) and `statement` (the
  paragraph under it): "Five species, five kinds of ground." / "All 12, in the
  round." A large ghost numeral names the chapter on wide screens (the
  "Chapter 0N" text stays for screen readers and for phones).
- `StatusLedger` (new): the twelve species as twelve slots, grouped and lit in
  their category's colour, columns under them as wide as their slots (3 : 6 : 3),
  counts from `countByStatus()`. It is the device Chapter 04's threat strips use.
- Chapter 03 gains a counted row: 12 species and 52 indicative localities, both
  counted from the dataset, with the page's own wording for what a locality is.

## Checks (this phase)

- `tsc -b`, `npm run build` pass; oxlint reports nothing in the new or edited files.
- Variables at y = 3,700 are identical when loaded directly, reached after
  scrolling down to 8,000 and back, and after a 30,000 px fling in both directions.
- Reduced motion and no WebGL (desktop, three positions each) and a phone
  (390 × 844, seven positions): all text visible, ledger and counters present,
  no console errors.
- Frame rate, production build, 1440 × 900, wheel scroll, three runs per variant:
  hero tail → Ch. 02, 47.9–50.5 fps with the new layers, 48.4–49.4 without. Ch. 03
  with the dome, 39.0–39.9 fps with them, 40.7–41.1 without: about 1–2 fps,
  from the dome block's lift (a first version that also scaled it cost 3 fps and
  was cut back to a lift). The dome zone is the page's heaviest, at 40 fps before this phase.

## Not done

Context-loss recovery was not re-tested (the field stage and hero lifecycles were
not changed in this phase). Chapter 04 and the closing keep their own openings;
they were not given the numeral and drift treatment.

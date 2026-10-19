# Homepage type in motion (18 Oct 2026)

A desktop-first typography and motion pass on the homepage. It adds no new systems: it gives the existing chapters one
way of bringing words on screen. **Words come out of the atmosphere rather than in from below.** They start soft,
faint, a little low and a little near, then sharpen onto the line. Blur is used only in the places listed here.

## The vocabulary

The tokens are in `index.css` `:root` (`--fx-*`), beside the existing `--mo-*` ones. All sizes are in em, so a display
line and a caption move the same distance relative to themselves.

| Pattern | Kind | Where it lives | What it does |
|---|---|---|---|
| **focus** | once | `FocusText.tsx`, `.fx-focus` | The words resolve in reading order: blur 0.14em → 0, rise 0.3em, scale 1.04 → 1, 70 ms stagger. `cut` replays it on mount, for a line that is replaced when what it names changes. |
| **cut** | once | `@keyframes fx-cut-in`; `RevealText focus` | The existing mask cut-in, out of focus until the word has cleared its mask. |
| **depth** | scrubbed | `.lit-word`, `.cons-close .cc-w` | The words come forward and sharpen at the pace of the scroll, about two words in motion at once. Words waiting or done hold still. |
| **sci** | once | `.fx-sci`, `@keyframes fx-sci-in` | A scientific name slides along its line into focus, after the common name it qualifies. |
| **defocus** | scrubbed | hero `applyProgress`, `.final.is-world .fw-*`, `.hero-caption` | A title the camera passes goes soft; a title meeting again sharpens as it lands. |

The splitting rules:
- Split on spaces only, never inside a word.
- The spaces stay as text between the word boxes, so lines wrap as written and the text copies and reads to a screen reader as written. `scripts/audit/type-states.mjs` checks the rendered text.
- Nothing changes size, so nothing shifts the layout.

## Where it is applied

- **Opening.**
  - The wordmark's own blur-to-sharp arrival is unchanged.
  - The lede is now a masked focus cut.
  - On the descent, the italic "Species" that the camera goes through goes soft as it grows (`go × 0.05em`), and the parting "India" and "Atlas" go slightly soft too. The filter is cleared at rest and once a word is gone.
  - The descent captions come into focus as the camera reaches what they describe, and go soft again as it passes.
- **Chapter 02.**
  - The lit statement is now a depth emergence.
  - The italic second sentence waits a beat of two words after the first one has resolved.
- **The Survey.**
  - The habitat word cuts in through focus each time the ground changes.
  - The binomial follows the common name.
  - Each mark's habitat label sharpens as the mark settles (`--s`, written on the mark only).
- **Chapter 03.**
  - The title and body ink in through focus (`InkText focus`).
  - The dome caption's name cuts in through focus, and its binomial follows (sci).
  - In the flow layout, the index binomials stagger in after their names.
  - Leaving, the column steps back out of focus and lifts slightly as the dome sinks.
  - Selection, preview and commit are untouched.
- **Chapter 04.**
  - The title arrives out of focus. The half the scene is not reading recedes slightly (`--off`, 0.022em).
  - The threat figure cuts in through focus.
  - The threat name and the programme count resolve word by word on each change. They are keyed to the same threat or year as the map, so the text and the map highlight change together.
  - The hinge's large line resolves word by word with `--close`. Its lead line and footnote sharpen with their own `--t`.
- **Closing.**
  - The name's reassembly has depth of field: the italic coming down past the camera is soft until it lands.
  - The coda then resolves line by line once the name has met. FinalChapter writes `--resolve` on the coda only.
  - On the sheet version, the coda plays once on arrival.
  - This also fixes "saved." never reaching full ink: the coda line sat below InkText's threshold in the sticky frame.

## Reduced motion, fallback, phones

- **Reduced motion.** Every pattern is set in its final state: no blur, no transform, no transition. Checked in captures.
- **No WebGL.** The flat or held hero and the sheet versions of Ch.04 and the closing use the same classes. Their once-reveals play on arrival.
- **Phones.** No phone-specific work. The patterns are em-sized and keep the existing phone layouts. The route sweep at 320 and 390 px is clean.

## Performance

Measured with `scripts/audit/type-perf.mjs` at 1920×1080 on the production build, alternating builds:
- Ch.04 hinge and the closing are unchanged.
- Ch.02 was 2–5 fps down until its words were put on the compositor (`will-change: filter, transform` on `.lit-word`). It is now at parity: 56.9 and 57.5 fps against 57.7.
- The hero descent is within this laptop's run-to-run noise: before 40–51 fps, after 39–47 fps. It may be a few fps lower; it is the one place to revisit if the descent ever feels heavier.
- In one of three 1920 captures, the live relief gave up during the descent. It did not happen in the two repeats.

## Checks

- `scripts/audit/type-pass.mjs`: moment bursts (mid-motion frames), any build or viewport, and `RM=1`.
- `scripts/audit/type-states.mjs`:
  - jumps (End, Home, landing mid-Ch.04)
  - a fast fling both ways
  - Ch.02 reversal
  - exact text of every split statement
  - sideways overflow and the console
- `scripts/audit/type-perf.mjs`: frame timing over the four animated stretches.

# Production status: premium upgrade

Branch: `atlas/premium` (worktree `../india-species-atlas-premium`), branched from `487c5fb`. The reel work on `reel-60` in the main checkout is untouched by every gate.

| Gate | Status | Checkpoint |
|---|---|---|
| 0 — Repository audit | **Done** (8 Oct 2026) | tag `atlas/premium-gate-0-audit` |
| 1 — Foundation polish | **Done** (8 Oct 2026) | tag `atlas/premium-gate-1-foundation` |
| 2 — Geographic line system | In progress | |
| 3 — Species world | Not started | |
| 4 — Spatial atlas | Not started | |
| 5 — Atlas explorer | Not started; rivers, forests and protected areas need sourced datasets (see the upgrade plan, §6) | |
| 6 — Cinematic intro | Not started | |
| 7 — Bustard transition | Not started | |
| 8 — Final polish | Not started | |

## Gate 0
- Audit and baseline: [`PREMIUM_UPGRADE_PLAN.md`](PREMIUM_UPGRADE_PLAN.md).
- No source files changed.

## Gate 1 — Foundation polish

**Aim:** the same Atlas, set by a more careful hand. Gate 1 adds no new systems (no line system, species world, intro or bustard transition). It makes the foundations those systems will stand on.

### What changed
- **Tokens** (`src/index.css`): a ten-step type scale with built-in leading and tracking, three trackings, named z-layers, and gutter and rhythm variables. 46 distinct arbitrary font sizes in components are down to the documented scale. The exceptions are the fixed-size documentary stage and the map-pin glyphs. See [`PREMIUM_DESIGN_SYSTEM.md`](PREMIUM_DESIGN_SYSTEM.md).
- **Working pages in the documentary's voice:**
  - light Newsreader headings;
  - a contour-rule eyebrow;
  - hairline "sheets" instead of rounded card boxes;
  - a buff primary button;
  - 2 px radii;
  - one small-caps label style.
  No layout, feature or data change.
- **Defects fixed:**
  - The species-scene map captions overlapped. There is now one caption at a time, driven by the scene's phase, on a legible backing.
  - Text showed through the wordmark when scrolled on phone and tablet. The header scrim is now solid behind the bar.
  - The phone phase tabs wrapped into ragged rows. They are now a three-column key.
  - GeoProgress showed between 1024 and 1179 px over the stacked layout, and overlapped the footer links. It now appears only beside the pinned layout and steps aside for the footer.
  - The loader overlapped its title on phones. It is recomposed: the checklist moves to the top corner and the map fits the width.
  - The loader's step 05 was a timer. It is now the hero's real first painted frame, with a 6 s ceiling.
  - The stacked species map grew taller than the screen on landscape tablets. It is capped at 78% of the viewport height.
  - "Chapter 04" was hard-coded. It now comes from the chapter definition.
  - Scroll smoothing conflicted with Lenis. Fixed, and the Lenis CSS is now imported.
  - The `SpeciesImage` comment wrongly said no photographs were bundled. Corrected.
- **Credits:** photographs on the directory cards and in the compare table now carry their credit, as every other view already did.
- **Cursor:** redrawn as a survey reticle, with a seven-word vocabulary: Discover, Enter, Trace, Locate, Turn, Define, Drag.
- **Accessibility:**
  - the species profile dialog now moves focus in, traps Tab and Shift+Tab, closes on Escape, returns focus to its opener, and holds the page (Lenis included);
  - map-mode and directory-view tabs follow the WAI-ARIA tabs pattern (roving tabindex; arrows, Home and End; `aria-controls` to a labelled tab panel);
  - `/documentary` has a `main` landmark, a description, player controls in a `nav`, a skip link, and controls that stay visible while focused;
  - reduced-motion and pointer checks go through `motion/preferences.ts`.
- **Performance:**
  - CLS on the working pages went from 0.10–0.22 to 0.00–0.01;
  - 720 px WebP photographs are served to small slots (−75% for those files);
  - photographs have intrinsic sizes;
  - the boundary file is fetched once instead of twice;
  - the hero scroll handler and per-frame React updates are throttled.
  Numbers are in [`PERFORMANCE.md`](PERFORMANCE.md).

### Preserved
- The 3D relief, documentary scroll choreography, all five species scenes and their three-layer maps, the dome, the curved loops, the conservation chapter, the finale, the loader concept, the dark toposheet palette, Newsreader and Geist, and the real credited photographs.
- The data, the drawings' honesty rules, and every route and feature.
- Measured layouts: hero, chapter, scene and dome screenshots at 1440 and 1920 match the baseline apart from the intended fixes.

### Looks worse, or is still open
- Nothing found that reads worse than before.
- The working-page body copy inside sheets is still 14 px Geist. Lighter headings make it look slightly small next to them; it is to be reviewed in Gate 8 with the type audit.
- At 1920 px the hero relief is small in a large dark frame. This is pre-existing and belongs to Gate 4 (camera framing).
- The `/species` 3D gallery still loads all twelve JPG masters, because its card textures need them. It is the heaviest view.

### Verification
- `tsc -b` clean; `vite build` clean; oxlint shows only pre-existing warnings.
- Screenshots before and after (scratch harness), covering:
  - widths of 1440, 1920, 1024 and 390;
  - reduced motion, on desktop and phone;
  - the loader on desktop and phone;
  - every working page and the profile dialog.
- Keyboard test: the dialog trap holds after 60 Tab presses; Escape returns focus to the card that opened it; arrow, Home and End work on both tablists; `/documentary` has `main` and `nav`. No console errors on any route.

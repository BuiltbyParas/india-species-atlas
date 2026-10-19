# Whole-experience review

12 October 2026 · branch `atlas/master-04-visual-quality` (premium worktree) · **uncommitted**, on top of the
uncommitted field-study polish (`FIELD_STUDIES_POLISH.md`). An evaluation of the whole site as one product, then
targeted corrections of what the evaluation showed — not a redesign.

Pre-change state: git ref `refs/backups/pre-whole-review` (`2c873ab`, tracked changes, `git stash create`), the
untracked files as `~/.cache/ispa-review/backup/untracked.tgz`, a copy of the tree at `~/.cache/ispa-review/baseline/`
and its production build at `~/.cache/ispa-review/dist-before/` (served on :4302 for comparisons). Every capture named
below is under `~/.cache/ispa-review/`.

## 1. How it was reviewed

- **Build:** the production build (`npm run build`, served by `vite preview` on :4301). Visual judgements of the worlds
  at full quality on the dev server with `?hold=1` (governor frozen); behaviour and timing on the production build with
  the governor live.
- **Browser:** Playwright Chromium 153.0.8010.12, headless, `--use-angle=gl --enable-gpu`; GPU reported as
  ANGLE / AMD Radeon (radeonsi renoir), the author's integrated AMD GPU. 1440 × 900 at DPR 1; 390 × 844 and 430 × 932
  touch (DPR 1); list widths also at 768, 1024, 1199, 1280.
- **Machine:** not idle and not made idle (nothing of the author's was closed): 5.6 GB RAM with 0.5–0.7 GB available,
  4.1 of 5.6 GB swap in use, load average 1.6–3.8, a live video wallpaper, Firefox and a Vite dev server from 10 October
  running. Frame rates here swing between runs; only repeated differences are reported.
- **What was captured:** the loader and hero entrance as timed frames; the home page at half-viewport steps (desktop
  and phone, reduced motion, no WebGL); the home page scrolled by wheel at a reader's pace with the stage logged every
  250 ms; every chapter of all five studies (desktop) and their openings (phone); the moves between places as timed
  frames and as a compositor screencast with per-frame brightness; a keyboard walk of the home page and a study.

Scripts (all `scripts/audit/`): `review-journey.mjs`, `review-scroll.mjs`, `review-transitions.mjs`, `review-keys.mjs`,
`review-handover.mjs` (screencast of enter / exit / next), `review-moves.mjs` (the moves by click, both motion modes);
and from earlier passes `field-pass-capture.mjs`, `field-polish-checks.mjs`, `field-polish-hold.mjs`.

## 2. The journey, section by section

| Section | What works | What was weak |
|---|---|---|
| Loader → hero | The outline lands where the relief rises; the lamp's entrance and the title on the Tropic are the strongest minutes of the site. | — |
| Hero → descent → Ch. 02 | One light, one ground; the markers carry the data. | — |
| Ch. 02 → field-studies index | The dawn under Ch. 02 hands over to the grassland's last light. | On a loaded machine the stage can give up mid-index (§5). |
| The five studies | Five hours, one light model; type in the dark of the frame — except where a chapter faces the sun. | **River:** the chapter text stood in the haze's glare (2.1–2.7 : 1). **Floodplain:** the rhinoceros rendered near-white, ~45 % above its own photograph. **Snow leopard:** chapters 01–04 are almost one frame. **Forest:** the over-canopy chapter (dotted crowns, cold sky band). |
| Into / out of a study | The camera goes in; one world turns into the next. | Every hand-over jumped in brightness (+16 / −21 entering, +57 to the next study, +22 / −12 back to the index); the next study's camera swung through other shots; after "Field studies" the index showed the grassland under "Bengal Tiger". An ordinary link into a study was captioned "Not on the sheet · Page not found". |
| Ch. 03 selection | The ledger and the dome as one plate. | On a phone five common names were cut mid-word. The dome shows the records' photographs ungraded. |
| Ch. 04 → closing → colophon | The relief returns; the closing on the Tropic. | — |
| Reduced motion, no WebGL | Same facts, still compositions, photographs on dark grounds. | — |
| Keyboard | Every stop has a focus ring; the index's list moves the page to each study. | Ch. 03's first two list buttons take focus off screen. |

Coherence across sections: grounds, type and the light model now hold from the hero to the studies; the remaining
breaks are moments, not registers — the hand-overs (fixed), the ungraded dome photographs, and the weak-machine
fallbacks that change the page under the reader (§5).

## 3. Scientific communication

Checked, not changed: each study's first chapter says what is drawn and that the animal is the record's photograph cut
out and toned to the drawn light; the relief says ETOPO 2022 ×20 and ETOPO is on `/sources`; per-asset credits in
`src/assets/field/CREDITS.md` match the pages (the tiger and rhinoceros cut-outs are both Tisha Mukherjee's, CC BY-SA
4.0); headline figures are computed (a "51" on a phone capture was the count-up caught mid-flight; the data says 52).
The two corrections that touch representation: the rhinoceros is now drawn at its photograph's own value (§6.4), and
the river's honesty note, which was unreadable on its glare, now reads (§6.1).

## 4. Inconsistencies found

1. Light that jumps at every hand-over between the index and a study, or study and study (§6.2).
2. One study whose words cannot be read where the rest keep theirs in the dark (§6.1).
3. A subject drawn far brighter than its photograph, beside four that match theirs (§6.4).
4. Two photographic registers: graded worlds, and raw photographs in the Ch. 03 dome and the photo fallback.
5. Fallbacks that change the page under the reader on a slow machine (§5).

## 5. Performance

| Test | Conditions | Result |
|---|---|---|
| Forest held on one chapter, sun turning (`field-polish-hold.mjs`) | dev, `?hold=1&quality=balanced`, 4 runs of this tree | ground level (ch. 01) 51.5 · 53.5 · 52.5 · 51.6 fps; over the canopy (ch. 04) 40.2 · 41.7 · 40.4 · 42.2 fps. The polish pass recorded 47.2 and 35.8 on a busier machine; the ≈ 11 fps cost of the canopy repeats. |
| Forest, production, governor live | 6 s held per chapter, sun turning | ch. 01: 51.4 fps, p95 33 ms, rung 0. Scrolled to ch. 04 the governor stepped once (rung 1: no multisampling) and the session tier fell to `low`; there 60 fps, p95 17 ms. JS heap ≈ 23 MB. No console errors. |
| Home page by wheel at a reader's pace | production, 80 px / 60 ms with pauses, three runs (the last on the final build, logging `__atlasWorld().live` and the hero's height) | mean 37–39 fps. In all three runs the hero's scene gave up ("too slow") at the Ch. 03 → 04 boundary: atlas world live → not live, hero section 3,420 → 900 px, page 18,575 → 15,461 px, so Ch. 04 is drawn as its SVG sheet from then on; in one run the scroll position moved back 2,052 px. In two runs the field stage gave up at the end of the index and came back 15 s later inside Ch. 04, which then ran at 4.7–17 fps with frames of 317–567 ms. From Ch. 03 on a fresh page: 54.9 fps, nothing gave up. |

Reading: on this laptop under this load the studies hold (the governor steps quality, not the experience); the page as a
whole does not — two scenes with their own governors judge frames that include each other's work and the dome's build.
Not changed in this pass (§8, 1). No change here was made for a benchmark, and the foliage and lighting were left alone.

## 6. The five most important issues, and what was done

### 6.1 The river's words stood in the glare — fixed
*Seen:* chapters 01, 02 and 04 of the river set ivory type over a sky the haze's forward scatter takes close to white;
the lede measured 2.1–2.7 : 1 and the honesty note 1.4 : 1. The same on a phone in the grassland's Range chapter.
*Why it matters:* the content cannot be read, and the study breaks the site's rule that type sits in the dark of the frame.
*Cause found:* not bloom (off: 234 → 231 grey behind the text) and not exposure (231); the haze (scatter off: 95).
*Correction (`field.css`):* a graduated filter over the river's sky, as a photographer would set (darkest at the top, eased
off by the far bank, nothing over the water); a fuller chapter veil in the river; a soft halo of each world's own dark on
chapter text and a wider one on the small notes (invisible over dark ground); on phones the chapter band laid twice.
*Result:* river ledes 6.3 · 5.9 · 7.5 : 1, its note 2.2 : 1 (readable, still the weakest line), grassland Range on a
phone 2.9 → 3.5 : 1. *Trade-off:* the river's upper sky is a stop darker — a deeper dawn — and the sun's glow sits at the
far bank; on phones the band is a touch darker over the snow leopard's peaks. No GPU cost.

### 6.2 Every hand-over jumped — fixed
*Seen (compositor screencast):* entering a study from the index the frame brightened 16 levels in one frame when the
world was lifted over the page, then darkened 21 when the study's scrim and type arrived at once; going on to the next
study it brightened 57; back to the index +22 then −12. The next study's camera also swung through two other shots for
a second, and after "Field studies" the index showed the grassland under "Bengal Tiger" until the reader moved.
*Why it matters:* it is the signature move of the site, and it broke continuity at its two ends.
*Causes:* page layers (scrim, veils, furniture) that shade the world vanish when the stage is lifted above them
(`stage.hold`) and print at full strength when it is handed back; the study page arrived (`is-arrived`) unseen under the
held world; the new study read the previous page's scroll position while held; `FieldStage.show()` acted on a request
made stale by a later one when its world finished building.
*Correction:* the index's scrim fades during the camera's move; a study's words, scrim and furniture wait for the
hand-back and ease in on `--ease-cinema` (`FieldStudyPage.tsx` `held`, `field.css`); leaving a study, its words and
shading clear for 0.45 s before the world is lifted (`fieldNav.ts` `clearPage`); the index back from a study holds its
words and scrim until the hand-back; a held study does not follow the scroll (`FieldStudyPage.tsx`); `show()` drops a
superseded request (`stage.ts`).
*Result:* entering, one step of 4–6 at the click (the index's own type leaving) on a calm run; exit none ≥ 4; next study
+8 at the click, then the designed dissolve; the camera holds the new study's opening; the index stays on the study the
reader left. On a loaded run stalls of 1–2 s still cut fades into steps. *Trade-off:* leaving a study waits 0.45 s before
the camera moves; the study's title arrives after the world is handed back (≈ 1–1.5 s after the click), not under it.

### 6.3 "Not on the sheet · Page not found" on the way into a study — fixed
*Seen:* any ordinary link into a study (the footer, the menu, a species page) turned the page with the 404's caption.
*Correction (`routeCaption.ts`):* a `/field/:id` case read from the species record — "Field study · Great Indian Bustard ·
Desert National Park · 26°50′N 70°43′E", the anchor the study's own furniture shows. Read from the record rather than
`content/fieldStudies`, whose import regrouped the first bundle into one 600.6 kB chunk and tripped the size warning
(same bytes; the main chunk is back to 371 kB).

### 6.4 The rhinoceros rendered near-white — fixed
*Seen:* in storm light the animal read as a pale plaster rhinoceros: flank (221, 189, 154), luminance ≈ 193, against its
photograph's 164 — a white rhinoceros on the page of a grey one.
*Correction (`worlds/floodplain.ts`):* subject gain 0.48 → 0.30. Flank now (193, 157, 123), luminance 162: the photograph's
own value, warmed by the low sun, the folds of the hide modelled again. *Trade-off:* a little less glow against the slate
sky; the rim and the gold remain.

### 6.5 Common names cut mid-word in Ch. 03 on a phone — fixed
*Seen:* "Ganges River Dolph", "Lion-tailed Macaqu", "Greater One-horne" at 390 px.
*Cause:* the row grid kept an empty 6.5 rem column for the scientific name, which is hidden below 1200 px; the ellipsis
never applied because the name is a transformed inline-block (its reveal mask).
*Correction (`editorial.css`):* the fourth column only where the scientific name is shown; the column heading right-aligned
when it wraps. No name clipped at 390, 430, 768, 1024, 1199, 1280 or 1440.

## 7. Verification (final build)

- `npx tsc -b`, `npm run build` (23 route pages, no chunk warning), `npx oxlint` on every changed file: pass.
- Routes (`field-polish-checks.mjs`): all 14 routes × 1440 and 390 (touch) — no overflow, no console errors, all five studies
  `ready` with the light control; again after the last change for the home page, the five studies, `/atlas` and a species
  page. No WebGL: home and studies `flat`, no errors. Reduced motion: home and studies, no errors. The only flag in every
  run is the snow leopard's footage request aborted when scrolled past — recorded in the polish pass, the same in the
  pre-change build.
- Moves (`review-moves.mjs`), normal and reduced motion: index → river study → next (tiger) → "Field studies" → index —
  each on the right page and world, scroll at the top, words arrived, world handed back, the index on the tiger: all passed.
- Keyboard (`review-keys.mjs`): home 60 stops and a study 24 stops, every stop with a focus ring; the two Ch. 03
  off-screen stops remain (§8).
- Fallback captures: no WebGL and reduced motion show the title, first chapter and scrim (the arrival change).

## 8. The five highest-priority remaining weaknesses

1. **The page changes under the reader on a slow machine.** Two governors (hero, field stage) judge frames that include
   each other's work; under load the hero gives up around Ch. 03 → 04 and the page shortens by ~3,100 px while Ch. 04
   swaps from the relief to its sheet mid-chapter; the field stage can give up at Ch. 03 and return 15 s later with a long
   frame. Proposal: one arbiter for the frame budget; do not judge a scene whose host is mostly off screen or while
   another scene builds; once the reader is past the hero, keep its height and fall back only the act. Needs its own pass.
2. **The forest seen from above.** The over-canopy chapter's sprays read as a dotted pattern under a cold blue band, and
   cost ≈ 11 fps against ground level at full quality (production steps down once there).
3. **The snow leopard study barely moves.** Chapters 01–04 are nearly one composition (the leopard large, centre-left);
   the faceted boulders read as low-poly at that distance.
4. **Two photographic registers.** The Ch. 03 dome shows the records' photographs as they are (a saturated blue dugong,
   a bright gharial) between graded worlds; the too-slow / no-WebGL index shows them ungraded at half opacity. Grading the
   photographs is a representational choice for the author.
5. **Small remaining breaks:** the hand turns the forest's sun far enough that the tiger leaves its shaft and reads as a
   dark silhouette in the haze — and the study's way out sits at the bottom right, so leaving the forest by it puts the
   pointer exactly there and the retreat and the index show that silhouette; a page turn between studies can show the previous world for a frame before the new one
   cuts in; the river's honesty note is readable but at 2.2 : 1; Ch. 03's first two list buttons take focus off screen;
   the 0.45 s pause before leaving a study is noticeable on a fast machine.

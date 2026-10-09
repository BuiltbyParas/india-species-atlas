# Master 03 — final integration and production polish

*Branch `atlas/master-03`, cut from `atlas/field-studies` (830ff2f). 9 October 2026. Not merged, not pushed.*

This pass audited the running site rather than the documents, fixed the problems that evidence showed, and left working systems alone. Everything below separates **measured** from **judged**.

---

## 1. Audit — what was actually found

Method: production build served by `vite preview`, driven by Playwright in Chromium (ANGLE/GL on the laptop's Radeon). Every route captured at 1440 × 900 and 390 × 844 (touch). The home page and all five studies were walked in half- and full-viewport steps. Index hover, entry, exit, next-study, the film, reduced motion, no-WebGL and keyboard order were tested by script. The 8-size matrix ran for the index, a study, the menu and horizontal overflow on every route.

**Working, kept as is:** all eleven routes and the 404; the shared field stage (one renderer, pauses off screen); entry → study → Esc returns to the same study on the index (verified: section top −2 vh at study 03); next-study chain; the film (AV1 720p, captions, focus returned on close); reduced motion (no loader; chapters held, not travelled); no-WebGL fallback (photographs in their grounds); the atlas, species, compare, conservation, sources and about pages. No console errors, no failed requests, no horizontal overflow on any route at 1440 or 375 before or after.

**Problems found (and fixed, §2):**

| # | Evidence | Problem |
|---|---|---|
| 1 | home + study 05 screenshots | TRANSFORM's "form" read as a grey boulder, the weakest object on the site (Master 02 scored it 7). Chapter text lay directly on it. |
| 2 | study walks (rhino, dolphin) | The first chapter's 0.9 s arrival delay also delayed its *exit*, so chapters 01 and 02 read over each other. |
| 3 | tiger, rhino, dolphin walks | Chapter words sat on whatever the world put behind them (the lantern-lit tiger photograph, the form). |
| 4 | phone walks | Long chapters scrolled *over* the progress line and the way out. |
| 5 | phone + desktop index | Outgoing study names lingered under incoming ones (two titles at once on a phone, where they share a position). |
| 6 | index at 1024 px | List names wrapped to four lines and collided with their verbs. |
| 7 | study at 1024 px | A 4 px horizontal overflow (a right chapter's veil). |
| 8 | study 05 corner | The vertical place name ran down into the coordinates and the way out. |
| 9 | navigation audit | The field studies (the signature feature) were in no navigation at all; the menu called the home page "Atlas" while `/atlas` was "Map"; nothing but "Menu" was visible in the header. |
| 10 | index | No visible entry affordance: only the cursor said a study could be entered. |
| 11 | loader timing (measured) | 5.4 s on every first visit before the page could be read (a 5.2 s minimum). |
| 12 | hero screenshot | The relief was small and far right; the title, not the India object, dominated. 1,400 bright "stars" read as glitter. |
| 13 | film opened by click | The cursor kept its "Play" word over the playing film until the mouse moved. |
| 14 | contrast (computed) | `--fs-faint`, used for the honesty notes and photo credits, was 3.1:1 on dark grounds and 2.7:1 on the Thar's sand. |
| 15 | portrait phone | The documentary player is a 16:9 frame letterboxed into a tall screen with no hint. |

**Checked and not a problem:** hard-coded figures in the UI (none; headline numbers are computed from the dataset, the studies read figures from the record's own sentences); dead controls (none found); duplicate renderers (one field stage, one hero renderer, as designed); idle rAF on working pages (none, from Master 01).

## 2. Changes

**Field studies** (`world/field/worlds/floodplain.ts`, `components/field/*`, `pages/FieldStudyPage.tsx`)

- The rhino's form is now **raised from the atlas's schematic silhouette** of the species (`speciesSilhouettes.ts`, the same outline the hero uses): rasterised, a signed distance field (chamfer), a local-thickness max filter so legs stay pillars and the body is a barrel, two sheets closed exactly on the outline, legs set to the body's sides, three shallow skin folds. It makes the same claim the outline makes and the note now says so ("body plan and posture only, not a model of the animal"; hidden where there is no form to see). Camera shots reframed so the words and the form share the screen; on a portrait phone the preview lifts the form clear of the name.
- Chapters: quick exit (0.3 s) and delayed entry (0.18 s); a soft local veil of the world's tone behind every chapter on desktop (stronger on dark worlds); the runway clips its own overflow.
- The frame's furniture moved to its own sticky layer above the chapters; on a phone it stands on a foot of the world's ground.
- The index: the verb is now also a visible **Enter** control; outgoing names fade in 0.25 s; list verbs hidden below 1280 px; `/#field-studies` opens the index (from any page, from the header or the menu).
- `--fs-faint` raised to ≥ 4.5:1 on each study ground (computed: 4.6–4.9 on dark grounds, 4.6–4.7 on sand).

**Navigation and opening** (`layout/Navbar.tsx`, `layout/FlowingMenu.tsx`, `cinema/Loader.tsx`, `home/heroScene.ts`, `cinema/CustomCursor.tsx`, `index.css`)

- Header (≥ 1024 px): **Map · Species · Field studies · About**, with the current page underlined; the running head moves to ≥ 1280 px so nothing collides at 1024.
- Menu: "Home" (was "Atlas"), and **Field studies** added (5 worlds; its strip lists the verbs and species). Labels resized so seven rows share the height.
- Loader: the same sequence at twice the pace (minimum 2.6 s; GPU ceiling 3.5 s).
- Hero: the relief is closer (start distance 24 → 19) and further right; the sky has 520 dimmer points instead of 1,400.
- Cursor re-reads what is under it when the cinema opens or closes.

**Documentary** (`pages/DocumentaryPage.tsx`): a one-line hint on portrait phones to turn sideways. The film and the player are otherwise untouched.

## 3. Measurements

All on production builds, headless Chromium with `--use-angle=gl --enable-gpu` (real Radeon), 1440 × 900, load ≈ 1.3. Baseline = 830ff2f built from `git archive` and served on port 4174, runs interleaved.

| | baseline (830ff2f) | Master 03 |
|---|---|---|
| Loader: page load → sheet starts lifting | 6,963 ms | 4,442 ms (includes ~1.6 s browser start-up in both) |
| Home, 150 wheel steps × 120 px (frames > 33 / > 50 ms) | 46 / 13, then 34 / 6 | 40 / 11, then 35 / 9 |
| Study 05 (rhino), 140 × 160 px | — | 1,211 frames: 0 / 0, p95 16.7 ms, no long tasks; 83.6k triangles, 6 draw calls, heap 11 MB |
| Study 04 (tiger), 140 × 160 px | — | 0 / 0, p95 16.7 ms |
| Rhino world build | — | 120–200 ms (idle, off the scroll) |
| Entry chunk JS + CSS (gzip -9) | 227.1 kB | 227.9 kB (+0.8 kB) |
| Floodplain world chunk, gzipped | 6.5 kB | 6.9 kB |

The home page's slow frames and 50–130 ms long tasks during a *fast* scroll exist equally in the baseline (world builds and the hero descent landing mid-scroll); this pass did not change them. See §6.

## 4. QA performed

- **Sizes:** 1920 × 1080, 1440 × 900, 1280 × 800, 1024 × 768, 768 × 1024 (touch), 430 × 932, 390 × 844, 375 × 812 (touch): every route, no horizontal overflow; index, a study and the menu captured at each.
- **Flows (scripted):** keyboard order (skip link → wordmark → four links → menu, all with visible focus); index → study by keyboard (focus lands on `main`); Esc → index at the same study; last chapter → next study; header and menu "Field studies" from another page and from the home page; film open → playing (AV1 chosen, captions track present) → Esc → focus back on the film entry.
- **Reduced motion:** no loader; studies hold each chapter; no errors.
- **No WebGL** (`--disable-webgl`): studies and index fall back to photographs; no errors.
- **Console / network:** no errors, no failed requests on any route at desktop, phone and reduced motion.

**Not tested:** real phones and tablets (all touch tests are emulated); a real low-end GPU (tiers exercised only as before); Safari and Firefox; a screen reader (structure only). Lighthouse was not run.

## 5. Scientific content

- No figure, status, date, range or boundary was added or changed. The new rhino form is drawn from the existing schematic outline, and the note says what it is.
- **Flagged, not changed:** the dolphin record's *why it matters* says the river serves "~600 million people who depend on the Ganga and Brahmaputra basins". None of the record's three sources (IUCN, Project Dolphin, WWF India) could be checked offline for that figure. It should be sourced or softened by the author.
- Still missing (unchanged from Master 02, `MISSING_CONTENT`): a sourced transmission-line alignment, a dated bustard series, river centre-lines and barrage sites, earlier tiger estimates, IRV2020 numbers, real terrain.

## 6. Creative scores (builder's, not a review)

| | | | Why / what would raise it |
|---|---|---|---|
| Art direction | 8 | | Environments distinct, one system. |
| UX clarity | 8 | | Destinations now visible; the field studies are reachable from everywhere. |
| UI quality | 8 | | |
| Visual hierarchy | 8 | | Hero now has one dominant object. |
| Typography | 8 | | |
| Photography | **7** | below 8 | Photos are flat planes at 720 px on the balanced tier (the dolphin's is soft). Larger originals and subject masks are an open licensing decision (HOMEPAGE_CREATIVE_DECONSTRUCTION §16 Q4/Q6), not one to take silently. |
| 3D quality | **7** | below 8 | The rhino now reads as the animal, but as a clay figure from a 2D outline. Grounds are procedural impressions. A better form needs a sourced 3D reference, which does not exist under an open licence. |
| WebGL quality | 8 | | |
| Motion direction | 8 | | |
| Hover interactions | **7** | below 8 | Strong on the index and the worlds; the working pages' hovers are conventional (by design: data pages stay flat). |
| Scroll storytelling | 8 | | |
| Transitions | 8 | | |
| Featured field studies | 8 | | |
| Scientific credibility | 9 | | One unverified sentence flagged (§5). |
| Responsive design | 8 | | Emulated only. |
| Accessibility | **7** | below 8 | Contrast of the study notes fixed; keyboard and focus verified. No screen-reader pass and no real-device test, so not claimed higher. |
| Performance | **7** | below 8 | Studies are clean (0 slow frames). The home page drops frames during a fast scroll, as it did before. Next: build worlds only after the hero has settled, and move the floodplain form build into the ground worker. |
| Originality | 8 | | |
| Technical craft | 8 | | |
| Overall coherence | 8 | | |

## 7. Next steps

1. Decide HOMEPAGE_CREATIVE_DECONSTRUCTION §16 Q4/Q6 (larger photographs, subject masks). That is the main lever left for photography.
2. Source or soften the "~600 million" sentence in the dolphin record.
3. Performance: defer world builds until the hero is off screen *and* the scroll is idle; build the rhino form in `ground.worker.ts`.
4. Test on a real phone (iOS Safari and Android Chrome) and with VoiceOver / TalkBack.
5. `/conservation`'s programme grid is still a grid (left open since the final-polish pass).
6. Lint: `video/src/scenes/himalaya.ts:92` has a syntax error (an unescaped apostrophe in "India's", from 7603c95 on `main`). It belongs to the video work, which this pass does not touch; `src/` lints with 0 errors and the same 17 warnings as the baseline.

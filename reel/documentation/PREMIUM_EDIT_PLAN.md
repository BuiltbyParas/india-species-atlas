# Premium edit plan: the 62-second vertical Atlas film

**Status:** plan for approval. Nothing is rendered, and no code or edit data has changed.
**Master:** the 97 s film (`video/atlas-promo/`, checkpoint commit `ca37f3b`). It stays untouched. This cut is
that film, compressed, re-laid for 1080×1920, and finished to a higher standard: new camera work, masks, sound, a
small amount of environmental footage, and a guide character. It is **not** a new film.

**Replaces:** the earlier 21-shot reel draft (`EDIT_PLAN.md`, `SHOT_LIST.md`, `TRANSITIONS.md`, `SOUND_DESIGN.md`,
`FLOW_PROMPTS.md`, `audio/voice/VOICE_SCRIPT.md`, `character/design/CHARACTER_SPEC.md`). That draft rebuilt the
film around Flow footage. This plan keeps the 97 s film's structure and sequence instead.

Companion documents:

| Document | Holds |
|---|---|
| `PREMIUM_SHOTLIST.md` | The master table: every shot, its time, source, character, voice, text, transitions and sound |
| `CHARACTER_DESIGN.md` | The guide: design, the 8-asset sheet, and the integration rules |
| `VOICE_SCRIPT.md` | 13 lines with timecode, emotion, delivery, pauses, action and visual beat |
| `FLOW_SHOT_PROMPTS.md` | Five environmental shots plus one optional shot. No animals. |
| `SOUND_DESIGN_PLAN.md` | Music, ambience, SFX and voice for every section and transition |

---

## 1. The rules this cut keeps

1. **The film is one continuous geographic world.** The map is a single layer under the whole film. Scenes move
   its camera and switch its layers. Footage is a window that opens *into* the map at a real place and closes
   back into it. Hard picture cuts appear in only two places, each for a reason (§5): the turn into the threats, and the interface tabs, where a cut is how the interface itself behaves.
2. **The line is the idea.** A ruler, then a coastline, a wire, a road, a river, a ridge, and the line under the
   name. Every transition is the line changing role.
3. **Real animals only.** The five species are the existing credited Wikimedia Commons photographs, with their
   credit on screen. Flow generates landscapes and infrastructure only, never a species.
4. **Facts come from `src/data/`.** Names, statuses, counts and quotes are read at render time. Every spoken
   claim names its field in `VOICE_SCRIPT.md`.
5. **The Atlas stays visually dominant.** The guide is on screen for about 9.4 s of 62, in seven short
   appearances. She is never larger than the subject, except in the final turn.

## 2. Length and budget

Target 58–65 s. **This plan runs 62.0 s.** The two extra seconds go to the threat sequence (the film's emotional
centre) and to the brand hold, where the URL needs to be readable.

| Section | Approved budget | This plan | 97 s original | Shots |
|---|---|---|---|---|
| Signal | ~3 | 3.0 (0:00.0–0:03.0) | 5 | P01 |
| India | ~6 | 6.0 (0:03.0–0:09.0) | 8 | P02–P03 |
| Landscape | ~8 | 8.5 (0:09.0–0:17.5) | 11 | P04–P08 |
| Life | ~12 | 12.0 (0:17.5–0:29.5) | 14 | P09–P14 |
| Data | ~4 | 4.0 (0:29.5–0:33.5) | 11 | P15 |
| Threats | ~9 | 9.5 (0:33.5–0:43.0) | 10 | P16–P20 |
| Conservation | ~5 | 5.5 (0:43.0–0:48.5) | 10 | P21a–P21b |
| Atlas / UI | ~7 | 7.0 (0:48.5–0:55.5) | 14 | P22–P24 |
| System + Brand | ~6 | 6.5 (0:55.5–1:02.0) | 7 + 7 | P25–P26 |
| **Total** | **60** | **62.0** | **97** | **27 shots** |

```
0     3        9            17.5              29.5   33.5          43    48.5      55.5    62
|SIG  |INDIA   |LANDSCAPE   |LIFE              |DATA  |THREATS      |CONS |ATLAS UI |BRAND  |
 tick  trace    5 windows    5 real photos      sweep  wire·road·cut  3Qs   phone UI  turn·name
 hush ─ pulse ──────────────→ melody ──────────→ ─────→ drone/hum ──→ resolve → rhythm → swell · silence · hit
```

## 3. Keep / modify / cut, and how each part improves

Each row says what the 97 s film does now and what this cut does instead. "Sound" refers to `SOUND_DESIGN_PLAN.md`.

### Signal (S01) → P01 · KEEP + MODIFY

| | |
|---|---|
| **Current** | 5 s. Crosshair, extent read-out with settling digits, longitude ruler, INDIA rises off it and shrinks into the corner label. |
| **New** | 3 s. The same sequence, faster. The ruler draws vertically through the portrait frame's centre and **ticks once per major degree** (65°E…95°E). Each tick has a click, so the line is heard drawing. INDIA rises off the ruler through a mask with a low sub swell. The settling digits are kept, at 28 px, inside the safe zone. |
| **Transition out** | Unchanged: INDIA shrinks into the corner label while the coastline begins to draw from the ruler's last tick. No cut. |

### India (S02) → P02–P03 · KEEP + MODIFY

| | |
|---|---|
| **Current** | 8 s. Coast traced; graticule, fill, borders, contours and relief come up; "One country. / Many landscapes."; a metadata column (extent, boundaries, projection). |
| **New** | 6 s. The coastline is traced as before, but **the camera tracks the drawing point** (a 4 % push that follows the pen) instead of holding still, so the outline feels drawn rather than revealed. The layers arrive as three distinct *geographic activations*: fill, then borders, then relief, each with its own soft tonal tick. The relief rises with a 6-frame light sweep from the north-west, the hillshade's own light direction. "One country. / Many landscapes." stays and moves into the portrait type zone. **The metadata column is cut** (it is too small to read on a phone). Only "THE SUBCONTINENT" survives. |
| **Character** | C1: a small full figure at the lower left, back three-quarter, looking up at the map as it draws (CHAR_05). 1.4 s. |
| **Transition out** | **Camera dive** into the Thar (§5, T2). |

### Landscape (S03) → P04–P08 · KEEP + MODIFY + NEW footage

| | |
|---|---|
| **Current** | 11 s. Five map camera moves (Thar, central highlands, Ganga, Brahmaputra floodplain, Himalaya), each with a big word, the region name, its coordinates, and a leader line to the place. Map only. |
| **New** | 8.5 s. The same five moves and the same words, but each move now **lands on a window**. The leader line reaches the place, its ring pulses, and a **mask shaped like the region's own contour** opens from that point onto Flow footage of the landscape (F01, F03-A, F04, F06, F05). The window grows to about 70 % of the frame, holds, then **collapses back into the point** as the camera pulls to the next region. The map never leaves the frame: it stays visible around the window's edge, and the window carries the map's grain. |
| **Why it is better** | The map moves stay intact. The footage now answers the question the map raises ("what is it actually like there?"), and it stays tied to a real place on the map. |
| **Character** | C2 in P04: half body at the right edge, pointing toward Rajasthan as the camera dives (CHAR_03). 1.0 s. |
| **Fallback** | If F06 (wetland) is not made, P07 stays map-only: the Brahmaputra draws in the river colour and the floodplain tint pulses. |

### Life (S04) → P09–P14 · KEEP + MODIFY

| | |
|---|---|
| **Current** | 14 s. "Life, mapped."; five photos wiped on by a vertical line inside a fixed frame, a hairline from the photo to one locality, name, scientific name, status chip, a three-column fact row. |
| **New** | 12 s. "Life, mapped." stays. Each species becomes a **portrait card** in the lower half of the frame, with India held in the upper half. Each card plays four beats in sequence: (1) the vertical wipe line, kept because it is the film's line, draws the photo on; (2) the photo **pushes forward** from 94 % to 100 % scale with a soft drop shadow lifting off the map, while the map behind it drifts 2 % the opposite way (parallax); (3) at the same moment the species' **states of record fill** on the map in its status colour, and the link line draws from the card's edge up to its locality, ending in a ripple; (4) the name masks in, then the **status chip enters**. Between species, the map camera makes a **small physical pan** toward the next species' region, so the map moves under the cards instead of sitting still. **The three-column fact row is cut** (unreadable at phone size). Name, scientific name, status chip and the photo credit stay. |
| **Character** | C5 in P12 (dolphin): profile at the left edge, head tilted, eyes closing as if listening, on "It finds its way… by sound" (CHAR_02, listening variant). 1.4 s. |
| **Honesty** | The photo credit and licence stay on every card, at 22 px. The link line reaches one locality, which is a drawing device as before. |

### Data (S05) → P15 · MODIFY (mostly cut)

| | |
|---|---|
| **Current** | 11 s. Every locality lands west to east while a counter counts them; then a four-figure grid; the status bar; a footnote. |
| **New** | 4 s. **Only the strongest idea survives: the number *is* the markers.** The camera holds the whole country. Every locality lands in a west-to-east sweep, each with a tiny tick that builds into a texture, while one large counter climbs in the type zone. Under it, the status bar (CR / EN / VU counts in the status colours) draws in 0.8 s. **The four-figure grid and the endemic footnote are cut.** One honest label stays: "Indicative localities within known ranges" (from the data model's own definition in `src/types/index.ts`). |
| **Voice** | None. The sweep and its sound carry it, and the viewer gets breathing room before the threats. |

### Threats (S06) → P16–P20 · MODIFY + NEW footage

| | |
|---|---|
| **Current** | 10 s. Camera into the Thar; a three-step chain (Species → Habitat → Threat: power lines) with the bustard's threat sentence quoted; then the map fragments while a "most recorded threats" list counts up; "Threats are recorded per species, not per place". |
| **New** | 9.5 s. The chain becomes **the line itself**. (1) P16: the camera dives back into the Thar, the bustard's states glow, and a two-step chain reads GREAT INDIAN BUSTARD → POWER-LINE COLLISIONS (the dataset's threat name) in the threat colour. (2) P17: a window opens onto **F02, the same grassland as F01 but now with a transmission line across it** (revisited, not new). A 50 Hz hum fades in, and the bustard's threat sentence is quoted verbatim. (3) P18: the frame **freezes, desaturates toward the map ground, and the wire is traced** in a canvas-coloured stroke that straightens and thins and lands on the map as a line, while the hum cuts dead. (4) P19: the camera travels along that line south-east to central India, and a window opens on **F03-B, the same forest as P05 now with a highway through it**. The road's centre line lifts out of the footage into the map. (5) P20: pull back to all of India and **the map fragments** (kept), with the honesty label. **The "most recorded threats" list is cut** (a list, and too small for a phone). |
| **Character** | C3 in P18: foreground, out of focus, a raised hand following the wire as it straightens (CHAR_04). 1.2 s. C4 in P20: a hand and forearm reaching in from the right, a fingertip tracing the tiger's locality line on the map as it breaks apart (CHAR_06, trace). 1.0 s. |
| **Honesty** | The line the hand traces is the drawn line joining the tiger's indicative localities. It is never labelled a corridor. The voice speaks of corridors in general, which `threatNote` supports. "Threats are recorded per species, not per place" stays on screen through P20. |

### Conservation (S07) → P21a–P21b · KEEP + MODIFY

| | |
|---|---|
| **Current** | 10 s. The map re-forms, lines reconnect, programmes switch on in the year order they began, with a year counter and the programme names listed; then "Know where it lives. / Know what presses on it. / Know what protects it." |
| **New** | 5.5 s. The re-forming map is the turn of the film, so it gets **the film's biggest physical move**: the fragments slide home with a short spring settle (`EASE.cinema`, about 2 % overshoot) as the music resolves. Programme sites switch on in year order as **ripples** (kept). The year counter runs for 1.4 s, small, in the protect colour. **The programme-name list is cut.** The three questions stay, unchanged, and fill the type zone, each one masked in on a soft tonal hit. The third is in the protect colour, as in the original. |
| **Voice** | V10 sets them up ("you have to know three things"). The three lines themselves are **not spoken**: the text lands in silence, which gives them more weight. |

### The Atlas (S08) → P22–P24 · KEEP + MODIFY

| | |
|---|---|
| **Current** | 14 s. The map shrinks into a desktop browser's map pane; the real site's screenshots; the site's cursor presses a pin, opens the profile drawer and walks the tabs; then layers; eight index labels. |
| **New** | 7 s. **The camera pulls physically through the map into the interface.** P22: the map keeps scaling down until its outline registers exactly on the outline in the site's own map screenshot, and the plate fades in underneath it (a matched registration rather than a crossfade). The browser chrome then draws around it as a hairline. P23: a pin press (C6: the guide's hand taps it, with a touch ripple) opens the profile. P24: Distribution → Threats → Conservation tabs as three precise cuts on UI ticks, then the map's three layers toggle (Species · Threats · Conservation). **The eight index labels become three** (MAP · PROFILE · LAYERS). |
| **Capture** | **Recommended:** re-capture the real site at a phone viewport (430×932 CSS px at 3×) with `capture-ui.mjs`, so the UI fills 9:16 natively and nothing is shown that the site doesn't actually look like on a phone. **Fallback:** the existing 1920×1080 desktop plates, with the camera moving inside them as `atlas-script.ts` already does. Either way, every pixel of interface is a real screenshot. |
| **Character** | C6 (CHAR_06, tap). 1.2 s. |

### System view (S09) + Brand (S10) → P25–P26 · KEEP + MODIFY

| | |
|---|---|
| **Current** | System: back out of the UI over the whole map with every layer on; "Mapping is not just about where species are. / It is about where we choose to protect them."; a legend. Brand: everything falls away but India's outline; the wordmark, a rule, the site's tagline, and the URL. |
| **New** | P25 (2.5 s): **the reverse of P22.** The map pane scales back up out of the UI with motion blur until it is the whole country again, with every layer on. The closing lines stay. The first is spoken (V13), and the second lands silently in the protect colour on the music's swell. **The legend is cut.** P26 (4 s): every layer falls away except the outline. C7: the guide, small at the lower left, turns from the map to camera and speaks the last line (CHAR_07 → CHAR_08). The camera then **tilts up off her** onto the wordmark, which draws on in silence and is followed by **one final impact**. The rule, the tagline and the URL follow. The URL holds for at least 1.4 s. |

## 4. Vertical layout system (1080×1920)

```
 y=0     ┌────────────────────────┐
         │ IG header: no type     │
 y=250   ├────────────────────────┤
         │ MAP / WINDOW ZONE      │  India's full height ≈ 640 px here (camera key ay ≈ −330)
         │                        │  Landscape windows open from the place to ~70 % of frame
 y=900   ├────────────────────────┤
         │ CARD / UI ZONE         │  Life cards (photo 860×460), UI plates
 y=1180  ├────────────────────────┤
         │ TYPE ZONE              │  Section text, species name, status chip, counter
 y=1380  ├────────────────────────┤
         │ CAPTION BAND (voice)   │  Geist 500, 40 px, one line, sentence case
 y=1480  ├────────────────────────┤
         │ IG caption + buttons   │  no type
 y=1920  └────────────────────────┘
           x 90 ………………………… 940  (right 140 px is the IG button column)
```

- The camera keys gain a portrait `layout` (as the master's README describes): the whole-country frame becomes
  `ax: 0, ay: −330, z ≈ 0.78`. The landscape dives keep their targets and get portrait offsets.
- **The guide's zones:** the lower-left (x 90–420) and the right edge (x 760–990, partly outside frame). She
  never stands in the type zone while text is on screen.
- **Type sizes at 1080 wide:** display (Newsreader 300) 96–132 px; species names 84–96 px; labels (Geist 500,
  uppercase, 0.24 em) 26–30 px; quotes (Newsreader italic) 36 px; photo credits 22 px. No more than two sizes on
  screen at once, plus the caption.
- **Captions** are burned in for voice lines only (most Reels are watched muted). A switch turns them off.

## 5. The transition system

Thirteen transitions. Only T8 is a hard picture cut; the only other cuts are the UI tab changes in P24.

| # | Transition | Where | How it is built | Sound |
|---|---|---|---|---|
| T1 | **Ruler → coastline** | P01→P02 | The ruler's last tick becomes the pen point that starts tracing the coast. INDIA shrinks into its label (kept). | The tick's tail becomes a soft draw hiss |
| T2 | **Camera dive** | P03→P04 | The map camera accelerates in (log-space zoom, `cinema`), with 6-sample motion blur on the map layer only. Contours thicken, and the Thar's tint pulses. | Low-passed air rush; geographic pulse on landing |
| T3 | **Contour-mask window, open and close** | P04–P08 (×5), P17, P19 | A mask cut from a real contour around the place (from `promo/geo/contours.json`) expands from the place's screen point with `outExpo` over 0.4 s. The footage inside is scaled 108 %→100 % (a slight push back as it opens) and carries the map's grain. It closes in reverse while the camera moves on. | Geographic click on open; ambience J-cut 4 frames early; reverse air on close |
| T4 | **Region-to-region pull** | inside P04–P08 | The window closes into its point while the camera is already travelling: the next move starts 0.25 s before the window has fully shut, so the motion never stops. | Line-movement whoosh pitched to each region |
| T5 | **Ridge → contour ascent** | P08→P09 | F05's ridge line is matched to one high contour, the footage desaturates into it, and the camera pulls up to the whole country as the high contours glow. | Rising tone, then the music's Life melody |
| T6 | **Line-wipe card** | P09–P14 | The vertical wipe line (kept from S04) draws each photo on. Push forward, parallax, states fill, link line, chip (§3 Life). The next card's line wipes over the last. | Pencil-draw tick; state-fill pulse; chip tick; one soft low impact on CR only |
| T7 | **Locality sweep** | P14→P15 | The last card slides down out of frame while the camera rises to the whole country, and the localities land west to east. | Tick texture building into a soft wash |
| T8 | **Threat dive** | P15→P16 | **The one hard cut.** The sweep's texture stops dead, then the camera is already close on the Thar. The cut is the mood change. | Music drops to a single drone; low impact |
| T9 | **Wire → map line (freeze morph)** | P17→P18 | Freeze for 4 frames. A 3 px canvas stroke draws along the wire's catenary (a hand-keyed path), then straightens and thins to 1.5 px over 14 frames while the footage desaturates into the map's ground colour and the map fades up beneath it. The line lands on the bustard's locality line. | The hum cuts dead on the freeze; 0.3 s of near-silence; a tonal whoosh up a fifth |
| T10 | **Line travel → road** | P18→P19 | The camera travels along the line south-east. A window opens on F03-B with the road's centre line registered to the map line, which then lifts out of the footage and becomes the tiger's line on the map. | Low mechanical sweep; road rumble J-cut |
| T11 | **Fragment → re-form** | P20→P21a | The fragment (kept) holds for 0.6 s in silence; then the pieces spring home on the music's resolve. | Low sub drop; a warm swell into the resolve |
| T12 | **Map → interface registration** | P21b→P22 | The map scales down until its outline registers on the outline inside the real map screenshot; the plate fades up beneath it; the hairline chrome draws round it. The reverse runs at P24→P25. | Soft UI chime on registration; the reverse is a low swell |
| T13 | **Tilt to name** | P26 | The camera tilts up off the guide onto the wordmark, which draws on character by character (kept from S10). The picture never cuts; the sound does: the music stops under her last word. | Silence, then one final impact with a 2 s tail on the wordmark |

Rules: motion blur only on the moving layer (`<CameraMotionBlur samples={6}>`). Footage that meets the map
carries the map's grain for 6 frames, so neither pops. No glitch, swish presets, light leaks, lens flares or
RGB split. If a transition is felt but not understood, it becomes a plain cut.

## 6. Grade and finish

- **One surface.** Footage, photographs, map, UI and character all sit under the master's finishing pass
  (`components/fx/Finish.tsx`: grain and vignette), so they read as one film.
- **Flow footage grade:** saturation 0.82–0.88, greens pulled toward sage, skies desaturated more than land,
  highlights rolled off below clipping, blacks lifted no more than 2 % and then pulled toward `forest950` at the
  window's edge. No teal/orange, no bloom, no halation.
- **Photographs:** as in the master, with no new colour pass. The Life cards add only the drop shadow.

## 7. What stays exactly as in the master

The map renderer, its projection and boundary file; all data reads; type components; status colours; the
finishing pass; the real UI screenshots; the photographs and their credits; the five featured species and their
order (bustard, tiger, dolphin, rhino, snow leopard); "One country. Many landscapes."; "Life, mapped."; the three
questions; the two closing lines; the tagline and URL.

## 8. Production order (after approval)

| Step | Work | Gate |
|---|---|---|
| 1 | Portrait camera layout and the 27-shot timing, all map/type/UI, no footage, no character | Section timing feels right at 62 s with the scratch music in place; every frame's type sits inside the safe zone |
| 2 | Flow shots F01–F05 (F06 optional), graded and dropped into the windows | Each clip passes `FLOW_SHOT_PROMPTS.md` §QC; the window edges hold up at 100 % |
| 3 | Character model sheet → the 8 assets → composited | She reads at phone size, matches the grade, and never covers the subject |
| 4 | Voice recording; picture re-timed to the takes | Intelligible at phone volume over the music; the picture is moved to fit the voice, never the other way round |
| 5 | Music, ambience, SFX, mix | −14 LUFS integrated, −1 dBTP, voice always on top |
| 6 | QC and export | 1080×1920, 30 fps, no black spans or single-frame flashes (`npm run reel:qc`), all credits listed |

## 9. Decisions still open

1. **Disclosing the generated landscapes.** The windows carry place names ("Thar Desert") over generated
   footage. Recommended: a small line on the end card ("Landscapes: generated visualisations. Species: credited
   photographs.") and the same in the post caption. No per-shot label, because the footage makes no claim about
   a species.
2. **Phone-viewport UI capture** (recommended) or the existing desktop plates.
3. **The guide's name.** "Rekha" (Hindi for *line*) is a proposal; see `CHARACTER_DESIGN.md`.
4. **Captions** on by default (recommended).

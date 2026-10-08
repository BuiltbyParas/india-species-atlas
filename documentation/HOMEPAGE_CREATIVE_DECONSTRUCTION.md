# Homepage creative deconstruction

Branch `atlas/living-interface` (checkpoint `ed207fe`). Written on 9 Oct 2026. **No source code was changed.** This is a creative direction for review, not an implementation record.

The question asked of every frame: *if I opened this for the first time, would I want to scroll?*

**Evidence used**

- **Lusion** (lusion.co) and the other Awwwards sites in the supplied video ("Impressive 2025 Website Design Inspiration"). These were studied as timestamped contact sheets: one frame every 8 s for the whole video, and one every 2 s for the Lusion segment (0:00–1:35).
- **XIX3D Zeno.** A live scroll tour at 1440 × 900, with sixteen frames.
- **The current Atlas home page.** A production build on the preview server, toured with a GPU-backed Chromium:
  - 78 frames at 1440 × 900, one every half viewport;
  - six frames of the finale and colophon;
  - eight frames at 390 × 844;
  - a slow re-capture of the bustard prologue. Fast scrolling had left its drawing blank in the tour. Scrolled slowly, it renders correctly, so the blank frames were a capture artefact and are not a defect.

---

## 1. Reference deconstruction

Layouts, branding, colours, typefaces and assets are not taken from any reference. What follows are the mechanisms underneath them.

### 1.1 Lusion: what actually happens

| Time | Frame | What it is doing |
|---|---|---|
| 0:02 | Pale grey page. A **dark, inset window** holds the 3D object (a pile of blue, white and black plastic crosses). A small two-line statement sits top left. "Scroll to explore" is tiny, under the window. | **The page is light; the 3D is framed.** The object is the only dark, saturated thing on screen, so it is the only thing you look at. The statement is 20 px, not a headline. |
| 0:06–0:10 | The crosses roll and tumble as the pointer moves. | **The object proves it is alive before you scroll.** You play first, and only then scroll. |
| 0:18–0:24 | "Beyond Visions Within Reach" arrives *on the second viewport*, very large. A **blue ribbon** enters from the top and loops behind the type. | **The headline is held back.** The first screen sets up the object; the second screen speaks. |
| 0:24–0:36 | The ribbon threads down through the page, passing behind type and over media. The video windows **bend like cloth** as they scroll in, then flatten. | **A single continuous line leads the eye downward.** It *is* the scroll cue. Media enters with material behaviour, not with a fade. |
| 0:38–0:58 | "Featured Work": a two-column grid of large media with tiny labels. | **The editorial pause.** It is quiet, dense and readable. Spectacle is switched off here. |
| 1:02–1:06 | A laptop with an astronaut on screen. The astronaut **leaves the device** and becomes the scene. | **Transformation, not cut.** Media becomes environment. |
| 1:08–1:26 | Full-screen black. "Step into a new world…" **splits apart word by word** as the camera flies between the words, through a portal tunnel. The environment colour changes black → green → pink → blue. | **The climax is short, immersive and dark.** Dark is *earned*: it arrives after five light viewports. The colour shifts are the chapter marks. |
| 1:28–1:32 | "Let's work together!" Stickers explode around the astronaut. | **The CTA is the last beat of the spectacle**, not a box after it. |
| 1:34 | Back to a quiet light footer. | **The page ends quietly.** |

**Rhythm.** quiet (object) → interactive (play) → statement → line → editorial → transformation → WOW (tunnel) → CTA → quiet. There is exactly **one** sustained spectacle, and it comes near the end.

### 1.2 XIX3D Zeno

- **The first frame does almost all the work.** One object (a car) under a ring of light, in a dark studio. A huge wordmark sits bottom right, overlapping the object. Then two lines of small type and one button.
- **After the hero it becomes a conventional product page.** That means alternating media and text rows, logos, pricing cards, testimonials and an FAQ.
- **The lesson is double.** A single lit object at heroic scale earns attention instantly. A hero alone does not make a site feel authored, because by viewport three Zeno reads as SaaS. **This is a warning about our own middle section.**

### 1.3 The other references in the video

| Site | Principle worth extracting |
|---|---|
| **Mammut ("Baikal")** | **Type in depth.** "BAIKAL" is set at full width *behind* the climber; the subject breaks the word. Full-screen photography is treated as evidence: a "−40°" readout sits on the ice like an instrument. Each chapter changes its environment colour (ice blue → white → expedition orange). |
| **Prometheus Fuels** | **The camera travels through a chapterised world.** Each chapter is a different light (dusk desert, night, dawn). The menu shows chapters as places. |
| **Pioneer** | **One object, three scales.** The object becomes a field, and the field becomes a data constellation. The page goes seed → field → constellation of points, then the seed returns as the hero of the data. The environments are dark green field and warm dusk. This is the closest analogue to *species → landscape → data*. |
| **Chungi Yoo** | Cream paper, type on circular paths, and **typography as the interactive object.** Proof that a light, paper-based page can feel premium. |
| **Mana / Wix × Pantone** | **Colour as a section system.** Each world owns a full-bleed colour, and the transition between colours is itself a moment. |
| **Synchronized, Noomo** | **Type as hero**, but used once per chapter. Most copy stays small and monospaced. |

### 1.4 The principles, extracted

1. **One object per viewport.** Every strong frame has one thing that is obviously the subject. Everything else is ≤ 14 px or absent.
2. **The background is a variable, not a constant.** Colour and material changes are the chapter marks. The page never sits on one ground for more than about three viewports.
3. **Light leads; dark is earned.** The best references open light (or open dark for exactly one frame) and save immersion for the climax.
4. **Hold the headline back.** The first screen sets up the object. The words arrive once you have already invested.
5. **A thread leads the eye.** One persistent line literally pulls the reader down the page and reappears at every chapter.
6. **Media behaves like material.** Windows bend, open, expand to full screen and become environments. Nothing just fades in.
7. **Type in depth.** Big words sit behind subjects, break against them, or follow paths. Big type is rare, which is why it lands.
8. **Editorial pauses are real pauses.** The quiet sections are dense, small and still, and they make the next WOW legible.
9. **Play before scroll.** The hero object reacts to the pointer at rest, so the first interaction is curiosity rather than reading.
10. **Ending = the last beat of the story.** The CTA comes out of the final spectacle and is followed by quiet.

---

## 2. The current Atlas: what stops the reader wanting to continue

### 2.1 The numbers

| Measure | Value |
|---|---|
| Home page length, desktop 1440 × 900 | **34,105 px ≈ 38 viewports** |
| Home page length, phone 390 × 844 | 23,749 px ≈ 28 viewports |
| Frames on the same charcoal ground | **78 of 78** in the desktop tour |
| Viewports spent in the five species scenes | ≈ 26, about **two thirds of the page** |
| Distinct layouts inside those 26 viewports | **1**: title left, photo right; then map, three tabs (Where it lives / What cuts through it / What protects it), and three figures |
| Width of the species photographs at rest | ≈ 25–30 % of the viewport (about 380–480 px). They are the strongest assets on the site and the smallest objects on screen. |
| Maps of India drawn on the page | Hero relief, prologue, five scene maps, the conservation map, the finale, plus the corner mini-map, **all in the same line-on-charcoal style** |

The technical systems are strong. The problem is that **every one of them is presented in the same register**: dark ground, thin line, small grey text, and a framed image at the same scale. A creative director scrolling this sees one very well made frame thirty-eight times.

### 2.2 Viewport-by-viewport audit (desktop)

Key to the columns:

- **Vp** — viewport
- **Q8** — does it look different from the previous viewport?
- **Q9** — is it memorable?
- **Q10** — does it feel premium?

| Vp | What am I looking at / focal point | What should I notice or do? | What makes me curious? Why continue? | Q8 | Q9 | Q10 |
|---|---|---|---|---|---|---|
| 0–1 **Hero** | The grey 12 rem wordmark *and* a small India on a tilted grid. **Two focal points of equal weight.** The relief is a third-width object. | Read seven text items: the title, a two-line subtitle, two coordinate pairs, a species count, "IUCN Red List categories", a scroll cue and a link. | Very little. The object is small and quiet at rest. "Scroll to follow the line" is 13 px at 55 % opacity. | — | Partly | Partly |
| 1–3 **Descent** (pinned) | The camera dives over the dark relief; points of light come up. Captions: "Start with the country" / "52 places" / "8 regions, 23 states". | Watch. | **This is the first real WOW**, but it reads as a dark map getting closer. Its captions are paragraphs. | Yes | **Yes** | Yes |
| 3–3.5 **Region loop** | Region names on a curve. | Nothing. | A pleasant breath. | Yes | No | Yes |
| 3.5–4.5 **"The species"** | A paragraph set at display size ("Five species, five kinds of ground…"), then three numbers (3 / 6 / 3). | Read the paragraph. | **The paragraph is the headline.** A display-sized sentence is a document, not an invitation. | Slightly | No | No |
| 4.5–7.5 **Bustard prologue** (pinned) | Rajasthan's outline, the anchor ring, the schematic transmission line, then the shutter opens into the photograph. | Watch the line. | **The strongest storytelling on the page.** For the first ≈ 0.7 viewport the right side is an empty dark field with a thin outline, so the hook arrives late. | Yes | **Yes** | Yes |
| 7.5–12.5 **Bustard scene** | Title left (it reveals late, so for several frames only a status dot and a sentence show), a photo right (≈ 30 % width), the scene map, the tabs. | Read and use the tabs. | The photograph. It is framed small, in the dark. | No: same layout as the prologue's end | No | Partly |
| 12.5–17.5 **Tiger** | The same layout. | The same. | — | **No** | No | No |
| 17.5–23 **Dolphin** | The same layout. The map now shows the Gangetic states. | The same. | — | **No** | No | No |
| 23–28 **Snow leopard** | The same layout. | The same. | — | **No** | No | No |
| 28–33 **Rhino** | The same layout. | The same. | — | **No** | No | No |
| 33–35 **The selection + dome** | A paragraph again ("All 12, in the round…"), then the dome of photographs. | Drag the sphere. | **The only "play" object on the page**, but it arrives after 30 viewports and sits small in the dark. | Yes | Partly | Yes |
| 35–37 **Conservation** | Threat lines across India (red and orange), then the programme list. | Point at a threat or a programme. | **The data climax**, strong, but drawn in the same map style as the five scenes before it. | Slightly | Partly | Yes |
| 37–38 **Finale + colophon** | "Mapping is not just about where species are…", then the wordmark again, the map and links, then the colophon and its survey line. | Open the map. | The colophon is good. The finale repeats the hero instead of transforming it. | Slightly | Partly | Yes |

### 2.3 The weaknesses, named

1. **Monotone ground, and no environmental change.** The whole page is one charcoal. The Thar, the Himalaya, the Ganga and the floodplain all look like the same night. The brief's "background is a variable" principle is entirely unused.
2. **The template repeats five times.** About 26 viewports share one layout. By the second species the reader knows the rest of the page, and curiosity ends there. **This is the single biggest reason a reader stops.**
3. **The photographs are small.** The evidence from the field is framed at about a quarter of the screen. The maps get the space and the animals don't.
4. **Too many words per viewport.** The hero has seven text items. Chapter intros set paragraphs at display size. Captions in the descent are paragraphs. The scenes carry tab bodies, figures, notes and credits at once. It reads academic.
5. **There is no visual climax ladder.** The WOW moments (descent, shutter, dome, conservation) are separated by long, uniform middles. The rhythm is WOW → plateau → plateau → plateau → plateau → plateau → WOW.
6. **The hero object is not unforgettable at rest.** At rest it is a small flat outline on a grid. Its life (relief, light, descent) only appears once you scroll, but the reader decides whether to scroll *before* that.
7. **The scroll invitation is a whisper.** 13 px at 55 % opacity, with a cue that never changes.
8. **There is no single moment to share.** No reel, no full-screen image, no "you have to see this" frame.
9. **The map is overused as a visual.** Eight or more drawings of India in the same style blunt the one that matters most (the conservation map).
10. **On phones the hierarchy is the same, only stacked.** On phone the descent is the best frame. After it, the page is a long column of the same items.

### 2.4 What is already excellent (must survive)

- **The relief, the descent and its render-on-demand loop.** The work is technically superb.
- **The bustard prologue.** Line → threat → shutter → photograph is the brief's "LINE → THREAT → PHOTOGRAPH" transformation, *already built*.
- **The GeoLine vocabulary and its honesty labels**: "Schematic — not a mapped alignment" and "not elevation".
- **The conservation chapter's data:** threats counted across species, programmes by year.
- **The dome**, as an interactive object.
- **The colophon's survey line and signature.**
- **The running chapter head**, the route transitions, the hero-to-atlas flatten, `photoContours`, `LineTitle` and `morph.ts`.
- **The reduced-motion and phone compositions**, which are real alternates.

---

## 3. Proposed homepage structure

The content stays. The composition, order, scale and grounds change. The target length is **≈ 17 viewports on desktop** (down from 38) and **≈ 16 on phone**. Every species and every fact remains one click deeper, on its species page and on `/documentary`.

```
 VP    CHAPTER            REGISTER       GROUND
 0–1   CALIBRATION        QUIET          warm paper
 1–2   DISCOVERY          INTERACTIVE    paper → dusk
 2–4   DESCENT            WOW            dusk → night
 4–6   FIELD STUDY 01     WOW            sand / clay        (Thar, the bustard — the prologue)
 6–7   SPECIES            EDITORIAL      sand → paper       (the record, quiet)
 7–8.5 FIELD STUDY 02     QUIET → WOW    snow / stone       (Himalaya, snow leopard)
 8.5–10 FIELD STUDY 03    INTERACTIVE    paper / deep blue  (River, dolphin)
 10–11.5 THREAT           DATA           paper / ink        (the lines that cut)
 11.5–13 TRANSFORMATION   WOW            ink → forest green → light  (tiger 1973, rhino recovery)
 13–14.5 DISCOVERY (12)   INTERACTIVE    light              (the dome + PLAY REEL)
 14.5–16 ATLAS            WOW (small)    paper → sheet      (the flatten into the working map)
 16–17  COLOPHON          QUIET          charcoal           (the one dark ending)
```

**Rhythm check against the brief.** QUIET → INTERACTIVE → WOW → WOW (Thar is a deliberate double: descent *into* a field) → EDITORIAL → QUIET → INTERACTIVE → DATA → WOW → INTERACTIVE → WOW (small) → QUIET.

Never more than two loud beats in a row, and both of those are one continuous camera move. If review finds the double too loud, the Thar shutter can open more slowly and become the start of the quiet.

**All five featured species stay on the home page**, but in five *different* compositions rather than one template five times:

| Species | Role |
|---|---|
| Bustard | Field study (line → shutter) |
| Snow leopard | Field study (stillness, contours) |
| Dolphin | Field study (interactive band of states) |
| Tiger | Evidence of the first programme (Project Tiger, 1973) |
| Rhino | Evidence of recovery |

---

## 4. Visual environments

The environments are **grounds and light**, not illustrations. Nothing invents terrain or a habitat that the data and the photographs don't support. Every photograph stays a real, licensed, credited photograph.

| Environment | Ground | Ink / type | Accent | Line | Material cue | Source of the imagery |
|---|---|---|---|---|---|---|
| **BASE** (calibration, editorial) | warm paper `#EFE9DC` | charcoal `#1B1D1A` | status colours only | graphite | paper grain (static noise, 2 % opacity) | the relief |
| **DUSK** (descent) | paper → `#2A2621` → night `#0F1413` | ivory | locality lights in status colours | ivory | relief, lit from a low sun | the relief |
| **THAR** | sand `#D9C3A0` → clay `#B9835A` | deep earth `#3A2618` | power-line copper (the existing schematic colour) | earth | heat haze on the photograph's horizon only (displacement ≤ 2 px) | bustard photograph |
| **HIMALAYA** | snow `#F2F3F1` → stone `#9AA3A6` | slate `#22292D` | ice blue `#A9C6D3` | slate | photo contours (`photoContours.ts`) traced *on* the print, labelled as print luminance | snow-leopard photograph |
| **RIVER** | paper `#EDE8DD` with deep blue `#163A52` | deep blue | silt `#B9A98C` | water blue | horizontal band; the reflection is a mirrored, blurred crop of the real print | dolphin photograph |
| **DATA** (threat) | paper `#F1ECE2` | ink `#141414` | status red / orange (existing) | ink | ruled sheet, graticule | the conservation map |
| **CONSERVATION** | forest `#1F3A2B` → natural light `#E7EEDF` | ivory → forest | protection green (existing) | green | daylight rising across the section | tiger and rhino photographs |
| **COLOPHON** | night `#0F1413` (today's charcoal, kept for the end) | ivory | survey line in status colours | ivory | — | — |

**How the transitions work.** One fixed backdrop element sits behind the page. Its colour is tweened at chapter boundaries, over about 40 % of a viewport. The tween is a class change with a CSS transition, never a per-frame write to `:root` (that rule comes from the interaction-engine phase's perf findings). Type colour flips at the midpoint, so AA contrast holds on both grounds. Every pairing in the table must be checked for AA before it is built.

---

## 5. Scroll storyboard

Each row gives the following fields in order:

- **VP** — the viewport range
- **Ground** — the background
- **Foreground** — what sits in front
- **Primary object**
- **Secondary object**
- **Type** — the typography
- **User action**
- **Scroll** — the scroll behaviour
- **Camera**
- **Transition** — the exit
- **Sound** — the sound possibility (off by default; the event bus in `src/interaction/events.ts` already emits the hooks)
- **Hook** — the next curiosity hook

### 0–100 vh · CALIBRATION

- **Ground.** Warm paper, with a faint graticule at 4 % that drifts 1–2 px with the pointer.
- **Foreground.** Tiny coordinates in the corners, 11 px, tabular: `6°46′N — 37°05′N` / `68°08′E — 97°24′E`. A thin calibration tick moves along the top edge while fonts and the scene load. This is the loader, kept and recomposed onto paper.
- **Primary.** **The sculptural India**: the existing extruded relief, re-materialed as a matte cast (plaster or paper clay, soft key light from the north-west, a long contact shadow on the paper). It is at **heroic scale**, ≈ 70 % of the viewport height, slightly off centre to the right, and tilted about 12° toward the reader. It is not a map on a grid; it is an object on a table.
- **Secondary.** None.
- **Type.** Bottom left, small caps, 13 px: `INDIA SPECIES ATLAS`. Beneath it, in the serif at 28 px: `12 species. One country.` Bottom centre: `SCROLL TO EXPLORE`, 11 px, letter-spaced, with a 24 px line that draws and redraws. No paragraph, no link row. The "working map" link moves into the menu and the colophon.
- **User action.** The pointer moves the **light**, not the object. The shadow swings and the edges of the states catch. Pressing (mouse down) briefly lifts the twelve anchor points as pinpricks of light through the plaster, then they sink back. This teaches that there is something inside.
- **Scroll.** The first 10 % of scroll does one thing: the relief **turns to face the camera** (the tilt goes to 0) and the title slides out down-left.
- **Camera.** Static, three-quarter view.
- **Transition.** The paper begins to warm toward dusk at the bottom edge.
- **Sound.** A paper-room tone; a soft tick as the calibration line completes.
- **Hook.** The object is clearly 3D, clearly reacting, and clearly holding something (the lights that showed on press).

### 100–200 vh · DISCOVERY

- **Ground.** Paper dimming to dusk: the sun goes down over the object, a real light change in the scene, mirrored by the backdrop.
- **Primary.** The relief, now facing you. **The 52 localities light up from inside**, in status colours, south to north as the light falls.
- **Secondary.** One line: the GeoLine **draws itself from the bottom of the viewport up into the Thar**, ending at the bustard's anchor locality. This is the thread that will lead the whole page (Lusion's ribbon principle, made out of our own primitive).
- **Type.** One word arrives at 18 vw, set *behind* the relief (the object occludes it): `INDIA`. It fades as the lights come up. Then a single 13 px caption: `52 places · 12 species · status by colour`.
- **User action.** Hovering a light shows its species name and coordinates in the cursor label. There is nothing to click yet.
- **Scroll cue** → `DESCEND`.
- **Camera.** Starts to pitch down.
- **Transition.** The line's end point pulses. The camera aims at it.
- **Sound.** A low swell as the lights come up.
- **Hook.** Where does the line go?

### 200–400 vh · DESCENT (pinned, the existing descent, re-paced)

- **Ground.** Night.
- **Primary.** The existing descent along the line toward the Thar. The pose maths stay untouched.
- **Captions.** These become **three words each**, not paragraphs: `Start with the country.` → `52 places.` → `Eight regions. Twenty-three states.` → `Desert National Park. 26°50′N 70°43′E.` The explanatory sentences move to `aria-describedby` and to the species page.
- **Atmosphere.** The existing dust is kept.
- **Scroll cue** → `ENTER THE FIELD`.
- **Transition (the big one): INDIA → TERRAIN → LANDSCAPE.** As the camera reaches the anchor, the night ground **warms to sand from the centre outward**. The relief's surface under the camera stays honest: no fake terrain appears; the relief simply fills the frame and dissolves into the sand colour.
- **Hook.** The ring around the anchor, and the copper line about to be drawn.

### 400–600 vh · FIELD STUDY 01 — THAR (pinned, the existing bustard prologue, recomposed)

- **Ground.** Sand → clay.
- **Label.** Small, top left: `FIELD STUDY 01 · THE THAR · RAJASTHAN AND GUJARAT`.
- **Primary.** Rajasthan's outline, drawn **at full viewport height** in deep earth ink, not a thin line in the dark. The anchor ring, then the **schematic transmission line**, drawn pylon by pylon in copper, with its label `Schematic — not a mapped alignment` kept verbatim.
- **Type.** `THAR` at 30 vw, in clay one step darker than the ground, so it reads as the land itself. The copper line crosses *in front of* it. The beat headlines stay as they are ("A line across open ground." / "A bird that needs to see far."), but are set smaller (40 px) because the word THAR now carries the scale.
- **Transition: LINE → THREAT → PHOTOGRAPH.** The existing shutter opens from the copper line. **The change is scale:** it opens to **full bleed** — the whole viewport — rather than to a frame. The grassland photograph *is* the environment for a full viewport. Heat haze, if any, is limited to the photo's horizon band.
- **User action.** The pointer pans the full-bleed photograph by ≤ 2 % (existing depth system). A cursor label reads `Photograph · <credit>`.
- **Scroll cue** → `FOLLOW THE LINE`.
- **Sound.** Wind, then one metallic hum under the line.
- **Hook.** The status lands at the bottom: `● CRITICALLY ENDANGERED` in the status red, 13 px.

### 600–700 vh · SPECIES (editorial pause)

- **Ground.** Sand → paper, quiet.
- **Primary.** The photograph shrinks from full bleed back into a **large print** (about 55 % width) placed left, with crop marks. The photograph as evidence, not decoration.
- **Secondary.** A three-figure strip from the dataset (states, localities, year assessed) in Geist tabular. One sentence from the record.
- **Type.** `Great Indian Bustard` in the serif, *Ardeotis nigriceps* in italic, both small. One link: `Field notes →` (opens the existing species page via its journey).
- **Removed here.** The three tabs, the scene map and the long notes. They live on the species page.
- **Transition.** The print slides up and the paper cools toward white-grey.
- **Hook.** On the right edge, a sliver of snow-white image is already creeping in.

### 700–850 vh · FIELD STUDY 02 — HIMALAYA (quiet → WOW)

- **Ground.** Snow → stone. The first truly *bright* frame since the opening, deliberately.
- **Label.** `FIELD STUDY 02 · THE HIGH HIMALAYA`.
- **Primary.** The snow-leopard photograph, **cropped tight on the eye and rosettes**, almost abstract. As you scroll, the crop pulls back to the full print.
- **Secondary.** `photoContours.ts` lines trace the print's luminance **on** the photograph in ice blue. They are labelled in the caption as *contours of the print, not of the land*. The rosettes become contour rings. This is a calm, original image: **PHOTOGRAPH → CONTOUR**.
- **Type.** `HIMALAYA` at 22 vw in stone grey, and the photograph sits *over* the lower half of the word (rectangular overlap, not a subject cut-out; see §11). One sentence and one figure from the record: `Vulnerable since 2017. Still declining.`
- **User action.** The pointer moves a small "level" across the print, highlighting the contour band at that luminance. It is a quiet toy.
- **Scroll cue.** Stays at `FOLLOW THE LINE`.
- **Sound.** Near silence; a snow hiss.
- **Hook.** A thin deep-blue band appears at the bottom of the frame.

### 850–1000 vh · FIELD STUDY 03 — RIVER (interactive)

- **Ground.** Paper above, **deep blue band** below: a horizon.
- **Label.** `FIELD STUDY 03 · THE GANGA AND BRAHMAPUTRA`.
- **Primary.** The dolphin photograph sits *on* the horizon line. Below the line, a mirrored, blurred, ripple-displaced crop of the *same* print serves as its reflection. It is the same pixels, so it makes no new claim.
- **Secondary.** **The states of record as one long horizontal band** (Uttar Pradesh → Bihar → West Bengal → Assam…). Each is a segment of the line, in the dataset's order, drawn west to east under the horizon. This is the *states of record*, not the river course: the river geometry is unsourced (see §14).
- **Type.** `RIVER` at 24 vw, set *under* the waterline and visible through the blue at 30 %. On scroll it rises and straightens into the section label (**TYPE → LABEL**, using the existing `LineTitle` / `morph`).
- **User action.** Dragging horizontally runs the band like a scroll of paper. Each state's name and its count of localities come up. Touch works the same way, with a native horizontal pan.
- **Sound.** Water under the band.
- **Hook.** On the band's last state, the line turns red.

### 1000–1150 vh · THREAT (data)

- **Ground.** Paper / ink, a ruled sheet with a graticule.
- **Primary.** **The conservation map** (existing data and interaction), **now printed in ink on paper** instead of light on night. This is the only full India map since the descent, so it reads as new.
- **Transition: LINE → THREAT.** The red segment from the river band **becomes the first threat line**, then all threat lines draw (the existing chapter's scrub).
- **Type.** `CRITICALLY ENDANGERED` is reserved for this chapter's headline, 9 vw, in the status red, letter-spaced, *following the drawn threat line* for one beat, then straightening into a rule above the list. The threat list stays (Habitat loss 12 of 12…), small.
- **User action.** Pointing at a threat (existing) isolates the species it cuts.
- **Scroll cue** → `FOLLOW THE LINE` (kept).
- **Hook.** The year `1973` appears at the edge of the sheet.

### 1150–1300 vh · TRANSFORMATION (WOW)

- **Ground.** Ink → **forest green** → natural light. It brightens like dawn across the section.
- **Transition: THREAT → PHOTOGRAPH → DATA.** The threat lines **re-colour from red to protection green, in programme-year order** (1973 Project Tiger first). They are the *same lines*: the conservation chapter's existing second phase, re-staged.
- **Primary, beat 1.** The tiger photograph, **full bleed**, with one line: `1973. Project Tiger.` That is all.
- **Primary, beat 2.** The rhino photograph, full bleed, with the record's own sentence: *"A conservation success story recovering from fewer than 200 animals…"* (quoted verbatim from the dataset).
- **Secondary.** The ten programmes by year, as a thin timeline ruled along the bottom (the `/conservation` "timeline sheet" idea, in miniature).
- **Scroll cue** → `EXPLORE`.
- **Sound.** The first warm chord.
- **Hook.** The photograph tile shrinks and joins others: a sphere is forming.

### 1300–1450 vh · DISCOVERY OF THE TWELVE (interactive), with PLAY REEL

- **Ground.** Natural light.
- **Primary.** **The dome**, larger: ≈ 90 % of the viewport, on light ground, with the photographs as the only colour. The rhino tile *is* the tile the full-bleed photograph shrank into: **PHOTOGRAPH → DATA**.
- **Secondary.** **PLAY REEL window**, bottom right, about 28 % width, inset with crop marks, showing the film's first frames muted on loop at 720p, poster first.
- **Type.** `TWELVE SPECIES` at 14 vw, behind the dome.
- **User action.** Drag the dome (existing). Hovering the reel window sets the cursor to `PLAY`.
- **Hook.** "The sheet": the dome's tiles flatten down into points.

### 1450–1600 vh · ATLAS (small WOW)

- **Ground.** Paper → the atlas sheet.
- **Transition: DATA → MAP → NEXT WORLD.** The dome's photographs drop to their anchor localities **on a flat sheet of India**. This is the *same* flatten the hero relief already performs into `/atlas` (living interface). The page ends on the working map's first frame.
- **Primary.** One CTA, large: `Open the atlas`, magnetic, drawn with the line. Secondary text links: `Every species` · `The film` · `Sources`.
- **Scroll cue.** Disappears; the CTA replaces it.

### 1600–1700 vh · COLOPHON (quiet)

- **Ground.** Night (the only dark ending).
- **Content.** The existing colophon, unchanged: the survey line, the statement, the signature, "set in / drawn on / built with / data".
- **Finale line.** "Mapping is not just about where species are. It is about where we choose to protect them." moves here, small, above the survey line, as the last thing said.

---

## 6. Interaction choreography

| Object | At rest | Pointer | Press / drag | Scroll | Meaning |
|---|---|---|---|---|---|
| **Sculptural India** | Slow light breathing (one 8 s cycle, then still) | Moves the **key light**; the shadow swings | Lights show through the plaster for 600 ms | Faces the camera, then descends | "There is something inside this country." |
| **The line** | Draws up from the bottom edge, then rests | Cursor trail snaps to it (existing) | — | Leads into every chapter | The thread of the story and the scroll cue made visible |
| **Locality lights** | Off on paper, on at dusk | Name + coordinates in the cursor label | — | Light south → north | Where the evidence is |
| **Full-bleed photograph** | Still | ≤ 2 % pan (existing depth) | — | Opens from a line, shrinks into a print or a tile | Evidence from the field |
| **Contour print** (Himalaya) | Contours drawn | A luminance "level" follows the pointer | — | Contours thicken as the crop pulls back | Looking closely at the evidence |
| **River band** | Runs west to east | Highlights a state | Drag scrolls the band | Rises to a label | The states of record |
| **Threat lines** | Drawn in red | Isolate a threat (existing) | — | Re-colour to green in year order | What cuts, then what protects |
| **Dome** | Slow drift (existing) | Parallax (existing) | Drag with inertia (existing) | Tiles flatten onto the sheet | All twelve |
| **Reel window** | Muted loop | Cursor `PLAY`; the window leans 1–2° toward the pointer | Click → full screen | — | The film |
| **Scroll cue** | Line redraws | — | — | Words change by chapter | "Keep going" |

**Rules**

- No hover effect exists without a meaning.
- On touch, every pointer behaviour has a tap or drag equivalent, or is simply absent.
- With reduced motion, every transformation becomes a cross-fade between the two composed states, and the pinned sections become still compositions. This is the same policy the site already follows.

---

## 7. Hero concept: "the cast"

**One object: India, cast in plaster, on a sheet of paper, lit by a single low sun.**

- It is the existing extruded relief from `heroTerrain.ts`, with no new geometry. It gets a new **material and lighting preset**: matte, warm white, soft shadow, and a subtle edge AO. On paper, bloom is off.
- It is **an art object, not a map**. There is no grid, no frame, no labels, and no state lines on the cap at rest. State lines are engraved only as faint grooves, revealed by the raking light the pointer controls.
- **Honesty.** The extrusion is uniform (flat cap). It is a *cast of the outline*, not terrain. The cast never suggests elevation, so no "not elevation" label is needed at rest; the existing label stays where the lift happens.
- The text hierarchy is exactly the brief's: `INDIA SPECIES ATLAS` / `12 species. One country.` / `SCROLL TO EXPLORE`.

**Why it beats the current hero**

- One focal point instead of two.
- Light instead of dark, which makes it instantly different from every other conservation site.
- The pointer plays with something physical *before* any scroll.
- The night descent becomes an *event* (sunset), not the default.

**Alternative, if a light 3D scene costs too much:** keep the night hero but shrink the wordmark to small caps and scale the relief to 75 % of the viewport height. It is weaker, but it still fixes the two-focal-points problem.

---

## 8. Featured-world concept: Field Studies

Each field study is **one environment, one photograph, one word, one line and one transformation**. They are not cards and not a grid. They differ on purpose:

| | 01 THAR | 02 HIMALAYA | 03 RIVER |
|---|---|---|---|
| Ground | sand → clay | snow → stone | paper over deep blue |
| Big word | THAR, behind the line | HIMALAYA, under the print | RIVER, under the water, rising |
| Line | copper schematic power line | ice-blue contours of the print | the states-of-record band |
| Transformation | line → shutter → full-bleed photograph | close crop → full print → contours | type → label; band → threat |
| Interaction | pan the photograph | the luminance level | drag the band |
| Pace | pinned, long | unpinned, slow | half-pinned, playful |
| Species | Great Indian Bustard (CR) | Snow Leopard (VU) | Ganges River Dolphin (EN) |

Each ends with `Field notes →` to the existing species page, through the existing descent journey. The tiger and rhino appear in TRANSFORMATION as evidence of protection, which is a stronger narrative role than a sixth and seventh repetition of the scene template.

---

## 9. Reel concept: "Play the film"

- **Source.** The finished promo, `exports/Lines_on_the_Map_PROMO_WEB_AV1.mp4` (1920 × 1080, 69 s, 29 MB), with the H.264 version (71 MB) as fallback. The 97 s master would need a web encode: `Lines_on_the_Map_WEB.mp4` in the main checkout is **unreadable** (ffprobe reports "moov atom not found"; the file looks truncated) and would need re-exporting. Which film to use is your call.
- **Where.**
  - The inset window in DISCOVERY OF THE TWELVE.
  - A text link `Play the film · 1:09` in the menu.
  - A 13 px link in the hero's bottom-right corner, the one extra item the hero is allowed.
- **Hover.** The cursor becomes the existing survey reticle with the word `PLAY`. The window leans gently toward the pointer.
- **Click.** The window **expands from its own rectangle to full screen** (a FLIP transform on one element; no new player chrome). Page UI fades out, Lenis stops, sound unmutes (it was a user gesture) and captions are on by default.
- **Controls** are minimal and in the site's type:
  - a thin progress line along the bottom, which is the GeoLine;
  - `Close` and `Sound`;
  - scrubbing by dragging the line.
- **Keyboard:** Space toggles play, Esc closes, and arrow keys scrub. Focus is trapped while open.
- **Close.** The video shrinks back into the *same* rectangle, at the *same* scroll position, and Lenis resumes. Focus returns to the trigger, using the menu's existing pattern.
- **Reduced motion.** No expansion animation, and no autoplay preview (a poster instead).
- **Phone.** A native full-screen video element with the same poster.

---

## 10. Transformations: the primary animation language

| From → To | Where | How (existing system first) |
|---|---|---|
| INDIA → TERRAIN | Calibration → Descent | The cast faces the camera, the sun sets, the camera descends (`heroScene` pose, new light preset) |
| TERRAIN → LANDSCAPE | Descent → Thar | The relief fills the frame and the ground warms to sand (backdrop + scene colour) |
| LANDSCAPE → SPECIES | Thar | The copper line opens into the full-bleed photograph (existing shutter, full bleed) |
| SPECIES → PRINT | Thar → Species | Full bleed shrinks to a print with crop marks (FLIP on the existing `Photo`) |
| PHOTOGRAPH → CONTOUR | Himalaya | `photoContours.ts` traced on the print |
| TYPE → LABEL | River | `LineTitle` + `morph.ts` (a big word straightens into the small label) |
| LINE → THREAT | River → Threat | The band's last segment turns red and becomes the first threat line (`morph`) |
| THREAT → PROTECTION | Threat → Transformation | The same lines re-colour red → green in programme-year order (existing chapter phase 2) |
| PHOTOGRAPH → DATA | Transformation → Twelve | The full-bleed rhino shrinks into its dome tile |
| DATA → MAP | Twelve → Atlas | Tiles drop to their anchors on a flat sheet (living-interface flatten, reused) |
| MAP → NEXT WORLD | Atlas → `/atlas` | The existing route journey |

**Rule.** No section boundary is a hard cut. If two adjacent sections can't share an object, they share the line.

---

## 11. Typography strategy

- **Faces unchanged.** Newsreader carries the narrative, Geist the data. No new typefaces are added.
- **Three sizes only on the home page:**
  - **Display**, 14–30 vw, single words only: INDIA · THAR · HIMALAYA · RIVER · CRITICALLY ENDANGERED · TWELVE SPECIES.
  - **Statement**, 28–40 px serif, one line.
  - **Label**, 11–13 px Geist, letter-spaced caps or tabular.
- **There is no paragraph above 17 px** on the home page. The current display-sized paragraphs ("Five species, five kinds of ground…", "All 12, in the round…") become one-line statements.
- **Big words always do something:**
  - sit behind an object (INDIA behind the cast; TWELVE SPECIES behind the dome);
  - become the ground (THAR in clay on sand);
  - sit under a photograph (HIMALAYA);
  - rise out of water and straighten (RIVER → label);
  - follow a line, then straighten into a rule (CRITICALLY ENDANGERED).
- **Type that cuts behind an animal** (Mammut style) needs a subject mask per photograph. That is a derivative work. The photographs are CC BY-SA or similar, so a mask would have to be shared under the same licence and credited. **Proposed instead:** rectangular overlap of print and word (honest, licence-neutral). Masks are your call.
- **Every split or animated word stays one accessible word**, following the existing `RevealText` and `LineTitle` pattern.

---

## 12. What gets removed from the home page

Nothing is deleted from the site. These move one click deeper:

| Removed from home | Where it lives |
|---|---|
| The five repeated scene templates (tabs, scene maps, three-figure blocks, threat lists, protection lists, programme notes) | Each species page (`/species/:id`) already carries all of it, and `/documentary` keeps the full linear version |
| The hero's subtitle pair, coordinate `dl`, scope lines, "IUCN Red List categories" and "Or open the working map" | Coordinates move to the calibration corners at 11 px; the link moves to the menu and the colophon |
| The descent's paragraph captions | `aria-describedby` and the species pages |
| The "The species" chapter intro paragraph and the 3 / 6 / 3 stat row | The counts reappear in the threat chapter as data |
| The region `CurvedLoop` and the scientific-name `CurvedLoop` | Keep **one**, scientific names, as a quiet band under the dome |
| The finale's repeat of the wordmark and map | Replaced by the ATLAS flatten; the finale sentence moves to the colophon |
| The corner mini-map progress (`GeoProgress`) | Replaced by the persistent scroll cue and the line itself (or kept as the cue's tiny glyph; to decide at build) |
| The charcoal ground as default | Kept only for the descent and the colophon |

## 13. What is preserved, as is

- `heroScene.ts` pose and descent maths.
- The render-on-demand loop, adaptive quality and the flat fallback.
- The bustard prologue's four beats and its schematic label.
- `ConservationMap` data and its interactions.
- `DomeGallery` physics.
- The colophon.
- The GeoLine roles and honesty labels.
- The interaction engine: springs, cursor, magnetic, the event bus.
- Route transitions and journeys, including the hero-to-atlas flatten.
- `photoContours`, `LineTitle` and `morph`.
- Every fact, citation and photograph credit.
- The reduced-motion and phone compositions, recomposed for the new order.
- All working pages, untouched.

This respects the standing rule *enhance, don't reinvent*. Every system is kept, and the home page's **composition** is what changes, as this brief asks.

---

## 14. Performance and integrity risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Light-material hero** | New lighting and shadow on the relief; the bloom chain is wrong on paper | One shadow-casting directional light, a baked contact shadow (one texture), bloom off in the paper preset. Re-measure TBT on a 4× CPU (relief build already dominates). Keep the `onTooSlow` flat fallback, which becomes a high-quality still render of the cast. |
| **Full-bleed photographs** | The photographs are **1400 px wide**. Full bleed at 1440 px and 2× DPR wants ≈ 2880 px, so they will look soft. | Re-fetch larger originals from the same licensed sources (`scripts/images/fetch-species-photos.mjs`) and generate AVIF/WebP at 1440 / 2160 / 2880. Each step adds weight, so lazy-load per chapter and decode before the shutter opens. |
| **Background transitions** | A per-frame `:root` write costs 10–20 slow frames per scroll (measured in the interaction phase) | One fixed backdrop element; class toggles with CSS transitions; at most one ScrollTrigger per boundary, firing on enter/leave, never on scrub |
| **Video** | 29–71 MB | Never preload: `preload="none"` with a poster. The muted preview is a separate 720p, 6 s loop of about 1 MB. AV1 first, H.264 fallback. Check hosting bandwidth (Netlify / Vercel). |
| **Contours on a full-bleed photograph** | `photoContours` on a large print | Precompute at build time to static SVG paths per photograph (they are deterministic), not at runtime |
| **More WebGL on screen at once** (dome larger, cast larger) | GPU fill-rate | The page gets *shorter*: two pinned scenes fewer, about half the DOM. Only one WebGL context is awake at a time (`sceneRegistry` keepAwake). |
| **Contrast on new grounds** | Sand and stone grounds risk failing AA for small type | Every ground/ink pair is AA-checked before build. Status colours are always paired with text, never colour alone (existing rule). |
| **River course** | Rivers were an **unsourced** dataset in Gate 5 | The design uses the *states of record* band, not a river line. Drawing the Ganga needs a sourced dataset (e.g. Natural Earth rivers, public domain). That is your decision. |
| **Real terrain** | The cast is an outline extrusion, not elevation | No elevation implied. Real terrain would need a sourced DEM (SRTM/GEBCO) and is out of scope unless you want it. |
| **Narrative shortening** | Tiger and rhino lose their full scenes on home | They gain stronger, factual roles (1973; recovery). The full scenes stay on `/documentary` and the species pages. |
| **Measurement** | Earlier phases saw false regressions under load | Measure only on an idle machine, baseline and new builds interleaved (from the living-interface lesson). |

---

## 15. Implementation architecture (for after review)

- **New branch** `atlas/homepage-direction`, cut from `atlas/living-interface`. No merge, no push.
- **`src/pages/HomePage.tsx`** is recomposed into the eleven chapters, in order. The current composition is kept intact as the `/documentary` page's source, so nothing is lost.
- **New, small modules** under `src/components/home/experience/`:
  - **`Environment.tsx`** — the fixed backdrop and `data-env` sections. Its tokens are `[data-env="thar"]` and so on in `src/index.css`. It writes only to its own element.
  - **`ScrollCue.tsx`** — the persistent cue. Its words are keyed to the existing `chapters.ts` store, and it is announced politely to assistive tech only on chapter change.
  - **`FieldStudy.tsx`** — one composition primitive (ground, label, big word, line, media, transformation slot) built from the existing `Photo`, `GeoLine`, `LineTitle`, `morph` and `photoContours`. **Three instances, three different configurations.** It is not a template repeated: its slots are optional and its layout is per-instance.
  - **`ReelPlayer.tsx`** — FLIP expand and collapse, a focus trap, Lenis stop and resume, captions, GeoLine progress, and the event-bus hooks.
  - **A `paper` preset in `heroScene.ts`** — the material, lights and bloom toggle only. The pose and descent maths are untouched.
  - **`ThreatToProtection`** — the conservation chapter split into its two existing phases, with the photograph beats between them.
- **Build-time:**
  - contour SVGs per photograph;
  - larger photo derivatives;
  - the reel's preview loop and poster;
  - VTT captions from the narration script.
- **Staged, one system at a time**, each stage with desktop, phone and reduced-motion screenshots, perf against the baseline and an a11y pass:
  1. Environment system + scroll cue (no layout change yet). Proves the colour language.
  2. Hero cast on paper + discovery + descent re-pace.
  3. Field Study 01 (recompose the prologue).
  4. Species pause + Field Study 02.
  5. Field Study 03 + threat.
  6. Transformation + the twelve + reel.
  7. Atlas flatten + colophon + the removal pass.
  8. Phone and reduced-motion compositions, the full QA matrix, docs.

---

## 16. Decisions needed from you before any code

1. **A light hero**: the plaster cast on paper, or keep night and only rescale?
2. **Home page length.** Is ≈ 17 viewports right, with tiger and rhino reduced to evidence beats?
3. **Which film** plays in the reel: the 69 s promo (web encodes exist), or the 97 s master (needs a fresh web encode)?
4. **Larger photographs.** May I re-fetch the licensed originals at higher resolution?
5. **River line.** Use the states-of-record band (no new data), or source a river dataset?
6. **Subject masks** for type-behind-animal: yes (share-alike derivatives) or no (rectangular overlap)?

---

## The ultimate question

**Current home page.** First impression: *"This is serious and well made."* It does not make you think *"I have to see what happens next."* After the second species, the honest answer to "would I want to scroll?" is no. The reader already knows the shape of the rest of the page.

**Proposed home page.** A plaster India that answers your pointer on a warm sheet of paper. The sun goes down on it and lights come on inside. A line pulls you down into a desert, through the line, into a photograph that fills the screen. Then into snow, onto a river, onto an ink sheet of what cuts the land, and into the dawn of what protects it. Every chapter looks different from the one before, and every one hands you an object to touch. The test passes only if each storyboard frame above, rendered, looks like a different photograph from the last. That is the acceptance criterion for building it.

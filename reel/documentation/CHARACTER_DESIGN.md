# Character design: the Atlas guide

**Status:** design for approval. No art exists yet. Supersedes `reel/character/design/CHARACTER_SPEC.md`.
**Working name:** *Rekha* (रेखा, Hindi for **line**, the film's one idea). This name is a proposal and can change
without affecting anything else in this document.

## 1. The idea in one sentence

A young field cartographer who walks *inside* the Atlas: someone in a premium geographic documentary who happens
to be drawn in anime style. She is not a presenter or a mascot, and she is not explaining a school project.

## 2. The reference, and what was taken from it

The supplied image (`~/Downloads/5418462047978378.jpeg`, a comic-strip face peering round a door: "Finally you
found me") is used **only for energy**:
- a deadpan, knowing look in which the eyes do the acting
- reveals from behind something, such as a frame edge, grass or the map
- a sense of shared secret with the viewer

Her face, hair, clothes, colours and silhouette are **not** taken from it, and no existing anime character is a
model for her.

## 3. Personality → how it shows on screen

| Trait | On screen |
|---|---|
| **Intelligent** | She looks before she reacts. Her eyes reach a thing 3–4 frames before her head turns to it. |
| **Curious** | Uneven brow lifts; a slight forward lean from the waist; her hands go to the map, not to the camera. |
| **Slightly playful** | One eyebrow, one corner of the mouth. Never a gag, a wink or a thumbs-up. |
| **Warm** | Her softest expression is saved for the last line, the only long look into the lens. |
| **Serious when it matters** | On the threats her face goes still: brows level, mouth closed, and she holds a beat longer than is comfortable. No tears and no anger. |

She is never: a child, chibi, a VTuber, a shōnen hero, a magical girl, comic relief, or a "cute" mascot.

## 4. Appearance

| Element | Specification |
|---|---|
| **Age read** | Early twenties. |
| **Proportions** | Grounded "theatrical anime" realism: about 7 heads tall, a natural waist and shoulders, weight usually on one foot. Hands are drawn properly (they do a lot of acting here). |
| **Face** | A soft oval with a defined jaw. The nose is a single line plus one shadow plane. The mouth is small and expressive at the corners. **Brows are slightly heavier than typical anime brows** and carry most of the expression. |
| **Eyes** | Large but not oversized, almond-shaped with a slight upward outer tilt. Deep amber iris `#b07a3a` with a thin dark limbal ring and **one** controlled highlight (two at most in the final shot). No sparkle shapes. |
| **Skin** | A warm medium-brown South Asian tone. Shadows are a cooler, desaturated brown, never grey or purple. |
| **Hair** | Black-brown `#1f1915`, with the hair highlight band `#4a3a2c`. An **asymmetric short bob**: longer at the left jaw, cropped behind the right ear, with soft layered ends (not spiky). One loose strand at the left temple is **tied with a thin ochre thread** `#c9a24a`. This is the visual "line" and the main secondary-motion element. |
| **Silhouette test** | Recognisable in solid black from the bob's asymmetry, the map case's strap diagonal, and the rolled sleeves. |

## 5. Clothing and props

| Item | Specification |
|---|---|
| **Overshirt** | A forest-green field overshirt `#22301f` (the site's forest range), cotton drill, two chest pockets, sleeves rolled to the forearm. Worn open. |
| **Shirt** | A canvas-coloured collarless shirt `#e8e1cf` (the film's line colour). |
| **Trousers / boots** | Dark olive-charcoal trousers `#1b1f1a`; worn tan field boots `#7a5a3a`. |
| **Strap and case** | A narrow leather cross-body strap `#5a4330` holding a flat map case at the hip. |
| **Details** | A pencil behind the right ear. On the left cuff, a small embroidered patch of three contour lines in burnt sienna `#a8643c` (the site's contour colour). A small brass compass on a short cord at the collar `#a88a4e`. |
| **Never on her** | The status colours (CR red, EN orange, VU yellow) and the protect blue. These belong to the species and the data. |

**Palette rule:** apart from her skin and eyes, every colour comes from the site's palette (`src/theme.ts`) or is
a darker or desaturated step of it. Nothing on her is brighter or more saturated than the map.

## 6. Rendering style

| | |
|---|---|
| **Line** | Clean, slightly tapered line art in warm dark brown `#2a2218`, never pure black. 3–4 px at 1080 wide for a full figure, and 5–6 px for close-ups. Inner lines are thinner than outer lines. |
| **Cel shading** | Two tones (base + shadow) plus **one** soft gradient pass for form, as in a theatrical anime film rather than a TV series. The shadow shapes are designed, not airbrushed. |
| **Rim light** | A thin rim from each shot's key light: warm amber on the grassland and desert, cool grey-blue on the Himalaya, canvas-white on the map and UI. |
| **Highlights** | One band on the hair and one in each eye. No gloss elsewhere. |
| **Texture** | None painted in. The film's grain sits over her, as it does over everything else. |

## 7. Expressions (the expression sheet)

| # | Expression | Brows | Eyes | Mouth | Used in |
|---|---|---|---|---|---|
| E1 | Neutral, listening | level, relaxed | open, soft focus | closed, neutral | default, between beats |
| E2 | Curious | lifted unevenly (left higher) | widened slightly | slightly open | C1, C2 |
| E3 | Listening | soft, raised in the middle | **closing**, then closed | slightly open (speaking) | C5 |
| E4 | Concerned | level, drawn together 1 px | narrowed, steady | closed, the corners down 1 px | C3, C4 |
| E5 | Focused | set | on the fingertip | closed | C4, C6 |
| E6 | Direct | relaxed | straight into the lens | closed → speaking | C7 (turn) |
| E7 | Warm (final) | soft | softened, the lower lids lifted | a small closed-mouth smile | C7 (end) |

Mouth shapes for lip sync (Rhubarb set A–H + X) are only needed for **E3 and E6/E7**, the two appearances where
she speaks on screen. Everywhere else her voice plays over picture while she is off screen.

## 8. The appearance sheet: the minimum assets

**Eight assets plus one model sheet.** Each asset is one key drawing, layered for limited animation.

| Asset | Pose | View | Framing | Expression(s) | Used in | Layers needed |
|---|---|---|---|---|---|---|
| **CHAR_00** Model sheet | Turnaround: front, 3/4, profile, back; colour callouts | all | full body | E1 | reference only | — |
| **CHAR_01** Neutral | Standing, weight on one foot | 3/4 front | full body | E1 | spare / fallback for any slot | head, eyes (open/half/closed), brows, mouth, hair-front, tied strand, torso, arms |
| **CHAR_02** Curious / listening | Head tilted 6°, chin slightly down | **profile** | head + shoulders | E2 → E3 | **C5** (dolphin) | + mouth set A–H, X; the eyelid close as 3 drawings |
| **CHAR_03** Pointing | Arm extended toward frame left, slight lean | 3/4 front | **half body** | E2 | **C2** (Rajasthan) | arm as a separate layer (pivots at the shoulder) |
| **CHAR_04** Concerned | Hand raised to shoulder height, fingers following a line | profile, foreground | half body, **out of focus** | E4 | **C3** (wire) | hand separate (it moves along the line) |
| **CHAR_05** Looking upward | Looking up and to the right at the map, the map case at her hip | **back 3/4** | **full body, small** | E2 | **C1** (India reveal) | head turn (2 drawings), hair, strand |
| **CHAR_06** Hand on the map | Forearm and hand entering from the right edge; index finger extended | — | **hand / pointing pose** | — | **C4** (trace), **C6** (tap) | finger: extended, pressing (the tap), and lifted |
| **CHAR_07** Turn to camera | From 3/4 profile looking at the map, turning to front | 3/4 → front (2 keys + 1 in-between) | half body | E5 → E6 | **C7** start | + mouth set A–H, X |
| **CHAR_08** Final | Front, settled | front | half body | E7 | **C7** end | eyes and mouth swap on CHAR_07 |

Required views are all covered: full body (CHAR_01, 05), half body (03, 04, 07, 08), profile (02, 04),
3/4 (01, 03, 07) and the hand/pointing pose (06).

## 9. Where she appears (7 appearances, about 9.4 s of 62)

| # | Time | Shot | Dur | Asset | Action | Screen position and scale |
|---|---|---|---|---|---|---|
| C1 | 0:04.2–0:05.6 | P02 India reveal | 1.4 s | CHAR_05 | Stands on the graticule "floor" and looks up as the coastline draws; her head follows the pen | lower-left (x 120–300, feet at y 1150); height ≈ 360 px, about a fifth of the frame |
| C2 | 0:09.1–0:10.1 | P04 Thar | 1.0 s | CHAR_03 | Points toward Rajasthan as the camera dives; her arm leads the camera | right edge, cut by the frame at mid-thigh; height ≈ 900 px (half body) |
| C3 | 0:37.7–0:38.9 | P18 wire → line | 1.2 s | CHAR_04 | Foreground, defocused; her raised hand follows the wire as it straightens | lower-left foreground, 60 % out of frame; 12 px blur; silhouette with a rim |
| C4 | 0:40.8–0:41.8 | P20 fragment | 1.0 s | CHAR_06 (trace) | A fingertip traces the tiger's locality line, which breaks apart under it | hand enters from the right edge, wrist at x ≈ 990 |
| C5 | 0:23.2–0:24.6 | P12 dolphin | 1.4 s | CHAR_02 | Glances at the photo, tilts her head, closes her eyes as if listening; she speaks V06 | left edge, profile facing right; head and shoulders ≈ 520 px tall |
| C6 | 0:49.9–0:51.1 | P23 UI | 1.2 s | CHAR_06 (tap) | Her finger taps the pin; a touch ripple fires at the contact | hand from the lower-right, over the plate |
| C7 | 0:58.2–1:00.4 | P26 brand | 2.2 s | CHAR_07 → 08 | Turns from the outline to camera and speaks V14; settles into the warm look; the camera tilts up off her | lower-left, half body ≈ 760 px; the only time she looks into the lens |

C5 happens before C3 in running time. The numbering follows the brief's list of appearances.

## 10. Integration rules (how she belongs to the Atlas)

1. **She lives in the Atlas layer.** She stands on the map, the graticule, the UI, or at the edge of a frame. She
   is **never composited as if physically standing inside photoreal footage**. The one near-exception is C3,
   which happens at the instant the footage freezes and turns into map. That is the point of the shot.
2. **Smaller than the subject.** She never covers a species photo, a status chip, a voice caption, or the
   geography being talked about. C7 is the only appearance where she is the subject.
3. **She looks at things, not at us.** Her eyes go to the map, the line, the photo or the pin. One look into the
   lens, at the end.
4. **Matched light.** Her rim light and shadow side follow the shot's key: the hillshade's north-west light on the
   map, the low sun in the grassland windows, the UI's flat light in the interface.
5. **Matched finish.** The film grain over her, her blacks lifted to the map's ground (`forest950`) rather than
   pure black, and her edge softness matched to what she stands on (crisp on the UI, slightly soft over the map).
6. **Grounded.** A soft contact shadow under her feet whenever she stands (C1). Her hands cast a faint shadow on
   the map or UI surface when they touch it (C4, C6), offset to the key light.
7. **Depth.** In C3 she is in front of everything and defocused. In C1, C2, C5 and C7 she is between the map and
   the type. She is never on top of the type.
8. **Motion blur** only on her own movement, never as a style.
9. **Entrances and exits are motivated:** she peeks in from a frame edge, rises from behind the map's horizon,
   or the camera moves on and leaves her. She never pops on or fades in from nothing.

## 11. Animation style

- **Limited animation, done well:** a key pose holds while the eyes, brows, mouth, hair and the tied strand
  move. The in-betweens are few and deliberate. On twos (15 fps of drawings) for body motion, and on ones for
  the eyes and the strand.
- **Secondary motion:** the hair, the ochre strand and the shirt hem run on damped springs from the head motion
  and a per-shot wind value (strong in P04, none on the map or UI).
- **Blinks** every 2.5–4 s (seeded), and always on a head turn.
- **Acting timing:** eyes first, head 3–4 frames later, body last.
- **Pipeline:** layered PSD per asset → PNGs at 2× in `reel/character/rig/<asset>/` → a cut-out rig in Remotion
  driven by a pivot map, so every frame is still a pure function of time → Rhubarb lip-sync cues from the human
  WAV (analysis only; it generates no speech) for C5 and C7.

## 12. Making the art

The art is drawn by an illustrator, or generated as a draft and then **cleaned up and redrawn by hand**, so the
line is consistent across all eight assets. The approval gate: CHAR_00 and one composited test (C2 over the
Thar dive) must read at phone size, match the grade, and look as if she belongs to the Atlas rather than being
pasted on. Only then are the other seven assets made.

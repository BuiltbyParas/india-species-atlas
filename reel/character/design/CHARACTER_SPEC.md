# Character specification: Rekha, the Atlas guide

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

*Rekha* (रेखा) is Hindi for **line**, the film's one idea. She is an original character. The image in
`~/Downloads/5418462047978378.jpeg` (a comic-strip face peering round a door: "Finally you found me") was used only
for timing and attitude: the deadpan peek, the eyes doing the comedy, the reveal from behind something. Nothing
in her design comes from it. Her face, hair, clothes and colours below are new, and no existing anime character
is a model for her.

The working name and gender are a default. Both can change before the art is made; the rest of this spec doesn't
depend on them.

## Who she is

A young field cartographer in her early twenties who walks the Atlas. She isn't a mascot or a presenter. She is
someone whose job is noticing things.

- **Curious and observant.** She looks before she speaks. Her eyes reach a thing a few frames before her head turns to it.
- **Intelligent and dry.** She's slightly playful; her humour lives in one eyebrow, never in slapstick.
- **Serious when it matters.** On threats her face goes still. No tears and no anger.
- **Warm at the end.** The only time she looks straight down the lens for long is V18.

She is not a kid, a VTuber, a meme, a superhero or a chibi.

## Design

| Element | Spec |
|---|---|
| Proportions | Realistic anime, about 7 heads tall. Slim, grounded posture, weight on one foot. |
| Face | Oval face, a defined but soft jaw, a small straight nose shown as a line and a single shadow. Brows a little heavier than usual anime brows. They do most of the acting. |
| Eyes | Large but not huge, almond-shaped with a slight upward tilt. Deep amber iris (`#b07a3a`) with one controlled highlight and a thin dark limbal ring. |
| Hair | Black-brown, an asymmetric short bob: longer at the left jaw, cropped behind the right ear. One loose strand at the left temple is tied with a thin **ochre thread** (`#c9a24a`). That thread is the visual "line" and the main secondary-motion element. |
| Skin | A warm medium-brown South Asian skin tone. Cel shadows in a cooler, desaturated brown, never grey. |
| Clothes | A forest-green field overshirt (`#22301f`, the site's forest800 range) with rolled sleeves over a canvas-coloured (`#e8e1cf`) collarless shirt. Dark trousers and worn tan field boots. A narrow cross-body strap holds a flat map case. |
| Details | A pencil behind the right ear. On the left cuff, a small embroidered patch of three contour lines in burnt-sienna (`#a8643c`, the site's contour colour). A brass compass on a short cord at the collar. |
| Props (per shot) | A folded paper map (S03), nothing in her hands (S04 point), a palm-sized Atlas card that lights in the status colour (S06). |

**Palette rule:** everything comes from the site's palette (`src/theme.ts`) plus her skin and eyes. There are no
saturated accent colours. The status colours (red, orange, yellow) never appear on her. They belong to the species.

## Style

- **Line:** clean, slightly tapered line art in a dark warm brown (`#2a2218`), not black. Line weight is 3–4 px at 1080 wide for a full figure.
- **Shading:** two-tone cel shading plus one soft gradient pass, as in a theatrical anime film, not a TV series.
- **Rim light:** a thin rim taken from each shot's key light. Warm on the grassland, cool in the Himalaya, canvas-white on the map.
- **Highlights:** one in each eye and a single band on the hair. Restrained.

## Expressions (the expression sheet must include all eight)

1. Neutral listening (the default).
2. Curious: the brows lift unevenly, the mouth slightly open.
3. A small surprise: the eyes widen, the head pulls back 2°.
4. Pointing out: three-quarter view, the brows set.
5. Serious: the face still, the brows level, the mouth closed.
6. Thinking: the eyes up and off to one side, a slight pout.
7. Quiet pride: a closed-mouth smile, the eyes softened.
8. To camera: a direct, calm look and a minimal smile (S20, S21).

## Poses needed (one drawing each; the rig handles the in-betweens)

| Shot | Pose | Duration |
|---|---|---|
| S01 | Side-profile silhouette, chin up, rim-lit | 0.5 s |
| S03 | A small full figure on a rise, back three-quarter view, map in hand | 0.8 s |
| S04 | Foreground, out of focus, arm extended pointing right | 1.2 s |
| S05 | Half-hidden in grass at the left edge, looking right at the bird | 1.2 s |
| S06 | Waist up, index finger touching the map | 1.2 s |
| S08 | Head and shoulder behind a trunk, looking right | 0.7 s |
| S09 | Hand and forearm only, fingertip tracing | 1.8 s |
| S12 | Line-art variant (canvas lines, no fill) inside sonar rings | 0.8 s |
| S15 | Small full figure looking up and to the right | 0.8 s |
| S17 | Edge of frame, chest up, the smile settling into thought | 0.7 s |
| S18 | Full figure standing beside the map, head turning | 4 s |
| S19 | A hand tapping a UI tab | 0.6 s |
| S20 | Full figure, turning from the map to camera | 3 s |
| S21 | Head and shoulders, last look | 1 s |

Total screen time is about 18 s across 14 appearances, most of them under 1.5 s.

## Production pipeline

1. **Model sheet.** Front, three-quarter, side and back views, the 8 expressions and the 14 poses. Drawn by an
   illustrator, or generated and then cleaned up and redrawn by hand. Either way, the final art goes through a
   human cleanup pass for consistent lines. Prompts are in `reel/documentation/FLOW_PROMPTS.md` (section C).
2. **Layered art.** Each pose is a layered PSD: head, hair-front, hair-back, the tied strand, brows, eyes
   (open, half, closed), pupils, mouth shapes, torso, arms and the jacket hem. Exported as PNGs at 2× into
   `reel/character/rig/<pose>/`.
3. **Rig.** A cutout rig in Remotion (`video/atlas-promo/reel/character/`). Layers are positioned by a JSON pivot map, so every frame stays a
   pure function of time, like the rest of the film. This is limited animation by design: a pose holds while the eyes, brows, mouth and hair move.
4. **Lip sync.** [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) runs offline on the human
   WAV and writes mouth-shape cues (A–H, X). Each cue maps to a mouth layer. This analyses the recording and generates no speech.
5. **Secondary motion.** Hair, the tied strand and the jacket hem use damped springs driven by head motion and a
   seeded wind value per shot (stronger in S03–S05, light in the Himalaya, none on the map).
6. **Blinks** every 2.5–4 s (seeded), and always on a head turn.
7. **Compositing**, per shot:
   - Colour: match the plate's grade (lift, gamma, gain sampled from the plate).
   - Grain: the film grain sits over her as well.
   - Depth: blur her to the plate's depth of field.
   - Motion blur: Remotion `<CameraMotionBlur>` on her moves only.
   - Atmosphere: a haze layer over her at the plate's distance.
   - Contact shadow: a soft ellipse wherever she stands on ground.

## The open requirement

**No character art exists yet,** and none can be made inside this repository. The reel has a marked placeholder
in each of her slots, so timing can be judged now, but the style test (does she belong in the Atlas?) can't pass
until the model sheet exists.

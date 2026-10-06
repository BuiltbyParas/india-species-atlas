# Flow prompt package

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

Generate in Google Flow (Veo). Output 9:16 video, 1080×1920, and generate reference stills at 3:4 where Flow
offers it. Save each accepted clip to `reel/video/flow/` under the exact `flowFile` name in
`reel/edit/shotlist.json`, then run `npm run reel:sync`. The reel uses the clip instead of the stand-in automatically.

## A. Rules for every generation

1. **No visible watermark.** The Flow clip already in `~/Downloads` (`Camera_approaching_3D_terrain_India…mp4`)
   carries a visible "Veo" mark in the bottom-right corner. So does the Gemini grassland still (a sparkle, also bottom right). Generate on a plan
   that exports without the visible mark. Cropping it out costs about 8 % of the frame and is a last resort. (The invisible
   SynthID mark remains, which is fine and honest.)
2. **No text, logos or UI in the footage.** All type is ours, added in the edit.
3. **Generate 3–4 candidates per shot.** Pick the best take against the QC list in section D, and reject the
   rest without sentiment.
4. **Grade comes later.** Ask for "restrained natural colour" and grade in the edit. A strong look baked in at
   generation time can't be matched across shots.
5. **Never use generated maps or outlines.** The existing Flow clip drew India's outline wrongly (a glowing,
   simplified border over an invented mountain). **It is rejected.** Every map in the reel comes from the site's own
   boundary file.
6. Append this **negative block** to every prompt: `no text, no captions, no logos, no watermark, no subtitles, no
   UI, no borders, no letterboxing, no people unless stated, no extra animals, no morphing, no flicker`.

## B. Shots

The brief's prompts are kept, with a few changes marked **Δ**.

### S03 · Rajasthan grassland · 4 s · TEST SHOT 01
**Image (3:4):** Photorealistic Rajasthan semi-arid grassland at sunrise, tall pale golden grass extending toward a
distant **flat** horizon, subtle dust suspended in warm atmospheric light, sparse natural vegetation, **a few low
khejri or thorn-scrub trees far away** (Δ), enormous sense of scale, authentic Indian landscape, cinematic
environmental photography, sophisticated natural lighting, restrained earth tones, realistic textures, deep
atmospheric perspective, vertical portrait composition, no people, no buildings, no vehicles, no animals, no text,
no logo, no watermark.
**Video (9:16):** Vertical cinematic tracking shot through a vast Rajasthan semi-arid grassland at sunrise. Camera
moves slowly at grass-tip height through pale golden grass while wind creates natural waves across the field. Warm
low-angle sunlight, subtle atmospheric dust, distant flat horizon, realistic environmental motion, sophisticated
wildlife documentary cinematography, photorealistic natural textures, controlled camera movement, restrained
cinematic color grade. **Horizon in the upper third of the frame** (Δ). No animals, no people, no vehicles, no
text, no logos, no watermark.
**Δ why:** the existing Gemini still has rolling hills (closer to a prairie than the Thar's flat plains). The
horizon height is fixed so that S04's horizon lines up with it for the match cut.

### S04 · The wire · 3 s · TEST SHOT 02
**Image:** Cinematic Rajasthan grassland at sunrise viewed from extremely low grass level, a single dark electrical
transmission wire crossing the frame **from upper left to right at about one third of the frame height** (Δ) and receding toward distant steel
pylons, pale dry grass in foreground, warm side light, subtle dust, realistic Indian landscape, photorealistic
documentary cinematography, shallow atmospheric depth, elegant composition, no birds, no animals, no people, no
vehicles, no text, no logos.
**Video:** Low grass-level cinematic tracking shot across a flat Rajasthan grassland at sunrise. A single dark
electricity transmission wire crosses the foreground and recedes toward distant steel pylons. Camera moves slowly
sideways while focus transitions from the grass to the wire. Wind moves the grass naturally. Warm low sunlight,
subtle dust, realistic documentary cinematography, photorealistic textures, restrained cinematic grade. **The wire
stays sharp and continuous for the last second** (Δ). No birds, no animals, no people, no vehicles, no text, no
logos, no watermark.
**Δ why:** the line morph traces the wire on the frozen last frames, so the wire must be unbroken and in focus there.
Wire placement is fixed so the graphic line lands where the map line continues.

### S05 · Great Indian Bustard · 4 s · TEST SHOT 03 · see section E before generating
**Image:** Great Indian Bustard standing naturally in an expansive Rajasthan grassland at sunrise, authentic anatomy
and feather detail, **black crown, pale whitish neck, sandy-brown back, long legs, horizontal body carriage** (Δ), calm
alert posture, pale golden grass moving gently in the wind, enormous empty landscape surrounding the bird, warm
natural side light, atmospheric depth, photorealistic wildlife photography, sophisticated cinematic composition,
realistic Indian environment, no other animals, no people, no text, no logo, no watermark.
**Video:** A Great Indian Bustard stands calmly in a vast Rajasthan grassland at sunrise. Subtle natural movement of
feathers and grass in the wind. Camera performs a slow controlled push toward the bird from a respectful distance.
**The bird sits in the lower-middle third of the frame** (Δ). Natural wildlife behavior, realistic anatomy, detailed feathers,
atmospheric depth, warm sunlight, photorealistic wildlife cinematography, restrained color grading. No flying, no
aggressive movement, no additional birds, no people, no text, no logos.
**Δ why:** generators often turn bustards into herons or ostriches, so the field marks steer the model. The
bird's position leaves room for the card type above it.

### S07 · Central Indian forest · 2 s
The brief's image and video prompts as written. **Δ** Add: "strong vertical tree trunks in the foreground on the
right third" (the match cut to the tiger's stripes).

### S08 · Tiger · 2 s · see section E
The brief's prompt, plus **Δ** "Bengal tiger, wild, central Indian teak and sal forest, the tiger walking right to
left across frame, the body fully in frame, stripes clearly defined".

### S10 · Road through forest · 4 s
The brief's prompts. **Δ** Add: "two-lane highway, **top-down to 45° oblique**, the road running straight up the
centre of the vertical frame, a painted centre line clearly visible, sparse traffic". Its centre line becomes the
graphic line.

### S11 · Ganges aerial · 2 s
The brief's prompts. **Δ** Add: "the river running from bottom to top of the frame, both banks visible", so the
split line from S10 can become the two banks.

### S12 · Ganges river dolphin · 2 s · see section E
The brief's prompt, plus **Δ** "long narrow beak lined with teeth, very small eyes, a low triangular hump instead of a tall
dorsal fin, grey-brown body, murky brown-green water with very poor visibility". Without these terms the
generator draws a bottlenose dolphin in clear sea water, which is factually wrong.

### S14 · Himalaya · 2 s
The brief's prompts. **Δ** Add: "one dominant ridge line crossing the frame diagonally from lower left to upper
right". It becomes the contour line.

### S15 · Snow leopard · 2 s · see section E
The brief's prompt, plus **Δ** "smoky grey coat with dark rosettes, very long thick tail, the animal small in a
huge rocky slope above the treeline".

### S17 · Rhino · 3 s · see section E
The brief's prompt, plus **Δ** "a single horn, deep skin folds like plates of armour, tall elephant grass taller than the
animal's back, Assam floodplain". Also: "no zoo, no enclosure, no fence".

## C. Character art prompts (image model, for the model sheet, then human cleanup)

> Original anime character model sheet, theatrical anime film style, clean tapered warm-brown line art, two-tone
> cel shading with a soft gradient pass, subtle rim light. A young South Asian woman in her early twenties, a field
> cartographer, realistic proportions about seven heads tall. A black-brown asymmetric short bob, longer at the
> left jaw; one loose strand at the left temple tied with a thin ochre thread. Deep amber almond eyes, expressive
> slightly heavy brows, warm medium-brown skin. A forest-green field overshirt with rolled sleeves over a cream
> collarless shirt, dark trousers, tan field boots, a narrow cross-body strap with a flat map case, a pencil behind
> the right ear, a small brass compass at the collar, a tiny embroidered contour-line patch on the left cuff.
> Turnaround: front, three-quarter, side, back. Neutral grey background, no text, no logo.

Then, one sheet at a time: **expression sheet** (the 8 expressions in CHARACTER_SPEC.md) and **pose sheet** (the 14
poses). Reject anything that drifts toward chibi, mascot, or a recognisable existing character.

## D. QC: reject a clip if any of these is true

- Anatomy: extra or missing limbs, a wrong number of legs, a fused or melting body, a wrong head, an extra animal.
- Species: it reads as a different species (the field marks above), or as captive (fence, enclosure, food bowl).
- Motion: morphing, swimming textures, a sliding walk (feet not planted), popping, flicker.
- Optics: soft focus where focus matters, smeared fine detail, heavy compression artefacts.
- Content: any text, logo or watermark; a person or vehicle where none was asked for.
- Continuity: horizon or line position doesn't match the planned match cut (±5 % of frame height).
- Light: a key-light direction that fights the shot before or after it.

## E. The honesty decision for animal shots

The Atlas's founding rule is that it never presents an image as an accurate depiction of a real species without saying so.
A generated tiger is a picture of no tiger. Three acceptable options, in order of preference:

1. **Real licensed footage** of a wild animal in India (earlier sourcing: NCF India snow leopard, CC BY 3.0).
2. **The site's existing credited photographs** (Commons, licence shown on screen), animated only by camera
   movement and parallax.
3. **A Flow clip with an on-screen disclosure.** A small micro label, `AI-GENERATED VISUALISATION`, sits in the
   lower safe zone for the whole shot, and the credits list it.

The edit is built to take any of the three per shot. Landscape, wire, road and river shots without animals need only
a credits line ("Landscape footage generated with Google Flow").

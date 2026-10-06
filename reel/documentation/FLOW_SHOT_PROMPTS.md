# Flow shot prompts: environmental footage only

**Status:** prompts for approval. Supersedes `FLOW_PROMPTS.md`.
**Scope:** five shots, plus one optional. **Flow never generates a species.** The bustard, tiger, dolphin, rhino and
snow leopard are the Atlas's credited photographs. These shots are landscapes and infrastructure only, and every
one is seen *through a window in the map* at its real place (`PREMIUM_EDIT_PLAN.md` §5, T3).

| Shot | Subject | Used in | Seconds on screen | Generate |
|---|---|---|---|---|
| **F01** | Rajasthan semi-arid grassland | P04 (Desert) | ~1.1 s | 8 s clip, 3–4 takes |
| **F02** | The same grassland, with a transmission line | P17 + the P18 freeze | ~2.6 s + freeze frame | 8 s clip, 3–4 takes, seeded from F01 |
| **F03** | Central Indian forest: **A** unbroken canopy, **B** a highway through it | P05 (A), P19 (B) | ~1.0 s + ~1.6 s | two 8 s clips from one reference still |
| **F04** | The Ganga, lowland and silt-laden | P06 (River) | ~1.0 s | 8 s clip, 3–4 takes |
| **F05** | Himalayan ridge above the treeline | P08 (Himalaya) | ~1.3 s | 8 s clip, 3–4 takes |
| *F06* | *Brahmaputra floodplain grassland* (optional) | *P07 (Wetland)* | *~1.0 s* | *8 s clip. If it isn't made, P07 stays map-only.* |

The windows use a short slice of each clip, so a generation only has to be good for about 2–3 s somewhere in its
8 s. Choose the best stretch, not the best whole clip.

---

## A. Settings and rules for every generation

1. **Format:** 9:16 vertical, 1080×1920 (or the highest the plan allows), 8 s, 24 or 30 fps.
2. **Discard any generated audio.** All sound is designed (`SOUND_DESIGN_PLAN.md`).
3. **No visible watermark.** Generate on a plan that exports without the visible mark. (The invisible SynthID
   mark is fine.) Cropping a mark out is a last resort.
4. **No text, logos, UI, borders or letterboxing in the footage.** All type is added in the edit.
5. **Never a map, an outline or a globe.** Every map comes from the site's boundary file.
6. **The grade comes later.** Prompt for a restrained, natural, slightly underexposed image. A look that is baked
   in can't be matched across shots.
7. **The window composition.** Each window opens from a point and fills about 70 % of the frame. So the
   interest must sit in the **central band (y ≈ 300–1400)** and the frame edges should be quiet. Horizons sit at
   **about 38 % from the top** in F01, F02 and F06, so that the grassland shots match one another.
8. **Seeded pairs.** F02 is generated from a frame of the chosen F01 take, and F03-A and F03-B from one
   reference still (Flow's frames-to-video or ingredients). The point of the edit is that the viewer sees **the
   same place again**, now with the threat in it.
9. **Look:** dark, earthy, cinematic, restrained, geographic, editorial. It should look like a high-end
   documentary, not AI wildlife footage.

### Style block (append to every video prompt)

> Photorealistic cinematic documentary footage, vertical 9:16 composition. Natural, restrained colour with earthy
> tones and slightly underexposed, soft highlights that never clip, gentle film-like texture, realistic physics and
> motion, real-world geography of India. Shot like a premium natural-history documentary on a large-sensor cinema
> camera.

### Negative block (append to every prompt)

> no text, no captions, no subtitles, no logos, no watermark, no signage, no UI, no borders, no letterbox, no
> people, no humans, no vehicles, no animals, no birds, no buildings unless stated, no map, no globe, no
> oversaturated colour, no orange-and-teal grade, no HDR look, no bloom, no lens flare, no fantasy landscape, no
> impossible geography, no floating objects, no morphing, no warping, no flicker, no time-lapse, no fast motion

---

## B. The shots

### F01 · Rajasthan semi-arid grassland

**Used:** P04, the Desert window, opening from the Thar's locality point. ~1.1 s on screen. Its last frame also seeds F02.

**Geography it must respect:** the Thar's grassland margin (the landscape of Desert National Park in western
Rajasthan): **flat to gently undulating** open plain, pale straw-gold tussock grass (sewan grass), bare sandy
patches between the tussocks, scattered low thorn scrub and **a few distant khejri trees**. No rolling green hills,
no dunes filling the frame, no mountains.

**Reference still prompt (3:4 or 9:16):**
> A vast flat semi-arid grassland in western Rajasthan at sunrise. Pale straw-gold tussock grass with bare sandy
> ground between the tussocks, a few low thorn bushes and two or three distant khejri trees on a far, flat horizon.
> Thin dust hangs in low warm light. Enormous open space and quiet. The horizon sits at about 38 % from the top
> of a vertical frame. Restrained natural colour.

**Video prompt:**
> Vertical cinematic shot of a vast, flat semi-arid grassland in western Rajasthan, India, at sunrise. The camera
> glides slowly forward at about knee height through pale straw-gold tussock grass, drifting very slightly to the
> right. A light wind moves the grass in soft natural waves. Bare sandy ground shows between the tussocks. A few
> low thorn bushes and distant khejri trees sit on a far, flat horizon about 38 % from the top of the frame. A low,
> warm sun from the left; long soft shadows; thin suspended dust; atmospheric haze toward the horizon. Calm,
> steady, slow camera movement.
> *(+ style block, + negative block)*

**Camera:** a slow forward dolly at knee height (~0.6 m), slightly drifting right. Speed: a walking pace or slower.
**Light:** low sun from frame left, 5–10° elevation, warm but not orange.
**Atmosphere:** thin dust, distance haze. Sky pale and desaturated, never deep blue.

---

### F02 · Transmission line over the same grassland

**Used:** P17, the threat window (~2.6 s), then **the P18 freeze**: its last frame is held for 4 frames and the wire
is traced by hand. The wire must therefore be **sharp, continuous and unbroken across the frame in the last
1.5 s**.

**Seed:** the last frame of the chosen F01 take (frames-to-video), so the grass, light and horizon match.

**Geography it must respect:** India's high-voltage lines across the Thar: tall **steel lattice towers**, several
conductors hanging in a gentle catenary, and the line running across open grassland toward the horizon.
Realistic tower spacing (hundreds of metres apart). The landscape is unchanged from F01.

**Video prompt:**
> Vertical cinematic shot in the same flat Rajasthan grassland at sunrise, now crossed by a high-voltage power
> line. Tall steel lattice transmission towers recede toward the flat horizon, and their dark conductors sag in
> gentle natural curves across the sky in the upper third of the frame, from upper left to right. The camera
> tracks slowly sideways at knee height through the pale gold grass while the focus shifts from the grass in the
> foreground to the wires overhead. In the final seconds the wires are sharp, unbroken and continuous across the
> whole frame. A low warm sun, thin dust, a light wind in the grass, quiet and still. The towers are real
> engineering structures with correct proportions.
> *(+ style block, + negative block. Stress: **no birds**.)*

**Camera:** a slow lateral track to the right, with a focus pull from the foreground grass to the wires over ~3 s.
**Light / atmosphere:** as F01. The wires are slightly backlit so they read as dark lines against a pale sky.
**Critical:** no birds on or near the wires (the film never shows a bird striking or near a line). The wires must not
merge, break, multiply or wobble.

---

### F03 · Central Indian forest, then the road through it

**Used:** **F03-A** in P05 (Forest window, ~1.0 s); **F03-B** in P19 (~1.6 s). In P19 the road's centre line is
registered to the map line and **lifts out of the footage**, so the road must run straight and continuous through
the frame.

**Reference still (top-down, 9:16):**
> A straight-down aerial view of dry deciduous forest in central India (Madhya Pradesh) in the late dry season:
> a dense, uneven canopy of teak and sal with mixed greens, olive, ochre and a few bare grey crowns, small gaps
> showing red-brown earth. Early morning side light. Natural, restrained colour.

**F03-A video prompt (canopy, unbroken):**
> Vertical top-down aerial shot moving slowly forward over unbroken dry deciduous forest in central India in the
> late dry season. A dense, uneven canopy of teak and sal trees in olive, muted green and ochre, with a few bare
> grey crowns and small patches of red-brown earth. Low morning sun from the left casts soft shadows between the
> crowns. Faint haze. The camera is perfectly overhead and steady, gliding forward slowly. The forest is
> continuous, with no roads, no clearings and no structures.
> *(+ style block, + negative block)*

**F03-B video prompt (the highway):**
> Vertical top-down aerial shot moving slowly forward over the same dry deciduous forest in central India. A
> straight two-lane asphalt highway runs vertically through the centre of the frame, from top to bottom, cutting a
> clean corridor through the dense canopy. There are narrow cleared shoulders of red-brown earth on both sides and a
> faded painted centre line on the road. The forest presses close on either side. Low morning sun from the left,
> soft shadows, faint haze. The camera is perfectly overhead and steady, gliding slowly along the road. The road is
> empty.
> *(+ style block, + negative block. Stress: **no vehicles, no people**.)*

**Camera:** dead overhead (90°), a slow forward glide at ~120 m altitude. **The road stays centred** (x ≈ 540) and
straight throughout F03-B.
**Light:** low morning sun from the left, the same in A and B.

---

### F04 · The Ganga

**Used:** P06, the River window, opening on the Ganga's line as the rivers draw. ~1.0 s.

**Geography it must respect:** the middle Ganga in the plains (Bihar or Uttar Pradesh): **a very wide, flat,
silt-laden river**, grey-brown water, a slow current, low sandbars and a flat far bank with a thin line of trees.
No gorges, no rapids, no mountains, no clear turquoise water.

**Video prompt:**
> Vertical cinematic shot gliding slowly forward just above the surface of a very wide, calm, silt-laden lowland
> river in northern India at dawn: the Ganga in the plains. Grey-brown water with a slow current and gentle surface
> texture, a low pale sandbar in the middle distance and a flat far bank with a thin line of trees. Soft mist lies on
> the water. Pale early light from the left reflects softly on the surface. Enormous flat horizontal space, quiet
> and still. The horizon sits at about 40 % from the top of the frame.
> *(+ style block, + negative block. Stress: **no boats, no dolphins, no fish jumping**.)*

**Camera:** a low forward glide (~1.5 m above the water), very slow.
**Light:** pre-sunrise to just after; diffuse, with a soft warm-grey sky.
**Atmosphere:** low mist on the water, thinning with distance.

---

### F05 · Himalayan ridge above the treeline

**Used:** P08, the Himalaya window. ~1.3 s, then **T5**: the ridge line is matched to one high contour, and the
footage dissolves into the map. The ridge must therefore make **one clear diagonal line** across the frame.

**Geography it must respect:** the high, dry western Himalaya and Trans-Himalaya (Ladakh, Spiti): **steep, broken,
rocky slopes above the treeline**, scree, alpine scrub, snow on the upper ridges, a pale thin-air sky. Plausible
scale and erosion. No floating peaks, no impossible spires, no lush green alpine valleys, no glaciers in the
foreground.

**Video prompt:**
> Vertical cinematic shot of a high Himalayan ridge in Ladakh, India, far above the treeline. Steep, broken rocky
> slopes and grey-brown scree with sparse dwarf alpine scrub lead up to a sharp snow-dusted ridge crest that cuts
> diagonally across the frame from lower left to upper right at about 40 % from the top. A light wind lifts a thin
> veil of spindrift snow off the crest. Cold, clear morning light from the left, crisp shadows in the gullies, a
> pale desaturated blue-grey sky. The camera rises slowly and steadily, tilting up toward the ridge line. Vast scale,
> cold, silent, austere.
> *(+ style block, + negative block. Stress: **no animals, no prayer flags, no people, no trails**.)*

**Camera:** a slow crane up with a gentle tilt up, ending with the ridge line held steady for the last 2 s.
**Light:** cold, clear, low morning sun from the left.
**Atmosphere:** thin, clear air; spindrift on the crest only.

---

### F06 · Brahmaputra floodplain grassland (optional)

**Used:** P07, the Wetland window. ~1.0 s. If it isn't made, P07 stays map-only (the Brahmaputra draws, and the
floodplain tint pulses).

**Geography it must respect:** the floodplain of the Brahmaputra in Assam (the landscape of Kaziranga): **flat,
tall "elephant grass"** several metres high, shallow pools and wet channels, scattered trees, a line of forest and
faint hills far away under heavy morning mist.

**Video prompt:**
> Vertical cinematic shot of a vast floodplain grassland beside the Brahmaputra river in Assam, India, in early
> morning mist. Very tall elephant grass, pale green and straw-coloured, stands around shallow still pools of water
> that reflect the soft grey sky. Scattered trees, and a distant line of forest fading into heavy mist. The camera
> drifts slowly sideways at grass height and reveals the open water between the grass. Humid, soft, diffuse light,
> quiet and still. The horizon sits at about 38 % from the top of the frame.
> *(+ style block, + negative block. Stress: **no rhinos, no elephants, no deer, no birds**.)*

**Camera:** a slow lateral drift at ~1.5 m.
**Light:** diffuse, humid, low contrast.

---

## C. QC: a clip is accepted only if all of these pass

Check each clip at 100 % zoom, frame by frame through the stretch that will be used.

| # | Check |
|---|---|
| 1 | No text, signage, logo, UI or **visible watermark** anywhere in the frame |
| 2 | **No animal, bird, person or vehicle**, not even a speck in the distance |
| 3 | The geography is plausible for the named place (§B, "Geography it must respect") |
| 4 | No morphing, warping, flicker, boiling textures, or objects popping in and out |
| 5 | Stable horizon and camera (no sudden lurch or speed change in the used stretch) |
| 6 | Neutral enough to grade: no baked orange/teal, no clipped sky, no crushed blacks |
| 7 | Composition fits the window: interest in the central band, quiet edges, horizon at the specified height |
| 8 | **Pairs match:** F02 reads as the same place as F01; F03-B reads as the same forest as F03-A |
| 9 | Shot-specific: F02's wires are sharp and continuous in the last 1.5 s; F03-B's road is straight and centred; F05's ridge makes one clean diagonal |
| 10 | Looks like a premium documentary, not "AI footage": sits next to a `forest950` map frame without a jump in black level, saturation or grain once graded |

## D. Delivery

Save each accepted clip as `reel/video/flow/F01_rajasthan_grassland.mp4`, `F02_transmission_line.mp4`,
`F03A_forest_canopy.mp4`, `F03B_forest_highway.mp4`, `F04_ganga.mp4`, `F05_himalaya_ridge.mp4`,
`F06_brahmaputra_floodplain.mp4`. Record the generator, model and date of each in `CREDITS.md`. The end card and
the post caption say that the landscapes are generated visualisations (`PREMIUM_EDIT_PLAN.md` §9.1).

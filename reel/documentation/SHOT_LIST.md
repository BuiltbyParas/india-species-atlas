# Shot list

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

Generated from `reel/edit/shotlist.json` (the source of truth) by `npm run reel:shotlist`. Edit the JSON and regenerate this file; don't edit the table by hand.

| ID | In | Out | Dur | Source | Section | Character | Voice | Transition in → out | On-screen text | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| S01 | 0 | 3 | 3 s | existing | **The line / India**. Black. A 1 px canvas-coloured line rules across, then traces India's outline from the site's boundary file; INDIA in Newsreader Light. Re-rendered in portrait from S01Signal/S02India, not cropped from the 16:9 film. | 0.5 s side-profile silhouette in the dark at the line's start, rim-lit by it, before the outline draws. | V01 “India is home to some of the most extraordinary species on Earth.” | from black → F camera dive (push into India) | INDIA | existing-adapt |
| S02 | 3 | 6 | 3 s | existing | **India to Rajasthan**. The existing map camera travels to the Thar (LANDSCAPE_FOCUS[0]); relief and contours come up, the line runs ahead into Rajasthan. Final 0.6 s: contour lines thicken into terrain and a contour-shaped mask opens onto the grassland plate. | — | V02 “But where they live... is only the beginning.” | F camera dive → I mask reveal (contour mask opens on S03) | RAJASTHAN / 26.2°N 71.4°E | existing-adapt |
| S03 | 6 | 10 | 4 s | flow | **Rajasthan**. Vertical tracking shot through pale golden semi-arid grassland at sunrise, grass-tip height. No animals. | Small distant figure on a low rise, back to camera, 0.8 s (7.6 to 8.4). | V03 “Take the Great Indian Bustard.” V04 “Their habitat is changing.” | I mask reveal → H match cut (horizon line holds height into S04) | — | test-standin |
| S04 | 10 | 13 | 3 s | flow | **The wire**. Grass-level lateral track; one dark transmission wire crosses frame towards distant pylons; focus racks grass to wire. Freeze 4 frames at 12.87; a canvas-coloured graphic line lays over the wire and straightens into a map line. | In the foreground, out of focus, raises an arm and points at the wire (11.0 to 12.2). | V05 “And sometimes, the threat is literally a line across the landscape.” | H match cut → A line morph (wire to map line) | — | test-standin |
| S05 | 13 | 17 | 4 s | flow-or-real | **Great Indian Bustard**. A Great Indian Bustard stands in open grassland at sunrise; slow push from a respectful distance. The map line from S04 settles to the horizon and fades. | At the left edge, partly hidden by foreground grass, watching the bird (14.0 to 15.2). Never in front of it. | V06 “Critically endangered.” | A line morph (line resolves onto the horizon) → K focus transition (bird to card) | 01 / GREAT INDIAN BUSTARD | test-standin |
| S06 | 17 | 20 | 3 s | existing | **Bustard Atlas card**. Portrait species card: number, name, status chip from species.ts. Rajasthan and Gujarat (states of record) fill in the bustard's status colour on the map. | Points at Rajasthan on the map (17.6 to 18.8). | — | K focus transition → E habitat morph, then G camera ascent | 01 / GREAT INDIAN BUSTARD / CRITICALLY ENDANGERED | existing-adapt |
| S07 | 20 | 22 | 2 s | flow | **Central Indian forest**. Camera advances into dry deciduous forest; sun shafts through canopy. No animals. | — | V07 “Move south, and the story changes.” | G camera ascent then dive into canopy → H match cut (vertical tree trunk to tiger's stripe) | — | awaiting-flow |
| S08 | 22 | 24 | 2 s | flow-or-real | **Tiger**. Tiger walks through forest, tracked from the side. | 0.7 s, half-hidden behind a trunk in the foreground, looking towards the tiger (22.6 to 23.3). | — | H match cut → G camera ascent to map | — | awaiting-flow |
| S09 | 24 | 27 | 3 s | existing | **Tiger map**. Portrait species card; the tiger's states of record fill; a line traces the dataset's localities (the smoothPath device the site uses). It is not drawn or labelled as a range or a corridor. | Traces along the line with a finger; the line draws just behind the fingertip (24.6 to 26.4). | — | G camera ascent → B road morph in reverse (line becomes the road's centre line) | 02 / BENGAL TIGER / ENDANGERED | existing-adapt |
| S10 | 27 | 31 | 4 s | flow | **Road / fragmentation**. High aerial along a highway cutting through dense forest; forest on both sides. | — | V08 “Forests become corridors...” V09 “...and corridors become fragmented.” | B road morph → B road morph (centre line lifts off as a line, splits in two) | — | awaiting-flow |
| S11 | 31 | 33 | 2 s | flow | **Ganges**. Slow aerial over the broad river at early morning; mist. | — | V10 “Follow the rivers.” | the split line becomes the river's two banks (match) → camera tips under the surface | — | awaiting-flow |
| S12 | 33 | 35 | 2 s | flow-or-real | **Ganges river dolphin**. Turbid water, suspended sediment; the dolphin passes. | Under 1 s, drawn as a line-art figure inside sonar rings, an Atlas-style visualisation rather than a person underwater (33.4 to 34.2). | — | camera tips under the surface → C river morph | — | awaiting-flow |
| S13 | 35 | 37 | 2 s | existing | **Dolphin map**. Portrait card; the Natural Earth river network draws outward from the Ganga; the dolphin's states of record fill. | — | V11 “Even here, dams and barrages split the population.” | C river morph → D contour morph (camera climbs north into relief) | 03 / GANGES RIVER DOLPHIN / ENDANGERED | existing-adapt |
| S14 | 37 | 39 | 2 s | flow | **Himalaya**. Aerial glide towards a rocky ridge at dawn; blowing snow. | — | V12 “Then rise into the Himalayas.” | D contour morph (relief to real ridge) → H match cut (ridge line to slope line) | — | awaiting-flow |
| S15 | 39 | 41 | 2 s | flow-or-real | **Snow leopard**. Snow leopard moves across a rocky slope, tracked from far away. | Small figure lower in frame, looking up towards the cat (39.4 to 40.2). | — | H match cut → D contour morph (the ridge becomes a contour line) | — | awaiting-flow |
| S16 | 41 | 43 | 2 s | existing | **Snow leopard map**. Portrait card over the baked contour raster; one contour expands outward; the snow leopard's states of record fill (Ladakh drawn inside Jammu and Kashmir, as the site does). | — | V13 “Different habitat. Different species. Different pressures.” | D contour morph → J scale transition (contour to tall grass blade) | 04 / SNOW LEOPARD / VULNERABLE | existing-adapt |
| S17 | 43 | 46 | 3 s | flow-or-real | **Rhino**. Greater one-horned rhinoceros walks through tall floodplain grass; lateral track. | 0.7 s at the frame edge, a small relieved smile that settles into thought (44.0 to 44.7). | V14 “And some stories show us something else.” V15 “Recovery doesn't always mean safety.” | J scale transition → G camera ascent to the master map | 05 / GREATER ONE-HORNED RHINOCEROS / VULNERABLE | awaiting-flow |
| S18 | 46 | 50 | 4 s | existing | **India master map**. Whole India in portrait framing (upper two-thirds). Five places light in film order; one thin line joins them as the route this film travelled. It is the film's own path, not an ecological connection. | Stands beside the map, lower left, watching the network light up; turns her head as each place lights. | V16 “That's why we built India Species Atlas.” | G camera ascent → J scale transition into the interface map pane | RAJASTHAN / CENTRAL INDIA / GANGES / HIMALAYAS / NORTHEAST INDIA | existing-adapt |
| S19 | 50 | 55 | 5 s | existing | **Atlas interface**. Six real-site plates at 0.8 s each, re-cropped for portrait: ATLAS (atlas.jpg), SPECIES (species.jpg), PROFILE (profile-overview.jpg), DISTRIBUTION (profile-distribution.jpg), THREATS (profile-threats.jpg), LAYERS (atlas-conservation.jpg). Masked reveals, directional blur, slight perspective. | Taps the Threats tab on the PROFILE plate (52.0 to 52.6); the tab's real state follows. | V17 “Not just to show where species are...” | J scale transition → camera pulls back out of the interface to the map | ATLAS / SPECIES / PROFILE / DISTRIBUTION / THREATS / LAYERS | existing-adapt |
| S20 | 55 | 58 | 3 s | existing | **Atlas meaning**. Back to the quiet map; everything slows. Character fully visible, mid-frame below the map. | Fully visible. Turns from the map to camera on 'there'. | V18 “...but to explore what is happening there.” | pull back → fade through black | — | existing-adapt |
| S21 | 58 | 60 | 2 s | existing | **Final brand**. Black. Thin line. India outline. INDIA SPECIES ATLAS. Then the three EXPLORE lines. One clean impact. | A last look to camera, small and calm, beside the wordmark (58.4 to 59.4). | — | from black → end | INDIA SPECIES ATLAS / EXPLORE THE SPECIES. / EXPLORE THE MAPS. / EXPLORE THE CONSERVATION STORY. | existing-adapt |

## SFX and music per shot

| ID | SFX | Music |
|---|---|---|
| S01 | low drone swell, geographic click as the line starts, rising tone under INDIA | minimal atmospheric pulse |
| S02 | geographic pulse, air rush on the dive | pulse |
| S03 | wind through dry grass, dust hiss | pulse |
| S04 | faint 50 Hz electrical hum, short tonal whoosh on the morph | rhythm begins on the freeze |
| S05 | grassland ambience, single soft low impact on the status | rhythm |
| S06 | UI tick on each line of type, map fill pulse | rhythm |
| S07 | forest ambience in, deep impact on the cut to S08 | rhythm |
| S08 | forest ambience, soft paw foley | momentum |
| S09 | UI tick, pencil-on-paper line draw | momentum |
| S10 | low road rumble, low mechanical sweep on the morph | momentum builds |
| S11 | water, fluid whoosh in | momentum |
| S12 | underwater low frequency, two echolocation clicks | momentum |
| S13 | fluid whoosh, UI tick | momentum |
| S14 | high wind, soft rising tonal transition | cinematic expansion begins |
| S15 | wind, snow on stone | expansion |
| S16 | soft rising tone | expansion |
| S17 | low environmental impact, tall grass | expansion |
| S18 | one tick per place, a low bloom when the route completes | expansion |
| S19 | precise UI ticks on every cut | peak |
| S20 | music drops out, room tone only | drop |
| S21 | near silence, one final impact on the wordmark | near silence, final impact |

## Honesty notes

- **S05**: A generated bustard is an image of no real bird. Prefer the credited Commons photograph or licensed real footage; if a Flow bird is used, the frame carries an on-screen 'AI-generated visualisation' label. Decision pending (EDIT_PLAN.md, open decision 1).
- **S08**: As S05. The existing credited 3840 px tiger photograph is the fallback.
- **S12**: No licensed video of the species exists on Commons. If generated, the visualisation label applies. The credited photograph is the fallback.
- **S15**: Wild NCF India footage (CC BY 3.0) was found by the earlier plan and is the preferred source if it passes the 1080p gate.
- **S17**: Captive or unverified footage is not approved for this shot (see PROMO_FILM_PLAN.md T10).

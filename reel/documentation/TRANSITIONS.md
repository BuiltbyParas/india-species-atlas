# Transition system

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

Eleven transitions, one meaning each. Every one is the line changing role, and every one has a sound. Where a
transition appears is set in `reel/edit/shotlist.json` (`transitionIn` / `transitionOut`).

| | Transition | Where | How it's built | Ease / duration | Sound |
|---|---|---|---|---|---|
| A | **Line morph:** wire → map line | S04 → S05 | Freeze 4 frames on S04's last frame. A canvas-coloured 3 px stroke draws along the wire's catenary (hand-keyed path, 6 control points). Over 14 frames it straightens to the horizon and thins to 1.5 px. The footage under it de-saturates toward ground. | `outExpo`, 0.47 s | Short tonal whoosh, pitched up a 5th |
| B | **Road morph:** road centre line ↔ line | S09 → S10 → S11 | The tiger map's locality line rotates to vertical and lands on the road's painted centre line (match to the plate). On exit the centre line lifts off and splits into two lines that become S11's river banks. | `cinema`, 0.6 s | Low mechanical sweep |
| C | **River morph:** river → network | S12 → S13 | The surface plate tilts up into the map; the Ganga's Natural Earth geometry draws first, then its tributaries in order of distance. | `outExpo`, 0.8 s | Fluid whoosh |
| D | **Contour morph:** ridge ↔ contour | S13 → S14, S15 → S16 | One contour from the baked relief (`promo/geo/contours.json`) is matched to the plate's ridge silhouette, then expands into the full contour set. | `cinema`, 0.7 s | Soft rising tone |
| E | **Habitat morph:** landscape → polygon | S06 exit | The grassland's horizon line bends into Rajasthan's state outline (the site's boundary file), which fills in the status colour. | `outExpo`, 0.6 s | Map pulse |
| F | **Camera dive:** map → landscape | S01 → S02 → S03 | The existing map camera accelerates in (`z` 1 → 2.5 → 6). The relief raster grows a texture overlay, then a contour-shaped mask opens on the footage (see I). | `cinema`, 1.2 s | Air rush, low-passed |
| G | **Camera ascent:** landscape → map | S06, S08, S17 | The footage scales down and away (perspective 1600 px, tilt 8°) as the map rises behind it; the footage shrinks into the map at its real location. | `cinema`, 0.7 s | Reverse air rush |
| H | **Match cut** | S03→S04, S07→S08, S14→S15 | A hard cut where a shape holds its screen position: horizon height, a trunk/stripe vertical, a ridge diagonal. Requires the Flow prompts' Δ placement. | cut | The next shot's ambience starts 4 frames early (J-cut) |
| I | **Mask reveal** | S02 → S03 | Footage appears through a mask shaped like a real contour of the Thar, widening outward. | `outExpo`, 0.6 s | Geographic click |
| J | **Scale transition:** detail → geography | S16→S17, S18→S19 | The camera pushes into one line (a contour, a map line) until it fills frame as a texture (grass blades, the UI's map pane). | `cinema`, 0.5 s | Low swell |
| K | **Focus transition:** foreground → species → map | S05 → S06 | A rack: foreground grass sharp, then the bird, then everything blurs as the card's type comes into focus over it. | `emphasis`, 0.5 s | Single tick |

Rules:
- Motion blur on every fast camera move. In Remotion that's `<CameraMotionBlur samples={6}>` around the moving layer only, because it multiplies render cost.
- Depth: when footage meets the map, the footage carries the plate's blur and grain into the map for 6 frames, so neither pops.
- **No glitch, no swish presets, no light leaks.** If a transition is felt but not understood, it becomes a plain cut.

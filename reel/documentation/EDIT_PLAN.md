# Edit plan: India Species Atlas reel (60 s, 9:16)

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

**Branch:** `reel-60`. The 97 s promo was committed as a checkpoint (`ca37f3b`) before any reel work began, and
its 720p render is copied to `exports/reel/atlas_original_preview_720p.mp4`. Nothing in the 97 s film
(`video/atlas-promo/scenes`, `timeline.ts`) is modified. The reel is a separate composition, `AtlasReel`, that
reuses its components.

## 1. Audit of what exists

| Asset | Where | Verdict |
|---|---|---|
| 97 s promo (Remotion, 16:9) | `video/atlas-promo/` | **Foundation.** Every frame is a pure function of time and the map is resolution-independent, so its pieces re-render natively at 1080×1920. Nothing is cropped or upscaled from the 16:9 render. |
| India reveal (0:00–0:08) | `S01Signal`, `S02India` | **Keep**, as S01. The strongest opening. |
| Landscape camera moves (0:13–0:24) | `timeline.ts` `LANDSCAPE_FOCUS` | **Keep the Thar move** as S02's dive. The other four become the map side of transitions G and D. |
| Species panels with states of record (0:24–0:38) | `S04Life` | **Keep the map fills and status chips**; replace the photo panel layout with portrait cards (S06, S09, S13, S16). |
| Statistics grid (0:38–0:49) | `S05Data` | **Cut.** Numbers on a grid: the slideshow problem. |
| Threat list (0:49–0:59) | `S06Threats` | **Cut** the list. Its power-line story is now told by the wire. |
| Programme years 1985/2013 (0:59–1:09) | `S07Conservation` | **Cut.** A timeline that slows momentum. |
| Real-site UI plates | `video/public/promo/ui/*.jpg` (2×) | **Keep**, re-cropped for portrait (S19). |
| Brand reveal | `S10Brand` | **Keep the outline and wordmark**, re-laid for portrait (S21). |
| Credited species photographs | `video/public/promo/photos/` | **Keep as the honest fallback** for every animal shot. |
| Gemini grassland still (Oct 3) | `~/Downloads/Rajasthan_semi-arid_grassland…jpg` | **Stand-in only.** It's a still, the hills are rolling rather than flat Thar, and it carries a visible Gemini mark (cropped away in the stand-in). |
| Flow "camera approaching 3D terrain" clip | `~/Downloads/Camera_approaching_3D_terrain_India…mp4` | **Rejected.** Wrong India outline, an invented mountain, a glow look the bible bans, and a visible Veo watermark. |
| Placeholder music and SFX | `video/public/promo/audio/` | Synthesised timing tones. Not used for the reel. |
| Character reference | `~/Downloads/5418462047978378.jpeg` | Used for attitude and timing only (see CHARACTER_SPEC.md). |
| Voice | — | **None exists.** No synthetic stand-in is made. |

## 2. Timeline

21 shots, 18 voice lines. Full detail is in `reel/edit/shotlist.json` (machine-readable, read by the reel) and in
`SHOT_LIST.md` (generated from it).

```
0    3    6        10     13       17     20   22   24     27        31   33   35   37   39   41   43     46        50          55     58  60
|S01 |S02 |S03     |S04   |S05     |S06   |S07 |S08 |S09   |S10      |S11 |S12 |S13 |S14 |S15 |S16 |S17   |S18      |S19        |S20   |S21|
 line dive grass    wire   bustard  card   frst tigr map    road      rivr dolp map  himl snow map  rhino  master    UI montage  meaning brand
 slow ─────────────→ fast ──────────────────→ slow ───→ fast ────────────────────────────→ epic ──────────────────→ peak ───→ silence
```

## 3. Production phases and gates

| Phase | Content | Gate to pass before moving on |
|---|---|---|
| **0. Plan** (done) | Bible, timeline, spec, voice script, prompts, placeholder reel | — |
| **1. Visual tests** | S03, S04, S05 | See §4. **The current pass is here.** |
| 2. Character | Model sheet, expression sheet, one rigged pose composited into S03 | Rekha reads at phone size, doesn't look pasted on, and matches the grade |
| 3. Voice | Human recording of V01–V18 | Picture re-timed to the takes; intelligible over the music at phone volume |
| 4. Remaining Flow | S07, S08, S10–S12, S14, S15, S17 | Each clip passes FLOW_PROMPTS.md §D |
| 5. Atlas sections in portrait | S01, S02, S06, S09, S13, S16, S18–S21 | Map geography matches the site's boundary file; type inside the safe zone |
| 6. Sound | Music, ambience, SFX mix | −14 LUFS, voice always on top |
| 7. Final QC and export | Section 18 of the brief | See §5 |

## 4. Gate 1: what the first three tests must show

| Question | How it's judged |
|---|---|
| Does the footage match the Atlas? | S05's last frame and S06's first card sit side by side without a jump in black level, saturation or grain |
| Does the character style match? | **Can't be judged yet:** no art exists (phase 2). Placeholders mark her timing only. |
| Does the typography work? | Number, name and status readable on a 6-inch phone at arm's length; nothing outside the safe zone |
| Do the transitions feel premium? | The S04 line morph reads as "the wire becomes the map line" without explanation |
| Does the sound direction work? | **Can't be judged yet:** there are no reel sound files. SOUND_DESIGN.md is the spec. |
| Does vertical composition work? | One subject per frame; the bird and the type don't overlap; the horizon height holds across S03→S04 |

## 5. Final QC (before any export)

- **Technical:** 1080×1920, 30 fps, 60.0 s ±0.1, no black bars, no single-frame flashes (`npm run reel:qc`), −14 LUFS.
- **Footage:** FLOW_PROMPTS.md §D on every clip at 100 % zoom, frame by frame through each animal shot.
- **Character:** no edge halos; the grade and grain match; the contact shadow is where she stands.
- **Facts:** every voice line's `claim` is still present word for word in `src/data/species.ts`; every status is read from data.
- **Maps:** every outline is the site's boundary file; no range polygons; the master-map route is shown as the film's path.
- **Text:** no generated text inside the footage; all of ours is inside the safe zone and at least 26 px.
- **Sound:** no voice/music collision (music ducks under every line).

## 6. Exports

```
exports/reel/
  atlas_original_preview_720p.mp4     the 97 s film, untouched copy
  atlas_reel_tests_v01.mp4            phase 1 tests (S03–S05), stand-ins marked
  atlas_premium_v01.mp4 …             full reel versions, never overwritten
  atlas_premium_vNN_master.mov        ProRes 422 HQ master
  atlas_premium_vNN_instagram.mp4     H.264 High, 1080×1920, 30 fps, ~12 Mbps, AAC 320k, −14 LUFS
```

## 7. Open decisions (the owner's call)

1. **Generated animals.** A Flow bustard, tiger, dolphin, snow leopard or rhino is not an image of a real one.
   This project's rule is never to present such an image as accurate without saying so. The options: (a) real licensed
   footage, (b) the credited photographs with camera movement, (c) Flow clips carrying an on-screen
   `AI-GENERATED VISUALISATION` label. The tests use (b). Every animal shot can take any of the three.
2. **Rekha's design.** Her name, gender and look are a proposed default. Approve or change them before the model sheet is drawn.
3. **Voice actor.** Who records V01–V18, and when.
4. **Burned-in captions.** Recommended (most Reels are watched muted), and on in the tests. Easy to switch off.
5. **Master-map label.** The brief says "NORTHERN FLOODPLAINS" for the rhino. The dataset records the rhino in
   Northeast India (Assam, West Bengal and Uttar Pradesh), and no region called "Northern Floodplains" exists in the data,
   so the reel uses **NORTHEAST INDIA**.

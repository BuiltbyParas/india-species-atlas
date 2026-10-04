# India Species Atlas — promotional film plan

**Working title:** *Lines on the Map* · **Length:** 1:40 (100 s) · **Format:** 1920×1080, 16:9, 60 fps
**Status:** plan only. Nothing here has been rendered. The five-minute documentary direction is shelved.

**Re-verified 2026-09-29 against the same brief:** the URL still returns 200. All 10 narration claims (V5–V9, V14–V15)
are present word for word in `src/data/species.ts` and `ConservationMap.tsx`. The Atlas still holds 12 species, and
the five statuses are unchanged (CR, EN, EN, VU, VU). The environment is unchanged: no `GEMINI_API_KEY`, no Gemini CLI,
no libx264/libx265 (OpenH264, ProRes and SVT-AV1 only). The decisions in §13 are still open. Note that the older
`promo-film` branch holds the first 100-second cut (`video/src/films/promo.mjs`). The trailer is a new film file and
does not build on that cut.

The film is a product trailer for the India Species Atlas
(<https://builtbyparas.github.io/india-species-atlas/>, the URL in `scripts/promo/config.mjs`; it returns 200).
It has one idea: **a line**. Wire, road, river, ridge and boundary become map lines, and the map connects the story.
The Atlas is where that map lives.

---

## 1. Audit: why the current film looks soft

Checked against the 1080p shot renders in `exports/.cache/doc/shots/` (1:1 crops), the source files, and an
independent read-only engineering audit (Codex, run `20260927-163227-cb58`).

| # | Cause | Evidence | Weight |
|---|---|---|---|
| 1 | **The 3D terrain has no real detail.** The relief is ETOPO1 at 2 arc-minutes for India (~3.7 km per cell) and 1 arc-minute for the Himalaya (~1.85 km). Close camera moves put ~56 m on each output pixel, so one elevation cell spans ~30+ pixels: the ground renders as smooth, faceted clay. There is no satellite colour at all, only flat shading. | `video/public/data/etopo-*.json`; crops of S007 and S026 | **Main cause.** This is what reads as "cheap and blurry". |
| 2 | **The wildlife is still photographs.** Every species shot is a push-in on one photo. Nothing moves. | `video/src/scenes/doc-photo.ts` | High |
| 3 | **Some photos are soft at source or upscaled.** The snow leopard file is 1575 px wide and is shown ~1.2× larger than its own pixels. The bustard photo is a distant bird and is soft at 100%. The montage zooms to 1.34–1.42×. The photo plates also open on a deliberate 12–18 px rack-focus blur. | `video/public/species/*.jpg`; Codex px/px table | Medium |
| 4 | **Illustrations are flat vector drawings.** The pylons, road, ink and water shots are drawn shapes, not photographic. | `video/src/scenes/{pylons,road,water,cable}.ts` | Medium |
| 5 | **No supersampling.** The final render captures at exactly 1080p (device pixel ratio 1), so edges and thin lines alias. | `scripts/video/stage.mjs` | Medium |
| 6 | **Weak delivery encoder.** This Fedora FFmpeg has no libx264/libx265. OpenH264 at 9 Mbps (web) is too little for grainy 1080p60. Hardware HEVC (VAAPI) is present but the driver refuses to encode (tested). | `scripts/video/render.mjs` `pickH264` | Medium |
| 7 | **The link you watched was the draft.** The in-browser copy I published was the 960×540, 30 fps preview re-encoded at 1.45 Mbps. It looked far worse than the actual 1080p renders. | the chapter player artifact | Explains what you saw |

**Not a cause:** the finishing pass (grain, vignette, curves) has no blur, and final capture is lossless PNG.

---

## 2. What is reused, and what is not

**Reuse (engine and discipline):**

- The compositor and per-shot cache (`video/src/engine/film.ts`, `scripts/video/render.mjs`). Every frame is a pure function of time, so any shot renders on its own.
- The typography engine (`video/src/engine/type.ts`: mask, tracking, line and character reveals).
- The data layers: rivers and roads (Natural Earth), state boundaries, the dataset's localities, and the programme records.
- The claim-checked narration system (`claim` on each phrase, checked by QC against `src/data/*.ts`).
- The QC, report, manifest and credits pipeline (`scripts/video/qc.mjs`, `final.mjs`).
- The audio chain (voice timing, mix, loudness), with the voice and music replaced (§9, §10).
- The real Atlas screenshots, **recaptured at 2× device pixel ratio**.

**Retire for this film:**

- ETOPO1 relief for anything closer than a whole-India view.
- Photo push-ins as the main wildlife language. A photo appears only as a brief, credited insert that passes the gate.
- The vector illustrations (pylons, road, ink, water).
- The documentary's 40-shot timeline. The new film is a new film file (`video/src/films/trailer.mjs`), selected with `--film trailer`.

---

## 3. The film at a glance

| Time | Section | Shots | Music phase |
|---|---|---|---|
| 0:00–0:12 | The line | T01–T03 | Mysterious, near silence |
| 0:12–0:28 | India | T04–T05 | Curious, expanding |
| 0:28–0:58 | The species | T06–T10 | Restrained and emotional, with tension under the threats |
| 0:58–1:15 | The map (centrepiece) | T11 | Powerful, expansive |
| 1:15–1:30 | The Atlas | T12 | Clean, hopeful |
| 1:30–1:40 | Final reveal | T13 | Emotional, restrained resolve |

13 hero shots (about 30 cuts including the match-cut runs). Typical cut 1–4 s; heroes 4–6 s; the map reveal holds.

---

## 4. Narration (161 words)

Written for speech. Pauses are part of the design. Every factual line names the dataset field it rests on, and
QC checks it before every render, as the current engine already does. Lines without a claim are interpretation.

| # | Time | Line | Claim (field → exact words that must be present) |
|---|---|---|---|
| V1 | 0:02 | A line is the simplest thing we draw. | — |
| V2 | 0:05 | A wire. A road. A river. A ridge. | — (one word per match cut) |
| V3 | 0:10 | Each one crosses a living landscape. | — |
| V4 | 0:17 | India's landscapes are home to species we could still lose. | — (interpretation; the Atlas holds 3 CR, 6 EN, 3 VU) |
| V5 | 0:29 | Once found across much of the subcontinent, the Great Indian Bustard now meets power lines across its last grasslands. | bustard `description` → "Once found across much of the Indian subcontinent"; `threatNote` → "high-tension power lines crossing the Thar" |
| V6 | 0:36 | Roads, railways and mines cut through the tiger's forests. | tiger `threatNote` → "fragmentation of forest and corridors by roads, railways, mining and settlement" |
| V7 | 0:42 | Dams and barrages divide the rivers of a dolphin that is almost blind. | dolphin `threatNote` → "Dams and barrages fragment the population"; `description` → "functionally blind" |
| V8 | 0:48 | Above the treeline, the snow leopard's alpine world is shrinking. | snow leopard `habitatNote` → "above the treeline"; `threatNote` → "shrinking alpine zone under climate change" |
| V9 | 0:54 | And more than two-thirds of all greater one-horned rhinos live in a single park. | rhino `description` → "more than two-thirds of the world population is in a single park" |
| V10 | 1:00 | Conservation is geographic. | — |
| V11 | 1:04 | To protect a species, you have to know where it lives, what presses on it, and what protects it. | — (describes the Atlas's three map layers) |
| V12 | 1:16 | The India Species Atlas maps twelve threatened species this way. | `SPECIES.length` → 12 |
| V13 | 1:21 | Their range, their threats, their conservation, connected through geography, with the sources behind every claim. | — (describes the site: Distribution, Threats, Conservation and Sources tabs) |
| V14 | 1:31 | Mapping is not just about where species are. | — (the site's own closing line, verbatim) |
| V15 | 1:35 | It is about where we choose to protect them. | — (verbatim) |

No population figures are spoken. The brief prefers visuals over numbers, and a trailer doesn't need them.
Status labels on screen come from `species.ts` `status` at render time.

---

## 5. Shot list

Each shot names its **source class**: **R** real footage, **3D** our render, **MG** motion graphics,
**UI** the real site, **AI** a generated plate (optional, never an animal). Every shot has a fallback that
already passes the gate, so no shot is waiting on an asset that might not arrive.

### 0:00–0:12 · The line

**T01 · 0:00–0:05 · "A line"** · 3D + MG
- **Visual:** Black. A 1 px line of warm light (`#e8e1cf`) rules left to right. Raking light comes up and the line turns out to be a real ridge crest on photoreal terrain.
- **Camera:** locked for 2 s, then a slow 6 % push.
- **3D:** Copernicus 30 m elevation data for a Spiti ridge, with Sentinel-2 true colour. Low sun at 8°, shadows, height fog.
- **Sound:** room tone; a sub swell under the reveal.
- **Transition:** the ridge line holds its screen position into T02.

**T02 · 0:05–0:09 · "A wire. A road. A river. A ridge."** · R / 3D, four match cuts of ~1 s
- **Visual:** The line stays locked at the same height on screen across four cuts: a power conductor against the sky, a road centre-line from above, a river from orbit, a ridge. Each cut lands on its spoken word.
- **Sources:**
  - Wire: real footage slot, with an AI plate or a 3D cable as fallback.
  - Road: Sentinel-2 top-down of a real highway through forest, rendered in 3D.
  - River: *Braided River in Tibet Redraws Its Channels* (NASA Earth Observatory, public domain, 1080p).
  - Ridge: 3D.
- **Sound:** one element per cut (electrical hum, tyre hiss, water, wind), each 0.3 s ahead of its picture (J-cuts).

**T03 · 0:09–0:12 · Title** · MG + 3D
- **Visual:** The four lines converge. They draw India's outline from the Atlas boundary file. **INDIA SPECIES ATLAS** in Newsreader 300 at 120 px, tracking −1 %, mask reveal over 0.9 s (easeOutExpo). The subtitle follows in Geist 500 at 15 px, uppercase, 0.28 em tracking.
- **Sound:** first musical note on the title.

### 0:12–0:28 · India

**T04 · 0:12–0:20 · Space to India** · 3D
- **Visual:** One continuous camera move: space, then Earth, Asia and India. No cuts.
- **3D:** A NASA Blue Marble textured globe (public domain, ~500 m) with atmospheric scattering and a thin cloud layer. Natural Earth coastlines at 15 % opacity.
- **Camera:** an orbit easing into a dive, with a speed ramp at the Himalaya.

**T05 · 0:20–0:28 · Through the landscapes** · 3D
- **Visual:** Through cloud onto four real landscapes, 2 s each: Himalaya, Gangetic plain, central Indian forest, Thar. One word per landscape, placed in the world rather than on screen: **HABITAT · RANGE · THREATS · CONSERVATION** (Geist 500, 18 px, 0.3 em).
- **3D:** Copernicus 30 m plus Sentinel-2 10 m tiles per landscape, level-of-detail terrain, height fog, sun shadows.
- **Camera:** FPV-style glides, each landing where the next begins.

### 0:28–0:58 · The species (about 6 s each, each with its own look)

Each beat is the same device in a different material: **real animal → its line → the map**. A species card
appears for 1.6 s: the name in Newsreader 300 at 72 px, then the status chip and category in Geist 500 at 16 px
uppercase, in the site's status colour (CR `#d64545`, EN `#e0812b`, VU `#e6b800`). No other text.

**T06 · Great Indian Bustard · CRITICALLY ENDANGERED** · R → 3D
- **Real:** *Great Indian Bustard call.webm* (Shiv's fotografia, CC BY-SA 4.0, 1920×1080, 11 s, wild). **Gate pending** (the subject may be small or soft).
- **Line:** a high-tension conductor crosses frame. It is composited in only if the footage has none, and labelled illustrative. The wire match-cuts to the map line over Thar terrain.
- **Fallback:** a 1.8 s insert of the existing photograph at ≥1.2 source pixels per output pixel, no push. Then straight to the map.
- **Sound:** wind in grass, a faint 50 Hz hum.

**T07 · Bengal Tiger · ENDANGERED** · R → 3D
- **Real:** **needs sourcing.** Commons has no licensed footage of a wild Bengal tiger at 1080p or above. Most results are captive Amur tigers, a different subspecies, and must not stand in for a Bengal tiger. Acceptable sources: licensed stock footage of wild Bengal tigers filmed in an Indian reserve, or a clip from a photographer with written permission.
- **Line:** the camera rises from the forest. The forest becomes Sentinel-2 terrain of central India. Real roads (Natural Earth) cut across it.
- **Fallback:** the existing Bengal tiger photograph (3840 px, credited) as a 2.2 s depth-parallax plate. Its depth map is made by hand, with no AI in-painting of the animal.
- **Sound:** forest birds, then distant traffic under the road.

**T08 · Ganges River Dolphin · ENDANGERED** · R → 3D + MG
- **Real:** no licensed video of the dolphin exists on Commons. It is rarely filmed, and we won't fake it.
- **Visual:** a silt-brown river surface (real Ganga footage, e.g. *Ganges River in Varanasi by boat*, CC BY-SA 4.0, 720p, gate pending, or a 3D water plate). The camera tips under the surface. Sonar rings pulse, because the animal hunts by sound. The river network lights up as a 3D line network. A barrage symbol (labelled illustrative) splits it.
- **Photo:** the existing photograph (2441 px, credited) as a 1.5 s insert.
- **Sound:** water; the sonar clicks drive the edit.

**T09 · Snow Leopard · VULNERABLE** · 3D → R
- **3D:** a flight through Spiti ridges (Copernicus 30 m, Sentinel-2 winter scene) with fog and blowing snow. Real 20 m contours draw on the rock.
- **Real:** *A New Year's Snow Leopard Encounter in India* (Tanzin Thinley / NCF India, CC BY 3.0, 1920×1080, wild, India). **Gate pending.** Alternative: *Snow leopard family, Spiti* (NCF, CC BY 3.0, 720p). This one is only usable if it passes at 1080p.
- **Captive-footage rule:** *Schneeleopard (Zoo Leipzig)* (CC BY-SA 4.0, 3840×2160) is sharp. If used, the frame must be tight on rock with no enclosure visible, and the credits must say "captive animal".
- **Sound:** high wind, snow on the lens, silence on the card.

**T10 · Greater One-horned Rhinoceros · VULNERABLE** · R → 3D
- **Real:** *Kaziranga morning 20231221 075150.webm* (L. Shyamal, CC0, 1080p) for the floodplain. For the rhino itself, wild footage from Kaziranga **needs sourcing**. *Berlin zoologisk hage 2026-04-07 mov20* (CC0) is captive and its species is not yet confirmed, so it is not approved.
- **Line:** the camera cranes up. The Kaziranga boundary draws around the park.
- **Boundary data needs verification:** the dataset has point localities only. The polygon would come from OpenStreetMap (ODbL, credited). Otherwise a ring around the locality, labelled indicative.
- **Sound:** wind through tall grass, a single restrained impact on the card.

### 0:58–1:15 · The map (centrepiece)

**T11 · "Conservation is geographic"** · 3D + MG, 17 s in three movements
1. **Rise.** The camera lifts off Kaziranga to all of India. The terrain is a Blue Marble mosaic, with Sentinel-2 detail wherever the camera comes close. Rivers light first (`#7ea3b5`), then roads (`#b07a52`, 60 %), then state boundaries (8 %).
2. **Traverse.** A slow oblique move from east to west. All five species' anchors appear as status-coloured markers, the same pins as the site. From each, three thin lines reach out: **habitat** (states of record), **threat** (one hatch per recorded threat) and **protection** (programme sites). These are exactly the site's three layers.
3. **Settle.** The camera eases to top-down. Every line holds for a beat. The top-down frame matches the site's map framing, which sets up T12.

- **Data:** `species.ts` (localities, states, threats), `programmes.ts` sites, Natural Earth rivers and roads.
- **Rules:** nothing is drawn as a range polygon unless the data holds one. Device lines are labelled.
- **Sound:** the score opens fully. A soft tick as each marker lands. No bass drop.

### 1:15–1:30 · The Atlas

**T12 · Map → interface → profile → range → conservation → atlas** · UI + MG
- **Visual:** The film's map matches onto the site's real interactive map at the same framing. UI chrome fades in around it. A pin opens the real species profile, which slides in with the site's own motion. The Distribution, Threats and Conservation tabs each hold for about 1.5 s. It ends on the Atlas home.
- **Assets:** recaptured screenshots at 2× device pixel ratio (3840 px), so the UI is crisp after scaling. These are composited stills placed in depth, not a screen recording.
- **Rule:** no invented UI states. Every frame shows a state the site actually has.
- **Sound:** light UI ticks from the score's own sounds, rising to a warm pad.

### 1:30–1:40 · Final reveal

**T13 · End card** · MG
- **Visual:** Everything fades to black except one line, which draws India's outline over 2.2 s. **INDIA SPECIES ATLAS** in Newsreader 300 at 96 px. Then three lines in Newsreader italic 300 at 28 px, staggered 0.35 s:
  - Explore the species.
  - Explore the maps.
  - Explore the conservation story.
- **URL:** `builtbyparas.github.io/india-species-atlas` in Geist 500 at 20 px, 0.1 em tracking, `#e8e1cf`. Held 3 s.
- **Sound:** a single resolving chord and a reverb tail. No call-to-action sting.

Credits follow as a separate 8 s card after 1:40, outside the trailer length.

---

## 6. Visual system

- **Palette (from `src/index.css`):**
  - Ground: forest-950 `#0e1411`, forest-900 `#131a16`
  - Ink: canvas `#e8e1cf`
  - Accents: forest-400 `#86a593`, river `#7ea3b5`, contour/clay `#b07a52`
  - Status colours as on the site
- **Type:** Newsreader for display (weights 300–330, never bold) and Geist for labels (weight 500, uppercase, 0.24–0.3 em tracking).
  - Maximum two type elements on screen at once.
  - Minimum 18 px for anything that has to be read.
- **Grade:** natural wildlife colour, rich blacks (lift ≤ 2 %), rolled-off highlights, saturation ≤ 0.95 of the source. No teal-orange.
  - One LUT for the whole film, with per-section trims of at most ±4 % exposure and ±300 K.
  - Grain: fine luma grain at 2× render scale (so it survives the downscale).
- **Motion:** easeOutExpo for reveals and easeInOutSine for camera moves.
  - Nothing moves just to fill the frame; roughly a third of the shots are locked off or nearly so.
- **Transitions (the only ones allowed):**
  - Match cut on the line
  - Wire → map line
  - Road → corridor
  - River → network
  - Ridge → contour
  - Grass → map texture
  - Map → interface
  - One dissolve per section at most. No whip pans except T02's final cut.

---

## 7. 3D requirements (the major upgrade)

| Need | Source | Licence | Checked |
|---|---|---|---|
| Close terrain (5 landscapes) | Copernicus GLO-30 DEM, cloud-optimised GeoTIFF tiles on AWS | Free, commercial use with attribution | Reachable (HTTP 206) |
| Ground colour, close | Sentinel-2 L2A true colour, 10 m, via the Earth Search STAC | Free, commercial use; credit "Contains modified Copernicus Sentinel data 2025" | Found a cloud-free Kaziranga scene (0.16 % cloud, Feb 2025) |
| Globe and India-wide colour | NASA Blue Marble Next Generation (~500 m) | Public domain | — |
| Rivers and roads | Natural Earth 1:10m (already in repo) | Public domain | In repo |
| Protected-area polygons | OpenStreetMap | ODbL, credited | Needs verification per park |

**Rejected:** EOxCloudless (CC BY-NC-SA, non-commercial only).

**Build:**

- A new `terrain2` module beside the current one.
  - Per-landscape tiles are pre-baked by a Node script (`geotiff` npm package; no GDAL needed) into 16-bit height and 8-bit colour textures.
  - Camera-distance level of detail.
  - Skirts at tile edges.
  - A detail normal map derived from the elevation data.
- **Lighting and atmosphere:**
  - Directional sun with shadow maps
  - Height fog and atmospheric perspective
  - A thin procedural cloud layer for T04–T05 only
- **Budget:** each landscape is a few tiles; pre-bake, don't stream. Heavy shots may take seconds per frame, which is acceptable for an offline render.

---

## 8. Asset status

| Asset | Status | Action |
|---|---|---|
| Bustard real clip | Found (CC BY-SA 4.0, 1080p) | Download, gate |
| Snow leopard real clip (wild, India) | Found (CC BY 3.0, 1080p) | Download, gate |
| Kaziranga landscape | Found (CC0, 1080p) | Download, gate |
| River from orbit | Found (NASA, public domain, 1080p) | Download, gate |
| Ganga surface | Candidate (CC BY-SA 4.0, 720p) | Gate; likely replaced by a 3D water plate |
| **Wild Bengal tiger footage** | **Not found free** | **You source it (licensed stock or permission); otherwise the photo fallback** |
| **Wild rhino footage** | **Not found free** | **You source it; otherwise the photo fallback** |
| Dolphin footage | Does not exist freely | Designed around it (sonar, network, photo insert) |
| Power-line footage | Not searched yet | Commons search, then an AI plate if you approve |
| Site screenshots at 2× | To recapture | `scripts/video/capture-site.mjs` with deviceScaleFactor 2 |
| DEM and Sentinel tiles | Reachable | Bake script |
| Voice | **Decision needed** | See §9 |
| Music | **Decision needed** | See §10 |

**AI generation:** optional, and only for atmospheric plates: grass macro in wind, fog through a sal canopy, snow off a ridge, a power line at dusk.

- Never an animal, never a real place presented as a record, always disclosed in the credits.
- The Google Video Agent could not run: there is no `GEMINI_API_KEY` and the Gemini CLI is not installed. Veo plates need a key and your explicit go-ahead.

---

## 9. Voice

The current voice is Microsoft Edge neural text-to-speech (`en-IN-PrabhatNeural`). It is clear, but it is not the
"professional narrator" the brief asks for, and it will sound synthetic next to premium picture.

- **Recommended:** a human narrator reads the 15 lines of §4. Record them as separate takes at 48 kHz/24-bit. The engine already takes `public/audio/voiceover.wav` or per-line files and retimes the edit to them.
- **Fallback:** keep text-to-speech, with hand-set pauses and emphasis through SSML. Disclose it in the credits, as now.

---

## 10. Music and sound

**Music:** the synthesised score works as a sketch, but "cinematic and modern" needs either a licensed track or a
composed one. The engine takes `public/audio/music.wav` and the credits must name it.

**Cue map (whatever the source):**

| Time | Cue |
|---|---|
| 0:00 | Near silence, room tone |
| 0:09 | First note on the title |
| 0:12 | Pulse enters with the Earth |
| 0:28 | Restrained theme; one motif per species |
| 0:40–0:58 | Tension builds under the threats |
| 0:58 | The fullest passage |
| 1:15 | Clean and bright |
| 1:30 | Strip back to one voice |
| 1:38 | Resolve |

**Rules:** musical pauses under the snow leopard card and before V10. No generic trailer booms.

**Sound design layers:** voice, music, ambience per landscape, foley, geographic sounds (line draws, marker
ticks), soft whooshes only on real camera moves, low end only on T04 and T11. Mix to −14 LUFS integrated,
−1 dBTP, with dialogue ducking and no clipping (the existing mix chain already does this).

---

## 11. Quality gate (every shot, before approval)

**Automatic** (new `video:gate` command; fails the shot, never the film silently):

| Check | Rule |
|---|---|
| Source resolution | Real footage must be ≥ 1920×1080 native. No shot may upscale any source beyond 1.0×. Photos must hold ≥ 1.2 source pixels per output pixel at their tightest framing. |
| Sharpness | FFmpeg `blurdetect` plus Laplacian variance on the subject crop, sampled every 0.25 s. Thresholds are calibrated per shot class from two approved reference shots. |
| Temporal stability | Frame-difference spikes and flicker in the luma of static regions. |
| Compression | A block-artefact check on source footage. Reject visible macroblocking. |
| Technical | No black frames (FFmpeg `blackdetect`), correct fps and resolution, no missing assets, audio peaks ≤ −1 dBTP. |
| Data | Every narration claim and on-screen label checked against `src/data` (existing QC). |

**Human review** (required; a shot only passes when both are clean):

- A contact sheet at 100 % crop for every shot: first, middle and last frame, plus the subject crop.
- Playback of every shot at full resolution and full frame rate.

**Reject on sight:**

- A soft subject, smeared fur, or distorted anatomy or features
- Warped vegetation or unstable geometry
- AI artefacts, over-sharpening halos, or wrong depth of field
- Motion blur that hides the subject, or temporal shimmer
- Lighting that doesn't match its neighbours, or fake-looking textures
- A captive animal passed off as wild

A rejected shot is replaced by its fallback, never shipped because it rendered.

---

## 12. Render plan

- **Supersample:** render at 3840×2160 (scale 2), then downscale to 1080p with Lanczos (`zscale`). This fixes aliasing on 1 px lines and lets grain survive.
- **Intermediates:** lossless FFV1 or PNG per shot, cached by hash as now.
- **Delivery:**
  - `…_MASTER.mov`: ProRes 422 HQ, 1080p60 (clean master; available in this FFmpeg).
  - `…_MASTER.mp4` and `…_WEB.mp4`: H.264.
    - **Recommended:** install full FFmpeg from RPM Fusion to get libx264 (CRF 14 master, CRF 18 web) and libx265. That needs `sudo` on your side.
    - **Without it:** OpenH264 at 45 Mbps (master) and 16 Mbps (web).
  - `…_WEB_AV1.mp4`: SVT-AV1 (available).
- **Also produced:** `…_SUBTITLES.srt`, `…_THUMBNAIL.png`, `SHOT_MANIFEST.yaml` plus `.md`, `PRODUCTION_REPORT.md`, `CREDITS.md` (with the AI and captive-animal disclosures if applicable).

**Commands** (same shape as now, with `--film trailer`):

```sh
npm run video:shot -- T06 --film trailer        # one shot, 1080p60 (use --draft for half size)
npm run video:sequence -- species --film trailer
npm run video:gate -- T06                       # the quality gate for one shot
npm run video:preview -- --film trailer         # whole film, half size, for timing only
npm run video:render -- --film trailer          # 2× supersampled master
npm run video:render:final -- --film trailer    # gate, QC, audio, all deliverables
```

**Order of work** (each step ends with shot renders and a gate review, never a full-film render):

1. `terrain2` and the tile bake. Prove it on T01 and T09 first; they are the hardest 3D shots. **Go/no-go on the look.**
2. Download and gate the found footage (bustard, snow leopard, Kaziranga, NASA river).
3. The map centrepiece, T11.
4. The site recapture at 2×, then T12 and T13.
5. The remaining shots, the voice and music (per your decisions), the mix.
6. Full preview for timing, then the final render.

---

## 13. Decisions needed from you

1. **Tiger and rhino footage:** can you license or obtain wild footage (stock, or a photographer's permission)? If not, both use the photo-parallax fallback.
2. **Voice:** a human narrator, or keep text-to-speech?
3. **Music:** a licensed or commissioned track, or keep the synthesised score?
4. **FFmpeg:** may I ask you to install RPM Fusion FFmpeg (libx264/libx265), or should I stay on OpenH264 and ProRes?
5. **AI plates:** allowed for atmosphere only? If so, a `GEMINI_API_KEY` is needed.
6. **Branch:** I'd build this on a new branch (`promo-trailer`) off `doc-film`, leaving the documentary work intact.

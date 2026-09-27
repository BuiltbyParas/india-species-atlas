# Lines on the Map: the promotional film

This is a 69-second promotional film for the India Species Atlas (1920×1080 at
60 fps). It is built from the atlas's own data, public-domain geography, the
atlas's five credited photographs, and drawn illustration. Every frame is a
pure function of time, so any shot, sequence or single frame renders the same
way on its own as it does in the full film.

The film is separate from the site. `npm run build` never touches `video/`,
and the film only reads `src/data/`, `src/types` and `public/india-states.geojson`.

## Running it

```sh
npm run video:data                     # fetch geography, fonts and full-size photos (once)
npm run video:dev                      # the stage with a player: http://127.0.0.1:4455
npm run video:still -- 10.5 57.9       # single frames → exports/stills/
npm run video:shot -- S03              # one shot at 1080p60 → exports/shots/S03.mp4
npm run video:sequence -- tiger        # one sequence → exports/sequences/tiger.mp4
npm run video:preview                  # whole film, 960×540 @ 30 fps, about 2 min
npm run video:audio                    # narration, score, sound design, mix, captions
npm run video:qc                       # checks only
npm run video:render                   # whole film at 1080p60 → exports/…_MASTER.mp4
npm run video:render:final             # QC → audio → master, web, AV1, SRT, thumbnail,
                                       # SHOT_MANIFEST, CREDITS, PRODUCTION_REPORT
```

Add `--draft` to `still`, `shot` or `sequence` for half size at 30 fps, and
`--force` to ignore the shot cache. The sequences are `hook`, `world`,
`bustard`, `tiger`, `dolphin`, `snow-leopard`, `rhino`, `idea`, `title` and
`credits`.

## How it is built

| Part | Where |
|---|---|
| Running order, narration, cues, credits (single source of truth) | `src/timeline.mjs` |
| Compositor, transitions, per-shot grade | `src/engine/film.ts` |
| 3D relief (ETOPO1 height in the shader, contours, snow, haze, map morph) | `src/engine/terrain.ts` |
| Map layers projected onto the relief | `src/engine/layers.ts`, `src/engine/draw.ts` |
| Typography presets (fade, slide, tracking, mask, line, chars, scale) | `src/engine/type.ts` |
| Scenes, one file per scene | `src/scenes/` |
| In-stage checks (fonts, photos, data, narration claims) | `src/qc.ts` |
| Capture, shot cache, assembly, finishing grade | `../scripts/video/render.mjs` |
| Score, ambience and effects synthesis, and the mix | `../scripts/video/audio/` |
| QC, delivery and reports | `../scripts/video/qc.mjs`, `final.mjs` |

Each shot is captured into a mezzanine file named by a hash of everything
its pixels depend on: the engine, its scene file, its timeline entry and its
assets. Changing one scene re-renders only the shots that use it.

## Honesty rules the film keeps

- **Facts come from the dataset.** Names, categories, assessment years,
  localities, states of record and photo credits are read from
  `src/data/species.ts` at render time. Each narration line that makes a
  claim names the dataset field it rests on. QC checks the claim against the
  live data before every render and fails if the data no longer says it.
- **Real and illustrative are kept apart.** Every layer in the timeline
  declares its provenance. The power line on the bustard map, the links
  between tiger reserves and the breaks in the river network are drawing
  devices. They are dashed or ticked, and tagged "illustrative" where they
  are drawn. The close-up line, pylons, road and water shots are drawn
  illustrations, and the credits say so. See `DATA_SOURCES.md`.
- **Nothing is silently substituted.** A missing asset draws a red
  placeholder and fails QC.

## Dropping in real material

- **Footage.** S01, S02, S06 and S09 are footage slots. Put a clip at
  `public/footage/S01.mp4` (and so on) and it replaces the illustration,
  cropped to 16:9, conformed to 60 fps and graded with the rest. To reject
  a clip without deleting it, list it in `public/footage/REJECTED.json` as
  `{ "footage/S01.mp4": "reason" }`. The report marks it REJECTED.
- **Voiceover.** Put a full take cut to the timeline at
  `public/audio/voiceover.wav`, or single lines at
  `public/audio/vo/V1.wav` and so on. Then set `CREDITS.voiceSource` and
  `CREDITS.voice` in the timeline. QC fails if the credits and the audio
  disagree.
- **Music.** Put a licensed track at `public/audio/music.wav` and update
  `CREDITS.musicSource` and `CREDITS.music`.

# India Species Atlas: 60-second vertical reel

A 1080×1920, 30 fps Instagram Reel built on top of the 97 s promo film (`video/atlas-promo/`). That film is left
untouched: the reel is its own Remotion composition, `AtlasReel`, which reuses the film's tokens, fonts, type
components, map and finishing pass.

**Status:** phase 1, visual tests. See `documentation/EDIT_PLAN.md` §3 for the phases and gates.

## Folders

| Folder | Holds |
|---|---|
| `documentation/` | `VISUAL_BIBLE.md`, `EDIT_PLAN.md`, `SHOT_LIST.md` (generated), `FLOW_PROMPTS.md`, `TRANSITIONS.md`, `SOUND_DESIGN.md`, `CREDITS.md` |
| `edit/shotlist.json` | **The edit.** Shots, times, voice lines, transitions, text, status. The reel reads it directly. |
| `video/flow/` | Accepted Flow clips, named as each shot's `flowFile` (e.g. `S03_rajasthan_grassland.mp4`) |
| `video/existing/`, `video/renders/` | Reused source clips; working renders |
| `character/` | `design/CHARACTER_SPEC.md`, then reference, layered rig PNGs and animation data |
| `audio/voice/` | `VOICE_SCRIPT.md`; the human recording goes here as `character_voice.wav` (or `.aif`) |
| `audio/music/`, `audio/sfx/`, `audio/ambience/` | Final sound, per `SOUND_DESIGN.md` |
| `graphics/` | Map, typography and transition assets that are files rather than code |

Media files (video, WAV/AIFF/MP3) are git-ignored: keep the originals backed up outside the repo.

## Commands

```sh
npm run reel:sync       # copy reel media into video/public/reel/ and make the stand-in plates
npm run reel:studio     # Remotion Studio on :4478, composition Reel/AtlasReel
npm run reel:tests      # phase-1 tests (S03–S05) → exports/reel/atlas_reel_tests_vNN.mp4
npm run reel:preview    # whole reel at 540×960 → exports/reel/atlas_reel_preview_vNN.mp4
npm run reel:still -- 7 12.9 15     # single frames → exports/reel/stills/
npm run reel:qc -- <file>           # 9:16 check, duration, black spans, single-frame flashes
npm run reel:shotlist   # regenerate documentation/SHOT_LIST.md from edit/shotlist.json
```

Add `-- --guides` to any render to draw the Instagram safe zone. Renders never overwrite: each one gets the next
version number. The original 97 s film is preserved at `exports/reel/atlas_original_preview_720p.mp4` and in git
(commit `ca37f3b` on branch `reel-60`).

## Dropping in new material

- **A Flow clip:** save it to `video/flow/<flowFile>` and run `npm run reel:sync`. The shot uses it instead of
  its stand-in, and the stand-in tag disappears. Then set the shot's `status` to `approved` in `shotlist.json`.
- **The voice:** save `audio/voice/character_voice.wav` and sync. Then re-time `voice[].in/out` in
  `shotlist.json` to the recording and move the shots to fit it. Never stretch the voice.
- **Character art:** layered PNGs per pose into `character/rig/<pose>/` (see CHARACTER_SPEC.md, pipeline).

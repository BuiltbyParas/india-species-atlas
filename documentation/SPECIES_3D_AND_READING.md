# Species section: the static-image fix, the shorter reading, the 3D slot (19 Oct 2026)

Homepage `#field-studies` (`FieldStudiesIndex.tsx`), the five field studies. Protected files `src/world/field/stage.ts`
and `src/components/field/useFieldStage.ts` are unchanged (sha256 `32cd817f…fcd25e` and `d78d47f5…60d4`).

## 1. The static image during the encounters

**What the reader saw.** While scrolling the encounters, the drawn world vanished and a still photograph of the species
faded in over the stage (most often the snow leopard, then the bustard, rhino and tiger). It stayed until the stage
recovered a minute later, and after two recoveries it stayed for good.

**Cause, as measured** (`scripts/audit/species-flash.mjs`, 1440×900, this laptop). The photograph is the deliberate no-WebGL
fallback, `FlatGround` (`status !== 'ready'`). Nothing was wrong with WebGL, the media or the image layer. The fallback
came on because the stage's `FrameGovernor` (`world/quality.ts`) ruled the device "too slow"
(`failReason: 'too-slow'`). That puts the layer `off` and the status to `flat`. The frames it judged were slow because
of the page's own work at the hand-overs, not the world:

- each phase, beat or study change re-rendered the whole index, all five articles included (React tasks of 60–80 ms);
- each environment change (`<html data-env>`) restyled the whole document. That was a 95 ms forced style recalc of
  4,490 elements inside `environment.ts` `check()`;
- at the section's exit, Chapter 03 builds its canvases while the field stage is still on screen.

A 700 ms window held only 9 frames (`r1 0.56 9f 701ms`). Two such windows on the last rung abandoned the stage. Before
the fix: 3 abandons, 401 frames with the photograph over the stage, in 2 down/up rounds.

**Fix.**
- `StudyReading` and `Composition` are memoised, with stable callbacks, so the scroll's beats re-render only what changed.
- `excuseFrames(ms)` in `world/quality.ts` lets the page tell every governor that the next few frames are its own work.
  It is used for an environment restyle (400 ms), a study, phase or movement change (700 ms) and the section's exit
  (1,200 ms). It is capped at 1.2 s per excuse. The stage already leaves its own dissolves unjudged on the same reasoning.
- The fallback is untouched. Under sustained slowness (CPU throttled ×20, no scrolling) the stage still gives up and the
  photograph stands in (`scripts/audit/species-slowfallback.mjs`). Without WebGL the photograph shows throughout
  (`read-walk` with `NOGL=1`: `stage: flat` at all 38 stops).

**After:** 0 abandons and 0 frames with the photograph over a working stage, at 1440×900 (3 rounds), 1920×1080 (2) and
390×844 (1).

## 2. The reading: three movements, not six screens

The six beats are kept, and each keeps its small label. They are read in three movements (`content/speciesReading.ts`
`SECTIONS`):

| Movement | Beats | Layout (desktop) |
|---|---|---|
| Encounter | encounter | name, scientific name and place beside the animal-in-its-ground text |
| Discover | adaptation, field note | side by side; the field note keeps its figure, scope, surveyed, method, caveat and source |
| Protect | threat, conservation, reflection | threat beside the conservation actions and the Red List, history and programmes; the reflection under the threat, the full record (expandable) beside it; the bridge last |

Below 1100 px the movements fall to one column, in reading order. Every claim, source link, caveat, assessment date and
programme is still on the page. "The full record" holds the record's long description, protected areas, all sources,
what the atlas does not hold, the verification date and the photograph credit.

Other changes:
- the arrival is 0.8 screens (0.6 more for the first study, which arrives through the survey plate's dissolve);
- movements are 8–14 svh apart, where beats used to be 20–38 svh apart;
- an article is visible only while its study is being read. It rises as the composition steps back and steps out of
  the next study's way, so the big name and the article never overlap;
- the list shows the three movements, and each is a link. "Skip the field studies" is unchanged.

| Viewport | Before | After |
|---|---|---|
| 1440×900 | 32.4 screens (29,158 px) | 17.2 screens (15,458 px) |
| 1920×1080 | 30.9 screens | 15.2 screens |
| 390×844 | 36.3 screens | 25.6 screens |
| 1440×900, reduced motion | — | 16.6 screens |

The section's height includes the one screen it shares with the survey plate above it.

## 3. Three-dimensional animals

**None ship.** See `content/models.ts` for the search record. In short:

- no model exists of the Great Indian Bustard or the Ganges river dolphin;
- the only free tiger model is a cartoon;
- the rhinoceros model is untextured low-poly;
- the two plausible snow leopard models (Chenzoss, CC BY 4.0; NHM Wien specimen scan, CC BY-NC 4.0) can only be
  downloaded with a Sketchfab login. The anonymous download API returns 401.

**The slot is built and was verified with a stand-in.**
- `world/field/gl/modelSubject.ts` adds `subjectFor` and `modelFor`. All five worlds ask for a model first.
- The model is built only when its world is built (one world per idle moment, nearest first, in the one WebGL context)
  and disposed with that world.
- It is lit like the cut-out: the world's sky and sun, the world's sun grid read clear of the model's own footprint, a
  wrapped diffuse, a rim, the world's air.
- It loops a clip only if the file has one that matches `clip`, and the clip is frozen under reduced motion.
- If the model fails to load, the photograph stands in.
- GLTFLoader and the meshopt decoder are separate lazy chunks (44 kB and 22 kB), fetched only when a model is registered.

The stand-in was the Khronos Fox, registered temporarily for the tiger and snow leopard and then removed. Checks with it:
it rendered in the forest; its bones moved, and were still under reduced motion; a missing URL logged a warning and kept
the photograph. Each real model will need its own `scale`, `yaw` and light check.

To install a model: download it with your own account, confirm the species and the licence, then run
`npx gltfpack -i in.glb -o model.glb -cc -tc -si 0.5`. Put the result in `src/assets/models/`, import it as `?url` and
add an entry to `SPECIES_MODELS`. Credit it where the photograph is credited.

## Checks

- `scripts/audit/species-flash.mjs`: the static-image repro.
- `species-height.mjs`: heights per study and movement.
- `species-shot.mjs`: a screenshot of each movement.
- `species-slowfallback.mjs`: the fallback under sustained slowness.
- `read-walk.mjs` and `read-nav.mjs`: updated for the three movements.

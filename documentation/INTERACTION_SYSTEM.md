# Interaction system

*Branch `atlas/experience-system`, cut from `atlas/living-interface` (ed207fe). October 2026.*

This is the map of how the Atlas moves, responds and changes atmosphere: what each system is for, where it lives, and the rules that keep it fast, accessible and honest. It supersedes nothing. `INTERACTION_ENGINE.md` (the engine's first build), `SPATIAL_WORLD_ARCHITECTURE.md` (journeys between pages) and `LIVING_INTERFACE.md` (the hero lying flat into the atlas) still describe their parts in detail. This document is the one place that shows how the parts fit together, and it covers what this phase added:

- one quality tier;
- one scroll signal;
- the cursor's vocabulary;
- environments;
- the media stage;
- the film entry;
- the shared particle and shader modules.

Master 02 (the five field studies) should build only on what is listed here.

---

## 0. Principles

1. **One language, not a set of effects.** Every response is one of a handful of springs, one pointer, one scroll signal and one line (GeoLine). A new component opts in with an attribute; it does not bring its own physics.
2. **The technology stays invisible.** An effect exists only if it says something about place, data or action. The test is "why does this exist?" (§16).
3. **Stillness is the default.** Nothing runs while nothing is being touched. The interaction loop, the scenes and the scroll observers all go idle by themselves.
4. **Honesty.** Photographs are real and credited. The credit travels with the photograph even into the cinema. Schematics are labelled. Environments are grounds and light, never invented terrain.
5. **Every path works without the effect.** Touch, keyboard, reduced motion, a weak GPU and no WebGL each get a designed version, not a broken one.

---

## 1. Architecture map

```
src/interaction/                    (the hand, the page, the stream)
  loop.ts            one rAF loop for everything that is not WebGL; idles when settled
  spring.ts          the one spring + named tunings; damp()/perFrame() for time-based smoothing
  pointer.ts         one pointermove listener: position, type, velocity, target
  scroll.ts   NEW    one scroll listener: y, direction; every scroll reader subscribes
  velocity.ts        scroll speed as a spring-smoothed 0→1 (subscribes to scroll.ts)
  state.ts           data-ix: hover / press / release on every control; touch marks
  targets.ts         what counts as interactive
  intent.ts   NEW    the cursor's vocabulary: discover enter trace locate turn define drag play
  magnetic.ts        data-magnetic
  depth.ts           data-depth (--dx --dy --dh)
  parallax.ts        useParallax(ref, depth)
  trail.ts           the ink trail that snaps to the atlas's lines
  geoThread.ts       the measured thread between places (data-geo)
  morph.ts           lines that change shape (LineTitle)
  ink.ts             ink-bleed on a print's edges
  photoContours.ts   luminance contours of a print
  media.ts    NEW    open a photograph or the film: store, FLIP maths, origin box
  events.ts          the interaction stream (+ environment:change, media:open/close)
  RouteTransition    page turns and journeys
  InteractionProvider installs state, magnetic, depth, environments, quality tier

src/world/                          (space, scenes, atmosphere)
  quality.ts  NEW    device tier, pixel ratio, particle budget, FrameGovernor
  environment.ts NEW the atmosphere the reader stands in (data-env)
  gl/particles.ts NEW sparse point clouds (moved out of heroScene)
  gl/chunks.ts NEW   GLSL: hash, noise, grain, ink edge, fresnel
  sceneRegistry.ts   pause/resume every WebGL scene (now also while media is open)
  geoCamera.ts       the 2D geographic camera (van Wijk zoom)
  journeys.ts, WorldJourney.tsx  descend / travel / ascend between pages
  worldState.ts      the world's state store

src/components/cinema/
  CustomCursor.tsx   the instrument (now writes data-intent, follows the environment)
  MediaStage.tsx NEW the cinema: FLIP open/close, film controls, focus, Esc
  FilmEntry.tsx  NEW the print that opens the film
src/content/film.ts NEW  the film's sources, poster, captions, running time
public/media/       NEW  720p AV1 + H.264 web copies of the 69 s promo, poster, captions
```

**Ownership rules.**

- One listener per input: `pointer.ts` for the hand and `scroll.ts` for the page. `addEventListener('scroll')` now appears exactly once in `src/` (it was nine).
- One frame loop for DOM motion (`loop.ts`). WebGL scenes keep their own render-on-demand loops, and the registry decides whether they may render.
- React never re-renders per frame. Springs write styles or CSS variables straight onto the element they move, and React hears about a change only at a state boundary (a phase, a chapter, an environment).

---

## 2. Pointer

`pointer.ts` keeps `{x, y, nx, ny, type, down, inside, target}` and a velocity that decays on its own. Readers either subscribe (`onPointerMove`, `onPointerExit`) or poll (`pointerVelocity()`).

**This phase:** the hero relief no longer adds its own `pointermove` and `pointerleave` listeners. It subscribes to the shared tracker and tests whether the target is inside its stage (`HeroScrollScene.tsx`).

## 3. Cursor: the instrument

`CustomCursor.tsx` is a dot that tracks the hand exactly and a hairline reticle on the `cursor` spring. The reticle stretches along its own velocity and compresses on press. Its states are:

| state | when |
|---|---|
| idle | nothing under the hand |
| hover | anything interactive |
| label | an element that names its action (`data-cursor="Enter"`): filled, carries the word |
| lock | a magnetic control: the reticle closes on the control as four corner marks |
| area | a region that names what the hand can do (`data-cursor-area="Turn"`) |
| trace | the ink trail has found one of the atlas's lines |
| text | a text field: the reticle steps aside for the caret |

### Intents (new)

The word is for reading. Its **intent** (`interaction/intent.ts`) decides the reticle's shape, written as `data-intent`:

| intent | words | reticle |
|---|---|---|
| discover | Discover, Explore | the open reticle |
| enter | Enter, Open, Return, Compare, Close | filled, carries the word |
| trace | Trace, Follow | the environment's line colour |
| locate | Locate | the ticks run in to a crosshair (taking a fix) |
| turn | Turn | a dashed ring |
| define | Define | a squared frame |
| drag | Drag | horizontal ticks only |
| play | Play, Pause | filled, with a hairline inner ring |

Add a word to `WORDS` before using it in markup. Unknown words fall back to `discover`.

Where the intents are now used:

- the hero relief is a `Locate` surface, matched to the survey probe that reads coordinates;
- the atlas markers are `Locate`;
- the sphere and the gallery are `Turn`;
- the film is `Play`, and its scrub line is `Drag`.

### Touch and reduced motion

Neither is mounted for touch or reduced motion: the system cursor stays. On touch, a press leaves a small survey mark (`state.ts`). Nothing usable depends on the cursor.

## 4. Magnetic

`data-magnetic="0.3"` pulls a control towards the pointer on the `magnetic` spring, follows the hand, holds on for 22 px past the control's edge and settles home. A child marked `data-magnetic-inner` travels 45 % further, which gives the pull depth. The pull is capped by the control's size. It is mouse and pen only, never with reduced motion. While a control is engaged, the cursor locks onto it.

**This phase:** the final chapter's "Open the map" label is now `data-magnetic-inner`, so the label leads its line.

## 5. Spring and physics

`spring.ts`: damped harmonic motion in fixed 1/240 s sub-steps, stable at any frame rate. The named tunings are:

- `cursor`
- `release` (one small overshoot)
- `magnetic`
- `depth`
- `parallax`
- `line`

Damping is near or above critical, so the atlas settles rather than bounces.

**New: `damp(current, target, lambda, dt)` and `perFrame(k)`.** All three WebGL scenes smoothed their camera with `x += (t - x) * k` per frame. That is twice as fast on a 120 Hz screen as on a 60 Hz one. They now smooth by elapsed time, and `perFrame(k)` converts the old 60 Hz tuning exactly, so the feel at 60 Hz is unchanged:

- hero pose, probe and key light;
- gallery ring, pointer and scroll;
- conservation camera and markers.

## 6. Hover depth

`data-depth` gives the element `--dx --dy` (−0.5 → 0.5) and `--dh` (0 → 1) on the `depth` spring. The element itself never moves. CSS decides what responds, and **the response depends on the object**:

| object | response |
|---|---|
| species print (`.photo-frame`) | the photograph drifts inside its frame, a light crosses it, crop marks close in |
| species card | two or three degrees of turn |
| film print (`.film-entry-frame`) | at most 3° of perspective turn, the still drifts and brightens, crop marks close in, the route line beneath runs out |
| CTA | no depth: magnetic only |
| map marker | no depth: kin ping (§10) |

## 7. Pointer parallax

`useParallax(ref, depth)` moves a layer up to `depth` px at the screen's edge, on the slow `parallax` spring. Only layers on screen are written. Single-digit pixels. Guide values are background ±3, image ±5, foreground ±8 and text 0–2. Never on text the reader is reading.

## 8. Scroll as an input

**New: `scroll.ts`, one signal.** A single passive listener reads `scrollY` once per event and hands every subscriber `{y, direction, t}`. The subscribers are:

- `velocity.ts`, magnetic, the cursor's re-check;
- the navbar, chapters, the hero and the gallery;
- GeoProgress and DataGeography;
- environments.

Subscribers must stay cheap: they set a target and let a spring or a frame task do the work.

- **Velocity** (`velocity.ts`): a spring-smoothed 0 → 1. The hero camera widens its lens with it. Prints lag inside their frames. Curved loops speed up. It is never written to `:root`.
- **Scrubbed scenes**: GSAP ScrollTrigger, enabled only while the home page holds it (`holdScrollTrigger`). Working pages run no rAF at rest (measured: 0 callbacks in 2 s on `/atlas`).
- **Lenis**: on the documentary page only. It sets the window's scroll, so it arrives through the same signal.
- **Locking** (`lockScroll`) is now **counted**. The loader, the menu, the species sheet and the film each take a lock and give it back, so one closing cannot release the page while another is still over it. Before, the menu closing while the film opened would have unlocked the page under the film.

## 9. Typography

The faces are Newsreader (editorial serif, light weights, display sizes) and Geist (metadata, labels, numbers in tabular figures). The behaviours already built and reused are:

- `RevealText` (masked line and word reveals);
- `LineTitle` (contour typography on page titles);
- `CurvedLoop` (type along a path);
- `.gl-label` (type set along a GeoLine);
- the chapter running head.

Rules:

- Most text is still. One orchestrated reveal per section at most.
- Metadata arrives after its visual: the film's title and controls fade in only once the picture has landed.
- Small capitals with tracking only where a printed map key would use them (eyebrows, legends).

## 10. GeoLine: the signature line

`geo/line/GeoLine.tsx` has five roles: `survey`, `thread`, `route`, `protect` and `schematic`. Its draw is a CSS variable `--draw` (0 → 1), it can carry a nib, and it can set a label along itself. One line becomes everything:

| as | where |
|---|---|
| line → map | the hero relief, the final chapter's converging threads |
| route | GeoProgress, the reader's path |
| contour | LineTitle, photo contours |
| range / data | species threads on the atlas (`Polyline`, same colours) |
| **UI connection** (new) | the film entry's route line runs out on hover |
| **progress** (new) | the film's progress *is* a `route` GeoLine drawn by `currentTime / duration`; a range input lies over it for the keyboard, touch and dragging |
| camera path / transition | the journeys between pages (`world/journeys.ts`) |

**Marker → geography (new).** Hovering an atlas marker makes its species' other localities step forward (existing behaviour). Each now also sends one survey ring, delayed in proportion to its distance from the marker under the hand (`--kin-delay`, at most 520 ms). The highlight travels across the country, so it reads as geography, not as a list. With reduced motion there is no ring.

## 11. Images

The rule is the cheapest technique that achieves the result. Today every image effect is CSS or DOM, with no WebGL for photographs:

- **depth**: `data-depth`;
- **scroll lag**: velocity;
- **reveal**: the shutter (a ruled line opens into the print);
- **ink bleed**: `ink.ts`;
- **print contours**: luminance, labelled.

**Photograph → cinema (new).** `Photo` takes `expand`. The whole print becomes one button ("View the photograph of the … full screen"), which opens the media stage from the print's exact on-screen box. That is the letterboxed picture, not its frame, even under `object-fit: contain` (`boxOf`). The credit is shown under the enlarged photograph, because it must travel with the picture. It is enabled on the species page's print.

## 12. Transitions and the media stage

`interaction/media.ts` and `components/cinema/MediaStage.tsx`.

`openMedia(request, origin, trigger?)` opens a `film` or an `image`. Then:

1. The picture is laid out at its full-screen size (`fit`). It starts from the origin's rectangle with a transform and a crop (`flipFrom`). Both animate to identity over 900 ms on `atlas.cinema`, so a print shown as a tall crop *unfolds* rather than jumping. One element moves; everything else only fades.
2. While it is open:
   - the page's scroll is held (a counted lock);
   - every WebGL scene pauses (the registry hears `media:open`);
   - the environment is `cinema`;
   - the origin is hidden in place, so the picture has lifted out of the page;
   - focus moves to Play/Pause (the film, so Space pauses) or to Close (a photograph), and is trapped;
   - a close during the opening move takes over at once, and the film stops before it shrinks.
3. Esc, Close or a click on the dark returns it. The origin's rectangle is measured again, the picture shrinks back into it at the same scroll position, and focus returns to the trigger.
4. When opened from a word with no picture (the menu's "Play the film · 1:09"), the frame simply comes forward and goes back, and focus returns to the menu button.
5. With reduced motion there is no move: the picture is simply there and simply gone. The dark still fades.

Spatial page-to-page transitions remain `RouteTransition` and the journeys (`SPATIAL_WORLD_ARCHITECTURE.md`). Master 02 should use `openMedia` and the journeys rather than adding new transition code.

## 13. The documentary film

The finished 69 s promo, "Lines on the Map", is unchanged. It is served as a web copy:

| file | encode | size |
|---|---|---|
| `lines-on-the-map-720.av1.mp4` | AV1 + Opus, 1280 × 720, 30 fps | 5.8 MB |
| `lines-on-the-map-720.h264.mp4` | H.264 + AAC (the fallback) | 12.7 MB |
| `lines-on-the-map-poster.webp` | the opening relief frame | 20 kB |
| `lines-on-the-map.en.vtt` | the film's subtitles, as captions placed above the controls | — |

The video downloads only when the film is opened. The poster is lazy.

**Entry:** `FilmEntry` in the final chapter (a print, not a player), and "Play the film · 1:09" in the menu. Hover turns the print to the light and runs out the route line. The cursor says Play. Press opens the cinema.

**Controls** are the atlas's own: Play/Pause, the route-line progress (draggable, keyboard-scrubbable), the time, Sound on/off and Close (Esc). Space toggles play, the arrows seek ±5 s, and captions are on by default. If sound is refused (no gesture reached the player), it plays muted rather than not at all.

## 14. Environments

`world/environment.ts` and the `[data-env]` tokens in `index.css`.

| env | line (on the night ground) | ground / ink (for a field study that adopts them) |
|---|---|---|
| calibration | graphite | warm paper / ink |
| atlas | contour | night / canvas (the default) |
| thar | sand-copper | sand / deep earth |
| himalaya | ice | snow / slate |
| river | river blue | deep blue / paper |
| forest | moss | forest / pale |
| data | graphite | paper / ink |
| cinema | ivory | near-black / ivory |
| final | contour | night / canvas |

A section declares `data-env`. Whichever declared section crosses the middle of the viewport is the environment. It is checked from the scroll signal at most every 120 ms; ten rectangle reads, never per frame. An IntersectionObserver on a hairline root was tried first and lagged seconds behind through the pinned scenes. The environment is written once to `<html data-env>` and announced as `environment:change`. Overlays hold one (`holdEnvironment('cinema')`).

What it drives today:

- the instrument's reticle, label, trace and splash colour;
- the ink trail's snap colour and the place-to-place thread;
- the cinema's ground and progress line.

The documentary's sections are declared: Thar, then each featured species' ground, the selection as `data`, protection as `forest`, and the end as `final`. **The page grounds themselves are not repainted yet**: whether the hero turns light, and the grounds per section, are open decisions in `HOMEPAGE_CREATIVE_DECONSTRUCTION.md` §16. The tokens (`--env-ground`, `--env-ink`) are ready for that.

Rule: never transition a token on `:root`. Elements transition their own colour.

## 15. Three.js foundation

- **One quality tier** (`world/quality.ts`), new. It is `high`, `balanced` or `low`, read once from the device:
  - `low`: ≤ 2 GB or ≤ 2 cores;
  - `balanced`: a coarse pointer, ≤ 4 GB or ≤ 4 cores.

  It is lowered for the session whenever any scene has to step down. It sets:
  - the pixel-ratio ceiling (2 / 1.25 / 1, and each scene keeps its own ceiling: the hero 1.5);
  - the particle budget (100 / 60 / 30 %);
  - where a scene's ladder starts.

  It is written to `<html data-quality>`. `?quality=low|balanced|high` forces it for the tab.
- **One frame governor** (`FrameGovernor`), new. It measures the share of slow frames in short windows, walks a scene down its own ladder of rungs, then asks for the flat fallback. It replaces three copies of the same code:
  - hero: 2 rungs (no depth of field and halos, then no motes; 0.85 → 0.62 DPR);
  - gallery: 1 rung;
  - conservation: 1 rung.
- **Lifecycle** (`sceneRegistry.ts`). Each scene renders on demand and is paused:
  - off-screen;
  - in a hidden tab;
  - during a journey;
  - **while media is open** (new).

  Scenes are built lazily by their page and disposed with it. No two scenes render at once on any page.
- **Why not one shared renderer:** a reader who never opens the gallery should never pay for it, and a world-sized scene would hold every texture all the time. The scenes share lifecycle, quality and modules instead. Revisit this when Master 02's field studies need a scene to persist across sections, and give those studies **one** renderer between them, not five.
- **Camera.** The hero's camera is the documentary camera: spherical pose by scroll progress, pointer parallax that falls off as it descends, lens widening with momentum, then a hand-off to the flat sheet. It is now damped by time (§5). `world/geoCamera.ts` is the 2D geographic camera used for journeys. Master 02 should lift the hero's pose maths into a `CameraRig` (position, target, fov springs, pointer and scroll influence, named shots) when it builds the second 3D camera, not before. One user is not a pattern.

## 16. Shaders and particles

- `world/gl/particles.ts`: `makePointCloud` (soft additive sprites, per-point size and alpha, one draw call), `seededRandom` and `particleBudget`. The hero's stars, motes and dust and snow use it.
- `world/gl/chunks.ts`: GLSL as strings, concatenated by a scene:
  - `hash12`;
  - `valueNoise` and `fbm3`;
  - `paperGrain` (static, never animated);
  - `inkEdge` (a reveal that runs like ink along a field);
  - `fresnel`.

  All are pure arithmetic, with no texture reads.
- **Excluded on purpose:** RGB split, chromatic aberration, glow blobs, lens flare, hologram and HUD looks, liquid blobs. A shader is added only when a field study needs it, and only from these chunks.

## 17. Microinteraction states

| state | mechanism | look |
|---|---|---|
| rest | — | — |
| hover | `data-ix="hover"`, cursor `hover`/`label`/`lock` | per object (§6) |
| active | `data-ix="press"` → `release` | compress, one small rebound; splash rings on the cursor; a survey mark on touch |
| focus | `:focus-visible` | 1 px outline in the environment's line colour, 4 px offset |
| disabled | `disabled` / `aria-disabled` | no magnet, no cursor label |

## 18. Performance strategy

- **Idle is free.** The interaction loop stops when every spring settles. ScrollTrigger is enabled only on the home page. Scenes render on demand. The environment check runs only after scroll, at most every 120 ms.
- **Never per frame:** writes to `:root`, writes to big SVG subtrees, hit tests or line sampling while scrolling (the cursor re-checks every 140 ms), React state.
- **The film** is fetched only when opened. AV1 is 5.8 MB for 69 s. The page cost of the entry is one 20 kB poster.
- **No new canvases.** The media stage is DOM. The film entry is an `<img>`.
- **Bundle:** everything the home page loads eagerly grew by 7 kB gzipped against `ed207fe` (237 kB against 230 kB, JS and CSS). The media stage itself is a lazy 2.8 kB chunk, prefetched when the hand reaches a film entry. three.js stays in its own lazy chunk.
- **Measured** (production builds served side by side, interleaved, 1440 × 900, AMD Radeon through ANGLE/GL; 90 wheel steps through the hero descent; machine load about 3.9, not fully idle):

  | build | frames | > 33 ms | p50 | p95 |
  |---|---|---|---|---|
  | `ed207fe` run 1 / 2 | 492 / 495 | 24 / 15 | 16.7 | 16.8 |
  | this branch run 1 / 2 | 494 / 506 | 16 / 21 | 16.7 | 16.8 |

  This is equal within run-to-run noise. Idle `/atlas` ran 0 rAF callbacks in 2 s. While the film is open, the hero scene reports inactive.

## 19. Reduced motion

The page still lands composed:

- no custom cursor, no magnetic pull, no depth tilt, no parallax;
- no Lenis, and the hero is the flat composition;
- the film and photographs open and close instantly, while the dark still fades;
- the film entry's line is simply drawn;
- the marker ping is off;
- environments still change (they are colour, not motion).

## 20. Responsive behaviour

- **Desktop:** the cursor, magnetic pull, depth and pointer parallax. The hero probe follows the hand.
- **Touch:**
  - the system cursor, with survey marks on press;
  - a tap sets the hero probe down for 2.2 s;
  - the film opens from a tap on the print and fills the width, letterboxed, with 44 px targets;
  - the time readout is hidden under 640 px;
  - particle budgets drop with the tier.
- Gyroscope: not used. Nothing in the story needs it.

## 21. Accessibility rules

- Every new control is a real `<button>` or `<input>` with a name: "Play the film, Lines on the Map, 1:09", "View the photograph of the … full screen" and "Position in the film".
- The cinema is a modal dialog: `aria-modal`, focus trapped, Esc to close, focus returned to the trigger (or to the menu button when opened from the menu).
- Captions are on by default.
- WebGL is never the only way to information: the hero has its flat fallback, the gallery and conservation scenes have flat equivalents, and the probe's readings are decorative (`aria-hidden`) over data that is in the page.
- The focus outline uses the environment's line colour, which reads on every ground listed above.

## 22. The lamp (12 October 2026)

The hero's pointer response, rebuilt for the regional relief (`LUSION_LEVEL_PASS.md`, `RENDERING_ARCHITECTURE.md` §5).
Everything above still holds; this section is what changed.

**What it is.** Moving a fine pointer over the hero swings the scene's one light — a low lamp — over the relief. The
mountains' shadows are cast (a heightfield shadow on the elevation grid), so they swing with it: the hand reads the
ground by light, the way a hill-shader sets a lamp over a model. The survey probe (coordinates, height, or the sea
floor's depth; snap to a lit locality within 34 px) is unchanged and runs alongside.

**Mapping.** Pointer x (−1 → 1) → azimuth 295° ± 46°, across the north only (light from the camera's side flattens the
ground). Pointer y (−1 top → 1 bottom) → elevation 12° ± 8° (the hand up the frame, towards the horizon, lowers the
lamp). Reach falls to 25 % by halfway down the descent, where the lamp settles into the west at 17°.

**Physics.** Two `Spring`s (azimuth, elevation) on the shared model (`interaction/spring.ts`), tuning `SPRINGS.lamp`:
stiffness 42, damping 10.1, mass 1 (ω ≈ 6.5 rad/s, ζ ≈ 0.78 — about 2 % overshoot, settled in ~0.5 s), fixed 1/240 s
sub-steps, rest within 0.0004 rad. Their targets are the pointer value the scene has already damped
(`POSE_LAMBDA`), so a flick is smoothed twice: once as intent, once as weight.

**Entrance.** First visit only: the lamp starts 2.5° below the horizon and 16° south of its rest, and rises over
3.6 s (`EMERGE_MS`) while the camera tilts from plan view to the three-quarter view. Summits catch it first.

**Touch, keyboard, reduced motion.** Touch: a tap (not a scroll) sets the probe down for 2.2 s, as before, and now
also swings the lamp towards the tap for that time, then back; nothing follows the finger while it scrolls.
Keyboard: the hero's controls are the two links (scroll cue, working map), unchanged. Reduced motion: no scene, the
flat shaded relief. The margin note says "Move to turn the light · point at the ground to read it" only where the
pointer is fine (`.hero-hint`).

**Failure.** If the lamp pass cannot be built (no regional grid), the scene uses the India-only relief with the
probe's old behaviour (the key turns a little towards the probe).

## 23. The field studies' light, by hand (12 October 2026)

Until now only a mouse turned a field study's sun (the stage read the pointer; touch and keyboard had nothing). Every
visitor can now turn it, through one value on the stage. Record: `FIELD_STUDIES_POLISH.md`.

**One value, one spring.** `FieldStage.setLight(x)` (−1 → 1) sets the hand's aim; the stage steps it on the homepage
lamp's spring (`SPRINGS.lamp`, `interaction/spring.ts`) and passes the worlds `input.light` = the smoothed mouse +
that aim, clamped. Each world turns its sun by `input.light` and its camera by `input.pointer` (mouse only), so a
finger or a key turns the light without swinging the view. Nothing per habitat: the five worlds changed one line each
(`setSun(AZ + i.light.x * …)`). With reduced motion the aim is set at once (no swing) and the stage renders that one
frame and stops, as before.

**The control** (`components/field/FieldLight.tsx`, in the study's furniture over the anchor's coordinates; on a
phone it takes the coordinates' place over the way out): a real `<input type="range">` drawn as a short line with
the sun on it, labelled "Light". Keyboard: Tab to it, arrows / Home / End turn the sun; it has the field's focus
outline; its name is "Turn the sun over the forest" (or the study's habitat) and its value text says where the sun
is ("The sun turned left"). It is shown only when the world is drawn (`status === 'ready'`), not over the photograph
fallback. A new study starts with its sun at its own hour.

**Touch.** A sideways drag anywhere on the study turns the light: about two-thirds of the screen's width moves it
from one end of its reach to the other. The gesture is decided once, after 10 px: more sideways than upright (1.3 : 1)
turns the light, anything else is left to the page. The study sets `touch-action: pan-y pinch-zoom`, so the browser
keeps vertical scrolling and pinch-zoom and hands the sideways part of a touch to the page; there is no horizontal
scrolling in a study to lose. A touch that starts on a control (link, button, input, the footage) is ignored. No tap
action: a tap that stops a fling must not swing the sun. Listeners: one `pointerdown` on the study; `pointermove`,
`pointerup` and `pointercancel` on the window only while a touch is down, removed when it ends and on unmount
(checked: no growth across study changes, `scripts/audit/field-polish-touch.mjs`).

**Discoverable, not furniture.** On a screen without hover the label is replaced for a few seconds, once a session,
by "Drag sideways to turn the light", on the control's own row (so it never prints over the study's type); the first
turn dismisses it. Mouse behaviour is unchanged.

**Not checked:** a real phone or tablet. The gesture was exercised with Chromium's touch emulation (CDP touch
events) only; iOS Safari's handling of `touch-action: pan-y pinch-zoom` was not tested on a device.

## 24. Hand-overs without a jump in the light (12 October 2026)

Record: `WHOLE_EXPERIENCE_REVIEW.md` §6.2. Going into a study, on to the next or back to the index, the stage lifts its
world over the page (`stage.hold`) through the route change, and every page layer that shaded the world — scrims, veils,
the furniture's foot — is then under it. Lifted or handed back at once, the light jumped by up to 57 grey levels in a frame.

- **Before the lift**, the page clears: the index's scrim fades during the camera's move (`.fs-index.is-leaving`); a study's
  words, scrim and furniture fade for 0.45 s first (`fieldNav.ts` `clearPage`, `.fs-study.is-leaving`). Reduced motion: no wait.
- **After the hand-back**, the page arrives: a study entered through its world keeps its title, first chapter, scrim and
  furniture back until the stage is released (`FieldStudyPage.tsx` `held` → `is-arrived`); the index back from a study keeps
  its composition, list and scrim back the same way (`FieldStudiesIndex.tsx` `held`). Darkening layers ease in on
  `--ease-cinema` over 1.2 s (an expo-out start reads as a pop).
- **While held**, a study does not follow the scroll (still the previous page's until the route settles); it measures again
  when the world is handed back. `FieldStage.show()` drops a request superseded while its world was being built, so the
  index passing study 01 on its way back cannot leave the wrong world under its words.

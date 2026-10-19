# Home page: Fragments and the working map (18 Oct 2026)

Chapter 01 ("The map") used to end on the regions loop and go straight to Chapter 02. The home page had no
interactive map. It never had one on any branch: the descent only linked out ("Or open the working map") to
`/atlas`, where `AtlasMap` itself was intact (52 markers, popups, profile, zoom/pan, attribution). Chapter 01 now
ends in two parts.

## 1. Fragments: `src/components/cinema/RegionFragments.tsx`

The sheet comes apart along the atlas' eight regions (`data/regions.ts`) and they pass sideways as the page scrolls.
Then the sheet is whole again.

- **Pieces.** Each fragment is cut along the region's key states, which are real boundaries from the one state file.
  It is not cut along the region's coarse outline. The cut is filled with the same ETOPO 2022 shaded relief as the
  opening (`useShadedRelief`), edged in contour colour and lifted off the faint country (a drop shadow, painted once).
- **Marks.** The marks are the recorded localities of the region's species that fall inside the cut. No coordinate
  is printed. A fixed note states what is claimed: the regions are groupings, not biogeographic boundaries, and the
  relief is ETOPO 2022 ×20.
- **Motion.** Desktop with motion uses one sticky frame (`overflow: clip`). One GSAP ScrollTrigger scrub moves the
  track; the wheel is never taken over. The run is `--frags-run: 219vw`, about 3.5 screens at 1440×900 and 3.9 at
  1920×1080. Per frame the scrub writes transforms on the track and on the piece, sheet and words of the fragments
  near the frame, and nothing else.
- **Depth.** The piece lifts and scales up as it centres. The country behind it lags and the words lead. The region
  name resolves with `FocusText` (the type pass' focus pattern) as its fragment approaches.
- **Foot.** A ruler fills with the run. It names the fragment in the middle and carries the note.
- **Interaction.** Each fragment lists its species as buttons. Hovering one lights its marks; clicking opens the quick
  profile.
- **Keyboard.** Tab walks the buttons. A focused fragment off the frame is scrolled to the middle (`scrollToTarget`).
  Fragments are never `visibility: hidden`, so the keyboard can reach them.
- **Fallback.** Narrow screens and reduced motion get the same fragments, stacked.
- **Relief timing.** The relief is shaded only once the section is on screen. Shading costs tens of milliseconds on
  the main thread and would otherwise land in the hero descent, whose governor counts slow frames.

## 2. The working map: `src/components/cinema/WorkingMapSection.tsx`

The section is the Atlas page's own `AtlasMap`, from the same lazy chunk, with every species in view.

- **Kept.** Markers and previews, popups, "Enter its world", the quick profile, state selection with `StatePanel`, the
  three modes (`ModeSwitch`), threads, `MapLegend`, zoom, pan, reset, the scale, and the Esri attribution.
- **Loading.** The chunk and its tiles load as the section comes near.
- **Link.** A link goes to `/atlas` for search and filters.
- **New prop.** `AtlasMap` gained one opt-in prop, `wheelZoom="on-request"`. In a scrolling page, the wheel scrolls
  the page until the map is clicked or focused, and the map lets go when the pointer leaves or focus moves on. A wheel
  over the sleeping map shows "Click the map to zoom with the wheel". `/atlas` is unchanged (`always`).
- **Shared view.** The map writes its view into the world state, as on `/atlas`. A journey from a home-page marker
  starts from that framing, and `/atlas` later opens where the reader left it.

## 3. Withheld coordinates (Chapter 03 fix)

`DomeGallery` copied each locality into `{ label, lat, lng }` and dropped `withholdCoordinates`. Its place bands
printed the coordinates of four withheld records: Pokhran, Abdasa/Naliya, Girwa and Son. The flag now travels with
the place, and those bands read "coordinates withheld". No other dome change.

## 4. Hero descent and the "Species" blur

This was measured at 1920×1080 with the GPU on, five descents per build (`scripts/audit/fragmap-descent.mjs`):

| build | parting fps | descent fps | gave up |
|---|---|---|---|
| current | 34–41 | 53–55 | 0/5 |
| no blur on the scaled "Species" | 34–39 | 52–55 | 0/5 |
| without Fragments and map | 36–42 | 52–55 | 0/5 |

The parting runs with about half its frames over 32 ms. That is close to the governor's abandon threshold (0.6 for
two windows at the last rung), which explains an occasional give-up. The blur is not the cause, and neither are the
new sections, so the hero is unchanged.

## Checks

These are in `scripts/audit/` and run against the production build (vite preview).

- `fragmap-states.mjs`: forward/back steps, fling both ways, reversal mid-glide, Tab through fragments, frame timing.
- `fragmap-map.mjs`: 52 markers, attribution, wheel sleeps then wakes, ± zoom, drag, preview, popup, quick profile,
  keyboard Enter, state panel, modes, Enter its world.
- `fragmap-withheld.mjs`: no withheld coordinate printed anywhere on the home page.
- `fragmap-stacked.mjs`: reduced motion and phone.
- `fragmap-walk.mjs`, `fragmap-probe.mjs`, `fragmap-mapnav.mjs`: captures and the `/atlas` navigation probe.

# Visual bible: India Species Atlas reel

**One idea: the line.** A single line travels through India and keeps changing what it is:
LINE → GEOGRAPHY → LANDSCAPE → HUMAN INFRASTRUCTURE → HABITAT → SPECIES → MAP → ATLAS.
Every transition is the line changing role. If a cut isn't the line doing something, it should be a plain cut.

**Three layers, three jobs:**

| Layer | Gives the film | Source |
|---|---|---|
| Flow / real footage | Cinematic realism | `reel/video/flow/`, credited photos |
| The Atlas (map, cards, UI) | Identity and intelligence | the existing Remotion promo components, the real site's screenshots |
| Rekha | Personality | `reel/character/` |

## Colour

All colour comes from the site's palette (`src/theme.ts`), exactly as in the 97 s film.

| Role | Token | Use |
|---|---|---|
| Ground | `forest950` | Every map and card background; the black of the film |
| The line | `canvas` `#e8e1cf` | The travelling line, display type |
| Relief | `contour` (burnt sienna) | Contours, terrain lines |
| Water / protection | `river` (prussian) | Rivers, the conservation layer |
| Status | `STATUS_HEX` CR / EN / VU | **Only** on a species' own marks: chip, states of record, its line. Never decoration. |

**Footage grade** (applied in the edit, the same for every clip). This is the test that matters most: the footage
has to sit next to a `forest950` card without looking like it came from another film.
- Blacks lifted no more than 2 %, then crushed back to the ground colour at the frame edges by the vignette.
- Saturation 0.82–0.88. Greens pulled toward sage; skies desaturated more than land.
- Highlights warm but held below clipping (sunrise shots roll off, no blown sun).
- The same 5 % luma grain over everything, footage, cards and character alike, so they read as one surface.
- Not allowed: teal/orange LUTs, bloom, halation, crushed-to-black contrast, heavy vignettes.

## Typography (the site's, unchanged)

- **Display:** Newsreader Light (300), negative tracking. Species names, INDIA, the wordmark. At 1080 wide, species names are 92–104 px.
- **Labels:** Geist 500, uppercase, tracking 0.24–0.28 em. Numbers (01–05), status, coordinates, region names. 26–30 px minimum on a phone.
- **Captions** (for sound-off viewers): Geist 500, 40 px, sentence case, canvas at 92 %, one line where possible,
  sitting at y ≈ 1340–1440. Most Reels are watched muted.
- Never: bold display type, giant 3D text, more than two type sizes on screen at once, type outside the safe zone.

## Vertical composition (1080 × 1920)

```
 y=0    ┌──────────────────────┐
        │  IG header           │  keep empty: no type
 y=250  ├──────────────────────┤
        │  map / subject zone  │  India sits here in map shots (upper 60 %)
        │                      │
 y=1150 ├──────────────────────┤
        │  type zone           │  number, name, status chip
 y=1340 │  caption band        │
 y=1480 ├──────────────────────┤
        │  IG caption/buttons  │  keep empty: no type
 y=1920 └──────────────────────┘
          x 90 ............ 940   (right 140 px: IG buttons column)
```

- One subject per frame. In species shots the animal sits in the lower-middle third; type sits above or below it, never over it.
- Rekha appears at the edges, partly hidden and smaller than the subject, except in S18, S20 and S21.

## Motion language

- **Easing:** the site's curves (`EASE.cinema` for camera moves, `EASE.outExpo` for type and lines). Nothing linear except the drift at the end of a camera move.
- **Lines draw; they don't fade.** Every line enters by drawing from one end.
- **Camera:** footage gets a 2–4 % push or drift, so no frame is ever static. Maps move physically (dive, ascent) rather than zooming as a flat 2D scale.
- **Rhythm:** slow, fast, slow, fast, epic, silence. Micro shots 0.5–1 s, editorial shots 1.5–2 s, cinematic shots 3–4 s.
- **Not allowed:** glitch, RGB split, neon, HUD brackets, holograms, lens flares, particle storms, swish-pan presets.

## Honesty in pictures

- Maps show only what the data holds: **states of record**, not range polygons. Lines that join localities are a
  drawing device, never labelled "range" or "corridor".
- The master-map line in S18 is **the route this film travelled**. It is drawn as the film's own path, not as an ecological connection.
- Generated animals carry a visible disclosure, or are replaced with real or credited imagery (FLOW_PROMPTS.md §E).
- Every photograph shows its credit and licence; generated footage is listed in the credits.

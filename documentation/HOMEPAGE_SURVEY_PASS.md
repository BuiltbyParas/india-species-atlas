# Homepage: the Survey pass (17 Oct 2026)

## Concept

**The Survey.** The visitor reads India's ground three ways: as relief from orbit, as contour lines, and as
places. The relief the page opens on keeps coming back in a new form. The name is taken apart, the ground
becomes its own contours, the five studies are marked on those lines, and the name is put back together at
the end. The 500 m contour (the interval the hero's key already states) is the shared motif.

Emotional arc: anticipation (the name assembles on a lit relief) → descent (the name parts and the camera
goes through it) → reading (the ground drawn as lines, five grounds marked) → discovery (the dive into the
Thar opens the first field study) → pressure and response (threats read one by one, then fifty years of
programmes on a dial) → resolution (the name reassembles on the Tropic of Cancer).

## Signature interactions

1. **The name in the lamp's light** (`CinematicHero`, `HeroScrollScene` `castShadow`). The pointer already
   swings the relief's key light. Now the wordmark is lit by the same lamp: the letters are clear where the
   hand holds the light and fall into shade away from it (`.hero-title-glint`, a background-clip:text
   layer). A blurred shadow of the name is cast on the relief and skews away from the lamp
   (`.hero-title-shadow`, transform only). On touch devices a tap moves both.
2. **The name parts, the camera goes through it** (`applyProgress`). On first visit the three words
   assemble: India from the west, Atlas from the east, and *Species* rising out of focus. As the descent
   starts, India and Atlas accelerate out to the sides of the frame. *Species* grows past the camera and
   fades. The credits drop away first.
3. **Five kinds of ground** (`GroundsPlate.tsx`, a new pinned plate between Chapter 02 and the field
   studies). The ETOPO grid is traced with d3-contour every 500 m. The contours draw in from the lowlands
   up, and the five studies arrive as survey marks at their anchor localities, joined in study order. The
   habitat word is cut in large, with the species, place, anchor (withheld where the record withholds it),
   the ground height there, and the recorded elevation band. The camera then pans back to mark 01 and dives
   into the Thar. The Thar's warm light opens around the mark and hands over to the bustard's world.
4. **Chapter 04 read by the scroll** (`ConservationMap.tsx`). Threats are no longer one column of rows.
   Each threat in turn is set large ("7 of 12 species · Poaching & illegal trade" plus its strip) while
   its species' lines light on the relief. Then a year dial runs from the first programme's start year to
   the last. Each programme's sites and species light cumulatively as its year passes, and its row comes
   up in the index. The lists stay below as the index and the keyboard path. Pointing or selecting still
   wins over the scroll's reading. Rolled readouts are not announced (no `aria-live`); chosen ones are.
5. **The name comes back together** (`FinalChapter`, `--meet`). Over the atlas world, the closing reverses
   the opening: India and Atlas come in from the sides, and *Species* comes down from past the camera onto
   the parallel.

## Motion language

- **Scroll-linked** where something in the world changes: camera, contours, marks, the parting and
  meeting of the name, the year dial. These are always computed from position, so they reverse and
  survive a jump.
- **Time-based cuts** (0.8–1.2 s, `--ease-out-expo`, masked) where a discrete thing changes: a new habitat
  word, a new threat, a new count. These cut in and never cross-fade.
- **Acceleration out, settling in.** Exits are squared (they start slow and leave fast). Arrivals use
  ease-out-expo.
- **Depth** comes from scale and blur on separate planes (the parted words, the shadow, the dive), never
  from parallax on everything.
- **Values go only where they are read.** The descent writes transforms on three words, the closing writes
  `--meet` on one heading, and the plate draws its own canvas. Nothing writes per-frame custom properties
  on large subtrees.
- **Reduced motion.** The flat hero shows the name evenly lit with no glint. The grounds plate is one still
  sheet with all five marks. Chapter 04 is the stacked version. No content is withheld.

## Checks (17 Oct, loaded laptop, headless GPU)

- tsc and build pass. Lint is unchanged at 17 warnings, all pre-existing. data-integrity: 10/10 PASS.
- Route sweep (`GL=gpu`): 100/100. hero-fallback: exit 0.
- Scroll frame rate: hero 54 fps, grounds plate 50, Chapter 04 51.
- Protected files (`src/world/field/stage.ts`, `src/components/field/useFieldStage.ts`) are unchanged
  (sha256 match).

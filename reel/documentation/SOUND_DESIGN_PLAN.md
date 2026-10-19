# Sound design plan

**Status:** plan for approval. Supersedes `SOUND_DESIGN.md`.
**Aim:** sound is one of the main upgrades. The 97 s film's audio is placeholder timing tones under a flat bed.
This cut gets a designed soundtrack with four buses: **music, ambience, SFX and voice**. Each transition has a sound
of its own, and the voice always sits on top.

## 1. Principles

1. **The world is heard as well as seen.** The map has its own sound family: dry, precise, paper-and-graphite
   ticks with low tonal thumps. The footage windows have real environmental sound. Moving from map to window means
   moving from one family to the other.
2. **The line is audible.** Every line that draws has a sound: a soft graphite drag, pitched to the music's key,
   rising as it draws.
3. **Silence is a sound.** There are three deliberate near-silences: the freeze (P18), the fragment hold (P20), and
   the beat before the wordmark (P26). Each gets its weight from what came just before.
4. **Sophisticated, not loud.** No stock "epic" risers, braams, whooshes from a preset library, or cinematic hit
   packs. Everything is short, low, tonal and tuned to the music.
5. **The voice always wins.** Music, ambience and SFX duck under every line (§5).

## 2. The sound palette (design these once, use them throughout)

| Name | What it is | How to make it |
|---|---|---|
| **Geo tick** | The map's signature: a tiny, dry, precise click with a soft low body | A pencil tap on hard paper + a 1-cycle sine thump at the key's root (~55–65 Hz), 40 ms, very short room |
| **Geo activation** | A map layer coming on (fill, borders, relief, states of record) | A felt-mallet tone (vibraphone or celesta, with the attack softened) tuned to the chord, plus a filtered noise "breath", 300 ms tail |
| **Line draw** | A line drawing (ruler, coast, link lines, wire trace) | A graphite or brush drag on paper, band-passed, its pitch following the drawing speed + a quiet sine glide rising a fifth |
| **Window open** | A footage window opening from a point | A geo tick + a soft air bloom (reversed reverb tail, low-passed at 3 kHz), 250 ms. The window's ambience J-cuts in 4 frames early |
| **Window close / camera move** | A window closing as the camera moves on | Reverse air, low-passed, 300 ms, panned slightly in the direction of travel |
| **Camera dive** | A fast map dive | Low-passed air rush (wind noise through a 200 Hz → 1.5 kHz sweep) + a sub swell, landing on a geo tick |
| **Ascent** | The camera rising to the whole country | The dive in reverse with a rising tonal pad |
| **Electrical hum** | The power line | A 50 Hz fundamental (India's mains frequency) with 100/150/250 Hz harmonics, a faint crackle of corona discharge, and a slow beating between two detuned layers |
| **Mechanical sweep** | The road | A low tyre-on-asphalt roar heard far off and filtered, swept past by Doppler over 0.8 s, with no engine detail |
| **Low impact** | A weight moment (CR chip, the threat cut) | A felt-mallet bass drum + a sub sine at 40 Hz, tuned, 1.2 s decay, no transient crack |
| **UI tick** | Taps, tab changes, layer toggles | A soft glassy tick (a fingertip on glass + a short high sine at 2.4 kHz, −24 dB), 30 ms. **Never louder than the voice.** |
| **Touch ripple** | The pin tap | A UI tick + a soft tonal "bloom" upward, 200 ms |
| **Fragment** | The map breaking apart | Low dry paper tearing, slowed 50 %, spread wide in stereo + a sub drop |
| **Re-form** | The map coming back | The fragment reversed, resolving into a warm string-pad swell |
| **Final impact** | The wordmark | One low, short, tonal hit (piano + bass felt drum + a sub at the root) with a long 2 s natural tail. Nothing else under it |

## 3. Ambience beds (one per landscape, 6–8 s loops, sourced or recorded)

| Bed | Content | Level and treatment |
|---|---|---|
| **Room / map** | A barely audible warm room tone with a faint paper rustle | −42 LUFS; it is the "silence" of the map |
| **Grassland** | Wind through dry grass, distant larks, sand hiss | −30 LUFS; in P04 and P17 (in P17 the wind thins and the hum takes over) |
| **Forest** | Dry-season deciduous forest: leaf rustle, distant barbet and coppersmith calls, insects | −30; in P05, and thinly in P19 |
| **River** | Wide slow water lapping, faint far-off birds, open air | −31; P06 |
| **Floodplain** | Wet grass, frogs, still water, humid air | −32; P07 (or P07's map-only fallback with no bed) |
| **High mountain** | Thin high wind, snow grains on rock, vast quiet | −31; P08 |
| **Road** | A distant highway rumble, with no horns or engines in detail | −34; P19 only |

Ambience beds cross-fade as J-cuts (each landscape is heard 4 frames before its window opens) and never
overlap for more than 6 frames.

## 4. Music brief (a composer, or a track licensed for social media)

- **Length 62 s**, about **92 BPM** (4 bars ≈ 10.4 s). A minor mode resolving to its relative major in P21a, then
  ending unresolved on a single held note before the final impact.
- **Instruments:** a low string drone, felt piano, a soft analogue pulse, one frame drum, a celesta or vibraphone
  layer (sharing the geo-activation timbre so the music and the map belong together), and for the swell, low
  strings or a single low brass layer. No choir, no epic percussion, no EDM.
- **Leave 1–4 kHz thin wherever the voice speaks.**
- **The arc:** hush → pulse → melody → drone → resolve → rhythm → swell → silence → hit.

### Hit points

| Time | Event | Music |
|---|---|---|
| 0:00.0 | Black | Silence, then the drone fades up at 0:00.5 |
| 0:02.2 | INDIA rises | Sub swell; the first felt-piano note |
| 0:03.0 | The coast starts drawing | **The pulse enters** |
| 0:09.0 | The dive into the Thar | The pulse doubles; the frame drum enters lightly |
| 0:17.5 | "Life, mapped." | **The melody enters** (felt piano + celesta) |
| 0:29.5 | The data sweep | The melody steps back; the ticks become the rhythm |
| 0:33.5 | The threat cut | **Everything drops to the drone alone** + a low impact |
| 0:37.9 | The freeze | **The drone cuts dead**: 0.3 s of near-silence |
| 0:38.2 | The line straightens | The drone returns a semitone lower, darker, with a slow pulse |
| 0:40.6 | The fragment | A sub drop, then a hold |
| 0:43.0 | The map re-forms | **Resolve to the relative major**; warm strings |
| 0:45.3 / 0:46.1 / 0:46.9 | The three questions | Three soft tonal hits, the third the warmest |
| 0:48.5 | The interface | **Rhythm returns**, brighter and lighter (pulse + piano ostinato) |
| 0:55.5 | The system view | **The swell**: low strings rise under V13 |
| 0:57.8 | "It is about where we choose to protect them." | The peak of the swell, then it thins |
| 0:58.5 | V14 begins | **The music stops**, leaving one held piano note fading out |
| 1:00.1 | The wordmark | **The final impact**, with a 2 s tail to the end |

## 5. Mix

| Bus | Target | Notes |
|---|---|---|
| Voice | −16 LUFS (dialogue stem) | Always on top. Dry on V06 and V14 |
| Music | −24 LUFS under the voice, −18 in the gaps | Sidechain-ducked by 6–8 dB under the voice, 30 ms attack, 120 ms release |
| Ambience | −30 to −34 LUFS | Ducked by 4 dB under the voice |
| SFX | peaks at −12 dBFS | Never masks a consonant: UI ticks are placed between syllables, not on them |
| **Master** | **−14 LUFS integrated, −1 dBTP** | Instagram normalises to about −14 |

**Phone check:** play the mix on a phone speaker at half volume. Every voice line must be intelligible, and the
hum, the ticks and the final impact must still be felt (add 2nd-harmonic saturation to the low elements so they
survive a small speaker).

## 6. The sound map: every section and transition

| Time | Shot | MUSIC | AMBIENCE | SFX | VOICE |
|---|---|---|---|---|---|
| 0:00.0–0:03.0 | **P01** Signal | Silence → drone fades in at 0:00.5; sub swell + first piano note at 0:02.2 | Room / map, barely there | Crosshair: one geo tick (0:00.4). The **ruler draws**: a line-draw drag, plus **a geo tick per major degree** (7 ticks, 0:00.4–0:01.3). Settling digits: tiny random-pitch ticks. INDIA rises: a soft air bloom | — |
| 0:03.0–0:06.0 | **P02** India trace | **The pulse enters** at 0:03.0 | Room / map | **T1** ruler → coast: the ruler's last tick rings into a line-draw drag that follows the pen round the coast (pitch rising with the length drawn). Graticule: a faint paper rustle | V01 0:04.1 "Look closer." |
| 0:06.0–0:09.0 | **P03** India layers | Pulse | Room / map | **Geo activation ×3**: fill (0:06.1), borders (0:06.9), relief (0:07.6, with a soft sweep matching the light sweep). Text mask-ins: none (the voice is there) | V02 0:06.3 "One country. So many worlds inside it." |
| 0:09.0–0:10.9 | **P04** Desert | The pulse doubles; light frame drum | Grassland J-cut in at 0:09.6 | **T2 camera dive** (0:08.7–0:09.3): air rush + sub, landing on a geo tick. Leader line: line draw. **Window open** (0:09.8) | — |
| 0:10.9–0:12.5 | **P05** Forest | Pulse | Forest J-cut | **T4** window close + camera move (reverse air, panned right); leader line; window open | — |
| 0:12.5–0:14.1 | **P06** River | Pulse | River J-cut | As above; the rivers drawing get a **liquid line-draw** (the drag + a soft water trickle) | — |
| 0:14.1–0:15.7 | **P07** Wetland | Pulse | Floodplain J-cut (or none in the fallback) | As above | — |
| 0:15.7–0:17.5 | **P08** Himalaya | Pulse thins; a high string harmonic enters | High mountain J-cut | As above. High contours glow: geo activation, an octave up. **T5 ascent** (0:17.0–0:17.5): rising tonal pad | V03 0:16.0 "And each one shapes what can live there." |
| 0:17.5–0:18.7 | **P09** Life intro | **The melody enters** | Room / map | "Life, mapped." types in: a tiny tick per character, very quiet | V04 0:17.6 "So… who does?" |
| 0:18.7–0:20.9 | **P10** Bustard | Melody | Room + a faint grassland breath | **T6 line-wipe card**: line draw (the wipe) → push forward (soft air) → state fill (geo activation) → link line (line draw ending in a geo tick with a ripple) → **CR chip: one soft low impact** (the only one in Life) | V05 0:19.0 "One of the heaviest flying birds in the world." |
| 0:20.9–0:23.0 | **P11** Tiger | Melody | + a faint forest breath | The card sequence; the EN chip gets a UI tick, not an impact | — |
| 0:23.0–0:25.3 | **P12** Dolphin | The melody thins to the celesta alone | + faint water | The card sequence + **two soft echolocation-like clicks** (a tuned, high, very quiet click pair) under "by sound" | V06 0:23.4 "Almost blind. It finds its way… by sound." |
| 0:25.3–0:27.4 | **P13** Rhino | The melody returns | + faint wet grass | The card sequence; VU chip tick | — |
| 0:27.4–0:29.5 | **P14** Snow leopard | Melody | + faint high wind | The card sequence; VU chip tick | — |
| 0:29.5–0:33.5 | **P15** Data | The melody steps back; **the ticks become the rhythm** | Room / map | **T7 locality sweep**: a geo tick for every locality landing (randomised ±3 semitones, panned west → east), building into a fine texture; the counter's own tick; the status bar: three geo activations (CR, EN, VU) | — |
| 0:33.5–0:35.3 | **P16** Threat dive | **The one hard cut: music drops to the drone alone** | Grassland, thin and windier | **T8**: the tick texture stops dead on the cut + a **low impact**. The chain's arrow: a line draw | V07 0:33.7 "Now look again." |
| 0:35.3–0:37.9 | **P17** Wire (F02) | Drone | Grassland, thinning | Window open; **the electrical hum fades in** over 1.5 s with the focus pull, its corona crackle rising | V08 0:35.9 "Sometimes, the threat is literally a line." |
| 0:37.9–0:38.6 | **P18** Freeze morph | **The drone cuts dead** (0.3 s near-silence), then returns a semitone lower | None | **T9**: the hum cuts dead on the freeze frame. The trace: a single **line draw**, then a tonal whoosh rising a fifth as it straightens and lands on the map with a geo tick | — |
| 0:38.6–0:40.6 | **P19** Road (F03-B) | Dark drone + a slow pulse | Forest (thin) + road rumble | **T10**: line travel (line draw with Doppler); window open; **mechanical sweep** as the centre line lifts out of the footage | V09 0:38.8 "Roads cut through the tiger's forests… and the corridors between them." |
| 0:40.6–0:43.0 | **P20** Fragment | Sub drop, then **a hold** | Room / map | **Fragment** sound (0:40.8); the guide's fingertip: one dry tick as it touches and a soft paper tear as the line breaks under it; 0.6 s of quiet before the re-form | — |
| 0:43.0–0:45.0 | **P21a** Re-form | **Resolve to the major**; warm strings | Room / map | **Re-form** sound (the reversed fragment into a swell); a programme-site ripple: a soft tonal geo tick each, in the protect colour's register (lower, warmer), in year order | V10 0:43.2 "To protect a species, you have to know three things." |
| 0:45.0–0:48.5 | **P21b** Three questions | Strings hold; **three soft tonal hits** at 0:45.3 / 0:46.1 / 0:46.9 | Room / map | A mask-in for each line: a soft air breath, nothing else | — (the text speaks) |
| 0:48.5–0:49.7 | **P22** Map → UI | **Rhythm returns**, brighter | Room | **T12 registration**: the map scaling down (a soft descending air) → a soft UI chime when the outlines lock → the chrome hairline drawing (a line draw, high and short) | V11 0:48.6 "So we put all three on one map." |
| 0:49.7–0:52.3 | **P23** Pin / profile | Rhythm | Room | **Touch ripple** on the guide's tap (0:50.5, on "Tap"); the drawer sliding in: a soft slide of paper | V12 0:50.5 "Tap a pin… and the whole story opens." |
| 0:52.3–0:55.5 | **P24** Tabs / layers | Rhythm, with the piano ostinato | Room | **UI tick on each tab cut** (Distribution, Threats, Conservation) and on each layer toggle, placed on the beat | — |
| 0:55.5–0:58.0 | **P25** System | **The swell** (low strings) | Room | **The T12 reverse**: a low swell as the pane scales up out of the UI, with motion-blur air; every layer coming on: one combined geo activation (a chord) | V13 0:55.8 "Mapping isn't just about where species are." |
| 0:58.0–1:02.0 | **P26** Brand | **The music stops** at 0:58.5, leaving one held piano note fading | Near-silent room | Layers falling away: a soft descending activation (0:58.0). The tilt: a faint air. **The final impact** at 1:00.1 on the wordmark's first character, with a 2 s tail. The rule drawing: a quiet line draw inside the tail. URL: nothing | V14 0:58.6 "Come and see where they live." |

## 7. What exists now

`video/public/promo/audio/` holds the master film's placeholder timing tones. They are not used for this cut.
No reel sound files exist yet. This document is the spec for the music, the ambience and the SFX library, and
every licence and source goes into `CREDITS.md` before export.

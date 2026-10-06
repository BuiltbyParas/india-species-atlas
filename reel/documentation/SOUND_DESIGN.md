# Sound design and music

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

Sound carries as much of the premium finish as picture does. The voice is always on top: every other bus ducks
under it by 6–8 dB with a 120 ms release.

## Stems

| Bus | Folder | Level target | Notes |
|---|---|---|---|
| Voice | `reel/audio/voice/` | −16 LUFS (dialogue) | Human performance only (see VOICE_SCRIPT.md) |
| Music | `reel/audio/music/` | −24 LUFS under voice, −18 in the gaps | One cue, one composer, no stock "epic" library |
| Ambience | `reel/audio/ambience/` | −30 LUFS | One bed per landscape, crossfaded as J-cuts |
| SFX | `reel/audio/sfx/` | Peaks at −12 dBFS | Transition and UI sounds |
| Master | — | **−14 LUFS integrated, −1 dBTP** | Instagram normalises to around −14 |

## Per section

| Time | Shot | Ambience | Key effects | Music |
|---|---|---|---|---|
| 0:00–0:03 | S01 | Room tone | Low drone swell; a tiny geographic click when the line starts; rising tone under INDIA | Minimal atmospheric pulse |
| 0:03–0:06 | S02 | — | Geographic pulse at each camera key; air rush on the dive | Pulse |
| 0:06–0:10 | S03 | Wind through dry grass | Dust hiss | Pulse |
| 0:10–0:13 | S04 | Grass, thinner | **Faint 50 Hz electrical hum** rising with the wire's focus; the hum cuts dead on the freeze; tonal whoosh on the morph | **Rhythm begins** on the freeze |
| 0:13–0:20 | S05–S06 | Natural grassland | One soft low impact under "Critically endangered"; UI ticks on the card | Rhythm |
| 0:20–0:27 | S07–S09 | Forest (birds, leaves) | **Deep impact** on the tiger cut; pencil line-draw under the trace | Rhythm → momentum |
| 0:27–0:31 | S10 | Low road rumble | Low mechanical sweep on the road morph | Momentum increases |
| 0:31–0:37 | S11–S13 | Water, then underwater low end | Two echolocation clicks; fluid whoosh into the network | Momentum |
| 0:37–0:43 | S14–S16 | High wind, restrained | Snow on stone; soft rising tone on the contour | **Cinematic expansion** |
| 0:43–0:46 | S17 | Tall grass, wetland | Low environmental impact | Expansion |
| 0:46–0:50 | S18 | — | One tick per place lighting; a low bloom when the route completes | Expansion |
| 0:50–0:55 | S19 | — | Precise UI ticks on every cut (no clicks louder than the voice) | **Peak** |
| 0:55–0:58 | S20 | Room tone | — | **Music drops** out under "there" |
| 0:58–1:00 | S21 | Near silence | **One final impact** on the wordmark, a low, short, tonal hit with a 2 s tail | Silence, then the impact |

## Music brief (for a composer or a licensed track)

60 s, about 92 BPM, a minor mode resolving to its relative major only in the last 5 s. Instruments: a low
string drone, a muted felt piano, soft analogue pulse, one frame drum, and at the expansion a low brass or string
swell. Leave the 1–4 kHz range thin wherever the voice speaks. Hit points: the freeze at 12.87 s (rhythm in),
the tiger cut at 22.0 s, the Himalaya at 37.5 s (expansion), the montage at 50.0 s (peak), the drop at 55.0 s, the
impact at 58.4 s. Any track used must be licensed for social media use; credit it in `CREDITS.md`.

## What exists now

`video/public/promo/audio/` holds the placeholder music bed and effects made for the 97 s film by
`npm run video:promo:audio`. They are synthesised tones for timing only, not final sound, and they were not cut
for this reel. The reel plays nothing until its own files land in `reel/audio/`.

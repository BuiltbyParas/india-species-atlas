# Voice script: India Species Atlas reel (60 s)

> **Superseded (6 Oct 2026)** by the premium plan in `reel/documentation/`: `PREMIUM_EDIT_PLAN.md`, `PREMIUM_SHOTLIST.md`, `CHARACTER_DESIGN.md`, `VOICE_SCRIPT.md`, `FLOW_SHOT_PROMPTS.md`, `SOUND_DESIGN_PLAN.md`. Kept for reference only.

**Character:** Rekha, the Atlas guide (see `reel/character/design/CHARACTER_SPEC.md`).
**Performer:** a human voice actor. No synthesized or AI voice is used, not even as a scratch track.
**Deliver:** `reel/audio/voice/character_voice.wav`, one continuous take of the whole script at 48 kHz, 24-bit, mono.
Also deliver each line as its own file, `V01.wav` … `V18.wav`, plus at least one alternate take of every line.
AIFF is accepted too. Start and end each file with 0.5 s of room tone.

The edit is cut to the recording. The timecodes below are **planned** positions only. Once the takes arrive,
the editor measures each line's real length and moves the picture to fit it. The voice is never time-stretched.

## The performance

A young adult guide in the manner of a good anime dub: a real person talking, not announcing.

- **Discovery** lines (V03, V07, V10, V12): bright and forward, as if pointing something out to a friend.
- **Geography** lines (V02, V04, V08, V13): calm, unhurried, with a little warmth.
- **Threat** lines (V05, V06, V09, V11): drop the energy, not the volume. Plain and serious, never sad-voiced.
- **Ending** (V16–V18): warm and proud, then quiet. V18 is said to someone standing close.
- Breaths, small mouth sounds and the odd imperfect consonant are welcome. Don't clean them out in the edit.
- Don't do: a child's voice, a cartoon pitch-up, the YouTube-narrator lilt, or a trailer-voice growl.

## Lines

Pause: `/` = a short beat (~0.2 s), `//` = a breath (~0.5 s), `…` = a held, unfinished pause.

| ID | Planned | Emotion | Line | Delivery | Pause after |
|---|---|---|---|---|---|
| V01 | 00:00.4 | CURIOUS / WONDER | "India is home to some of the most extraordinary species on Earth." | Soft start, open on "extraordinary". About 3 s. | 0.4 s |
| V02 | 00:04.0 | INTRIGUED | "But where they live… / is only the beginning." | A held pause after "live"; a small smile on "beginning". | 0.6 s |
| V03 | 00:06.8 | DISCOVERY | "Take the Great Indian Bustard." | Leaning in, as if introducing someone. | 0.3 s |
| V04 | 00:08.5 | OBSERVANT | "Their habitat is changing." | Quieter. Looking out over the land. | 0.4 s |
| V05 | 00:10.2 | SERIOUS | "And sometimes, // the threat is literally a line across the landscape." | The key line of the film. Slow down on "a line". | 1.6 s |
| V06 | 00:14.6 | SERIOUS / PLAIN | "Critically endangered." | Low and even. No drama; let the words carry it. | 4.6 s (the card plays) |
| V07 | 00:20.5 | ENERGY / TRAVEL | "Move south, / and the story changes." | Energy returns. Moving on. | 5.0 s (tiger, map) |
| V08 | 00:27.3 | CALM / EXPLAINING | "Forests become corridors…" | Even, explanatory; leave it hanging. | 0.7 s |
| V09 | 00:29.4 | CONCERN | "…and corridors become fragmented." | Falls at the end. | 0.6 s |
| V10 | 00:31.5 | LIGHT / INVITING | "Follow the rivers." | Almost a whisper of a smile. | 2.2 s |
| V11 | 00:34.9 | SERIOUS | "Even here, / dams and barrages split the population." | Matter-of-fact. | 0.5 s |
| V12 | 00:37.5 | AWE | "Then rise into the Himalayas." | Take a breath before it. Lift on "rise". | 1.5 s |
| V13 | 00:40.6 | MEASURED | "Different habitat. / Different species. / Different pressures." | Three equal steps. The third is the heaviest. | 0.2 s |
| V14 | 00:43.5 | WARMER / A TURN | "And some stories show us something else." | Softer. Turning a corner. | 0.2 s |
| V15 | 00:45.2 | GENTLE / FIRM | "Recovery doesn't always mean safety." | Kind, but don't let it off the hook. | 0.7 s |
| V16 | 00:47.6 | PROUD / QUIET | "That's why we built India Species Atlas." | Confident, not salesy. Say the name clearly. | 1.2 s |
| V17 | 00:50.8 | BRISK | "Not just to show where species are…" | Moves with the fast montage. | 2.2 s |
| V18 | 00:55.0 | WARM / DIRECT | "…but to explore what is happening there." | To camera, close-mic, the last spoken line. | End |

**Optional (record, but they are not in the 60 s cut):** E1 "Explore the species." E2 "Explore the maps."
E3 "Explore the conservation story." In the 60 s cut these appear as type only, because three spoken lines don't fit
in 2 s. The recordings allow a 63–65 s alternate cut.

## Wording that changed from the brief, and why

Every factual line has to rest on the Atlas's own research (`src/data/species.ts`). `reel/edit/shotlist.json`
records the exact field behind each claim.

- **Dolphin.** The brief's line was "Even here, a species can disappear from the map." The dataset doesn't record
  range loss for this species, so the line is not supported. It is replaced by "Even here, dams and barrages split
  the population.", which rests on `threatNote`: "Dams and barrages fragment the population".
- **"Move south."** The Central Indian Highlands lie south-east of the Thar. "South" is a fair general direction
  and makes no factual claim, so it is kept.
- **The rhino** keeps "Recovery doesn't always mean safety." It rests on the rhino's `summary`: "A conservation success story
  … but still Vulnerable because of its small, concentrated range".
- **Section order.** The brief's script puts "Different habitat. Different species. Different pressures." under
  the Himalaya, but the brief's timeline puts a shorter version of it under the rhino. Here the full line sits on
  the snow leopard card (S16), and the rhino gets V14 and V15.

## Recording guide (for the actor or engineer)

1. **Room:** a treated small room or a closet full of clothes. Avoid hard walls within a metre of the mic.
2. **Mic:** a large-diaphragm condenser or a dynamic such as an SM7B. Use a pop filter, 15–20 cm from the mouth, slightly off axis.
3. **Level:** peaks around −10 dBFS. No limiter or compressor on the way in. 48 kHz, 24-bit.
4. **Takes:** for each line, one take as written, one a touch bigger and one a touch smaller. Record the whole
   script top to bottom once as well (`character_voice.wav`), because a continuous read has the most natural flow.
5. **Room tone:** record 10 s of silence in the same room, with the actor in place, for edit patching.
6. **Watch-along:** play the placeholder reel (`npm run reel:preview`) while recording, so the actor sees what each line sits on.

## Processing (after recording only)

The chain, in order: high-pass at 80 Hz → gentle subtractive EQ (find and dip any boxiness at 250–400 Hz)
→ de-ess (only on the "s" in "species" and "pressures") → compression at 2:1, 3–4 dB of gain reduction → subtle
saturation, barely audible → a short plate reverb at 6–8 % wet, mostly on the map shots. Target −16 LUFS for
the dialogue stem. No pitch shifting, no formant shifting and no "anime" effects. The performance is the effect.

## Lines that require human recording

All of them: V01–V18, plus the optional E1–E3. Until the takes exist, the reel shows the line as an on-screen
caption on its planned timecode and plays no voice audio.

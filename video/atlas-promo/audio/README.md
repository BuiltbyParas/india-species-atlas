# Audio for the promotional film

The film ships **no music of its own**. It plays whatever is in
`video/public/promo/audio/` (git-ignored) and stays silent where nothing is.

| File | Used for | Placed by |
|---|---|---|
| `music.wav` or `music.mp3` | The score, from 0:00. Faded in over 0.5 s and out over the last 3 s. | `AudioBed.tsx` |
| `sfx/impact.wav` | INDIA lands; LIFE; the title | `cues.ts` |
| `sfx/reveal.wav` | The coastline starts tracing; the map re-forms | `cues.ts` |
| `sfx/whoosh.wav` | The landscape camera moves, species wipes, map → interface, pull-back | `cues.ts` |
| `sfx/tick.wav` | The localities landing in the data scene (13 ticks) | `cues.ts` |
| `sfx/click.wav` | Each press of the site's cursor in the Atlas scene | `cues.ts` (times from `scenes/atlas-script.ts`) |
| `sfx/riser.wav` | Into the title | `cues.ts` |
| `sfx/sub.wav` | Room tone under the opening black; the map coming apart | `cues.ts` |

Each effect file is a single one-shot; the cue sheet reuses it at every cue of
its kind, with the gain set in `cues.ts`.

## Placeholders

`npm run video:promo:audio` synthesises placeholder effects (and, with
`-- --bed`, a placeholder music bed) using the repository's own DSP kit
(`scripts/video/audio/dsp.mjs`). They are generated, not sampled, so they are
free of third-party rights — but they are **placeholders**, written to mark
the film's sound structure, not finished sound design.

## Replacing them

1. Get licensed or commissioned audio. Do not download copyrighted music.
2. Save it over the file of the same name (48 kHz WAV preferred; MP3 is fine
   for the music bed).
3. If the music has a different shape from the cut, move scene timings in
   `video/atlas-promo/timeline.ts`, or move individual cues in
   `video/atlas-promo/audio/cues.ts`. Cue times are written relative to the
   scenes (`at('threats', 3.4)`), so they follow the edit.
4. Credit the music and sound design in your release notes; the film's own
   end card carries no credits.

Cue map (whatever the source):

| Time | Moment | Mood |
|---|---|---|
| 0:00 | Black, coordinates | Near silence, room tone |
| 0:02.5 | INDIA | First impact |
| 0:05 | The coast traces | Opening |
| 0:13 | Five landscapes | Pulse, momentum |
| 0:24 | Five species | Restrained, emotional |
| 0:38 | The data | Precise, ticking |
| 0:49 | Threats; the map comes apart | Tension, low end |
| 0:59 | Conservation; the map re-forms | Lift |
| 1:09 | The Atlas (product) | Clean, bright |
| 1:23 | System view | Fullest |
| 1:30 | Title | Resolve, then hold |

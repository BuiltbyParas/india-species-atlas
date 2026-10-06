/**
 * The 60-second vertical reel, 1080×1920 @ 30 fps.
 *
 * Shots come from reel/edit/shotlist.json. A shot with a component below is
 * built; every other shot shows a slate saying what it will be, so the whole
 * 60 s can be watched for timing from day one. The 97 s film is not touched:
 * this composition only reuses its tokens, fonts, type and finish.
 */
import type { FC } from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { COLOR } from '../styles/tokens';
import { loadFonts } from '../styles/fonts';
import { Finish } from '../components/fx/Finish';
import { SHOTS, f } from './shots';
import { S03Grass, S04Wire, S05Bustard, LineMorph } from './TestShots';
import { Slate, Captions, CharacterSlots, SafeZoneGuides, ReelAudio } from './Overlays';

loadFonts();

const BUILT: Record<string, FC> = { S03: S03Grass, S04: S04Wire, S05: S05Bustard };

export function AtlasReel({ guides = false, captions = true }: { guides?: boolean; captions?: boolean }) {
  return (
    <AbsoluteFill style={{ background: COLOR.ground, overflow: 'hidden' }}>
      {SHOTS.map((s) => {
        const Built = BUILT[s.id];
        return (
          <Sequence key={s.id} name={`${s.id} ${s.section}`} from={f(s.in)} durationInFrames={f(s.out - s.in)}>
            {Built ? <Built /> : <Slate shot={s} />}
          </Sequence>
        );
      })}
      <LineMorph />
      <CharacterSlots />
      <Finish grain={0.05} vignette={0.4} />
      {captions && <Captions />}
      <ReelAudio />
      {guides && <SafeZoneGuides />}
    </AbsoluteFill>
  );
}

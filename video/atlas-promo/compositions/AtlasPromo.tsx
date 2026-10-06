/**
 * The whole film: the persistent map, the ten scenes laid over it, the map
 * sheet's margin, the audio bed and the finishing pass.
 *
 * Scenes are <Sequence>s placed from the timeline. Each runs a little past
 * its own end (SCENE_TAIL) so its exit can overlap the next scene's entrance
 * — the film is cut as one piece, not as ten clips.
 */
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLOR } from '../styles/tokens';
import { loadFonts } from '../styles/fonts';
import { SCENES, SCENE_START, frames, mapStateAt, type SceneId } from '../timeline';
import { AnimatedIndiaMap } from '../components/map/AnimatedIndiaMap';
import { SheetFrame } from '../components/map/SheetFrame';
import { Finish } from '../components/fx/Finish';
import { AudioBed } from '../audio/AudioBed';
import { SCENE_COMPONENTS } from '../scenes';
import { isOn } from '../utils/quality';

loadFonts();

const SCENE_TAIL = 1.0;

function MapLayer() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  return <AnimatedIndiaMap state={mapStateAt(frame / fps)} viewport={{ width, height }} />;
}

export function AtlasPromo() {
  return (
    <AbsoluteFill style={{ background: COLOR.ground, overflow: 'hidden' }}>
      <MapLayer />
      {SCENES.map((s) => {
        const Scene = SCENE_COMPONENTS[s.id as SceneId];
        return (
          <Sequence key={s.id} name={s.name} from={frames(SCENE_START[s.id as SceneId])} durationInFrames={frames(s.dur + SCENE_TAIL)}>
            <Scene />
          </Sequence>
        );
      })}
      <SheetFrame />
      <AudioBed />
      {isOn('finish') && <Finish grain={isOn('grain') ? 0.05 : 0} />}
    </AbsoluteFill>
  );
}

/** One scene in context (map included), for fast iteration in the Studio. */
export function AtlasPromoScene({ scene }: { scene: SceneId }) {
  return (
    <Sequence from={-frames(SCENE_START[scene])}>
      <AtlasPromo />
    </Sequence>
  );
}

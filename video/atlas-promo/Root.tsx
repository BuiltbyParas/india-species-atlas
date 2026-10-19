import { Composition, Folder } from 'remotion';
import { AtlasPromo, AtlasPromoScene } from './compositions/AtlasPromo';
import { DURATION_FRAMES, FPS, SCENES, frames, type SceneId } from './timeline';
import { AtlasReel } from './reel/AtlasReel';
import { DURATION_FRAMES as REEL_FRAMES, FPS as REEL_FPS, W as REEL_W, H as REEL_H } from './reel/shots';

/**
 * Compositions:
 *   AtlasPromo           the film, 1920×1080 @ 30 fps (render this)
 *   Reel/AtlasReel       the 60 s vertical reel, 1080×1920 @ 30 fps (reel/README.md)
 *   Scenes/<id>          each scene in context, for iterating in the Studio
 *
 * A 720p or 540p preview is the same composition rendered with --scale
 * (see scripts/video/atlas-promo/render.mjs), so the preview can never drift
 * from the master.
 */
export function Root() {
  return (
    <>
      <Composition id="AtlasPromo" component={AtlasPromo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} />
      <Folder name="Scenes">
        {SCENES.map((s, i) => (
          <Composition
            key={s.id}
            id={`S${String(i + 1).padStart(2, '0')}-${s.id}`}
            component={AtlasPromoScene}
            defaultProps={{ scene: s.id as SceneId }}
            durationInFrames={frames(s.dur)}
            fps={FPS}
            width={1920}
            height={1080}
          />
        ))}
      </Folder>
      <Folder name="Reel">
        <Composition id="AtlasReel" component={AtlasReel} defaultProps={{ guides: false, captions: true }} durationInFrames={REEL_FRAMES} fps={REEL_FPS} width={REEL_W} height={REEL_H} />
      </Folder>
    </>
  );
}

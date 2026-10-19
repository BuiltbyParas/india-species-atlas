/**
 * A footage plate: the shot's Flow clip when one has been synced into
 * video/public/reel/flow/, otherwise a stand-in still that is marked as one.
 *
 * Every plate gets the same grade (VISUAL_BIBLE.md, Colour) so footage sits
 * next to the Atlas's forest-ground cards: saturation pulled down, contrast
 * barely up, highlights held. The grade is CSS filters only: no LUT, no bloom.
 */
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Freeze, Img, OffthreadVideo, getStaticFiles, staticFile } from 'remotion';
import { COLOR, TYPE, ink, withAlpha } from '../styles/tokens';

export const GRADE = 'saturate(0.84) contrast(1.05) brightness(0.95)';

function present(file: string): boolean {
  try {
    return getStaticFiles().some((s) => s.name === file);
  } catch {
    return false;
  }
}

export const flowPath = (file?: string) => (file && present(`reel/flow/${file}`) ? `reel/flow/${file}` : null);

export interface StandIn {
  src: string;
  /** Rendered size and offset of the still, in frame pixels (lets a crop sit higher or wider than the frame). */
  w: number;
  h: number;
  x: number;
  y: number;
  label: string;
}

export function Plate({
  flowFile,
  standIn,
  scale = 1,
  dx = 0,
  dy = 0,
  origin = '50% 50%',
  blur = 0,
  extraFilter = '',
  freezeAt,
  children,
}: {
  flowFile?: string;
  standIn: StandIn;
  scale?: number;
  dx?: number;
  dy?: number;
  origin?: string;
  blur?: number;
  extraFilter?: string;
  /** Local frame at which the clip freezes (the S04 freeze before the line morph). */
  freezeAt?: number;
  children?: ReactNode;
}) {
  const clip = flowPath(flowFile);
  const filter = `${GRADE} ${blur > 0.05 ? `blur(${blur}px)` : ''} ${extraFilter}`;
  const move: CSSProperties = { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transformOrigin: origin, filter };
  const video = clip && <OffthreadVideo src={staticFile(clip)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: COLOR.ground }}>
      <AbsoluteFill style={move}>
        {clip ? (
          freezeAt === undefined ? video : <Freeze frame={freezeAt} active={(fr) => fr >= freezeAt}>{video}</Freeze>
        ) : (
          <Img src={staticFile(standIn.src)} style={{ position: 'absolute', left: standIn.x, top: standIn.y, width: standIn.w, height: standIn.h }} />
        )}
      </AbsoluteFill>
      {children}
      {!clip && <StandInTag text={standIn.label} />}
    </AbsoluteFill>
  );
}

/** Marks anything that is not final, so a test can never be mistaken for the film. */
export function StandInTag({ text, top = 92 }: { text: string; top?: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 40,
        padding: '8px 14px',
        border: `1px solid ${withAlpha('#d9a441', 0.85)}`,
        background: withAlpha(COLOR.ground, 0.75),
        ...TYPE.micro,
        fontSize: 18,
        color: '#d9a441',
      }}
    >
      Stand-in · {text}
    </div>
  );
}

/** Top and bottom fall-off to the forest ground, so type reads and the plate meets the cards without a seam. */
export function GroundFalloff({ top = 0.55, bottom = 0.6 }: { top?: number; bottom?: number }) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${withAlpha(COLOR.ground, top)} 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 64%, ${withAlpha(COLOR.ground, bottom)} 100%)`,
        pointerEvents: 'none',
      }}
    />
  );
}

export const microInk = { ...TYPE.micro, fontSize: 26, color: ink(0.8) } as const;

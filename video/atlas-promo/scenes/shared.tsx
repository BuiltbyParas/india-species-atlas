/**
 * Layout constants and small pieces shared by more than one scene.
 */
import type { CSSProperties, ReactNode } from 'react';
import { TYPE, COLOR, ink } from '../styles/tokens';

/**
 * Where INDIA settles as a corner label. Scene 01 shrinks the hero word to
 * exactly this place and size and stops drawing it at `handoff` (its local
 * time); scene 02 starts drawing it from the same moment — one continuous word.
 */
export const INDIA_LABEL = { x: 120, y: 236, size: 96, handoff: 5.25 } as const;
/** Scene 02's local time when it takes over the label (01's handoff, less 01's length). */
export const INDIA_LABEL_TAKEOVER = INDIA_LABEL.handoff - 5;

/** The left text column most map scenes use. */
export const LEFT = { x: 120, width: 520 } as const;

export function Col({ x = LEFT.x, y, width = LEFT.width, children, style }: { x?: number; y: number; width?: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', left: x, top: y, width, ...style }}>{children}</div>;
}

export const sectionStyle: CSSProperties = { ...TYPE.section, color: COLOR.ink };
export const bodyStyle: CSSProperties = { ...TYPE.body, color: ink(0.72) };

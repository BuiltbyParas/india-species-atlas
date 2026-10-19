/**
 * The real interface, as the film shows it.
 *
 *   useUiManifest   loads ui.json (written by capture-ui.mjs): plates + element rects
 *   BrowserFrame    a quiet window chrome with the page's real address
 *   SiteCursor      the site's own cursor (src/components/cinema/CustomCursor.tsx
 *                   and the .cursor-* rules in src/index.css): a 6 px dot, a
 *                   34 px hairline ring that opens to 58 px over controls, and
 *                   the three-ring contour "splash" on a press
 */
import { useEffect, useState, type ReactNode } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { COLOR, TYPE, ink, withAlpha, EASE } from '../../styles/tokens';
import { clamp01 } from '../../utils/anim';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UiManifest {
  viewport: { width: number; height: number };
  scale: number;
  shots: Record<string, { file: string; url: string; rects?: Record<string, Rect> }>;
}

let manifestPromise: Promise<UiManifest | null> | null = null;

export function useUiManifest(): UiManifest | null | undefined {
  const [m, setM] = useState<UiManifest | null | undefined>(undefined);
  const [handle] = useState(() => delayRender('ui manifest'));
  useEffect(() => {
    manifestPromise ??= fetch(staticFile('promo/ui/ui.json'))
      .then((r) => (r.ok ? (r.json() as Promise<UiManifest>) : null))
      .catch(() => null);
    manifestPromise.then((v) => {
      if (!v) console.warn('[atlas-promo] promo/ui/ui.json missing — run npm run video:promo:capture');
      setM(v);
      continueRender(handle);
    });
  }, [handle]);
  return m;
}

export const BAR = 46;

export function BrowserFrame({ width, height, url, children }: { width: number; height: number; url: string; children: ReactNode }) {
  return (
    <div
      style={{
        width,
        height: height + BAR,
        borderRadius: 14,
        overflow: 'hidden',
        background: COLOR.groundRaised,
        border: `1px solid ${ink(0.14)}`,
        boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 8px 30px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ height: BAR, display: 'flex', alignItems: 'center', padding: '0 18px', borderBottom: `1px solid ${ink(0.08)}`, background: COLOR.ground }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 99, border: `1px solid ${ink(0.22)}` }} />
          ))}
        </div>
        <div
          style={{
            margin: '0 auto',
            padding: '6px 22px',
            borderRadius: 99,
            background: COLOR.panel,
            ...TYPE.body,
            fontSize: 15,
            letterSpacing: '0.01em',
            color: ink(0.62),
          }}
        >
          {url}
        </div>
        <div style={{ width: 46 }} />
      </div>
      <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

/** The site's cursor, at a screen position, with its press splashes. */
export function SiteCursor({ x, y, hover, presses, scale = 1 }: { x: number; y: number; hover: number; presses: number[]; scale?: number }) {
  const ring = (34 + 24 * EASE.outExpo(clamp01(hover))) * scale;
  const pressing = presses.some((p) => p >= 0 && p < 0.12);
  const r = pressing ? 26 * scale : ring;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {presses.map((p, i) =>
        p >= 0 && p <= 1
          ? [0, 0.08, 0.16].map((d, j) => {
              const q = clamp01((p - d) / (1 - d));
              const e = EASE.outExpo(q);
              const size = (16 + 84 * e) * scale;
              return (
                <span
                  key={`${i}-${j}`}
                  style={{
                    position: 'absolute',
                    left: x - size / 2,
                    top: y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: 999,
                    border: `1px solid ${withAlpha(COLOR.contour, (j === 0 ? 1 : 0.7) * (1 - q))}`,
                  }}
                />
              );
            })
          : null,
      )}
      <span style={{ position: 'absolute', left: x - r / 2, top: y - r / 2, width: r, height: r, borderRadius: 999, border: `1px solid ${ink(0.45 + 0.25 * hover)}` }} />
      <span style={{ position: 'absolute', left: x - 3 * scale, top: y - 3 * scale, width: 6 * scale, height: 6 * scale, borderRadius: 999, background: COLOR.ink }} />
    </div>
  );
}

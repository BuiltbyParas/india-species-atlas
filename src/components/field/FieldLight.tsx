import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { FieldStage } from '../../world/field/stage';

/**
 * The light, by hand, for every way of holding it.
 *
 * With a mouse the hand already turns each study's sun as it moves (the stage reads the pointer). This is the same
 * light for everyone else: a short line with the sun on it in the study's furniture — a real range input, so the
 * keyboard turns it with the arrow keys and a screen reader names it — and, on a touch screen, a drag sideways
 * across the scene. Only a sideways drag: an upright one is the page scrolling, and the page keeps it (the study
 * allows vertical panning and pinch-zoom only, so the browser hands the sideways part to us). Controls under the
 * finger keep their own gestures.
 *
 * Both write one value to the stage (`setLight`), which swings the sun there on the homepage lamp's spring — or
 * puts it there at once with reduced motion. A touch visitor is told once, for a few seconds, that the scene can be
 * dragged; the hint goes after the first turn.
 */
const HINT_KEY = 'atlas.field.lightHint';

function hintSeen(): boolean {
  try {
    return sessionStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function markHintSeen() {
  try {
    sessionStorage.setItem(HINT_KEY, '1');
  } catch {
    /* storage can be unavailable; the hint simply shows again next time */
  }
}

function describe(v: number): string {
  if (Math.abs(v) < 0.15) return 'at its hour';
  const side = v < 0 ? 'left' : 'right';
  return Math.abs(v) > 0.7 ? `turned far ${side}` : `turned ${side}`;
}

const INTERACTIVE = 'a, button, input, select, textarea, label, video, [role="slider"], [role="button"], [contenteditable]';

export function FieldLight({ stage, surface, label }: { stage: FieldStage | null; surface: RefObject<HTMLElement | null>; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState(false);
  const hinting = useRef(false);

  // A new study starts with its sun at its own hour; leaving, the sun swings back to it (the index shows the same
  // worlds, each at its hour).
  useEffect(() => {
    stage?.setLight(0, true);
    if (input.current) input.current.value = '0';
    return () => stage?.setLight(0);
  }, [stage]);

  // The touch hint: a few seconds, once a session, only where there is no hover.
  useEffect(() => {
    if (!stage || hintSeen() || !window.matchMedia('(hover: none)').matches) return;
    const toggle = (on: boolean) => {
      hinting.current = on;
      setHint(on);
    };
    const show = window.setTimeout(() => toggle(true), 1800);
    const hide = window.setTimeout(() => {
      toggle(false);
      markHintSeen();
    }, 9000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [stage]);

  // Every way in ends here: the stage turns the sun, the range shows where it is, the hint has done its work.
  const apply = useCallback(
    (v: number, fromGesture: boolean) => {
      if (!stage) return;
      stage.setLight(v);
      const el = input.current;
      if (el) {
        if (fromGesture) el.value = String(Math.round(Math.max(-1, Math.min(1, v)) * 100));
        el.setAttribute('aria-valuetext', `The sun ${describe(v)}`);
      }
      if (hinting.current) {
        hinting.current = false;
        setHint(false);
        markHintSeen();
      }
    },
    [stage],
  );

  // A sideways drag across the scene, on a touch screen or with a pen.
  useEffect(() => {
    const el = surface.current;
    if (!el || !stage) return;
    let id = -1;
    let x0 = 0;
    let y0 = 0;
    let from = 0;
    let turning = false;
    const end = () => {
      id = -1;
      turning = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      if (!turning) {
        // Decide once, after the finger has moved a little: sideways turns the light, anything else is a scroll.
        if (Math.hypot(dx, dy) < 10) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.3) return end();
        turning = true;
      }
      // Across about two-thirds of the screen turns the sun from one end of its reach to the other.
      apply(from + dx / (window.innerWidth * 0.33), true);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || id !== -1) return;
      if ((e.target as Element | null)?.closest(INTERACTIVE)) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      from = stage.lightAim;
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', end, { passive: true });
      window.addEventListener('pointercancel', end, { passive: true });
    };
    el.addEventListener('pointerdown', down, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      end();
    };
  }, [stage, surface, apply]);

  if (!stage) return null;
  return (
    <div className="fs-light" data-hint={hint || undefined}>
      <span className="fs-light-label" aria-hidden="true">
        Light
      </span>
      <input
        ref={input}
        type="range"
        className="fs-light-range"
        min={-100}
        max={100}
        step={5}
        defaultValue={0}
        aria-label={`Turn the sun over the ${label}`}
        aria-valuetext={`The sun ${describe(0)}`}
        onInput={(e) => apply(Number(e.currentTarget.value) / 100, false)}
      />
      <span className="fs-light-hint" aria-hidden="true">
        Drag sideways to turn the light
      </span>
    </div>
  );
}

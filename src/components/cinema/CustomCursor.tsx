import { useEffect, useRef } from 'react';
import { useFinePointer, useReducedMotion } from '../../motion/preferences';
import { magneticFocus } from '../../interaction/magnetic';
import { onPointerExit, onPointerMove, pointer } from '../../interaction/pointer';
import { Spring, SPRINGS, springDriver } from '../../interaction/spring';
import { INTERACTIVE } from '../../interaction/targets';
import { createTrail } from '../../interaction/trail';

/**
 * The pointer, redrawn as a survey instrument.
 *
 * At rest it is a small dot that tracks the hand exactly, with a hairline
 * reticle that follows on the cursor spring. The reticle has weight: moving
 * fast stretches it a little along the direction of travel, and pressing
 * compresses it, with one small rebound on release.
 *
 * What it does depends on what it is over:
 *
 *   idle      the reticle and its four ticks
 *   hover     anything interactive: the reticle opens
 *   label     an element that names its action (`data-cursor="Enter"`): the
 *             reticle fills and carries the word
 *   lock      a magnetic control (`data-magnetic`): the reticle leaves the
 *             hand and closes on the control as four corner marks, with the
 *             control's word set at the corner like a label on a sheet
 *   area      a region that names what the hand can do there
 *             (`data-cursor-area="Explore"`, and drag surfaces): the word is
 *             set small beside the reticle, which stays small so it never
 *             hides the map or the sphere underneath
 *   trace     the ink trail has found one of the atlas's lines (see
 *             `interaction/trail.ts`)
 *   text      a text field: the reticle steps aside for the system caret
 *
 * A press on something interactive sends out three contour rings — the
 * splash — which is the one flourish, and it only answers an action.
 *
 * Only on a mouse-like pointer with motion allowed. Touch devices and reduced
 * motion keep the system cursor, and nothing here is mounted for them.
 */
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';

export function CustomCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const enabled = fine && !reduced;

  const layerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const layer = layerRef.current!;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const body = bodyRef.current!;
    const label = labelRef.current!;
    const splashLayer = splashRef.current!;
    const trail = createTrail(trailRef.current!);
    document.documentElement.classList.add('has-custom-cursor');

    const rx = new Spring(-100, SPRINGS.cursor);
    const ry = new Spring(-100, SPRINGS.cursor);
    const press = new Spring(1, SPRINGS.release);
    let visible = false;
    let state = 'idle';
    let word = '';
    let lockSize = '';

    const render = () => {
      ring.style.transform = `translate3d(${rx.value.toFixed(2)}px, ${ry.value.toFixed(2)}px, 0)`;
      // Weight: the reticle stretches along its own velocity, not the hand's,
      // so the stretch eases away as it catches up.
      const vx = rx.velocity;
      const vy = ry.velocity;
      const speed = state === 'lock' || state === 'label' ? 0 : Math.hypot(vx, vy);
      const s = Math.min(speed / 2600, 1) * 0.22;
      const k = press.value;
      body.style.transform =
        s > 0.004
          ? `rotate(${Math.atan2(vy, vx).toFixed(3)}rad) scale(${((1 + s) * k).toFixed(3)}, ${((1 - s * 0.45) * k).toFixed(3)})`
          : `scale(${k.toFixed(3)})`;
    };
    const kick = springDriver([rx, ry, press], render);

    const setState = (next: string, nextWord: string) => {
      if (next !== state) ring.dataset.state = state = next;
      if (nextWord !== word) label.textContent = word = nextWord;
    };

    let tracing = false;
    // `moved`: the hand moved (not just the page under it). Only then is ink laid down.
    const evaluate = (moved: boolean) => {
      const target = pointer.target;
      const lock = magneticFocus();
      if (moved) tracing = trail.move();

      if (lock) {
        // Close on the control, leaning a little after the hand.
        rx.target = lock.x + (pointer.x - lock.x) * 0.12;
        ry.target = lock.y + (pointer.y - lock.y) * 0.12;
        const size = `${Math.round(lock.w + 14)}x${Math.round(lock.h + 10)}`;
        if (size !== lockSize) {
          lockSize = size;
          ring.style.setProperty('--lw', `${Math.round(lock.w + 14)}px`);
          ring.style.setProperty('--lh', `${Math.round(lock.h + 10)}px`);
        }
        setState('lock', lock.el.closest('[data-cursor]')?.getAttribute('data-cursor') ?? lock.el.querySelector('[data-cursor]')?.getAttribute('data-cursor') ?? '');
      } else {
        rx.target = pointer.x;
        ry.target = pointer.y;
        if (target?.closest(TEXT)) setState('text', '');
        else {
          const interactive = target?.closest(INTERACTIVE);
          const area = target?.closest<HTMLElement>('[data-cursor-area], [data-cursor-drag]');
          const named = interactive?.getAttribute('data-cursor');
          if (interactive && named) setState('label', named);
          else if (interactive) setState('hover', '');
          else if (tracing) setState('trace', 'Trace');
          else if (area) setState('area', area.dataset.cursorArea || 'Drag');
          else setState('idle', '');
        }
      }
      kick();
    };

    const offMove = onPointerMove((e) => {
      if (e.pointerType !== 'mouse') return;
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      if (!visible) {
        visible = true;
        rx.jump(e.clientX);
        ry.jump(e.clientY);
        layer.dataset.visible = 'true';
      }
      evaluate(true);
    });

    const offExit = onPointerExit(() => {
      visible = false;
      layer.dataset.visible = 'false';
    });

    // Scrolling moves the page under a still hand, so what is under it changes,
    // but the browser does not re-target the pointer until it next moves. A
    // hit test every frame of a scroll costs frames, so it is checked a few
    // times a second instead — a reticle that catches up a beat late reads
    // as weight, not lag.
    let scrollTimer = 0;
    const recheck = () => {
      scrollTimer = 0;
      if (!visible) return;
      const under = document.elementFromPoint(pointer.x, pointer.y);
      if (under) pointer.target = under;
      tracing = false;
      evaluate(false);
    };
    const onScroll = () => {
      if (visible && !scrollTimer) scrollTimer = window.setTimeout(recheck, 140);
    };

    const splash = (cx: number, cy: number) => {
      const node = document.createElement('div');
      node.className = 'cursor-splash';
      node.style.left = `${cx}px`;
      node.style.top = `${cy}px`;
      node.innerHTML = '<span></span><span></span><span></span>';
      splashLayer.appendChild(node);
      window.setTimeout(() => node.remove(), 1100);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      press.target = 0.72;
      kick();
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(INTERACTIVE) || target?.closest('[data-cursor-drag]')) splash(e.clientX, e.clientY);
    };
    const onUp = () => {
      press.target = 1;
      kick();
    };

    // A page change replaces what is under a still hand, too.
    window.addEventListener('atlas:navigation:start', onScroll);
    window.addEventListener('atlas:navigation:end', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      offMove();
      offExit();
      window.clearTimeout(scrollTimer);
      trail.dispose();
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('atlas:navigation:start', onScroll);
      window.removeEventListener('atlas:navigation:end', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={layerRef} aria-hidden="true" className="cursor-layer" data-visible="false">
      <canvas ref={trailRef} className="cursor-trail" />
      <div ref={splashRef} />
      <div ref={ringRef} className="cursor-ring" data-state="idle">
        <div ref={bodyRef} className="cursor-ring-body">
          <span className="cursor-ring-shape" />
        </div>
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}

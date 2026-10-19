import { prefersReducedMotion } from '../motion/preferences';
import { emit } from './events';
import { INTERACTIVE, kindOf } from './targets';

/**
 * Every control's states, from one delegated listener.
 *
 * Rather than each button tracking hover and press for itself, the document
 * writes `data-ix` on whichever control the pointer is acting on:
 *
 *   (none)     idle
 *   hover      the pointer is over it (mouse and pen)
 *   press      held down — CSS compresses it
 *   release    just let go — CSS lets it spring back, once
 *
 * Focus stays with `:focus-visible`, which the browser already gets right for
 * keyboards. Each change is announced on the interaction stream
 * (`interaction:hover`, `interaction:press`, `interaction:click`) for a future
 * sound layer.
 *
 * On touch there is no cursor, so a press leaves a small survey mark where
 * the finger landed — the touch equivalent of the reticle's splash.
 */
let installed = false;
let hovered: Element | null = null;
let pressed: Element | null = null;
let releaseTimer = 0;

function set(el: Element, state: string | null) {
  const h = el as HTMLElement;
  if (state) h.dataset.ix = state;
  else delete h.dataset.ix;
}

function touchMark(x: number, y: number) {
  const node = document.createElement('div');
  node.className = 'touch-mark';
  node.setAttribute('aria-hidden', 'true');
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.innerHTML = '<span></span><span></span>';
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 900);
}

export function installInteractionState() {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener(
    'pointerover',
    (e) => {
      if (e.pointerType === 'touch') return;
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (el === hovered) return;
      if (hovered && hovered !== pressed) set(hovered, null);
      hovered = el;
      if (el && el !== pressed) {
        set(el, 'hover');
        emit('interaction:hover', { el, kind: kindOf(el) });
      }
    },
    { passive: true },
  );

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return;
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (!el) return;
      window.clearTimeout(releaseTimer);
      if (pressed && pressed !== el) set(pressed, null);
      pressed = el;
      set(el, 'press');
      emit('interaction:press', { el, kind: kindOf(el), pointer: e.pointerType });
      if (e.pointerType === 'touch' && !prefersReducedMotion()) touchMark(e.clientX, e.clientY);
    },
    { passive: true },
  );

  const release = (e: PointerEvent) => {
    const el = pressed;
    if (!el) return;
    pressed = null;
    set(el, 'release');
    releaseTimer = window.setTimeout(() => {
      if (el.getAttribute('data-ix') !== 'release') return;
      set(el, el === hovered && e.pointerType !== 'touch' ? 'hover' : null);
    }, 420);
  };
  document.addEventListener('pointerup', release, { passive: true });
  document.addEventListener('pointercancel', release, { passive: true });

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (el) emit('interaction:click', { el, kind: kindOf(el) });
    },
    { passive: true, capture: true },
  );
}

import type { NavigateFunction } from 'react-router-dom';
import { emit, on } from '../../interaction/events';
import { prefersReducedMotion } from '../../motion/preferences';
import { loadStageModule } from './useFieldStage';

/**
 * Going into a field study, coming back out of it, and walking from one
 * straight into the next.
 *
 * These are not page turns (interaction/RouteTransition.tsx draws a ruled
 * line and closes the sheet). A field study is entered *through its world*:
 * the camera that was previewing it on the index moves into its first shot,
 * the stage is held over the screen while the route changes underneath, and
 * the study's page arrives already standing in the world. Leaving reverses
 * the same move: the camera retreats to the preview, the index returns
 * around it at the study the reader came from. One study gives way to the
 * next by the world itself turning into the next (gl/composite.ts).
 *
 * The links that start these carry `data-transition="none"`, so the page-turn
 * leaves them alone. Without WebGL, or with the stage unavailable, they are
 * ordinary navigations. RouteTransition still hears the route change: it
 * announces the new page, moves focus to its main landmark and emits
 * `navigation:end`, exactly as after a page turn.
 */

let returnTo: string | null = null;
let busy = false;

/** The study the index should open at, once (set when leaving a study). */
export function takeReturn(): string | null {
  const id = returnTo;
  returnTo = null;
  return id;
}

export function preloadStudyPage() {
  void import('../../pages/FieldStudyPage');
  void loadStageModule();
}

/**
 * Give the screen back to the page once the route has settled
 * (RouteTransition announces it, moves focus and emits `navigation:end`).
 */
export function releaseOnArrival(release: () => void, timeout = 1500): () => void {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    off();
    window.clearTimeout(timer);
    requestAnimationFrame(release);
  };
  const off = on('navigation:end', finish);
  const timer = window.setTimeout(finish, timeout);
  return finish;
}

async function stageOrNull() {
  try {
    const m = await loadStageModule();
    return m.getFieldStage();
  } catch {
    return null;
  }
}

/** From the index into a study: the camera enters the world. */
export async function enterStudy(navigate: NavigateFunction, id: string, onLeave?: () => void) {
  if (busy) return;
  busy = true;
  try {
    const stage = await stageOrNull();
    const path = `/field/${id}`;
    onLeave?.();
    if (stage && stage.showing === id) {
      await Promise.all([import('../../pages/FieldStudyPage'), stage.enter(1, prefersReducedMotion() ? 0 : 1250)]);
      stage.hold();
    }
    emit('navigation:start', { from: '/', to: path });
    navigate(path);
  } finally {
    busy = false;
  }
}

/**
 * The study's words, scrim and furniture fade (`.fs-study.is-leaving`) before the world is lifted over the page:
 * lifted at once, everything that shaded it vanished in one frame and the light jumped.
 */
function clearPage(): Promise<void> {
  return prefersReducedMotion() ? Promise.resolve() : new Promise((r) => window.setTimeout(r, 450));
}

/** Out of a study, back to the index: the camera retreats to the preview. */
export async function exitStudy(navigate: NavigateFunction, id: string, onLeave?: () => void) {
  if (busy) return;
  busy = true;
  try {
    const stage = await stageOrNull();
    onLeave?.();
    if (stage && stage.showing === id) {
      await clearPage();
      stage.hold();
      await stage.enter(0, prefersReducedMotion() ? 0 : 1300);
    }
    returnTo = id;
    emit('navigation:start', { from: `/field/${id}`, to: '/' });
    navigate('/');
  } finally {
    busy = false;
  }
}

/** From the end of one study straight into the next: one world turns into the other. */
export async function nextStudy(navigate: NavigateFunction, from: string, to: string, onLeave?: () => void) {
  if (busy) return;
  busy = true;
  try {
    const stage = await stageOrNull();
    onLeave?.();
    if (stage) {
      await clearPage();
      stage.hold();
      await stage.show(to, { duration: prefersReducedMotion() ? 0 : 1500, reset: { progress: 0, enter: 1, engage: 0, drag: 0 } });
    }
    emit('navigation:start', { from: `/field/${from}`, to: `/field/${to}` });
    navigate(`/field/${to}`);
  } finally {
    busy = false;
  }
}

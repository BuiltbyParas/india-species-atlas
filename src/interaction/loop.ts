/**
 * The interaction engine's one frame loop.
 *
 * Everything that moves in response to the hand — the cursor, magnetic
 * controls, tilting photographs, the ink trail, a line being bent — steps
 * here, on a single `requestAnimationFrame`. A task returns `true` while it
 * still has somewhere to go and `false` once it has settled; when the last
 * task settles the loop stops asking for frames, so a page that is not being
 * touched costs nothing. (The 3D scenes keep their own render-on-demand loops;
 * this one never draws WebGL.)
 *
 * Time is passed in seconds and clamped, so motion is the same at 60 Hz and
 * 120 Hz, and a tab returning from the background does not leap.
 */
export type FrameTask = (dt: number, now: number) => boolean;

const tasks = new Set<FrameTask>();
let raf = 0;
let last = 0;

function frame(now: number) {
  raf = 0;
  const dt = last ? Math.min(Math.max((now - last) / 1000, 0), 1 / 24) : 1 / 60;
  last = now;
  for (const task of [...tasks]) {
    if (!task(dt, now)) tasks.delete(task);
  }
  if (tasks.size) raf = requestAnimationFrame(frame);
  else last = 0;
}

/** Run `task` every frame until it returns false. Adding a running task is a no-op. */
export function schedule(task: FrameTask): () => void {
  tasks.add(task);
  if (!raf) raf = requestAnimationFrame(frame);
  return () => {
    tasks.delete(task);
  };
}

/** For tests and the performance notes: how many tasks are stepping right now. */
export function activeTasks(): number {
  return tasks.size;
}

/**
 * Lets a long build share the main thread.
 *
 * A world is made in an idle moment while the reader may be scrolling, so a
 * loop that samples the ground a few hundred thousand times must not hold the
 * thread for half a second. `turn()` returns a function to call every few
 * hundred iterations: it does nothing until `budget` milliseconds have gone
 * by since the last hand-back, then gives the browser a turn (a frame, an
 * input) and carries on. The loop's results are exactly what they were.
 */
export function turn(budget = 8): () => Promise<void> {
  let since = performance.now();
  const give = () => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    return s?.yield ? s.yield() : new Promise<void>((resolve) => setTimeout(resolve, 0));
  };
  return async () => {
    if (performance.now() - since < budget) return;
    await give();
    since = performance.now();
  };
}

/** What counts as something the reader can act on, for the cursor and the state machine. */
export const INTERACTIVE =
  'a[href], button, [role="button"], [role="tab"], [role="option"], input, select, textarea, label, summary, [data-cursor]';

/** A word for what pressing `el` does, for the event stream. */
export function kindOf(el: Element): string {
  return (
    el.getAttribute('data-cursor') ??
    el.getAttribute('role') ??
    (el.tagName === 'A' ? 'link' : el.tagName.toLowerCase())
  );
}

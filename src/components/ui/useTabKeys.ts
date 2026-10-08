import type { KeyboardEvent } from 'react';

/**
 * Keyboard behaviour for a row of tabs, per the WAI-ARIA tabs pattern: one
 * tab in the page's tab order at a time (the selected one), arrow keys move
 * between tabs and select as they go, Home and End jump to the ends.
 *
 * Returns the props each tab spreads, so a tablist keeps its own markup and
 * look and only borrows the behaviour.
 */
export function useTabKeys<T extends string>(ids: readonly T[], active: T, onChange: (id: T) => void) {
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const i = ids.indexOf(active);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(ids[next]);
    const list = e.currentTarget.closest('[role="tablist"]');
    requestAnimationFrame(() => list?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus());
  };
  return (id: T) => ({
    role: 'tab' as const,
    'aria-selected': id === active,
    tabIndex: id === active ? 0 : -1,
    onKeyDown,
  });
}

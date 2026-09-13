import { useCallback, useSyncExternalStore } from 'react';
import { SPECIES_BY_ID } from '../data/species';

/**
 * Saved species ("favourites"), kept in this browser only.
 *
 * There are no accounts in this project and no server to write to, so a saved
 * list lives in `localStorage` and travels between people as a link instead
 * (see `shareUrl`). Every read is defensive: a private window, a cleared
 * profile or a storage quota error must leave the atlas working, just without
 * a saved list.
 *
 * The store is module-level rather than per-component so that the heart on a
 * card, the heart in the open profile and the counter in the toolbar are the
 * same state, not three copies of it.
 */

const KEY = 'isa:favourites';

function readStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop ids that are no longer in the dataset, so a removed species cannot
    // leave a phantom entry in the count.
    return parsed.filter((id): id is string => typeof id === 'string' && !!SPECIES_BY_ID[id]);
  } catch {
    return [];
  }
}

let snapshot: string[] = typeof window === 'undefined' ? [] : readStorage();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function write(next: string[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Saving is a convenience; losing it must not break the page. */
  }
  emit();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab of the atlas writing the same key should update this one.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = readStorage();
    emit();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

const EMPTY: string[] = [];
const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

export function useFavourites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    if (!SPECIES_BY_ID[id]) return;
    write(snapshot.includes(id) ? snapshot.filter((v) => v !== id) : [...snapshot, id]);
  }, []);

  const addMany = useCallback((incoming: string[]) => {
    const valid = incoming.filter((id) => SPECIES_BY_ID[id] && !snapshot.includes(id));
    if (valid.length === 0) return;
    write([...snapshot, ...valid]);
  }, []);

  const clear = useCallback(() => write([]), []);

  const isFavourite = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, count: ids.length, isFavourite, toggle, addMany, clear };
}

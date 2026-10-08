import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, X, Shuffle } from 'lucide-react';
import { SPECIES, SPECIES_BY_ID } from '../../data/species';
import { SpeciesProfile } from './SpeciesProfile';
import { lockScroll } from '../../motion/SmoothScroll';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

interface SpeciesProfileContextValue {
  open: (id: string) => void;
  openRandom: () => void;
  close: () => void;
  currentId: string | null;
}

const SpeciesProfileContext = createContext<SpeciesProfileContextValue | null>(null);

export function useSpeciesProfile() {
  const ctx = useContext(SpeciesProfileContext);
  if (!ctx) throw new Error('useSpeciesProfile must be used inside <SpeciesProfileProvider>');
  return ctx;
}

export function SpeciesProfileProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentId = searchParams.get('species');

  const setCurrentId = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('species', id);
          else next.delete('species');
          return next;
        },
        { replace: !id },
      );
    },
    [setSearchParams],
  );

  const close = useCallback(() => setCurrentId(null), [setCurrentId]);
  const open = useCallback(
    (id: string) => {
      if (SPECIES_BY_ID[id]) setCurrentId(id);
    },
    [setCurrentId],
  );
  const openRandom = useCallback(() => {
    const pool = SPECIES.filter((s) => s.id !== currentId);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? SPECIES[0];
    setCurrentId(pick.id);
  }, [currentId, setCurrentId]);

  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = Boolean(currentId);

  // A modal dialog in the full sense: focus moves into it when it opens, Tab
  // and Shift+Tab stay inside it, Escape closes it, and focus goes back to
  // whatever opened it. The page behind is held still, Lenis included.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    requestAnimationFrame(() => panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    lockScroll(true);
    return () => {
      document.removeEventListener('keydown', onKey);
      lockScroll(false);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen, close]);

  const value = useMemo(
    () => ({ open, openRandom, close, currentId }),
    [open, openRandom, close, currentId],
  );

  const species = currentId ? SPECIES_BY_ID[currentId] : null;

  return (
    <SpeciesProfileContext.Provider value={value}>
      {children}

      {species && (
        <div className="fixed inset-0 z-(--z-dialog) flex justify-end" role="dialog" aria-modal="true" aria-label={`${species.commonName} profile`}>
          <button
            type="button"
            aria-label="Close species profile"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-forest-950/70 backdrop-blur-sm"
          />
          <div ref={panelRef} className="relative flex w-full max-w-xl flex-col border-l border-canvas/10 bg-forest-900 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between gap-3 border-b border-canvas/10 px-5 py-2">
              <p className="caps">Species profile</p>
              <div className="flex items-center gap-1">
                <Link
                  to={`/species/${species.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-xs font-medium text-canvas/70 hover:bg-forest-800 hover:text-canvas"
                >
                  Full page
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={openRandom}
                  className="inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-xs font-medium text-canvas/70 hover:bg-forest-800 hover:text-canvas"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  Another
                </button>
                <button
                  type="button"
                  onClick={close}
                  data-autofocus
                  className="grid h-10 w-10 place-items-center rounded-xs text-canvas/70 hover:bg-forest-800 hover:text-canvas"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="scroll-slim flex-1 overflow-y-auto">
              <SpeciesProfile key={species.id} species={species} />
            </div>
          </div>
        </div>
      )}
    </SpeciesProfileContext.Provider>
  );
}

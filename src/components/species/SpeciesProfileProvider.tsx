import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Shuffle } from 'lucide-react';
import { SPECIES, SPECIES_BY_ID } from '../../data/species';
import { SpeciesProfile } from './SpeciesProfile';

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

  useEffect(() => {
    if (!currentId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [currentId, close]);

  const value = useMemo(
    () => ({ open, openRandom, close, currentId }),
    [open, openRandom, close, currentId],
  );

  const species = currentId ? SPECIES_BY_ID[currentId] : null;

  return (
    <SpeciesProfileContext.Provider value={value}>
      {children}

      {species && (
        <div className="fixed inset-0 z-[1200] flex justify-end" role="dialog" aria-modal="true" aria-label={`${species.commonName} profile`}>
          <button
            type="button"
            aria-label="Close species profile"
            onClick={close}
            className="absolute inset-0 bg-forest-950/70 backdrop-blur-sm"
          />
          <div className="relative flex w-full max-w-xl flex-col border-l border-forest-700 bg-forest-900 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between gap-3 border-b border-forest-700 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-forest-400">Species profile</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={openRandom}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-canvas/70 hover:bg-forest-800 hover:text-canvas"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  Another
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md p-1.5 text-canvas/70 hover:bg-forest-800 hover:text-canvas"
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

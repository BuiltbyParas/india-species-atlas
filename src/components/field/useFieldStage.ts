import { useEffect, useState, type RefObject } from 'react';
import type { FieldStage } from '../../world/field/stage';

/**
 * The field stage, for a component that shows it.
 *
 * three.js and the stage arrive in their own lazy chunk the first time a
 * component asks; until then — and for good where WebGL is unavailable or the
 * stage has given up — `status` is `flat` or `loading` and the component shows
 * its flat composition instead. Attaching makes the stage paint behind the
 * host element and follow it as the page scrolls.
 */
let loading: Promise<typeof import('../../world/field/stage')> | null = null;

export function loadStageModule() {
  loading ??= import('../../world/field/stage');
  return loading;
}

export type StageStatus = 'loading' | 'ready' | 'flat';

export function useFieldStage(hostRef: RefObject<HTMLElement | null>, enabled = true): { stage: FieldStage | null; status: StageStatus } {
  const [stage, setStage] = useState<FieldStage | null>(null);
  const [status, setStatus] = useState<StageStatus>('loading');

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadStageModule()
      .then((m) => {
        if (!live) return;
        const s = m.getFieldStage();
        setStage(s);
        setStatus(s ? 'ready' : 'flat');
      })
      .catch(() => live && setStatus('flat'));
    return () => {
      live = false;
    };
  }, [enabled]);

  useEffect(() => {
    const host = hostRef.current;
    if (!stage || !host) return;
    const offFail = stage.onFail(() => setStatus('flat'));
    const detach = stage.attach(host);
    return () => {
      offFail();
      detach();
    };
  }, [stage, hostRef]);

  return { stage, status };
}

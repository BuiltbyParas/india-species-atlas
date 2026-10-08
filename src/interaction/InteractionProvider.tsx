import { useEffect } from 'react';
import { installDepth } from './depth';
import { installMagnetic } from './magnetic';
import { installInteractionState } from './state';

/**
 * Installs the interaction engine once for the whole site: control states and
 * touch marks, magnetic controls and hover depth. Each is a single delegated
 * listener on the shared pointer store; components opt in with attributes
 * (`data-magnetic`, `data-depth`, `data-cursor`, `data-cursor-area`,
 * `data-trail`) rather than by wiring physics of their own.
 *
 * See documentation/INTERACTION_ENGINE.md.
 */
export function InteractionProvider() {
  useEffect(() => {
    installInteractionState();
    installMagnetic();
    installDepth();
  }, []);
  return null;
}

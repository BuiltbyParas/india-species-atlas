import { useEffect } from 'react';
import { installDepth } from './depth';
import { installMagnetic } from './magnetic';
import { installInteractionState } from './state';
import { installEnvironments } from '../world/environment';
import { qualityTier } from '../world/quality';

/**
 * Installs the interaction engine once for the whole site: control states and
 * touch marks, magnetic controls, hover depth and the environment observer. Each is a single delegated
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
    installEnvironments();
    // Decide the device's tier once, up front, so CSS can read <html data-quality> before any scene loads.
    qualityTier();
  }, []);
  return null;
}

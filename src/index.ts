// ============================================================
// DENDRON SDK — PUBLIC API ENTRY POINT
// @dendron-sdk/core v1.0
// ============================================================

export { DendronSDK } from './dendron';
export type {
  DendronConfig,
  DendronResolvedConfig,
  DendronContextPayload,
  SmartCard,
  SmartCardType,
  SmartCardAction,
  GreetingCard,
  FeatureCard,
  PricingCard,
  EngagementCard,
  ComparisonCard,
  SectionContext,
  InteractionEvent,
  TrackingConfig,
  IntentConfig,
  StorageConfig,
  UIConfig,
  DendronEventMap,
  DendronEventName,
} from './types';

// ─── Convenience singleton ────────────────────────────────────
// Developers typically use Dendron.init() directly,
// mirroring the usage in the PRD examples.

import { DendronSDK } from './dendron';
import type { DendronConfig, DendronEventMap, DendronEventName } from './types';

const _instance = new DendronSDK();

/**
 * Dendron — Zero-Liability Behavioral Intelligence SDK
 *
 * @example
 * ```js
 * Dendron.init({
 *   onQuery: async (payload) => {
 *     const res = await fetch('/api/ai-proxy', {
 *       method: 'POST',
 *       body: JSON.stringify(payload)
 *     });
 *     return res.json();
 *   }
 * });
 * ```
 */
export const Dendron = {
  /**
   * Initialize Dendron on the current page.
   * Must be called once, after the DOM is ready.
   */
  init(config: DendronConfig): void {
    _instance.init(config);
  },

  /**
   * Subscribe to Dendron lifecycle events.
   * Returns an unsubscribe function.
   */
  on<K extends DendronEventName>(
    event: K,
    handler: (data: DendronEventMap[K]) => void
  ): () => void {
    return _instance.on(event, handler);
  },

  /**
   * Destroy Dendron, unmount the widget, and clean up all listeners.
   * Call this before re-initializing or on page unload.
   */
  destroy(): void {
    _instance.destroy();
  },
} as const;

export default Dendron;

// ============================================================
// DENDRON SDK — TRACKER MODULE: COORDINATOR
// Instantiates the Web Worker, mounts main-thread listeners,
// and bridges messages between them.
// ============================================================

import { mountAllListeners } from './listeners';
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  DendronResolvedConfig,
  DendronContextPayload,
  BehavioralState,
} from '../types';

export class TrackerModule {
  private worker: Worker | null = null;
  private cleanupListeners: (() => void) | null = null;
  private onTrigger: ((payload: DendronContextPayload) => void) | null = null;
  private onStateUpdate: ((state: BehavioralState) => void) | null = null;

  init(
    config: DendronResolvedConfig,
    onTrigger: (payload: DendronContextPayload) => void,
    onStateUpdate?: (state: BehavioralState) => void
  ): void {
    this.onTrigger = onTrigger;
    this.onStateUpdate = onStateUpdate ?? null;

    // Create inline worker from source using a blob URL
    // In production build, the worker code is bundled separately
    this.worker = this.createWorker();

    this.worker.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
      const msg = e.data;
      if (msg.type === 'trigger') {
        // Enrich payload with page info (only accessible on main thread)
        const enriched: DendronContextPayload = {
          ...msg.payload,
          page: {
            ...msg.payload.page,
            url: window.location.href,
            title: document.title,
          },
        };
        this.onTrigger?.(enriched);
      } else if (msg.type === 'state_update') {
        this.onStateUpdate?.(msg.state);
      } else if (msg.type === 'error') {
        console.error('[Dendron Worker]', msg.message);
      }
    };

    this.worker.onerror = (err) => {
      console.error('[Dendron Worker Error]', err.message);
    };

    // Send config to worker
    this.postToWorker({ type: 'config', config });

    // Mount all main-thread listeners
    this.cleanupListeners = mountAllListeners(
      (msg) => this.postToWorker(msg),
      config.tracking
    );
  }

  private createWorker(): Worker {
    // In production, this would be the pre-built worker file
    // For inline usage, we use a blob URL with the worker source
    try {
      return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      // Fallback: inline worker string (populated by build tooling)
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      return new Worker(URL.createObjectURL(blob));
    }
  }

  private postToWorker(msg: WorkerInboundMessage): void {
    if (!this.worker) return;
    try {
      this.worker.postMessage(msg);
    } catch (err) {
      console.warn('[Dendron] Failed to post to worker:', err);
    }
  }

  manualTrigger(reason: 'user_action' | 'timer' = 'user_action'): void {
    // Force a trigger from main thread (e.g., FAB click)
    // We can't directly fire trigger from worker, so we post a special signal
    // The worker will handle it by ignoring the threshold check
    void reason; // used when building payload in renderer
    // The renderer calls onQuery directly for manual triggers
  }

  destroy(): void {
    this.cleanupListeners?.();
    this.cleanupListeners = null;

    if (this.worker) {
      this.worker.postMessage({ type: 'reset' } satisfies WorkerInboundMessage);
      this.worker.terminate();
      this.worker = null;
    }

    this.onTrigger = null;
    this.onStateUpdate = null;
  }
}

// ─── Worker source code stub ─────────────────────────────────
// In the real build, rollup-plugin-web-worker-loader inlines the
// compiled worker code here. This stub prevents import errors
// in environments that don't support module workers.
const WORKER_CODE = `
// Dendron Worker v1.0 — built by rollup
// (source: src/tracker/worker.ts)
// This placeholder is replaced during the build process.
self.onmessage = function(e) {
  if (e.data.type === 'config') {
    console.warn('[Dendron] Using stub worker — run npm run build for production.');
  }
};
`;

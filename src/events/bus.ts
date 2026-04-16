// ============================================================
// DENDRON SDK — INTERNAL EVENT BUS
// Lightweight, typed event emitter for inter-module communication.
// No external dependencies. Modules communicate only through this bus.
// ============================================================

import type { DendronEventMap, DendronEventName, DendronEventHandler } from '../types';

type AnyHandler = (data: unknown) => void;

export class EventBus {
  private handlers: Map<string, Set<AnyHandler>> = new Map();

  on<K extends DendronEventName>(
    event: K,
    handler: DendronEventHandler<K>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as AnyHandler);
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off<K extends DendronEventName>(
    event: K,
    handler: DendronEventHandler<K>
  ): void {
    this.handlers.get(event)?.delete(handler as AnyHandler);
  }

  emit<K extends DendronEventName>(
    event: K,
    data: DendronEventMap[K]
  ): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[Dendron] Error in handler for "${event}":`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  listenerCount(event: DendronEventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

// Singleton instance shared across the SDK
export const bus = new EventBus();

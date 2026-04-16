// ============================================================
// DENDRON SDK — TEST SETUP
// jsdom environment augmentations for browser APIs
// ============================================================

import { vi } from 'vitest';

// ─── Mock IntersectionObserver ────────────────────────────────
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements: Set<Element> = new Set();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(el: Element) {
    this.elements.add(el);
  }
  unobserve(el: Element) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
  }

  // Test utility: simulate entries
  trigger(entries: IntersectionObserverEntry[]) {
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// ─── Mock MutationObserver ────────────────────────────────────
class MockMutationObserver {
  callback: MutationCallback;
  constructor(callback: MutationCallback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
  takeRecords(): MutationRecord[] {
    return [];
  }
}

global.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;

// ─── Mock requestAnimationFrame ───────────────────────────────
global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  return setTimeout(() => cb(performance.now()), 0);
}) as typeof requestAnimationFrame;

global.cancelAnimationFrame = ((id: number) => {
  clearTimeout(id);
}) as typeof cancelAnimationFrame;

// ─── Mock Worker ──────────────────────────────────────────────
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
}

global.Worker = MockWorker as unknown as typeof Worker;

// ─── Mock crypto.randomUUID ───────────────────────────────────
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// ─── Mock IndexedDB (minimal) ─────────────────────────────────
const mockIndexedDB = {
  open: vi.fn(() => {
    const req = {
      result: null as unknown,
      error: null as unknown,
      onsuccess: null as ((e: Event) => void) | null,
      onerror: null as ((e: Event) => void) | null,
      onupgradeneeded: null as ((e: Event) => void) | null,
    };
    setTimeout(() => {
      req.result = {
        objectStoreNames: { contains: () => false },
        createObjectStore: () => ({
          createIndex: vi.fn(),
        }),
        transaction: () => ({
          objectStore: () => ({
            get: vi.fn(() => ({ onsuccess: null, onerror: null, result: null })),
            put: vi.fn(),
            delete: vi.fn(),
            getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          }),
          oncomplete: null,
          onerror: null,
        }),
        close: vi.fn(),
      };
      req.onsuccess?.({ target: req } as unknown as Event);
    }, 0);
    return req;
  }),
};

Object.defineProperty(global, 'indexedDB', { value: mockIndexedDB });

// ─── Mock URL.createObjectURL ─────────────────────────────────
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// ─── Performance.now polyfill (already in jsdom but ensure) ───
if (!global.performance) {
  global.performance = { now: () => Date.now() } as Performance;
}

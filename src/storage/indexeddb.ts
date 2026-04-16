// ============================================================
// DENDRON SDK — INDEXEDDB STORAGE
// LRU-evicted, TTL-based storage for micro-embeddings.
// Max 25MB, 7-day TTL, cleanup every 5 minutes.
// ============================================================

import type { EmbeddingEntry, StorageConfig } from '../types';

const DB_NAME = 'dendron_v1';
const STORE_NAME = 'embeddings';
const DB_VERSION = 1;

export class DendronStorage {
  private db: IDBDatabase | null = null;
  private config: StorageConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve();
      };

      req.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }

  async get(key: string): Promise<EmbeddingEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const entry: EmbeddingEntry | undefined = req.result;
        if (!entry) {
          resolve(null);
          return;
        }

        // Update LRU timestamp
        entry.lastAccessedAt = Date.now();
        store.put(entry);
        resolve(entry);
      };

      req.onerror = () => resolve(null);
    });
  }

  async put(key: string, vector: Float32Array): Promise<void> {
    if (!this.db) return;

    const entry: EmbeddingEntry = {
      key,
      vector,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // Fail silently
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async getAll(): Promise<EmbeddingEntry[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    });
  }

  async estimateSizeBytes(): Promise<number> {
    const all = await this.getAll();
    // Float32Array: 4 bytes per element + overhead
    return all.reduce((acc, entry) => acc + entry.vector.byteLength + 256, 0);
  }

  async runEviction(): Promise<void> {
    if (!this.db) return;

    const now = Date.now();
    const ttlMs = this.config.embeddingTTLDays * 24 * 60 * 60 * 1000;
    const maxBytes = this.config.maxStorageMB * 1024 * 1024;

    const all = await this.getAll();

    // Step 1: Remove expired entries (TTL)
    const expired = all.filter((e) => now - e.lastAccessedAt > ttlMs);
    for (const entry of expired) {
      await this.delete(entry.key);
    }

    // Step 2: LRU eviction if still over budget
    const remaining = all.filter((e) => !expired.includes(e));
    const sortedByLRU = remaining.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

    let usedBytes = sortedByLRU.reduce((acc, e) => acc + e.vector.byteLength + 256, 0);
    let i = 0;

    while (usedBytes > maxBytes && i < sortedByLRU.length) {
      const victim = sortedByLRU[i++];
      usedBytes -= victim.vector.byteLength + 256;
      await this.delete(victim.key);
    }
  }

  startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    // Run immediately, then on interval
    this.runEviction().catch(() => {});
    this.cleanupTimer = setInterval(
      () => this.runEviction().catch(() => {}),
      this.config.cleanupIntervalMinutes * 60 * 1000
    );
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.db?.close();
    this.db = null;
  }
}

// ============================================================
// DENDRON SDK — INDEXEDDB STORAGE TESTS
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DendronStorage } from '../src/storage/indexeddb';
import type { StorageConfig } from '../src/types';

const defaultStorageConfig: StorageConfig = {
  maxStorageMB: 25,
  embeddingTTLDays: 7,
  cleanupIntervalMinutes: 5,
};

describe('DendronStorage', () => {
  let storage: DendronStorage;

  beforeEach(() => {
    storage = new DendronStorage(defaultStorageConfig);
  });

  it('should construct with config', () => {
    expect(storage).toBeDefined();
  });

  it('should open without throwing', async () => {
    // Our mock IndexedDB in setup.ts supports this
    await expect(storage.open()).resolves.toBeUndefined();
  });

  it('should return null from get when db is not open', async () => {
    // db is null before open()
    const result = await storage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should return empty array from getAll when db is not open', async () => {
    const result = await storage.getAll();
    expect(result).toEqual([]);
  });

  it('should estimate zero size when db is not open', async () => {
    const size = await storage.estimateSizeBytes();
    expect(size).toBe(0);
  });

  it('should not throw on destroy before open', () => {
    expect(() => storage.destroy()).not.toThrow();
  });

  it('should handle cleanup timer lifecycle', () => {
    // startCleanupTimer before open should not crash
    expect(() => storage.startCleanupTimer()).not.toThrow();
    storage.destroy();
  });

  it('should accept custom config values', () => {
    const custom: StorageConfig = {
      maxStorageMB: 10,
      embeddingTTLDays: 3,
      cleanupIntervalMinutes: 1,
    };
    const s = new DendronStorage(custom);
    expect(s).toBeDefined();
  });
});

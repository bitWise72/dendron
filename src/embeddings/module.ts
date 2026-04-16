// ============================================================
// DENDRON SDK — MICRO-EMBEDDINGS MODULE
// Generates small vector representations of behavioral patterns.
// Uses Transformers.js (quantized, ≤25MB) loaded lazily on
// first trigger — NOT on page load.
// Runs in the Web Worker thread; this module is worker-safe.
// ============================================================

import type { DendronContextPayload } from '../types';
import { DendronStorage } from '../storage/indexeddb';
import type { StorageConfig } from '../types';

// We dynamically import Transformers.js to avoid bundling it by default
// The developer can opt-in to embeddings by including the optional chunk
type Pipeline = (text: string) => Promise<{ data: Float32Array }[]>;

let pipelineInstance: Pipeline | null = null;
let pipelineLoading = false;
let pipelineLoadPromise: Promise<Pipeline | null> | null = null;

async function loadPipeline(): Promise<Pipeline | null> {
  if (pipelineInstance) return pipelineInstance;
  if (pipelineLoading && pipelineLoadPromise) return pipelineLoadPromise;

  pipelineLoading = true;
  pipelineLoadPromise = (async () => {
    try {
      // Dynamically import to tree-shake if not used
      const { pipeline } = await import('@xenova/transformers');

      // Load a small, quantized sentence embedding model (≤25MB)
      const p = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          quantized: true,
          progress_callback: undefined, // Silence progress in production
        }
      ) as unknown as Pipeline;

      pipelineInstance = p;
      return p;
    } catch (_err) {
      console.warn('[Dendron] Micro-embeddings not available (Transformers.js not installed). Skipping.');
      return null;
    }
  })();

  return pipelineLoadPromise;
}

// ─── Behavioral text representation ─────────────────────────
function contextToText(payload: DendronContextPayload): string {
  const sections = payload.page.sections
    .filter((s) => s.readingTime > 0)
    .map((s) => `${s.id}(${Math.round(s.readingTime)}s)`)
    .join(', ');

  return [
    `focus:${payload.visitor.focusSection}`,
    `intent:${payload.visitor.intentScore}`,
    `scroll:${payload.visitor.scrollDepth}%`,
    `reading:${Math.round(payload.visitor.totalReadingTime)}s`,
    sections ? `sections:${sections}` : '',
  ].filter(Boolean).join(' ');
}

// ─── Cosine similarity ───────────────────────────────────────
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Main Module Class ────────────────────────────────────────

export class MicroEmbeddingsModule {
  private storage: DendronStorage | null = null;
  private enabled = false;

  async init(storageConfig: StorageConfig, enabled = true): Promise<void> {
    this.enabled = enabled;
    if (!enabled) return;

    this.storage = new DendronStorage(storageConfig);
    try {
      await this.storage.open();
      this.storage.startCleanupTimer();
    } catch {
      // Storage not available — degrade gracefully
      this.storage = null;
    }
  }

  async embed(payload: DendronContextPayload): Promise<Float32Array | null> {
    if (!this.enabled) return null;

    const text = contextToText(payload);
    const cacheKey = `emb:${payload.sessionId}:${Math.floor(payload.timestamp / 10000)}`;

    // Check cache
    const cached = await this.storage?.get(cacheKey);
    if (cached) return cached.vector;

    const pipeline = await loadPipeline();
    if (!pipeline) return null;

    try {
      const output = await pipeline(text);
      const vector = output[0].data;

      // Persist to storage
      if (this.storage) {
        await this.storage.put(cacheKey, vector);
      }

      return vector;
    } catch (err) {
      console.warn('[Dendron] Embedding failed:', err);
      return null;
    }
  }

  async findSimilar(
    vector: Float32Array,
    topK = 3
  ): Promise<Array<{ key: string; similarity: number }>> {
    if (!this.storage) return [];

    const all = await this.storage.getAll();
    const results = all
      .map((entry) => ({
        key: entry.key,
        similarity: cosineSimilarity(vector, entry.vector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  destroy(): void {
    this.storage?.destroy();
    this.storage = null;
    pipelineInstance = null;
    pipelineLoading = false;
    pipelineLoadPromise = null;
  }
}

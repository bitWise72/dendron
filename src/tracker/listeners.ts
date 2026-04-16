// ============================================================
// DENDRON SDK — TRACKER MODULE: MAIN THREAD LISTENERS
//
// DESIGN CONSTRAINT: These listeners do ZERO computation.
// They serialize the minimum necessary data and post it to
// the Web Worker. No state, no DOM queries, no processing.
// Budget: < 1ms main-thread CPU per frame (hard limit).
// ============================================================

import type { WorkerInboundMessage } from '../types';

type PostFn = (msg: WorkerInboundMessage) => void;

// ─── Scroll Listener ────────────────────────────────────────
export function mountScrollListener(post: PostFn): () => void {
  let ticking = false;

  const handler = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        post({
          type: 'scroll',
          y: window.scrollY,
          vh: window.innerHeight,
          dh: document.documentElement.scrollHeight,
          t: performance.now(),
        });
        ticking = false;
      });
    }
  };

  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}

// ─── Click Listener ─────────────────────────────────────────
export function mountClickListener(post: PostFn): () => void {
  const handler = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const section = target.closest('[data-dendron-section],[id]');
    const text = (target.textContent ?? '').trim().slice(0, 80);

    post({
      type: 'click',
      tag: target.tagName.toLowerCase(),
      classes: target.className?.toString?.()?.slice(0, 100) ?? '',
      text,
      section: section?.id ?? section?.getAttribute('data-dendron-section') ?? '',
      t: performance.now(),
    });
  };

  document.addEventListener('click', handler, { passive: true, capture: false });
  return () => document.removeEventListener('click', handler, { capture: false });
}

// ─── Cursor Listener ────────────────────────────────────────
export function mountCursorListener(post: PostFn, debounceMs: number): () => void {
  let lastPost = 0;

  const handler = (e: MouseEvent) => {
    const now = performance.now();
    if (now - lastPost < debounceMs) return;
    lastPost = now;

    const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? '';
    post({
      type: 'hover',
      x: Math.round((e.clientX / window.innerWidth) * 100),
      y: Math.round((e.clientY / window.innerHeight) * 100),
      tag,
      t: now,
    });
  };

  window.addEventListener('mousemove', handler, { passive: true });
  return () => window.removeEventListener('mousemove', handler);
}

// ─── Intersection Observer ──────────────────────────────────
export function mountIntersectionObserver(post: PostFn): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id =
          (entry.target as HTMLElement).dataset['dendronSection'] ??
          entry.target.id ??
          '';
        if (!id) continue;
        post({
          type: 'intersection',
          id,
          ratio: entry.intersectionRatio,
          entering: entry.isIntersecting,
          t: performance.now(),
        });
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
  );

  // Observe all elements with a section id or data attribute
  const targets = document.querySelectorAll<HTMLElement>(
    '[data-dendron-section], section[id], article[id], [id^="section"], [id^="sec-"]'
  );
  targets.forEach((el) => observer.observe(el));

  // Also observe any h1/h2 level sections as fallback
  if (targets.length === 0) {
    document.querySelectorAll<HTMLElement>('section, article, main > div[id]').forEach((el) =>
      observer.observe(el)
    );
  }

  return () => observer.disconnect();
}

// ─── Mutation Observer ──────────────────────────────────────
export function mountMutationObserver(post: PostFn, flushMs: number): () => void {
  let buffer: { added: number; removed: number } = { added: 0, removed: 0 };
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (buffer.added === 0 && buffer.removed === 0) return;
    post({ type: 'mutation', ...buffer, t: performance.now() });
    buffer = { added: 0, removed: 0 };
    flushTimer = null;
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      buffer.added += m.addedNodes.length;
      buffer.removed += m.removedNodes.length;
    }
    if (!flushTimer) {
      flushTimer = setTimeout(flush, flushMs);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    if (flushTimer) clearTimeout(flushTimer);
  };
}

// ─── Reading Time Ticker ─────────────────────────────────────
// Polls which section is >50% visible and increments reading time
export function mountReadingTicker(post: PostFn, intervalMs: number): () => void {
  let activeSectionId = '';

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      // Find the most visible section
      let best = { id: '', ratio: 0 };
      for (const entry of entries) {
        const id =
          (entry.target as HTMLElement).dataset['dendronSection'] ??
          entry.target.id ??
          '';
        if (entry.intersectionRatio > 0.5 && entry.intersectionRatio > best.ratio) {
          best = { id, ratio: entry.intersectionRatio };
        }
      }
      if (best.id) activeSectionId = best.id;
    },
    { threshold: [0.5] }
  );

  const targets = document.querySelectorAll<HTMLElement>(
    '[data-dendron-section], section[id], article[id]'
  );
  targets.forEach((el) => visibilityObserver.observe(el));

  const ticker = setInterval(() => {
    if (activeSectionId) {
      post({ type: 'reading_tick', sectionId: activeSectionId, t: performance.now() });
    }
  }, intervalMs);

  return () => {
    clearInterval(ticker);
    visibilityObserver.disconnect();
  };
}

// ─── Mount All Listeners ─────────────────────────────────────
export function mountAllListeners(
  post: PostFn,
  config: { scrollDebounce: number; cursorDebounce: number; readingInterval: number; mutationFlushInterval: number }
): () => void {
  const cleanups = [
    mountScrollListener(post),
    mountClickListener(post),
    mountCursorListener(post, config.cursorDebounce),
    mountIntersectionObserver(post),
    mountMutationObserver(post, config.mutationFlushInterval),
    mountReadingTicker(post, config.readingInterval),
  ];

  return () => cleanups.forEach((fn) => fn());
}

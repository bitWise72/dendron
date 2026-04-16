// ============================================================
// DENDRON SDK — TYPE SAFETY TESTS
// Ensures the public API types are correct at compile time.
// These tests verify the shape of objects, not runtime behavior.
// ============================================================

import { describe, it, expect } from 'vitest';
import type {
  DendronConfig,
  DendronContextPayload,
  SmartCard,
  GreetingCard,
  FeatureCard,
  PricingCard,
  EngagementCard,
  ComparisonCard,
  DendronEventMap,
  SmartCardAction,
  TrackingConfig,
  IntentConfig,
  StorageConfig,
  UIConfig,
} from '../src/types';

describe('Type Contracts', () => {
  it('DendronConfig requires onQuery', () => {
    const config: DendronConfig = {
      onQuery: async () => ({ type: 'greeting', headline: '', body: '', actions: [] }),
    };
    expect(config.onQuery).toBeTypeOf('function');
  });

  it('DendronConfig accepts all optional fields', () => {
    const config: DendronConfig = {
      onQuery: async () => ({ type: 'greeting', headline: '', body: '', actions: [] }),
      tracking: { scrollDebounce: 100 },
      intent: { triggerThreshold: 40 },
      storage: { maxStorageMB: 10 },
      ui: { position: 'bottom-left', theme: 'dark', branding: false, zIndex: 100 },
      systemContext: 'test',
      webMCP: true,
      debug: true,
    };
    expect(config.debug).toBe(true);
    expect(config.ui?.position).toBe('bottom-left');
  });

  it('SmartCard union type covers all card types', () => {
    const cards: SmartCard[] = [
      { type: 'greeting', headline: 'Hi', body: 'Body', actions: [] },
      { type: 'feature', headline: 'F', feature: 'X', description: 'D', actions: [] },
      { type: 'pricing', headline: 'P', plans: [], actions: [] },
      { type: 'engagement', headline: 'E', body: 'B', actions: [] },
      { type: 'comparison', headline: 'C', items: [], actions: [] },
    ];
    expect(cards).toHaveLength(5);
    const types = new Set(cards.map((c) => c.type));
    expect(types.size).toBe(5);
  });

  it('SmartCardAction shape', () => {
    const action: SmartCardAction = {
      label: 'Click me',
      href: '/page',
      action: 'track',
      variant: 'primary',
    };
    expect(action.label).toBe('Click me');
  });

  it('DendronContextPayload has required shape', () => {
    const payload: DendronContextPayload = {
      sessionId: 'abc',
      timestamp: Date.now(),
      page: { url: 'https://x.com', title: 'X', sections: [] },
      visitor: {
        scrollDepth: 50,
        totalReadingTime: 10,
        intentScore: 60,
        focusSection: 'hero',
        interactionHistory: [],
      },
      trigger: { reason: 'threshold', sectionId: 'hero', score: 60 },
    };
    expect(payload.sessionId).toBe('abc');
    expect(payload.trigger.reason).toBe('threshold');
  });

  it('TrackingConfig has all expected keys', () => {
    const tc: TrackingConfig = {
      scrollDebounce: 200,
      cursorDebounce: 300,
      readingInterval: 1000,
      mutationFlushInterval: 500,
    };
    expect(Object.keys(tc)).toHaveLength(4);
  });

  it('IntentConfig has all expected keys', () => {
    const ic: IntentConfig = {
      triggerThreshold: 55,
      cooldownSeconds: 30,
      maxCardsPerSession: 5,
    };
    expect(Object.keys(ic)).toHaveLength(3);
  });

  it('StorageConfig has all expected keys', () => {
    const sc: StorageConfig = {
      maxStorageMB: 25,
      embeddingTTLDays: 7,
      cleanupIntervalMinutes: 5,
    };
    expect(Object.keys(sc)).toHaveLength(3);
  });

  it('UIConfig has all expected keys', () => {
    const uc: UIConfig = {
      position: 'bottom-right',
      theme: 'auto',
      branding: true,
      zIndex: 999999,
    };
    expect(Object.keys(uc)).toHaveLength(4);
  });

  it('DendronEventMap covers all events', () => {
    type Keys = keyof DendronEventMap;
    const expectedEvents: Keys[] = [
      'trigger',
      'card:rendered',
      'card:action',
      'card:dismissed',
      'error',
      'ready',
      'destroy',
    ];
    // Type-level check: this compiles only if all keys exist
    expectedEvents.forEach((k) => {
      expect(k).toBeTypeOf('string');
    });
  });
});

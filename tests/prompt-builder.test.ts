// ============================================================
// DENDRON SDK — PROMPT BUILDER TESTS
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { buildPrompt, parseSmartCardResponse } from '../src/prompt/builder';
import type { DendronContextPayload, DendronResolvedConfig } from '../src/types';

function makePayload(overrides?: Partial<DendronContextPayload>): DendronContextPayload {
  return {
    sessionId: 'test-session-001',
    timestamp: Date.now(),
    page: {
      url: 'https://example.com/pricing',
      title: 'Example Product',
      sections: [
        {
          id: 'pricing',
          label: 'pricing',
          visibilityRatio: 0.8,
          readingTime: 12,
          enterTime: 1000,
          exitTime: null,
          revisitCount: 2,
          isActive: true,
        },
        {
          id: 'features',
          label: 'features',
          visibilityRatio: 0,
          readingTime: 5,
          enterTime: 500,
          exitTime: 900,
          revisitCount: 1,
          isActive: false,
        },
      ],
    },
    visitor: {
      scrollDepth: 75,
      totalReadingTime: 17,
      intentScore: 68,
      focusSection: 'pricing',
      interactionHistory: [
        { type: 'click', target: 'button.cta', text: 'Start Trial', timestamp: 5000 },
        { type: 'scroll', target: 'window', timestamp: 3000 },
      ],
    },
    trigger: {
      reason: 'threshold',
      sectionId: 'pricing',
      score: 68,
    },
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<DendronResolvedConfig>): DendronResolvedConfig {
  return {
    onQuery: async () => ({ type: 'greeting', headline: '', body: '', actions: [] }),
    tracking: { scrollDebounce: 200, cursorDebounce: 300, readingInterval: 1000, mutationFlushInterval: 500 },
    intent: { triggerThreshold: 55, cooldownSeconds: 30, maxCardsPerSession: 5 },
    storage: { maxStorageMB: 25, embeddingTTLDays: 7, cleanupIntervalMinutes: 5 },
    ui: { position: 'bottom-right', theme: 'auto', branding: true, zIndex: 999999 },
    systemContext: '',
    webMCP: false,
    debug: false,
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('should include page title', () => {
    const prompt = buildPrompt(makePayload(), makeConfig());
    expect(prompt).toContain('Example Product');
  });

  it('should include visitor behavioral data', () => {
    const prompt = buildPrompt(makePayload(), makeConfig());
    expect(prompt).toContain('75%');    // scroll depth
    expect(prompt).toContain('17s');    // reading time
    expect(prompt).toContain('68/100'); // intent score
    expect(prompt).toContain('pricing'); // focus section
  });

  it('should include section engagement details', () => {
    const prompt = buildPrompt(makePayload(), makeConfig());
    expect(prompt).toContain('pricing: 12s reading time');
    expect(prompt).toContain('features: 5s reading time');
  });

  it('should include systemContext when provided', () => {
    const prompt = buildPrompt(
      makePayload(),
      makeConfig({ systemContext: 'Acme sells edge computing services' })
    );
    expect(prompt).toContain('Acme sells edge computing services');
  });

  it('should omit systemContext section when empty', () => {
    const prompt = buildPrompt(makePayload(), makeConfig({ systemContext: '' }));
    expect(prompt).not.toContain('[PRODUCT CONTEXT]');
  });

  it('should include JSON schema instructions', () => {
    const prompt = buildPrompt(makePayload(), makeConfig());
    expect(prompt).toContain('valid JSON');
    expect(prompt).toContain('greeting');
    expect(prompt).toContain('pricing');
    expect(prompt).toContain('feature');
    expect(prompt).toContain('engagement');
    expect(prompt).toContain('comparison');
  });

  it('should include trigger reason', () => {
    const prompt = buildPrompt(makePayload(), makeConfig());
    expect(prompt).toContain('threshold');
  });

  it('should include prompt version', () => {
    const prompt = buildPrompt(makePayload(), makeConfig());
    expect(prompt).toContain('1.0.0');
  });
});

describe('parseSmartCardResponse', () => {
  it('should parse a valid greeting card', () => {
    const raw = {
      type: 'greeting',
      headline: 'Hello!',
      body: 'Welcome to our site.',
      actions: [{ label: 'Learn more', href: '/about', variant: 'primary' }],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('greeting');
    expect(result!.headline).toBe('Hello!');
  });

  it('should parse a JSON string response', () => {
    const jsonStr = JSON.stringify({
      type: 'greeting',
      headline: 'Hi',
      body: 'Test',
      actions: [],
    });
    const result = parseSmartCardResponse(jsonStr);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('greeting');
  });

  it('should strip markdown code fences from JSON string', () => {
    const wrapped = '```json\n{"type":"greeting","headline":"Hi","body":"Test","actions":[]}\n```';
    const result = parseSmartCardResponse(wrapped);
    expect(result).not.toBeNull();
    expect(result!.headline).toBe('Hi');
  });

  it('should return null for invalid input', () => {
    expect(parseSmartCardResponse(null)).toBeNull();
    expect(parseSmartCardResponse(undefined)).toBeNull();
    expect(parseSmartCardResponse(42)).toBeNull();
    expect(parseSmartCardResponse('not json')).toBeNull();
  });

  it('should return null when type is missing', () => {
    const result = parseSmartCardResponse({ headline: 'Hi', body: 'Test', actions: [] });
    expect(result).toBeNull();
  });

  it('should return null for unknown card type', () => {
    const result = parseSmartCardResponse({ type: 'unknown', headline: 'Hi' });
    expect(result).toBeNull();
  });

  it('should parse a pricing card with plans', () => {
    const raw = {
      type: 'pricing',
      headline: 'Our Plans',
      plans: [
        { name: 'Free', price: '$0', features: ['Basic access'] },
        { name: 'Pro', price: '$29', period: 'mo', highlight: true, features: ['All features'] },
      ],
      actions: [{ label: 'Start trial' }],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pricing');
    if (result!.type === 'pricing') {
      expect(result!.plans).toHaveLength(2);
      expect(result!.plans[1].highlight).toBe(true);
    }
  });

  it('should parse a feature card with stats', () => {
    const raw = {
      type: 'feature',
      headline: 'Fast Engine',
      feature: 'Speed',
      description: 'Built for performance',
      stats: [{ label: 'Latency', value: '<1ms' }],
      actions: [],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    if (result!.type === 'feature') {
      expect(result!.stats).toHaveLength(1);
      expect(result!.stats![0].value).toBe('<1ms');
    }
  });

  it('should parse a comparison card', () => {
    const raw = {
      type: 'comparison',
      headline: 'Compare',
      items: [
        { name: 'A', attributes: { speed: 'fast', price: '$10' } },
        { name: 'B', attributes: { speed: 'slow', price: '$5' } },
      ],
      actions: [{ label: 'Learn more' }],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    if (result!.type === 'comparison') {
      expect(result!.items).toHaveLength(2);
      expect(result!.items[0].attributes['speed']).toBe('fast');
    }
  });

  it('should limit actions to 2 max', () => {
    const raw = {
      type: 'greeting',
      headline: 'Hi',
      body: 'Test',
      actions: [
        { label: 'One' },
        { label: 'Two' },
        { label: 'Three' },
        { label: 'Four' },
      ],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.actions).toHaveLength(2);
  });

  it('should sanitize HTML in text fields', () => {
    const raw = {
      type: 'greeting',
      headline: '<script>alert("xss")</script>Hello',
      body: '<img onerror="hack" src="x">Normal text',
      actions: [{ label: '<b>Click</b>' }],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    // All HTML tags must be stripped
    expect(result!.headline).not.toContain('<script>');
    expect(result!.headline).not.toContain('</script>');
    expect(result!.headline).toContain('Hello'); // text content preserved
    if (result!.type === 'greeting') {
      expect(result!.body).not.toContain('<img');
      expect(result!.body).toContain('Normal text');
    }
    expect(result!.actions[0].label).not.toContain('<b>');
    expect(result!.actions[0].label).toContain('Click');
  });

  it('should handle engagement card with socialProof', () => {
    const raw = {
      type: 'engagement',
      headline: 'You are engaged',
      body: 'Keep reading',
      socialProof: '"Great product" — CEO',
      stats: [{ label: 'Users', value: '10K+' }],
      actions: [{ label: 'Sign up' }],
    };
    const result = parseSmartCardResponse(raw);
    expect(result).not.toBeNull();
    if (result!.type === 'engagement') {
      expect(result!.socialProof).toContain('Great product');
    }
  });
});

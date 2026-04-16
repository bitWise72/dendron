// ============================================================
// DENDRON SDK — CARD RENDERER TESTS
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderGreetingCard } from '../src/renderer/cards/greeting';
import { renderFeatureCard } from '../src/renderer/cards/feature';
import { renderPricingCard } from '../src/renderer/cards/pricing';
import { renderEngagementCard } from '../src/renderer/cards/engagement';
import { renderComparisonCard } from '../src/renderer/cards/comparison';
import type {
  GreetingCard,
  FeatureCard,
  PricingCard,
  EngagementCard,
  ComparisonCard,
  SmartCardAction,
} from '../src/types';

describe('Greeting Card', () => {
  it('should render headline and body', () => {
    const card: GreetingCard = {
      type: 'greeting',
      headline: 'Welcome!',
      body: 'Thanks for visiting our site.',
      actions: [{ label: 'Learn more', href: '/about' }],
    };
    const onAction = vi.fn();
    const el = renderGreetingCard(card, onAction);

    expect(el.querySelector('h3')?.textContent).toBe('Welcome!');
    expect(el.querySelector('p')?.textContent).toBe('Thanks for visiting our site.');
  });

  it('should render action buttons', () => {
    const card: GreetingCard = {
      type: 'greeting',
      headline: 'Hi',
      body: 'Hello',
      actions: [
        { label: 'Primary', variant: 'primary' },
        { label: 'Secondary', variant: 'secondary' },
      ],
    };
    const onAction = vi.fn();
    const el = renderGreetingCard(card, onAction);
    const buttons = el.querySelectorAll('button');

    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('Primary');
    expect(buttons[1].textContent).toBe('Secondary');
  });

  it('should fire onAction when button clicked', () => {
    const card: GreetingCard = {
      type: 'greeting',
      headline: 'Hi',
      body: 'Hello',
      actions: [{ label: 'Click me', action: 'test' }],
    };
    const onAction = vi.fn();
    const el = renderGreetingCard(card, onAction);
    const button = el.querySelector('button')!;

    button.click();
    expect(onAction).toHaveBeenCalledWith(card.actions[0]);
  });

  it('should have the badge element', () => {
    const card: GreetingCard = {
      type: 'greeting',
      headline: 'Hi',
      body: 'Hello',
      actions: [],
    };
    const el = renderGreetingCard(card, vi.fn());
    const badge = el.querySelector('.d-card-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Welcome');
  });
});

describe('Feature Card', () => {
  it('should render feature name and description', () => {
    const card: FeatureCard = {
      type: 'feature',
      headline: 'Speed Matters',
      feature: 'Performance Engine',
      description: 'Built for sub-millisecond response.',
      actions: [],
    };
    const el = renderFeatureCard(card, vi.fn());

    expect(el.querySelector('.d-card-badge')?.textContent).toBe('Performance Engine');
    expect(el.querySelector('h3')?.textContent).toBe('Speed Matters');
  });

  it('should render stats when provided', () => {
    const card: FeatureCard = {
      type: 'feature',
      headline: 'Test',
      feature: 'Speed',
      description: 'Fast',
      stats: [
        { label: 'Latency', value: '<1ms' },
        { label: 'Throughput', value: '10K/s' },
      ],
      actions: [],
    };
    const el = renderFeatureCard(card, vi.fn());
    const stats = el.querySelectorAll('.d-stat');
    expect(stats).toHaveLength(2);
    expect(stats[0].querySelector('.d-stat-value')?.textContent).toBe('<1ms');
  });
});

describe('Pricing Card', () => {
  it('should render plans', () => {
    const card: PricingCard = {
      type: 'pricing',
      headline: 'Choose a plan',
      plans: [
        { name: 'Free', price: '$0', features: ['Basic access'] },
        { name: 'Pro', price: '$29', period: 'mo', highlight: true, features: ['All features', 'Support'] },
      ],
      actions: [{ label: 'Start trial' }],
    };
    const el = renderPricingCard(card, vi.fn());
    const plans = el.querySelectorAll('.d-plan');
    expect(plans).toHaveLength(2);
    expect(plans[1].classList.contains('highlighted')).toBe(true);
  });

  it('should show plan features', () => {
    const card: PricingCard = {
      type: 'pricing',
      headline: 'Plans',
      plans: [
        { name: 'Basic', price: '$0', features: ['Feature A', 'Feature B'] },
      ],
      actions: [],
    };
    const el = renderPricingCard(card, vi.fn());
    const features = el.querySelectorAll('.d-plan-feature');
    expect(features).toHaveLength(2);
  });
});

describe('Engagement Card', () => {
  it('should render social proof when provided', () => {
    const card: EngagementCard = {
      type: 'engagement',
      headline: 'You are engaged!',
      body: 'Keep exploring.',
      socialProof: '"Amazing product" — John, CEO',
      actions: [],
    };
    const el = renderEngagementCard(card, vi.fn());
    const proof = el.querySelector('.d-social-proof');
    expect(proof).not.toBeNull();
    expect(proof?.textContent).toContain('Amazing product');
  });

  it('should not render social proof when omitted', () => {
    const card: EngagementCard = {
      type: 'engagement',
      headline: 'Engaged',
      body: 'Hello',
      actions: [],
    };
    const el = renderEngagementCard(card, vi.fn());
    expect(el.querySelector('.d-social-proof')).toBeNull();
  });
});

describe('Comparison Card', () => {
  it('should render a comparison table', () => {
    const card: ComparisonCard = {
      type: 'comparison',
      headline: 'Compare',
      items: [
        { name: 'Product A', attributes: { Speed: 'Fast', Price: '$10' } },
        { name: 'Product B', attributes: { Speed: 'Slow', Price: '$5' } },
      ],
      actions: [],
    };
    const el = renderComparisonCard(card, vi.fn());
    const table = el.querySelector('.d-comparison');
    expect(table).not.toBeNull();

    const headers = table!.querySelectorAll('th');
    expect(headers).toHaveLength(3); // empty + 2 items
    expect(headers[1].textContent).toBe('Product A');
    expect(headers[2].textContent).toBe('Product B');

    const rows = table!.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2); // Speed + Price
  });
});

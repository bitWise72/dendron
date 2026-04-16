// ============================================================
// DENDRON SDK — WEBMCP PLUGIN TESTS
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeDOMForMCP, registerWebMCPTools, unregisterWebMCPTools } from '../src/plugins/webmcp';

describe('WebMCP Plugin', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // Clean up navigator.modelContext
    (navigator as Record<string, unknown>).modelContext = undefined;
  });

  describe('analyzeDOMForMCP', () => {
    it('should detect forms with fields', () => {
      document.body.innerHTML = `
        <form id="search-form">
          <label for="q">Search</label>
          <input id="q" name="q" type="text" placeholder="Search..." required />
          <button type="submit">Search</button>
        </form>
      `;
      const map = analyzeDOMForMCP();
      expect(map.forms).toHaveLength(1);
      expect(map.forms[0].fields).toHaveLength(1);
      expect(map.forms[0].fields[0].name).toBe('q');
      expect(map.forms[0].fields[0].required).toBe(true);
    });

    it('should detect CTA buttons', () => {
      document.body.innerHTML = `
        <button>Start Free Trial</button>
        <a href="/demo">Book a Demo</a>
      `;
      const map = analyzeDOMForMCP();
      expect(map.ctas.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect sections with IDs', () => {
      document.body.innerHTML = `
        <section id="features"><h2>Features</h2></section>
        <section id="pricing"><h2>Pricing</h2></section>
      `;
      const map = analyzeDOMForMCP();
      expect(map.sections).toHaveLength(2);
      expect(map.sections[0].id).toBe('features');
      expect(map.sections[0].heading).toBe('Features');
    });

    it('should return empty map for bare page', () => {
      document.body.innerHTML = '<p>Hello</p>';
      const map = analyzeDOMForMCP();
      expect(map.forms).toHaveLength(0);
      expect(map.sections).toHaveLength(0);
    });
  });

  describe('registerWebMCPTools', () => {
    it('should silently no-op when navigator.modelContext is unavailable', () => {
      const map = { forms: [], ctas: [], sections: [] };
      // navigator.modelContext is undefined by default in tests
      expect(() => registerWebMCPTools(map)).not.toThrow();
    });

    it('should call registerTool when modelContext is available', () => {
      const registerTool = vi.fn();
      (navigator as Record<string, unknown>).modelContext = { registerTool };

      document.body.innerHTML = `
        <section id="hero"><h2>Hero</h2></section>
        <button>Click me now</button>
      `;
      const map = analyzeDOMForMCP();
      registerWebMCPTools(map);

      expect(registerTool).toHaveBeenCalled();
    });

    it('should register section scroll tools', () => {
      const registerTool = vi.fn();
      (navigator as Record<string, unknown>).modelContext = { registerTool };

      document.body.innerHTML = `
        <section id="features"><h2>Features</h2></section>
      `;
      const map = analyzeDOMForMCP();
      registerWebMCPTools(map);

      const calls = registerTool.mock.calls;
      const sectionTool = calls.find(
        (c: unknown[]) => (c[0] as { name: string }).name === 'scroll_to_features'
      );
      expect(sectionTool).toBeDefined();
    });
  });

  describe('unregisterWebMCPTools', () => {
    it('should silently no-op when modelContext is unavailable', () => {
      const map = { forms: [], ctas: [], sections: [] };
      expect(() => unregisterWebMCPTools(map)).not.toThrow();
    });

    it('should call unregisterTool for each tool', () => {
      const unregisterTool = vi.fn();
      (navigator as Record<string, unknown>).modelContext = { unregisterTool };

      const map = {
        forms: [{ inferredAction: 'search_products' }] as ReturnType<typeof analyzeDOMForMCP>['forms'],
        ctas: [{ inferredAction: 'start_trial' }] as ReturnType<typeof analyzeDOMForMCP>['ctas'],
        sections: [{ id: 'features', heading: 'Features', element: document.createElement('section') }],
      };

      unregisterWebMCPTools(map);
      expect(unregisterTool).toHaveBeenCalledTimes(3);
    });
  });
});

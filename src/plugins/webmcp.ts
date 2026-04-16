// ============================================================
// DENDRON SDK — WEBMCP AGENT-READINESS PLUGIN
// STATUS: OPTIONAL — enabled only via webMCP: true in config.
//
// Analyzes the host page DOM and auto-registers
// navigator.modelContext.registerTool() calls.
// Silently no-ops if browser does not support WebMCP.
// Does NOT expose user data. Tool registrations describe
// available actions only.
// ============================================================

import type { DOMMap, DOMForm, DOMCTA } from '../types';

// Extend Navigator type for WebMCP (experimental)
interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<{ success: boolean; result?: unknown }>;
}

interface ModelContext {
  registerTool?: (tool: ModelContextTool) => void;
  unregisterTool?: (name: string) => void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

// ─── DOM Analysis ─────────────────────────────────────────────

export function analyzeDOMForMCP(): DOMMap {
  const forms = analyzeForms();
  const ctas = analyzeCTAs();
  const sections = analyzeSections();

  return { forms, ctas, sections };
}

function analyzeForms(): DOMForm[] {
  const formEls = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
  return formEls.map((form) => {
    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
      )
    ).map((el) => {
      const label =
        form.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)?.textContent?.trim() ??
        el.getAttribute('placeholder') ??
        el.name ??
        el.id ??
        'field';
      return {
        name: el.name || el.id || label.toLowerCase().replace(/\s+/g, '_'),
        type: 'input' in el ? el.type : el.tagName.toLowerCase(),
        label,
        required: (el as HTMLInputElement).required ?? false,
        element: el,
      };
    });

    const fieldSchema: Record<string, unknown> = {
      type: 'object',
      properties: Object.fromEntries(
        fields.map((f) => [f.name, { type: 'string', description: f.label }])
      ),
      required: fields.filter((f) => f.required).map((f) => f.name),
    };

    // Infer action name from form attributes / submit button
    const submitBtn = form.querySelector<HTMLElement>('[type="submit"], button');
    const rawAction = form.getAttribute('data-action') ??
      submitBtn?.textContent?.trim() ??
      form.id ??
      form.action ??
      'submit_form';

    const inferredAction = toSnakeCase(rawAction).slice(0, 60);
    const inferredDescription =
      form.getAttribute('aria-label') ??
      form.getAttribute('data-description') ??
      `Submit the ${rawAction} form on this page`;

    return { element: form, inferredAction, inferredDescription, fieldSchema, fields };
  });
}

function analyzeCTAs(): DOMCTA[] {
  const ctaSelectors = [
    'a[href]:not([href="#"])',
    'button:not([type="submit"])',
    '[role="button"]',
    '[data-dendron-cta]',
  ].join(',');

  const ctaEls = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(ctaSelectors))
    .filter((el) => {
      const text = el.textContent?.trim() ?? '';
      return text.length > 2 && text.length < 60;
    })
    .slice(0, 20); // Cap at 20 CTAs

  return ctaEls.map((el) => {
    const text = el.textContent?.trim() ?? 'action';
    const inferredAction = toSnakeCase(text).slice(0, 60);
    const ariaLabel = el.getAttribute('aria-label');
    const href = (el as HTMLAnchorElement).href ?? null;

    return {
      element: el,
      inferredAction,
      inferredDescription:
        ariaLabel ?? (href ? `Navigate to ${href}` : `Activate the "${text}" button`),
    };
  });
}

function analyzeSections(): DOMMap['sections'] {
  const sectionEls = Array.from(
    document.querySelectorAll<HTMLElement>('section[id], article[id], [data-dendron-section]')
  );

  return sectionEls.map((el) => {
    const id = el.dataset['dendronSection'] ?? el.id ?? '';
    const heading = el.querySelector('h1, h2, h3')?.textContent?.trim() ?? id;
    return { id, heading, element: el };
  });
}

// ─── Registration ─────────────────────────────────────────────

export function registerWebMCPTools(domMap: DOMMap): void {
  // Guard: exit silently if browser does not support WebMCP
  if (!navigator.modelContext?.registerTool) {
    console.debug('[Dendron WebMCP] navigator.modelContext not available — plugin no-op');
    return;
  }

  const registerTool = navigator.modelContext.registerTool;

  // Register form tools
  domMap.forms.forEach((form) => {
    try {
      registerTool({
        name: form.inferredAction,
        description: form.inferredDescription,
        inputSchema: form.fieldSchema,
        execute: async (params) => {
          // Fill and submit the form
          form.fields.forEach((f) => {
            const value = params[f.name];
            if (typeof value === 'string') {
              f.element.value = value;
            }
          });
          form.element.requestSubmit();
          return { success: true };
        },
      });
    } catch (e) {
      console.warn(`[Dendron WebMCP] Failed to register form tool "${form.inferredAction}":`, e);
    }
  });

  // Register CTA tools
  domMap.ctas.forEach((cta) => {
    try {
      registerTool({
        name: cta.inferredAction,
        description: cta.inferredDescription,
        inputSchema: { type: 'object', properties: {}, required: [] },
        execute: async () => {
          cta.element.click();
          return { success: true };
        },
      });
    } catch (e) {
      console.warn(`[Dendron WebMCP] Failed to register CTA tool "${cta.inferredAction}":`, e);
    }
  });

  // Register navigation tools for sections
  domMap.sections.forEach((sec) => {
    try {
      registerTool({
        name: `scroll_to_${toSnakeCase(sec.id)}`,
        description: `Scroll the page to the "${sec.heading}" section`,
        inputSchema: { type: 'object', properties: {}, required: [] },
        execute: async () => {
          sec.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return { success: true };
        },
      });
    } catch (e) {
      console.warn(`[Dendron WebMCP] Failed to register section tool for "${sec.id}":`, e);
    }
  });

  const totalTools = domMap.forms.length + domMap.ctas.length + domMap.sections.length;
  console.debug(`[Dendron WebMCP] Registered ${totalTools} tools`);
}

// ─── Unregister all ───────────────────────────────────────────

export function unregisterWebMCPTools(domMap: DOMMap): void {
  if (!navigator.modelContext?.unregisterTool) return;

  const unregister = navigator.modelContext.unregisterTool;

  domMap.forms.forEach((f) => {
    try {
      unregister(f.inferredAction);
    } catch {
      // Tool may not have been registered, safe to ignore
    }
  });
  domMap.ctas.forEach((c) => {
    try {
      unregister(c.inferredAction);
    } catch {
      // Tool may not have been registered, safe to ignore
    }
  });
  domMap.sections.forEach((s) => {
    try {
      unregister(`scroll_to_${toSnakeCase(s.id)}`);
    } catch {
      // Tool may not have been registered, safe to ignore
    }
  });
}

// ─── Utilities ────────────────────────────────────────────────

function toSnakeCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

// ============================================================
// DENDRON SDK — PROMPT BUILDER
// Versioned, immutable prompt templates. The developer cannot
// modify the core prompt structure (injection attack prevention).
// They can provide systemContext to describe their product.
// ============================================================

import type { DendronContextPayload, DendronResolvedConfig, SmartCard } from '../types';

// SDK version — bump to invalidate cached prompt behavior
export const PROMPT_VERSION = '1.0.0';

// ─── Smart Card JSON Schema (inline for prompt) ───────────────
const SMART_CARD_SCHEMA = `{
  "type": "greeting|pricing|feature|engagement|comparison",
  "headline": "string",
  ... (type-specific fields)
}

CARD TYPE SCHEMAS:
greeting: { type, headline, body, actions: [{label, href?, action?, variant?}] }
feature:  { type, headline, feature, description, stats?: [{label,value}], actions }
pricing:  { type, headline, plans: [{name, price, period?, highlight?, features: string[]}], actions }
engagement: { type, headline, body, socialProof?, stats?, actions }
comparison: { type, headline, items: [{name, attributes: {key:value}}], actions }`;

// ─── Build full prompt string ─────────────────────────────────
export function buildPrompt(
  ctx: DendronContextPayload,
  config: DendronResolvedConfig
): string {
  const activeSections = ctx.page.sections
    .filter((s) => s.readingTime > 0)
    .map((s) => `  • ${s.id}: ${Math.round(s.readingTime)}s reading time, visited ${s.revisitCount}x`)
    .join('\n');

  const recentInteractions = ctx.visitor.interactionHistory
    .slice(-5)
    .map((i) => `  • ${i.type} on ${i.target}${i.text ? ` ("${i.text.slice(0, 40)}")` : ''}`)
    .join('\n');

  const lines: string[] = [
    `[SYSTEM] You are Dendron, an embedded behavioral AI assistant on "${ctx.page.title}".`,
    `Your role is to surface contextually relevant Smart Cards based on how the visitor is engaging with this page.`,
    `Prompt version: ${PROMPT_VERSION}`,

    config.systemContext
      ? `\n[PRODUCT CONTEXT]\n${config.systemContext}`
      : '',

    `\n[VISITOR BEHAVIOR ANALYSIS]`,
    `Session ID: ${ctx.sessionId} (anonymous, never persisted server-side)`,
    `Current page: ${ctx.page.url}`,
    ``,
    `Scroll depth: ${ctx.visitor.scrollDepth}%`,
    `Total reading time: ${Math.round(ctx.visitor.totalReadingTime)}s`,
    `Composite intent score: ${ctx.visitor.intentScore}/100`,
    `Focus section: ${ctx.visitor.focusSection}`,
    ``,
    `Sections engaged with:`,
    activeSections || '  (none yet)',
    ``,
    `Recent interactions:`,
    recentInteractions || '  (none yet)',
    ``,
    `Trigger reason: ${ctx.trigger.reason} (score: ${ctx.trigger.score})`,

    `\n[INSTRUCTION]`,
    `Based on the visitor's behavior above, generate exactly ONE Smart Card response.`,
    `Choose the most contextually appropriate card type:`,
    `  - greeting: early session, visitor just arrived, low intent score`,
    `  - feature: visitor deeply engaged with a specific feature section`,
    `  - pricing: visitor spending extended time on pricing section`,
    `  - engagement: high overall intent, multiple sections visited`,
    `  - comparison: visitor navigating back and forth between sections`,
    ``,
    `RULES:`,
    `1. Respond ONLY with valid JSON. No markdown, no explanation, no prose.`,
    `2. The JSON must exactly match the SmartCard schema below.`,
    `3. Content must be relevant to the visitor's specific behavior.`,
    `4. Actions must have clear, actionable labels. Max 2 actions per card.`,
    `5. Keep all text concise and conversational.`,
    ``,
    `SCHEMA:`,
    SMART_CARD_SCHEMA,
  ];

  return lines.filter((l) => l !== undefined && l !== null).join('\n');
}

// ─── Response Parser ──────────────────────────────────────────
// Safely parse LLM response into a SmartCard.
// Uses DOM API (no innerHTML) for sanitization.
export function parseSmartCardResponse(raw: unknown): SmartCard | null {
  try {
    let obj: Record<string, unknown>;

    if (typeof raw === 'string') {
      // Strip any accidental markdown code fences
      const cleaned = raw
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/\s*```$/im, '')
        .trim();
      obj = JSON.parse(cleaned);
    } else if (typeof raw === 'object' && raw !== null) {
      obj = raw as Record<string, unknown>;
    } else {
      return null;
    }

    // Validate required fields
    if (!obj['type'] || typeof obj['type'] !== 'string') return null;
    if (!obj['headline'] || typeof obj['headline'] !== 'string') return null;

    // Sanitize text fields
    const sanitize = (s: unknown): string => {
      if (typeof s !== 'string') return '';
      return sanitizeText(s);
    };

    const type = obj['type'] as string;

    switch (type) {
      case 'greeting':
        return {
          type: 'greeting',
          headline: sanitize(obj['headline']),
          body: sanitize(obj['body']),
          actions: parseActions(obj['actions']),
        };

      case 'feature':
        return {
          type: 'feature',
          headline: sanitize(obj['headline']),
          feature: sanitize(obj['feature']),
          description: sanitize(obj['description']),
          stats: parseStats(obj['stats']),
          actions: parseActions(obj['actions']),
        };

      case 'pricing':
        return {
          type: 'pricing',
          headline: sanitize(obj['headline']),
          plans: parsePlans(obj['plans']),
          actions: parseActions(obj['actions']),
        };

      case 'engagement':
        return {
          type: 'engagement',
          headline: sanitize(obj['headline']),
          body: sanitize(obj['body']),
          socialProof: obj['socialProof'] ? sanitize(obj['socialProof']) : undefined,
          stats: parseStats(obj['stats']),
          actions: parseActions(obj['actions']),
        };

      case 'comparison':
        return {
          type: 'comparison',
          headline: sanitize(obj['headline']),
          items: parseComparisonItems(obj['items']),
          actions: parseActions(obj['actions']),
        };

      default:
        console.warn('[Dendron] Unknown card type:', type);
        return null;
    }
  } catch (err) {
    console.warn('[Dendron] Failed to parse Smart Card response:', err);
    return null;
  }
}

// ─── Sanitization helpers (DOM-API only, no innerHTML) ────────
function sanitizeText(input: string): string {
  // Step 1: Strip any HTML tags using regex (safe — we never interpret them)
  const stripped = input.replace(/<[^>]*>/g, '');
  // Step 2: Use textContent assignment to decode HTML entities safely
  if (typeof document !== 'undefined') {
    const temp = document.createElement('span');
    temp.textContent = stripped;
    return temp.textContent ?? '';
  }
  return stripped;
}

function parseActions(raw: unknown): SmartCard['actions'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 2) // Max 2 actions
    .map((a) => {
      if (typeof a !== 'object' || !a) return null;
      const action = a as Record<string, unknown>;
      if (!action['label'] || typeof action['label'] !== 'string') return null;
      return {
        label: sanitizeText(action['label'] as string),
        href: typeof action['href'] === 'string' ? action['href'] : undefined,
        action: typeof action['action'] === 'string' ? action['action'] : undefined,
        variant: (['primary', 'secondary', 'ghost'] as const).includes(action['variant'] as 'primary')
          ? (action['variant'] as 'primary' | 'secondary' | 'ghost')
          : undefined,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);
}

function parseStats(raw: unknown): Array<{ label: string; value: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const result = raw
    .map((s) => {
      if (typeof s !== 'object' || !s) return null;
      const stat = s as Record<string, unknown>;
      if (typeof stat['label'] !== 'string' || typeof stat['value'] !== 'string') return null;
      return { label: sanitizeText(stat['label']), value: sanitizeText(stat['value']) };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  return result.length > 0 ? result : undefined;
}

function parsePlans(raw: unknown): Array<{ name: string; price: string; period?: string; highlight?: boolean; features: string[] }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p) => {
      if (typeof p !== 'object' || !p) return null;
      const plan = p as Record<string, unknown>;
      if (typeof plan['name'] !== 'string' || typeof plan['price'] !== 'string') return null;
      const features = Array.isArray(plan['features'])
        ? plan['features'].filter((f): f is string => typeof f === 'string').map(sanitizeText)
        : [];
      return {
        name: sanitizeText(plan['name']),
        price: sanitizeText(plan['price']),
        period: typeof plan['period'] === 'string' ? sanitizeText(plan['period']) : undefined,
        highlight: Boolean(plan['highlight']),
        features,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

function parseComparisonItems(raw: unknown): Array<{ name: string; attributes: Record<string, string> }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== 'object' || !item) return null;
      const i = item as Record<string, unknown>;
      if (typeof i['name'] !== 'string') return null;
      const attrs: Record<string, string> = {};
      if (typeof i['attributes'] === 'object' && i['attributes']) {
        for (const [k, v] of Object.entries(i['attributes'])) {
          if (typeof v === 'string') attrs[k] = sanitizeText(v);
        }
      }
      return { name: sanitizeText(i['name']), attributes: attrs };
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);
}

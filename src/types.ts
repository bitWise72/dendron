// ============================================================
// DENDRON SDK — CORE TYPE DEFINITIONS
// Version 1.0 | April 2026
// ============================================================

// ─── Context Payload ────────────────────────────────────────

export interface SectionContext {
  id: string;
  label: string;
  visibilityRatio: number;       // 0-1
  readingTime: number;           // accumulated seconds
  enterTime: number;             // performance.now()
  exitTime: number | null;
  revisitCount: number;
  isActive: boolean;
}

export interface InteractionEvent {
  type: 'click' | 'hover' | 'focus' | 'scroll' | 'mutation';
  target: string;                // element tag + class summary
  text?: string;                 // visible text content (truncated)
  section?: string;              // nearest section ID
  timestamp: number;
}

export interface DendronContextPayload {
  sessionId: string;             // Random UUID, per-session, never persisted server-side
  timestamp: number;             // Unix ms
  page: {
    url: string;
    title: string;
    sections: SectionContext[];
  };
  visitor: {
    scrollDepth: number;         // 0-100 percentage
    totalReadingTime: number;    // seconds across all sections
    intentScore: number;         // 0-100 composite
    focusSection: string;        // section ID with highest engagement
    interactionHistory: InteractionEvent[]; // last 20 events
  };
  trigger: {
    reason: 'threshold' | 'user_action' | 'timer';
    sectionId: string;
    score: number;
  };
}

// ─── Smart Cards ────────────────────────────────────────────

export type SmartCardType = 'greeting' | 'pricing' | 'feature' | 'engagement' | 'comparison';

export interface SmartCardAction {
  label: string;
  href?: string;
  action?: string;               // custom action identifier
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface GreetingCard {
  type: 'greeting';
  headline: string;
  body: string;
  actions: SmartCardAction[];
}

export interface FeatureCard {
  type: 'feature';
  headline: string;
  feature: string;
  description: string;
  stats?: Array<{ label: string; value: string }>;
  actions: SmartCardAction[];
}

export interface PricingCard {
  type: 'pricing';
  headline: string;
  plans: Array<{
    name: string;
    price: string;
    period?: string;
    highlight?: boolean;
    features: string[];
  }>;
  actions: SmartCardAction[];
}

export interface EngagementCard {
  type: 'engagement';
  headline: string;
  body: string;
  socialProof?: string;
  stats?: Array<{ label: string; value: string }>;
  actions: SmartCardAction[];
}

export interface ComparisonCard {
  type: 'comparison';
  headline: string;
  items: Array<{
    name: string;
    attributes: Record<string, string>;
  }>;
  actions: SmartCardAction[];
}

export type SmartCard =
  | GreetingCard
  | FeatureCard
  | PricingCard
  | EngagementCard
  | ComparisonCard;

// ─── Configuration ──────────────────────────────────────────

export interface TrackingConfig {
  scrollDebounce: number;         // ms, default 200
  cursorDebounce: number;         // ms, default 300
  readingInterval: number;        // ms, default 1000
  mutationFlushInterval: number;  // ms, default 500
}

export interface IntentConfig {
  triggerThreshold: number;       // 0-100, default 55
  cooldownSeconds: number;        // default 30
  maxCardsPerSession: number;     // default 5
}

export interface StorageConfig {
  maxStorageMB: number;           // default 25
  embeddingTTLDays: number;       // default 7
  cleanupIntervalMinutes: number; // default 5
}

export interface UIConfig {
  position: 'bottom-right' | 'bottom-left';
  theme: 'light' | 'dark' | 'auto';
  branding: boolean;
  zIndex: number;
}

export interface DendronConfig {
  onQuery: (payload: DendronContextPayload) => Promise<SmartCard>;
  tracking?: Partial<TrackingConfig>;
  intent?: Partial<IntentConfig>;
  storage?: Partial<StorageConfig>;
  ui?: Partial<UIConfig>;
  systemContext?: string;
  webMCP?: boolean;
  debug?: boolean;
}

export interface DendronResolvedConfig {
  onQuery: (payload: DendronContextPayload) => Promise<SmartCard>;
  tracking: TrackingConfig;
  intent: IntentConfig;
  storage: StorageConfig;
  ui: UIConfig;
  systemContext: string;
  webMCP: boolean;
  debug: boolean;
}

// ─── Worker Messages ────────────────────────────────────────

export type WorkerInboundMessage =
  | { type: 'scroll'; y: number; vh: number; dh: number; t: number }
  | { type: 'click'; tag: string; classes: string; text: string; section: string; t: number }
  | { type: 'hover'; x: number; y: number; tag: string; t: number }
  | { type: 'intersection'; id: string; ratio: number; entering: boolean; t: number }
  | { type: 'mutation'; added: number; removed: number; t: number }
  | { type: 'config'; config: DendronResolvedConfig }
  | { type: 'reading_tick'; sectionId: string; t: number }
  | { type: 'reset' };

export type WorkerOutboundMessage =
  | { type: 'trigger'; payload: DendronContextPayload }
  | { type: 'state_update'; state: BehavioralState }
  | { type: 'error'; message: string };

// ─── Internal State ─────────────────────────────────────────

export interface BehavioralState {
  sessionId: string;
  scrollDepth: number;
  scrollVelocity: number;
  scrollDirection: 'up' | 'down' | 'none';
  sections: Map<string, SectionContext>;
  intentScore: number;
  dimensions: {
    engagementDepth: number;
    interactionFocus: number;
    navigationPattern: number;
  };
  interactionHistory: InteractionEvent[];
  lastTriggerTime: number;
  cardCount: number;
  lastScrollY: number;
  lastScrollT: number;
}

// ─── Events ─────────────────────────────────────────────────

export type DendronEventMap = {
  'trigger': DendronContextPayload;
  'card:rendered': SmartCard;
  'card:action': SmartCardAction & { cardType: SmartCardType };
  'card:dismissed': { cardType: SmartCardType };
  'error': Error;
  'ready': void;
  'destroy': void;
};

export type DendronEventName = keyof DendronEventMap;
export type DendronEventHandler<K extends DendronEventName> = (
  data: DendronEventMap[K]
) => void;

// ─── DOM Map (for WebMCP) ────────────────────────────────────

export interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

export interface DOMForm {
  element: HTMLFormElement;
  inferredAction: string;
  inferredDescription: string;
  fieldSchema: Record<string, unknown>;
  fields: FormField[];
}

export interface DOMCTA {
  element: HTMLButtonElement | HTMLAnchorElement;
  inferredAction: string;
  inferredDescription: string;
}

export interface DOMMap {
  forms: DOMForm[];
  ctas: DOMCTA[];
  sections: Array<{ id: string; heading: string; element: HTMLElement }>;
}

// ─── Embedding Storage ──────────────────────────────────────

export interface EmbeddingEntry {
  key: string;
  vector: Float32Array;
  createdAt: number;
  lastAccessedAt: number;
}

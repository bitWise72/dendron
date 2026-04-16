// ============================================================
// DENDRON SDK — WEB WORKER
// This entire file runs inside a dedicated Web Worker.
// No DOM access. No window. No document.
// Receives events from main thread, runs the Context Engine,
// fires trigger messages back when intent threshold is met.
// ============================================================

import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  BehavioralState,
  SectionContext,
  InteractionEvent,
  DendronContextPayload,
  DendronResolvedConfig,
} from '../types';

// ─── Scoring Constants ───────────────────────────────────────
const WEIGHT_ENGAGEMENT = 0.4;
const WEIGHT_INTERACTION = 0.35;
const WEIGHT_NAVIGATION = 0.25;

// ─── State ───────────────────────────────────────────────────
let config: DendronResolvedConfig | null = null;

const state: BehavioralState = {
  sessionId: generateUUID(),
  scrollDepth: 0,
  scrollVelocity: 0,
  scrollDirection: 'none',
  sections: new Map<string, SectionContext>(),
  intentScore: 0,
  dimensions: { engagementDepth: 0, interactionFocus: 0, navigationPattern: 0 },
  interactionHistory: [],
  lastTriggerTime: 0,
  cardCount: 0,
  lastScrollY: 0,
  lastScrollT: 0,
};

// ─── UUID Generator (no crypto in Worker in some envs) ───────
function generateUUID(): string {
  // RFC 4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Section Helpers ─────────────────────────────────────────
function getOrCreateSection(id: string): SectionContext {
  if (!state.sections.has(id)) {
    state.sections.set(id, {
      id,
      label: id,
      visibilityRatio: 0,
      readingTime: 0,
      enterTime: performance.now(),
      exitTime: null,
      revisitCount: 0,
      isActive: false,
    });
  }
  return state.sections.get(id)!;
}

// ─── Intent Scoring ──────────────────────────────────────────

function computeEngagementDepth(): number {
  let score = 0;
  let maxReading = 0;

  state.sections.forEach((sec) => {
    // Reading time dimension
    if (sec.readingTime >= 10) score += 80;
    else if (sec.readingTime > 0) score += (sec.readingTime / 10) * 80;

    // Revisit bonus
    if (sec.revisitCount > 0) score += Math.min(sec.revisitCount * 20, 40);

    maxReading = Math.max(maxReading, sec.readingTime);
  });

  // Scroll depth bonus
  score += (state.scrollDepth / 100) * 30;

  return Math.min(score, 100);
}

function computeInteractionFocus(): number {
  let score = 0;

  for (const event of state.interactionHistory) {
    if (event.type === 'click') {
      const text = (event.text ?? '').toLowerCase();
      // CTA-like clicks
      if (
        text.includes('trial') ||
        text.includes('start') ||
        text.includes('sign') ||
        text.includes('get') ||
        text.includes('demo') ||
        text.includes('buy') ||
        text.includes('pricing')
      ) {
        score += 30;
      } else {
        score += 10;
      }
    } else if (event.type === 'hover') {
      // Hover duration approximated by event count
      score += 2;
    } else if (event.type === 'focus') {
      score += 25;
    }
  }

  return Math.min(score, 100);
}

function computeNavigationPattern(): number {
  let score = 0;

  // Slow deliberate scroll
  if (state.scrollVelocity < 0.5 && state.scrollVelocity > 0) {
    score += 20;
  }

  // Direction changes (back-tracking)
  const dirChanges = countDirectionChanges();
  score += Math.min(dirChanges * 15, 30);

  // Multiple sections visited
  let visitedSections = 0;
  state.sections.forEach((sec) => {
    if (sec.readingTime > 1) visitedSections++;
  });
  score += Math.min(visitedSections * 10, 40);

  return Math.min(score, 100);
}

// Simple direction change counter from interaction history
const scrollDirections: Array<'up' | 'down'> = [];
function countDirectionChanges(): number {
  let changes = 0;
  for (let i = 1; i < scrollDirections.length; i++) {
    if (scrollDirections[i] !== scrollDirections[i - 1]) changes++;
  }
  return changes;
}

function computeIntentScore(): number {
  const eng = computeEngagementDepth();
  const int = computeInteractionFocus();
  const nav = computeNavigationPattern();

  state.dimensions = {
    engagementDepth: Math.round(eng),
    interactionFocus: Math.round(int),
    navigationPattern: Math.round(nav),
  };

  return Math.round(eng * WEIGHT_ENGAGEMENT + int * WEIGHT_INTERACTION + nav * WEIGHT_NAVIGATION);
}

// ─── Payload Assembly ────────────────────────────────────────

function getFocusSection(): string {
  let best = { id: '', score: -1 };
  state.sections.forEach((sec) => {
    const score = sec.readingTime * 2 + sec.revisitCount * 10 + sec.visibilityRatio * 5;
    if (score > best.score) {
      best = { id: sec.id, score };
    }
  });
  return best.id;
}

function assemblePayload(triggerReason: DendronContextPayload['trigger']['reason']): DendronContextPayload {
  const focusSectionId = getFocusSection();

  return {
    sessionId: state.sessionId,
    timestamp: Date.now(),
    page: {
      url: '',           // populated in main thread via postMessage data
      title: '',
      sections: Array.from(state.sections.values()),
    },
    visitor: {
      scrollDepth: state.scrollDepth,
      totalReadingTime: Array.from(state.sections.values()).reduce((s, sec) => s + sec.readingTime, 0),
      intentScore: state.intentScore,
      focusSection: focusSectionId,
      interactionHistory: state.interactionHistory.slice(-20),
    },
    trigger: {
      reason: triggerReason,
      sectionId: focusSectionId,
      score: state.intentScore,
    },
  };
}

// ─── Trigger Logic ───────────────────────────────────────────

function checkAndFireTrigger(): void {
  if (!config) return;

  const now = performance.now();
  const cooldownMs = config.intent.cooldownSeconds * 1000;
  const sinceLast = now - state.lastTriggerTime;

  if (state.cardCount >= config.intent.maxCardsPerSession) return;
  if (state.lastTriggerTime > 0 && sinceLast < cooldownMs) return;
  if (state.intentScore < config.intent.triggerThreshold) return;

  state.lastTriggerTime = now;
  state.cardCount++;

  const payload = assemblePayload('threshold');
  const msg: WorkerOutboundMessage = { type: 'trigger', payload };
  self.postMessage(msg);

  // Also send state update for debug overlay
  emitStateUpdate();
}

function emitStateUpdate(): void {
  const msg: WorkerOutboundMessage = { type: 'state_update', state: { ...state } };
  self.postMessage(msg);
}

// ─── Message Handlers ────────────────────────────────────────

function handleScroll(msg: Extract<WorkerInboundMessage, { type: 'scroll' }>): void {
  const pct = msg.dh > msg.vh ? Math.min(100, Math.round(((msg.y + msg.vh) / msg.dh) * 100)) : 100;
  state.scrollDepth = Math.max(state.scrollDepth, pct);

  // Velocity & direction
  const dt = msg.t - state.lastScrollT;
  if (dt > 0) {
    const dy = msg.y - state.lastScrollY;
    state.scrollVelocity = Math.abs(dy / dt); // px/ms
    const dir: 'up' | 'down' | 'none' = dy > 0 ? 'down' : dy < 0 ? 'up' : 'none';
    state.scrollDirection = dir;
    if (dir !== 'none') scrollDirections.push(dir);
    if (scrollDirections.length > 50) scrollDirections.shift();
  }

  state.lastScrollY = msg.y;
  state.lastScrollT = msg.t;

  // Recompute and maybe trigger
  state.intentScore = computeIntentScore();
  checkAndFireTrigger();
}

function handleClick(msg: Extract<WorkerInboundMessage, { type: 'click' }>): void {
  const event: InteractionEvent = {
    type: 'click',
    target: `${msg.tag}.${msg.classes.slice(0, 40)}`,
    text: msg.text,
    section: msg.section,
    timestamp: msg.t,
  };
  pushInteractionEvent(event);

  // Update section click count
  if (msg.section) {
    const sec = getOrCreateSection(msg.section);
    // Not tracked explicitly, but score comes from history
    void sec;
  }

  state.intentScore = computeIntentScore();
  checkAndFireTrigger();
}

function handleIntersection(msg: Extract<WorkerInboundMessage, { type: 'intersection' }>): void {
  const sec = getOrCreateSection(msg.id);

  if (msg.entering && !sec.isActive) {
    sec.revisitCount++;
    sec.isActive = true;
    sec.enterTime = msg.t;
    sec.exitTime = null;
  } else if (!msg.entering && sec.isActive) {
    sec.isActive = false;
    sec.exitTime = msg.t;
  }

  sec.visibilityRatio = msg.ratio;
  state.intentScore = computeIntentScore();
  checkAndFireTrigger();
}

function handleReadingTick(msg: Extract<WorkerInboundMessage, { type: 'reading_tick' }>): void {
  const sec = getOrCreateSection(msg.sectionId);
  sec.readingTime += 1; // 1 second per tick

  state.intentScore = computeIntentScore();
  checkAndFireTrigger();
}

function handleHover(msg: Extract<WorkerInboundMessage, { type: 'hover' }>): void {
  const event: InteractionEvent = {
    type: 'hover',
    target: msg.tag,
    timestamp: msg.t,
  };
  pushInteractionEvent(event);
  // Hover alone doesn't trigger; contributes to score on next scroll/click
}

function handleMutation(_msg: Extract<WorkerInboundMessage, { type: 'mutation' }>): void {
  // DOM mutations tracked but low weight — just log event
  const event: InteractionEvent = {
    type: 'mutation',
    target: 'dom',
    timestamp: _msg.t,
  };
  pushInteractionEvent(event);
}

function pushInteractionEvent(event: InteractionEvent): void {
  state.interactionHistory.push(event);
  // Circular buffer: keep last 50 events in worker, trim to 20 on payload assembly
  if (state.interactionHistory.length > 50) {
    state.interactionHistory.shift();
  }
}

// ─── Main Worker Message Loop ─────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerInboundMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'config':
      config = msg.config;
      break;
    case 'scroll':
      handleScroll(msg);
      break;
    case 'click':
      handleClick(msg);
      break;
    case 'hover':
      handleHover(msg);
      break;
    case 'intersection':
      handleIntersection(msg);
      break;
    case 'reading_tick':
      handleReadingTick(msg);
      break;
    case 'mutation':
      handleMutation(msg);
      break;
    case 'reset':
      // Reset session state
      state.sections.clear();
      state.interactionHistory = [];
      state.intentScore = 0;
      state.scrollDepth = 0;
      state.cardCount = 0;
      state.lastTriggerTime = 0;
      state.sessionId = generateUUID();
      scrollDirections.length = 0;
      break;
  }

  // Emit state update for debug overlay every message
  if (config?.debug) {
    emitStateUpdate();
  }
};

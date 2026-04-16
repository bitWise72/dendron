// ============================================================
// DENDRON SDK — MAIN CLASS
// The single entry point the developer interacts with.
// Orchestrates all modules: Tracker → Context → Prompt → Renderer
// ============================================================

import { TrackerModule } from './tracker';
import { CardRenderer } from './renderer';
import { DebugOverlay } from './debug/overlay';
import { MicroEmbeddingsModule } from './embeddings/module';
import { buildPrompt, parseSmartCardResponse } from './prompt/builder';
import { analyzeDOMForMCP, registerWebMCPTools, unregisterWebMCPTools } from './plugins/webmcp';
import { bus } from './events/bus';

import type {
  DendronConfig,
  DendronResolvedConfig,
  DendronContextPayload,
  SmartCardAction,
  SmartCardType,
  DOMMap,
  DendronEventName,
  DendronEventMap,
  BehavioralState,
} from './types';

// ─── Defaults ────────────────────────────────────────────────

const DEFAULT_CONFIG: Omit<DendronResolvedConfig, 'onQuery'> = {
  tracking: {
    scrollDebounce: 200,
    cursorDebounce: 300,
    readingInterval: 1000,
    mutationFlushInterval: 500,
  },
  intent: {
    triggerThreshold: 55,
    cooldownSeconds: 30,
    maxCardsPerSession: 5,
  },
  storage: {
    maxStorageMB: 25,
    embeddingTTLDays: 7,
    cleanupIntervalMinutes: 5,
  },
  ui: {
    position: 'bottom-right',
    theme: 'auto',
    branding: true,
    zIndex: 999999,
  },
  systemContext: '',
  webMCP: false,
  debug: false,
};

// ─── Singleton Guard ─────────────────────────────────────────

let isInitialized = false;

// ─── Main Dendron Class ───────────────────────────────────────

export class DendronSDK {
  private config: DendronResolvedConfig | null = null;
  private tracker = new TrackerModule();
  private renderer = new CardRenderer();
  private debugOverlay = new DebugOverlay();
  private embeddings = new MicroEmbeddingsModule();
  private domMap: DOMMap | null = null;
  private isQuerying = false;

  // ─── init() ────────────────────────────────────────────────
  init(userConfig: DendronConfig): void {
    if (isInitialized) {
      console.warn('[Dendron] Already initialized. Call Dendron.destroy() first.');
      return;
    }

    if (!userConfig.onQuery || typeof userConfig.onQuery !== 'function') {
      throw new Error('[Dendron] onQuery callback is required. Provide a function that routes to your LLM backend.');
    }

    // Resolve config with defaults
    this.config = this.resolveConfig(userConfig);

    if (this.config.debug) {
      console.log('[Dendron] Initializing in debug mode', this.config);
    }

    // 1. Mount renderer (Shadow DOM widget + FAB)
    this.renderer.mount(this.config);
    this.renderer.onAction = (action) => this.handleCardAction(action);
    this.renderer.onManualQuery = () => this.triggerManualQuery();
    this.renderer.onDismiss = (cardType) => {
      bus.emit('card:dismissed', { cardType });
    };

    // 2. Mount debug overlay
    if (this.config.debug) {
      this.debugOverlay.mount(this.config);
    }

    // 3. Init embeddings (lazy-loaded on first trigger)
    this.embeddings.init(this.config.storage).catch(() => {});

    // 4. Start tracker (Web Worker + listeners)
    this.tracker.init(
      this.config,
      (payload) => this.handleTrigger(payload),
      this.config.debug ? (state) => this.handleStateUpdate(state) : undefined
    );

    // 5. WebMCP plugin (optional)
    if (this.config.webMCP) {
      // Run DOM analysis after page is fully rendered
      window.addEventListener('load', () => {
        this.domMap = analyzeDOMForMCP();
        registerWebMCPTools(this.domMap);
      }, { once: true });
    }

    isInitialized = true;
    bus.emit('ready', undefined as void);
  }

  // ─── on() — Public event subscription ──────────────────────
  on<K extends DendronEventName>(
    event: K,
    handler: (data: DendronEventMap[K]) => void
  ): () => void {
    return bus.on(event, handler);
  }

  // ─── destroy() ──────────────────────────────────────────────
  destroy(): void {
    if (!isInitialized) return;

    // Emit before clearing so subscribers can react
    bus.emit('destroy', undefined as void);

    if (this.domMap && this.config?.webMCP) {
      try {
        unregisterWebMCPTools(this.domMap);
      } catch {
        // Swallow — host page may have already cleaned up
      }
    }

    this.tracker.destroy();
    this.renderer.destroy();
    this.debugOverlay.destroy();
    this.embeddings.destroy();
    bus.clear();

    this.config = null;
    this.domMap = null;
    this.isQuerying = false;
    isInitialized = false;
  }

  // ─── Private: Handle automatic trigger from Context Engine ──
  private async handleTrigger(payload: DendronContextPayload): Promise<void> {
    if (!this.config) return;
    if (this.isQuerying) return;

    bus.emit('trigger', payload);

    if (this.config.debug) {
      this.debugOverlay.logTrigger(payload);
    }

    await this.query(payload);
  }

  // ─── Private: Manual trigger (FAB click / user message) ─────
  private async triggerManualQuery(): Promise<void> {
    if (!this.config || this.isQuerying) return;

    // Build a minimal context payload for manual triggers
    const manualPayload: DendronContextPayload = {
      sessionId: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      page: {
        url: window.location.href,
        title: document.title,
        sections: [],
      },
      visitor: {
        scrollDepth: 0,
        totalReadingTime: 0,
        intentScore: 0,
        focusSection: '',
        interactionHistory: [],
      },
      trigger: {
        reason: 'user_action',
        sectionId: '',
        score: 0,
      },
    };

    await this.query(manualPayload);
  }

  // ─── Private: Run the query pipeline ────────────────────────
  private async query(payload: DendronContextPayload): Promise<void> {
    if (!this.config || this.isQuerying) return;
    this.isQuerying = true;

    // Show loading state
    this.renderer.showLoading();
    if (!this.renderer.isOpen) {
      this.renderer.showFAB();
    }

    try {
      // Build the prompt (Prompt Builder module)
      const promptText = buildPrompt(payload, this.config);

      if (this.config.debug) {
        console.group('%c[Dendron] 📝 Prompt Built', 'color: #f59e0b');
        console.log(promptText);
        console.groupEnd();
      }

      // Fire optional embedding (non-blocking)
      this.embeddings.embed(payload).catch(() => {});

      // Call developer's onQuery callback
      // This is the ONLY network call Dendron makes — and it's the developer's code
      const rawResponse = await this.config.onQuery(payload);

      // Parse and sanitize response
      const card = parseSmartCardResponse(rawResponse);

      if (!card) {
        this.renderer.removeLoading();
        throw new Error('[Dendron] onQuery returned an invalid SmartCard response');
      }

      if (this.config.debug) {
        this.debugOverlay.logCard(card);
      }

      // Render the card
      this.renderer.renderCard(card);
      bus.emit('card:rendered', card);

    } catch (err) {
      this.renderer.removeLoading();
      const error = err instanceof Error ? err : new Error(String(err));
      bus.emit('error', error);
      if (this.config.debug) {
        console.error('[Dendron] Query error:', error);
      }
    } finally {
      this.isQuerying = false;
    }
  }

  // ─── Private: Handle state updates from Worker ───────────────
  private handleStateUpdate(state: BehavioralState): void {
    if (this.config?.debug) {
      this.debugOverlay.updateState(state);
    }
  }

  // ─── Private: Handle card action clicks ──────────────────────
  private handleCardAction(action: SmartCardAction & { cardType: SmartCardType }): void {
    bus.emit('card:action', action);

    if (this.config?.debug) {
      console.log('[Dendron] Card action:', action);
    }
  }

  // ─── Private: Config resolution ──────────────────────────────
  private resolveConfig(userConfig: DendronConfig): DendronResolvedConfig {
    return {
      onQuery: userConfig.onQuery,
      tracking: {
        ...DEFAULT_CONFIG.tracking,
        ...(userConfig.tracking ?? {}),
      },
      intent: {
        ...DEFAULT_CONFIG.intent,
        ...(userConfig.intent ?? {}),
      },
      storage: {
        ...DEFAULT_CONFIG.storage,
        ...(userConfig.storage ?? {}),
      },
      ui: {
        ...DEFAULT_CONFIG.ui,
        ...(userConfig.ui ?? {}),
      },
      systemContext: userConfig.systemContext ?? '',
      webMCP: userConfig.webMCP ?? false,
      debug: userConfig.debug ?? false,
    };
  }
}

// ============================================================
// DENDRON SDK — DEVTOOLS OVERLAY
// Only rendered when debug: true. Tree-shaken in production.
// Shows real-time behavioral signals, intent scores, trigger
// events, context payloads, and prompt/response pairs.
// ============================================================

import type { BehavioralState, DendronContextPayload, SmartCard, DendronResolvedConfig } from '../types';

export class DebugOverlay {
  private overlay: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private enabled = false;

  // ─── Mount ───────────────────────────────────────
  mount(config: DendronResolvedConfig): void {
    if (!config.debug) return;
    this.enabled = true;

    const host = document.createElement('dendron-debug');
    this.shadow = host.attachShadow({ mode: 'closed' });

    // Inject styles — subset of main styles for debug panel
    const style = document.createElement('style');
    style.textContent = DEBUG_OVERLAY_STYLES;
    this.shadow.appendChild(style);

    this.overlay = document.createElement('div');
    this.overlay.className = `dendron-debug ${config.ui.position}`;
    this.overlay.style.zIndex = String(config.ui.zIndex + 1);

    const title = document.createElement('div');
    title.className = 'debug-title';
    title.textContent = '⚡ Dendron DevTools';
    this.overlay.appendChild(title);

    this.shadow.appendChild(this.overlay);
    document.body.appendChild(host);
  }

  // ─── Update from worker state ─────────────────────
  updateState(state: BehavioralState): void {
    if (!this.enabled || !this.overlay) return;

    // Clear and rebuild
    while (this.overlay.children.length > 1) {
      this.overlay.removeChild(this.overlay.lastChild!);
    }

    // Intent Score
    this.addSection('Intent Score', () => {
      const scoreEl = this.makeScoreBar(
        'Composite',
        state.intentScore,
        '#818cf8'
      );
      const engEl = this.makeScoreBar('Engagement', state.dimensions.engagementDepth, '#34d399');
      const intEl = this.makeScoreBar('Interaction', state.dimensions.interactionFocus, '#f59e0b');
      const navEl = this.makeScoreBar('Navigation', state.dimensions.navigationPattern, '#fb7185');
      return [scoreEl, engEl, intEl, navEl];
    });

    // Session Info
    this.addSection('Session', () => {
      return [
        this.makeKV('Scroll Depth', `${state.scrollDepth}%`),
        this.makeKV('Session ID', state.sessionId.slice(0, 8) + '...'),
        this.makeKV('Cards Shown', String(state.cardCount)),
        this.makeKV('Sections', String(state.sections.size)),
      ];
    });

    // Sections
    if (state.sections.size > 0) {
      this.addSection('Sections', () => {
        const items: HTMLElement[] = [];
        state.sections.forEach((sec) => {
          const el = document.createElement('div');
          el.className = 'debug-value';
          el.textContent = `${sec.id}: ${Math.round(sec.readingTime)}s, ${sec.revisitCount}x`;
          items.push(el);
        });
        return items;
      });
    }

    // Recent Interactions
    if (state.interactionHistory.length > 0) {
      this.addSection('Recent Events', () => {
        return state.interactionHistory.slice(-5).reverse().map((ev, i) => {
          const el = document.createElement('div');
          el.className = i === 0 ? 'debug-event new' : 'debug-event';
          const time = new Date(ev.timestamp).toLocaleTimeString('en', { hour12: false });
          el.textContent = `${time} ${ev.type}→${ev.target.slice(0, 20)}`;
          return el;
        });
      });
    }
  }

  // ─── Log trigger event ────────────────────────────
  logTrigger(payload: DendronContextPayload): void {
    if (!this.enabled) return;
    console.group('%c[Dendron] 🎯 Trigger Fired', 'color: #818cf8; font-weight: bold');
    console.log('Score:', payload.trigger.score);
    console.log('Reason:', payload.trigger.reason);
    console.log('Focus:', payload.visitor.focusSection);
    console.log('Payload:', payload);
    console.groupEnd();
  }

  // ─── Log card rendered ────────────────────────────
  logCard(card: SmartCard): void {
    if (!this.enabled) return;
    console.group('%c[Dendron] 🃏 Smart Card', 'color: #34d399; font-weight: bold');
    console.log('Type:', card.type);
    console.log('Card:', card);
    console.groupEnd();
  }

  // ─── Helpers ──────────────────────────────────────
  private addSection(label: string, build: () => HTMLElement[]): void {
    const section = document.createElement('div');
    section.className = 'debug-section';

    const lbl = document.createElement('div');
    lbl.className = 'debug-label';
    lbl.textContent = label;
    section.appendChild(lbl);

    build().forEach((el) => section.appendChild(el));
    this.overlay!.appendChild(section);
  }

  private makeScoreBar(label: string, value: number, color: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'debug-score';

    const lbl = document.createElement('span');
    lbl.style.width = '80px';
    lbl.style.fontSize = '10px';
    lbl.style.color = '#64748b';
    lbl.style.flexShrink = '0';
    lbl.textContent = label;

    const bar = document.createElement('div');
    bar.className = 'debug-bar';

    const fill = document.createElement('div');
    fill.className = 'debug-bar-fill';
    fill.style.width = `${Math.min(value, 100)}%`;
    fill.style.background = color;

    const num = document.createElement('span');
    num.className = 'debug-num';
    num.textContent = String(Math.round(value));

    bar.appendChild(fill);
    row.appendChild(lbl);
    row.appendChild(bar);
    row.appendChild(num);

    return row;
  }

  private makeKV(key: string, value: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'debug-value';
    el.textContent = `${key}: ${value}`;
    return el;
  }

  destroy(): void {
    this.overlay?.parentElement?.parentElement?.remove();
    this.overlay = null;
    this.shadow = null;
  }
}

// Minimal styles for debug overlay (separate from main Shadow DOM)
const DEBUG_OVERLAY_STYLES = `
  .dendron-debug {
    position: fixed;
    width: 260px;
    max-height: 80vh;
    overflow-y: auto;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 12px;
    font-size: 11px;
    font-family: 'Fira Code', 'Cascadia Code', 'Monaco', monospace;
    z-index: 1000001;
    line-height: 1.6;
    bottom: 24px;
  }
  .dendron-debug.bottom-right { right: 390px; }
  .dendron-debug.bottom-left  { left:  390px; }
  .debug-title { font-size: 12px; font-weight: 700; color: #818cf8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
  .debug-section { margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
  .debug-label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
  .debug-value { color: #94a3b8; font-size: 10px; }
  .debug-score { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .debug-bar { flex: 1; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden; }
  .debug-bar-fill { height: 100%; background: #6366f1; border-radius: 2px; transition: width 0.3s ease; }
  .debug-num { font-size: 10px; color: #818cf8; width: 28px; text-align: right; flex-shrink: 0; }
  .debug-event { color: #475569; font-size: 10px; padding: 1px 0; }
  .debug-event.new { color: #a78bfa; }
`;

// ============================================================
// DENDRON SDK — INLINED SHADOW DOM STYLES
// All CSS is scoped inside Shadow DOM. Zero leakage to host page.
// Uses CSS custom properties for theming (light/dark/auto).
// ============================================================

export const DENDRON_STYLES = `
  :host {
    --d-primary: #6366f1;
    --d-primary-hover: #4f46e5;
    --d-primary-text: #ffffff;
    --d-bg: #ffffff;
    --d-surface: #f9fafb;
    --d-border: #e5e7eb;
    --d-text: #111827;
    --d-text-muted: #6b7280;
    --d-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
    --d-radius: 16px;
    --d-radius-sm: 8px;
    --d-z: 999999;
    --d-fab-size: 48px;
    --d-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --d-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    all: initial;
    font-family: var(--d-font);
    font-size: 14px;
    line-height: 1.5;
    color: var(--d-text);
    box-sizing: border-box;
  }

  @media (prefers-color-scheme: dark) {
    :host([data-theme="auto"]) {
      --d-bg: #1f2937;
      --d-surface: #111827;
      --d-border: #374151;
      --d-text: #f9fafb;
      --d-text-muted: #9ca3af;
      --d-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
    }
  }

  :host([data-theme="dark"]) {
    --d-bg: #1f2937;
    --d-surface: #111827;
    --d-border: #374151;
    --d-text: #f9fafb;
    --d-text-muted: #9ca3af;
    --d-shadow: 0 10px 40px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* ─── FAB ──────────────────────────────────────── */
  .dendron-fab {
    position: fixed;
    width: var(--d-fab-size);
    height: var(--d-fab-size);
    border-radius: 50%;
    background: var(--d-primary);
    color: var(--d-primary-text);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(99,102,241,0.4);
    z-index: var(--d-z);
    transition: transform var(--d-transition), box-shadow var(--d-transition), opacity var(--d-transition);
    opacity: 0;
    transform: scale(0.8);
    outline: none;
  }

  .dendron-fab.visible {
    opacity: 1;
    transform: scale(1);
    animation: dendron-pulse 3s ease-in-out 2s 3;
  }

  .dendron-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 20px rgba(99,102,241,0.5);
  }

  .dendron-fab:active {
    transform: scale(0.95);
  }

  .dendron-fab.bottom-right { bottom: 24px; right: 24px; }
  .dendron-fab.bottom-left  { bottom: 24px; left:  24px; }

  .dendron-fab svg {
    width: 22px;
    height: 22px;
    pointer-events: none;
    transition: transform var(--d-transition);
  }

  .dendron-fab.open svg.icon-chat { display: none; }
  .dendron-fab.open svg.icon-close { display: block; }
  .dendron-fab svg.icon-close { display: none; }

  @keyframes dendron-pulse {
    0%, 100% { box-shadow: 0 4px 16px rgba(99,102,241,0.4); }
    50%       { box-shadow: 0 4px 24px rgba(99,102,241,0.7); }
  }

  /* ─── Widget Panel ──────────────────────────────── */
  .dendron-panel {
    position: fixed;
    width: 320px;
    max-height: 60vh;
    background: var(--d-bg);
    border-radius: var(--d-radius);
    box-shadow: var(--d-shadow);
    border: 1px solid var(--d-border);
    z-index: calc(var(--d-z) - 1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(12px) scale(0.97);
    pointer-events: none;
    transition: opacity var(--d-transition), transform var(--d-transition);
  }

  .dendron-panel.open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: all;
  }

  .dendron-panel.bottom-right { bottom: 84px; right: 24px; }
  .dendron-panel.bottom-left  { bottom: 84px; left:  24px; }

  /* ─── Panel Header ──────────────────────────────── */
  .dendron-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--d-border);
    background: var(--d-surface);
    flex-shrink: 0;
  }

  .dendron-header-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--d-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .dendron-header-icon svg { width: 14px; height: 14px; color: white; }

  .dendron-header-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--d-text);
  }

  .dendron-header-sub {
    font-size: 11px;
    color: var(--d-text-muted);
  }

  /* ─── Card History ──────────────────────────────── */
  .dendron-cards {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
  }

  .dendron-cards::-webkit-scrollbar { width: 4px; }
  .dendron-cards::-webkit-scrollbar-thumb { background: var(--d-border); border-radius: 4px; }

  /* ─── Smart Card Base ───────────────────────────── */
  .d-card {
    background: var(--d-surface);
    border: 1px solid var(--d-border);
    border-radius: var(--d-radius-sm);
    padding: 14px;
    animation: dendron-card-in 0.25s ease-out;
  }

  @keyframes dendron-card-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .d-card-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--d-primary);
    background: rgba(99,102,241,0.1);
    border-radius: 4px;
    padding: 2px 6px;
    margin-bottom: 8px;
  }

  .d-card h3 {
    font-size: 14px;
    font-weight: 700;
    color: var(--d-text);
    margin-bottom: 6px;
    line-height: 1.3;
  }

  .d-card p {
    font-size: 13px;
    color: var(--d-text-muted);
    margin-bottom: 12px;
    line-height: 1.5;
  }

  /* ─── Actions ───────────────────────────────────── */
  .d-card-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .d-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 7px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background var(--d-transition), transform 0.1s;
    font-family: var(--d-font);
    white-space: nowrap;
  }

  .d-btn:active { transform: scale(0.97); }

  .d-btn-primary {
    background: var(--d-primary);
    color: var(--d-primary-text);
  }
  .d-btn-primary:hover { background: var(--d-primary-hover); }

  .d-btn-secondary {
    background: transparent;
    color: var(--d-text-muted);
    border: 1px solid var(--d-border);
  }
  .d-btn-secondary:hover { background: var(--d-border); color: var(--d-text); }

  .d-btn-ghost {
    background: transparent;
    color: var(--d-text-muted);
    padding: 7px 8px;
  }
  .d-btn-ghost:hover { color: var(--d-text); }

  /* ─── Stats Row ─────────────────────────────────── */
  .d-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .d-stat {
    background: var(--d-bg);
    border: 1px solid var(--d-border);
    border-radius: 6px;
    padding: 8px;
    text-align: center;
  }

  .d-stat-value {
    font-size: 16px;
    font-weight: 800;
    color: var(--d-primary);
    display: block;
    line-height: 1;
    margin-bottom: 2px;
  }

  .d-stat-label {
    font-size: 10px;
    color: var(--d-text-muted);
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ─── Pricing Plans ─────────────────────────────── */
  .d-plans {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .d-plan {
    background: var(--d-bg);
    border: 1px solid var(--d-border);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .d-plan.highlighted {
    border-color: var(--d-primary);
    background: rgba(99,102,241,0.05);
  }

  .d-plan-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .d-plan-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--d-text);
  }

  .d-plan-price {
    font-size: 16px;
    font-weight: 800;
    color: var(--d-primary);
  }

  .d-plan-period {
    font-size: 10px;
    color: var(--d-text-muted);
    font-weight: 400;
  }

  .d-plan-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .d-plan-feature {
    font-size: 11px;
    color: var(--d-text-muted);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .d-plan-feature::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--d-primary);
    flex-shrink: 0;
  }

  /* ─── Comparison Table ──────────────────────────── */
  .d-comparison {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 11px;
  }

  .d-comparison th, .d-comparison td {
    padding: 6px 8px;
    text-align: left;
    border-bottom: 1px solid var(--d-border);
  }

  .d-comparison th {
    font-weight: 700;
    color: var(--d-text);
    background: var(--d-surface);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .d-comparison td { color: var(--d-text-muted); }

  /* ─── Input ─────────────────────────────────────── */
  .dendron-input-row {
    padding: 10px 12px;
    border-top: 1px solid var(--d-border);
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  .dendron-input {
    flex: 1;
    font-family: var(--d-font);
    font-size: 13px;
    border: 1px solid var(--d-border);
    border-radius: 8px;
    padding: 8px 12px;
    background: var(--d-surface);
    color: var(--d-text);
    outline: none;
    transition: border-color var(--d-transition);
  }

  .dendron-input:focus { border-color: var(--d-primary); }
  .dendron-input::placeholder { color: var(--d-text-muted); }

  .dendron-input-send {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--d-primary);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background var(--d-transition);
  }

  .dendron-input-send:hover { background: var(--d-primary-hover); }
  .dendron-input-send svg { width: 14px; height: 14px; color: white; }

  /* ─── Loading State ─────────────────────────────── */
  .dendron-loading {
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--d-text-muted);
    font-size: 13px;
  }

  .dendron-dots {
    display: flex;
    gap: 4px;
  }

  .dendron-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--d-primary);
    animation: dendron-bounce 1.2s ease-in-out infinite;
  }

  .dendron-dots span:nth-child(2) { animation-delay: 0.15s; }
  .dendron-dots span:nth-child(3) { animation-delay: 0.3s; }

  @keyframes dendron-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40%           { transform: scale(1);   opacity: 1; }
  }

  /* ─── Social Proof ──────────────────────────────── */
  .d-social-proof {
    font-size: 11px;
    color: var(--d-text-muted);
    font-style: italic;
    margin-bottom: 10px;
    padding: 6px 10px;
    background: rgba(99,102,241,0.06);
    border-radius: 6px;
    border-left: 3px solid var(--d-primary);
  }

  /* ─── Branding ──────────────────────────────────── */
  .dendron-branding {
    font-size: 10px;
    color: var(--d-text-muted);
    text-align: center;
    padding: 6px;
    border-top: 1px solid var(--d-border);
    flex-shrink: 0;
    opacity: 0.7;
  }

  .dendron-branding a {
    color: var(--d-primary);
    text-decoration: none;
  }

  /* ─── Debug Overlay ─────────────────────────────── */
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
    font-family: 'Fira Code', 'Cascadia Code', monospace;
    z-index: calc(var(--d-z) + 1);
    line-height: 1.6;
  }

  .dendron-debug.bottom-right { bottom: 24px; right: 390px; }
  .dendron-debug.bottom-left  { bottom: 24px; left:  390px; }

  .debug-title {
    font-size: 12px;
    font-weight: 700;
    color: #818cf8;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .debug-section {
    margin-bottom: 10px;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 8px;
  }

  .debug-label {
    color: #64748b;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 3px;
  }

  .debug-value {
    color: #94a3b8;
  }

  .debug-score {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .debug-bar {
    flex: 1;
    height: 4px;
    background: #1e293b;
    border-radius: 2px;
    overflow: hidden;
  }

  .debug-bar-fill {
    height: 100%;
    background: #6366f1;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .debug-num {
    font-size: 10px;
    color: #818cf8;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }

  .debug-event {
    color: #475569;
    font-size: 10px;
    padding: 1px 0;
  }

  .debug-event.new { color: #a78bfa; }
`;

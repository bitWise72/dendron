// ============================================================
// DENDRON SDK — CARD RENDERER
// Mounts a closed Shadow DOM widget, renders Smart Cards.
// CRITICAL: Uses DOM API (createElement/textContent) only.
// No innerHTML. No eval. No external stylesheets.
// ============================================================

import { DENDRON_STYLES } from './styles';
import { renderGreetingCard } from './cards/greeting';
import { renderFeatureCard } from './cards/feature';
import { renderPricingCard } from './cards/pricing';
import { renderEngagementCard } from './cards/engagement';
import { renderComparisonCard } from './cards/comparison';

import type {
  SmartCard,
  SmartCardAction,
  DendronResolvedConfig,
  SmartCardType,
} from '../types';

const CHAT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const SEND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
const SPARK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

// ─── setSVG: safely set SVG content via innerHTML on trusted strings ──
// This is the ONLY place innerHTML is used, and ONLY for our own hardcoded SVG strings.
function setSVG(el: HTMLElement, svgString: string): void {
  // SVG strings above are fully controlled by us — no user/LLM data
  el.innerHTML = svgString;
}

export class CardRenderer {
  private hostEl: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private fab: HTMLButtonElement | null = null;
  private panel: HTMLElement | null = null;
  private cardsContainer: HTMLElement | null = null;
  private _isOpen = false;
  private config: DendronResolvedConfig | null = null;

  get isOpen(): boolean {
    return this._isOpen;
  }

  // Callbacks
  onAction: ((action: SmartCardAction & { cardType: SmartCardType }) => void) | null = null;
  onManualQuery: (() => void) | null = null;
  onDismiss: ((cardType: SmartCardType) => void) | null = null;

  mount(config: DendronResolvedConfig): void {
    this.config = config;

    // Create custom element host
    this.hostEl = document.createElement('dendron-widget');

    // Attach closed Shadow Root
    this.shadow = this.hostEl.attachShadow({ mode: 'closed' });

    // Inject scoped styles
    const styleEl = document.createElement('style');
    styleEl.textContent = DENDRON_STYLES;
    this.shadow.appendChild(styleEl);

    // Set theme attribute on host
    this.hostEl.setAttribute('data-theme', config.ui.theme);

    // Build FAB
    this.fab = this.buildFAB(config);

    // Build Panel
    this.panel = this.buildPanel(config);

    this.shadow.appendChild(this.fab);
    this.shadow.appendChild(this.panel);

    document.body.appendChild(this.hostEl);

    // Show FAB with delay
    setTimeout(() => {
      this.fab?.classList.add('visible');
    }, 5000); // Show after 5s per PRD spec
  }

  private buildFAB(config: DendronResolvedConfig): HTMLButtonElement {
    const fab = document.createElement('button');
    fab.className = `dendron-fab ${config.ui.position}`;
    fab.setAttribute('aria-label', 'Open Dendron assistant');
    fab.setAttribute('aria-expanded', 'false');
    fab.style.zIndex = String(config.ui.zIndex);

    const chatIcon = document.createElement('span');
    chatIcon.className = 'icon-chat';
    setSVG(chatIcon, CHAT_ICON);

    const closeIcon = document.createElement('span');
    closeIcon.className = 'icon-close';
    setSVG(closeIcon, CLOSE_ICON);

    fab.appendChild(chatIcon);
    fab.appendChild(closeIcon);

    fab.addEventListener('click', () => this.togglePanel());

    return fab;
  }

  private buildPanel(config: DendronResolvedConfig): HTMLElement {
    const panel = document.createElement('div');
    panel.className = `dendron-panel ${config.ui.position}`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Dendron assistant');
    panel.style.zIndex = String(config.ui.zIndex - 1);

    // Header
    const header = document.createElement('div');
    header.className = 'dendron-header';

    const headerIcon = document.createElement('div');
    headerIcon.className = 'dendron-header-icon';
    setSVG(headerIcon, SPARK_ICON);

    const headerText = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'dendron-header-title';
    title.textContent = 'Smart Assistant';

    const sub = document.createElement('div');
    sub.className = 'dendron-header-sub';
    sub.textContent = 'Personalized to your interest';

    headerText.appendChild(title);
    headerText.appendChild(sub);

    header.appendChild(headerIcon);
    header.appendChild(headerText);
    panel.appendChild(header);

    // Cards container
    this.cardsContainer = document.createElement('div');
    this.cardsContainer.className = 'dendron-cards';
    panel.appendChild(this.cardsContainer);

    // Input row
    const inputRow = document.createElement('div');
    inputRow.className = 'dendron-input-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dendron-input';
    input.placeholder = 'Ask me anything…';

    const sendBtn = document.createElement('button');
    sendBtn.className = 'dendron-input-send';
    sendBtn.setAttribute('aria-label', 'Send');
    setSVG(sendBtn, SEND_ICON);

    const handleSend = () => {
      const query = input.value.trim();
      if (!query) return;
      input.value = '';
      this.onManualQuery?.();
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);
    panel.appendChild(inputRow);

    // Optional branding
    if (config.ui.branding) {
      const branding = document.createElement('div');
      branding.className = 'dendron-branding';
      const brandText = document.createTextNode('Powered by ');
      const brandLink = document.createElement('a');
      brandLink.href = 'https://dendron.dev';
      brandLink.target = '_blank';
      brandLink.rel = 'noopener noreferrer';
      brandLink.textContent = 'Dendron';
      branding.appendChild(brandText);
      branding.appendChild(brandLink);
      panel.appendChild(branding);
    }

    return panel;
  }

  togglePanel(): void {
    this._isOpen = !this._isOpen;
    this.fab?.classList.toggle('open', this._isOpen);
    this.panel?.classList.toggle('open', this._isOpen);
    this.fab?.setAttribute('aria-expanded', String(this._isOpen));

    if (this._isOpen && this.cardsContainer && this.cardsContainer.children.length === 0) {
      // Trigger a manual query on first open if no cards yet
      this.showLoading();
      this.onManualQuery?.();
    }
  }

  showLoading(): void {
    if (!this.cardsContainer) return;
    const loading = document.createElement('div');
    loading.className = 'dendron-loading';
    loading.dataset['dendronLoading'] = '1';

    const text = document.createElement('span');
    text.textContent = 'Thinking';

    const dots = document.createElement('div');
    dots.className = 'dendron-dots';
    for (let i = 0; i < 3; i++) {
      dots.appendChild(document.createElement('span'));
    }

    loading.appendChild(text);
    loading.appendChild(dots);
    this.cardsContainer.appendChild(loading);
    this.scrollToBottom();
  }

  removeLoading(): void {
    this.cardsContainer
      ?.querySelectorAll('[data-dendron-loading]')
      .forEach((el) => el.remove());
  }

  renderCard(card: SmartCard): void {
    if (!this.cardsContainer) return;
    this.removeLoading();

    const onAction = (action: SmartCardAction) => {
      this.onAction?.({ ...action, cardType: card.type as SmartCardType });
      if (action.href) {
        window.open(action.href, '_blank', 'noopener,noreferrer');
      }
    };

    let cardEl: HTMLElement;

    switch (card.type) {
      case 'greeting':
        cardEl = renderGreetingCard(card, onAction);
        break;
      case 'feature':
        cardEl = renderFeatureCard(card, onAction);
        break;
      case 'pricing':
        cardEl = renderPricingCard(card, onAction);
        break;
      case 'engagement':
        cardEl = renderEngagementCard(card, onAction);
        break;
      case 'comparison':
        cardEl = renderComparisonCard(card, onAction);
        break;
      default:
        return;
    }

    this.cardsContainer.appendChild(cardEl);
    this.scrollToBottom();

    // Auto-open panel when card is available
    if (!this._isOpen) {
      this.togglePanel();
    }
  }

  private scrollToBottom(): void {
    if (this.cardsContainer) {
      requestAnimationFrame(() => {
        if (this.cardsContainer) {
          this.cardsContainer.scrollTop = this.cardsContainer.scrollHeight;
        }
      });
    }
  }

  showFAB(): void {
    this.fab?.classList.add('visible');
  }

  destroy(): void {
    this.hostEl?.remove();
    this.hostEl = null;
    this.shadow = null;
    this.fab = null;
    this.panel = null;
    this.cardsContainer = null;
  }
}

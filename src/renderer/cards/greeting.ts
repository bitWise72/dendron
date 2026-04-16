import type { GreetingCard, SmartCardAction } from '../../types';

export function renderGreetingCard(
  card: GreetingCard,
  onAction: (action: SmartCardAction) => void
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'd-card';

  const badge = document.createElement('span');
  badge.className = 'd-card-badge';
  badge.textContent = 'Welcome';

  const h3 = document.createElement('h3');
  h3.textContent = card.headline;

  const p = document.createElement('p');
  p.textContent = card.body;

  const actions = document.createElement('div');
  actions.className = 'd-card-actions';
  renderActions(card.actions, actions, onAction);

  el.appendChild(badge);
  el.appendChild(h3);
  el.appendChild(p);
  el.appendChild(actions);

  return el;
}

function renderActions(
  acts: SmartCardAction[],
  container: HTMLElement,
  onAction: (action: SmartCardAction) => void
): void {
  acts.forEach((act, i) => {
    const btn = document.createElement('button');
    btn.className = `d-btn ${act.variant ? `d-btn-${act.variant}` : i === 0 ? 'd-btn-primary' : 'd-btn-secondary'}`;
    btn.textContent = act.label;
    btn.addEventListener('click', () => onAction(act));
    container.appendChild(btn);
  });
}

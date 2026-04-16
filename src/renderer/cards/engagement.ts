import type { EngagementCard, SmartCardAction } from '../../types';

export function renderEngagementCard(
  card: EngagementCard,
  onAction: (action: SmartCardAction) => void
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'd-card';

  const badge = document.createElement('span');
  badge.className = 'd-card-badge';
  badge.textContent = 'For You';

  const h3 = document.createElement('h3');
  h3.textContent = card.headline;

  el.appendChild(badge);
  el.appendChild(h3);

  if (card.socialProof) {
    const proof = document.createElement('p');
    proof.className = 'd-social-proof';
    proof.textContent = card.socialProof;
    el.appendChild(proof);
  }

  const body = document.createElement('p');
  body.textContent = card.body;
  el.appendChild(body);

  if (card.stats && card.stats.length > 0) {
    const statsRow = document.createElement('div');
    statsRow.className = 'd-stats';
    card.stats.forEach((s) => {
      const stat = document.createElement('div');
      stat.className = 'd-stat';

      const val = document.createElement('span');
      val.className = 'd-stat-value';
      val.textContent = s.value;

      const lbl = document.createElement('span');
      lbl.className = 'd-stat-label';
      lbl.textContent = s.label;

      stat.appendChild(val);
      stat.appendChild(lbl);
      statsRow.appendChild(stat);
    });
    el.appendChild(statsRow);
  }

  const actions = document.createElement('div');
  actions.className = 'd-card-actions';
  card.actions.forEach((act, i) => {
    const btn = document.createElement('button');
    btn.className = `d-btn ${act.variant ? `d-btn-${act.variant}` : i === 0 ? 'd-btn-primary' : 'd-btn-secondary'}`;
    btn.textContent = act.label;
    btn.addEventListener('click', () => onAction(act));
    actions.appendChild(btn);
  });
  el.appendChild(actions);

  return el;
}

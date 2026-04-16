import type { ComparisonCard, SmartCardAction } from '../../types';

export function renderComparisonCard(
  card: ComparisonCard,
  onAction: (action: SmartCardAction) => void
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'd-card';

  const badge = document.createElement('span');
  badge.className = 'd-card-badge';
  badge.textContent = 'Compare';

  const h3 = document.createElement('h3');
  h3.textContent = card.headline;

  el.appendChild(badge);
  el.appendChild(h3);

  if (card.items.length > 0) {
    const table = document.createElement('table');
    table.className = 'd-comparison';

    // Collect all attribute keys
    const allKeys = Array.from(
      new Set(card.items.flatMap((item) => Object.keys(item.attributes)))
    );

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const emptyTh = document.createElement('th');
    emptyTh.textContent = '';
    headerRow.appendChild(emptyTh);

    card.items.forEach((item) => {
      const th = document.createElement('th');
      th.textContent = item.name;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    allKeys.forEach((key) => {
      const tr = document.createElement('tr');

      const labelTd = document.createElement('td');
      labelTd.textContent = key;
      labelTd.style.fontWeight = '600';
      labelTd.style.color = 'var(--d-text)';
      tr.appendChild(labelTd);

      card.items.forEach((item) => {
        const td = document.createElement('td');
        td.textContent = item.attributes[key] ?? '—';
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    el.appendChild(table);
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

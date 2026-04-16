import type { PricingCard, SmartCardAction } from '../../types';

export function renderPricingCard(
  card: PricingCard,
  onAction: (action: SmartCardAction) => void
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'd-card';

  const badge = document.createElement('span');
  badge.className = 'd-card-badge';
  badge.textContent = 'Pricing';

  const h3 = document.createElement('h3');
  h3.textContent = card.headline;

  el.appendChild(badge);
  el.appendChild(h3);

  const plans = document.createElement('div');
  plans.className = 'd-plans';

  card.plans.forEach((plan) => {
    const planEl = document.createElement('div');
    planEl.className = plan.highlight ? 'd-plan highlighted' : 'd-plan';

    const header = document.createElement('div');
    header.className = 'd-plan-header';

    const name = document.createElement('span');
    name.className = 'd-plan-name';
    name.textContent = plan.name;

    const priceWrapper = document.createElement('span');
    const price = document.createElement('span');
    price.className = 'd-plan-price';
    price.textContent = plan.price;
    priceWrapper.appendChild(price);

    if (plan.period) {
      const period = document.createElement('span');
      period.className = 'd-plan-period';
      period.textContent = '/' + plan.period;
      priceWrapper.appendChild(period);
    }

    header.appendChild(name);
    header.appendChild(priceWrapper);
    planEl.appendChild(header);

    if (plan.features.length > 0) {
      const featureList = document.createElement('ul');
      featureList.className = 'd-plan-features';
      plan.features.slice(0, 3).forEach((f) => {
        const li = document.createElement('li');
        li.className = 'd-plan-feature';
        li.textContent = f;
        featureList.appendChild(li);
      });
      planEl.appendChild(featureList);
    }

    plans.appendChild(planEl);
  });

  el.appendChild(plans);

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

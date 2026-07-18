import { BRANCHES, DISTRICTS, METRIC_DEFINITIONS } from './city-data.js';
import { buildCausalChain } from './explanations.js';

export function formatMetric(id, value) {
  const definition = METRIC_DEFINITIONS[id];
  if (id === 'population') return Math.round(value).toLocaleString('en-US');
  return `${Number(value).toFixed(1).replace('.0', '')}${definition?.suffix ?? ''}`;
}

export function renderMetrics(container, snapshot, onMetricSelect) {
  const priority = ['cityHealth', 'employmentRate', 'businessIndex', 'fiscalHealth', 'population', 'housingAffordability', 'publicTrust', 'culturalVitality'];
  const cards = priority.map((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'metric-card';
    button.setAttribute('aria-label', `Explain ${METRIC_DEFINITIONS[id].label}`);
    button.innerHTML = `<span>${METRIC_DEFINITIONS[id].label}</span><strong>${formatMetric(id, snapshot.metrics[id])}</strong><em>Tap to ask why</em>`;
    button.addEventListener('click', () => onMetricSelect?.(id));
    return button;
  });
  container.replaceChildren(...cards);
}

export function renderEvents(container, events, selectedYear, onEventSelect) {
  const visible = events.filter((event) => event.year <= selectedYear).slice().reverse();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'scenario-description';
    empty.textContent = 'No headline events have occurred yet.';
    container.replaceChildren(empty);
    return visible;
  }
  const items = visible.map((event) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'event-item';
    button.innerHTML = `<span class="event-item__year">${event.year}</span><span><strong>${event.title}</strong><span>${event.summary}</span></span>`;
    button.addEventListener('click', () => onEventSelect?.(event.id));
    return button;
  });
  container.replaceChildren(...items);
  return visible;
}

export function renderStories(container, stories) {
  const cards = stories.map((story) => {
    const article = document.createElement('article');
    article.className = 'story-card';
    article.innerHTML = `<strong>${story.name}</strong><span>${story.role}</span><p>${story.body}</p>`;
    return article;
  });
  container.replaceChildren(...cards);
}

export function renderComparison(container, deltas, currentBranchId, compareBranchId) {
  if (currentBranchId === compareBranchId) {
    const note = document.createElement('div');
    note.className = 'comparison-row';
    note.innerHTML = '<span>Same timeline selected</span><strong class="delta-neutral">No difference</strong>';
    container.replaceChildren(note);
    return;
  }

  const priority = ['employmentRate', 'businessIndex', 'fiscalHealth', 'population', 'cityHealth'];
  const rows = priority.map((id) => {
    const item = deltas.find((delta) => delta.id === id);
    const row = document.createElement('div');
    row.className = 'comparison-row';
    const sign = item.delta > 0 ? '+' : '';
    const className = Math.abs(item.delta) < 0.05 ? 'delta-neutral' : item.delta > 0 ? 'delta-positive' : 'delta-negative';
    row.innerHTML = `<span>${item.label}</span><strong class="${className}">${sign}${id === 'population' ? Math.round(item.delta).toLocaleString('en-US') : item.delta.toFixed(1)} vs ${BRANCHES[compareBranchId].shortName}</strong>`;
    return row;
  });
  container.replaceChildren(...rows);
}

export function renderExplanation(summaryNode, chainNode, explanation) {
  summaryNode.textContent = explanation.summary || 'No causal explanation is available for this selection.';
  if (!explanation.chain?.length) {
    const empty = document.createElement('li');
    empty.className = 'causal-node';
    empty.innerHTML = '<strong>No headline cause yet</strong><span>This value is moving through the model’s background yearly rules.</span>';
    chainNode.replaceChildren(empty);
    return;
  }
  const nodes = explanation.chain.map((cause) => {
    const item = document.createElement('li');
    item.className = 'causal-node';
    item.innerHTML = `<strong>${cause.title}${cause.root ? ' · root cause' : ''}</strong><span>${cause.summary}</span>`;
    return item;
  });
  chainNode.replaceChildren(...nodes);
}

export function eventExplanation(result, eventId) {
  const event = result.events.find((item) => item.id === eventId);
  return {
    summary: event?.summary ?? 'The selected event is unavailable.',
    chain: buildCausalChain(result, eventId),
  };
}

export function renderDistrictSummary(container, districtId, snapshot) {
  if (!districtId) {
    container.innerHTML = '<span class="district-summary__label">Selected district</span><strong>Citywide view</strong><span>Select a district to inspect its local conditions.</span>';
    return;
  }
  const definition = DISTRICTS.find((district) => district.id === districtId);
  const district = snapshot.districts[districtId];
  container.innerHTML = `<span class="district-summary__label">Selected district</span><strong>${definition.name} · ${Math.round(district.overallHealth)}/100</strong><span>Jobs ${Math.round(district.employmentHealth)} · commerce ${Math.round(district.commercialHealth)} · investment ${Math.round(district.publicInvestment)}</span>`;
}

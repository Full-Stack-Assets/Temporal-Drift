import { METRIC_DEFINITIONS } from './city-data.js';
import { getSnapshot } from './simulation.js';

function eventMap(result) {
  return new Map(result.events.map((event) => [event.id, event]));
}

export function buildCausalChain(result, causeId) {
  const events = eventMap(result);
  if (!events.has(causeId)) {
    return [{ id: causeId, title: 'Evidence unavailable', summary: 'This cause is not present in the current scenario record.', missing: true, root: true }];
  }

  const output = [];
  const visited = new Set();

  function visit(id, depth) {
    if (visited.has(id)) return;
    visited.add(id);
    const event = events.get(id);
    if (!event) {
      output.push({ id, depth, title: 'Evidence unavailable', summary: 'A referenced cause is missing.', missing: true, root: true });
      return;
    }
    for (const parent of event.causes ?? []) visit(parent, depth + 1);
    output.push({ ...event, depth, root: Boolean(event.root || !(event.causes?.length)) });
  }

  visit(causeId, 0);
  return output;
}

export function explainMetric(result, year, metricId) {
  const snapshot = getSnapshot(result, year);
  const causes = snapshot.provenance[metricId] ?? [];
  const latestCause = causes.at(-1);
  const definition = METRIC_DEFINITIONS[metricId] ?? { label: metricId };

  if (!latestCause) {
    return {
      metricId,
      label: definition.label,
      year: snapshot.year,
      value: snapshot.metrics[metricId],
      summary: 'This metric has not been materially changed by a headline event in the selected scenario.',
      chain: [],
    };
  }

  const chain = buildCausalChain(result, latestCause);
  const latest = chain.at(-1);
  return {
    metricId,
    label: definition.label,
    year: snapshot.year,
    value: snapshot.metrics[metricId],
    summary: latest?.summary ?? 'No explanation is available.',
    chain,
  };
}

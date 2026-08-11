import test from 'node:test';
import assert from 'node:assert/strict';

import { appendAnomalyReview, createAnomalyRegistry, recordAnomaly } from '../../src/kernel/anomalies.js';

function anomaly(overrides = {}) {
  return {
    runId: 'run-1', branchId: 'baseline', stepId: 'year-2030', metricPath: '/metrics/employmentRate',
    expected: 91000, observed: 88750, unit: 'percent', scale: 1000,
    sourceRef: 'observation-17', sourceVersion: '2026-08-11', severity: 'warning',
    ...overrides,
  };
}

test('anomaly records have stable content IDs, signed deltas, and mandatory review flags', () => {
  const first = recordAnomaly(createAnomalyRegistry(), anomaly());
  const second = recordAnomaly(createAnomalyRegistry(), anomaly());
  assert.equal(first.records[0].anomalyId, second.records[0].anomalyId);
  assert.equal(first.records[0].delta, -2250);
  assert.equal(first.records[0].requiresHumanReview, true);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.records[0]));
});

test('registry appends without rewriting caller or previous records', () => {
  const empty = createAnomalyRegistry();
  const one = recordAnomaly(empty, anomaly());
  const two = recordAnomaly(one, anomaly({ stepId: 'year-2031', observed: 90000 }));
  assert.equal(empty.records.length, 0);
  assert.equal(one.records.length, 1);
  assert.equal(two.records.length, 2);
  assert.deepEqual(two.records[0], one.records[0]);
  assert.throws(() => recordAnomaly(one, anomaly()), { code: 'E_ANOMALY_SCHEMA' });
});

test('reviews append separately and cannot alter the source anomaly', () => {
  const registry = recordAnomaly(createAnomalyRegistry(), anomaly());
  const anomalyId = registry.records[0].anomalyId;
  const reviewed = appendAnomalyReview(registry, {
    anomalyId, outcome: 'acknowledged', reviewerId: 'reviewer-1', note: 'Queued for model review.',
  });
  assert.equal(registry.reviews.length, 0);
  assert.equal(reviewed.reviews.length, 1);
  assert.equal(reviewed.records[0].requiresHumanReview, true);
  assert.equal(reviewed.reviews[0].anomalyId, anomalyId);
  for (const outcome of ['accepted_as_observation', 'rejected_as_invalid', 'resolved_by_later_version']) {
    assert.equal(appendAnomalyReview(registry, { anomalyId, outcome, reviewerId: 'r', note: '' }).reviews[0].outcome, outcome);
  }
});

test('invalid anomalies and reviews fail with E_ANOMALY_SCHEMA', () => {
  const registry = recordAnomaly(createAnomalyRegistry(), anomaly());
  for (const value of [
    anomaly({ scale: 0 }), anomaly({ expected: 1.5 }), anomaly({ severity: 'unknown' }),
    { ...anomaly(), extra: true },
  ]) assert.throws(() => recordAnomaly(createAnomalyRegistry(), value), { code: 'E_ANOMALY_SCHEMA' });
  assert.throws(() => appendAnomalyReview(registry, { anomalyId: 'missing', outcome: 'acknowledged', reviewerId: 'r', note: '' }), { code: 'E_ANOMALY_SCHEMA' });
  assert.throws(() => appendAnomalyReview(registry, { anomalyId: registry.records[0].anomalyId, outcome: 'changed_model', reviewerId: 'r', note: '' }), { code: 'E_ANOMALY_SCHEMA' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { recordAnomaly, appendAnomalyReview } from '../../src/kernel/anomalies.js';

test('records immutable content-derived anomaly with signed delta', () => {
  const registry = recordAnomaly(undefined, {
    runId: 'r', branchId: 'b', stepId: 's', metricPath: ['metrics', 'trust'],
    expected: 1000, observed: 850, unit: 'index', scale: 1000,
    severity: 'high', sourceRef: 'source:a', sourceVersion: 'v1',
  });
  const anomaly = registry.records[0];
  assert.equal(anomaly.delta, -150);
  assert.equal(anomaly.requiresHumanReview, true);
  assert.equal(anomaly.id.length, 64);
  assert(Object.isFrozen(anomaly));
});

test('review appends without rewriting anomaly', () => {
  const original = recordAnomaly(undefined, {
    runId: 'r', branchId: 'b', stepId: 's', metricPath: ['x'],
    expected: 1, observed: 2, unit: 'n', scale: 1,
    severity: 'low', sourceRef: 'src', sourceVersion: 'v1',
  });
  const before = JSON.stringify(original.records[0]);
  const reviewed = appendAnomalyReview(original, { anomalyId: original.records[0].id, outcome: 'acknowledged', reviewer: 'human' });
  assert.equal(JSON.stringify(original.records[0]), before);
  assert.equal(reviewed.reviews.length, 1);
  assert.equal(original.reviews.length, 0);
});

test('malformed anomaly and invalid review outcome fail closed', () => {
  assert.throws(() => recordAnomaly(undefined, { runId: 'r' }), (error) => error.code === 'E_ANOMALY_SCHEMA');
});

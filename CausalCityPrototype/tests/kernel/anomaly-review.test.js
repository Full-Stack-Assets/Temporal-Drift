import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnomalyRegistry, recordAnomaly } from '../../src/kernel/anomalies.js';
import { canonicalString } from '../../src/kernel/canonicalize.js';
import {
  classifyAnomalyForReview,
  createAnomalyReviewQueue,
} from '../../src/approximation/anomaly-review.js';

function anomaly(delta, suffix) {
  return {
    runId: 'run-1', branchId: 'branch-a', stepId: `s-${suffix}`, metricPath: '/count',
    expected: 100, observed: 100 + delta, unit: 'count', scale: 1,
    sourceRef: `source-${suffix}`, sourceVersion: 'v1', severity: 'warning',
  };
}

function records() {
  let registry = createAnomalyRegistry();
  registry = recordAnomaly(registry, anomaly(5, 'info'));
  registry = recordAnomaly(registry, anomaly(15, 'watch'));
  registry = recordAnomaly(registry, anomaly(-25, 'warning'));
  registry = recordAnomaly(registry, anomaly(40, 'critical'));
  return registry.records;
}

const thresholds = { watch: 10, warning: 20, critical: 30 };

test('anomaly classification is deterministic, advisory-only, and always human-gated', () => {
  const input = records()[2];
  const before = canonicalString(input);
  const first = classifyAnomalyForReview(input, thresholds);
  const second = classifyAnomalyForReview(input, thresholds);

  assert.equal(canonicalString(first), canonicalString(second));
  assert.equal(first.classification, 'warning');
  assert.equal(first.absoluteDelta, 25);
  assert.equal(first.advisoryOnly, true);
  assert.equal(first.humanReviewRequired, true);
  assert.equal(first.autoForkAllowed, false);
  assert.equal(first.autoCalibrationAllowed, false);
  assert.equal(canonicalString(input), before);
  assert.ok(Object.isFrozen(first));
});

test('review queue orders severity deterministically and never mutates records', () => {
  const input = records();
  const before = canonicalString(input);
  const queue = createAnomalyReviewQueue(input, thresholds);
  assert.deepEqual(queue.items.map((item) => item.classification), ['critical', 'warning', 'watch', 'informational']);
  assert.equal(queue.humanReviewRequired, true);
  assert.equal(queue.autoForkAllowed, false);
  assert.equal(queue.autoCalibrationAllowed, false);
  assert.equal(canonicalString(input), before);
  assert.match(queue.queueHash, /^[a-f0-9]{64}$/);
});

test('anomaly review thresholds fail closed when unordered or unsafe', () => {
  const input = records()[0];
  assert.throws(() => classifyAnomalyForReview(input, { watch: 20, warning: 10, critical: 30 }), { code: 'E_ANOMALY_REVIEW_SCHEMA' });
  assert.throws(() => classifyAnomalyForReview(input, { watch: 10.5, warning: 20, critical: 30 }), { code: 'E_ANOMALY_REVIEW_SCHEMA' });
});

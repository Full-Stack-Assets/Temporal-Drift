import test from 'node:test';
import assert from 'node:assert/strict';

import { rankSurprises } from '../../src/frontier/surprise-dividend.js';

const records = [
  { surpriseId: 's-a', delta: 4, persistence: 10, sourceHash: 'a'.repeat(64) },
  { surpriseId: 's-b', delta: -20, persistence: 2, sourceHash: 'b'.repeat(64) },
  { surpriseId: 's-c', delta: 9, persistence: 8, sourceHash: 'c'.repeat(64) },
];

test('Surprise Dividend deterministically ranks model-reality divergence and stays human-gated', () => {
  const result = rankSurprises(records);
  assert.equal(result.semanticClass, 'model-reality-divergence');
  assert.equal(result.advisoryOnly, true);
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.autoCalibrationAllowed, false);
  assert.equal(result.autoForkAllowed, false);
  assert.deepEqual(result.items.map((item) => item.surpriseId), ['s-c', 's-b', 's-a']);
  assert.deepEqual(result.items.map((item) => item.score), [72, 40, 40]);
  assert.match(result.surpriseHash, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(result));
});

test('Surprise Dividend rejects unsafe residuals and malformed records', () => {
  assert.throws(() => rankSurprises([{ surpriseId: 'x', delta: 1.2, persistence: 1, sourceHash: 'a'.repeat(64) }]), { code: 'E_SURPRISE_SCHEMA' });
  assert.throws(() => rankSurprises([{ surpriseId: 'x', delta: 1, persistence: -1, sourceHash: 'a'.repeat(64) }]), { code: 'E_SURPRISE_SCHEMA' });
});

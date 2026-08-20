import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreRobustness } from '../../src/frontier/robustness.js';

const matrix = {
  branches: [
    { branchId: 'branch-a', outcomes: { normal: 80, recession: 50, storm: 60 } },
    { branchId: 'branch-b', outcomes: { normal: 95, recession: 20, storm: 70 } },
    { branchId: 'branch-c', outcomes: { normal: 70, recession: 65, storm: 68 } },
  ],
};

test('robustness accounting reports supplied-shock survival, spread, and regret exactly', () => {
  const result = scoreRobustness(matrix, { survivalThreshold: 60 });
  const byId = new Map(result.branches.map((entry) => [entry.branchId, entry]));
  assert.equal(result.semanticClass, 'synthetic-robustness-accounting');
  assert.equal(result.shocks.length, 3);
  assert.deepEqual(result.shocks, ['normal', 'recession', 'storm']);
  assert.deepEqual(byId.get('branch-a').survivalFraction, { numerator: '2', denominator: '3' });
  assert.deepEqual(byId.get('branch-b').survivalFraction, { numerator: '2', denominator: '3' });
  assert.deepEqual(byId.get('branch-c').survivalFraction, { numerator: '3', denominator: '3' });
  assert.equal(byId.get('branch-c').spread, 5);
  assert.equal(byId.get('branch-b').spread, 75);
  assert.equal(byId.get('branch-a').totalRegret, 40);
  assert.equal(byId.get('branch-b').totalRegret, 45);
  assert.equal(byId.get('branch-c').totalRegret, 27);
  assert.match(result.robustnessHash, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(result));
});

test('robustness rejects inconsistent shock sets and unsafe outcomes', () => {
  assert.throws(() => scoreRobustness({ branches: [
    { branchId: 'a', outcomes: { x: 1 } },
    { branchId: 'b', outcomes: { y: 1 } },
  ] }, { survivalThreshold: 0 }), { code: 'E_ROBUSTNESS_SCHEMA' });
  assert.throws(() => scoreRobustness({ branches: [{ branchId: 'a', outcomes: { x: 1.2 } }] }, { survivalThreshold: 0 }), { code: 'E_ROBUSTNESS_SCHEMA' });
});

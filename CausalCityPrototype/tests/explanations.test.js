import test from 'node:test';
import assert from 'node:assert/strict';

import { simulateBranch } from '../src/simulation.js';
import { buildCausalChain, explainMetric } from '../src/explanations.js';

test('2032 shutdown employment explanation traces to atlas closure', () => {
  const result = simulateBranch('shutdown');
  const explanation = explainMetric(result, 2032, 'employmentRate');
  assert.ok(explanation.chain.some((node) => node.id === 'atlas-closure'));
});

test('every visible event has at least one causal root', () => {
  for (const branch of ['baseline', 'shutdown', 'reinvention']) {
    const result = simulateBranch(branch);
    for (const event of result.events) {
      const chain = buildCausalChain(result, event.id);
      assert.ok(chain.length > 0, `${branch}:${event.id}`);
      assert.ok(chain.some((node) => node.root), `${branch}:${event.id} has no root`);
    }
  }
});

test('missing evidence returns a safe fallback', () => {
  const result = simulateBranch('shutdown');
  const chain = buildCausalChain(result, 'does-not-exist');
  assert.equal(chain.length, 1);
  assert.equal(chain[0].missing, true);
});

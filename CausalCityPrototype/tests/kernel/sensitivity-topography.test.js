import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createRunGraph, forkBranch, getBranch } from '../../src/kernel/run-graph.js';
import { sampleSensitivityTopography } from '../../src/approximation/sensitivity-topography.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

function graphFixture() {
  let graph = createRunGraph(completeCounterRun(), 'Root');
  const low = forkBranch(graph, {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's1',
    label: 'Low',
    inputs: [{ stepId: 'low', type: 'increment', payload: { amount: 1 } }],
  });
  graph = low.graph;
  const high = forkBranch(graph, {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's1',
    label: 'High',
    inputs: [{ stepId: 'high', type: 'increment', payload: { amount: 20 } }],
  });
  return { graph: high.graph, low: low.branch.manifest.branchId, high: high.branch.manifest.branchId };
}

test('sparse topography is deterministic, immutable, and labeled approximate sensitivity', () => {
  const { graph, low, high } = graphFixture();
  const before = canonicalString(graph);
  const config = {
    samples: [
      { branchId: high, levers: { intensity: 200 } },
      { branchId: graph.rootBranchId, levers: { intensity: 100 } },
      { branchId: low, levers: { intensity: 0 } },
    ],
    outcomes: [{ id: 'count', path: '/count' }],
    cliffThresholds: { count: 10 },
  };
  const first = sampleSensitivityTopography(graph, config);
  const second = sampleSensitivityTopography(graph, config);

  assert.equal(first.semanticClass, 'approximate-sensitivity');
  assert.equal(first.sourceGraphHash, graph.graphHash);
  assert.equal(canonicalString(first), canonicalString(second));
  assert.equal(canonicalString(graph), before);
  assert.ok(Object.isFrozen(first));
  assert.match(first.topographyHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.points.map((point) => point.levers.intensity), [0, 100, 200]);

  for (const point of first.points) {
    assert.equal(point.outcomes.count, getBranch(graph, point.branchId).snapstates.at(-1).modelState.count);
  }
  assert.equal(first.neighborDeltas.length, 2);
  assert.ok(first.neighborDeltas.some((entry) => entry.cliffs.count === true));
});

test('topography rejects undeclared branches, unsafe levers, and missing outcome paths', () => {
  const { graph, low } = graphFixture();
  assert.throws(() => sampleSensitivityTopography(graph, {
    samples: [{ branchId: 'branch-' + 'f'.repeat(64), levers: { intensity: 1 } }],
    outcomes: [{ id: 'count', path: '/count' }],
    cliffThresholds: {},
  }), { code: 'E_APPROX_BRANCH' });

  assert.throws(() => sampleSensitivityTopography(graph, {
    samples: [{ branchId: low, levers: { intensity: 1.5 } }],
    outcomes: [{ id: 'count', path: '/count' }],
    cliffThresholds: {},
  }), { code: 'E_APPROX_SCHEMA' });

  assert.throws(() => sampleSensitivityTopography(graph, {
    samples: [{ branchId: low, levers: { intensity: 1 } }],
    outcomes: [{ id: 'missing', path: '/missing' }],
    cliffThresholds: {},
  }), { code: 'E_APPROX_PATH' });
});

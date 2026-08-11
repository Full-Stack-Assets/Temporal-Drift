import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createRunGraph, forkBranch, getBranch } from '../../src/kernel/run-graph.js';
import { rankBranches } from '../../src/approximation/branch-ranking.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

function graphFixture() {
  let graph = createRunGraph(completeCounterRun(), 'Root');
  const small = forkBranch(graph, {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's1',
    label: 'Small',
    inputs: [{ stepId: 'small', type: 'increment', payload: { amount: 1 } }],
  });
  graph = small.graph;
  const large = forkBranch(graph, {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's1',
    label: 'Large',
    inputs: [{ stepId: 'large', type: 'increment', payload: { amount: 20 } }],
  });
  return { graph: large.graph, small: small.branch.manifest.branchId, large: large.branch.manifest.branchId };
}

test('branch explorer ranks only existing branches and preserves graph bytes', () => {
  const { graph, small, large } = graphFixture();
  const before = canonicalString(graph);
  const branchIds = [small, graph.rootBranchId, large];
  const result = rankBranches(graph, {
    branchIds,
    objectives: [{ id: 'count', path: '/count', direction: 'maximize', weight: 3 }],
    limit: 2,
  });

  const expected = [...branchIds].sort((left, right) => {
    const delta = getBranch(graph, right).snapstates.at(-1).modelState.count - getBranch(graph, left).snapstates.at(-1).modelState.count;
    return delta || left.localeCompare(right);
  }).slice(0, 2);

  assert.deepEqual(result.rankings.map((entry) => entry.branchId), expected);
  assert.equal(result.rankings.length, 2);
  assert.equal(result.sourceGraphHash, graph.graphHash);
  assert.equal(canonicalString(graph), before);
  assert.equal(Object.keys(graph.branches).length, branchIds.length);
  assert.match(result.rankingHash, /^[a-f0-9]{64}$/);
  for (const entry of result.rankings) {
    assert.match(entry.aggregateScore.numerator, /^-?\d+$/);
    assert.match(entry.aggregateScore.denominator, /^\d+$/);
    assert.equal(entry.objectives[0].rawValue, getBranch(graph, entry.branchId).snapstates.at(-1).modelState.count);
  }
});

test('minimize reverses a single objective and exact ties break by branch ID', () => {
  const { graph, small, large } = graphFixture();
  const branchIds = [small, large];
  const minimize = rankBranches(graph, {
    branchIds,
    objectives: [{ id: 'count', path: '/count', direction: 'minimize', weight: 1 }],
    limit: 2,
  });
  assert.equal(minimize.rankings[0].branchId, branchIds.reduce((best, id) => (
    getBranch(graph, id).snapstates.at(-1).modelState.count < getBranch(graph, best).snapstates.at(-1).modelState.count ? id : best
  )));

  const tie = rankBranches(graph, {
    branchIds,
    objectives: [
      { id: 'up', path: '/count', direction: 'maximize', weight: 1 },
      { id: 'down', path: '/count', direction: 'minimize', weight: 1 },
    ],
    limit: 2,
  });
  assert.deepEqual(tie.rankings.map((entry) => entry.branchId), [...branchIds].sort());
});

test('ranking fails closed for unknown branches, invalid objectives, and missing paths', () => {
  const { graph, small } = graphFixture();
  assert.throws(() => rankBranches(graph, {
    branchIds: ['branch-' + 'f'.repeat(64)], objectives: [{ id: 'count', path: '/count', direction: 'maximize', weight: 1 }], limit: 1,
  }), { code: 'E_APPROX_BRANCH' });
  assert.throws(() => rankBranches(graph, {
    branchIds: [small], objectives: [{ id: 'count', path: '/count', direction: 'largest', weight: 1 }], limit: 1,
  }), { code: 'E_APPROX_SCHEMA' });
  assert.throws(() => rankBranches(graph, {
    branchIds: [small], objectives: [{ id: 'missing', path: '/missing', direction: 'maximize', weight: 1 }], limit: 1,
  }), { code: 'E_APPROX_PATH' });
});

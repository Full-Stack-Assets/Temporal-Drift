import test from 'node:test';
import assert from 'node:assert/strict';

import { forkRun } from '../../src/kernel/branch.js';
import {
  createRunGraph,
  exportRunGraph,
  forkBranch,
  listAncestors,
  listChildren,
} from '../../src/kernel/run-graph.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

function validRequest(graph) {
  return {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's1',
    label: 'Child',
  };
}

test('forkBranch rejects accessors, symbols, hidden fields, and non-plain request prototypes', () => {
  const graph = createRunGraph(completeCounterRun(), 'Root');

  const accessor = validRequest(graph);
  Object.defineProperty(accessor, 'label', { enumerable: true, get: () => 'Child' });
  assert.throws(() => forkBranch(graph, accessor), { code: 'E_GRAPH_SCHEMA' });

  const symbol = validRequest(graph);
  symbol[Symbol('covert')] = true;
  assert.throws(() => forkBranch(graph, symbol), { code: 'E_GRAPH_SCHEMA' });

  const hidden = validRequest(graph);
  Object.defineProperty(hidden, 'covert', { value: true, enumerable: false });
  assert.throws(() => forkBranch(graph, hidden), { code: 'E_GRAPH_SCHEMA' });

  const inherited = Object.assign(Object.create({ inherited: true }), validRequest(graph));
  assert.throws(() => forkBranch(graph, inherited), { code: 'E_GRAPH_SCHEMA' });
});

test('low-level fork options reject ambiguous object shapes', () => {
  const parent = completeCounterRun();

  const symbol = { inputs: [] };
  symbol[Symbol('covert')] = true;
  assert.throws(() => forkRun(parent, 's1', 'child-symbol', symbol), { code: 'E_UNVERIFIED_FORK' });

  const hidden = { inputs: [] };
  Object.defineProperty(hidden, 'covert', { value: true, enumerable: false });
  assert.throws(() => forkRun(parent, 's1', 'child-hidden', hidden), { code: 'E_UNVERIFIED_FORK' });

  const inherited = Object.assign(Object.create({ inherited: true }), { inputs: [] });
  assert.throws(() => forkRun(parent, 's1', 'child-inherited', inherited), { code: 'E_UNVERIFIED_FORK' });
});

test('topology read APIs require a verified hydrated RunGraph', () => {
  const graph = createRunGraph(completeCounterRun(), 'Root');
  const plain = JSON.parse(exportRunGraph(graph));
  assert.throws(() => listChildren(plain, plain.rootBranchId), { code: 'E_GRAPH_BRANCH' });
  assert.throws(() => listAncestors(plain, plain.rootBranchId), { code: 'E_GRAPH_BRANCH' });
});

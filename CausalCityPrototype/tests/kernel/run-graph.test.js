import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRunGraph,
  exportRunGraph,
  forkBranch,
  getBranch,
  listAncestors,
  listChildren,
  parseRunGraph,
  verifyRunGraph,
} from '../../src/kernel/run-graph.js';
import { canonicalString, sha256Hex } from '../../src/kernel/canonicalize.js';
import { exportRun } from '../../src/kernel/replay.js';
import { completeCounterRun, resolveCounterAdapter } from './helpers/run-graph-fixture.js';

const BRANCH_PATTERN = /^branch-[a-f0-9]{64}$/;
const GRAPH_PATTERN = /^graph-[a-f0-9]{64}$/;

function increment(stepId, amount) {
  return { stepId, type: 'increment', payload: { amount } };
}

function rehashGraph(value) {
  const { graphHash: _old, ...core } = value;
  value.graphHash = sha256Hex(core);
  return value;
}

function graphWithChild(label = 'Plan A') {
  const source = completeCounterRun();
  const root = createRunGraph(source, 'Root');
  const result = forkBranch(root, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label,
  });
  return { source, root, ...result };
}

test('createRunGraph imports a verified source without mutating it and content-addresses the root', () => {
  const source = completeCounterRun();
  const before = exportRun(source);
  const graph = createRunGraph(source, 'Root');

  assert.equal(exportRun(source), before);
  assert.match(graph.graphId, GRAPH_PATTERN);
  assert.match(graph.rootBranchId, BRANCH_PATTERN);
  assert.equal(graph.revision, 0);
  assert.equal(graph.previousGraphHash, null);
  assert.equal(graph.sourceRootRunId, source.manifest.runId);
  assert.equal(graph.sourceRootBranchId, source.manifest.branchId);
  assert.equal(graph.sourceRootTerminalReceiptHash, source.ledger.at(-1).receiptHash);
  assert.equal(Object.keys(graph.branches).length, 1);
  assert.equal(Object.keys(graph.runExports).length, 1);
  assert.equal(graph.branches[graph.rootBranchId].label, 'Root');

  const canonicalRoot = getBranch(graph, graph.rootBranchId);
  assert.equal(canonicalRoot.manifest.branchId, graph.rootBranchId);
  assert.deepEqual(canonicalRoot.snapstates.map((entry) => entry.modelState), source.snapstates.map((entry) => entry.modelState));
  assert.deepEqual(canonicalRoot.eventBatches, source.eventBatches);
  assert.notDeepEqual(canonicalRoot.ledger, source.ledger);
  assert.ok(Object.isFrozen(graph));
  assert.ok(Object.isFrozen(graph.branches));
});

test('branch identity is deterministic, content-sensitive, and independent of labels', () => {
  const source = completeCounterRun();
  const leftGraph = createRunGraph(source, 'Root Alpha');
  const rightGraph = createRunGraph(source, 'Root Beta');

  assert.equal(leftGraph.graphId, rightGraph.graphId);
  assert.equal(leftGraph.rootBranchId, rightGraph.rootBranchId);

  const left = forkBranch(leftGraph, {
    parentBranchId: leftGraph.rootBranchId,
    forkStepId: 's1',
    label: 'Plan A',
  });
  const right = forkBranch(rightGraph, {
    parentBranchId: rightGraph.rootBranchId,
    forkStepId: 's1',
    label: 'Plan B',
  });
  assert.equal(left.branch.manifest.branchId, right.branch.manifest.branchId);

  const changedInputs = forkBranch(leftGraph, {
    parentBranchId: leftGraph.rootBranchId,
    forkStepId: 's1',
    label: 'Plan C',
    inputs: [increment('alt-1', 99)],
  });
  assert.notEqual(changedInputs.branch.manifest.branchId, left.branch.manifest.branchId);

  const changedFork = forkBranch(leftGraph, {
    parentBranchId: leftGraph.rootBranchId,
    forkStepId: 's2',
    label: 'Plan D',
  });
  assert.notEqual(changedFork.branch.manifest.branchId, left.branch.manifest.branchId);
});

test('identical forks are idempotent and conflicting labels fail closed', () => {
  const { root, graph, branch } = graphWithChild('Plan A');
  const repeated = forkBranch(graph, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: 'Plan A',
  });
  assert.equal(repeated.created, false);
  assert.strictEqual(repeated.graph, graph);
  assert.equal(repeated.branch.manifest.branchId, branch.manifest.branchId);

  assert.throws(() => forkBranch(graph, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: 'Renamed Plan',
  }), { code: 'E_BRANCH_LABEL' });
});

test('labels are NFC-normalized, unique among siblings, and reusable below another parent', () => {
  const { root, graph, branch } = graphWithChild('Café');

  assert.throws(() => forkBranch(graph, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: 'Cafe\u0301',
    inputs: [increment('alternative', 7)],
  }), { code: 'E_BRANCH_LABEL' });

  const grandchild = forkBranch(graph, {
    parentBranchId: branch.manifest.branchId,
    forkStepId: 's2',
    label: 'Cafe\u0301',
  });
  assert.equal(grandchild.graph.branches[grandchild.branch.manifest.branchId].label, 'Café');
});

test('topology reads are deterministic and graph updates preserve prior bytes and runs', () => {
  const { source, root, graph, branch } = graphWithChild('Child');
  const rootBytes = canonicalString(root);
  const sourceBytes = exportRun(source);
  const parentBytes = exportRun(getBranch(graph, graph.rootBranchId));

  const grandchild = forkBranch(graph, {
    parentBranchId: branch.manifest.branchId,
    forkStepId: 's2',
    label: 'Grandchild',
  });

  assert.equal(canonicalString(root), rootBytes);
  assert.equal(exportRun(source), sourceBytes);
  assert.equal(exportRun(getBranch(graph, graph.rootBranchId)), parentBytes);
  assert.equal(grandchild.graph.revision, graph.revision + 1);
  assert.equal(grandchild.graph.previousGraphHash, graph.graphHash);
  assert.deepEqual(listChildren(grandchild.graph, grandchild.graph.rootBranchId), [branch.manifest.branchId]);
  assert.deepEqual(listChildren(grandchild.graph, branch.manifest.branchId), [grandchild.branch.manifest.branchId]);
  assert.deepEqual(listAncestors(grandchild.graph, grandchild.branch.manifest.branchId), [
    grandchild.graph.rootBranchId,
    branch.manifest.branchId,
  ]);
  assert.throws(() => { grandchild.graph.revision = 99; }, TypeError);
});

test('canonical export parses and re-verifies with the same bytes and executable branches', () => {
  const { graph } = graphWithChild();
  const exported = exportRunGraph(graph);
  const parsed = parseRunGraph(exported, resolveCounterAdapter);

  assert.equal(exportRunGraph(parsed), exported);
  assert.equal(getBranch(parsed, parsed.rootBranchId).manifest.branchId, parsed.rootBranchId);
  const report = verifyRunGraph(parsed);
  assert.equal(report.ok, true);
  assert.equal(report.verifiedBranchCount, 2);
  assert.equal(report.graphHash, parsed.graphHash);
});

test('graph verification rejects missing parents, cycles, overwritten keys, export tampering, and graph-hash tampering', () => {
  const { graph, branch } = graphWithChild();
  const childId = branch.manifest.branchId;

  const missingParent = JSON.parse(exportRunGraph(graph));
  missingParent.branches[childId].parentBranchId = 'branch-' + 'f'.repeat(64);
  rehashGraph(missingParent);
  assert.equal(verifyRunGraph(missingParent, resolveCounterAdapter).ok, false);
  assert.equal(verifyRunGraph(missingParent, resolveCounterAdapter).errorCode, 'E_GRAPH_BRANCH');

  const cycle = JSON.parse(exportRunGraph(graph));
  cycle.branches[childId].parentBranchId = childId;
  rehashGraph(cycle);
  const cycleReport = verifyRunGraph(cycle, resolveCounterAdapter);
  assert.equal(cycleReport.ok, false);
  assert.ok(['E_GRAPH_CYCLE', 'E_GRAPH_BRANCH'].includes(cycleReport.errorCode));

  const overwritten = JSON.parse(exportRunGraph(graph));
  const descriptor = overwritten.branches[childId];
  delete overwritten.branches[childId];
  overwritten.branches['branch-' + 'e'.repeat(64)] = descriptor;
  rehashGraph(overwritten);
  assert.equal(verifyRunGraph(overwritten, resolveCounterAdapter).ok, false);

  const exportTamper = JSON.parse(exportRunGraph(graph));
  exportTamper.runExports[childId] = exportTamper.runExports[childId].replace('"count":', '"count":999, "originalCount":');
  rehashGraph(exportTamper);
  assert.equal(verifyRunGraph(exportTamper, resolveCounterAdapter).ok, false);

  const hashTamper = JSON.parse(exportRunGraph(graph));
  hashTamper.graphHash = 'f'.repeat(64);
  const hashReport = verifyRunGraph(hashTamper, resolveCounterAdapter);
  assert.equal(hashReport.ok, false);
  assert.equal(hashReport.errorCode, 'E_GRAPH_HASH');
});

test('unknown branches and malformed graph inputs fail with stable graph codes', () => {
  const graph = createRunGraph(completeCounterRun(), 'Root');
  assert.throws(() => getBranch(graph, 'branch-' + 'f'.repeat(64)), { code: 'E_GRAPH_BRANCH' });
  assert.throws(() => listChildren(graph, 'missing'), { code: 'E_GRAPH_BRANCH' });
  assert.throws(() => listAncestors(graph, 'missing'), { code: 'E_GRAPH_BRANCH' });
  assert.throws(() => forkBranch(graph, { parentBranchId: graph.rootBranchId, forkStepId: 's1', label: '' }), { code: 'E_BRANCH_LABEL' });
  assert.equal(verifyRunGraph('not json', resolveCounterAdapter).ok, false);
  assert.equal(verifyRunGraph({}, resolveCounterAdapter).ok, false);
});

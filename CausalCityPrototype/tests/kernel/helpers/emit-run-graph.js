import { Buffer } from 'node:buffer';

import { sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { createRunGraph, exportRunGraph, forkBranch } from '../../../src/kernel/run-graph.js';
import { completeCounterRun } from './run-graph-fixture.js';

const source = completeCounterRun({ evidenceRuntime: 'run-graph-conformance-source' });
let graph = createRunGraph(source, 'Root');

const planA = forkBranch(graph, {
  parentBranchId: graph.rootBranchId,
  forkStepId: 's1',
  label: 'Plan A',
});
graph = planA.graph;

const planB = forkBranch(graph, {
  parentBranchId: graph.rootBranchId,
  forkStepId: 's1',
  label: 'Plan B',
  inputs: [
    { stepId: 'b1', type: 'increment', payload: { amount: 13 } },
    { stepId: 'b2', type: 'increment', payload: { amount: 21 } },
  ],
});
graph = planB.graph;

const detail = forkBranch(graph, {
  parentBranchId: planA.branch.manifest.branchId,
  forkStepId: 's2',
  label: 'Detail',
});
graph = detail.graph;

const exported = exportRunGraph(graph);
const branchIds = Object.keys(graph.branches).sort();

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'run-graph-v1',
  graphId: graph.graphId,
  rootBranchId: graph.rootBranchId,
  branchIds,
  planABranchId: planA.branch.manifest.branchId,
  planBBranchId: planB.branch.manifest.branchId,
  detailBranchId: detail.branch.manifest.branchId,
  graphHash: graph.graphHash,
  exportedBytesHash: sha256BytesHex(Buffer.from(exported, 'utf8')),
  exportedByteLength: Buffer.byteLength(exported, 'utf8'),
})}\n`);

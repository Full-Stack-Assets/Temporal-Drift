import { createRunGraph, forkBranch } from '../../../src/kernel/run-graph.js';
import { projectRunGraph } from '../../../src/projection/project-4d.js';
import { canonicalString, sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { completeCounterRun } from './run-graph-fixture.js';

let graph = createRunGraph(completeCounterRun(), 'Root');
const planA = forkBranch(graph, {
  parentBranchId: graph.rootBranchId,
  forkStepId: 's1',
  label: 'Plan A',
});
graph = planA.graph;
const planB = forkBranch(graph, {
  parentBranchId: graph.rootBranchId,
  forkStepId: 's2',
  label: 'Plan B',
  inputs: [{ stepId: 'alt', type: 'increment', payload: { amount: 9 } }],
});
graph = planB.graph;

const projection = projectRunGraph(graph);
const exported = canonicalString(projection);
const sample = projection.dimensions.temporal.nodes.slice(0, 4).map((node) => ({
  nodeId: node.nodeId,
  branchId: node.branchId,
  sequence: node.sequence,
  x: node.x,
  y: node.y,
  z: node.z,
  t: node.t,
}));

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'projection-v1',
  graphId: projection.graphId,
  sourceGraphHash: projection.sourceGraphHash,
  projectionHash: projection.projectionHash,
  projectionBytesHash: sha256BytesHex(Buffer.from(exported, 'utf8')),
  projectionByteLength: Buffer.byteLength(exported, 'utf8'),
  temporalNodeCount: projection.dimensions.temporal.nodes.length,
  provenanceEdgeCount: projection.dimensions.causal.edges.length,
  branchNodeCount: projection.dimensions.branching.nodes.length,
  branchEdgeCount: projection.dimensions.branching.edges.length,
  coordinateSample: sample,
})}\n`);

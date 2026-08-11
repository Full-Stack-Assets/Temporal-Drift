import { canonicalString } from '../../../src/kernel/canonicalize.js';
import { createRunGraph, forkBranch } from '../../../src/kernel/run-graph.js';
import { projectRunGraph } from '../../../src/projection/project-4d.js';
import { buildTrustscapeScene } from '../../../src/trustscape/model.js';
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
const scene = buildTrustscapeScene(projection);
process.stdout.write(canonicalString({ projection, scene }));

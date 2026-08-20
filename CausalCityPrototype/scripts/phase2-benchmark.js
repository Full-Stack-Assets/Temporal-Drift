import { performance } from 'node:perf_hooks';

import { canonicalString } from '../src/kernel/canonicalize.js';
import { createRunGraph, forkBranch } from '../src/kernel/run-graph.js';
import { projectRunGraph } from '../src/projection/project-4d.js';
import { buildTrustscapeScene } from '../src/trustscape/model.js';
import { rankBranches } from '../src/approximation/branch-ranking.js';
import { sampleSensitivityTopography } from '../src/approximation/sensitivity-topography.js';
import { completeCounterRun } from '../tests/kernel/helpers/run-graph-fixture.js';

let graph = createRunGraph(completeCounterRun(), 'Root');
const amounts = [1, 4, 8, 12, 16, 20, 24, 28];
for (const [index, amount] of amounts.entries()) {
  graph = forkBranch(graph, {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's1',
    label: `Candidate ${index + 1}`,
    inputs: [{ stepId: `candidate-${index + 1}`, type: 'increment', payload: { amount } }],
  }).graph;
}

const branchIds = Object.keys(graph.branches).sort();
const samples = branchIds.map((branchId, index) => ({ branchId, levers: { intensity: index * 100 } }));

function measure(label, operation, iterations = 100) {
  const start = performance.now();
  let artifact;
  for (let index = 0; index < iterations; index += 1) artifact = operation();
  const durationMs = performance.now() - start;
  return {
    label,
    iterations,
    totalMs: Number(durationMs.toFixed(3)),
    averageMs: Number((durationMs / iterations).toFixed(6)),
    canonicalBytes: Buffer.byteLength(canonicalString(artifact), 'utf8'),
  };
}

const projection = projectRunGraph(graph);
const observations = [
  measure('projectRunGraph', () => projectRunGraph(graph)),
  measure('buildTrustscapeScene', () => buildTrustscapeScene(projection)),
  measure('sampleSensitivityTopography', () => sampleSensitivityTopography(graph, {
    samples,
    outcomes: [{ id: 'count', path: '/count' }],
    cliffThresholds: { count: 10 },
  })),
  measure('rankBranches', () => rankBranches(graph, {
    branchIds,
    objectives: [{ id: 'count', path: '/count', direction: 'maximize', weight: 1 }],
    limit: branchIds.length,
  })),
];

process.stdout.write(`${JSON.stringify({
  evidenceClass: 'environment-specific-performance-observation',
  correctnessGate: false,
  runtime: process.version,
  platform: process.platform,
  arch: process.arch,
  branchCount: branchIds.length,
  projectionPointCount: projection.dimensions.temporal.nodes.length,
  observations,
  warning: 'Timing values are not included in any kernel, RunGraph, projection, or approximation integrity hash and are not portable performance guarantees.',
}, null, 2)}\n`);

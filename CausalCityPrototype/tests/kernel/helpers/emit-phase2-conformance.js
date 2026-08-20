import { createAnomalyRegistry, recordAnomaly } from '../../../src/kernel/anomalies.js';
import { canonicalString, sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { createRunGraph, forkBranch } from '../../../src/kernel/run-graph.js';
import { classifyAnomalyForReview, createAnomalyReviewQueue } from '../../../src/approximation/anomaly-review.js';
import { rankBranches } from '../../../src/approximation/branch-ranking.js';
import { sampleSensitivityTopography } from '../../../src/approximation/sensitivity-topography.js';
import { createMemoryProfile, narrativeTension, perceivedValue } from '../../../src/approximation/subjective-memory.js';
import { completeCounterRun } from './run-graph-fixture.js';

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
graph = high.graph;

const topography = sampleSensitivityTopography(graph, {
  samples: [
    { branchId: high.branch.manifest.branchId, levers: { intensity: 200 } },
    { branchId: graph.rootBranchId, levers: { intensity: 100 } },
    { branchId: low.branch.manifest.branchId, levers: { intensity: 0 } },
  ],
  outcomes: [{ id: 'count', path: '/count' }],
  cliffThresholds: { count: 10 },
});

const ranking = rankBranches(graph, {
  branchIds: [graph.rootBranchId, low.branch.manifest.branchId, high.branch.manifest.branchId],
  objectives: [{ id: 'count', path: '/count', direction: 'maximize', weight: 3 }],
  limit: 3,
});

const memory = createMemoryProfile({
  profileId: 'synthetic-cohort-a',
  shortWindow: 2,
  longWindow: 6,
  observations: [
    { logicalTime: 3, value: -20, salience: 2, generation: 1 },
    { logicalTime: 7, value: 30, salience: 3, generation: 0 },
    { logicalTime: 8, value: 50, salience: 4, generation: 0 },
  ],
});
const perception = perceivedValue(memory, 9);
const tension = narrativeTension({ objectiveValue: 60, perceivedValue: perception.value, scale: 100 });

let registry = createAnomalyRegistry();
for (const [index, delta] of [5, 15, -25, 40].entries()) {
  registry = recordAnomaly(registry, {
    runId: 'phase2-run',
    branchId: 'phase2-branch',
    stepId: `s-${index}`,
    metricPath: '/count',
    expected: 100,
    observed: 100 + delta,
    unit: 'count',
    scale: 1,
    sourceRef: `source-${index}`,
    sourceVersion: 'v1',
    severity: 'warning',
  });
}
const anomalyQueue = createAnomalyReviewQueue(registry.records, { watch: 10, warning: 20, critical: 30 });
const sampleClassification = classifyAnomalyForReview(registry.records[2], { watch: 10, warning: 20, critical: 30 });

const topographyBytes = canonicalString(topography);
const rankingBytes = canonicalString(ranking);
const memoryBytes = canonicalString({ profile: memory, perception, tension });
const anomalyBytes = canonicalString(anomalyQueue);

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'phase2-approximation-v1',
  sourceGraphId: graph.graphId,
  sourceGraphHash: graph.graphHash,
  topographyHash: topography.topographyHash,
  topographyBytesHash: sha256BytesHex(Buffer.from(topographyBytes, 'utf8')),
  topographyPointCount: topography.points.length,
  cliffVector: topography.neighborDeltas.map((entry) => entry.cliffs.count),
  rankingHash: ranking.rankingHash,
  rankingBytesHash: sha256BytesHex(Buffer.from(rankingBytes, 'utf8')),
  rankedBranchIds: ranking.rankings.map((entry) => entry.branchId),
  rankingScores: ranking.rankings.map((entry) => entry.aggregateScore),
  perceptionValue: perception.value,
  perceptionRational: perception.rational,
  narrativeTension: tension.tension,
  memoryBundleBytesHash: sha256BytesHex(Buffer.from(memoryBytes, 'utf8')),
  anomalyQueueHash: anomalyQueue.queueHash,
  anomalyQueueBytesHash: sha256BytesHex(Buffer.from(anomalyBytes, 'utf8')),
  anomalyOrder: anomalyQueue.items.map((entry) => entry.classification),
  sampleAnomalyClassificationHash: sampleClassification.classificationHash,
  humanReviewRequired: anomalyQueue.humanReviewRequired,
  autoForkAllowed: anomalyQueue.autoForkAllowed,
  autoCalibrationAllowed: anomalyQueue.autoCalibrationAllowed,
})}\n`);

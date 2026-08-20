import { canonicalString } from '../../../src/kernel/canonicalize.js';
import {
  appendProposalReview,
  buildMemoryWindows,
  createProposalRegistry,
  decideBranchProposal,
  exploreBranchCandidates,
  exportBranchExploration,
  exportMemoryWindows,
  exportProposalRegistry,
  exportSparseTopography,
  exportTrustscapeChunkPlan,
  getProposalStatus,
  planTrustscapeChunks,
  profileProjectionWork,
  sampleSparseTopography,
  submitBranchProposal,
} from '../../../src/approximations/index.js';
import { projectRunGraph4D } from '../../../src/projector/index.js';
import { createProjectionGraph, subjectiveRecord } from './projection-fixture.js';

export const phase2Evaluator = Object.freeze({
  id: 'phase2-conformance-evaluator',
  version: '1.0.0',
  evaluate(parameters) {
    return {
      employment: parameters.jobs * 3 + parameters.housing,
      pressure: parameters.jobs * 2 - parameters.housing,
    };
  },
});

export function createPhase2Fixture() {
  const parentRef = Object.freeze({
    graphId: `graph-${'a'.repeat(64)}`,
    parentBranchId: `branch-${'b'.repeat(64)}`,
    forkStepId: 's1',
    parentReceiptHash: 'c'.repeat(64),
  });
  const axes = Object.freeze([
    Object.freeze({ axisId: 'housing', minimum: 0, maximum: 200, step: 20 }),
    Object.freeze({ axisId: 'jobs', minimum: 0, maximum: 100, step: 10 }),
  ]);
  const topography = sampleSparseTopography({
    baseline: { housing: 100, jobs: 50 },
    axes,
    metrics: ['employment', 'pressure'],
    evaluator: phase2Evaluator,
    cliffThreshold: { outputNumerator: 2, inputDenominator: 1 },
    pairLimit: 1,
  });
  const exploration = exploreBranchCandidates({
    parentRef,
    seedState: [1, 2, 3, 4],
    axes,
    initialCandidates: [
      { parameters: { housing: 100, jobs: 40 } },
      { parameters: { housing: 80, jobs: 60 } },
    ],
    objectives: [
      { metricId: 'employment', direction: 'maximize', weight: 2 },
      { metricId: 'pressure', direction: 'minimize', weight: 1 },
    ],
    evaluator: phase2Evaluator,
    populationLimit: 6,
    survivorCount: 2,
    generations: 2,
    proposalLimit: 3,
  });
  const memory = buildMemoryWindows({
    records: [
      {
        perspectiveId: 'resident-parent',
        branchId: parentRef.parentBranchId,
        sequence: 3,
        stepId: 'year-2038',
        metricPath: '/housing/rentPressure',
        objectiveValue: 100,
        perceivedValue: 110,
        scale: 1,
        sourceRef: 'parent-interview',
        sourceVersion: 'v1',
        memoryKind: 'personal',
        generation: 0,
        inheritedFromPerspectiveId: null,
      },
      {
        perspectiveId: 'resident-child',
        branchId: parentRef.parentBranchId,
        sequence: 8,
        stepId: 'year-2043',
        metricPath: '/housing/rentPressure',
        objectiveValue: 100,
        perceivedValue: 75,
        scale: 1,
        sourceRef: 'family-archive',
        sourceVersion: 'v1',
        memoryKind: 'cultural',
        generation: 1,
        inheritedFromPerspectiveId: 'resident-parent',
      },
    ],
    windows: [
      { windowId: 'short', length: 5 },
      { windowId: 'long', length: 20 },
    ],
    currentSequence: 10,
  });
  let registry = createProposalRegistry({ minimumApprovals: 2 });
  registry = submitBranchProposal(registry, {
    anomalyId: `anomaly-${'d'.repeat(64)}`,
    requesterId: 'analyst',
    parentRef,
    hypothesis: 'Evaluate one bounded candidate in a separate manual simulation.',
    parameters: exploration.proposals[0].parameters,
    evidenceRefs: ['phase2-topography', 'phase2-exploration'],
    reviewRequired: true,
    executionAuthority: 'none',
  });
  const proposalId = registry.proposals[0].proposalId;
  registry = appendProposalReview(registry, {
    proposalId,
    reviewerId: 'reviewer-a',
    disposition: 'approve-for-manual-simulation',
    rationale: 'The proposal is bounded and explicitly non-authoritative.',
    evidenceRefs: [],
  });
  registry = appendProposalReview(registry, {
    proposalId,
    reviewerId: 'reviewer-b',
    disposition: 'approve-for-manual-simulation',
    rationale: 'The evidence references and parent receipt are explicit.',
    evidenceRefs: [],
  });
  registry = decideBranchProposal(registry, {
    proposalId,
    deciderId: 'review-chair',
    disposition: 'approved-for-manual-simulation',
    rationale: 'Approved only for a separately authorized manual simulation step.',
  });

  const graphFixture = createProjectionGraph();
  const projection = projectRunGraph4D(graphFixture.graph, {
    subjectiveRecords: [subjectiveRecord(graphFixture.planABranchId)],
  });
  const workProfile = profileProjectionWork(projection);
  const chunkPlan = planTrustscapeChunks(projection, { maxTemporalPointsPerChunk: 2 });

  return Object.freeze({
    topography,
    exploration,
    memory,
    registry,
    proposalStatus: getProposalStatus(registry, proposalId),
    workProfile,
    chunkPlan,
    exports: Object.freeze({
      topography: exportSparseTopography(topography),
      exploration: exportBranchExploration(exploration),
      memory: exportMemoryWindows(memory),
      registry: exportProposalRegistry(registry),
      workProfile: canonicalString(workProfile),
      chunkPlan: exportTrustscapeChunkPlan(chunkPlan),
    }),
  });
}

import { createRunGraph, forkBranch } from '../../../src/kernel/run-graph.js';
import { completeCounterRun } from './run-graph-fixture.js';

export function createProjectionGraph(labels = {}) {
  const root = createRunGraph(completeCounterRun(), labels.root ?? 'Root');
  const planA = forkBranch(root, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: labels.planA ?? 'Plan A',
  });
  const planB = forkBranch(planA.graph, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: labels.planB ?? 'Plan B',
    inputs: [
      { stepId: 'alt-2', type: 'increment', payload: { amount: 7 } },
      { stepId: 'alt-3', type: 'increment', payload: { amount: 11 } },
    ],
  });
  const detail = forkBranch(planB.graph, {
    parentBranchId: planA.branch.manifest.branchId,
    forkStepId: 's2',
    label: labels.detail ?? 'Detail',
  });
  return Object.freeze({
    graph: detail.graph,
    rootBranchId: root.rootBranchId,
    planABranchId: planA.branch.manifest.branchId,
    planBBranchId: planB.branch.manifest.branchId,
    detailBranchId: detail.branch.manifest.branchId,
  });
}

export function subjectiveRecord(branchId, overrides = {}) {
  return {
    perspectiveId: 'resident-panel-1',
    branchId,
    stepId: 's2',
    metricPath: '/count',
    objectiveValue: 8,
    perceivedValue: 13,
    scale: 1,
    sourceRef: 'memory-workshop-1',
    sourceVersion: 'v1',
    ...overrides,
  };
}

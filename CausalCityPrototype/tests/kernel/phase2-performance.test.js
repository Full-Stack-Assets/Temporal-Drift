import test from 'node:test';
import assert from 'node:assert/strict';

import { sha256Hex } from '../../src/kernel/canonicalize.js';
import { advanceRun, createRun } from '../../src/kernel/replay.js';
import { createRunGraph } from '../../src/kernel/run-graph.js';
import { projectRunGraph4D } from '../../src/projector/index.js';
import {
  assessTrustscapeCapacity,
  createTimingObservation,
  exportTrustscapeChunkPlan,
  planTrustscapeChunks,
  profileProjectionWork,
  verifyProjectionWorkProfile,
  verifyTrustscapeChunkPlan,
} from '../../src/approximations/performance.js';
import { counterAdapter, counterManifest } from './helpers/counter-fixture.js';
import { createProjectionGraph, subjectiveRecord } from './helpers/projection-fixture.js';

function normalProjection() {
  const fixture = createProjectionGraph();
  return projectRunGraph4D(fixture.graph, {
    subjectiveRecords: [subjectiveRecord(fixture.planABranchId)],
  });
}

function increment(stepId) {
  return { stepId, type: 'increment', payload: { amount: 1 } };
}

function longProjection(length = 500) {
  const inputs = Array.from({ length }, (_, index) => increment(`long-${String(index + 1).padStart(4, '0')}`));
  let run = createRun(counterManifest({
    runId: 'phase2-long-run',
    branchId: 'phase2-long-root',
    inputs,
    evidenceRuntime: 'phase2-long-fixture',
  }), counterAdapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  return projectRunGraph4D(createRunGraph(run, 'Long root'));
}

function rehashPlan(value) {
  const { chunkPlanHash: _old, ...core } = value;
  value.chunkPlanHash = sha256Hex(core);
  return value;
}

test('projection work profile records exact deterministic counts and work units', () => {
  const projection = normalProjection();
  const profile = profileProjectionWork(projection);
  assert.equal(profile.format, 'ripple-projection-work-profile');
  assert.equal(profile.schemaVersion, '1.0.0');
  assert.equal(profile.canonical, true);
  assert.equal(profile.branchCount, 4);
  assert.equal(profile.temporalPointCount, 12);
  assert.equal(profile.causalNodeCount, 20);
  assert.equal(profile.causalEdgeCount, 19);
  assert.equal(profile.branchEdgeCount, 3);
  assert.equal(profile.subjectiveRecordCount, 1);
  assert.equal(profile.expectedSceneObjectCount, 37);
  assert.equal(profile.expectedThreadCount, 22);
  assert.equal(profile.workUnitCount, 116);
  assert.match(profile.workProfileHash, /^[a-f0-9]{64}$/);
  assert.equal(verifyProjectionWorkProfile(profile, projection).ok, true);
});

test('long projections produce deterministic branch-local contiguous receipt chunks', () => {
  const projection = longProjection();
  const before = projection.projectionHash;
  const plan = planTrustscapeChunks(projection, { maxTemporalPointsPerChunk: 128 });
  assert.equal(projection.projectionHash, before);
  assert.equal(plan.format, 'ripple-trustscape-chunk-plan');
  assert.equal(plan.maxTemporalPointsPerChunk, 128);
  assert.equal(plan.sourceTemporalPointCount, 501);
  assert.equal(plan.chunks.length, 4);
  assert.deepEqual(plan.chunks.map((chunk) => chunk.pointCount), [128, 128, 128, 117]);
  assert.equal(plan.chunks[0].startSequence, 0);
  assert.equal(plan.chunks[0].firstPreviousReceiptHash, null);
  assert.equal(plan.chunks.at(-1).endSequence, 500);
  for (let index = 1; index < plan.chunks.length; index += 1) {
    assert.equal(plan.chunks[index].startSequence, plan.chunks[index - 1].endSequence + 1);
    assert.equal(plan.chunks[index].firstPreviousReceiptHash, plan.chunks[index - 1].terminalReceiptHash);
  }
  assert.equal(new Set(plan.chunks.map((chunk) => chunk.chunkId)).size, plan.chunks.length);
  assert.equal(verifyTrustscapeChunkPlan(plan, projection).ok, true);
  assert.equal(exportTrustscapeChunkPlan(plan), exportTrustscapeChunkPlan(planTrustscapeChunks(projection, { maxTemporalPointsPerChunk: 128 })));
});

test('capacity assessment is deterministic and only compares declared integer budgets', () => {
  const profile = profileProjectionWork(normalProjection());
  const adequate = assessTrustscapeCapacity(profile, {
    maxBranches: 4,
    maxTemporalPoints: 12,
    maxCausalNodes: 20,
    maxWorkUnits: 116,
  });
  assert.equal(adequate.withinBudget, true);
  assert.equal(adequate.chunkingRequired, false);

  const constrained = assessTrustscapeCapacity(profile, {
    maxBranches: 2,
    maxTemporalPoints: 8,
    maxCausalNodes: 10,
    maxWorkUnits: 80,
  });
  assert.equal(constrained.withinBudget, false);
  assert.equal(constrained.chunkingRequired, true);
  assert.deepEqual(constrained.exceeded, ['branches', 'causalNodes', 'temporalPoints', 'workUnits']);
  assert.match(constrained.assessmentHash, /^[a-f0-9]{64}$/);
});

test('timing observations are explicitly noncanonical and cannot change correctness commitments', () => {
  const profile = profileProjectionWork(normalProjection());
  const fast = createTimingObservation({
    operationId: 'project',
    runtimeId: 'node-22',
    elapsedMicroseconds: 100,
    workProfileHash: profile.workProfileHash,
  });
  const slow = createTimingObservation({
    operationId: 'project',
    runtimeId: 'node-24',
    elapsedMicroseconds: 500,
    workProfileHash: profile.workProfileHash,
  });
  assert.equal(fast.canonical, false);
  assert.equal(slow.canonical, false);
  assert.notEqual(fast.observationId, slow.observationId);
  assert.equal(profile.workProfileHash, profileProjectionWork(normalProjection()).workProfileHash);
  assert.equal('artifactHash' in fast, false);
});

test('work profiles and chunk plans reject malformed budgets, chunk sizes, and validly re-hashed stale IDs', () => {
  const projection = normalProjection();
  const profile = profileProjectionWork(projection);
  assert.throws(() => assessTrustscapeCapacity(profile, {
    maxBranches: 0,
    maxTemporalPoints: 12,
    maxCausalNodes: 20,
    maxWorkUnits: 116,
  }), { code: 'E_CHUNK_PLAN' });
  assert.throws(() => planTrustscapeChunks(projection, { maxTemporalPointsPerChunk: 0 }), { code: 'E_CHUNK_PLAN' });

  const plan = planTrustscapeChunks(projection, { maxTemporalPointsPerChunk: 2 });
  const tampered = JSON.parse(exportTrustscapeChunkPlan(plan));
  tampered.chunks[0].terminalReceiptHash = 'f'.repeat(64);
  rehashPlan(tampered);
  const report = verifyTrustscapeChunkPlan(tampered, projection);
  assert.equal(report.ok, false);
  assert.equal(report.errorCode, 'E_APPROX_HASH');

  const profileTamper = structuredClone(profile);
  profileTamper.workUnitCount += 1;
  const profileReport = verifyProjectionWorkProfile(profileTamper, projection);
  assert.equal(profileReport.ok, false);
  assert.equal(profileReport.errorCode, 'E_APPROX_HASH');
});

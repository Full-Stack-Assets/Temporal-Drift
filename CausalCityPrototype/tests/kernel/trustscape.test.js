import test from 'node:test';
import assert from 'node:assert/strict';

import { projectRunGraph4D } from '../../src/projector/index.js';
import {
  createTrustscapeScene,
  exportTrustscapeScene,
  verifyTrustscapeScene,
} from '../../src/trustscape/scene.js';
import { createProjectionGraph, subjectiveRecord } from './helpers/projection-fixture.js';

test('Trustscape scene deterministically renders projected objects and receipt-consistent threads', () => {
  const fixture = createProjectionGraph();
  const projection = projectRunGraph4D(fixture.graph, { subjectiveRecords: [subjectiveRecord(fixture.planABranchId)] });
  const before = JSON.stringify(projection);
  const first = createTrustscapeScene(projection);
  const second = createTrustscapeScene(projection);

  assert.equal(JSON.stringify(projection), before);
  assert.equal(exportTrustscapeScene(first), exportTrustscapeScene(second));
  assert.equal(first.sourceProjectionHash, projection.projectionHash);
  assert.equal(first.view.activeBranchIds.length, 4);
  assert.equal(first.objects.filter((entry) => entry.kind === 'snapstate').length, 12);
  assert.equal(first.objects.filter((entry) => entry.kind === 'branch').length, 4);
  assert.equal(first.radar.length, 1);
  const objectIds = new Set(first.objects.map((entry) => entry.objectId));
  for (const thread of first.threads) {
    assert.equal(objectIds.has(thread.fromObjectId), true, thread.fromObjectId);
    assert.equal(objectIds.has(thread.toObjectId), true, thread.toObjectId);
  }
  assert.equal(verifyTrustscapeScene(first, projection).ok, true);
});

test('time navigation, branch filtering, and two-branch comparison are deterministic', () => {
  const fixture = createProjectionGraph();
  const projection = projectRunGraph4D(fixture.graph);
  const view = {
    startSequence: 1,
    endSequence: 2,
    activeBranchIds: [fixture.rootBranchId, fixture.planABranchId],
    compareBranchIds: [fixture.rootBranchId, fixture.planABranchId],
  };
  const scene = createTrustscapeScene(projection, view);

  assert.deepEqual(scene.view.activeBranchIds, [...view.activeBranchIds].sort());
  assert.deepEqual(scene.view.compareBranchIds, [...view.compareBranchIds].sort());
  assert.ok(scene.objects.filter((entry) => entry.kind === 'snapstate').every((entry) => entry.sequence >= 1 && entry.sequence <= 2));
  assert.ok(scene.objects.filter((entry) => 'branchId' in entry).every((entry) => view.activeBranchIds.includes(entry.branchId)));
  assert.equal(scene.comparisons.length, 1);
  assert.equal(scene.comparisons[0].stepId, 's2');
  assert.equal(typeof scene.comparisons[0].stateHashesEqual, 'boolean');

  assert.throws(() => createTrustscapeScene(projection, { ...view, startSequence: 3, endSequence: 1 }), { code: 'E_TRUSTSCAPE_VIEW' });
  assert.throws(() => createTrustscapeScene(projection, { ...view, compareBranchIds: [fixture.rootBranchId] }), { code: 'E_TRUSTSCAPE_VIEW' });
  assert.throws(() => createTrustscapeScene(projection, { ...view, activeBranchIds: ['branch-' + 'f'.repeat(64)] }), { code: 'E_TRUSTSCAPE_VIEW' });
});

test('Trustscape verification detects scene tampering without repairing it', () => {
  const projection = projectRunGraph4D(createProjectionGraph().graph);
  const scene = createTrustscapeScene(projection);
  const tampered = JSON.parse(exportTrustscapeScene(scene));
  tampered.sceneHash = 'f'.repeat(64);
  const report = verifyTrustscapeScene(tampered, projection);
  assert.equal(report.ok, false);
  assert.equal(report.errorCode, 'E_TRUSTSCAPE_HASH');
});

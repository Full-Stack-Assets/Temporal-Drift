import test from 'node:test';
import assert from 'node:assert/strict';

import { sha256Hex } from '../../src/kernel/canonicalize.js';
import { exportProjection, projectRunGraph4D, verifyProjection } from '../../src/projector/index.js';
import { verifyProjectionInBrowser } from '../../src/trustscape/browser-integrity.js';
import { createTrustscapeScene, exportTrustscapeScene, verifyTrustscapeScene } from '../../src/trustscape/index.js';
import { createProjectionGraph, subjectiveRecord } from './helpers/projection-fixture.js';

function rehashProjection(value) {
  const { projectionHash: _old, ...core } = value;
  value.projectionHash = sha256Hex(core);
  return value;
}

function rehashScene(value) {
  const { sceneHash: _old, ...core } = value;
  value.sceneHash = sha256Hex(core);
  return value;
}

function explicitProjection() {
  const fixture = createProjectionGraph();
  return projectRunGraph4D(fixture.graph, {
    subjectiveRecords: [subjectiveRecord(fixture.planABranchId)],
  });
}

test('Node and browser verifiers reject validly re-hashed temporal content with stale content IDs', async () => {
  const projection = JSON.parse(exportProjection(explicitProjection()));
  projection.dimensions.temporal.points[0].stateHash = 'f'.repeat(64);
  rehashProjection(projection);

  const nodeReport = verifyProjection(projection);
  assert.equal(nodeReport.ok, false);
  assert.equal(nodeReport.errorCode, 'E_PROJECTION_HASH');

  const browserReport = await verifyProjectionInBrowser(JSON.stringify(projection));
  assert.equal(browserReport.ok, false);
  assert.equal(browserReport.errorCode, 'E_BROWSER_PROJECTION_HASH');
});

test('projection verification recomputes causal node and edge content IDs', async () => {
  const projection = JSON.parse(exportProjection(explicitProjection()));
  const eventNode = projection.dimensions.causal.nodes.find((node) => node.kind === 'event');
  eventNode.eventIndex += 1;
  const emission = projection.dimensions.causal.edges.find((edge) => edge.kind === 'emits');
  emission.kind = 'precedes';
  rehashProjection(projection);

  assert.equal(verifyProjection(projection).ok, false);
  assert.equal((await verifyProjectionInBrowser(JSON.stringify(projection))).ok, false);
});

test('subjective branch status counts must equal the explicit record set', async () => {
  const projection = JSON.parse(exportProjection(explicitProjection()));
  const modeled = projection.dimensions.subjective.statusByBranch.find((entry) => entry.status === 'modeled-from-explicit-records');
  modeled.recordCount = 0;
  rehashProjection(projection);

  const nodeReport = verifyProjection(projection);
  assert.equal(nodeReport.ok, false);
  assert.equal(nodeReport.errorCode, 'E_PROJECTION_REFERENCE');

  const browserReport = await verifyProjectionInBrowser(JSON.stringify(projection));
  assert.equal(browserReport.ok, false);
  assert.equal(browserReport.errorCode, 'E_BROWSER_PROJECTION_REFERENCE');
});

test('standalone Trustscape verification rejects validly re-hashed objects and threads with stale IDs', () => {
  const scene = JSON.parse(exportTrustscapeScene(createTrustscapeScene(explicitProjection())));
  const snapstate = scene.objects.find((object) => object.kind === 'snapstate');
  snapstate.position.x += 1;
  const thread = scene.threads[0];
  thread.kind = thread.kind === 'precedes' ? 'emits' : 'precedes';
  rehashScene(scene);

  const report = verifyTrustscapeScene(scene);
  assert.equal(report.ok, false);
  assert.equal(report.errorCode, 'E_TRUSTSCAPE_HASH');
});

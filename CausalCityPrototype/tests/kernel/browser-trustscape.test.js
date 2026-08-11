import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString, sha256Hex } from '../../src/kernel/canonicalize.js';
import {
  appendAnnotation,
  createAnnotationDocument,
  exportAnnotationDocument,
  mergeAnnotationDocuments,
} from '../../src/trustscape/annotations.js';
import { createTrustscapeScene } from '../../src/trustscape/scene.js';
import { exportProjection, projectRunGraph4D } from '../../src/projector/index.js';
import {
  appendAnnotationInBrowser,
  canonicalBrowserString,
  createAnnotationDocumentInBrowser,
  createBrowserRenderModel,
  mergeAnnotationDocumentsInBrowser,
  sha256BrowserHex,
  verifyAnnotationDocumentInBrowser,
  verifyProjectionInBrowser,
} from '../../src/trustscape/browser-core.js';
import { createProjectionGraph, subjectiveRecord } from './helpers/projection-fixture.js';

function annotation(actorId, logicalClock, body, overrides = {}) {
  return {
    actorId,
    logicalClock,
    targetId: 'temporal-point-1',
    body,
    supersedes: null,
    ...overrides,
  };
}

test('browser canonicalization and Web Crypto SHA-256 reproduce kernel commitments', async () => {
  const value = {
    zeta: 'Cafe\u0301',
    alpha: [1, { truth: true, text: 'Δ' }],
    integer: 9007199254740991,
  };
  assert.equal(canonicalBrowserString(value), canonicalString(value));
  assert.equal(await sha256BrowserHex(value), sha256Hex(value));
  assert.throws(() => canonicalBrowserString({ unsafe: 1.5 }), { code: 'E_BROWSER_CANONICAL' });
  assert.throws(() => canonicalBrowserString({ negativeZero: -0 }), { code: 'E_BROWSER_CANONICAL' });
});

test('browser projection verification accepts exact exports and rejects commitment tampering', async () => {
  const fixture = createProjectionGraph();
  const projection = projectRunGraph4D(fixture.graph, {
    subjectiveRecords: [subjectiveRecord(fixture.planABranchId)],
  });
  const exported = exportProjection(projection);
  const report = await verifyProjectionInBrowser(exported);
  assert.equal(report.ok, true);
  assert.equal(report.projection.projectionHash, projection.projectionHash);
  assert.equal(canonicalBrowserString(report.projection), exported);

  const tampered = JSON.parse(exported);
  tampered.dimensions.temporal.points[0].stateHash = 'f'.repeat(64);
  const tamperReport = await verifyProjectionInBrowser(JSON.stringify(tampered));
  assert.equal(tamperReport.ok, false);
  assert.equal(tamperReport.errorCode, 'E_BROWSER_PROJECTION_HASH');
});

test('browser render model is deterministic and consistent with the Node Trustscape scene', async () => {
  const fixture = createProjectionGraph();
  const projection = projectRunGraph4D(fixture.graph, {
    subjectiveRecords: [subjectiveRecord(fixture.planABranchId)],
  });
  const view = {
    startSequence: 1,
    endSequence: 2,
    activeBranchIds: [fixture.rootBranchId, fixture.planABranchId],
    compareBranchIds: [fixture.rootBranchId, fixture.planABranchId],
  };
  const first = await createBrowserRenderModel(exportProjection(projection), view);
  const second = await createBrowserRenderModel(projection, structuredClone(view));
  const scene = createTrustscapeScene(projection, view);

  assert.equal(canonicalBrowserString(first), canonicalBrowserString(second));
  assert.equal(first.sourceProjectionHash, scene.sourceProjectionHash);
  assert.equal(first.objects.length, scene.objects.length);
  assert.equal(first.threads.length, scene.threads.length);
  assert.equal(first.comparisons.length, scene.comparisons.length);
  assert.equal(first.radar.length, scene.radar.length);
  assert.match(first.renderModelHash, /^[a-f0-9]{64}$/);
  const ids = new Set(first.objects.map((entry) => entry.objectId));
  for (const thread of first.threads) {
    assert.equal(ids.has(thread.fromObjectId), true);
    assert.equal(ids.has(thread.toObjectId), true);
  }
});

test('browser annotation operations interoperate byte-for-byte with the Node annotation ledger', async () => {
  const firstOperation = annotation('alice', 1, 'First note');
  const nodeOne = appendAnnotation(createAnnotationDocument('alice'), firstOperation);
  const browserEmpty = await createAnnotationDocumentInBrowser('alice');
  const browserOne = await appendAnnotationInBrowser(browserEmpty, firstOperation);
  assert.equal(canonicalBrowserString(browserOne), exportAnnotationDocument(nodeOne));

  const verified = await verifyAnnotationDocumentInBrowser(exportAnnotationDocument(nodeOne));
  assert.equal(verified.ok, true);
  const secondOperation = annotation('alice', 2, 'Revised note', {
    supersedes: nodeOne.operations[0].annotationId,
  });
  const browserTwo = await appendAnnotationInBrowser(verified.document, secondOperation);
  const nodeTwo = appendAnnotation(nodeOne, secondOperation);
  assert.equal(canonicalBrowserString(browserTwo), exportAnnotationDocument(nodeTwo));

  const bobOperation = annotation('bob', 1, 'Bob note');
  const nodeBob = appendAnnotation(createAnnotationDocument('bob'), bobOperation);
  const browserBob = await appendAnnotationInBrowser(await createAnnotationDocumentInBrowser('bob'), bobOperation);
  const browserMerged = await mergeAnnotationDocumentsInBrowser([browserTwo, browserBob]);
  const nodeMerged = mergeAnnotationDocuments([nodeTwo, nodeBob]);
  assert.equal(canonicalBrowserString(browserMerged), exportAnnotationDocument(nodeMerged));

  const altered = JSON.parse(canonicalBrowserString(browserMerged));
  altered.documentHash = 'f'.repeat(64);
  const alteredReport = await verifyAnnotationDocumentInBrowser(JSON.stringify(altered));
  assert.equal(alteredReport.ok, false);
  assert.equal(alteredReport.errorCode, 'E_BROWSER_ANNOTATION_HASH');
});

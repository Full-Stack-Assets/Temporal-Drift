import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createAnnotation } from '../../src/projection/annotations.js';
import {
  deriveBrowserAnnotation,
  validateBrowserAnnotationBundle,
  verifyTrustscapeFixture,
} from '../../src/trustscape/browser-integrity.js';

const fixture = JSON.parse(await readFile(new URL('../../data/trustscape-lite-fixture.json', import.meta.url), 'utf8'));

test('browser runtime independently verifies the pinned Trustscape fixture hash', async () => {
  assert.equal(await verifyTrustscapeFixture(fixture), true);
  const tampered = structuredClone(fixture);
  tampered.points[0].x += 1;
  assert.equal(await verifyTrustscapeFixture(tampered), false);
});

test('browser annotation derivation matches the kernel content-addressed annotation ID', async () => {
  const fields = {
    authorId: 'planner-é',
    targetType: 'snapstate',
    targetId: fixture.points[0].nodeId,
    body: 'Review Cafe\u0301 corridor.',
    createdLogicalTime: 4,
    supersedes: null,
  };
  const kernel = createAnnotation(fields);
  const browser = await deriveBrowserAnnotation(fields);
  assert.deepEqual(browser, kernel);
});

test('browser annotation bundle validation rejects tampered IDs and malformed records', async () => {
  const annotation = await deriveBrowserAnnotation({
    authorId: 'planner-a',
    targetType: 'snapstate',
    targetId: fixture.points[0].nodeId,
    body: 'Review.',
    createdLogicalTime: 0,
    supersedes: null,
  });
  const bundle = {
    format: 'trustscape-local-annotations',
    schemaVersion: '1.0.0',
    graphId: fixture.graphId,
    annotations: [annotation],
  };
  const valid = await validateBrowserAnnotationBundle(fixture.graphId, bundle);
  assert.deepEqual(valid.annotations, [annotation]);

  const tampered = structuredClone(bundle);
  tampered.annotations[0].annotationId = `annotation-${'f'.repeat(64)}`;
  await assert.rejects(() => validateBrowserAnnotationBundle(fixture.graphId, tampered), /annotationId does not match/u);

  const unknown = structuredClone(bundle);
  unknown.annotations[0].extra = true;
  await assert.rejects(() => validateBrowserAnnotationBundle(fixture.graphId, unknown), /unknown|missing|hidden|symbol/u);
});

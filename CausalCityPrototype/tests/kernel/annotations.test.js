import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendAnnotation,
  createAnnotationDocument,
  exportAnnotationDocument,
  mergeAnnotationDocuments,
  parseAnnotationDocument,
} from '../../src/trustscape/annotations.js';

function operation(actorId, logicalClock, body, overrides = {}) {
  return {
    actorId,
    logicalClock,
    targetId: 'temporal-point-1',
    body,
    supersedes: null,
    ...overrides,
  };
}

test('annotation operations are append-only, content-addressed, and use monotonic actor clocks', () => {
  const empty = createAnnotationDocument('alice');
  const one = appendAnnotation(empty, operation('alice', 1, 'Review this transition'));
  const firstId = one.operations[0].annotationId;
  const two = appendAnnotation(one, operation('alice', 2, 'Updated note', { supersedes: firstId }));

  assert.equal(empty.operations.length, 0);
  assert.equal(one.operations.length, 1);
  assert.equal(two.operations.length, 2);
  assert.match(firstId, /^annotation-[a-f0-9]{64}$/);
  assert.equal(two.operations[1].supersedes, firstId);
  assert.ok(Object.isFrozen(two));
  assert.throws(() => appendAnnotation(two, operation('alice', 2, 'Clock reuse')), { code: 'E_ANNOTATION_CLOCK' });
  assert.throws(() => appendAnnotation(two, operation('bob', 1, 'Unknown actor')), { code: 'E_ANNOTATION_SCHEMA' });
});

test('annotation merges are order-independent and preserve every valid operation', () => {
  const alice = appendAnnotation(createAnnotationDocument('alice'), operation('alice', 1, 'Alice note'));
  const bob = appendAnnotation(createAnnotationDocument('bob'), operation('bob', 1, 'Bob note'));
  const left = mergeAnnotationDocuments([alice, bob]);
  const right = mergeAnnotationDocuments([bob, alice]);

  assert.equal(exportAnnotationDocument(left), exportAnnotationDocument(right));
  assert.deepEqual(left.actorIds, ['alice', 'bob']);
  assert.equal(left.operations.length, 2);
  const parsed = parseAnnotationDocument(exportAnnotationDocument(left));
  assert.equal(exportAnnotationDocument(parsed), exportAnnotationDocument(left));
});

test('annotation parsing and merge reject tampered IDs, hashes, and conflicting actor histories', () => {
  const valid = appendAnnotation(createAnnotationDocument('alice'), operation('alice', 1, 'Original'));
  const badId = JSON.parse(exportAnnotationDocument(valid));
  badId.operations[0].annotationId = 'annotation-' + 'f'.repeat(64);
  assert.throws(() => parseAnnotationDocument(JSON.stringify(badId)), { code: 'E_ANNOTATION_HASH' });

  const badHash = JSON.parse(exportAnnotationDocument(valid));
  badHash.documentHash = 'f'.repeat(64);
  assert.throws(() => parseAnnotationDocument(JSON.stringify(badHash)), { code: 'E_ANNOTATION_HASH' });

  const forkedHistory = JSON.parse(exportAnnotationDocument(valid));
  forkedHistory.operations[0].body = 'Conflicting bytes';
  forkedHistory.operations[0].annotationId = valid.operations[0].annotationId;
  assert.throws(() => mergeAnnotationDocuments([valid, forkedHistory]), { code: /E_ANNOTATION_(HASH|CONFLICT)/ });
});

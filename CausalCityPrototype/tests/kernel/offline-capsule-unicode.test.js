import test from 'node:test';
import assert from 'node:assert/strict';

import { createOfflineVerificationCapsule } from '../../src/mesh/offline-capsule.js';
import { buildOfflineCapsuleInput } from './helpers/offline-capsule-fixture.js';

test('schema-bundle string values are NFC-normalized before ownership and content addressing', async () => {
  const input = await buildOfflineCapsuleInput();
  const composedBundle = structuredClone(input.schemaBundle);
  const decomposedBundle = structuredClone(input.schemaBundle);
  composedBundle[0].schema.title = 'Café';
  decomposedBundle[0].schema.title = 'Café';

  const composed = createOfflineVerificationCapsule({ ...input, schemaBundle: composedBundle });
  const decomposed = createOfflineVerificationCapsule({ ...input, schemaBundle: decomposedBundle });

  assert.deepEqual(decomposed, composed);
  assert.equal(decomposed.schemaBundle[0].schema.title, 'Café');
  assert.equal(decomposed.capsuleHash, composed.capsuleHash);
  assert.equal(decomposed.capsuleId, composed.capsuleId);
});

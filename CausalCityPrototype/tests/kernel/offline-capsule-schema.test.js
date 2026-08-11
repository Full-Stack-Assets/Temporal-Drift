import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createOfflineVerificationCapsule } from '../../src/mesh/offline-capsule.js';
import { buildOfflineCapsuleInput } from './helpers/offline-capsule-fixture.js';
import { validateSchema } from './helpers/json-schema-validator.js';

const schemaUrl = new URL('../../schemas/offline-verification-capsule-v1.schema.json', import.meta.url);

async function loadSchema() {
  return JSON.parse(await readFile(schemaUrl, 'utf8'));
}

test('offline capsule schema is strict JSON Schema 2020-12 with complete top-level coverage', async () => {
  const schema = await loadSchema();
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
});

test('valid capsule satisfies portable schema while malformed nested artifacts and overclaims fail', async () => {
  const schema = await loadSchema();
  const capsule = createOfflineVerificationCapsule(await buildOfflineCapsuleInput());
  assert.equal(validateSchema(schema, capsule), true);

  const overclaim = structuredClone(capsule);
  overclaim.claimBoundary.realIdentityVerified = true;
  assert.equal(validateSchema(schema, overclaim), false);

  const badProfile = structuredClone(capsule);
  badProfile.cryptoProfile.quantumResistanceClaimed = true;
  assert.equal(validateSchema(schema, badProfile), false);

  const badRegistry = structuredClone(capsule);
  badRegistry.keyRegistry.events[0].eventHash = 'bad';
  assert.equal(validateSchema(schema, badRegistry), false);

  const badAttestation = structuredClone(capsule);
  badAttestation.attestations[0].attestationId = 'bad';
  assert.equal(validateSchema(schema, badAttestation), false);

  const extra = { ...capsule, extra: true };
  assert.equal(validateSchema(schema, extra), false);
});

test('portable schema does not substitute for cryptographic verification', async () => {
  const schema = await loadSchema();
  const capsule = createOfflineVerificationCapsule(await buildOfflineCapsuleInput());
  const tampered = structuredClone(capsule);
  const signature = tampered.attestations[0].signature;
  tampered.attestations[0].signature = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;
  assert.equal(validateSchema(schema, tampered), true, 'signature remains shape-valid');
});

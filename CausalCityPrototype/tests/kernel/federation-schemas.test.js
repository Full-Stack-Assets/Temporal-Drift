import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';

import { createAnchorReceipt, createAnchorRequest } from '../../src/federation/anchor.js';
import { createVerificationAttestation } from '../../src/federation/attestation.js';
import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createQuorumPolicy, evaluateVerificationQuorum } from '../../src/federation/quorum.js';
import { appendVerifierRevocation, createRevocationLedger } from '../../src/federation/revocation.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';

const keyFixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B] = keyFixture.keys;

async function load(name) {
  return JSON.parse(await readFile(new URL(`../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
}

function resolveRef(root, reference) {
  if (!reference.startsWith('#/')) throw new Error(`Unsupported reference: ${reference}`);
  return reference.slice(2).split('/').reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function typeMatches(type, value) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isSafeInteger(value);
  return typeof value === type;
}

function validateSchema(schema, value, root = schema) {
  if (schema.$ref) return validateSchema(resolveRef(root, schema.$ref), value, root);
  if (schema.oneOf && schema.oneOf.filter((candidate) => validateSchema(candidate, value, root)).length !== 1) return false;
  if (schema.anyOf && !schema.anyOf.some((candidate) => validateSchema(candidate, value, root))) return false;
  if (schema.const !== undefined && !isDeepStrictEqual(value, schema.const)) return false;
  if (schema.enum && !schema.enum.some((candidate) => isDeepStrictEqual(value, candidate))) return false;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(type, value))) return false;
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.items && !value.every((entry) => validateSchema(schema.items, entry, root))) return false;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (schema.required && schema.required.some((key) => !(key in value))) return false;
    if (schema.properties) {
      for (const [key, property] of Object.entries(schema.properties)) {
        if (key in value && !validateSchema(property, value[key], root)) return false;
      }
    }
    const known = new Set(Object.keys(schema.properties ?? {}));
    if (schema.additionalProperties === false && keys.some((key) => !known.has(key))) return false;
  }
  return true;
}

function buildArtifacts() {
  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
  const registry = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [KEY_A, KEY_B].map((key) => ({
      verifierId: key.verifierId,
      keyId: key.keyId,
      algorithm: 'ed25519',
      publicKeySpkiBase64: key.publicKeySpkiBase64,
      weight: 1,
      validFromLogicalTime: 1,
      validUntilLogicalTime: null,
      role: key.role,
    })),
  }, profile);
  const subject = {
    subjectType: 'frontier-foundations',
    subjectId: 'frontier-foundations-v1',
    subjectHash: 'd'.repeat(64),
  };
  const signFor = (key) => createVerificationAttestation({
    attestationVersion: 'verification-attestation-v1',
    registryHash: registry.registryHash,
    verifierId: key.verifierId,
    keyId: key.keyId,
    logicalTime: 10,
    ...subject,
    verificationProcedureId: 'npm-run-verify-v1',
    verificationProcedureHash: 'a'.repeat(64),
    verdict: 'pass',
    findingsHash: null,
    limitationsHash: 'b'.repeat(64),
  }, key.privateKeyPem, registry, profile);
  const attestation = signFor(KEY_A);
  const secondAttestation = signFor(KEY_B);
  let revocations = createRevocationLedger(registry.registryHash);
  revocations = appendVerifierRevocation(revocations, {
    verifierId: KEY_B.verifierId,
    keyId: KEY_B.keyId,
    logicalTime: 30,
    reasonCode: 'test-rotation',
    sourceEvidenceHash: 'c'.repeat(64),
  });
  const emptyRevocations = createRevocationLedger(registry.registryHash);
  const policy = createQuorumPolicy({
    policyVersion: 'quorum-policy-v1',
    minimumDistinctVerifiers: 2,
    minimumPassWeight: 2,
    maximumFailWeight: 0,
    allowAbstain: true,
    requiredRoles: ['security-review', 'reproducibility-review'],
  });
  const quorum = evaluateVerificationQuorum({
    attestations: [attestation, secondAttestation],
    registry,
    cryptoProfile: profile,
    revocations: emptyRevocations,
    policy,
    subject,
  });
  const anchorRequest = createAnchorRequest({
    ...subject,
    targetProfile: 'transparency-log-generic-v1',
    nonce: 'schema-fixture-nonce',
  });
  const anchorReceipt = createAnchorReceipt({
    request: anchorRequest,
    providerId: 'test-provider',
    providerReceiptId: 'test-record-1',
    anchoredHash: subject.subjectHash,
    externalLocator: 'test://test-provider/test-record-1',
    observedAt: 'opaque-schema-fixture-time',
    providerEvidenceHash: 'e'.repeat(64),
  });
  return { profile, registry, attestation, revocations, quorum, anchorRequest, anchorReceipt };
}

test('real federation artifacts satisfy their strict schemas', async () => {
  const artifacts = buildArtifacts();
  const cases = [
    ['crypto-profile-v1', artifacts.profile],
    ['verifier-registry-v1', artifacts.registry],
    ['verification-attestation-v1', artifacts.attestation],
    ['verifier-revocation-ledger-v1', artifacts.revocations],
    ['verification-quorum-v1', artifacts.quorum],
    ['anchor-request-v1', artifacts.anchorRequest],
    ['anchor-receipt-v1', artifacts.anchorReceipt],
  ];
  for (const [name, artifact] of cases) {
    assert.equal(validateSchema(await load(name), artifact), true, name);
  }
});

test('federation schemas reject nested malformed values, unknown fields, and authority inflation', async () => {
  const artifacts = buildArtifacts();
  const registrySchema = await load('verifier-registry-v1');
  const attestationSchema = await load('verification-attestation-v1');
  const revocationSchema = await load('verifier-revocation-ledger-v1');
  const quorumSchema = await load('verification-quorum-v1');
  const receiptSchema = await load('anchor-receipt-v1');

  const badRegistry = structuredClone(artifacts.registry);
  badRegistry.verifiers[0].weight = 0;
  assert.equal(validateSchema(registrySchema, badRegistry), false);

  const unknownRegistry = structuredClone(artifacts.registry);
  unknownRegistry.verifiers[0].secret = true;
  assert.equal(validateSchema(registrySchema, unknownRegistry), false);

  assert.equal(validateSchema(attestationSchema, { ...artifacts.attestation, verdict: 'approved' }), false);

  const badRevocations = structuredClone(artifacts.revocations);
  badRevocations.records[0].sourceEvidenceHash = 'bad';
  assert.equal(validateSchema(revocationSchema, badRevocations), false);

  assert.equal(validateSchema(quorumSchema, { ...artifacts.quorum, executionAuthority: 'merge' }), false);
  assert.equal(validateSchema(receiptSchema, { ...artifacts.anchorReceipt, finalityClaim: 'confirmed' }), false);
  assert.equal(validateSchema(receiptSchema, { ...artifacts.anchorReceipt, extra: true }), false);
});

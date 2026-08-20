import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { createCryptoPolicyProfile } from '../../src/mesh/crypto-profile.js';
import { createVerificationAttestation } from '../../src/mesh/attestation.js';
import { aggregateVerificationMesh, createVerificationMeshPolicy } from '../../src/mesh/verification-mesh.js';
import { createAnchorReceipt, createAnchorRequest } from '../../src/mesh/anchor-envelope.js';
import { createProofStatement } from '../../src/mesh/proof-statement.js';
import {
  appendKeyRegistration,
  appendKeyRotation,
  createVerificationKeyRegistry,
  deriveVerificationKeyFingerprint,
} from '../../src/mesh/key-registry.js';
import { TEST_PRIVATE_KEYS, TEST_PUBLIC_KEYS } from '../fixtures/mesh-test-ed25519-key.js';
import { validateSchema } from './helpers/json-schema-validator.js';

const schemaNames = [
  'crypto-policy-profile-v1',
  'verification-attestation-v1',
  'verification-mesh-policy-v1',
  'verification-mesh-v1',
  'external-anchor-request-v1',
  'external-anchor-receipt-v1',
  'proof-statement-v1',
  'verification-key-registry-v1',
];

async function load(name) {
  return JSON.parse(await readFile(new URL(`../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
}

function artifacts() {
  const profile = createCryptoPolicyProfile({
    profileName: 'classical-ed25519-v1',
    hashAlgorithm: 'sha256',
    signatureAlgorithm: 'ed25519',
    publicKeyEncoding: 'spki-der-base64url',
    signatureEncoding: 'base64url',
    postQuantumMode: 'not-implemented',
    hybridSignatureRequired: false,
  });
  const attestation = createVerificationAttestation({
    artifactType: 'run-export',
    artifactId: 'run-bellwether-baseline',
    artifactHash: 'a'.repeat(64),
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    verificationMethod: 'trust-kernel-replay',
    verificationVersion: '1.0.0',
    verifiedAtLogical: 15,
    runtime: 'node-test',
    evidenceHash: 'b'.repeat(64),
    result: 'pass',
    failureCodes: [],
  }, TEST_PRIVATE_KEYS.alpha, profile);
  const policy = createVerificationMeshPolicy({
    networkId: 'ripple-mesh-schema-v1',
    artifactType: 'run-export',
    artifactHash: 'a'.repeat(64),
    cryptoProfileId: profile.profileId,
    minimumPassingAttestations: 1,
    minimumDistinctOperators: 1,
    allowedVerifierNodeIds: ['node-alpha'],
    allowedOperatorIds: ['operator-alpha'],
    requireDistinctKeyFingerprints: true,
  });
  const mesh = aggregateVerificationMesh(policy, [attestation], profile);
  const anchorRequest = createAnchorRequest({
    artifactType: 'verification-mesh',
    artifactHash: mesh.meshHash,
    cryptoProfileId: profile.profileId,
    externalNetworkId: 'external-test-placeholder',
    requestedAtLogical: 20,
    metadataHash: 'c'.repeat(64),
  });
  const anchorReceipt = createAnchorReceipt(anchorRequest, {
    providerId: 'provider-placeholder',
    externalRecordId: 'record-placeholder',
    providerEvidenceHash: 'd'.repeat(64),
    anchoredAtLogical: 21,
    confirmationCount: 0,
    externalPublicationPerformed: false,
  });
  const proofStatement = createProofStatement({
    statementType: 'receipt-chain-validity',
    artifactType: 'run-export',
    artifactHash: 'a'.repeat(64),
    cryptoProfileId: profile.profileId,
    statementVersion: '1.0.0',
    publicInputs: { receiptCount: 3, terminalReceiptHash: 'e'.repeat(64) },
    privateWitnessCommitmentHash: 'f'.repeat(64),
  });
  let registry = createVerificationKeyRegistry({
    networkId: 'ripple-key-registry-schema-v1',
    cryptoProfileId: profile.profileId,
    registryVersion: '1.0.0',
  });
  registry = appendKeyRegistration(registry, {
    logicalTime: 10,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKey: TEST_PUBLIC_KEYS.alpha,
    reasonCode: 'KEY_INITIAL_REGISTRATION',
  });
  registry = appendKeyRotation(registry, {
    logicalTime: 20,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    predecessorKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha),
    publicKey: TEST_PUBLIC_KEYS.beta,
    reasonCode: 'KEY_SCHEDULED_ROTATION',
  });
  return { profile, attestation, policy, mesh, anchorRequest, anchorReceipt, proofStatement, registry };
}

test('all mesh and key-lifecycle schemas are strict JSON Schema 2020-12 documents', async () => {
  for (const name of schemaNames) {
    const schema = await load(name);
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
  }
});

test('valid mesh and key-registry artifacts satisfy their complete portable schemas', async () => {
  const values = artifacts();
  const mapping = {
    'crypto-policy-profile-v1': values.profile,
    'verification-attestation-v1': values.attestation,
    'verification-mesh-policy-v1': values.policy,
    'verification-mesh-v1': values.mesh,
    'external-anchor-request-v1': values.anchorRequest,
    'external-anchor-receipt-v1': values.anchorReceipt,
    'proof-statement-v1': values.proofStatement,
    'verification-key-registry-v1': values.registry,
  };
  for (const [name, value] of Object.entries(mapping)) assert.equal(validateSchema(await load(name), value), true, name);
});

test('portable schemas reject overclaims, contradictory local states, and malformed nested records', async () => {
  const values = artifacts();

  const profileSchema = await load('crypto-policy-profile-v1');
  assert.equal(validateSchema(profileSchema, { ...values.profile, quantumResistanceClaimed: true }), false);
  assert.equal(validateSchema(profileSchema, { ...values.profile, extra: true }), false);

  const attestationSchema = await load('verification-attestation-v1');
  assert.equal(validateSchema(attestationSchema, { ...values.attestation, failureCodes: ['E_FORGED'] }), false, 'pass with failures');
  assert.equal(validateSchema(attestationSchema, { ...values.attestation, independenceStatus: 'verified' }), false, 'independence overclaim');
  assert.equal(validateSchema(attestationSchema, { ...values.attestation, publicKeyFingerprint: 'bad' }), false, 'fingerprint');

  const policySchema = await load('verification-mesh-policy-v1');
  assert.equal(validateSchema(policySchema, { ...values.policy, minimumPassingAttestations: 0 }), false);

  const meshSchema = await load('verification-mesh-v1');
  assert.equal(validateSchema(meshSchema, { ...values.mesh, independenceVerified: true }), false);
  assert.equal(validateSchema(meshSchema, { ...values.mesh, approvalAuthority: 'approve' }), false);
  const malformedNestedAttestation = structuredClone(values.mesh);
  malformedNestedAttestation.attestations[0].attestationId = 'bad';
  assert.equal(validateSchema(meshSchema, malformedNestedAttestation), false);

  const requestSchema = await load('external-anchor-request-v1');
  assert.equal(validateSchema(requestSchema, { ...values.anchorRequest, externalPublicationPerformed: true }), false);

  const receiptSchema = await load('external-anchor-receipt-v1');
  assert.equal(validateSchema(receiptSchema, { ...values.anchorReceipt, confirmationCount: 1 }), false, 'confirmations without publication');
  assert.equal(validateSchema(receiptSchema, { ...values.anchorReceipt, externalVerificationStatus: 'verified' }), false);

  const proofSchema = await load('proof-statement-v1');
  assert.equal(validateSchema(proofSchema, { ...values.proofStatement, proofGenerated: true }), false);
  assert.equal(validateSchema(proofSchema, { ...values.proofStatement, proofSystem: 'groth16' }), false);

  const registrySchema = await load('verification-key-registry-v1');
  assert.equal(validateSchema(registrySchema, { ...values.registry, identityVerified: true }), false);
  const badEventHash = structuredClone(values.registry);
  badEventHash.events[0].eventHash = 'bad';
  assert.equal(validateSchema(registrySchema, badEventHash), false);
  const badRotationPredecessor = structuredClone(values.registry);
  badRotationPredecessor.events[1].predecessorKeyFingerprint = null;
  assert.equal(validateSchema(registrySchema, badRotationPredecessor), false);
});

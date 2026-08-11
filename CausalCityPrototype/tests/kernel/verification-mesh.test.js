import test from 'node:test';
import assert from 'node:assert/strict';

import { createCryptoPolicyProfile } from '../../src/mesh/crypto-profile.js';
import { createVerificationAttestation } from '../../src/mesh/attestation.js';
import {
  aggregateVerificationMesh,
  createVerificationMeshPolicy,
  verifyVerificationMesh,
} from '../../src/mesh/verification-mesh.js';
import { TEST_PRIVATE_KEYS } from '../fixtures/mesh-test-ed25519-key.js';

const profile = createCryptoPolicyProfile({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

const ARTIFACT_HASH = 'a'.repeat(64);

function input(node, operator, logical, result = 'pass') {
  return {
    artifactType: 'run-export',
    artifactId: 'run-bellwether-baseline',
    artifactHash: ARTIFACT_HASH,
    verifierNodeId: `node-${node}`,
    operatorId: `operator-${operator}`,
    verificationMethod: 'trust-kernel-replay',
    verificationVersion: '1.0.0',
    verifiedAtLogical: logical,
    runtime: 'node-test',
    evidenceHash: String(logical % 10).repeat(64),
    result,
    failureCodes: result === 'pass' ? [] : ['E_VERIFICATION_FAILED'],
  };
}

function policy(overrides = {}) {
  return createVerificationMeshPolicy({
    networkId: 'ripple-mesh-test-v1',
    artifactType: 'run-export',
    artifactHash: ARTIFACT_HASH,
    cryptoProfileId: profile.profileId,
    minimumPassingAttestations: 2,
    minimumDistinctOperators: 2,
    allowedVerifierNodeIds: ['node-alpha', 'node-beta', 'node-gamma'],
    allowedOperatorIds: ['operator-alpha', 'operator-beta', 'operator-gamma'],
    requireDistinctKeyFingerprints: true,
    ...overrides,
  });
}

test('verification mesh aggregates valid attestations deterministically and meets declared quorum', () => {
  const alpha = createVerificationAttestation(input('alpha', 'alpha', 1), TEST_PRIVATE_KEYS.alpha, profile);
  const beta = createVerificationAttestation(input('beta', 'beta', 2), TEST_PRIVATE_KEYS.beta, profile);
  const gamma = createVerificationAttestation(input('gamma', 'gamma', 3, 'fail'), TEST_PRIVATE_KEYS.gamma, profile);

  const first = aggregateVerificationMesh(policy(), [gamma, beta, alpha], profile);
  const second = aggregateVerificationMesh(policy(), [alpha, gamma, beta], profile);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.equal(first.status, 'quorum-met');
  assert.equal(first.passingAttestationCount, 2);
  assert.equal(first.failingAttestationCount, 1);
  assert.equal(first.distinctPassingOperatorCount, 2);
  assert.deepEqual(first.attestations.map((item) => item.verifierNodeId), ['node-alpha', 'node-beta', 'node-gamma']);
  assert.equal(first.independenceBasis, 'declared-operator-identity');
  assert.equal(first.independenceVerified, false);
  assert.equal(first.approvalAuthority, 'none');
  assert.match(first.meshHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(verifyVerificationMesh(first, profile), { ok: true, firstMismatch: null, status: 'quorum-met', meshHash: first.meshHash });
});

test('failed attestations remain evidence but do not count toward quorum', () => {
  const alpha = createVerificationAttestation(input('alpha', 'alpha', 1), TEST_PRIVATE_KEYS.alpha, profile);
  const beta = createVerificationAttestation(input('beta', 'beta', 2, 'fail'), TEST_PRIVATE_KEYS.beta, profile);
  const mesh = aggregateVerificationMesh(policy(), [alpha, beta], profile);
  assert.equal(mesh.status, 'quorum-not-met');
  assert.equal(mesh.passingAttestationCount, 1);
  assert.equal(mesh.failingAttestationCount, 1);
});

test('mesh rejects duplicate node, attestation, key fingerprint, and wrong artifact/profile bindings', () => {
  const alpha = createVerificationAttestation(input('alpha', 'alpha', 1), TEST_PRIVATE_KEYS.alpha, profile);
  const alphaSameKeyOtherNode = createVerificationAttestation(input('beta', 'beta', 2), TEST_PRIVATE_KEYS.alpha, profile);
  const beta = createVerificationAttestation(input('beta', 'beta', 2), TEST_PRIVATE_KEYS.beta, profile);

  assert.throws(() => aggregateVerificationMesh(policy(), [alpha, alpha], profile), { code: 'E_MESH_ATTESTATION' });
  assert.throws(() => aggregateVerificationMesh(policy(), [alpha, alphaSameKeyOtherNode], profile), { code: 'E_MESH_ATTESTATION' });

  const sameNodeDifferentStatement = createVerificationAttestation({ ...input('alpha', 'beta', 3), evidenceHash: '9'.repeat(64) }, TEST_PRIVATE_KEYS.beta, profile);
  assert.throws(() => aggregateVerificationMesh(policy(), [alpha, sameNodeDifferentStatement], profile), { code: 'E_MESH_ATTESTATION' });

  const wrongArtifact = createVerificationAttestation({ ...input('gamma', 'gamma', 3), artifactHash: 'f'.repeat(64) }, TEST_PRIVATE_KEYS.gamma, profile);
  assert.throws(() => aggregateVerificationMesh(policy(), [alpha, wrongArtifact], profile), { code: 'E_MESH_ATTESTATION' });

  const stalePolicy = { ...policy(), cryptoProfileId: `crypto-profile-${'0'.repeat(64)}` };
  assert.throws(() => aggregateVerificationMesh(stalePolicy, [alpha, beta], profile), { code: 'E_MESH_POLICY_SCHEMA' });
});

test('declared operator distinctness is a threshold and never a claim of proven independence', () => {
  const alpha = createVerificationAttestation(input('alpha', 'alpha', 1), TEST_PRIVATE_KEYS.alpha, profile);
  const betaSameOperator = createVerificationAttestation(input('beta', 'alpha', 2), TEST_PRIVATE_KEYS.beta, profile);
  const mesh = aggregateVerificationMesh(policy(), [alpha, betaSameOperator], profile);
  assert.equal(mesh.passingAttestationCount, 2);
  assert.equal(mesh.distinctPassingOperatorCount, 1);
  assert.equal(mesh.status, 'quorum-not-met');
  assert.equal(mesh.independenceVerified, false);
});

test('mesh verification rejects validly re-hashed stale nested attestation IDs', () => {
  const alpha = createVerificationAttestation(input('alpha', 'alpha', 1), TEST_PRIVATE_KEYS.alpha, profile);
  const beta = createVerificationAttestation(input('beta', 'beta', 2), TEST_PRIVATE_KEYS.beta, profile);
  const mesh = aggregateVerificationMesh(policy(), [alpha, beta], profile);
  const stale = structuredClone(mesh);
  stale.attestations[0].attestationId = `attestation-${'0'.repeat(64)}`;
  assert.equal(verifyVerificationMesh(stale, profile).ok, false);
});

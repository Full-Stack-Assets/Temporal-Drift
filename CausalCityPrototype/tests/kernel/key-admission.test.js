import test from 'node:test';
import assert from 'node:assert/strict';

import { createCryptoPolicyProfile } from '../../src/mesh/crypto-profile.js';
import { createVerificationAttestation } from '../../src/mesh/attestation.js';
import { createVerificationMeshPolicy } from '../../src/mesh/verification-mesh.js';
import {
  aggregateVerificationMeshWithRegistry,
  evaluateAttestationKeyAdmission,
  verifyRegistryAwareMeshAdmission,
} from '../../src/mesh/key-admission.js';
import {
  appendKeyRegistration,
  appendKeyRevocation,
  appendKeyRotation,
  createVerificationKeyRegistry,
  deriveVerificationKeyFingerprint,
} from '../../src/mesh/key-registry.js';
import { TEST_PRIVATE_KEYS, TEST_PUBLIC_KEYS } from '../fixtures/mesh-test-ed25519-key.js';

const profile = createCryptoPolicyProfile({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

function lifecycle() {
  let registry = createVerificationKeyRegistry({
    networkId: 'ripple-key-admission-test-v1',
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
  return appendKeyRevocation(registry, {
    logicalTime: 30,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta),
    reasonCode: 'KEY_REVOKED_BY_POLICY',
  });
}

function attestation(privateKey, logicalTime, evidenceDigit = '1') {
  return createVerificationAttestation({
    artifactType: 'run-export',
    artifactId: 'run-bellwether-baseline',
    artifactHash: 'a'.repeat(64),
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    verificationMethod: 'trust-kernel-replay',
    verificationVersion: '1.0.0',
    verifiedAtLogical: logicalTime,
    runtime: 'node-test',
    evidenceHash: evidenceDigit.repeat(64),
    result: 'pass',
    failureCodes: [],
  }, privateKey, profile);
}

function oneNodePolicy() {
  return createVerificationMeshPolicy({
    networkId: 'ripple-registry-aware-mesh-v1',
    artifactType: 'run-export',
    artifactHash: 'a'.repeat(64),
    cryptoProfileId: profile.profileId,
    minimumPassingAttestations: 1,
    minimumDistinctOperators: 1,
    allowedVerifierNodeIds: ['node-alpha'],
    allowedOperatorIds: ['operator-alpha'],
    requireDistinctKeyFingerprints: true,
  });
}

test('registry-aware admission follows historical key intervals while preserving valid signatures', () => {
  const registry = lifecycle();
  const alpha15 = evaluateAttestationKeyAdmission(registry, attestation(TEST_PRIVATE_KEYS.alpha, 15, '1'), profile);
  const alpha20 = evaluateAttestationKeyAdmission(registry, attestation(TEST_PRIVATE_KEYS.alpha, 20, '2'), profile);
  const beta20 = evaluateAttestationKeyAdmission(registry, attestation(TEST_PRIVATE_KEYS.beta, 20, '3'), profile);
  const beta25 = evaluateAttestationKeyAdmission(registry, attestation(TEST_PRIVATE_KEYS.beta, 25, '4'), profile);
  const beta30 = evaluateAttestationKeyAdmission(registry, attestation(TEST_PRIVATE_KEYS.beta, 30, '5'), profile);

  assert.equal(alpha15.cryptographicSignatureValid, true);
  assert.equal(alpha15.registryStatus, 'active');
  assert.equal(alpha15.admitted, true);
  assert.equal(alpha15.identityVerified, false);
  assert.equal(alpha15.approvalAuthority, 'none');
  assert.match(alpha15.admissionHash, /^[a-f0-9]{64}$/);

  assert.equal(alpha20.cryptographicSignatureValid, true);
  assert.equal(alpha20.registryStatus, 'superseded');
  assert.equal(alpha20.admitted, false);

  assert.equal(beta20.registryStatus, 'active');
  assert.equal(beta20.admitted, true);
  assert.equal(beta25.admitted, true);
  assert.equal(beta30.registryStatus, 'revoked');
  assert.equal(beta30.admitted, false);
});

test('cryptographically invalid attestations are rejected before registry admission', () => {
  const registry = lifecycle();
  const signed = attestation(TEST_PRIVATE_KEYS.alpha, 15);
  const tampered = { ...signed, signature: `${signed.signature.slice(0, -1)}${signed.signature.endsWith('A') ? 'B' : 'A'}` };
  const admission = evaluateAttestationKeyAdmission(registry, tampered, profile);
  assert.equal(admission.admitted, false);
  assert.equal(admission.cryptographicSignatureValid, false);
  assert.equal(admission.registryStatus, 'signature-invalid');
});

test('registry-aware quorum retains rejected evidence and passes only historically admitted attestations', () => {
  const registry = lifecycle();
  const alpha15 = attestation(TEST_PRIVATE_KEYS.alpha, 15, '1');
  const alpha20 = attestation(TEST_PRIVATE_KEYS.alpha, 20, '2');
  const policy = oneNodePolicy();

  const bundle = aggregateVerificationMeshWithRegistry(policy, [alpha20, alpha15], profile, registry);
  assert.ok(Object.isFrozen(bundle));
  assert.equal(bundle.status, 'quorum-met');
  assert.equal(bundle.admittedCount, 1);
  assert.equal(bundle.rejectedCount, 1);
  assert.equal(bundle.admissions.length, 2);
  assert.equal(bundle.mesh.passingAttestationCount, 1);
  assert.deepEqual(bundle.admittedAttestationIds, [alpha15.attestationId]);
  assert.deepEqual(bundle.rejectedAttestationIds, [alpha20.attestationId]);
  assert.equal(bundle.identityVerified, false);
  assert.equal(bundle.approvalAuthority, 'none');
  assert.deepEqual(verifyRegistryAwareMeshAdmission(bundle, policy, [alpha20, alpha15], profile, registry), {
    ok: true,
    firstMismatch: null,
    status: 'quorum-met',
    bundleHash: bundle.bundleHash,
  });
});

test('registry-aware quorum remains quorum-not-met when no attestation is admitted', () => {
  const registry = lifecycle();
  const alpha20 = attestation(TEST_PRIVATE_KEYS.alpha, 20, '2');
  const bundle = aggregateVerificationMeshWithRegistry(oneNodePolicy(), [alpha20], profile, registry);
  assert.equal(bundle.status, 'quorum-not-met');
  assert.equal(bundle.mesh, null);
  assert.equal(bundle.admittedCount, 0);
  assert.equal(bundle.rejectedCount, 1);
});

test('registry-aware verification rejects stale nested admission and bundle identities', () => {
  const registry = lifecycle();
  const alpha15 = attestation(TEST_PRIVATE_KEYS.alpha, 15, '1');
  const policy = oneNodePolicy();
  const bundle = aggregateVerificationMeshWithRegistry(policy, [alpha15], profile, registry);

  const staleAdmission = structuredClone(bundle);
  staleAdmission.admissions[0].admissionHash = '0'.repeat(64);
  assert.equal(verifyRegistryAwareMeshAdmission(staleAdmission, policy, [alpha15], profile, registry).ok, false);

  const staleBundle = { ...bundle, bundleHash: '1'.repeat(64) };
  assert.equal(verifyRegistryAwareMeshAdmission(staleBundle, policy, [alpha15], profile, registry).ok, false);
});

test('registry-aware bundle rejects out-of-policy node and operator evidence even when registry admission would reject it', () => {
  const registry = lifecycle();
  const foreign = createVerificationAttestation({
    artifactType: 'run-export',
    artifactId: 'run-bellwether-baseline',
    artifactHash: 'a'.repeat(64),
    verifierNodeId: 'node-gamma',
    operatorId: 'operator-gamma',
    verificationMethod: 'trust-kernel-replay',
    verificationVersion: '1.0.0',
    verifiedAtLogical: 15,
    runtime: 'node-test',
    evidenceHash: '9'.repeat(64),
    result: 'pass',
    failureCodes: [],
  }, TEST_PRIVATE_KEYS.gamma, profile);

  assert.throws(
    () => aggregateVerificationMeshWithRegistry(oneNodePolicy(), [foreign], profile, registry),
    { code: 'E_KEY_ADMISSION' },
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { createCryptoPolicyProfile } from '../../src/mesh/crypto-profile.js';
import {
  createVerificationAttestation,
  verifyVerificationAttestation,
} from '../../src/mesh/attestation.js';
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

const passInput = () => ({
  artifactType: 'run-export',
  artifactId: 'run-bellwether-baseline',
  artifactHash: 'a'.repeat(64),
  verifierNodeId: 'node-alpha',
  operatorId: 'operator-alpha',
  verificationMethod: 'trust-kernel-replay',
  verificationVersion: '1.0.0',
  verifiedAtLogical: 100,
  runtime: 'node-22.23.1',
  evidenceHash: 'b'.repeat(64),
  result: 'pass',
  failureCodes: [],
});

test('fixed key and statement produce deterministic signed verification attestations', () => {
  const first = createVerificationAttestation(passInput(), TEST_PRIVATE_KEYS.alpha, profile);
  const second = createVerificationAttestation(passInput(), TEST_PRIVATE_KEYS.alpha, profile);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.match(first.attestationId, /^attestation-[a-f0-9]{64}$/);
  assert.match(first.statementHash, /^[a-f0-9]{64}$/);
  assert.match(first.publicKeyFingerprint, /^[a-f0-9]{64}$/);
  assert.match(first.publicKey, /^[A-Za-z0-9_-]+$/);
  assert.match(first.signature, /^[A-Za-z0-9_-]+$/);
  assert.equal(first.independenceStatus, 'declared-not-proven');
  assert.equal(first.executionAuthority, 'none');
  assert.deepEqual(verifyVerificationAttestation(first, profile), {
    ok: true,
    firstMismatch: null,
    attestationId: first.attestationId,
    result: 'pass',
  });
});

test('attestation verification rejects content, signature, key, artifact, and profile substitution', () => {
  const signed = createVerificationAttestation(passInput(), TEST_PRIVATE_KEYS.alpha, profile);
  for (const tampered of [
    { ...signed, artifactHash: 'c'.repeat(64) },
    { ...signed, signature: `${signed.signature.slice(0, -1)}${signed.signature.endsWith('A') ? 'B' : 'A'}` },
    { ...signed, publicKeyFingerprint: 'd'.repeat(64) },
    { ...signed, attestationId: `attestation-${'e'.repeat(64)}` },
  ]) assert.equal(verifyVerificationAttestation(tampered, profile).ok, false);

  const otherProfile = createCryptoPolicyProfile({
    profileName: 'classical-ed25519-v1-other',
    hashAlgorithm: 'sha256',
    signatureAlgorithm: 'ed25519',
    publicKeyEncoding: 'spki-der-base64url',
    signatureEncoding: 'base64url',
    postQuantumMode: 'not-implemented',
    hybridSignatureRequired: false,
  });
  assert.equal(verifyVerificationAttestation(signed, otherProfile).ok, false);
});

test('failed attestations require stable failure codes and pass attestations prohibit them', () => {
  assert.throws(() => createVerificationAttestation({ ...passInput(), result: 'fail', failureCodes: [] }, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });
  assert.throws(() => createVerificationAttestation({ ...passInput(), failureCodes: ['E_SHOULD_NOT_EXIST'] }, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });

  const failed = createVerificationAttestation({
    ...passInput(),
    result: 'fail',
    failureCodes: ['E_ZETA', 'E_ALPHA'],
  }, TEST_PRIVATE_KEYS.alpha, profile);
  assert.deepEqual(failed.failureCodes, ['E_ALPHA', 'E_ZETA']);
  assert.equal(verifyVerificationAttestation(failed, profile).ok, true);
});

test('attestation input fails closed on unknown, hidden, symbol, accessor, and unsafe fields', () => {
  const unknown = { ...passInput(), extra: true };
  assert.throws(() => createVerificationAttestation(unknown, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });

  const hidden = passInput();
  Object.defineProperty(hidden, 'hidden', { value: true, enumerable: false });
  assert.throws(() => createVerificationAttestation(hidden, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });

  const symbolic = passInput();
  symbolic[Symbol('x')] = true;
  assert.throws(() => createVerificationAttestation(symbolic, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });

  const accessor = passInput();
  Object.defineProperty(accessor, 'runtime', { get: () => 'forged', enumerable: true });
  assert.throws(() => createVerificationAttestation(accessor, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });

  assert.throws(() => createVerificationAttestation({ ...passInput(), verifiedAtLogical: -1 }, TEST_PRIVATE_KEYS.alpha, profile), { code: 'E_ATTESTATION_SCHEMA' });
});

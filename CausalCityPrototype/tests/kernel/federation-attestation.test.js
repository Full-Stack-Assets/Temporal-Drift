import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';
import {
  createVerificationAttestation,
  verifyVerificationAttestation,
} from '../../src/federation/attestation.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B] = fixture.keys;

function makeProfile() {
  return createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
}

function makeRegistry(profile) {
  return createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [
      {
        verifierId: KEY_A.verifierId,
        keyId: KEY_A.keyId,
        algorithm: 'ed25519',
        publicKeySpkiBase64: KEY_A.publicKeySpkiBase64,
        weight: 1,
        validFromLogicalTime: 5,
        validUntilLogicalTime: 20,
        role: KEY_A.role,
      },
      {
        verifierId: KEY_B.verifierId,
        keyId: KEY_B.keyId,
        algorithm: 'ed25519',
        publicKeySpkiBase64: KEY_B.publicKeySpkiBase64,
        weight: 1,
        validFromLogicalTime: 1,
        validUntilLogicalTime: null,
        role: KEY_B.role,
      },
    ],
  }, profile);
}

function makeUnsigned(registry, overrides = {}) {
  return {
    attestationVersion: 'verification-attestation-v1',
    registryHash: registry.registryHash,
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime: 10,
    subjectType: 'frontier-foundations',
    subjectId: 'frontier-foundations-v1',
    subjectHash: 'd'.repeat(64),
    verificationProcedureId: 'npm-run-verify-v1',
    verificationProcedureHash: 'a'.repeat(64),
    verdict: 'pass',
    findingsHash: null,
    limitationsHash: 'b'.repeat(64),
    ...overrides,
  };
}

test('Ed25519 attestation is deterministic, immutable, and verifies against the registry key', () => {
  const profile = makeProfile();
  const registry = makeRegistry(profile);
  const unsigned = makeUnsigned(registry);

  const first = createVerificationAttestation(unsigned, KEY_A.privateKeyPem, registry, profile);
  const second = createVerificationAttestation(unsigned, KEY_A.privateKeyPem, registry, profile);

  assert.equal(first.algorithm, 'ed25519');
  assert.equal(first.signatureBase64, second.signatureBase64);
  assert.equal(first.attestationHash, second.attestationHash);
  assert.match(first.signatureBase64, /^[A-Za-z0-9+/]+={0,2}$/u);
  assert.match(first.attestationHash, /^[a-f0-9]{64}$/u);
  assert.equal(Object.isFrozen(first), true);

  const report = verifyVerificationAttestation(first, registry, profile);
  assert.deepEqual(report, {
    ok: true,
    attestationHash: first.attestationHash,
    verifierId: KEY_A.verifierId,
    verdict: 'pass',
    subjectHash: unsigned.subjectHash,
  });

  unsigned.verdict = 'fail';
  assert.equal(first.verdict, 'pass');
});

test('attestation verification rejects independently tampered signed fields and signature bytes', () => {
  const profile = makeProfile();
  const registry = makeRegistry(profile);
  const attestation = createVerificationAttestation(makeUnsigned(registry), KEY_A.privateKeyPem, registry, profile);

  const mutations = [
    { subjectHash: 'e'.repeat(64) },
    { verificationProcedureHash: 'c'.repeat(64) },
    { verdict: 'fail' },
    { verifierId: KEY_B.verifierId },
    { keyId: KEY_B.keyId },
    { signatureBase64: `${attestation.signatureBase64.slice(0, -4)}AAAA` },
  ];

  for (const mutation of mutations) {
    assert.throws(
      () => verifyVerificationAttestation({ ...attestation, ...mutation }, registry, profile),
      (error) => ['E_ATTESTATION_SCHEMA', 'E_ATTESTATION_SIGNATURE'].includes(error?.code),
    );
  }
});

test('attestation creation rejects a private key that does not match the registry key', () => {
  const profile = makeProfile();
  const registry = makeRegistry(profile);

  assert.throws(
    () => createVerificationAttestation(makeUnsigned(registry), KEY_B.privateKeyPem, registry, profile),
    (error) => error?.code === 'E_ATTESTATION_SIGNATURE',
  );
});

test('attestations enforce verifier logical validity windows', () => {
  const profile = makeProfile();
  const registry = makeRegistry(profile);

  for (const logicalTime of [4, 21]) {
    assert.throws(
      () => createVerificationAttestation(makeUnsigned(registry, { logicalTime }), KEY_A.privateKeyPem, registry, profile),
      (error) => error?.code === 'E_ATTESTATION_SCHEMA',
    );
  }

  const atStart = createVerificationAttestation(makeUnsigned(registry, { logicalTime: 5 }), KEY_A.privateKeyPem, registry, profile);
  const atEnd = createVerificationAttestation(makeUnsigned(registry, { logicalTime: 20 }), KEY_A.privateKeyPem, registry, profile);
  assert.equal(verifyVerificationAttestation(atStart, registry, profile).ok, true);
  assert.equal(verifyVerificationAttestation(atEnd, registry, profile).ok, true);
});

test('attestation inputs fail closed for malformed hashes, verdicts, unknown fields, and registry mismatches', () => {
  const profile = makeProfile();
  const registry = makeRegistry(profile);

  const invalidPayloads = [
    makeUnsigned(registry, { subjectHash: 'bad' }),
    makeUnsigned(registry, { findingsHash: 'bad' }),
    makeUnsigned(registry, { verdict: 'maybe' }),
    makeUnsigned(registry, { logicalTime: -1 }),
    makeUnsigned(registry, { registryHash: 'f'.repeat(64) }),
    { ...makeUnsigned(registry), unexpected: true },
  ];

  for (const payload of invalidPayloads) {
    assert.throws(
      () => createVerificationAttestation(payload, KEY_A.privateKeyPem, registry, profile),
      (error) => ['E_ATTESTATION_SCHEMA', 'E_UNSAFE_VALUE'].includes(error?.code),
    );
  }
});

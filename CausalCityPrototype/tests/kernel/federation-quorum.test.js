import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';
import { createVerificationAttestation } from '../../src/federation/attestation.js';
import { appendVerifierRevocation, createRevocationLedger } from '../../src/federation/revocation.js';
import { createQuorumPolicy, evaluateVerificationQuorum } from '../../src/federation/quorum.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B, KEY_C] = fixture.keys;

const SUBJECT = {
  subjectType: 'frontier-foundations',
  subjectId: 'frontier-foundations-v1',
  subjectHash: 'd'.repeat(64),
};

function setup() {
  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
  const registry = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [
      { key: KEY_A, weight: 1 },
      { key: KEY_B, weight: 1 },
      { key: KEY_C, weight: 2 },
    ].map(({ key, weight }) => ({
      verifierId: key.verifierId,
      keyId: key.keyId,
      algorithm: 'ed25519',
      publicKeySpkiBase64: key.publicKeySpkiBase64,
      weight,
      validFromLogicalTime: 1,
      validUntilLogicalTime: null,
      role: key.role,
    })),
  }, profile);
  const policy = createQuorumPolicy({
    policyVersion: 'quorum-policy-v1',
    minimumDistinctVerifiers: 2,
    minimumPassWeight: 2,
    maximumFailWeight: 0,
    allowAbstain: true,
    requiredRoles: ['security-review', 'reproducibility-review'],
  });
  return { profile, registry, policy };
}

function signFor(key, verdict, registry, profile, logicalTime = 10, overrides = {}) {
  return createVerificationAttestation({
    attestationVersion: 'verification-attestation-v1',
    registryHash: registry.registryHash,
    verifierId: key.verifierId,
    keyId: key.keyId,
    logicalTime,
    ...SUBJECT,
    verificationProcedureId: 'npm-run-verify-v1',
    verificationProcedureHash: 'a'.repeat(64),
    verdict,
    findingsHash: verdict === 'fail' ? 'f'.repeat(64) : null,
    limitationsHash: 'b'.repeat(64),
    ...overrides,
  }, key.privateKeyPem, registry, profile);
}

test('quorum policy is immutable and content-addressed', () => {
  const { policy } = setup();
  assert.equal(policy.policyVersion, 'quorum-policy-v1');
  assert.equal(policy.minimumDistinctVerifiers, 2);
  assert.equal(policy.minimumPassWeight, 2);
  assert.equal(policy.maximumFailWeight, 0);
  assert.deepEqual(policy.requiredRoles, ['reproducibility-review', 'security-review']);
  assert.match(policy.policyHash, /^[a-f0-9]{64}$/u);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(Object.isFrozen(policy.requiredRoles), true);
});

test('two distinct required-role pass attestations produce an order-independent quorum pass', () => {
  const { profile, registry, policy } = setup();
  const a = signFor(KEY_A, 'pass', registry, profile);
  const b = signFor(KEY_B, 'pass', registry, profile);
  const revocations = createRevocationLedger(registry.registryHash);

  const left = evaluateVerificationQuorum({
    attestations: [b, a], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  const right = evaluateVerificationQuorum({
    attestations: [a, b], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });

  assert.equal(left.disposition, 'quorum-pass');
  assert.equal(left.distinctVerifierCount, 2);
  assert.equal(left.passWeight, 2);
  assert.equal(left.failWeight, 0);
  assert.equal(left.abstainWeight, 0);
  assert.equal(left.requiredRolesSatisfied, true);
  assert.equal(left.executionAuthority, 'none');
  assert.equal(left.quorumHash, right.quorumHash);
  assert.equal(canonicalString(left), canonicalString(right));
});

test('duplicate verifier evidence counts once and cannot increase quorum weight', () => {
  const { profile, registry, policy } = setup();
  const a = signFor(KEY_A, 'pass', registry, profile);
  const revocations = createRevocationLedger(registry.registryHash);

  const result = evaluateVerificationQuorum({
    attestations: [a, a, a], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });

  assert.equal(result.disposition, 'insufficient-quorum');
  assert.equal(result.distinctVerifierCount, 1);
  assert.equal(result.passWeight, 1);
  assert.deepEqual(result.passVerifierIds, [KEY_A.verifierId]);
  assert.deepEqual(result.contributingAttestationHashes, [a.attestationHash]);
});

test('valid pass/fail disagreement remains explicit conflict and all-fail evidence is quorum-fail', () => {
  const { profile, registry, policy } = setup();
  const revocations = createRevocationLedger(registry.registryHash);
  const pass = signFor(KEY_A, 'pass', registry, profile);
  const fail = signFor(KEY_B, 'fail', registry, profile);

  const conflict = evaluateVerificationQuorum({
    attestations: [fail, pass], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  assert.equal(conflict.disposition, 'conflicted');
  assert.equal(conflict.passWeight, 1);
  assert.equal(conflict.failWeight, 1);
  assert.deepEqual(conflict.passVerifierIds, [KEY_A.verifierId]);
  assert.deepEqual(conflict.failVerifierIds, [KEY_B.verifierId]);

  const allFail = evaluateVerificationQuorum({
    attestations: [
      signFor(KEY_A, 'fail', registry, profile),
      signFor(KEY_B, 'fail', registry, profile),
    ],
    registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  assert.equal(allFail.disposition, 'quorum-fail');
  assert.equal(allFail.passWeight, 0);
  assert.equal(allFail.failWeight, 2);
});

test('abstentions are preserved and do not satisfy required pass roles', () => {
  const { profile, registry, policy } = setup();
  const revocations = createRevocationLedger(registry.registryHash);
  const a = signFor(KEY_A, 'pass', registry, profile);
  const b = signFor(KEY_B, 'abstain', registry, profile);
  const c = signFor(KEY_C, 'pass', registry, profile);

  const result = evaluateVerificationQuorum({
    attestations: [a, b, c], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  assert.equal(result.disposition, 'insufficient-quorum');
  assert.equal(result.passWeight, 3);
  assert.equal(result.abstainWeight, 1);
  assert.equal(result.requiredRolesSatisfied, false);
  assert.deepEqual(result.abstainVerifierIds, [KEY_B.verifierId]);
});

test('invalid signature, revoked evidence, and subject mismatch produce invalid-evidence without counting weight', () => {
  const { profile, registry, policy } = setup();
  const validA = signFor(KEY_A, 'pass', registry, profile);
  const validB = signFor(KEY_B, 'pass', registry, profile);
  const tampered = { ...validB, signatureBase64: `${validB.signatureBase64.slice(0, -4)}AAAA` };

  let revocations = createRevocationLedger(registry.registryHash);
  const invalidSignature = evaluateVerificationQuorum({
    attestations: [validA, tampered], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  assert.equal(invalidSignature.disposition, 'invalid-evidence');
  assert.equal(invalidSignature.invalidEvidenceCount, 1);
  assert.equal(invalidSignature.passWeight, 0);
  assert.equal(invalidSignature.distinctVerifierCount, 0);

  revocations = appendVerifierRevocation(revocations, {
    verifierId: KEY_B.verifierId,
    keyId: KEY_B.keyId,
    logicalTime: 10,
    reasonCode: 'key-compromise',
    sourceEvidenceHash: 'c'.repeat(64),
  });
  const revoked = evaluateVerificationQuorum({
    attestations: [validA, validB], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  assert.equal(revoked.disposition, 'invalid-evidence');
  assert.equal(revoked.invalidEvidenceCount, 1);

  const mismatch = evaluateVerificationQuorum({
    attestations: [validA, signFor(KEY_B, 'pass', registry, profile, 10, { subjectHash: 'e'.repeat(64) })],
    registry, cryptoProfile: profile, revocations: createRevocationLedger(registry.registryHash), policy, subject: SUBJECT,
  });
  assert.equal(mismatch.disposition, 'invalid-evidence');
  assert.equal(mismatch.invalidEvidenceCount, 1);
});

test('multiple non-identical valid attestations from one verifier preserve conflict and count one identity', () => {
  const { profile, registry, policy } = setup();
  const revocations = createRevocationLedger(registry.registryHash);
  const pass = signFor(KEY_A, 'pass', registry, profile, 10);
  const fail = signFor(KEY_A, 'fail', registry, profile, 11);

  const result = evaluateVerificationQuorum({
    attestations: [fail, pass], registry, cryptoProfile: profile, revocations, policy, subject: SUBJECT,
  });
  assert.equal(result.disposition, 'conflicted');
  assert.equal(result.distinctVerifierCount, 1);
  assert.equal(result.passWeight, 0);
  assert.equal(result.failWeight, 0);
  assert.equal(result.sameVerifierConflictCount, 1);
  assert.deepEqual(result.contributingAttestationHashes, [pass.attestationHash, fail.attestationHash].sort());
});

test('quorum policy and subject validation fail closed for malformed configuration', () => {
  assert.throws(
    () => createQuorumPolicy({
      policyVersion: 'quorum-policy-v1',
      minimumDistinctVerifiers: 0,
      minimumPassWeight: 2,
      maximumFailWeight: 0,
      allowAbstain: true,
      requiredRoles: [],
    }),
    (error) => error?.code === 'E_QUORUM_POLICY',
  );

  const { profile, registry, policy } = setup();
  assert.throws(
    () => evaluateVerificationQuorum({
      attestations: [], registry, cryptoProfile: profile,
      revocations: createRevocationLedger(registry.registryHash), policy,
      subject: { ...SUBJECT, subjectHash: 'bad' },
    }),
    (error) => error?.code === 'E_QUORUM_SUBJECT',
  );
});

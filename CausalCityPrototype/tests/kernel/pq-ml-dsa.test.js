import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalBytes, sha256BytesHex, sha256Hex } from '../../src/kernel/canonicalize.js';
import { createVerificationAttestation } from '../../src/federation/attestation.js';
import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';
import { createPqEvidenceEnvelope } from '../../src/pq/evidence.js';
import { verifyMlDsaEvidence } from '../../src/pq/ml-dsa.js';

const pqFixture = JSON.parse(await readFile(new URL('../fixtures/ml-dsa-65-test-evidence-v1.json', import.meta.url), 'utf8'));
const classicalFixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B, KEY_C] = classicalFixture.keys;
const frontierReportBytes = await readFile(new URL('../../FRONTIER_VERIFICATION_REPORT.md', import.meta.url));

function makeInputs() {
  const subjectHash = sha256BytesHex(frontierReportBytes);
  const verificationProcedureHash = sha256Hex({
    procedureVersion: 'npm-run-verify-procedure-v1',
    command: 'npm run verify',
    runtimeMajors: [22, 24],
    requiredGates: ['runtime', 'syntax', 'randomness', 'legacy-tests', 'kernel-tests', 'acceptance-tests', 'acceptance-summary'],
  });
  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
  const registry = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [KEY_A, KEY_B, KEY_C].map((key) => ({
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
  const unsigned = {
    attestationVersion: 'verification-attestation-v1',
    registryHash: registry.registryHash,
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime: 10,
    subjectType: 'frontier-verification-report',
    subjectId: 'frontier-foundations-v1',
    subjectHash,
    verificationProcedureId: 'npm-run-verify-procedure-v1',
    verificationProcedureHash,
    verdict: 'pass',
    findingsHash: null,
    limitationsHash: sha256Hex({ limitation: 'test-only-cryptographic-identity-not-independent-review' }),
  };
  const classicalAttestation = createVerificationAttestation(unsigned, KEY_A.privateKeyPem, registry, profile);
  const evidence = createPqEvidenceEnvelope({
    algorithm: pqFixture.algorithm,
    subjectAttestationHash: classicalAttestation.attestationHash,
    unsignedPayloadHash: pqFixture.unsignedPayloadHash,
    publicKeySpkiBase64: pqFixture.publicKeySpkiBase64,
    publicKeyHash: pqFixture.publicKeyHash,
    signatureBase64: pqFixture.signatureBase64,
    signatureHash: pqFixture.signatureHash,
    contextBase64: pqFixture.contextBase64,
    sourceRuntimeClass: 'node-24-test-fixture',
  });
  return { unsigned, classicalAttestation, evidence };
}

test('fixed ML-DSA evidence yields an explicit capability-dependent verification disposition', () => {
  const { unsigned, evidence } = makeInputs();
  const result = verifyMlDsaEvidence(evidence, unsigned);
  const major = Number(process.versions.node.split('.')[0]);

  assert.equal(result.algorithm, 'ml-dsa-65');
  assert.equal(result.evidenceHash, evidence.pqEvidenceHash);
  assert.equal(result.executionAuthority, 'none');
  assert.match(result.verificationResultHash, /^[a-f0-9]{64}$/u);

  if (major === 22) {
    assert.equal(result.disposition, 'pq-unavailable');
    assert.equal(result.cryptographicVerificationPerformed, false);
  } else {
    assert.equal(major, 24);
    assert.equal(result.disposition, 'pq-verified');
    assert.equal(result.cryptographicVerificationPerformed, true);
  }
});

test('malformed or stale evidence fails before runtime capability branching', () => {
  const { unsigned, evidence } = makeInputs();
  const cases = [
    { ...evidence, signatureHash: '0'.repeat(64) },
    { ...evidence, unsignedPayloadHash: '0'.repeat(64) },
    { ...evidence, pqEvidenceHash: '0'.repeat(64) },
  ];
  for (const invalid of cases) {
    assert.throws(
      () => verifyMlDsaEvidence(invalid, unsigned),
      (error) => error?.code === 'E_PQ_EVIDENCE',
    );
  }
});

test('structurally valid but cryptographically altered ML-DSA signature is rejected on capable Node 24', () => {
  const { unsigned, classicalAttestation } = makeInputs();
  const signature = Buffer.from(pqFixture.signatureBase64, 'base64');
  signature[0] ^= 1;
  const signatureBase64 = signature.toString('base64');
  const evidence = createPqEvidenceEnvelope({
    algorithm: pqFixture.algorithm,
    subjectAttestationHash: classicalAttestation.attestationHash,
    unsignedPayloadHash: pqFixture.unsignedPayloadHash,
    publicKeySpkiBase64: pqFixture.publicKeySpkiBase64,
    publicKeyHash: pqFixture.publicKeyHash,
    signatureBase64,
    signatureHash: sha256BytesHex(signature),
    contextBase64: pqFixture.contextBase64,
    sourceRuntimeClass: 'node-24-test-fixture-tampered-signature',
  });

  const result = verifyMlDsaEvidence(evidence, unsigned);
  if (Number(process.versions.node.split('.')[0]) === 22) {
    assert.equal(result.disposition, 'pq-unavailable');
    assert.equal(result.cryptographicVerificationPerformed, false);
  } else {
    assert.equal(result.disposition, 'pq-invalid');
    assert.equal(result.cryptographicVerificationPerformed, true);
  }
});

test('unsigned-payload mutation cannot be hidden behind a stale payload hash', () => {
  const { unsigned, evidence } = makeInputs();
  const changed = { ...unsigned, verdict: 'fail' };
  assert.notEqual(sha256BytesHex(canonicalBytes(changed)), evidence.unsignedPayloadHash);
  assert.throws(
    () => verifyMlDsaEvidence(evidence, changed),
    (error) => error?.code === 'E_PQ_EVIDENCE',
  );
});

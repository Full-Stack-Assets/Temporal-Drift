import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { sha256BytesHex, sha256Hex } from '../../src/kernel/canonicalize.js';
import { createVerificationAttestation } from '../../src/federation/attestation.js';
import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createRevocationLedger } from '../../src/federation/revocation.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';
import { createPqCapabilityPolicy } from '../../src/pq/capabilities.js';
import { createPqEvidenceEnvelope } from '../../src/pq/evidence.js';
import {
  evaluateHybridAttestation,
  evaluatePqMigrationPolicy,
} from '../../src/pq/hybrid.js';

const pqFixture = JSON.parse(await readFile(new URL('../fixtures/ml-dsa-65-test-evidence-v1.json', import.meta.url), 'utf8'));
const classicalFixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B, KEY_C] = classicalFixture.keys;
const frontierReportBytes = await readFile(new URL('../../FRONTIER_VERIFICATION_REPORT.md', import.meta.url));

function setup() {
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
  const pqEvidence = createPqEvidenceEnvelope({
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
  const revocations = createRevocationLedger(registry.registryHash);
  const policy = createPqCapabilityPolicy({
    policyVersion: 'pq-migration-policy-v1',
    requiredClassical: 'ed25519',
    optionalPostQuantum: 'ml-dsa-65',
    allowClassicalOnly: true,
    allowPqUnavailable: true,
    requireHybridForRelease: false,
    executionAuthority: 'none',
  });
  return { profile, registry, unsigned, classicalAttestation, pqEvidence, revocations, policy };
}

test('hybrid evaluation is classical-first and reports explicit runtime-dependent PQ strength', () => {
  const input = setup();
  const result = evaluateHybridAttestation(input);
  const major = Number(process.versions.node.split('.')[0]);

  assert.equal(result.classicalVerified, true);
  assert.equal(result.pqEvidencePresent, true);
  assert.equal(result.classicalAttestationHash, input.classicalAttestation.attestationHash);
  assert.equal(result.pqEvidenceHash, input.pqEvidence.pqEvidenceHash);
  assert.equal(result.postQuantumSystemSecurityClaim, false);
  assert.equal(result.executionAuthority, 'none');
  assert.match(result.hybridHash, /^[a-f0-9]{64}$/u);

  if (major === 22) {
    assert.equal(result.disposition, 'classical-verified-pq-unavailable');
    assert.equal(result.pqCryptographicallyVerified, false);
  } else {
    assert.equal(result.disposition, 'hybrid-verified');
    assert.equal(result.pqCryptographicallyVerified, true);
  }
});

test('absence of PQ evidence remains a truthful classical-only disposition', () => {
  const input = setup();
  const result = evaluateHybridAttestation({ ...input, pqEvidence: null });
  assert.equal(result.disposition, 'classical-verified-no-pq-evidence');
  assert.equal(result.classicalVerified, true);
  assert.equal(result.pqEvidencePresent, false);
  assert.equal(result.pqCryptographicallyVerified, false);
  assert.equal(result.pqEvidenceHash, null);
});

test('invalid classical evidence cannot be rescued by valid PQ evidence', () => {
  const input = setup();
  const tampered = { ...input.classicalAttestation, verdict: 'fail' };
  assert.throws(
    () => evaluateHybridAttestation({ ...input, classicalAttestation: tampered }),
    (error) => ['E_ATTESTATION_SIGNATURE', 'E_ATTESTATION_SCHEMA'].includes(error?.code),
  );
});

test('PQ evidence must bind the exact classical attestation hash', () => {
  const input = setup();
  const mismatched = createPqEvidenceEnvelope({
    algorithm: input.pqEvidence.algorithm,
    subjectAttestationHash: '0'.repeat(64),
    unsignedPayloadHash: input.pqEvidence.unsignedPayloadHash,
    publicKeySpkiBase64: input.pqEvidence.publicKeySpkiBase64,
    publicKeyHash: input.pqEvidence.publicKeyHash,
    signatureBase64: input.pqEvidence.signatureBase64,
    signatureHash: input.pqEvidence.signatureHash,
    contextBase64: input.pqEvidence.contextBase64,
    sourceRuntimeClass: input.pqEvidence.sourceRuntimeClass,
  });
  const result = evaluateHybridAttestation({ ...input, pqEvidence: mismatched });
  assert.equal(result.disposition, 'invalid-pq-evidence');
  assert.equal(result.classicalVerified, true);
  assert.equal(result.pqCryptographicallyVerified, false);
});

test('cryptographically bad but structurally valid PQ evidence cannot inflate hybrid strength on Node 24', () => {
  const input = setup();
  const signature = Buffer.from(input.pqEvidence.signatureBase64, 'base64');
  signature[0] ^= 1;
  const bad = createPqEvidenceEnvelope({
    algorithm: input.pqEvidence.algorithm,
    subjectAttestationHash: input.pqEvidence.subjectAttestationHash,
    unsignedPayloadHash: input.pqEvidence.unsignedPayloadHash,
    publicKeySpkiBase64: input.pqEvidence.publicKeySpkiBase64,
    publicKeyHash: input.pqEvidence.publicKeyHash,
    signatureBase64: signature.toString('base64'),
    signatureHash: sha256BytesHex(signature),
    contextBase64: input.pqEvidence.contextBase64,
    sourceRuntimeClass: 'node-24-test-fixture-tampered',
  });
  const result = evaluateHybridAttestation({ ...input, pqEvidence: bad });
  if (Number(process.versions.node.split('.')[0]) === 22) {
    assert.equal(result.disposition, 'classical-verified-pq-unavailable');
  } else {
    assert.equal(result.disposition, 'invalid-pq-evidence');
  }
});

test('PQ migration policy evaluates compliance without changing cryptographic facts or authority', () => {
  const input = setup();
  const hybrid = evaluateHybridAttestation(input);
  const result = evaluatePqMigrationPolicy(hybrid, input.policy);

  assert.equal(result.cryptographicDisposition, hybrid.disposition);
  assert.equal(result.policyHash, input.policy.policyHash);
  assert.equal(result.executionAuthority, 'none');
  assert.match(result.policyResultHash, /^[a-f0-9]{64}$/u);

  if (Number(process.versions.node.split('.')[0]) === 22) {
    assert.equal(result.compliant, true);
    assert.equal(result.reasonCode, 'pq-unavailable-allowed');
  } else {
    assert.equal(result.compliant, true);
    assert.equal(result.reasonCode, 'hybrid-verified');
  }

  const stricter = { ...input.policy, allowPqUnavailable: false, policyHash: undefined };
  delete stricter.policyHash;
  const strictPolicy = createPqCapabilityPolicy(stricter);
  const strictResult = evaluatePqMigrationPolicy(hybrid, strictPolicy);
  if (Number(process.versions.node.split('.')[0]) === 22) {
    assert.equal(strictResult.compliant, false);
    assert.equal(strictResult.reasonCode, 'pq-verification-required');
  } else {
    assert.equal(strictResult.compliant, true);
  }
});

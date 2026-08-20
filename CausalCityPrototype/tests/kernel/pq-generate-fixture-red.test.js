import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalBytes, sha256BytesHex, sha256Hex } from '../../src/kernel/canonicalize.js';
import { createVerificationAttestation } from '../../src/federation/attestation.js';
import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';

const pqFixture = JSON.parse(await readFile(new URL('../fixtures/ml-dsa-65-test-evidence-v1.json', import.meta.url), 'utf8'));
const classicalFixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B, KEY_C] = classicalFixture.keys;
const frontierReportBytes = await readFile(new URL('../../FRONTIER_VERIFICATION_REPORT.md', import.meta.url));

function makeUnsigned() {
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
  return { unsigned, classicalAttestation };
}

test('pinned ML-DSA fixture preserves exact public evidence bytes on Node 22 and verifies cryptographically on Node 24', () => {
  assert.equal(pqFixture.fixtureVersion, 'ml-dsa-65-test-evidence-v1');
  assert.equal(pqFixture.algorithm, 'ml-dsa-65');
  assert.match(pqFixture.warning, /TEST ONLY/u);
  assert.equal('privateKeyPkcs8Base64' in pqFixture, false, 'committed fixture must not contain the generated private key');

  const { unsigned, classicalAttestation } = makeUnsigned();
  const payloadBytes = canonicalBytes(unsigned);
  const publicKeyBytes = Buffer.from(pqFixture.publicKeySpkiBase64, 'base64');
  const signatureBytes = Buffer.from(pqFixture.signatureBase64, 'base64');

  assert.equal(classicalAttestation.attestationHash, pqFixture.classicalAttestationHash);
  assert.equal(sha256BytesHex(payloadBytes), pqFixture.unsignedPayloadHash);
  assert.equal(sha256BytesHex(publicKeyBytes), pqFixture.publicKeyHash);
  assert.equal(sha256BytesHex(signatureBytes), pqFixture.signatureHash);
  assert.equal(pqFixture.contextBase64, '');
  assert.equal(pqFixture.sourceRuntime, 'node-24');

  const major = Number(process.versions.node.split('.')[0]);
  if (major === 22) {
    assert.equal(major, 22);
    return;
  }

  assert.equal(major, 24);
  const publicKey = createPublicKey({ key: publicKeyBytes, format: 'der', type: 'spki' });
  const context = Buffer.from(pqFixture.contextBase64, 'base64');
  assert.equal(verify(null, payloadBytes, { key: publicKey, context }, signatureBytes), true);

  const changed = Buffer.from(payloadBytes);
  changed[changed.length - 1] ^= 1;
  assert.equal(verify(null, changed, { key: publicKey, context }, signatureBytes), false);
});

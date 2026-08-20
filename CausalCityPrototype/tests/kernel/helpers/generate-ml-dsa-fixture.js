import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  canonicalBytes,
  sha256BytesHex,
  sha256Hex,
} from '../../../src/kernel/canonicalize.js';
import { createVerificationAttestation } from '../../../src/federation/attestation.js';
import { createCryptoProfile } from '../../../src/federation/crypto-profile.js';
import { createVerifierRegistry } from '../../../src/federation/verifier-registry.js';

const major = Number(process.versions.node.split('.')[0]);
if (major !== 24) throw new Error(`ML-DSA fixture generation requires Node 24; received Node ${major}`);

const keyFixture = JSON.parse(await readFile(new URL('../../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B, KEY_C] = keyFixture.keys;
const frontierReportBytes = await readFile(new URL('../../../FRONTIER_VERIFICATION_REPORT.md', import.meta.url));
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
  verifiers: [
    { key: KEY_A, weight: 1 },
    { key: KEY_B, weight: 1 },
    { key: KEY_C, weight: 1 },
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
const payloadBytes = canonicalBytes(unsigned);

const { privateKey, publicKey } = generateKeyPairSync('ml-dsa-65');
const context = Buffer.alloc(0);
const signature = sign(null, payloadBytes, { key: privateKey, context });
if (!verify(null, payloadBytes, { key: publicKey, context }, signature)) {
  throw new Error('Generated ML-DSA-65 signature did not verify');
}

const privateKeyPkcs8 = privateKey.export({ format: 'der', type: 'pkcs8' });
const publicKeySpki = publicKey.export({ format: 'der', type: 'spki' });

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'ml-dsa-65-test-evidence-v1',
  warning: 'TEST ONLY - generated Node 24 ML-DSA-65 key/signature evidence; never use as production credentials',
  algorithm: 'ml-dsa-65',
  classicalAttestationHash: classicalAttestation.attestationHash,
  privateKeyPkcs8Base64: Buffer.from(privateKeyPkcs8).toString('base64'),
  publicKeySpkiBase64: Buffer.from(publicKeySpki).toString('base64'),
  publicKeyHash: sha256BytesHex(Buffer.from(publicKeySpki)),
  unsignedPayloadHash: sha256BytesHex(payloadBytes),
  signatureBase64: signature.toString('base64'),
  signatureHash: sha256BytesHex(signature),
  contextBase64: context.toString('base64'),
  sourceRuntime: 'node-24',
})}\n`);

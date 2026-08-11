import { readFile } from 'node:fs/promises';

import { canonicalString, sha256BytesHex, sha256Hex } from '../../../src/kernel/canonicalize.js';
import { createCryptoPolicyProfile } from '../../../src/mesh/crypto-profile.js';
import { createVerificationAttestation } from '../../../src/mesh/attestation.js';
import { createVerificationMeshPolicy } from '../../../src/mesh/verification-mesh.js';
import {
  aggregateVerificationMeshWithRegistry,
  evaluateAttestationKeyAdmission,
} from '../../../src/mesh/key-admission.js';
import {
  appendKeyRegistration,
  appendKeyRevocation,
  appendKeyRotation,
  createVerificationKeyRegistry,
  deriveVerificationKeyFingerprint,
  resolveVerificationKeyStatus,
} from '../../../src/mesh/key-registry.js';
import { TEST_PRIVATE_KEYS, TEST_PUBLIC_KEYS } from '../../fixtures/mesh-test-ed25519-key.js';

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
const schemas = [];
for (const name of schemaNames) {
  const schema = JSON.parse(await readFile(new URL(`../../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
  schemas.push({ name, schema });
}
const schemaBundleHash = sha256Hex({ format: 'mesh-schema-bundle', schemaVersion: '1.0.0', schemas });

const profile = createCryptoPolicyProfile({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

const empty = createVerificationKeyRegistry({
  networkId: 'ripple-key-lifecycle-conformance-v1',
  cryptoProfileId: profile.profileId,
  registryVersion: '1.0.0',
});
let registry = appendKeyRegistration(empty, {
  logicalTime: 10,
  verifierNodeId: 'node-alpha',
  operatorId: 'operator-alpha',
  publicKey: TEST_PUBLIC_KEYS.alpha,
  reasonCode: 'KEY_INITIAL_REGISTRATION',
});
const registerEventHash = registry.events.at(-1).eventHash;
registry = appendKeyRotation(registry, {
  logicalTime: 20,
  verifierNodeId: 'node-alpha',
  operatorId: 'operator-alpha',
  predecessorKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha),
  publicKey: TEST_PUBLIC_KEYS.beta,
  reasonCode: 'KEY_SCHEDULED_ROTATION',
});
const rotateEventHash = registry.events.at(-1).eventHash;
registry = appendKeyRevocation(registry, {
  logicalTime: 30,
  verifierNodeId: 'node-alpha',
  operatorId: 'operator-alpha',
  publicKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta),
  reasonCode: 'KEY_REVOKED_BY_POLICY',
});
const revokeEventHash = registry.events.at(-1).eventHash;

const alphaFingerprint = deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha);
const betaFingerprint = deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta);
const status = (fingerprint, atLogicalTime) => resolveVerificationKeyStatus(registry, {
  verifierNodeId: 'node-alpha',
  operatorId: 'operator-alpha',
  publicKeyFingerprint: fingerprint,
  atLogicalTime,
}).status;

function attestation(privateKey, logicalTime, evidenceDigit) {
  return createVerificationAttestation({
    artifactType: 'run-export',
    artifactId: 'run-bellwether-baseline',
    artifactHash: 'a'.repeat(64),
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    verificationMethod: 'trust-kernel-replay',
    verificationVersion: '1.0.0',
    verifiedAtLogical: logicalTime,
    runtime: 'conformance-runtime-independent',
    evidenceHash: evidenceDigit.repeat(64),
    result: 'pass',
    failureCodes: [],
  }, privateKey, profile);
}

const alpha15 = attestation(TEST_PRIVATE_KEYS.alpha, 15, '1');
const alpha20 = attestation(TEST_PRIVATE_KEYS.alpha, 20, '2');
const beta25 = attestation(TEST_PRIVATE_KEYS.beta, 25, '3');
const beta30 = attestation(TEST_PRIVATE_KEYS.beta, 30, '4');
const alpha15Admission = evaluateAttestationKeyAdmission(registry, alpha15, profile);
const alpha20Admission = evaluateAttestationKeyAdmission(registry, alpha20, profile);
const beta25Admission = evaluateAttestationKeyAdmission(registry, beta25, profile);
const beta30Admission = evaluateAttestationKeyAdmission(registry, beta30, profile);

const policy = createVerificationMeshPolicy({
  networkId: 'ripple-registry-aware-conformance-v1',
  artifactType: 'run-export',
  artifactHash: 'a'.repeat(64),
  cryptoProfileId: profile.profileId,
  minimumPassingAttestations: 1,
  minimumDistinctOperators: 1,
  allowedVerifierNodeIds: ['node-alpha'],
  allowedOperatorIds: ['operator-alpha'],
  requireDistinctKeyFingerprints: true,
});
const bundle = aggregateVerificationMeshWithRegistry(policy, [alpha20, alpha15], profile, registry);

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'key-lifecycle-v1',
  schemaBundleHash,
  schemaNames,
  registryId: registry.registryId,
  emptyRegistryHash: empty.registryHash,
  registerEventHash,
  rotateEventHash,
  revokeEventHash,
  terminalRegistryHash: registry.registryHash,
  registryBytesHash: sha256BytesHex(Buffer.from(canonicalString(registry), 'utf8')),
  alphaFingerprint,
  betaFingerprint,
  alphaStatusVector: [9, 10, 19, 20].map((time) => status(alphaFingerprint, time)),
  betaStatusVector: [19, 20, 29, 30].map((time) => status(betaFingerprint, time)),
  alpha15AdmissionHash: alpha15Admission.admissionHash,
  alpha15Admitted: alpha15Admission.admitted,
  alpha20AdmissionHash: alpha20Admission.admissionHash,
  alpha20Admitted: alpha20Admission.admitted,
  beta25AdmissionHash: beta25Admission.admissionHash,
  beta25Admitted: beta25Admission.admitted,
  beta30AdmissionHash: beta30Admission.admissionHash,
  beta30Admitted: beta30Admission.admitted,
  registryAwareBundleHash: bundle.bundleHash,
  registryAwareStatus: bundle.status,
  registryAwareAdmittedCount: bundle.admittedCount,
  registryAwareRejectedCount: bundle.rejectedCount,
  identityVerified: bundle.identityVerified,
  approvalAuthority: bundle.approvalAuthority,
})}\n`);

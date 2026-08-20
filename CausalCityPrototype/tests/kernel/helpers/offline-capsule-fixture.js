import { readFile } from 'node:fs/promises';

import { canonicalString, sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { createCryptoPolicyProfile } from '../../../src/mesh/crypto-profile.js';
import { createVerificationAttestation } from '../../../src/mesh/attestation.js';
import { createVerificationMeshPolicy } from '../../../src/mesh/verification-mesh.js';
import { aggregateVerificationMeshWithRegistry } from '../../../src/mesh/key-admission.js';
import {
  appendKeyRegistration,
  createVerificationKeyRegistry,
} from '../../../src/mesh/key-registry.js';
import { TEST_PRIVATE_KEYS, TEST_PUBLIC_KEYS } from '../../fixtures/mesh-test-ed25519-key.js';

export const OFFLINE_SCHEMA_NAMES = Object.freeze([
  'crypto-policy-profile-v1',
  'verification-attestation-v1',
  'verification-mesh-policy-v1',
  'verification-mesh-v1',
  'external-anchor-request-v1',
  'external-anchor-receipt-v1',
  'proof-statement-v1',
  'verification-key-registry-v1',
]);

export async function loadOfflineSchemaBundle() {
  const entries = [];
  for (const name of OFFLINE_SCHEMA_NAMES) {
    const schema = JSON.parse(await readFile(new URL(`../../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
    entries.push({ name, schema });
  }
  return entries;
}

export async function buildOfflineCapsuleInput() {
  const artifactCanonicalJson = canonicalString({
    format: 'opaque-capsule-test-artifact',
    schemaVersion: '1.0.0',
    note: 'café',
    values: [1, 2, 3],
  });
  const artifactHash = sha256BytesHex(Buffer.from(artifactCanonicalJson, 'utf8'));

  const cryptoProfile = createCryptoPolicyProfile({
    profileName: 'classical-ed25519-v1',
    hashAlgorithm: 'sha256',
    signatureAlgorithm: 'ed25519',
    publicKeyEncoding: 'spki-der-base64url',
    signatureEncoding: 'base64url',
    postQuantumMode: 'not-implemented',
    hybridSignatureRequired: false,
  });

  let keyRegistry = createVerificationKeyRegistry({
    networkId: 'ripple-offline-capsule-test-v1',
    cryptoProfileId: cryptoProfile.profileId,
    registryVersion: '1.0.0',
  });
  keyRegistry = appendKeyRegistration(keyRegistry, {
    logicalTime: 10,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKey: TEST_PUBLIC_KEYS.alpha,
    reasonCode: 'KEY_INITIAL_REGISTRATION',
  });
  keyRegistry = appendKeyRegistration(keyRegistry, {
    logicalTime: 11,
    verifierNodeId: 'node-beta',
    operatorId: 'operator-beta',
    publicKey: TEST_PUBLIC_KEYS.beta,
    reasonCode: 'KEY_INITIAL_REGISTRATION',
  });

  function sign(node, operator, logicalTime, evidenceDigit, privateKey) {
    return createVerificationAttestation({
      artifactType: 'opaque-canonical-json',
      artifactId: 'capsule-artifact-001',
      artifactHash,
      verifierNodeId: node,
      operatorId: operator,
      verificationMethod: 'opaque-byte-commitment-check',
      verificationVersion: '1.0.0',
      verifiedAtLogical: logicalTime,
      runtime: 'conformance-runtime-independent',
      evidenceHash: evidenceDigit.repeat(64),
      result: 'pass',
      failureCodes: [],
    }, privateKey, cryptoProfile);
  }

  const attestations = [
    sign('node-alpha', 'operator-alpha', 20, '1', TEST_PRIVATE_KEYS.alpha),
    sign('node-beta', 'operator-beta', 21, '2', TEST_PRIVATE_KEYS.beta),
  ];

  const meshPolicy = createVerificationMeshPolicy({
    networkId: 'ripple-offline-capsule-mesh-v1',
    artifactType: 'opaque-canonical-json',
    artifactHash,
    cryptoProfileId: cryptoProfile.profileId,
    minimumPassingAttestations: 2,
    minimumDistinctOperators: 2,
    allowedVerifierNodeIds: ['node-alpha', 'node-beta'],
    allowedOperatorIds: ['operator-alpha', 'operator-beta'],
    requireDistinctKeyFingerprints: true,
  });

  const expectedRegistryAwareBundle = aggregateVerificationMeshWithRegistry(
    meshPolicy,
    attestations,
    cryptoProfile,
    keyRegistry,
  );

  return {
    capsuleLabel: 'offline-capsule-conformance-v1',
    artifactType: 'opaque-canonical-json',
    artifactId: 'capsule-artifact-001',
    artifactCanonicalJson,
    cryptoProfile,
    schemaBundle: await loadOfflineSchemaBundle(),
    keyRegistry,
    meshPolicy,
    attestations,
    expectedRegistryAwareBundle,
  };
}

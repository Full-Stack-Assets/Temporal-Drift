import {
  canonicalString,
  sha256BytesHex,
  sha256Hex,
} from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  immutableReport,
  meshFail,
  normalizeText,
  readExactDataArray,
} from './common.js';
import { verifyCryptoPolicyProfile } from './crypto-profile.js';
import { verifyVerificationAttestation } from './attestation.js';
import {
  verifyVerificationMeshPolicy,
} from './verification-mesh.js';
import {
  aggregateVerificationMeshWithRegistry,
  verifyRegistryAwareMeshAdmission,
} from './key-admission.js';
import { verifyVerificationKeyRegistry } from './key-registry.js';

const INPUT_KEYS = [
  'capsuleLabel',
  'artifactType',
  'artifactId',
  'artifactCanonicalJson',
  'cryptoProfile',
  'schemaBundle',
  'keyRegistry',
  'meshPolicy',
  'attestations',
  'expectedRegistryAwareBundle',
];

const OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  'capsuleLabel',
  'artifactType',
  'artifactId',
  'artifactEncoding',
  'artifactCanonicalJson',
  'artifactByteLength',
  'artifactHash',
  'cryptoProfile',
  'schemaBundle',
  'schemaBundleHash',
  'keyRegistry',
  'meshPolicy',
  'attestations',
  'expectedRegistryAwareBundle',
  'claimBoundary',
  'capsuleHash',
  'capsuleId',
];

const CLAIM_KEYS = [
  'artifactBytesVerified',
  'modelReplayPerformed',
  'realIdentityVerified',
  'organizationalIndependenceVerified',
  'scientificValidityEstablished',
  'externalPublicationVerified',
  'postQuantumSecurityEstablished',
  'zeroKnowledgeProofVerified',
  'approvalAuthority',
];

export const OFFLINE_CAPSULE_SCHEMA_NAMES = Object.freeze([
  'crypto-policy-profile-v1',
  'verification-attestation-v1',
  'verification-mesh-policy-v1',
  'verification-mesh-v1',
  'external-anchor-request-v1',
  'external-anchor-receipt-v1',
  'proof-statement-v1',
  'verification-key-registry-v1',
]);

const CLAIM_BOUNDARY = cloneAndFreeze({
  artifactBytesVerified: 'commitment-only',
  modelReplayPerformed: false,
  realIdentityVerified: false,
  organizationalIndependenceVerified: false,
  scientificValidityEstablished: false,
  externalPublicationVerified: false,
  postQuantumSecurityEstablished: false,
  zeroKnowledgeProofVerified: false,
  approvalAuthority: 'none',
});

function safeCanonicalClone(value, code, path, stack = new Set()) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || !Number.isFinite(value) || Object.is(value, -0)) {
      meshFail(code, `${path} contains a noncanonical number`, path);
    }
    return value;
  }
  if (!value || typeof value !== 'object') meshFail(code, `${path} contains an unsupported value`, path);
  if (stack.has(value)) meshFail(code, `${path} contains a cycle`, path);
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      const entries = readExactDataArray(value, code, path, true);
      return entries.map((entry, index) => safeCanonicalClone(entry, code, `${path}.${index}`, stack));
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      meshFail(code, `${path} must contain only plain objects`, path);
    }
    const names = Object.getOwnPropertyNames(value);
    const symbols = Object.getOwnPropertySymbols(value);
    if (symbols.length || names.length !== Object.keys(value).length) {
      meshFail(code, `${path} contains hidden or symbolic fields`, path);
    }
    const result = {};
    const normalizedKeys = new Set();
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        meshFail(code, `${path}.${key} must be an enumerable data field`, `${path}.${key}`);
      }
      const normalizedKey = key.normalize('NFC');
      if (normalizedKeys.has(normalizedKey)) meshFail(code, `${path} contains NFC-colliding keys`, path);
      normalizedKeys.add(normalizedKey);
      result[normalizedKey] = safeCanonicalClone(descriptor.value, code, `${path}.${normalizedKey}`, stack);
    }
    return result;
  } finally {
    stack.delete(value);
  }
}

function normalizeArtifact(value) {
  if (typeof value !== 'string' || value.length === 0) meshFail('E_CAPSULE_ARTIFACT', 'artifactCanonicalJson must be a non-empty string', 'artifactCanonicalJson');
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    meshFail('E_CAPSULE_ARTIFACT', 'artifactCanonicalJson must parse as JSON', 'artifactCanonicalJson');
  }
  let canonical;
  try {
    canonical = canonicalString(parsed);
  } catch {
    meshFail('E_CAPSULE_ARTIFACT', 'artifact JSON is not canonical-v1 compatible', 'artifactCanonicalJson');
  }
  if (canonical !== value) meshFail('E_CAPSULE_ARTIFACT', 'artifactCanonicalJson must already be exact canonical-v1 JSON', 'artifactCanonicalJson');
  const bytes = Buffer.from(value, 'utf8');
  return cloneAndFreeze({
    artifactCanonicalJson: value,
    artifactByteLength: bytes.length,
    artifactHash: sha256BytesHex(bytes),
  });
}

function normalizeSchemaBundle(value) {
  const entries = readExactDataArray(value, 'E_CAPSULE_SCHEMA_BUNDLE', 'schemaBundle', false);
  if (entries.length !== OFFLINE_CAPSULE_SCHEMA_NAMES.length) {
    meshFail('E_CAPSULE_SCHEMA_BUNDLE', 'schemaBundle must contain the exact portable mesh schema set', 'schemaBundle');
  }
  const normalized = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    assertExactPlainObject(entry, ['name', 'schema'], 'E_CAPSULE_SCHEMA_BUNDLE', `schemaBundle.${index}`);
    const name = normalizeText(entry.name, 'E_CAPSULE_SCHEMA_BUNDLE', `schemaBundle.${index}.name`);
    if (name !== OFFLINE_CAPSULE_SCHEMA_NAMES[index]) {
      meshFail('E_CAPSULE_SCHEMA_BUNDLE', 'schemaBundle names must use the exact canonical order', `schemaBundle.${index}.name`);
    }
    const schema = safeCanonicalClone(entry.schema, 'E_CAPSULE_SCHEMA_BUNDLE', `schemaBundle.${index}.schema`);
    if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema' || schema.type !== 'object' || schema.additionalProperties !== false) {
      meshFail('E_CAPSULE_SCHEMA_BUNDLE', 'each schema must be a strict draft-2020-12 object schema', `schemaBundle.${index}.schema`);
    }
    if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
      meshFail('E_CAPSULE_SCHEMA_BUNDLE', 'schema properties must be declared', `schemaBundle.${index}.schema.properties`);
    }
    if (!Array.isArray(schema.required)) meshFail('E_CAPSULE_SCHEMA_BUNDLE', 'schema required must be an array', `schemaBundle.${index}.schema.required`);
    const required = [...schema.required].sort();
    const properties = Object.keys(schema.properties).sort();
    if (canonicalString(required) !== canonicalString(properties)) {
      meshFail('E_CAPSULE_SCHEMA_BUNDLE', 'schema required must cover every top-level property exactly', `schemaBundle.${index}.schema.required`);
    }
    normalized.push(cloneAndFreeze({ name, schema }));
  }
  const schemaBundle = cloneAndFreeze(normalized);
  const schemaBundleHash = sha256Hex({
    format: 'portable-mesh-schema-bundle',
    schemaVersion: '1.0.0',
    schemas: schemaBundle,
  });
  return cloneAndFreeze({ schemaBundle, schemaBundleHash });
}

function normalizeAttestations(value, cryptoProfile) {
  const entries = readExactDataArray(value, 'E_CAPSULE_EVIDENCE', 'attestations', false);
  const seen = new Set();
  const attestations = [];
  for (let index = 0; index < entries.length; index += 1) {
    const attestation = entries[index];
    const report = verifyVerificationAttestation(attestation, cryptoProfile);
    if (!report.ok) meshFail('E_CAPSULE_EVIDENCE', 'attestation failed cryptographic verification', `attestations.${index}`);
    if (seen.has(attestation.attestationId)) meshFail('E_CAPSULE_EVIDENCE', 'duplicate attestation ID', `attestations.${index}.attestationId`);
    seen.add(attestation.attestationId);
    attestations.push(attestation);
  }
  return cloneAndFreeze(attestations);
}

function capsuleCore(fields) {
  return cloneAndFreeze({
    format: 'offline-verification-capsule',
    schemaVersion: '1.0.0',
    capsuleLabel: fields.capsuleLabel,
    artifactType: fields.artifactType,
    artifactId: fields.artifactId,
    artifactEncoding: 'canonical-v1-json-utf8',
    artifactCanonicalJson: fields.artifact.artifactCanonicalJson,
    artifactByteLength: fields.artifact.artifactByteLength,
    artifactHash: fields.artifact.artifactHash,
    cryptoProfile: fields.cryptoProfile,
    schemaBundle: fields.schemaBundle,
    schemaBundleHash: fields.schemaBundleHash,
    keyRegistry: fields.keyRegistry,
    meshPolicy: fields.meshPolicy,
    attestations: fields.attestations,
    expectedRegistryAwareBundle: fields.expectedRegistryAwareBundle,
    claimBoundary: CLAIM_BOUNDARY,
  });
}

export function createOfflineVerificationCapsule(input) {
  assertExactPlainObject(input, INPUT_KEYS, 'E_CAPSULE_SCHEMA', 'offlineCapsuleInput');
  const capsuleLabel = normalizeText(input.capsuleLabel, 'E_CAPSULE_SCHEMA', 'offlineCapsuleInput.capsuleLabel');
  const artifactType = normalizeText(input.artifactType, 'E_CAPSULE_SCHEMA', 'offlineCapsuleInput.artifactType');
  const artifactId = normalizeText(input.artifactId, 'E_CAPSULE_SCHEMA', 'offlineCapsuleInput.artifactId');
  const artifact = normalizeArtifact(input.artifactCanonicalJson);

  if (!verifyCryptoPolicyProfile(input.cryptoProfile).ok) meshFail('E_CAPSULE_EVIDENCE', 'crypto profile must verify', 'cryptoProfile');
  if (!verifyVerificationKeyRegistry(input.keyRegistry).ok) meshFail('E_CAPSULE_EVIDENCE', 'key registry must verify', 'keyRegistry');
  if (!verifyVerificationMeshPolicy(input.meshPolicy).ok) meshFail('E_CAPSULE_EVIDENCE', 'mesh policy must verify', 'meshPolicy');
  if (input.keyRegistry.cryptoProfileId !== input.cryptoProfile.profileId || input.meshPolicy.cryptoProfileId !== input.cryptoProfile.profileId) {
    meshFail('E_CAPSULE_EVIDENCE', 'profile bindings must match', 'cryptoProfile');
  }
  if (input.meshPolicy.artifactType !== artifactType || input.meshPolicy.artifactHash !== artifact.artifactHash) {
    meshFail('E_CAPSULE_EVIDENCE', 'mesh policy must bind the carried artifact bytes', 'meshPolicy');
  }

  const { schemaBundle, schemaBundleHash } = normalizeSchemaBundle(input.schemaBundle);
  const attestations = normalizeAttestations(input.attestations, input.cryptoProfile);
  for (let index = 0; index < attestations.length; index += 1) {
    const attestation = attestations[index];
    if (attestation.artifactType !== artifactType || attestation.artifactId !== artifactId || attestation.artifactHash !== artifact.artifactHash || attestation.cryptoProfileId !== input.cryptoProfile.profileId) {
      meshFail('E_CAPSULE_EVIDENCE', 'attestation must bind the carried artifact and profile', `attestations.${index}`);
    }
  }

  const reconstructed = aggregateVerificationMeshWithRegistry(
    input.meshPolicy,
    attestations,
    input.cryptoProfile,
    input.keyRegistry,
  );
  if (!verifyRegistryAwareMeshAdmission(
    input.expectedRegistryAwareBundle,
    input.meshPolicy,
    attestations,
    input.cryptoProfile,
    input.keyRegistry,
  ).ok || canonicalString(reconstructed) !== canonicalString(input.expectedRegistryAwareBundle)) {
    meshFail('E_CAPSULE_EVIDENCE', 'expected registry-aware bundle does not reconstruct exactly', 'expectedRegistryAwareBundle');
  }

  const core = capsuleCore({
    capsuleLabel,
    artifactType,
    artifactId,
    artifact,
    cryptoProfile: input.cryptoProfile,
    schemaBundle,
    schemaBundleHash,
    keyRegistry: input.keyRegistry,
    meshPolicy: input.meshPolicy,
    attestations,
    expectedRegistryAwareBundle: reconstructed,
  });
  const capsuleHash = sha256Hex(core);
  return cloneAndFreeze({ ...core, capsuleHash, capsuleId: `offline-capsule-${capsuleHash}` });
}

function successReport(capsule) {
  const core = cloneAndFreeze({
    format: 'offline-capsule-verification-report',
    schemaVersion: '1.0.0',
    ok: true,
    firstMismatch: null,
    capsuleId: capsule.capsuleId,
    capsuleHash: capsule.capsuleHash,
    artifactHash: capsule.artifactHash,
    artifactBytesVerified: true,
    cryptoProfileVerified: true,
    schemaBundleVerified: true,
    keyRegistryVerified: true,
    attestationCount: capsule.attestations.length,
    cryptographicallyValidAttestationCount: capsule.attestations.length,
    registryAdmittedCount: capsule.expectedRegistryAwareBundle.admittedCount,
    registryRejectedCount: capsule.expectedRegistryAwareBundle.rejectedCount,
    quorumStatus: capsule.expectedRegistryAwareBundle.status,
    identityVerified: false,
    independentReviewEstablished: false,
    scientificValidityEstablished: false,
    approvalAuthority: 'none',
  });
  return cloneAndFreeze({ ...core, reportHash: sha256Hex(core) });
}

function failureReport() {
  const core = cloneAndFreeze({
    format: 'offline-capsule-verification-report',
    schemaVersion: '1.0.0',
    ok: false,
    firstMismatch: 'offlineCapsule',
    capsuleId: null,
    capsuleHash: null,
    artifactHash: null,
    artifactBytesVerified: false,
    cryptoProfileVerified: false,
    schemaBundleVerified: false,
    keyRegistryVerified: false,
    attestationCount: null,
    cryptographicallyValidAttestationCount: null,
    registryAdmittedCount: null,
    registryRejectedCount: null,
    quorumStatus: null,
    identityVerified: false,
    independentReviewEstablished: false,
    scientificValidityEstablished: false,
    approvalAuthority: 'none',
  });
  return cloneAndFreeze({ ...core, reportHash: sha256Hex(core) });
}

export function verifyOfflineVerificationCapsule(capsule) {
  try {
    assertExactPlainObject(capsule, OUTPUT_KEYS, 'E_CAPSULE_SCHEMA', 'offlineCapsule');
    if (capsule.format !== 'offline-verification-capsule' || capsule.schemaVersion !== '1.0.0' || capsule.artifactEncoding !== 'canonical-v1-json-utf8') throw new Error('format');
    assertExactPlainObject(capsule.claimBoundary, CLAIM_KEYS, 'E_CAPSULE_SCHEMA', 'offlineCapsule.claimBoundary');
    if (canonicalString(capsule.claimBoundary) !== canonicalString(CLAIM_BOUNDARY)) throw new Error('claimBoundary');
    const rebuilt = createOfflineVerificationCapsule({
      capsuleLabel: capsule.capsuleLabel,
      artifactType: capsule.artifactType,
      artifactId: capsule.artifactId,
      artifactCanonicalJson: capsule.artifactCanonicalJson,
      cryptoProfile: capsule.cryptoProfile,
      schemaBundle: capsule.schemaBundle,
      keyRegistry: capsule.keyRegistry,
      meshPolicy: capsule.meshPolicy,
      attestations: capsule.attestations,
      expectedRegistryAwareBundle: capsule.expectedRegistryAwareBundle,
    });
    if (canonicalString(rebuilt) !== canonicalString(capsule)) throw new Error('capsule identity');
    return successReport(rebuilt);
  } catch {
    return failureReport();
  }
}

export function exportOfflineVerificationCapsule(capsule) {
  if (!verifyOfflineVerificationCapsule(capsule).ok) meshFail('E_CAPSULE_EVIDENCE', 'offline capsule must verify before export', 'offlineCapsule');
  return canonicalString(capsule);
}

export function parseOfflineVerificationCapsule(value) {
  if (typeof value !== 'string' || value.length === 0) meshFail('E_CAPSULE_CANONICAL', 'capsule input must be canonical JSON text', 'capsuleJson');
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    meshFail('E_CAPSULE_CANONICAL', 'capsule input must parse as JSON', 'capsuleJson');
  }
  let canonical;
  try {
    canonical = canonicalString(parsed);
  } catch {
    meshFail('E_CAPSULE_CANONICAL', 'capsule input is not canonical-v1 compatible', 'capsuleJson');
  }
  if (canonical !== value) meshFail('E_CAPSULE_CANONICAL', 'capsule input must already be exact canonical-v1 JSON', 'capsuleJson');
  if (!verifyOfflineVerificationCapsule(parsed).ok) meshFail('E_CAPSULE_CANONICAL', 'capsule content verification failed', 'capsuleJson');
  return createOfflineVerificationCapsule({
    capsuleLabel: parsed.capsuleLabel,
    artifactType: parsed.artifactType,
    artifactId: parsed.artifactId,
    artifactCanonicalJson: parsed.artifactCanonicalJson,
    cryptoProfile: parsed.cryptoProfile,
    schemaBundle: parsed.schemaBundle,
    keyRegistry: parsed.keyRegistry,
    meshPolicy: parsed.meshPolicy,
    attestations: parsed.attestations,
    expectedRegistryAwareBundle: parsed.expectedRegistryAwareBundle,
  });
}

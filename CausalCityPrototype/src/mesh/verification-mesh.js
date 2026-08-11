import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  compareUtf8,
  immutableReport,
  meshFail,
  normalizeBoolean,
  normalizeHash,
  normalizePositiveInteger,
  normalizeProfileId,
  normalizeStringSet,
  normalizeText,
} from './common.js';
import { verifyVerificationAttestation } from './attestation.js';
import { verifyCryptoPolicyProfile } from './crypto-profile.js';

const POLICY_INPUT_KEYS = [
  'networkId',
  'artifactType',
  'artifactHash',
  'cryptoProfileId',
  'minimumPassingAttestations',
  'minimumDistinctOperators',
  'allowedVerifierNodeIds',
  'allowedOperatorIds',
  'requireDistinctKeyFingerprints',
];

const POLICY_OUTPUT_KEYS = ['format', 'schemaVersion', ...POLICY_INPUT_KEYS, 'policyId'];
const MESH_OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  'policy',
  'policyId',
  'artifactType',
  'artifactHash',
  'cryptoProfileId',
  'attestations',
  'passingAttestationCount',
  'failingAttestationCount',
  'distinctPassingOperatorCount',
  'status',
  'independenceBasis',
  'independenceVerified',
  'approvalAuthority',
  'meshHash',
];

function normalizePolicyInput(input) {
  const code = 'E_MESH_POLICY_SCHEMA';
  assertExactPlainObject(input, POLICY_INPUT_KEYS, code, 'meshPolicy');
  const normalized = {
    networkId: normalizeText(input.networkId, code, 'meshPolicy.networkId'),
    artifactType: normalizeText(input.artifactType, code, 'meshPolicy.artifactType'),
    artifactHash: normalizeHash(input.artifactHash, code, 'meshPolicy.artifactHash'),
    cryptoProfileId: normalizeProfileId(input.cryptoProfileId, code, 'meshPolicy.cryptoProfileId'),
    minimumPassingAttestations: normalizePositiveInteger(input.minimumPassingAttestations, code, 'meshPolicy.minimumPassingAttestations'),
    minimumDistinctOperators: normalizePositiveInteger(input.minimumDistinctOperators, code, 'meshPolicy.minimumDistinctOperators'),
    allowedVerifierNodeIds: normalizeStringSet(input.allowedVerifierNodeIds, code, 'meshPolicy.allowedVerifierNodeIds'),
    allowedOperatorIds: normalizeStringSet(input.allowedOperatorIds, code, 'meshPolicy.allowedOperatorIds'),
    requireDistinctKeyFingerprints: normalizeBoolean(input.requireDistinctKeyFingerprints, code, 'meshPolicy.requireDistinctKeyFingerprints'),
  };
  if (normalized.minimumPassingAttestations > normalized.allowedVerifierNodeIds.length) meshFail(code, 'passing threshold exceeds allowed verifier nodes', 'meshPolicy.minimumPassingAttestations');
  if (normalized.minimumDistinctOperators > normalized.allowedOperatorIds.length) meshFail(code, 'operator threshold exceeds allowed operators', 'meshPolicy.minimumDistinctOperators');
  if (normalized.minimumDistinctOperators > normalized.minimumPassingAttestations) meshFail(code, 'operator threshold cannot exceed passing-attestation threshold', 'meshPolicy.minimumDistinctOperators');
  return cloneAndFreeze(normalized);
}

function policyCore(input) {
  return cloneAndFreeze({ format: 'verification-mesh-policy', schemaVersion: '1.0.0', ...input });
}

export function createVerificationMeshPolicy(input) {
  const core = policyCore(normalizePolicyInput(input));
  return cloneAndFreeze({ ...core, policyId: `mesh-policy-${sha256Hex(core)}` });
}

export function verifyVerificationMeshPolicy(policy) {
  try {
    assertExactPlainObject(policy, POLICY_OUTPUT_KEYS, 'E_MESH_POLICY_SCHEMA', 'meshPolicy');
    if (policy.format !== 'verification-mesh-policy' || policy.schemaVersion !== '1.0.0') throw new Error('format');
    const rebuilt = createVerificationMeshPolicy(Object.fromEntries(POLICY_INPUT_KEYS.map((key) => [key, policy[key]])));
    if (canonicalString(rebuilt) !== canonicalString(policy)) throw new Error('policyId');
    return immutableReport({ ok: true, firstMismatch: null, policyId: rebuilt.policyId });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'meshPolicy', policyId: null });
  }
}

function meshCore(policy, attestations) {
  const passing = attestations.filter((item) => item.result === 'pass');
  const failing = attestations.length - passing.length;
  const distinctOperators = new Set(passing.map((item) => item.operatorId)).size;
  const status = passing.length >= policy.minimumPassingAttestations && distinctOperators >= policy.minimumDistinctOperators
    ? 'quorum-met'
    : 'quorum-not-met';
  return cloneAndFreeze({
    format: 'verification-mesh',
    schemaVersion: '1.0.0',
    policy,
    policyId: policy.policyId,
    artifactType: policy.artifactType,
    artifactHash: policy.artifactHash,
    cryptoProfileId: policy.cryptoProfileId,
    attestations,
    passingAttestationCount: passing.length,
    failingAttestationCount: failing,
    distinctPassingOperatorCount: distinctOperators,
    status,
    independenceBasis: 'declared-operator-identity',
    independenceVerified: false,
    approvalAuthority: 'none',
  });
}

export function aggregateVerificationMesh(policy, attestations, cryptoProfile) {
  if (!verifyVerificationMeshPolicy(policy).ok) meshFail('E_MESH_POLICY_SCHEMA', 'mesh policy must verify', 'meshPolicy');
  if (!verifyCryptoPolicyProfile(cryptoProfile).ok || cryptoProfile.profileId !== policy.cryptoProfileId) meshFail('E_MESH_POLICY_SCHEMA', 'crypto profile does not match mesh policy', 'cryptoProfile');
  if (!Array.isArray(attestations) || attestations.length === 0) meshFail('E_MESH_ATTESTATION', 'attestations must be a non-empty array', 'attestations');

  const attestationIds = new Set();
  const nodeIds = new Set();
  const fingerprints = new Set();
  const allowedNodes = new Set(policy.allowedVerifierNodeIds);
  const allowedOperators = new Set(policy.allowedOperatorIds);
  const verified = [];

  for (let index = 0; index < attestations.length; index += 1) {
    const attestation = attestations[index];
    const report = verifyVerificationAttestation(attestation, cryptoProfile);
    if (!report.ok) meshFail('E_MESH_ATTESTATION', 'attestation failed cryptographic verification', `attestations.${index}`);
    if (attestation.artifactType !== policy.artifactType || attestation.artifactHash !== policy.artifactHash || attestation.cryptoProfileId !== policy.cryptoProfileId) {
      meshFail('E_MESH_ATTESTATION', 'attestation does not bind to the mesh artifact and profile', `attestations.${index}`);
    }
    if (!allowedNodes.has(attestation.verifierNodeId) || !allowedOperators.has(attestation.operatorId)) meshFail('E_MESH_ATTESTATION', 'attestation identity is not allowed by policy', `attestations.${index}`);
    if (attestationIds.has(attestation.attestationId)) meshFail('E_MESH_ATTESTATION', 'duplicate attestation ID', `attestations.${index}.attestationId`);
    if (nodeIds.has(attestation.verifierNodeId)) meshFail('E_MESH_ATTESTATION', 'duplicate verifier node ID', `attestations.${index}.verifierNodeId`);
    if (policy.requireDistinctKeyFingerprints && fingerprints.has(attestation.publicKeyFingerprint)) meshFail('E_MESH_ATTESTATION', 'duplicate verifier key fingerprint', `attestations.${index}.publicKeyFingerprint`);
    attestationIds.add(attestation.attestationId);
    nodeIds.add(attestation.verifierNodeId);
    fingerprints.add(attestation.publicKeyFingerprint);
    verified.push(attestation);
  }

  verified.sort((left, right) => compareUtf8(left.verifierNodeId, right.verifierNodeId) || compareUtf8(left.attestationId, right.attestationId));
  const core = meshCore(policy, cloneAndFreeze(verified));
  return cloneAndFreeze({ ...core, meshHash: sha256Hex(core) });
}

export function verifyVerificationMesh(mesh, cryptoProfile) {
  try {
    assertExactPlainObject(mesh, MESH_OUTPUT_KEYS, 'E_MESH_ATTESTATION', 'mesh');
    if (mesh.format !== 'verification-mesh' || mesh.schemaVersion !== '1.0.0') throw new Error('format');
    const rebuilt = aggregateVerificationMesh(mesh.policy, mesh.attestations, cryptoProfile);
    if (canonicalString(rebuilt) !== canonicalString(mesh)) throw new Error('meshHash');
    return immutableReport({ ok: true, firstMismatch: null, status: rebuilt.status, meshHash: rebuilt.meshHash });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'mesh', status: null, meshHash: null });
  }
}

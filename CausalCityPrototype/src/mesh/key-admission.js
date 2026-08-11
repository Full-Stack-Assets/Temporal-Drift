import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  compareUtf8,
  immutableReport,
  meshFail,
  readExactDataArray,
} from './common.js';
import {
  aggregateVerificationMesh,
  verifyVerificationMeshPolicy,
} from './verification-mesh.js';
import { verifyVerificationAttestation } from './attestation.js';
import { verifyCryptoPolicyProfile } from './crypto-profile.js';
import {
  resolveVerificationKeyStatus,
  verifyVerificationKeyRegistry,
} from './key-registry.js';

function safeAttestationId(attestation) {
  return attestation && typeof attestation === 'object' && typeof attestation.attestationId === 'string'
    ? attestation.attestationId
    : null;
}

function admissionCore(registry, fields) {
  return cloneAndFreeze({
    format: 'verification-key-admission',
    schemaVersion: '1.0.0',
    registryId: registry.registryId,
    registryHash: registry.registryHash,
    attestationId: fields.attestationId,
    verifierNodeId: fields.verifierNodeId,
    operatorId: fields.operatorId,
    publicKeyFingerprint: fields.publicKeyFingerprint,
    verifiedAtLogical: fields.verifiedAtLogical,
    cryptographicSignatureValid: fields.cryptographicSignatureValid,
    registryStatus: fields.registryStatus,
    statusEvidenceHash: fields.statusEvidenceHash,
    admitted: fields.admitted,
    identityVerified: false,
    approvalAuthority: 'none',
  });
}

export function evaluateAttestationKeyAdmission(registry, attestation, cryptoProfile) {
  if (!verifyVerificationKeyRegistry(registry).ok) meshFail('E_KEY_ADMISSION', 'key registry must verify', 'keyRegistry');
  if (!verifyCryptoPolicyProfile(cryptoProfile).ok || registry.cryptoProfileId !== cryptoProfile.profileId) {
    meshFail('E_KEY_ADMISSION', 'crypto profile does not match registry', 'cryptoProfile');
  }
  const signatureReport = verifyVerificationAttestation(attestation, cryptoProfile);
  if (!signatureReport.ok) {
    const core = admissionCore(registry, {
      attestationId: safeAttestationId(attestation),
      verifierNodeId: null,
      operatorId: null,
      publicKeyFingerprint: null,
      verifiedAtLogical: null,
      cryptographicSignatureValid: false,
      registryStatus: 'signature-invalid',
      statusEvidenceHash: null,
      admitted: false,
    });
    return cloneAndFreeze({ ...core, admissionHash: sha256Hex(core) });
  }

  const status = resolveVerificationKeyStatus(registry, {
    verifierNodeId: attestation.verifierNodeId,
    operatorId: attestation.operatorId,
    publicKeyFingerprint: attestation.publicKeyFingerprint,
    atLogicalTime: attestation.verifiedAtLogical,
  });
  const admitted = status.status === 'active';
  const core = admissionCore(registry, {
    attestationId: attestation.attestationId,
    verifierNodeId: attestation.verifierNodeId,
    operatorId: attestation.operatorId,
    publicKeyFingerprint: attestation.publicKeyFingerprint,
    verifiedAtLogical: attestation.verifiedAtLogical,
    cryptographicSignatureValid: true,
    registryStatus: status.status,
    statusEvidenceHash: status.statusHash,
    admitted,
  });
  return cloneAndFreeze({ ...core, admissionHash: sha256Hex(core) });
}

function bundleCore(policy, registry, admissions, admittedIds, rejectedIds, mesh) {
  return cloneAndFreeze({
    format: 'registry-aware-mesh-admission',
    schemaVersion: '1.0.0',
    policyId: policy.policyId,
    registryId: registry.registryId,
    registryHash: registry.registryHash,
    cryptoProfileId: policy.cryptoProfileId,
    admissions,
    admittedAttestationIds: admittedIds,
    rejectedAttestationIds: rejectedIds,
    admittedCount: admittedIds.length,
    rejectedCount: rejectedIds.length,
    mesh,
    status: mesh?.status ?? 'quorum-not-met',
    identityVerified: false,
    approvalAuthority: 'none',
  });
}

export function aggregateVerificationMeshWithRegistry(policy, attestations, cryptoProfile, registry) {
  if (!verifyVerificationMeshPolicy(policy).ok) meshFail('E_KEY_ADMISSION', 'mesh policy must verify', 'meshPolicy');
  if (!verifyVerificationKeyRegistry(registry).ok) meshFail('E_KEY_ADMISSION', 'key registry must verify', 'keyRegistry');
  if (!verifyCryptoPolicyProfile(cryptoProfile).ok || policy.cryptoProfileId !== cryptoProfile.profileId || registry.cryptoProfileId !== cryptoProfile.profileId) {
    meshFail('E_KEY_ADMISSION', 'profile binding mismatch', 'cryptoProfile');
  }
  const entries = readExactDataArray(attestations, 'E_KEY_ADMISSION', 'attestations', false);
  const allowedNodes = new Set(policy.allowedVerifierNodeIds);
  const allowedOperators = new Set(policy.allowedOperatorIds);
  const seen = new Set();
  const pairs = [];
  for (let index = 0; index < entries.length; index += 1) {
    const attestation = entries[index];
    const admission = evaluateAttestationKeyAdmission(registry, attestation, cryptoProfile);
    if (!admission.cryptographicSignatureValid) meshFail('E_KEY_ADMISSION', 'mesh input contains an invalid signature', `attestations.${index}`);
    if (!allowedNodes.has(attestation.verifierNodeId) || !allowedOperators.has(attestation.operatorId)) {
      meshFail('E_KEY_ADMISSION', 'attestation identity is not allowed by mesh policy', `attestations.${index}`);
    }
    if (attestation.artifactType !== policy.artifactType || attestation.artifactHash !== policy.artifactHash || attestation.cryptoProfileId !== policy.cryptoProfileId) {
      meshFail('E_KEY_ADMISSION', 'attestation does not bind to mesh policy artifact/profile', `attestations.${index}`);
    }
    if (seen.has(attestation.attestationId)) meshFail('E_KEY_ADMISSION', 'duplicate attestation ID', `attestations.${index}.attestationId`);
    seen.add(attestation.attestationId);
    pairs.push({ attestation, admission });
  }
  pairs.sort((left, right) => compareUtf8(left.attestation.attestationId, right.attestation.attestationId));
  const admissions = cloneAndFreeze(pairs.map((pair) => pair.admission));
  const admittedPairs = pairs.filter((pair) => pair.admission.admitted);
  const rejectedPairs = pairs.filter((pair) => !pair.admission.admitted);
  const admittedIds = cloneAndFreeze(admittedPairs.map((pair) => pair.attestation.attestationId).sort(compareUtf8));
  const rejectedIds = cloneAndFreeze(rejectedPairs.map((pair) => pair.attestation.attestationId).sort(compareUtf8));
  const mesh = admittedPairs.length
    ? aggregateVerificationMesh(policy, admittedPairs.map((pair) => pair.attestation), cryptoProfile)
    : null;
  const core = bundleCore(policy, registry, admissions, admittedIds, rejectedIds, mesh);
  return cloneAndFreeze({ ...core, bundleHash: sha256Hex(core) });
}

export function verifyRegistryAwareMeshAdmission(bundle, policy, attestations, cryptoProfile, registry) {
  try {
    const rebuilt = aggregateVerificationMeshWithRegistry(policy, attestations, cryptoProfile, registry);
    if (canonicalString(rebuilt) !== canonicalString(bundle)) throw new Error('bundle mismatch');
    return immutableReport({ ok: true, firstMismatch: null, status: rebuilt.status, bundleHash: rebuilt.bundleHash });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'registryAwareMeshAdmission', status: null, bundleHash: null });
  }
}

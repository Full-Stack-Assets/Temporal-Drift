import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';
import { verifyVerificationAttestation } from './attestation.js';
import { verifyCryptoProfile } from './crypto-profile.js';
import { verifyRevocationLedger } from './revocation.js';
import { verifyVerifierRegistry } from './verifier-registry.js';

const POLICY_VERSION = 'quorum-policy-v1';
const RESULT_VERSION = 'verification-quorum-v1';
const HASH_RE = /^[a-f0-9]{64}$/u;
const POLICY_INPUT_KEYS = [
  'policyVersion', 'minimumDistinctVerifiers', 'minimumPassWeight', 'maximumFailWeight',
  'allowAbstain', 'requiredRoles',
];
const POLICY_KEYS = [...POLICY_INPUT_KEYS, 'policyHash'];
const SUBJECT_KEYS = ['subjectType', 'subjectId', 'subjectHash'];
const EVALUATION_KEYS = ['attestations', 'registry', 'cryptoProfile', 'revocations', 'policy', 'subject'];

function exactObject(value, keys, code, label) {
  let normalized;
  try {
    normalized = normalizeCanonicalValue(value);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    throw new TrustKernelError(code, `${label} is not canonical`);
  }
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') {
    throw new TrustKernelError(code, `${label} must be an object`);
  }
  const actual = Object.keys(normalized).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TrustKernelError(code, `${label} contains missing or unknown fields`);
  }
  return normalized;
}

function requireString(value, code, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError(code, `${label} must be a non-empty string`);
  }
}

function utf8Compare(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function policyCore(raw) {
  const input = exactObject(raw, POLICY_INPUT_KEYS, 'E_QUORUM_POLICY', 'Quorum policy config');
  if (input.policyVersion !== POLICY_VERSION) {
    throw new TrustKernelError('E_QUORUM_POLICY', `Unsupported quorum policy version: ${input.policyVersion}`);
  }
  if (!Number.isSafeInteger(input.minimumDistinctVerifiers) || input.minimumDistinctVerifiers < 1) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'minimumDistinctVerifiers must be a positive safe integer');
  }
  if (!Number.isSafeInteger(input.minimumPassWeight) || input.minimumPassWeight < 1) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'minimumPassWeight must be a positive safe integer');
  }
  if (!Number.isSafeInteger(input.maximumFailWeight) || input.maximumFailWeight < 0) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'maximumFailWeight must be a non-negative safe integer');
  }
  if (typeof input.allowAbstain !== 'boolean') {
    throw new TrustKernelError('E_QUORUM_POLICY', 'allowAbstain must be boolean');
  }
  if (!Array.isArray(input.requiredRoles)) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'requiredRoles must be an array');
  }
  const roles = [...input.requiredRoles];
  for (const role of roles) requireString(role, 'E_QUORUM_POLICY', 'required role');
  roles.sort(utf8Compare);
  if (new Set(roles).size !== roles.length) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'requiredRoles must not contain duplicates');
  }
  return {
    policyVersion: input.policyVersion,
    minimumDistinctVerifiers: input.minimumDistinctVerifiers,
    minimumPassWeight: input.minimumPassWeight,
    maximumFailWeight: input.maximumFailWeight,
    allowAbstain: input.allowAbstain,
    requiredRoles: roles,
  };
}

function verifyPolicy(rawPolicy) {
  const policy = exactObject(rawPolicy, POLICY_KEYS, 'E_QUORUM_POLICY', 'Quorum policy');
  const core = policyCore(Object.fromEntries(POLICY_INPUT_KEYS.map((key) => [key, policy[key]])));
  if (typeof policy.policyHash !== 'string' || !HASH_RE.test(policy.policyHash) || policy.policyHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'Quorum policy hash is invalid');
  }
  return policy;
}

function verifySubject(rawSubject) {
  const subject = exactObject(rawSubject, SUBJECT_KEYS, 'E_QUORUM_SUBJECT', 'Quorum subject');
  requireString(subject.subjectType, 'E_QUORUM_SUBJECT', 'subjectType');
  requireString(subject.subjectId, 'E_QUORUM_SUBJECT', 'subjectId');
  if (typeof subject.subjectHash !== 'string' || !HASH_RE.test(subject.subjectHash)) {
    throw new TrustKernelError('E_QUORUM_SUBJECT', 'subjectHash must be a lowercase SHA-256 digest');
  }
  return subject;
}

function attestationMatchesSubject(attestation, subject) {
  return attestation.subjectType === subject.subjectType
    && attestation.subjectId === subject.subjectId
    && attestation.subjectHash === subject.subjectHash;
}

function verifierDescriptor(registry, verifierId) {
  return registry.verifiers.find((entry) => entry.verifierId === verifierId) ?? null;
}

function sorted(values) {
  return [...values].sort(utf8Compare);
}

function resultArtifact(core) {
  return cloneAndFreeze({ ...core, quorumHash: sha256Hex(core) });
}

export function createQuorumPolicy(config) {
  const core = policyCore(config);
  return cloneAndFreeze({ ...core, policyHash: sha256Hex(core) });
}

export function evaluateVerificationQuorum(rawInput) {
  const input = exactObject(rawInput, EVALUATION_KEYS, 'E_QUORUM_POLICY', 'Quorum evaluation input');
  verifyCryptoProfile(input.cryptoProfile);
  verifyVerifierRegistry(input.registry, input.cryptoProfile);
  const revocationReport = verifyRevocationLedger(input.revocations);
  if (revocationReport.registryHash !== input.registry.registryHash) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'Revocation ledger is for a different verifier registry');
  }
  const policy = verifyPolicy(input.policy);
  const subject = verifySubject(input.subject);
  if (!Array.isArray(input.attestations)) {
    throw new TrustKernelError('E_QUORUM_POLICY', 'attestations must be an array');
  }

  const valid = [];
  let invalidEvidenceCount = 0;
  for (const attestation of input.attestations) {
    try {
      verifyVerificationAttestation(attestation, input.registry, input.cryptoProfile, input.revocations);
      if (!attestationMatchesSubject(attestation, subject)) {
        invalidEvidenceCount += 1;
      } else {
        valid.push(attestation);
      }
    } catch {
      invalidEvidenceCount += 1;
    }
  }

  const base = {
    resultVersion: RESULT_VERSION,
    registryHash: input.registry.registryHash,
    policyHash: policy.policyHash,
    subject,
    disposition: 'insufficient-quorum',
    distinctVerifierCount: 0,
    passWeight: 0,
    failWeight: 0,
    abstainWeight: 0,
    invalidEvidenceCount,
    sameVerifierConflictCount: 0,
    requiredRolesSatisfied: policy.requiredRoles.length === 0,
    passVerifierIds: [],
    failVerifierIds: [],
    abstainVerifierIds: [],
    contributingAttestationHashes: [],
    executionAuthority: 'none',
  };

  if (invalidEvidenceCount > 0) {
    return resultArtifact({ ...base, disposition: 'invalid-evidence' });
  }

  const uniqueByHash = new Map();
  for (const attestation of valid) uniqueByHash.set(attestation.attestationHash, attestation);
  const unique = [...uniqueByHash.values()].sort((left, right) => utf8Compare(left.attestationHash, right.attestationHash));
  const contributingAttestationHashes = unique.map((attestation) => attestation.attestationHash);

  const byVerifier = new Map();
  for (const attestation of unique) {
    const group = byVerifier.get(attestation.verifierId) ?? [];
    group.push(attestation);
    byVerifier.set(attestation.verifierId, group);
  }

  const passVerifierIds = [];
  const failVerifierIds = [];
  const abstainVerifierIds = [];
  const passRoles = new Set();
  let passWeight = 0;
  let failWeight = 0;
  let abstainWeight = 0;
  let sameVerifierConflictCount = 0;

  for (const verifierId of sorted(byVerifier.keys())) {
    const group = byVerifier.get(verifierId);
    const verdicts = new Set(group.map((attestation) => attestation.verdict));
    if (verdicts.size > 1) {
      sameVerifierConflictCount += 1;
      continue;
    }
    const verdict = group[0].verdict;
    const descriptor = verifierDescriptor(input.registry, verifierId);
    if (!descriptor) {
      throw new TrustKernelError('E_QUORUM_POLICY', `Verified attestation has no registry descriptor: ${verifierId}`);
    }
    if (verdict === 'pass') {
      passWeight += descriptor.weight;
      passVerifierIds.push(verifierId);
      passRoles.add(descriptor.role);
    } else if (verdict === 'fail') {
      failWeight += descriptor.weight;
      failVerifierIds.push(verifierId);
    } else if (verdict === 'abstain') {
      if (!policy.allowAbstain) {
        return resultArtifact({
          ...base,
          disposition: 'invalid-evidence',
          invalidEvidenceCount: 1,
          contributingAttestationHashes,
        });
      }
      abstainWeight += descriptor.weight;
      abstainVerifierIds.push(verifierId);
    }
  }

  const distinctVerifierCount = byVerifier.size;
  const requiredRolesSatisfied = policy.requiredRoles.every((role) => passRoles.has(role));
  let disposition;
  if (sameVerifierConflictCount > 0) {
    disposition = 'conflicted';
  } else if (passWeight > 0 && failWeight > 0) {
    disposition = 'conflicted';
  } else if (failWeight > policy.maximumFailWeight && passWeight === 0) {
    disposition = 'quorum-fail';
  } else if (distinctVerifierCount >= policy.minimumDistinctVerifiers
      && passWeight >= policy.minimumPassWeight
      && failWeight <= policy.maximumFailWeight
      && requiredRolesSatisfied) {
    disposition = 'quorum-pass';
  } else {
    disposition = 'insufficient-quorum';
  }

  return resultArtifact({
    ...base,
    disposition,
    distinctVerifierCount,
    passWeight,
    failWeight,
    abstainWeight,
    sameVerifierConflictCount,
    requiredRolesSatisfied,
    passVerifierIds: sorted(passVerifierIds),
    failVerifierIds: sorted(failVerifierIds),
    abstainVerifierIds: sorted(abstainVerifierIds),
    contributingAttestationHashes,
  });
}

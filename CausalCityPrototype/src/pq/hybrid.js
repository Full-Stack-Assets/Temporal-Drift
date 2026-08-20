import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';
import { verifyVerificationAttestation } from '../federation/attestation.js';
import { verifyPqCapabilityPolicy } from './capabilities.js';
import { verifyPqEvidenceEnvelope } from './evidence.js';
import { verifyMlDsaEvidence } from './ml-dsa.js';

const HYBRID_VERSION = 'pq-hybrid-result-v1';
const POLICY_RESULT_VERSION = 'pq-policy-result-v1';
const INPUT_KEYS = ['classicalAttestation', 'pqEvidence', 'registry', 'cryptoProfile', 'revocations'];
const HYBRID_KEYS = [
  'hybridVersion', 'runtimeMajor', 'classicalAttestationHash', 'classicalVerified',
  'pqEvidencePresent', 'pqEvidenceHash', 'pqCryptographicallyVerified', 'disposition',
  'postQuantumSystemSecurityClaim', 'executionAuthority', 'hybridHash',
];
const DISPOSITIONS = new Set([
  'hybrid-verified',
  'classical-verified-pq-unavailable',
  'classical-verified-no-pq-evidence',
  'invalid-pq-evidence',
]);
const HASH_RE = /^[a-f0-9]{64}$/u;

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

function unsignedFromClassical(attestation) {
  const {
    algorithm: _algorithm,
    signatureBase64: _signatureBase64,
    attestationHash: _attestationHash,
    ...unsigned
  } = attestation;
  return unsigned;
}

function hybridArtifact(core) {
  return cloneAndFreeze({ ...core, hybridHash: sha256Hex(core) });
}

function invalidPqCore(runtimeMajor, classicalAttestationHash, pqEvidenceHash = null) {
  return {
    hybridVersion: HYBRID_VERSION,
    runtimeMajor,
    classicalAttestationHash,
    classicalVerified: true,
    pqEvidencePresent: pqEvidenceHash !== null,
    pqEvidenceHash,
    pqCryptographicallyVerified: false,
    disposition: 'invalid-pq-evidence',
    postQuantumSystemSecurityClaim: false,
    executionAuthority: 'none',
  };
}

function verifyHybridResult(raw) {
  const result = exactObject(raw, HYBRID_KEYS, 'E_PQ_EVIDENCE', 'Hybrid verification result');
  if (result.hybridVersion !== HYBRID_VERSION
      || ![22, 24].includes(result.runtimeMajor)
      || result.classicalVerified !== true
      || typeof result.pqEvidencePresent !== 'boolean'
      || typeof result.pqCryptographicallyVerified !== 'boolean'
      || !DISPOSITIONS.has(result.disposition)
      || result.postQuantumSystemSecurityClaim !== false
      || result.executionAuthority !== 'none') {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'Hybrid result semantics are invalid');
  }
  if (!HASH_RE.test(result.classicalAttestationHash) || !HASH_RE.test(result.hybridHash)) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'Hybrid result hashes are invalid');
  }
  if (result.pqEvidenceHash !== null && !HASH_RE.test(result.pqEvidenceHash)) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'Hybrid PQ evidence hash is invalid');
  }
  const core = Object.fromEntries(HYBRID_KEYS.filter((key) => key !== 'hybridHash').map((key) => [key, result[key]]));
  if (result.hybridHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'Hybrid result content hash is invalid');
  }
  return result;
}

export function evaluateHybridAttestation(rawInput, runtimeMajor = Number(process.versions.node.split('.')[0])) {
  const input = exactObject(rawInput, INPUT_KEYS, 'E_PQ_EVIDENCE', 'Hybrid attestation input');

  verifyVerificationAttestation(
    input.classicalAttestation,
    input.registry,
    input.cryptoProfile,
    input.revocations,
  );

  if (![22, 24].includes(runtimeMajor)) {
    throw new TrustKernelError('E_PQ_CAPABILITY', `Unsupported runtime major: ${runtimeMajor}`);
  }

  const classicalHash = input.classicalAttestation.attestationHash;
  if (input.pqEvidence === null) {
    return hybridArtifact({
      hybridVersion: HYBRID_VERSION,
      runtimeMajor,
      classicalAttestationHash: classicalHash,
      classicalVerified: true,
      pqEvidencePresent: false,
      pqEvidenceHash: null,
      pqCryptographicallyVerified: false,
      disposition: 'classical-verified-no-pq-evidence',
      postQuantumSystemSecurityClaim: false,
      executionAuthority: 'none',
    });
  }

  let evidenceReport;
  try {
    evidenceReport = verifyPqEvidenceEnvelope(input.pqEvidence);
  } catch {
    return hybridArtifact(invalidPqCore(runtimeMajor, classicalHash));
  }

  if (input.pqEvidence.subjectAttestationHash !== classicalHash) {
    return hybridArtifact(invalidPqCore(runtimeMajor, classicalHash, evidenceReport.pqEvidenceHash));
  }

  let pqResult;
  try {
    pqResult = verifyMlDsaEvidence(input.pqEvidence, unsignedFromClassical(input.classicalAttestation), runtimeMajor);
  } catch {
    return hybridArtifact(invalidPqCore(runtimeMajor, classicalHash, evidenceReport.pqEvidenceHash));
  }

  let disposition = 'invalid-pq-evidence';
  let pqCryptographicallyVerified = false;
  if (pqResult.disposition === 'pq-verified') {
    disposition = 'hybrid-verified';
    pqCryptographicallyVerified = true;
  } else if (pqResult.disposition === 'pq-unavailable') {
    disposition = 'classical-verified-pq-unavailable';
  }

  return hybridArtifact({
    hybridVersion: HYBRID_VERSION,
    runtimeMajor,
    classicalAttestationHash: classicalHash,
    classicalVerified: true,
    pqEvidencePresent: true,
    pqEvidenceHash: evidenceReport.pqEvidenceHash,
    pqCryptographicallyVerified,
    disposition,
    postQuantumSystemSecurityClaim: false,
    executionAuthority: 'none',
  });
}

export function evaluatePqMigrationPolicy(rawHybridResult, policy) {
  const hybrid = verifyHybridResult(rawHybridResult);
  verifyPqCapabilityPolicy(policy);

  let compliant = false;
  let reasonCode = 'pq-verification-required';
  if (hybrid.disposition === 'hybrid-verified') {
    compliant = true;
    reasonCode = 'hybrid-verified';
  } else if (hybrid.disposition === 'classical-verified-pq-unavailable') {
    compliant = policy.allowPqUnavailable && !policy.requireHybridForRelease;
    reasonCode = compliant ? 'pq-unavailable-allowed' : 'pq-verification-required';
  } else if (hybrid.disposition === 'classical-verified-no-pq-evidence') {
    compliant = policy.allowClassicalOnly && !policy.requireHybridForRelease;
    reasonCode = compliant ? 'classical-only-allowed' : 'pq-evidence-required';
  } else {
    compliant = false;
    reasonCode = 'invalid-pq-evidence';
  }

  const core = {
    policyResultVersion: POLICY_RESULT_VERSION,
    policyHash: policy.policyHash,
    hybridHash: hybrid.hybridHash,
    compliant,
    reasonCode,
    cryptographicDisposition: hybrid.disposition,
    executionAuthority: 'none',
  };
  return cloneAndFreeze({ ...core, policyResultHash: sha256Hex(core) });
}

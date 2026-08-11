import { normalizeCanonicalValue, sha256BytesHex, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

const VERSION = 'pq-signature-evidence-v1';
const HASH_RE = /^[a-f0-9]{64}$/u;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const INPUT_KEYS = [
  'algorithm', 'subjectAttestationHash', 'unsignedPayloadHash', 'publicKeySpkiBase64',
  'publicKeyHash', 'signatureBase64', 'signatureHash', 'contextBase64', 'sourceRuntimeClass',
];
const ARTIFACT_KEYS = [
  'pqEvidenceVersion', ...INPUT_KEYS, 'claimClass', 'executionAuthority', 'pqEvidenceHash',
];

function exactObject(value, keys, label) {
  let normalized;
  try {
    normalized = normalizeCanonicalValue(value);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} is not canonical`);
  }
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') {
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} must be an object`);
  }
  const actual = Object.keys(normalized).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} contains missing or unknown fields`);
  }
  return normalized;
}

function requireHash(value, label) {
  if (typeof value !== 'string' || !HASH_RE.test(value)) {
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} must be a lowercase SHA-256 digest`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} must be a non-empty string`);
  }
}

function decodeCanonicalBase64(value, label, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0) || !BASE64_RE.test(value)) {
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} must be canonical Base64`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) {
    throw new TrustKernelError('E_PQ_EVIDENCE', `${label} must be canonical Base64`);
  }
  return bytes;
}

function validatedCore(raw) {
  const input = exactObject(raw, INPUT_KEYS, 'PQ evidence input');
  if (input.algorithm !== 'ml-dsa-65') {
    throw new TrustKernelError('E_PQ_EVIDENCE', `Unsupported PQ evidence algorithm: ${input.algorithm}`);
  }
  requireHash(input.subjectAttestationHash, 'subjectAttestationHash');
  requireHash(input.unsignedPayloadHash, 'unsignedPayloadHash');
  requireHash(input.publicKeyHash, 'publicKeyHash');
  requireHash(input.signatureHash, 'signatureHash');
  requireString(input.sourceRuntimeClass, 'sourceRuntimeClass');
  const publicKey = decodeCanonicalBase64(input.publicKeySpkiBase64, 'publicKeySpkiBase64');
  const signature = decodeCanonicalBase64(input.signatureBase64, 'signatureBase64');
  decodeCanonicalBase64(input.contextBase64, 'contextBase64', true);
  if (sha256BytesHex(publicKey) !== input.publicKeyHash) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'publicKeyHash does not match publicKeySpkiBase64');
  }
  if (sha256BytesHex(signature) !== input.signatureHash) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'signatureHash does not match signatureBase64');
  }
  return input;
}

function coreFromArtifact(evidence) {
  return Object.fromEntries(INPUT_KEYS.map((key) => [key, evidence[key]]));
}

function envelopeCore(input) {
  return {
    pqEvidenceVersion: VERSION,
    ...input,
    claimClass: 'optional-post-quantum-signature-evidence',
    executionAuthority: 'none',
  };
}

export function createPqEvidenceEnvelope(config) {
  const input = validatedCore(config);
  const core = envelopeCore(input);
  return cloneAndFreeze({ ...core, pqEvidenceHash: sha256Hex(core) });
}

export function verifyPqEvidenceEnvelope(rawEvidence) {
  const evidence = exactObject(rawEvidence, ARTIFACT_KEYS, 'PQ evidence');
  if (evidence.pqEvidenceVersion !== VERSION
      || evidence.claimClass !== 'optional-post-quantum-signature-evidence'
      || evidence.executionAuthority !== 'none') {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'PQ evidence version, claim class, or authority is invalid');
  }
  requireHash(evidence.pqEvidenceHash, 'pqEvidenceHash');
  const input = validatedCore(coreFromArtifact(evidence));
  const core = envelopeCore(input);
  if (evidence.pqEvidenceHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_PQ_EVIDENCE', 'PQ evidence content hash is invalid');
  }
  return cloneAndFreeze({
    ok: true,
    pqEvidenceHash: evidence.pqEvidenceHash,
    algorithm: evidence.algorithm,
    subjectAttestationHash: evidence.subjectAttestationHash,
    unsignedPayloadHash: evidence.unsignedPayloadHash,
  });
}

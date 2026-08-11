import {
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from 'node:crypto';

import {
  canonicalBytes,
  normalizeCanonicalValue,
  sha256Hex,
} from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';
import { verifyCryptoProfile } from './crypto-profile.js';
import { verifyVerifierRegistry } from './verifier-registry.js';

const ATTESTATION_VERSION = 'verification-attestation-v1';
const HASH_RE = /^[a-f0-9]{64}$/u;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;
const VERDICTS = new Set(['pass', 'fail', 'abstain']);
const UNSIGNED_KEYS = [
  'attestationVersion',
  'registryHash',
  'verifierId',
  'keyId',
  'logicalTime',
  'subjectType',
  'subjectId',
  'subjectHash',
  'verificationProcedureId',
  'verificationProcedureHash',
  'verdict',
  'findingsHash',
  'limitationsHash',
];
const SIGNED_KEYS = [...UNSIGNED_KEYS, 'algorithm', 'signatureBase64', 'attestationHash'];

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

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', `${label} must be a non-empty string`);
  }
}

function requireHash(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !HASH_RE.test(value)) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', `${label} must be a lowercase SHA-256 hex digest${nullable ? ' or null' : ''}`);
  }
}

function resolveVerifier(registry, verifierId, keyId) {
  const verifier = registry.verifiers.find((entry) => entry.verifierId === verifierId && entry.keyId === keyId);
  if (!verifier) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', `Unknown verifier/key pair: ${verifierId}/${keyId}`);
  }
  return verifier;
}

function validateUnsigned(raw, registry, profile) {
  verifyCryptoProfile(profile);
  verifyVerifierRegistry(registry, profile);
  const unsigned = exactObject(raw, UNSIGNED_KEYS, 'E_ATTESTATION_SCHEMA', 'Verification attestation payload');

  if (unsigned.attestationVersion !== ATTESTATION_VERSION) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', `Unsupported attestation version: ${unsigned.attestationVersion}`);
  }
  if (unsigned.registryHash !== registry.registryHash) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', 'Attestation registry hash does not match supplied registry');
  }
  requireString(unsigned.verifierId, 'verifierId');
  requireString(unsigned.keyId, 'keyId');
  if (!Number.isSafeInteger(unsigned.logicalTime) || unsigned.logicalTime < 0) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', 'logicalTime must be a non-negative safe integer');
  }
  requireString(unsigned.subjectType, 'subjectType');
  requireString(unsigned.subjectId, 'subjectId');
  requireHash(unsigned.subjectHash, 'subjectHash');
  requireString(unsigned.verificationProcedureId, 'verificationProcedureId');
  requireHash(unsigned.verificationProcedureHash, 'verificationProcedureHash');
  if (!VERDICTS.has(unsigned.verdict)) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', `Unsupported verdict: ${unsigned.verdict}`);
  }
  requireHash(unsigned.findingsHash, 'findingsHash', true);
  requireHash(unsigned.limitationsHash, 'limitationsHash', true);

  const verifier = resolveVerifier(registry, unsigned.verifierId, unsigned.keyId);
  if (verifier.algorithm !== 'ed25519' || !profile.signatureAlgorithms.includes(verifier.algorithm)) {
    throw new TrustKernelError('E_SIGNATURE_ALGORITHM', `Unsupported signature algorithm: ${verifier.algorithm}`);
  }
  if (unsigned.logicalTime < verifier.validFromLogicalTime
      || (verifier.validUntilLogicalTime !== null && unsigned.logicalTime > verifier.validUntilLogicalTime)) {
    throw new TrustKernelError('E_ATTESTATION_SCHEMA', 'Attestation logical time falls outside verifier key validity interval');
  }

  return { unsigned, verifier };
}

function publicKeyBase64FromPrivate(privateKeyPem) {
  try {
    const privateKey = createPrivateKey(privateKeyPem);
    const publicKey = createPublicKey(privateKey);
    const der = publicKey.export({ format: 'der', type: 'spki' });
    return { privateKey, publicKeySpkiBase64: der.toString('base64') };
  } catch (error) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', `Unable to load Ed25519 private key: ${error.message}`);
  }
}

function publicKeyFromRegistry(verifier) {
  try {
    return createPublicKey({
      key: Buffer.from(verifier.publicKeySpkiBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
  } catch (error) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', `Unable to load verifier public key: ${error.message}`);
  }
}

function signatureBytes(signatureBase64) {
  if (typeof signatureBase64 !== 'string'
      || signatureBase64.length === 0
      || signatureBase64.length % 4 !== 0
      || !BASE64_RE.test(signatureBase64)) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', 'signatureBase64 must be canonical Base64');
  }
  const bytes = Buffer.from(signatureBase64, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== signatureBase64) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', 'Ed25519 signature must decode to exactly 64 canonical bytes');
  }
  return bytes;
}

function unsignedFromSigned(attestation) {
  return Object.fromEntries(UNSIGNED_KEYS.map((key) => [key, attestation[key]]));
}

export function createVerificationAttestation(unsignedPayload, privateKeyPem, registry, profile) {
  const { unsigned, verifier } = validateUnsigned(unsignedPayload, registry, profile);
  const { privateKey, publicKeySpkiBase64 } = publicKeyBase64FromPrivate(privateKeyPem);
  if (publicKeySpkiBase64 !== verifier.publicKeySpkiBase64) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', 'Private key does not match the verifier registry public key');
  }

  let signatureBase64;
  try {
    signatureBase64 = cryptoSign(null, canonicalBytes(unsigned), privateKey).toString('base64');
  } catch (error) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', `Ed25519 signing failed: ${error.message}`);
  }
  signatureBytes(signatureBase64);

  const signedCore = {
    ...unsigned,
    algorithm: 'ed25519',
    signatureBase64,
  };
  return cloneAndFreeze({ ...signedCore, attestationHash: sha256Hex(signedCore) });
}

export function verifyVerificationAttestation(rawAttestation, registry, profile) {
  const attestation = exactObject(rawAttestation, SIGNED_KEYS, 'E_ATTESTATION_SCHEMA', 'Verification attestation');
  const unsigned = unsignedFromSigned(attestation);
  const { verifier } = validateUnsigned(unsigned, registry, profile);

  if (attestation.algorithm !== 'ed25519') {
    throw new TrustKernelError('E_SIGNATURE_ALGORITHM', `Unsupported attestation algorithm: ${attestation.algorithm}`);
  }
  const signature = signatureBytes(attestation.signatureBase64);
  requireHash(attestation.attestationHash, 'attestationHash');
  const expectedHash = sha256Hex({
    ...unsigned,
    algorithm: attestation.algorithm,
    signatureBase64: attestation.signatureBase64,
  });
  if (attestation.attestationHash !== expectedHash) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', 'Attestation content hash does not match signed envelope');
  }

  const publicKey = publicKeyFromRegistry(verifier);
  let verified = false;
  try {
    verified = cryptoVerify(null, canonicalBytes(unsigned), publicKey, signature);
  } catch (error) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', `Ed25519 verification failed: ${error.message}`);
  }
  if (!verified) {
    throw new TrustKernelError('E_ATTESTATION_SIGNATURE', 'Ed25519 signature verification failed');
  }

  return cloneAndFreeze({
    ok: true,
    attestationHash: attestation.attestationHash,
    verifierId: attestation.verifierId,
    verdict: attestation.verdict,
    subjectHash: attestation.subjectHash,
  });
}

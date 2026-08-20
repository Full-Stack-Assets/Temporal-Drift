import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';
import { verifyCryptoProfile } from './crypto-profile.js';

const REGISTRY_VERSION = 'verifier-registry-v1';
const REGISTRY_KEYS = ['registryVersion', 'cryptoProfileHash', 'verifiers'];
const REGISTRY_ARTIFACT_KEYS = [...REGISTRY_KEYS, 'registryHash'];
const VERIFIER_KEYS = [
  'verifierId',
  'keyId',
  'algorithm',
  'publicKeySpkiBase64',
  'weight',
  'validFromLogicalTime',
  'validUntilLogicalTime',
  'role',
];
const HASH_RE = /^[a-f0-9]{64}$/u;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

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

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', `${label} must be a non-empty string`);
  }
}

function verifierCompare(left, right) {
  const verifierOrder = Buffer.compare(Buffer.from(left.verifierId, 'utf8'), Buffer.from(right.verifierId, 'utf8'));
  if (verifierOrder !== 0) return verifierOrder;
  return Buffer.compare(Buffer.from(left.keyId, 'utf8'), Buffer.from(right.keyId, 'utf8'));
}

function validateVerifier(raw, profile) {
  const verifier = exactObject(raw, VERIFIER_KEYS, 'E_VERIFIER_REGISTRY', 'Verifier descriptor');
  nonEmptyString(verifier.verifierId, 'verifierId');
  nonEmptyString(verifier.keyId, 'keyId');
  nonEmptyString(verifier.role, 'role');
  if (!profile.signatureAlgorithms.includes(verifier.algorithm)) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', `Unsupported verifier signature algorithm: ${verifier.algorithm}`);
  }
  if (typeof verifier.publicKeySpkiBase64 !== 'string'
      || verifier.publicKeySpkiBase64.length === 0
      || verifier.publicKeySpkiBase64.length % 4 !== 0
      || !BASE64_RE.test(verifier.publicKeySpkiBase64)) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'publicKeySpkiBase64 must be canonical Base64');
  }
  if (!Number.isSafeInteger(verifier.weight) || verifier.weight <= 0) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'Verifier weight must be a positive safe integer');
  }
  if (!Number.isSafeInteger(verifier.validFromLogicalTime) || verifier.validFromLogicalTime < 0) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'validFromLogicalTime must be a non-negative safe integer');
  }
  if (verifier.validUntilLogicalTime !== null
      && (!Number.isSafeInteger(verifier.validUntilLogicalTime)
        || verifier.validUntilLogicalTime < verifier.validFromLogicalTime)) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'validUntilLogicalTime must be null or at least validFromLogicalTime');
  }
  return verifier;
}

function registryCore(config, profile) {
  const normalized = exactObject(config, REGISTRY_KEYS, 'E_VERIFIER_REGISTRY', 'Verifier registry config');
  if (normalized.registryVersion !== REGISTRY_VERSION) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', `Unsupported registry version: ${normalized.registryVersion}`);
  }
  if (!HASH_RE.test(normalized.cryptoProfileHash) || normalized.cryptoProfileHash !== profile.profileHash) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'Verifier registry crypto profile hash does not match the supplied profile');
  }
  if (!Array.isArray(normalized.verifiers) || normalized.verifiers.length === 0) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'Verifier registry requires at least one verifier');
  }
  const verifiers = normalized.verifiers.map((entry) => validateVerifier(entry, profile)).sort(verifierCompare);
  const verifierIds = new Set();
  const keyIds = new Set();
  for (const verifier of verifiers) {
    if (verifierIds.has(verifier.verifierId)) {
      throw new TrustKernelError('E_VERIFIER_REGISTRY', `Duplicate verifierId: ${verifier.verifierId}`);
    }
    if (keyIds.has(verifier.keyId)) {
      throw new TrustKernelError('E_VERIFIER_REGISTRY', `Duplicate keyId: ${verifier.keyId}`);
    }
    verifierIds.add(verifier.verifierId);
    keyIds.add(verifier.keyId);
  }
  return {
    registryVersion: normalized.registryVersion,
    cryptoProfileHash: normalized.cryptoProfileHash,
    verifiers,
  };
}

export function createVerifierRegistry(config, profile) {
  verifyCryptoProfile(profile);
  const core = registryCore(config, profile);
  return cloneAndFreeze({ ...core, registryHash: sha256Hex(core) });
}

export function verifyVerifierRegistry(registry, profile) {
  verifyCryptoProfile(profile);
  const normalized = exactObject(registry, REGISTRY_ARTIFACT_KEYS, 'E_VERIFIER_REGISTRY', 'Verifier registry');
  const core = registryCore({
    registryVersion: normalized.registryVersion,
    cryptoProfileHash: normalized.cryptoProfileHash,
    verifiers: normalized.verifiers,
  }, profile);
  if (normalized.registryHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_VERIFIER_REGISTRY', 'Verifier registry hash is invalid');
  }
  return cloneAndFreeze({ ok: true, registryHash: normalized.registryHash, verifierCount: core.verifiers.length });
}

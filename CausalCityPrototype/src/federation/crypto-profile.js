import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

const PROFILE_VERSION = 'federation-crypto-v1';
const EXACT_CONFIG_KEYS = ['profileVersion'];
const EXACT_PROFILE_KEYS = [
  'profileVersion',
  'canonicalization',
  'hashAlgorithms',
  'signatureAlgorithms',
  'primarySignatureAlgorithm',
  'unsupportedFutureAlgorithms',
  'profileHash',
];

function assertPlainShape(value, keys, code, label) {
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
  const actualKeys = Object.keys(normalized).sort();
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new TrustKernelError(code, `${label} contains missing or unknown fields`);
  }
  return normalized;
}

function profileCore(profileVersion) {
  return {
    profileVersion,
    canonicalization: 'canonical-v1',
    hashAlgorithms: ['sha256'],
    signatureAlgorithms: ['ed25519'],
    primarySignatureAlgorithm: 'ed25519',
    unsupportedFutureAlgorithms: [],
  };
}

export function createCryptoProfile(config) {
  const normalized = assertPlainShape(config, EXACT_CONFIG_KEYS, 'E_CRYPTO_PROFILE', 'Crypto profile config');
  if (normalized.profileVersion !== PROFILE_VERSION) {
    throw new TrustKernelError('E_CRYPTO_PROFILE', `Unsupported crypto profile version: ${normalized.profileVersion}`);
  }
  const core = profileCore(normalized.profileVersion);
  return cloneAndFreeze({ ...core, profileHash: sha256Hex(core) });
}

export function verifyCryptoProfile(profile) {
  const normalized = assertPlainShape(profile, EXACT_PROFILE_KEYS, 'E_CRYPTO_PROFILE', 'Crypto profile');
  const expectedCore = profileCore(normalized.profileVersion);
  if (normalized.profileVersion !== PROFILE_VERSION
      || normalized.canonicalization !== expectedCore.canonicalization
      || JSON.stringify(normalized.hashAlgorithms) !== JSON.stringify(expectedCore.hashAlgorithms)
      || JSON.stringify(normalized.signatureAlgorithms) !== JSON.stringify(expectedCore.signatureAlgorithms)
      || normalized.primarySignatureAlgorithm !== expectedCore.primarySignatureAlgorithm
      || JSON.stringify(normalized.unsupportedFutureAlgorithms) !== JSON.stringify(expectedCore.unsupportedFutureAlgorithms)
      || normalized.profileHash !== sha256Hex(expectedCore)) {
    throw new TrustKernelError('E_CRYPTO_PROFILE', 'Crypto profile content or hash is invalid');
  }
  return cloneAndFreeze({ ok: true, profileHash: normalized.profileHash });
}

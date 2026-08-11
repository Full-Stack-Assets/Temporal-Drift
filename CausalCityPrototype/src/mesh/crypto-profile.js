import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  immutableReport,
  meshFail,
  normalizeBoolean,
  normalizeText,
} from './common.js';

const INPUT_KEYS = [
  'profileName',
  'hashAlgorithm',
  'signatureAlgorithm',
  'publicKeyEncoding',
  'signatureEncoding',
  'postQuantumMode',
  'hybridSignatureRequired',
];

const OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  'profileName',
  'hashAlgorithm',
  'signatureAlgorithm',
  'publicKeyEncoding',
  'signatureEncoding',
  'postQuantumMode',
  'hybridSignatureRequired',
  'quantumResistanceClaimed',
  'profileId',
];

function normalizeInput(input) {
  const code = 'E_CRYPTO_PROFILE_SCHEMA';
  assertExactPlainObject(input, INPUT_KEYS, code, 'cryptoProfile');
  const normalized = {
    profileName: normalizeText(input.profileName, code, 'cryptoProfile.profileName'),
    hashAlgorithm: normalizeText(input.hashAlgorithm, code, 'cryptoProfile.hashAlgorithm'),
    signatureAlgorithm: normalizeText(input.signatureAlgorithm, code, 'cryptoProfile.signatureAlgorithm'),
    publicKeyEncoding: normalizeText(input.publicKeyEncoding, code, 'cryptoProfile.publicKeyEncoding'),
    signatureEncoding: normalizeText(input.signatureEncoding, code, 'cryptoProfile.signatureEncoding'),
    postQuantumMode: normalizeText(input.postQuantumMode, code, 'cryptoProfile.postQuantumMode'),
    hybridSignatureRequired: normalizeBoolean(input.hybridSignatureRequired, code, 'cryptoProfile.hybridSignatureRequired'),
  };
  if (normalized.hashAlgorithm !== 'sha256') meshFail(code, 'Only sha256 is implemented in v1', 'cryptoProfile.hashAlgorithm');
  if (normalized.signatureAlgorithm !== 'ed25519') meshFail(code, 'Only ed25519 is implemented in v1', 'cryptoProfile.signatureAlgorithm');
  if (normalized.publicKeyEncoding !== 'spki-der-base64url') meshFail(code, 'Unsupported public-key encoding', 'cryptoProfile.publicKeyEncoding');
  if (normalized.signatureEncoding !== 'base64url') meshFail(code, 'Unsupported signature encoding', 'cryptoProfile.signatureEncoding');
  if (normalized.postQuantumMode !== 'not-implemented') meshFail(code, 'v1 cannot claim post-quantum implementation', 'cryptoProfile.postQuantumMode');
  if (normalized.hybridSignatureRequired !== false) meshFail(code, 'v1 cannot require an unimplemented hybrid signature', 'cryptoProfile.hybridSignatureRequired');
  return cloneAndFreeze(normalized);
}

function profileCore(input) {
  return cloneAndFreeze({
    format: 'crypto-policy-profile',
    schemaVersion: '1.0.0',
    ...input,
    quantumResistanceClaimed: false,
  });
}

export function createCryptoPolicyProfile(input) {
  const core = profileCore(normalizeInput(input));
  return cloneAndFreeze({ ...core, profileId: `crypto-profile-${sha256Hex(core)}` });
}

export function verifyCryptoPolicyProfile(profile) {
  try {
    assertExactPlainObject(profile, OUTPUT_KEYS, 'E_CRYPTO_PROFILE_SCHEMA', 'cryptoProfile');
    if (profile.format !== 'crypto-policy-profile' || profile.schemaVersion !== '1.0.0' || profile.quantumResistanceClaimed !== false) {
      return immutableReport({ ok: false, firstMismatch: 'cryptoProfile', profileId: null });
    }
    const rebuilt = createCryptoPolicyProfile(Object.fromEntries(INPUT_KEYS.map((key) => [key, profile[key]])));
    if (canonicalString(rebuilt) !== canonicalString(profile)) return immutableReport({ ok: false, firstMismatch: 'cryptoProfile.profileId', profileId: null });
    return immutableReport({ ok: true, firstMismatch: null, profileId: rebuilt.profileId });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'cryptoProfile', profileId: null });
  }
}

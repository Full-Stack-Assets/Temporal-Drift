import {
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from 'node:crypto';

import {
  canonicalBytes,
  canonicalString,
  sha256BytesHex,
  sha256Hex,
} from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  decodeBase64url,
  immutableReport,
  meshFail,
  normalizeHash,
  normalizeNonNegativeInteger,
  normalizeStringSet,
  normalizeText,
} from './common.js';
import { verifyCryptoPolicyProfile } from './crypto-profile.js';

const INPUT_KEYS = [
  'artifactType',
  'artifactId',
  'artifactHash',
  'verifierNodeId',
  'operatorId',
  'verificationMethod',
  'verificationVersion',
  'verifiedAtLogical',
  'runtime',
  'evidenceHash',
  'result',
  'failureCodes',
];

const OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  ...INPUT_KEYS,
  'cryptoProfileId',
  'independenceStatus',
  'executionAuthority',
  'statementHash',
  'publicKeyEncoding',
  'publicKey',
  'publicKeyFingerprint',
  'signatureAlgorithm',
  'signatureEncoding',
  'signature',
  'attestationId',
];

const FAILURE_CODE = /^E_[A-Z0-9_]+$/u;

function requireProfile(profile) {
  const report = verifyCryptoPolicyProfile(profile);
  if (!report.ok) meshFail('E_ATTESTATION_SCHEMA', 'crypto profile must verify', 'cryptoProfile');
  return profile;
}

function normalizeInput(input) {
  const code = 'E_ATTESTATION_SCHEMA';
  assertExactPlainObject(input, INPUT_KEYS, code, 'attestationInput');
  const result = normalizeText(input.result, code, 'attestationInput.result');
  if (result !== 'pass' && result !== 'fail') meshFail(code, 'result must be pass or fail', 'attestationInput.result');
  const failureCodes = normalizeStringSet(input.failureCodes, code, 'attestationInput.failureCodes', { pattern: FAILURE_CODE, allowEmpty: true });
  if (result === 'pass' && failureCodes.length !== 0) meshFail(code, 'pass attestations cannot contain failure codes', 'attestationInput.failureCodes');
  if (result === 'fail' && failureCodes.length === 0) meshFail(code, 'fail attestations require at least one failure code', 'attestationInput.failureCodes');
  return cloneAndFreeze({
    artifactType: normalizeText(input.artifactType, code, 'attestationInput.artifactType'),
    artifactId: normalizeText(input.artifactId, code, 'attestationInput.artifactId'),
    artifactHash: normalizeHash(input.artifactHash, code, 'attestationInput.artifactHash'),
    verifierNodeId: normalizeText(input.verifierNodeId, code, 'attestationInput.verifierNodeId'),
    operatorId: normalizeText(input.operatorId, code, 'attestationInput.operatorId'),
    verificationMethod: normalizeText(input.verificationMethod, code, 'attestationInput.verificationMethod'),
    verificationVersion: normalizeText(input.verificationVersion, code, 'attestationInput.verificationVersion'),
    verifiedAtLogical: normalizeNonNegativeInteger(input.verifiedAtLogical, code, 'attestationInput.verifiedAtLogical'),
    runtime: normalizeText(input.runtime, code, 'attestationInput.runtime'),
    evidenceHash: normalizeHash(input.evidenceHash, code, 'attestationInput.evidenceHash'),
    result,
    failureCodes,
  });
}

function statementCore(input, profileId) {
  return cloneAndFreeze({
    format: 'verification-statement',
    schemaVersion: '1.0.0',
    ...input,
    cryptoProfileId: profileId,
    independenceStatus: 'declared-not-proven',
    executionAuthority: 'none',
  });
}

function signedStatement(core) {
  return cloneAndFreeze({ ...core, statementHash: sha256Hex(core) });
}

function attestationCore(statement, profile, publicKey, publicKeyFingerprint, signature) {
  return cloneAndFreeze({
    format: 'verification-attestation',
    schemaVersion: '1.0.0',
    ...Object.fromEntries(INPUT_KEYS.map((key) => [key, statement[key]])),
    cryptoProfileId: statement.cryptoProfileId,
    independenceStatus: statement.independenceStatus,
    executionAuthority: statement.executionAuthority,
    statementHash: statement.statementHash,
    publicKeyEncoding: profile.publicKeyEncoding,
    publicKey,
    publicKeyFingerprint,
    signatureAlgorithm: profile.signatureAlgorithm,
    signatureEncoding: profile.signatureEncoding,
    signature,
  });
}

export function createVerificationAttestation(input, privateKeyPem, cryptoProfile) {
  const profile = requireProfile(cryptoProfile);
  const normalized = normalizeInput(input);
  let privateKey;
  try {
    privateKey = createPrivateKey(privateKeyPem);
  } catch {
    meshFail('E_ATTESTATION_SCHEMA', 'private key must be valid PKCS#8 key material', 'privateKey');
  }
  if (privateKey.asymmetricKeyType !== 'ed25519') meshFail('E_ATTESTATION_SCHEMA', 'private key must be Ed25519', 'privateKey');
  const publicKeyObject = createPublicKey(privateKey);
  const publicKeyBytes = publicKeyObject.export({ type: 'spki', format: 'der' });
  const publicKey = Buffer.from(publicKeyBytes).toString('base64url');
  const publicKeyFingerprint = sha256BytesHex(Buffer.from(publicKeyBytes));
  const statement = signedStatement(statementCore(normalized, profile.profileId));
  const signature = signBytes(null, canonicalBytes(statement), privateKey).toString('base64url');
  const core = attestationCore(statement, profile, publicKey, publicKeyFingerprint, signature);
  return cloneAndFreeze({ ...core, attestationId: `attestation-${sha256Hex(core)}` });
}

export function verifyVerificationAttestation(attestation, cryptoProfile) {
  try {
    const profileReport = verifyCryptoPolicyProfile(cryptoProfile);
    if (!profileReport.ok) return immutableReport({ ok: false, firstMismatch: 'cryptoProfile', attestationId: null, result: null });
    assertExactPlainObject(attestation, OUTPUT_KEYS, 'E_ATTESTATION_SCHEMA', 'attestation');
    if (attestation.format !== 'verification-attestation' || attestation.schemaVersion !== '1.0.0') throw new Error('format');
    if (attestation.cryptoProfileId !== cryptoProfile.profileId) throw new Error('profile');
    if (attestation.publicKeyEncoding !== cryptoProfile.publicKeyEncoding || attestation.signatureAlgorithm !== cryptoProfile.signatureAlgorithm || attestation.signatureEncoding !== cryptoProfile.signatureEncoding) throw new Error('algorithms');
    if (attestation.independenceStatus !== 'declared-not-proven' || attestation.executionAuthority !== 'none') throw new Error('authority');

    const normalized = normalizeInput(Object.fromEntries(INPUT_KEYS.map((key) => [key, attestation[key]])));
    const statement = signedStatement(statementCore(normalized, cryptoProfile.profileId));
    if (statement.statementHash !== attestation.statementHash) throw new Error('statementHash');

    const publicKeyBytes = decodeBase64url(attestation.publicKey, 'E_ATTESTATION_SCHEMA', 'attestation.publicKey');
    if (sha256BytesHex(publicKeyBytes) !== attestation.publicKeyFingerprint) throw new Error('fingerprint');
    const publicKeyObject = createPublicKey({ key: publicKeyBytes, type: 'spki', format: 'der' });
    if (publicKeyObject.asymmetricKeyType !== 'ed25519') throw new Error('keyType');
    const signatureBytes = decodeBase64url(attestation.signature, 'E_ATTESTATION_SCHEMA', 'attestation.signature');
    if (!verifyBytes(null, canonicalBytes(statement), publicKeyObject, signatureBytes)) throw new Error('signature');

    const core = attestationCore(statement, cryptoProfile, attestation.publicKey, attestation.publicKeyFingerprint, attestation.signature);
    const expectedId = `attestation-${sha256Hex(core)}`;
    if (expectedId !== attestation.attestationId || canonicalString({ ...core, attestationId: expectedId }) !== canonicalString(attestation)) throw new Error('attestationId');
    return immutableReport({ ok: true, firstMismatch: null, attestationId: expectedId, result: normalized.result });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'attestation', attestationId: null, result: null });
  }
}

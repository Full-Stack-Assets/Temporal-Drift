import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCryptoPolicyProfile,
  verifyCryptoPolicyProfile,
} from '../../src/mesh/crypto-profile.js';

const base = () => ({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

test('crypto policy profile is deterministic, immutable, and explicit about absent PQ support', () => {
  const first = createCryptoPolicyProfile(base());
  const second = createCryptoPolicyProfile(base());
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.match(first.profileId, /^crypto-profile-[a-f0-9]{64}$/);
  assert.equal(first.postQuantumMode, 'not-implemented');
  assert.equal(first.hybridSignatureRequired, false);
  assert.equal(first.quantumResistanceClaimed, false);
  assert.deepEqual(verifyCryptoPolicyProfile(first), { ok: true, firstMismatch: null, profileId: first.profileId });

  const changed = createCryptoPolicyProfile({ ...base(), profileName: 'classical-ed25519-v1-alt' });
  assert.notEqual(changed.profileId, first.profileId);
});

test('crypto policy profile rejects unsupported algorithms and false post-quantum claims', () => {
  for (const value of [
    { ...base(), hashAlgorithm: 'sha512' },
    { ...base(), signatureAlgorithm: 'ml-dsa-65' },
    { ...base(), postQuantumMode: 'implemented' },
    { ...base(), hybridSignatureRequired: true },
  ]) {
    assert.throws(() => createCryptoPolicyProfile(value), { code: 'E_CRYPTO_PROFILE_SCHEMA' });
  }
});

test('crypto policy profile rejects ambiguous object shapes and stale IDs', () => {
  const unknown = { ...base(), extra: true };
  assert.throws(() => createCryptoPolicyProfile(unknown), { code: 'E_CRYPTO_PROFILE_SCHEMA' });

  const hidden = base();
  Object.defineProperty(hidden, 'hidden', { value: true, enumerable: false });
  assert.throws(() => createCryptoPolicyProfile(hidden), { code: 'E_CRYPTO_PROFILE_SCHEMA' });

  const symbolic = base();
  symbolic[Symbol('x')] = true;
  assert.throws(() => createCryptoPolicyProfile(symbolic), { code: 'E_CRYPTO_PROFILE_SCHEMA' });

  const accessor = base();
  Object.defineProperty(accessor, 'profileName', { get: () => 'forged', enumerable: true });
  assert.throws(() => createCryptoPolicyProfile(accessor), { code: 'E_CRYPTO_PROFILE_SCHEMA' });

  const valid = createCryptoPolicyProfile(base());
  const stale = { ...valid, profileId: `crypto-profile-${'0'.repeat(64)}` };
  assert.equal(verifyCryptoPolicyProfile(stale).ok, false);
});

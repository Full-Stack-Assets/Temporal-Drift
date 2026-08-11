import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createCryptoProfile, verifyCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createVerifierRegistry, verifyVerifierRegistry } from '../../src/federation/verifier-registry.js';

const KEY_A = Buffer.from('verifier-a-public-key', 'utf8').toString('base64');
const KEY_B = Buffer.from('verifier-b-public-key', 'utf8').toString('base64');

const VERIFIER_A = {
  verifierId: 'reviewer-a',
  keyId: 'reviewer-a-ed25519-v1',
  algorithm: 'ed25519',
  publicKeySpkiBase64: KEY_A,
  weight: 1,
  validFromLogicalTime: 1,
  validUntilLogicalTime: null,
  role: 'security-review',
};

const VERIFIER_B = {
  verifierId: 'reviewer-b',
  keyId: 'reviewer-b-ed25519-v1',
  algorithm: 'ed25519',
  publicKeySpkiBase64: KEY_B,
  weight: 2,
  validFromLogicalTime: 2,
  validUntilLogicalTime: 50,
  role: 'reproducibility-review',
};

test('crypto profile is canonical, immutable, and content-addressed', () => {
  const input = { profileVersion: 'federation-crypto-v1' };
  const profile = createCryptoProfile(input);

  assert.equal(profile.profileVersion, 'federation-crypto-v1');
  assert.equal(profile.canonicalization, 'canonical-v1');
  assert.deepEqual(profile.hashAlgorithms, ['sha256']);
  assert.deepEqual(profile.signatureAlgorithms, ['ed25519']);
  assert.equal(profile.primarySignatureAlgorithm, 'ed25519');
  assert.deepEqual(profile.unsupportedFutureAlgorithms, []);
  assert.match(profile.profileHash, /^[a-f0-9]{64}$/u);
  assert.equal(verifyCryptoProfile(profile).ok, true);
  assert.equal(Object.isFrozen(profile), true);
  assert.equal(Object.isFrozen(profile.hashAlgorithms), true);

  input.profileVersion = 'caller-mutated';
  assert.equal(profile.profileVersion, 'federation-crypto-v1');
});

test('verifier registry is order-independent, immutable, and linked to the crypto profile', () => {
  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
  const left = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [VERIFIER_B, VERIFIER_A],
  }, profile);
  const right = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [VERIFIER_A, VERIFIER_B],
  }, profile);

  assert.equal(left.registryHash, right.registryHash);
  assert.equal(canonicalString(left), canonicalString(right));
  assert.deepEqual(left.verifiers.map((entry) => entry.verifierId), ['reviewer-a', 'reviewer-b']);
  assert.equal(verifyVerifierRegistry(left, profile).ok, true);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.verifiers), true);
});

test('profile and registry validation fail closed for ambiguous or unsupported inputs', () => {
  assert.throws(
    () => createCryptoProfile({ profileVersion: 'federation-crypto-v1', signatureAlgorithms: ['rsa'] }),
    (error) => error?.code === 'E_CRYPTO_PROFILE',
  );

  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });

  assert.throws(
    () => createVerifierRegistry({
      registryVersion: 'verifier-registry-v1',
      cryptoProfileHash: profile.profileHash,
      verifiers: [VERIFIER_A, { ...VERIFIER_B, verifierId: VERIFIER_A.verifierId }],
    }, profile),
    (error) => error?.code === 'E_VERIFIER_REGISTRY',
  );

  assert.throws(
    () => createVerifierRegistry({
      registryVersion: 'verifier-registry-v1',
      cryptoProfileHash: profile.profileHash,
      verifiers: [VERIFIER_A, { ...VERIFIER_B, keyId: VERIFIER_A.keyId }],
    }, profile),
    (error) => error?.code === 'E_VERIFIER_REGISTRY',
  );

  assert.throws(
    () => createVerifierRegistry({
      registryVersion: 'verifier-registry-v1',
      cryptoProfileHash: 'f'.repeat(64),
      verifiers: [VERIFIER_A],
    }, profile),
    (error) => error?.code === 'E_VERIFIER_REGISTRY',
  );

  for (const invalid of [
    { ...VERIFIER_A, weight: 0 },
    { ...VERIFIER_A, algorithm: 'rsa' },
    { ...VERIFIER_A, publicKeySpkiBase64: 'not base64***' },
    { ...VERIFIER_A, validFromLogicalTime: -1 },
    { ...VERIFIER_A, validUntilLogicalTime: 0 },
  ]) {
    assert.throws(
      () => createVerifierRegistry({
        registryVersion: 'verifier-registry-v1',
        cryptoProfileHash: profile.profileHash,
        verifiers: [invalid],
      }, profile),
      (error) => error?.code === 'E_VERIFIER_REGISTRY',
    );
  }

  const hidden = { ...VERIFIER_A };
  Object.defineProperty(hidden, 'secret', { value: 'hidden', enumerable: false });
  assert.throws(
    () => createVerifierRegistry({
      registryVersion: 'verifier-registry-v1',
      cryptoProfileHash: profile.profileHash,
      verifiers: [hidden],
    }, profile),
    (error) => ['E_VERIFIER_REGISTRY', 'E_UNSAFE_VALUE'].includes(error?.code),
  );
});

test('tampered content addresses are rejected', () => {
  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
  const registry = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [VERIFIER_A, VERIFIER_B],
  }, profile);

  assert.throws(
    () => verifyCryptoProfile({ ...profile, profileHash: '0'.repeat(64) }),
    (error) => error?.code === 'E_CRYPTO_PROFILE',
  );

  assert.throws(
    () => verifyVerifierRegistry({ ...registry, registryHash: '0'.repeat(64) }, profile),
    (error) => error?.code === 'E_VERIFIER_REGISTRY',
  );
});

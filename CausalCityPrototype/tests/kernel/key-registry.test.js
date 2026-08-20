import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import {
  appendKeyRegistration,
  appendKeyRevocation,
  appendKeyRotation,
  createVerificationKeyRegistry,
  deriveVerificationKeyFingerprint,
  resolveVerificationKeyStatus,
  verifyVerificationKeyRegistry,
} from '../../src/mesh/key-registry.js';
import { TEST_PUBLIC_KEYS } from '../fixtures/mesh-test-ed25519-key.js';

const REGISTRY_INPUT = Object.freeze({
  networkId: 'ripple-key-registry-test-v1',
  cryptoProfileId: 'crypto-profile-aa448e658cbf5cc6d089eb5a3db001ca6d9422a09e6e0b052be916cd75c7bf19',
  registryVersion: '1.0.0',
});

function registerAlpha(registry = createVerificationKeyRegistry(REGISTRY_INPUT), logicalTime = 10) {
  return appendKeyRegistration(registry, {
    logicalTime,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKey: TEST_PUBLIC_KEYS.alpha,
    reasonCode: 'KEY_INITIAL_REGISTRATION',
  });
}

function rotateBeta(registry, logicalTime = 20) {
  return appendKeyRotation(registry, {
    logicalTime,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    predecessorKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha),
    publicKey: TEST_PUBLIC_KEYS.beta,
    reasonCode: 'KEY_SCHEDULED_ROTATION',
  });
}

function revokeBeta(registry, logicalTime = 30) {
  return appendKeyRevocation(registry, {
    logicalTime,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta),
    reasonCode: 'KEY_REVOKED_BY_POLICY',
  });
}

test('empty registry and registration are deterministic, immutable, and hash-linked', () => {
  const first = createVerificationKeyRegistry(REGISTRY_INPUT);
  const second = createVerificationKeyRegistry(REGISTRY_INPUT);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.events));
  assert.match(first.registryId, /^key-registry-[a-f0-9]{64}$/);
  assert.match(first.registryHash, /^[a-f0-9]{64}$/);
  assert.equal(first.identityVerified, false);
  assert.equal(first.registryAuthority, 'none');

  const before = canonicalString(first);
  const registered = registerAlpha(first);
  assert.equal(canonicalString(first), before);
  assert.equal(first.events.length, 0);
  assert.equal(registered.events.length, 1);
  assert.equal(registered.events[0].sequence, 0);
  assert.equal(registered.events[0].previousEventHash, null);
  assert.equal(registered.events[0].predecessorKeyFingerprint, null);
  assert.equal(registered.events[0].subjectKeyFingerprint, deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha));
  assert.notEqual(registered.registryHash, first.registryHash);
  assert.deepEqual(verifyVerificationKeyRegistry(registered), {
    ok: true,
    firstMismatch: null,
    registryId: registered.registryId,
    registryHash: registered.registryHash,
    eventCount: 1,
  });
});

test('rotation and revocation produce exact half-open validity intervals', () => {
  const registered = registerAlpha();
  const rotated = rotateBeta(registered);
  const revoked = revokeBeta(rotated);
  assert.equal(revoked.events.length, 3);
  assert.equal(revoked.events[1].eventType, 'rotate');
  assert.equal(revoked.events[1].predecessorKeyFingerprint, deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha));
  assert.equal(revoked.events[2].eventType, 'revoke');
  assert.equal(revoked.events[2].subjectKeyFingerprint, deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta));
  assert.deepEqual(verifyVerificationKeyRegistry(revoked), {
    ok: true,
    firstMismatch: null,
    registryId: revoked.registryId,
    registryHash: revoked.registryHash,
    eventCount: 3,
  });

  const alpha = deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha);
  const beta = deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta);
  const query = (fingerprint, atLogicalTime, operatorId = 'operator-alpha') => resolveVerificationKeyStatus(revoked, {
    verifierNodeId: 'node-alpha',
    operatorId,
    publicKeyFingerprint: fingerprint,
    atLogicalTime,
  });

  assert.equal(query(alpha, 9).status, 'not-yet-active');
  assert.equal(query(alpha, 10).status, 'active');
  assert.equal(query(alpha, 19).status, 'active');
  assert.equal(query(alpha, 20).status, 'superseded');
  assert.equal(query(alpha, 30).status, 'superseded');

  assert.equal(query(beta, 19).status, 'not-yet-active');
  assert.equal(query(beta, 20).status, 'active');
  assert.equal(query(beta, 29).status, 'active');
  assert.equal(query(beta, 30).status, 'revoked');

  assert.equal(query(beta, 25, 'operator-other').status, 'identity-mismatch');
  assert.equal(query('f'.repeat(64), 25).status, 'unknown-key');
  assert.equal(resolveVerificationKeyStatus(revoked, {
    verifierNodeId: 'node-unknown',
    operatorId: 'operator-alpha',
    publicKeyFingerprint: beta,
    atLogicalTime: 25,
  }).status, 'unknown-key');
});

test('registry rejects duplicate nodes, key reuse, invalid predecessors, operator drift, and events after revocation', () => {
  const empty = createVerificationKeyRegistry(REGISTRY_INPUT);
  const alpha = registerAlpha(empty);

  assert.throws(() => appendKeyRegistration(alpha, {
    logicalTime: 11,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKey: TEST_PUBLIC_KEYS.gamma,
    reasonCode: 'KEY_DUPLICATE_NODE',
  }), { code: 'E_KEY_REGISTRY_EVENT' });

  assert.throws(() => appendKeyRegistration(alpha, {
    logicalTime: 11,
    verifierNodeId: 'node-gamma',
    operatorId: 'operator-gamma',
    publicKey: TEST_PUBLIC_KEYS.alpha,
    reasonCode: 'KEY_REUSE',
  }), { code: 'E_KEY_REGISTRY_EVENT' });

  assert.throws(() => appendKeyRotation(alpha, {
    logicalTime: 20,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    predecessorKeyFingerprint: 'f'.repeat(64),
    publicKey: TEST_PUBLIC_KEYS.beta,
    reasonCode: 'KEY_BAD_PREDECESSOR',
  }), { code: 'E_KEY_REGISTRY_EVENT' });

  assert.throws(() => appendKeyRotation(alpha, {
    logicalTime: 20,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-other',
    predecessorKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.alpha),
    publicKey: TEST_PUBLIC_KEYS.beta,
    reasonCode: 'KEY_OPERATOR_DRIFT',
  }), { code: 'E_KEY_REGISTRY_EVENT' });

  assert.throws(() => rotateBeta(alpha, 10), { code: 'E_KEY_REGISTRY_EVENT' });
  assert.throws(() => appendKeyRegistration(empty, {
    logicalTime: 10,
    verifierNodeId: 'node-bad',
    operatorId: 'operator-bad',
    publicKey: 'not-a-key',
    reasonCode: 'KEY_BAD_MATERIAL',
  }), { code: 'E_KEY_REGISTRY_SCHEMA' });

  const revoked = revokeBeta(rotateBeta(alpha));
  assert.throws(() => appendKeyRotation(revoked, {
    logicalTime: 40,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    predecessorKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta),
    publicKey: TEST_PUBLIC_KEYS.gamma,
    reasonCode: 'KEY_AFTER_REVOCATION',
  }), { code: 'E_KEY_REGISTRY_EVENT' });
  assert.throws(() => appendKeyRevocation(revoked, {
    logicalTime: 40,
    verifierNodeId: 'node-alpha',
    operatorId: 'operator-alpha',
    publicKeyFingerprint: deriveVerificationKeyFingerprint(TEST_PUBLIC_KEYS.beta),
    reasonCode: 'KEY_DOUBLE_REVOCATION',
  }), { code: 'E_KEY_REGISTRY_EVENT' });
});

test('stored registry verification rejects event, link, sequence, fingerprint, identity, and terminal tampering', () => {
  const registry = revokeBeta(rotateBeta(registerAlpha()));
  const mutations = [];

  const eventHash = structuredClone(registry);
  eventHash.events[1].eventHash = '0'.repeat(64);
  mutations.push(eventHash);

  const link = structuredClone(registry);
  link.events[1].previousEventHash = '1'.repeat(64);
  mutations.push(link);

  const sequence = structuredClone(registry);
  sequence.events[1].sequence = 9;
  mutations.push(sequence);

  const time = structuredClone(registry);
  time.events[1].logicalTime = 10;
  mutations.push(time);

  const fingerprint = structuredClone(registry);
  fingerprint.events[0].subjectKeyFingerprint = '2'.repeat(64);
  mutations.push(fingerprint);

  const predecessor = structuredClone(registry);
  predecessor.events[1].predecessorKeyFingerprint = '3'.repeat(64);
  mutations.push(predecessor);

  const operator = structuredClone(registry);
  operator.events[1].operatorId = 'operator-other';
  mutations.push(operator);

  const registryHash = structuredClone(registry);
  registryHash.registryHash = '4'.repeat(64);
  mutations.push(registryHash);

  for (const mutation of mutations) assert.equal(verifyVerificationKeyRegistry(mutation).ok, false);
});

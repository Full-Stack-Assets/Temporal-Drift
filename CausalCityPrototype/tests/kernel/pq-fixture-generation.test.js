import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import test from 'node:test';

import { canonicalBytes } from '../../src/kernel/canonicalize.js';

const payload = canonicalBytes({
  fixtureVersion: 'ml-dsa-runtime-probe-v1',
  message: 'Ripple PQ migration capability probe',
});

test('ML-DSA-65 runtime support is explicit rather than silently skipped', () => {
  const major = Number(process.versions.node.split('.')[0]);
  if (major === 22) {
    assert.throws(() => generateKeyPairSync('ml-dsa-65'));
    return;
  }

  assert.equal(major, 24);
  const { privateKey, publicKey } = generateKeyPairSync('ml-dsa-65');
  const signature = sign(null, payload, privateKey);
  assert.ok(signature.length > 0);
  assert.equal(verify(null, payload, publicKey, signature), true);

  const changed = Buffer.from(payload);
  changed[changed.length - 1] ^= 1;
  assert.equal(verify(null, changed, publicKey, signature), false);
});

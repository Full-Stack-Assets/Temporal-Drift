import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalBytes, hashCanonical } from '../../src/kernel/canonicalize.js';
import { deepCloneFreeze } from '../../src/kernel/immutable.js';
import { TrustKernelError } from '../../src/kernel/errors.js';

test('canonicalizes object keys by normalized UTF-8 order', () => {
  const value = { z: 1, a: 2, 'é': 'cafe\u0301' };
  assert.equal(new TextDecoder().decode(canonicalBytes(value)), '{"a":2,"z":1,"é":"café"}');
});

test('rejects duplicate keys created by NFC normalization', () => {
  assert.throws(() => canonicalBytes({ 'é': 1, 'e\u0301': 2 }), (error) => error instanceof TrustKernelError && error.code === 'E_DUPLICATE_KEY');
});

test('rejects unsafe canonical values', () => {
  for (const value of [1.5, NaN, Infinity, -Infinity, -0, undefined, 2n, new Date(), new Map(), new Set()]) {
    assert.throws(() => canonicalBytes(value), TrustKernelError);
  }
});

test('rejects cycles and sparse arrays', () => {
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => canonicalBytes(cyclic), (error) => error.code === 'E_UNSAFE_VALUE');
  const sparse = []; sparse[1] = 1;
  assert.throws(() => canonicalBytes(sparse), (error) => error.code === 'E_UNSAFE_VALUE');
});

test('SHA-256 hash is deterministic and matches known vector', () => {
  assert.equal(hashCanonical({ a: 1 }), '015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862');
});

test('deepCloneFreeze shares no mutable references', () => {
  const source = { nested: { list: [1, 2] } };
  const frozen = deepCloneFreeze(source);
  assert.notEqual(frozen, source);
  assert.notEqual(frozen.nested, source.nested);
  assert(Object.isFrozen(frozen));
  assert(Object.isFrozen(frozen.nested));
  assert(Object.isFrozen(frozen.nested.list));
  source.nested.list.push(3);
  assert.deepEqual(frozen.nested.list, [1, 2]);
  assert.throws(() => frozen.nested.list.push(4));
});

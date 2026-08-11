import test from 'node:test';
import assert from 'node:assert/strict';

import { createPrng, seedToState } from '../../src/kernel/prng.js';

test('xoshiro128** matches the published state transition vector', () => {
  const prng = createPrng([1, 2, 3, 4]);
  assert.deepEqual(
    Array.from({ length: 8 }, () => prng.nextUint32()),
    [11520, 0, 5927040, 70819200, 2031721883, 1637235492, 1287239034, 3734860849],
  );
});

test('all-zero and malformed PRNG states fail closed', () => {
  for (const state of [[0, 0, 0, 0], [1, 2, 3], [1, 2, 3, -1], [1, 2, 3, 4294967296]]) {
    assert.throws(() => createPrng(state), { code: 'E_INVALID_PRNG_STATE' });
  }
});

test('snapshots are frozen copies and clones advance independently', () => {
  const original = createPrng([1, 2, 3, 4]);
  original.nextUint32();
  const snapshot = original.snapshot();
  const clone = original.clone();
  assert.ok(Object.isFrozen(snapshot));
  assert.notStrictEqual(snapshot, clone.snapshot());
  assert.equal(original.nextUint32(), clone.nextUint32());
  clone.nextUint32();
  assert.notDeepEqual(original.snapshot(), clone.snapshot());
});

test('nextInt is deterministic and stays within every declared range', () => {
  const left = createPrng([11, 22, 33, 44]);
  const right = createPrng([11, 22, 33, 44]);
  for (const max of [1, 2, 3, 7, 65537, 4294967295]) {
    for (let index = 0; index < 200; index += 1) {
      const actual = left.nextInt(max);
      assert.equal(actual, right.nextInt(max));
      assert.ok(actual >= 0 && actual < max);
    }
  }
  for (const invalid of [0, -1, 1.5, 4294967296]) {
    assert.throws(() => left.nextInt(invalid), { code: 'E_INVALID_PRNG_STATE' });
  }
});

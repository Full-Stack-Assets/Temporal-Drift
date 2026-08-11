import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrng, seedToState } from '../../src/kernel/prng.js';

test('xoshiro128** emits stable reference sequence for state [1,2,3,4]', () => {
  const prng = createPrng([1, 2, 3, 4]);
  assert.deepEqual([prng.nextUint32(), prng.nextUint32(), prng.nextUint32(), prng.nextUint32()], [11520, 0, 5927040, 70819200]);
});

test('clone has independent state but identical future sequence', () => {
  const left = createPrng(seedToState(2026));
  left.nextUint32();
  const right = left.clone();
  assert.notEqual(left.snapshot(), right.snapshot());
  assert.deepEqual(left.snapshot(), right.snapshot());
  assert.equal(left.nextUint32(), right.nextUint32());
  left.nextUint32();
  assert.notDeepEqual(left.snapshot(), right.snapshot());
});

test('nextInt is deterministic and range bounded', () => {
  const a = createPrng(seedToState(77));
  const b = createPrng(seedToState(77));
  const x = Array.from({ length: 1000 }, () => a.nextInt(7));
  const y = Array.from({ length: 1000 }, () => b.nextInt(7));
  assert.deepEqual(x, y);
  assert(x.every((value) => Number.isInteger(value) && value >= 0 && value < 7));
});

test('all-zero state is rejected', () => {
  assert.throws(() => createPrng([0, 0, 0, 0]), (error) => error.code === 'E_INVALID_PRNG_STATE');
});

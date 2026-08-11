import test from 'node:test';
import assert from 'node:assert/strict';

import { createSnapstate, hashState } from '../../src/kernel/snapstate.js';

test('snapstate hashes canonical model state and owns immutable copies', () => {
  const modelState = { nested: [2], count: 1 };
  const prngState = [1, 2, 3, 4];
  const snapstate = createSnapstate({
    runId: 'run-1', branchId: 'baseline', stepId: 'step-1', sequence: 1,
    modelState, prngState, previousReceiptHash: 'a'.repeat(64),
  });
  assert.equal(snapstate.stateHash, '22c091b1138a218aec4747094587976ac71d8c0e584c485b6bbe146e2db5eeba');
  assert.equal(hashState(modelState), snapstate.stateHash);
  modelState.nested[0] = 99;
  prngState[0] = 99;
  assert.equal(snapstate.modelState.nested[0], 2);
  assert.deepEqual(snapstate.prngState, [1, 2, 3, 4]);
  assert.ok(Object.isFrozen(snapstate));
  assert.ok(Object.isFrozen(snapstate.modelState.nested));
  assert.ok(Object.isFrozen(snapstate.prngState));
});

test('snapstate validates sequence, identifiers, PRNG, and previous hash', () => {
  const valid = {
    runId: 'run-1', branchId: 'baseline', stepId: 'genesis', sequence: 0,
    modelState: { value: 1 }, prngState: [1, 2, 3, 4], previousReceiptHash: null,
  };
  assert.equal(createSnapstate(valid).sequence, 0);
  assert.throws(() => createSnapstate({ ...valid, sequence: -1 }), { code: 'E_UNSAFE_VALUE' });
  assert.throws(() => createSnapstate({ ...valid, runId: '' }), { code: 'E_UNSAFE_VALUE' });
  assert.throws(() => createSnapstate({ ...valid, prngState: [0, 0, 0, 0] }), { code: 'E_INVALID_PRNG_STATE' });
  assert.throws(() => createSnapstate({ ...valid, previousReceiptHash: 'bad' }), { code: 'E_STATE_HASH' });
});

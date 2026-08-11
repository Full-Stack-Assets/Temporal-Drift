import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, createRun, advanceRun } from '../../src/kernel/index.js';
import { seedToState } from '../../src/kernel/prng.js';

const adapter = Object.freeze({
  id: 'counter',
  version: '1',
  transition(previousState, input, prng) {
    return {
      state: { count: previousState.count + input.data.delta, draw: prng.nextInt(1000) },
      events: [{ type: 'advanced', delta: input.data.delta }],
    };
  },
});

function manifest() {
  return createManifest({
    model: { id: 'counter', version: '1' },
    branchId: 'root',
    initialState: { count: 0, draw: 0 },
    initialPrngState: seedToState(42),
    inputs: [
      { stepId: 's1', type: 'tick', data: { delta: 2 } },
      { stepId: 's2', type: 'tick', data: { delta: 3 } },
    ],
    normalization: { id: 'counter-v1', scales: {} },
  });
}

test('manifest rejects duplicate step IDs', () => {
  assert.throws(() => createManifest({
    model: { id: 'counter', version: '1' },
    initialState: { count: 0 },
    initialPrngState: seedToState(1),
    inputs: [{ stepId: 'x', type: 't', data: {} }, { stepId: 'x', type: 't', data: {} }],
    normalization: { id: 'v1', scales: {} },
  }), (error) => error.code === 'E_DUPLICATE_STEP');
});

test('createRun commits an immutable genesis state and receipt', () => {
  const run = createRun(manifest(), adapter);
  assert.equal(run.ledger.length, 1);
  assert.equal(run.snapstates.length, 1);
  assert.equal(run.ledger[0].sequence, 0);
  assert.equal(run.ledger[0].resultingStateHash, run.currentSnapstate.stateHash);
  assert(Object.isFrozen(run));
  assert(Object.isFrozen(run.currentSnapstate.modelState));
});

test('advanceRun appends hashes without mutating prior run', () => {
  const first = createRun(manifest(), adapter);
  const before = JSON.stringify(first);
  const second = advanceRun(first, first.manifest.inputs[0]);
  assert.equal(JSON.stringify(first), before);
  assert.equal(first.ledger.length, 1);
  assert.equal(second.ledger.length, 2);
  assert.equal(second.currentSnapstate.modelState.count, 2);
  assert.equal(second.ledger[1].previousReceiptHash, first.ledger[0].receiptHash);
  assert.equal(second.ledger[1].inputHash.length, 64);
  assert.equal(second.ledger[1].eventBatchHash.length, 64);
});

test('advanceRun rejects an input that differs from the manifest', () => {
  const run = createRun(manifest(), adapter);
  assert.throws(() => advanceRun(run, { stepId: 's1', type: 'tick', data: { delta: 99 } }), (error) => error.code === 'E_REPLAY_MISMATCH');
});

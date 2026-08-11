import test from 'node:test';
import assert from 'node:assert/strict';

import { createManifest } from '../../src/kernel/manifest.js';
import {
  appendReceipt, createGenesisReceipt, createTransitionReceipt, verifyReceiptHash,
} from '../../src/kernel/ledger.js';

function manifest() {
  return createManifest({
    format: 'ripple-trust-run', schemaVersion: '1.0.0', kernelVersion: '1.0.0',
    model: { id: 'counter', version: '1.0.0' }, runId: 'run-1', branchId: 'baseline',
    initialState: { count: 0 }, initialPrngState: [1, 2, 3, 4], inputs: [], ancestry: null,
    normalization: { id: 'counter-fixed', version: '1.0.0', scales: { count: 1 } },
    expectedTerminalReceiptHash: null, evidenceRuntime: 'node-test',
  });
}

function transition(overrides = {}) {
  const genesis = createGenesisReceipt(manifest());
  return {
    genesis,
    receipt: createTransitionReceipt({
      kernelVersion: '1.0.0', runId: 'run-1', branchId: 'baseline', stepId: 's1', sequence: 1,
      previousReceiptHash: genesis.receiptHash, input: { stepId: 's1', type: 'increment', payload: { amount: 1 } },
      previousState: { count: 0 }, resultingState: { count: 1 },
      resultingPrngState: [10, 20, 30, 40], eventBatch: [{ type: 'incremented', amount: 1 }],
      ...overrides,
    }),
  };
}

test('genesis receipt commits to manifest core, state, PRNG, and model identity', () => {
  const receipt = createGenesisReceipt(manifest());
  assert.equal(receipt.kind, 'genesis');
  assert.equal(receipt.sequence, 0);
  assert.equal(receipt.previousReceiptHash, null);
  assert.match(receipt.manifestCoreHash, /^[a-f0-9]{64}$/);
  assert.match(receipt.resultingStateHash, /^[a-f0-9]{64}$/);
  assert.equal(verifyReceiptHash(receipt), true);
  assert.ok(Object.isFrozen(receipt));
});

test('transition receipt commits every transition boundary hash', () => {
  const { genesis, receipt } = transition();
  for (const field of ['inputHash', 'previousStateHash', 'resultingStateHash', 'resultingPrngStateHash', 'eventBatchHash', 'receiptHash']) {
    assert.match(receipt[field], /^[a-f0-9]{64}$/, field);
  }
  assert.equal(receipt.previousReceiptHash, genesis.receiptHash);
  assert.equal(verifyReceiptHash(receipt), true);
});

test('receipt tampering is detectable without mutating the original', () => {
  const receipt = createGenesisReceipt(manifest());
  assert.equal(verifyReceiptHash({ ...receipt, resultingStateHash: 'f'.repeat(64) }), false);
  assert.equal(verifyReceiptHash({ ...receipt, receiptHash: 'f'.repeat(64) }), false);
  assert.equal(verifyReceiptHash(receipt), true);
});

test('ledger append is immutable and rejects deletion-order linkage', () => {
  const { genesis, receipt: next } = transition();
  const first = appendReceipt([], genesis);
  const second = appendReceipt(first, next);
  assert.equal(first.length, 1);
  assert.equal(second.length, 2);
  assert.ok(Object.isFrozen(second));
  assert.throws(() => appendReceipt([], next), { code: 'E_RECEIPT_HASH' });
  assert.throws(() => appendReceipt([genesis], { ...next, sequence: 2 }), { code: 'E_RECEIPT_HASH' });
});

test('ledger rejects a validly hashed receipt spliced from another run, branch, or kernel version', () => {
  for (const overrides of [
    { runId: 'run-2' },
    { branchId: 'other-branch' },
    { kernelVersion: '2.0.0' },
  ]) {
    const { genesis, receipt } = transition(overrides);
    assert.equal(verifyReceiptHash(receipt), true);
    assert.throws(() => appendReceipt([genesis], receipt), { code: 'E_RECEIPT_HASH' });
  }
});

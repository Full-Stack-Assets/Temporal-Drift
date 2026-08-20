import test from 'node:test';
import assert from 'node:assert/strict';

import { advanceRun, createRun, exportRun } from '../../src/kernel/replay.js';
import { verifyRun } from '../../src/kernel/verify.js';
import { counterAdapter, counterManifest } from './helpers/counter-fixture.js';

function exportedObject() {
  let run = createRun(counterManifest(), counterAdapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  return JSON.parse(exportRun(run));
}

function tamper(mutator) {
  const value = exportedObject();
  mutator(value);
  return verifyRun(value, counterAdapter);
}

test('independent manifest, state, PRNG, input, event, and receipt tampering fails', () => {
  const cases = [
    ['manifest', (x) => { x.manifest.initialState.count = 1; }],
    ['input', (x) => { x.manifest.inputs[0].payload.amount = 2; }],
    ['snapstate', (x) => { x.snapstates[1].modelState.count += 1; }],
    ['prng', (x) => { x.snapstates[1].prngState[0] ^= 1; }],
    ['event', (x) => { x.eventBatches[1][0].amount = 99; }],
    ['previous hash', (x) => { x.receipts[1].previousReceiptHash = 'f'.repeat(64); }],
    ['receipt', (x) => { x.receipts[1].receiptHash = 'f'.repeat(64); }],
    ['unsafe receipt value', (x) => { x.receipts[1].sequence = 1.5; }],
    ['unsafe event value', (x) => { x.eventBatches[1][0].noise = 1.5; }],
    ['terminal', (x) => { x.manifest.expectedTerminalReceiptHash = 'f'.repeat(64); }],
  ];
  for (const [label, mutate] of cases) {
    const report = tamper(mutate);
    assert.equal(report.ok, false, label);
    assert.notEqual(report.errorCode, null, label);
    assert.notEqual(report.firstMismatch, null, label);
    assert.ok(Object.isFrozen(report), label);
  }
});

test('removed, reordered, and duplicated steps fail at the first affected location', () => {
  const removed = tamper((x) => { x.receipts.splice(1, 1); x.snapstates.splice(1, 1); x.eventBatches.splice(1, 1); });
  assert.equal(removed.ok, false);
  assert.match(removed.firstMismatch, /^receipts\[1\]/);

  const reordered = tamper((x) => { [x.receipts[1], x.receipts[2]] = [x.receipts[2], x.receipts[1]]; });
  assert.equal(reordered.ok, false);
  assert.equal(reordered.firstMismatch, 'receipts[1].receiptHash');

  const duplicated = tamper((x) => { x.receipts.splice(2, 0, structuredClone(x.receipts[1])); });
  assert.equal(duplicated.ok, false);
  assert.match(duplicated.firstMismatch, /^receipts\[2\]/);
});

test('malformed exports return reports instead of repairing data', () => {
  for (const value of ['not json', null, {}, { manifest: {} }]) {
    const report = verifyRun(value, counterAdapter);
    assert.equal(report.ok, false);
    assert.ok(report.errorCode);
  }
});

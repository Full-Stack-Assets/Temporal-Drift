import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, createRun, advanceRun, exportRun, verifyRun, seedToState } from '../../src/kernel/index.js';

const adapter = Object.freeze({
  id: 'counter',
  version: '1',
  transition(state, input, prng) {
    return { state: { count: state.count + input.data.delta, draw: prng.nextInt(10) }, events: [{ type: 'tick', delta: input.data.delta }] };
  },
});

function makeExport() {
  const manifest = createManifest({
    model: { id: 'counter', version: '1' },
    initialState: { count: 0, draw: 0 },
    initialPrngState: seedToState(3),
    inputs: [
      { stepId: 'a', type: 'tick', data: { delta: 1 } },
      { stepId: 'b', type: 'tick', data: { delta: 2 } },
    ],
    normalization: { id: 'v1', scales: {} },
  });
  let run = createRun(manifest, adapter);
  for (const input of manifest.inputs) run = advanceRun(run, input);
  return exportRun(run);
}

function assertRejected(mutator, expectedSequence = undefined) {
  const exported = structuredClone(makeExport());
  mutator(exported);
  const report = verifyRun(exported, adapter);
  assert.equal(report.ok, false);
  if (expectedSequence !== undefined) assert.equal(report.mismatch.sequence, expectedSequence);
}

test('verification detects manifest, initial state, seed, and input tampering', () => {
  const cases = [
    (value) => { value.manifest.normalization.id = 'tampered'; },
    (value) => { value.manifest.initialState.count = 99; },
    (value) => { value.manifest.initialPrngState[0] ^= 1; },
    (value) => { value.manifest.inputs[0].data.delta = 9; },
  ];
  for (const mutate of cases) assertRejected(mutate, 0);
});

test('verification detects event, snapstate, PRNG-state, previous-hash, and receipt tampering at first affected step', () => {
  const cases = [
    (value) => { value.eventBatches[1][0].delta = 77; },
    (value) => { value.snapstates[1].modelState.count = 77; },
    (value) => { value.snapstates[1].prngState[0] ^= 1; },
    (value) => { value.ledger[1].previousReceiptHash = 'f'.repeat(64); },
    (value) => { value.ledger[1].resultingStateHash = 'f'.repeat(64); },
  ];
  for (const mutate of cases) assertRejected(mutate, 1);
});

test('verification detects removed, reordered, and duplicated stored steps', () => {
  assertRejected((value) => { value.ledger.splice(1, 1); });
  assertRejected((value) => { [value.ledger[1], value.ledger[2]] = [value.ledger[2], value.ledger[1]]; }, 1);
  assertRejected((value) => { value.snapstates.splice(1, 0, structuredClone(value.snapstates[1])); });
});

test('verification detects removed, reordered, duplicated, and modified manifest inputs', () => {
  assertRejected((value) => { value.manifest.inputs.pop(); }, 0);
  assertRejected((value) => { value.manifest.inputs.reverse(); }, 0);
  assertRejected((value) => { value.manifest.inputs.push(structuredClone(value.manifest.inputs[0])); }, 0);
  assertRejected((value) => { value.manifest.inputs[0].type = 'other'; }, 0);
});

test('verification detects terminal receipt hash tampering', () => {
  assertRejected((value) => { value.manifest.expectedTerminalReceiptHash = 'f'.repeat(64); }, 2);
});

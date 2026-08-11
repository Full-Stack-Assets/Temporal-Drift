import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, createRun, advanceRun, exportRun, verifyRun, seedToState } from '../../src/kernel/index.js';

const adapter = Object.freeze({
  id: 'counter',
  version: '1',
  transition(state, input, prng) {
    return { state: { count: state.count + input.data.delta, draw: prng.nextInt(10) }, events: [{ type: 'tick' }] };
  },
});

function makeExport() {
  const manifest = createManifest({
    model: { id: 'counter', version: '1' },
    initialState: { count: 0, draw: 0 },
    initialPrngState: seedToState(3),
    inputs: [{ stepId: 'a', type: 'tick', data: { delta: 1 } }],
    normalization: { id: 'v1', scales: {} },
  });
  let run = createRun(manifest, adapter);
  run = advanceRun(run, manifest.inputs[0]);
  return exportRun(run);
}

test('verification detects tampered receipt at first affected step', () => {
  const exported = structuredClone(makeExport());
  exported.ledger[1].resultingStateHash = 'f'.repeat(64);
  const report = verifyRun(exported, adapter);
  assert.equal(report.ok, false);
  assert.equal(report.mismatch.sequence, 1);
});

test('verification detects tampered manifest', () => {
  const exported = structuredClone(makeExport());
  exported.manifest.inputs[0].data.delta = 9;
  assert.equal(verifyRun(exported, adapter).ok, false);
});

test('verification detects removed receipt', () => {
  const exported = structuredClone(makeExport());
  exported.ledger.pop();
  assert.equal(verifyRun(exported, adapter).ok, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, createRun, advanceRun, forkRun, exportRun, replayRun, verifyRun, seedToState } from '../../src/kernel/index.js';

const adapter = Object.freeze({
  id: 'counter',
  version: '1',
  transition(state, input, prng) {
    return { state: { count: state.count + input.data.delta, draw: prng.nextInt(100) }, events: [{ type: 'tick', n: input.data.delta }] };
  },
});

function build() {
  return createManifest({
    model: { id: 'counter', version: '1' },
    branchId: 'root',
    initialState: { count: 0, draw: 0 },
    initialPrngState: seedToState(9),
    inputs: [
      { stepId: 'a', type: 'tick', data: { delta: 1 } },
      { stepId: 'b', type: 'tick', data: { delta: 2 } },
    ],
    normalization: { id: 'v1', scales: {} },
  });
}

test('forkRun isolates child state and ledger from parent', () => {
  let parent = createRun(build(), adapter);
  parent = advanceRun(parent, parent.manifest.inputs[0]);
  const before = JSON.stringify(parent);
  const child = forkRun(parent, 'a', 'child');
  assert.equal(JSON.stringify(parent), before);
  assert.equal(child.manifest.ancestry.at(-1).parentReceiptHash, parent.ledger[1].receiptHash);
  assert.notEqual(child.currentSnapstate.modelState, parent.currentSnapstate.modelState);
  assert.deepEqual(child.currentSnapstate.modelState, parent.currentSnapstate.modelState);
});

test('export replay verify reconstructs every receipt', () => {
  let run = createRun(build(), adapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  const exported = exportRun(run);
  const replayed = replayRun(exported, adapter);
  assert.deepEqual(replayed.ledger, run.ledger);
  const report = verifyRun(exported, adapter);
  assert.equal(report.ok, true);
  assert.equal(report.verifiedStepCount, 3);
});

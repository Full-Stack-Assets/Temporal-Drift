import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, createRun, advanceRun, forkRun, exportRun, verifyRun, createPrng, seedToState, hashCanonical } from '../../src/kernel/index.js';

const adapter = Object.freeze({
  id: 'sweep',
  version: '1',
  transition(state, input, prng) {
    return {
      state: { value: state.value + input.data.delta, draw: prng.nextInt(100000) },
      events: [{ type: 'tick', delta: input.data.delta }],
    };
  },
});

function one(seed, steps = 3) {
  const inputs = Array.from({ length: steps }, (_, index) => ({ stepId: `s${index + 1}`, type: 'tick', data: { delta: (index % 3) + 1 } }));
  const manifest = createManifest({
    model: { id: 'sweep', version: '1' },
    initialState: { value: 0, draw: 0 },
    initialPrngState: seedToState(seed),
    inputs,
    normalization: { id: 'sweep-v1', scales: {} },
  });
  let run = createRun(manifest, adapter);
  for (const input of inputs) run = advanceRun(run, input);
  return run;
}

test('10,000-seed sweep is repeatable and state-restorable', () => {
  for (let seed = 0; seed < 10000; seed += 1) {
    const a = createPrng(seedToState(seed));
    const first = a.nextUint32();
    const snapshot = a.snapshot();
    const b = createPrng(snapshot);
    assert.equal(a.nextUint32(), b.nextUint32());
    const x = one(seed, 1);
    const y = one(seed, 1);
    assert.equal(x.ledger.at(-1).receiptHash, y.ledger.at(-1).receiptHash);
    assert(Number.isInteger(first));
  }
});

test('1,000 fork cases preserve parent bytes', () => {
  for (let index = 0; index < 1000; index += 1) {
    const parent = one(index, 2);
    const before = JSON.stringify(parent);
    const child = forkRun(parent, 's1', `child-${index}`);
    assert.equal(JSON.stringify(parent), before);
    assert.notEqual(child.currentSnapstate.modelState, parent.snapstates[1].modelState);
    assert.deepEqual(child.currentSnapstate.modelState, parent.snapstates[1].modelState);
  }
});

test('exports verify after full replay', () => {
  for (const seed of [0, 1, 42, 2026, 9999]) {
    const run = one(seed, 5);
    const report = verifyRun(exportRun(run), adapter);
    assert.equal(report.ok, true);
    assert.equal(report.verifiedStepCount, 6);
  }
});

test('canonical conformance fixture hash is stable', () => {
  assert.equal(hashCanonical({ fixture: 'trust-kernel-v1', nested: { a: 1, b: [true, null, 'café'] } }), '4fb12d467814cd91f677df25463fb2db10c2408fe6a7f4d766c74ace118c26e2');
});

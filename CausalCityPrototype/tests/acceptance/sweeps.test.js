import test from 'node:test';
import assert from 'node:assert/strict';

import { runBellwetherShadow } from '../../src/adapters/bellwether-model.js';
import { forkRun } from '../../src/kernel/branch.js';
import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createPrng, seedToState } from '../../src/kernel/prng.js';
import { advanceRun, createRun } from '../../src/kernel/replay.js';
import { counterAdapter, counterManifest } from '../kernel/helpers/counter-fixture.js';

test('acceptance: 10,000 seed expansions and draws repeat exactly', () => {
  for (let seed = 0; seed < 10000; seed += 1) {
    const state = seedToState(seed);
    assert.equal(state.length, 4);
    assert.ok(state.some((word) => word !== 0));
    assert.deepEqual(state, seedToState(seed));
    assert.equal(createPrng(state).nextUint32(), createPrng(state).nextUint32());
  }
});

test('acceptance: 1,000 forks preserve parent bytes and hashes', () => {
  for (let seed = 1; seed <= 1000; seed += 1) {
    let parent = createRun(counterManifest({ initialPrngState: [seed + 1, seed + 2, seed + 3, seed + 4] }), counterAdapter);
    parent = advanceRun(parent, parent.manifest.inputs[0]);
    parent = advanceRun(parent, parent.manifest.inputs[1]);
    const before = canonicalString({ manifest: parent.manifest, snapstates: parent.snapstates, ledger: parent.ledger, events: parent.eventBatches });
    let child = forkRun(parent, 's1', `child-${seed}`);
    child = advanceRun(child, child.manifest.inputs[0]);
    if (seed % 2 === 0) child = advanceRun(child, child.manifest.inputs[1]);
    assert.equal(canonicalString({ manifest: parent.manifest, snapstates: parent.snapstates, ledger: parent.ledger, events: parent.eventBatches }), before, `seed ${seed}`);
    assert.throws(() => { child.snapstates[0].modelState.count = -1; }, TypeError);
  }
});

test('acceptance: 1,000 Bellwether branch/seed cases match every step hash', () => {
  const branches = ['baseline', 'shutdown', 'reinvention'];
  for (let index = 0; index < 1000; index += 1) {
    const report = runBellwetherShadow(branches[index % branches.length], index);
    assert.equal(report.ok, true, `case ${index}`);
    assert.equal(report.steps, 21, `case ${index}`);
  }
});

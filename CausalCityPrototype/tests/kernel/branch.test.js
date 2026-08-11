import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { forkRun } from '../../src/kernel/branch.js';
import { advanceRun, createRun } from '../../src/kernel/replay.js';
import { counterAdapter, counterManifest } from './helpers/counter-fixture.js';

function parentAtTwoSteps(seed) {
  let run = createRun(counterManifest({ initialPrngState: [seed + 1, seed + 2, seed + 3, seed + 4] }), counterAdapter);
  run = advanceRun(run, run.manifest.inputs[0]);
  run = advanceRun(run, run.manifest.inputs[1]);
  return run;
}

test('fork records verified ancestry and starts from an independently owned snapshot', () => {
  const parent = parentAtTwoSteps(10);
  const child = forkRun(parent, 's1', 'child-a');
  assert.equal(child.manifest.branchId, 'child-a');
  assert.equal(child.manifest.ancestry.parentRunId, parent.manifest.runId);
  assert.equal(child.manifest.ancestry.parentBranchId, parent.manifest.branchId);
  assert.equal(child.manifest.ancestry.forkStepId, 's1');
  assert.equal(child.manifest.ancestry.forkReceiptHash, parent.ledger[1].receiptHash);
  assert.deepEqual(child.manifest.initialState, parent.snapstates[1].modelState);
  assert.notStrictEqual(child.manifest.initialState, parent.snapstates[1].modelState);
  assert.notStrictEqual(child.manifest.initialPrngState, parent.snapstates[1].prngState);
});

test('missing, invalid, and duplicate branches fail closed', () => {
  const parent = parentAtTwoSteps(5);
  assert.throws(() => forkRun(parent, 'missing', 'child'), { code: 'E_UNVERIFIED_FORK' });
  assert.throws(() => forkRun(parent, 's1', 'baseline'), { code: 'E_BRANCH_EXISTS' });
  const tampered = { ...parent, ledger: [...parent.ledger] };
  tampered.ledger[1] = { ...tampered.ledger[1], receiptHash: 'f'.repeat(64) };
  assert.throws(() => forkRun(tampered, 's1', 'child'), { code: 'E_UNVERIFIED_FORK' });
  const manifestTampered = { ...parent, manifest: { ...parent.manifest, initialState: { count: 99 } } };
  assert.throws(() => forkRun(manifestTampered, 's1', 'child'), { code: 'E_UNVERIFIED_FORK' });
});

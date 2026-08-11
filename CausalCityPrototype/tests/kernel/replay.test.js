import test from 'node:test';
import assert from 'node:assert/strict';

import { advanceRun, createRun, exportRun, replayRun } from '../../src/kernel/replay.js';
import { verifyRun } from '../../src/kernel/verify.js';
import { counterAdapter, counterManifest } from './helpers/counter-fixture.js';

function completeRun() {
  let run = createRun(counterManifest(), counterAdapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  return run;
}

test('create and advance return new immutable run values', () => {
  const initial = createRun(counterManifest(), counterAdapter);
  const next = advanceRun(initial, initial.manifest.inputs[0]);
  assert.equal(initial.snapstates.length, 1);
  assert.equal(initial.ledger.length, 1);
  assert.equal(next.snapstates.length, 2);
  assert.equal(next.ledger.length, 2);
  assert.ok(Object.isFrozen(next));
  assert.ok(Object.isFrozen(next.eventBatches[1]));
  assert.notStrictEqual(initial.snapstates, next.snapstates);
});

test('run exports to canonical JSON and replays every receipt exactly', () => {
  const run = completeRun();
  const exported = exportRun(run);
  assert.equal(exported, exportRun(run));
  const parsed = JSON.parse(exported);
  assert.equal(parsed.manifest.expectedTerminalReceiptHash, run.ledger.at(-1).receiptHash);
  const replayed = replayRun(exported, counterAdapter);
  assert.deepEqual(replayed.ledger, run.ledger);
  assert.deepEqual(replayed.snapstates, run.snapstates);
  assert.deepEqual(replayed.eventBatches, run.eventBatches);
  const report = verifyRun(exported, counterAdapter);
  assert.equal(report.ok, true);
  assert.equal(report.verifiedStepCount, 3);
  assert.equal(report.errorCode, null);
});

test('model identity and version mismatches fail closed', () => {
  const manifest = counterManifest();
  assert.throws(() => createRun(manifest, { ...counterAdapter, id: 'other' }), { code: 'E_MODEL_NOT_FOUND' });
  assert.throws(() => createRun(manifest, { ...counterAdapter, version: '2.0.0' }), { code: 'E_MODEL_VERSION' });
});

test('advance rejects skipped or modified declared inputs', () => {
  const run = createRun(counterManifest(), counterAdapter);
  assert.throws(() => advanceRun(run, run.manifest.inputs[1]), { code: 'E_REPLAY_MISMATCH' });
  assert.throws(() => advanceRun(run, { ...run.manifest.inputs[0], payload: { amount: 99 } }), { code: 'E_REPLAY_MISMATCH' });
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { exportRun } from '../../src/kernel/replay.js';
import { createRewindArtifact, restoreRewindArtifact } from '../../src/frontier/rewind.js';
import { completeCounterRun, resolveCounterAdapter } from './helpers/run-graph-fixture.js';

test('rewind artifact restores exact target state and PRNG without mutating source run', () => {
  const run = completeCounterRun();
  const before = exportRun(run);
  const artifact = createRewindArtifact(run, 2);
  const restored = restoreRewindArtifact(artifact, resolveCounterAdapter(run.manifest.model));

  assert.equal(exportRun(run), before);
  assert.equal(artifact.targetSequence, 2);
  assert.equal(artifact.targetStepId, run.snapstates[2].stepId);
  assert.equal(artifact.targetReceiptHash, run.ledger[2].receiptHash);
  assert.equal(canonicalString(restored.snapstates.at(-1).modelState), canonicalString(run.snapstates[2].modelState));
  assert.equal(canonicalString(restored.snapstates.at(-1).prngState), canonicalString(run.snapstates[2].prngState));
  assert.equal(restored.ledger.at(-1).receiptHash, run.ledger[2].receiptHash);
  assert.match(artifact.artifactHash, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(artifact));
});

test('rewind artifacts reject source/prefix tampering and invalid targets', () => {
  const run = completeCounterRun();
  assert.throws(() => createRewindArtifact(run, 99), { code: 'E_REWIND_SCHEMA' });

  const artifact = createRewindArtifact(run, 1);
  const tampered = structuredClone(artifact);
  tampered.prefixExport = tampered.prefixExport.replace('"count":1', '"count":999');
  assert.throws(() => restoreRewindArtifact(tampered, resolveCounterAdapter(run.manifest.model)), { code: 'E_REWIND_HASH' });
});

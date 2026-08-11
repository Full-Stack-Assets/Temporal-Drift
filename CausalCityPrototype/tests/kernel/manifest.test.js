import test from 'node:test';
import assert from 'node:assert/strict';

import { createManifest, manifestCore } from '../../src/kernel/manifest.js';

function fields(overrides = {}) {
  return {
    format: 'ripple-trust-run', schemaVersion: '1.0.0', kernelVersion: '1.0.0',
    model: { id: 'counter', version: '1.0.0' }, runId: 'run-1', branchId: 'baseline',
    initialState: { count: 0 }, initialPrngState: [1, 2, 3, 4],
    inputs: [{ stepId: 's1', type: 'increment', payload: { amount: 1 } }],
    ancestry: null,
    normalization: { id: 'counter-fixed', version: '1.0.0', scales: { count: 1 } },
    expectedTerminalReceiptHash: null,
    evidenceRuntime: 'node-v24.14.0',
    ...overrides,
  };
}

test('manifest owns recursively frozen canonical copies', () => {
  const source = fields();
  const manifest = createManifest(source);
  source.initialState.count = 99;
  source.inputs[0].payload.amount = 99;
  assert.equal(manifest.initialState.count, 0);
  assert.equal(manifest.inputs[0].payload.amount, 1);
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.inputs[0].payload));
});

test('manifest rejects unknown fields and duplicate step IDs', () => {
  assert.throws(() => createManifest(fields({ extra: true })), { code: 'E_UNSAFE_VALUE' });
  assert.throws(() => createManifest(fields({ inputs: [
    { stepId: 'same', type: 'increment', payload: {} },
    { stepId: 'same', type: 'increment', payload: {} },
  ] })), { code: 'E_DUPLICATE_STEP' });
  assert.throws(() => createManifest(fields({ inputs: [{ stepId: 's1', type: 'increment', payload: {}, typo: 1 }] })), { code: 'E_UNSAFE_VALUE' });
});

test('manifest fails closed on versions, model identity, hashes, and ancestry', () => {
  assert.throws(() => createManifest(fields({ schemaVersion: '2.0.0' })), { code: 'E_SCHEMA_VERSION' });
  assert.throws(() => createManifest(fields({ model: { id: '', version: '1.0.0' } })), { code: 'E_MODEL_NOT_FOUND' });
  assert.throws(() => createManifest(fields({ expectedTerminalReceiptHash: 'bad' })), { code: 'E_RECEIPT_HASH' });
  assert.throws(() => createManifest(fields({ ancestry: { parentRunId: 'run-0' } })), { code: 'E_UNVERIFIED_FORK' });
});

test('manifest core excludes evidence runtime and terminal expectation', () => {
  const left = manifestCore(createManifest(fields()));
  const right = manifestCore(createManifest(fields({
    expectedTerminalReceiptHash: 'a'.repeat(64), evidenceRuntime: 'node-v22.99.0',
  })));
  assert.deepEqual(left, right);
  assert.equal('expectedTerminalReceiptHash' in left, false);
  assert.equal('evidenceRuntime' in left, false);
});

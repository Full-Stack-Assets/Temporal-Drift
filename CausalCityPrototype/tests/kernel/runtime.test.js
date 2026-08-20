import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assertSupportedRuntime, runtimeMajor } from '../../scripts/check-runtime.js';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

test('runtime guard accepts only Node 22 and 24 majors', () => {
  assert.equal(runtimeMajor('v22.18.0'), 22);
  assert.equal(runtimeMajor('v24.1.0'), 24);
  assert.doesNotThrow(() => assertSupportedRuntime('v22.0.0'));
  assert.doesNotThrow(() => assertSupportedRuntime('v24.99.0'));
  for (const version of ['v20.19.0', 'v23.1.0', 'v25.0.0', 'bad']) {
    assert.throws(() => assertSupportedRuntime(version), { code: 'E_UNSUPPORTED_RUNTIME' });
  }
});

test('createRun rejects an unsupported runtime even when npm preflight is bypassed', () => {
  const source = `
    Object.defineProperty(process, 'version', { value: 'v23.1.0' });
    const { createManifest } = await import('./src/kernel/manifest.js');
    const { createRun } = await import('./src/kernel/replay.js');
    const manifest = createManifest({
      format: 'ripple-trust-run',
      schemaVersion: '1.0.0',
      kernelVersion: '1.0.0',
      model: { id: 'runtime-probe', version: '1.0.0' },
      runId: 'runtime-probe-run',
      branchId: 'baseline',
      initialState: { value: 0 },
      initialPrngState: [1, 2, 3, 4],
      inputs: [],
      ancestry: null,
      normalization: { id: 'unit', version: '1.0.0', scales: { value: 1 } },
      expectedTerminalReceiptHash: null,
      evidenceRuntime: 'node-v23.1.0',
    });
    const adapter = Object.freeze({
      id: 'runtime-probe',
      version: '1.0.0',
      transition() { return { state: { value: 0 }, events: [] }; },
    });
    try {
      createRun(manifest, adapter);
      process.exitCode = 2;
    } catch (error) {
      if (error?.code !== 'E_UNSUPPORTED_RUNTIME') {
        console.error(error);
        process.exitCode = 3;
      }
    }
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

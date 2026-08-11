import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runBellwetherShadow } from '../src/adapters/bellwether-model.js';
import { advanceRun, createRun } from '../src/kernel/replay.js';
import { counterAdapter, counterManifest } from '../tests/kernel/helpers/counter-fixture.js';

let counter = createRun(counterManifest({ evidenceRuntime: 'node-acceptance-summary' }), counterAdapter);
for (const input of counter.manifest.inputs) counter = advanceRun(counter, input);

const bellwether = Object.fromEntries(['baseline', 'shutdown', 'reinvention'].map((branchId) => {
  const result = runBellwetherShadow(branchId, 2026);
  if (!result.ok) throw new Error(`Bellwether shadow mismatch at ${result.stepId}:${result.firstMismatch}`);
  return [branchId, result.terminalReceiptHash];
}));

function emit(relativePath, label) {
  const emitter = fileURLToPath(new URL(relativePath, import.meta.url));
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  if (child.status !== 0) throw new Error(child.stderr || `${label} conformance emitter failed`);
  return JSON.parse(child.stdout.trim());
}

const runGraph = emit('../tests/kernel/helpers/emit-run-graph.js', 'RunGraph');
const projection = emit('../tests/kernel/helpers/emit-4d-projection.js', '4D projection');
const phase2 = emit('../tests/kernel/helpers/emit-phase2-conformance.js', 'Phase 2');
const frontier = emit('../tests/kernel/helpers/emit-frontier-conformance.js', 'Frontier');
const mesh = emit('../tests/kernel/helpers/emit-mesh-conformance.js', 'Verification mesh');
const keyLifecycle = emit('../tests/kernel/helpers/emit-key-lifecycle-conformance.js', 'Key lifecycle');

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'ripple-trust-kernel-v1',
  runtime: process.version,
  kernelVersion: '1.0.0',
  canonicalFixtureVersion: 'canonical-v1',
  projectionFixtureVersion: 'projection-v1',
  phase2FixtureVersion: 'phase2-approximation-v1',
  frontierFixtureVersion: 'frontier-foundations-v1',
  meshFixtureVersion: 'verification-mesh-v1',
  keyLifecycleFixtureVersion: 'key-lifecycle-v1',
  counterTerminalReceiptHash: counter.ledger.at(-1).receiptHash,
  bellwetherTerminalReceiptHashes: bellwether,
  runGraphConformance: runGraph,
  projectionConformance: projection,
  phase2Conformance: phase2,
  frontierConformance: frontier,
  verificationMeshConformance: mesh,
  keyLifecycleConformance: keyLifecycle,
  acceptanceCases: {
    seedSweep: 10000,
    forkIsolation: 1000,
    shadowEquivalence: 1000,
    runGraphProcesses: 4,
    projectionProcesses: 4,
    phase2Processes: 4,
    frontierProcesses: 4,
    meshProcesses: 4,
    keyLifecycleProcesses: 4,
  },
})}\n`);

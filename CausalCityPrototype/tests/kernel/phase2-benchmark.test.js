import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/phase2-benchmark.js', import.meta.url));

test('Phase-2 benchmark executes and remains an environment-specific non-correctness observation', () => {
  const child = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 30000 });
  assert.equal(child.status, 0, child.stderr);
  const report = JSON.parse(child.stdout);
  assert.equal(report.evidenceClass, 'environment-specific-performance-observation');
  assert.equal(report.correctnessGate, false);
  assert.equal(report.runtime, process.version);
  assert.ok(Number.isSafeInteger(report.branchCount) && report.branchCount > 0);
  assert.ok(Number.isSafeInteger(report.projectionPointCount) && report.projectionPointCount > 0);
  assert.ok(Array.isArray(report.observations) && report.observations.length === 4);
  for (const observation of report.observations) {
    assert.equal(typeof observation.label, 'string');
    assert.ok(Number.isSafeInteger(observation.iterations) && observation.iterations > 0);
    assert.equal(typeof observation.totalMs, 'number');
    assert.equal(typeof observation.averageMs, 'number');
    assert.ok(Number.isSafeInteger(observation.canonicalBytes) && observation.canonicalBytes > 0);
  }
  assert.match(report.warning, /not included.*integrity hash|not portable performance guarantees/u);
  assert.equal('benchmarkHash' in report, false);
});

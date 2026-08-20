import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-4d-projection.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/projection-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical 4D projection hashes and coordinates', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`PROJECTION_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);
  assert.match(actual.projectionHash, /^[a-f0-9]{64}$/);
  assert.match(actual.projectionBytesHash, /^[a-f0-9]{64}$/);
  assert.ok(actual.projectionByteLength > 0);
  assert.ok(actual.temporalNodeCount > 0);
  assert.ok(actual.provenanceEdgeCount > 0);
  assert.ok(actual.branchNodeCount > 0);
  for (const node of actual.coordinateSample) {
    for (const value of [node.sequence, node.x, node.y, node.z, node.t]) assert.ok(Number.isSafeInteger(value));
  }
});

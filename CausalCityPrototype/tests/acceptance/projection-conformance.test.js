import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-projection.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/projection-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical 4D projections and Trustscape scenes', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`PROJECTION_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);
  assert.match(actual.projectionId, /^projection-[a-f0-9]{64}$/);
  for (const key of ['projectionHash', 'projectionExportHash', 'sceneHash', 'sceneExportHash', 'browserRenderModelHash']) {
    assert.match(actual[key], /^[a-f0-9]{64}$/, key);
  }
  assert.ok(actual.projectionByteLength > 0);
  assert.ok(actual.sceneByteLength > 0);
  assert.equal(actual.temporalPointCount, 12);
  assert.equal(actual.causalNodeCount, 20);
  assert.equal(actual.causalEdgeCount, 19);
  assert.equal(actual.branchNodeCount, 4);
  assert.equal(actual.branchEdgeCount, 3);
  assert.equal(actual.subjectiveRecordCount, 1);
  assert.equal(actual.sceneObjectCount, 37);
  assert.equal(actual.sceneThreadCount, 22);
  assert.equal(actual.sceneComparisonCount, 0);
  assert.equal(actual.sceneRadarCount, 1);
});

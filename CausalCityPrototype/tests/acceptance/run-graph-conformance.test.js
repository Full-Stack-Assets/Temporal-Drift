import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-run-graph.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/run-graph-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical RunGraph identities and hashes', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  assert.deepEqual(actual, expected);
  assert.equal(actual.fixtureVersion, 'run-graph-v1');
  assert.match(actual.graphId, /^graph-[a-f0-9]{64}$/);
  assert.match(actual.rootBranchId, /^branch-[a-f0-9]{64}$/);
  assert.equal(actual.branchIds.length, 4);
  assert.equal(new Set(actual.branchIds).size, 4);
  assert.match(actual.graphHash, /^[a-f0-9]{64}$/);
  assert.match(actual.exportedBytesHash, /^[a-f0-9]{64}$/);
  assert.ok(actual.exportedByteLength > 0);
});

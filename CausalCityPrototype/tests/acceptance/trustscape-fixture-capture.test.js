import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-trustscape-fixture.js', import.meta.url));
const pinned = (await readFile(new URL('../../data/trustscape-lite-fixture.json', import.meta.url), 'utf8')).trim();

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: Trustscape browser fixture is byte-identical across fresh processes and pinned data', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  assert.equal(outputs[0], pinned);
  const fixture = JSON.parse(pinned);
  assert.equal(fixture.format, 'trustscape-lite-fixture');
  assert.equal(fixture.schemaVersion, '1.0.0');
  assert.match(fixture.fixtureHash, /^[a-f0-9]{64}$/);
  assert.match(fixture.sourceProjectionHash, /^[a-f0-9]{64}$/);
  assert.ok(fixture.points.length > 0);
  assert.ok(fixture.receiptThreads.length > 0);
});

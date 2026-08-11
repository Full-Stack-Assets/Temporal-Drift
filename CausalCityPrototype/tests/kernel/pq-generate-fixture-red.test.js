import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = fileURLToPath(new URL('./helpers/generate-ml-dsa-fixture.js', import.meta.url));

test('ML-DSA fixture is generated only on capable Node 24 and remains an explicit pinning gate', () => {
  const major = Number(process.versions.node.split('.')[0]);
  if (major === 22) {
    const child = spawnSync(process.execPath, [helper], { encoding: 'utf8' });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /requires Node 24/u);
    return;
  }

  assert.equal(major, 24);
  const child = spawnSync(process.execPath, [helper], { encoding: 'utf8', timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  const actual = JSON.parse(child.stdout.trim());
  console.log(`ML_DSA_FIXTURE_ACTUAL=${JSON.stringify(actual)}`);
  assert.fail('Deliberate RED: pin the observed Node 24 ML-DSA fixture, then replace this generator gate with fixture verification');
});

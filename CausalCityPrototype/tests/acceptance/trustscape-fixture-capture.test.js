import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-trustscape-fixture.js', import.meta.url));

test('acceptance: capture deterministic Trustscape fixture before pinning', () => {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  const output = child.stdout.trim();
  const second = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout.trim(), output);
  console.log(`TRUSTSCAPE_BROWSER_ACTUAL=${output}`);
  assert.fail('E_FIXTURE_UNPINNED: pin data/trustscape-lite-fixture.json from the emitted canonical bytes');
});

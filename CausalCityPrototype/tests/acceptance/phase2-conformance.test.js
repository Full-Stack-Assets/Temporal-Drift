import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-phase2-conformance.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/phase2-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical Phase-2 approximation artifacts', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`PHASE2_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);
  assert.equal(actual.fixtureVersion, 'phase2-approximation-v1');
  for (const hash of [
    actual.topographyHash,
    actual.topographyBytesHash,
    actual.rankingHash,
    actual.rankingBytesHash,
    actual.memoryBundleBytesHash,
    actual.anomalyQueueHash,
    actual.anomalyQueueBytesHash,
    actual.sampleAnomalyClassificationHash,
  ]) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(actual.humanReviewRequired, true);
  assert.equal(actual.autoForkAllowed, false);
  assert.equal(actual.autoCalibrationAllowed, false);
});

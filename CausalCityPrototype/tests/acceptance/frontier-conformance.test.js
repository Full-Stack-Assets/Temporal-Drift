import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-frontier-conformance.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/frontier-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8', timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical frontier commitments and verification artifacts', () => {
  const outputs = Array.from({ length: 2 }, emit);
  assert.equal(outputs[1], outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`FRONTIER_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);
  assert.equal(actual.populationSize, 100000);
  assert.ok(actual.populationShardCount > 0);
  for (const hash of [
    actual.populationRoot,
    actual.populationFirstShardHash,
    actual.populationLastShardHash,
    actual.populationBytesHash,
    actual.crystalRootHash,
    actual.crystalHash,
    actual.crystalBytesHash,
    actual.rewindArtifactHash,
    actual.rewindBytesHash,
    actual.rewindTargetReceiptHash,
    actual.rewindRestoredReceiptHash,
    actual.rewindRestoredStateHash,
    actual.surpriseHash,
    actual.robustnessHash,
    actual.robustnessBytesHash,
    actual.institutionalTerminalRecordHash,
    actual.institutionalLedgerBytesHash,
  ]) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(actual.crystalProofVerified, true);
  assert.equal(actual.rewindRestoredReceiptHash, actual.rewindTargetReceiptHash);
  assert.equal(actual.surpriseHumanReviewRequired, true);
  assert.equal(actual.surpriseAutoCalibrationAllowed, false);
  assert.equal(actual.surpriseAutoForkAllowed, false);
});

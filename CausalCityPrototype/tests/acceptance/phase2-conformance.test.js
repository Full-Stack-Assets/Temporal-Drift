import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-phase2.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/phase2-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical bounded Phase-2 artifacts', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`PHASE2_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);
  for (const key of [
    'topographyHash','topographyExportHash','explorationHash','explorationExportHash',
    'memoryArtifactHash','memoryExportHash','registryHash','registryExportHash',
    'workProfileHash','chunkPlanHash','chunkPlanExportHash','bundleHash',
  ]) assert.match(actual[key], /^[a-f0-9]{64}$/, key);
  assert.equal(actual.proposalStatus, 'approved-for-manual-simulation');
  assert.ok(actual.sampleIds.length > 0);
  assert.ok(actual.candidateCount >= 2);
  assert.ok(actual.paretoFrontier.length > 0);
  assert.ok(actual.explorationProposalIds.length > 0);
  assert.equal(actual.memoryRecordIds.length, 2);
  assert.equal(actual.registryReviewIds.length, 2);
  assert.ok(actual.chunkIds.length > 0);
  assert.ok(actual.topographyByteLength > 0);
  assert.ok(actual.explorationByteLength > 0);
  assert.ok(actual.memoryByteLength > 0);
  assert.ok(actual.registryByteLength > 0);
  assert.ok(actual.chunkPlanByteLength > 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-offline-capsule-conformance.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/offline-capsule-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8', timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical offline capsule and CLI evidence', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`OFFLINE_CAPSULE_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);

  for (const hash of [
    actual.artifactHash,
    actual.schemaBundleHash,
    actual.keyRegistryHash,
    actual.registryAwareBundleHash,
    actual.capsuleHash,
    actual.capsuleBytesHash,
    actual.reportHash,
    actual.cliStdoutHash,
  ]) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.match(actual.capsuleId, /^offline-capsule-[a-f0-9]{64}$/);
  for (const id of actual.attestationIds) assert.match(id, /^attestation-[a-f0-9]{64}$/);
  assert.ok(actual.artifactByteLength > 0);
  assert.ok(actual.capsuleByteLength > actual.artifactByteLength);
  assert.equal(actual.cliExitCode, 0);
  assert.equal(actual.artifactBytesVerified, true);
  assert.equal(actual.quorumStatus, 'quorum-met');
  assert.equal(actual.identityVerified, false);
  assert.equal(actual.independentReviewEstablished, false);
  assert.equal(actual.scientificValidityEstablished, false);
  assert.equal(actual.approvalAuthority, 'none');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-key-lifecycle-conformance.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/key-lifecycle-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8', timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical schemas, key history, and admissions', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`KEY_LIFECYCLE_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);

  for (const hash of [
    actual.schemaBundleHash,
    actual.emptyRegistryHash,
    actual.registerEventHash,
    actual.rotateEventHash,
    actual.revokeEventHash,
    actual.terminalRegistryHash,
    actual.registryBytesHash,
    actual.alphaFingerprint,
    actual.betaFingerprint,
    actual.alpha15AdmissionHash,
    actual.alpha20AdmissionHash,
    actual.beta25AdmissionHash,
    actual.beta30AdmissionHash,
    actual.registryAwareBundleHash,
  ]) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.match(actual.registryId, /^key-registry-[a-f0-9]{64}$/);
  assert.deepEqual(actual.alphaStatusVector, ['not-yet-active', 'active', 'active', 'superseded']);
  assert.deepEqual(actual.betaStatusVector, ['not-yet-active', 'active', 'active', 'revoked']);
  assert.equal(actual.alpha15Admitted, true);
  assert.equal(actual.alpha20Admitted, false);
  assert.equal(actual.beta25Admitted, true);
  assert.equal(actual.beta30Admitted, false);
  assert.equal(actual.registryAwareStatus, 'quorum-met');
  assert.equal(actual.identityVerified, false);
  assert.equal(actual.approvalAuthority, 'none');
});

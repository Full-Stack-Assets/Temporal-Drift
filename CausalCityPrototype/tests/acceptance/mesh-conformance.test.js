import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-mesh-conformance.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/mesh-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8', timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical signed mesh artifacts', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`MESH_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);
  for (const hash of [
    actual.profileBytesHash,
    actual.alphaStatementHash,
    actual.alphaPublicKeyFingerprint,
    actual.meshHash,
    actual.meshBytesHash,
    actual.anchorCommitmentHash,
    actual.anchorReceiptBytesHash,
    actual.proofStatementBytesHash,
  ]) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.match(actual.profileId, /^crypto-profile-[a-f0-9]{64}$/);
  assert.match(actual.alphaAttestationId, /^attestation-[a-f0-9]{64}$/);
  assert.match(actual.betaAttestationId, /^attestation-[a-f0-9]{64}$/);
  assert.match(actual.gammaAttestationId, /^attestation-[a-f0-9]{64}$/);
  assert.match(actual.meshPolicyId, /^mesh-policy-[a-f0-9]{64}$/);
  assert.match(actual.anchorRequestId, /^anchor-request-[a-f0-9]{64}$/);
  assert.match(actual.anchorReceiptId, /^anchor-receipt-[a-f0-9]{64}$/);
  assert.match(actual.proofStatementId, /^proof-statement-[a-f0-9]{64}$/);
  assert.match(actual.alphaSignature, /^[A-Za-z0-9_-]+$/);
  assert.equal(actual.meshStatus, 'quorum-met');
  assert.equal(actual.independenceVerified, false);
  assert.equal(actual.approvalAuthority, 'none');
  assert.equal(actual.anchorExternalPublicationPerformed, false);
  assert.equal(actual.anchorExternalVerificationRequired, true);
  assert.equal(actual.postQuantumMode, 'not-implemented');
  assert.equal(actual.quantumResistanceClaimed, false);
  assert.equal(actual.proofGenerated, false);
  assert.equal(actual.proofVerified, false);
});

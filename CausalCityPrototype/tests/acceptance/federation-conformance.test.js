import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const emitter = fileURLToPath(new URL('../kernel/helpers/emit-federation-conformance.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/federation-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [emitter], { encoding: 'utf8', timeout: 60000 });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical verification federation signatures and commitments', () => {
  const outputs = Array.from({ length: 2 }, emit);
  assert.equal(outputs[1], outputs[0]);
  const actual = JSON.parse(outputs[0]);
  console.log(`FEDERATION_CONFORMANCE_ACTUAL=${JSON.stringify(actual)}`);
  assert.deepEqual(actual, expected);

  const hashes = [
    actual.subjectHash,
    actual.verificationProcedureHash,
    actual.cryptoProfileHash,
    actual.verifierRegistryHash,
    actual.attestationABytesHash,
    actual.attestationAHash,
    actual.attestationBBytesHash,
    actual.attestationBHash,
    actual.revocationTerminalHash,
    actual.revocationLedgerHash,
    actual.passQuorumHash,
    actual.conflictQuorumHash,
    actual.anchorRequestHash,
    actual.anchorReceiptHash,
  ];
  for (const hash of hashes) assert.match(hash, /^[a-f0-9]{64}$/u);
  for (const signature of [actual.attestationASignatureBase64, actual.attestationBSignatureBase64]) {
    assert.match(signature, /^[A-Za-z0-9+/]+={0,2}$/u);
    assert.equal(Buffer.from(signature, 'base64').length, 64);
  }

  assert.equal(actual.passQuorumDisposition, 'quorum-pass');
  assert.equal(actual.conflictQuorumDisposition, 'conflicted');
  assert.equal(actual.revocationRecordCount, 1);
  assert.equal(actual.executionAuthority, 'none');
  assert.equal(actual.autoMergeAllowed, false);
  assert.equal(actual.autoTagAllowed, false);
  assert.equal(actual.autoCutoverAllowed, false);
  assert.equal(actual.postQuantumSecurityClaim, false);
  assert.equal(actual.zeroKnowledgeProofClaim, false);
  assert.equal(actual.anchorFinalityClaim, 'none');
  assert.equal(actual.reviewerIndependenceClaim, false);
});

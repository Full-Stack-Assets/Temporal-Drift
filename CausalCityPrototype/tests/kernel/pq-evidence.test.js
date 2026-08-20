import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import {
  createPqEvidenceEnvelope,
  verifyPqEvidenceEnvelope,
} from '../../src/pq/evidence.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/ml-dsa-65-test-evidence-v1.json', import.meta.url), 'utf8'));

function makeEnvelope(overrides = {}) {
  return createPqEvidenceEnvelope({
    algorithm: fixture.algorithm,
    subjectAttestationHash: fixture.classicalAttestationHash,
    unsignedPayloadHash: fixture.unsignedPayloadHash,
    publicKeySpkiBase64: fixture.publicKeySpkiBase64,
    publicKeyHash: fixture.publicKeyHash,
    signatureBase64: fixture.signatureBase64,
    signatureHash: fixture.signatureHash,
    contextBase64: fixture.contextBase64,
    sourceRuntimeClass: 'node-24-test-fixture',
    ...overrides,
  });
}

test('PQ evidence envelope is portable, deterministic, immutable, and content-addressed', () => {
  const left = makeEnvelope();
  const right = makeEnvelope();

  assert.equal(left.pqEvidenceVersion, 'pq-signature-evidence-v1');
  assert.equal(left.algorithm, 'ml-dsa-65');
  assert.equal(left.claimClass, 'optional-post-quantum-signature-evidence');
  assert.equal(left.executionAuthority, 'none');
  assert.match(left.pqEvidenceHash, /^[a-f0-9]{64}$/u);
  assert.equal(left.pqEvidenceHash, right.pqEvidenceHash);
  assert.equal(canonicalString(left), canonicalString(right));
  assert.equal(Object.isFrozen(left), true);
  assert.equal(verifyPqEvidenceEnvelope(left).ok, true);
});

test('PQ evidence verifier recomputes public key, signature, and top-level content commitments', () => {
  const evidence = makeEnvelope();
  const cases = [
    { ...evidence, publicKeyHash: '0'.repeat(64) },
    { ...evidence, signatureHash: '0'.repeat(64) },
    { ...evidence, pqEvidenceHash: '0'.repeat(64) },
    { ...evidence, subjectAttestationHash: '0'.repeat(64) },
    { ...evidence, unsignedPayloadHash: '0'.repeat(64) },
    { ...evidence, executionAuthority: 'release' },
    { ...evidence, claimClass: 'post-quantum-secure' },
    { ...evidence, unknown: true },
  ];

  for (const invalid of cases) {
    assert.throws(
      () => verifyPqEvidenceEnvelope(invalid),
      (error) => ['E_PQ_EVIDENCE', 'E_UNSAFE_VALUE'].includes(error?.code),
    );
  }
});

test('PQ evidence creation rejects malformed or unsupported inputs before any runtime capability decision', () => {
  for (const invalid of [
    { algorithm: 'ml-dsa-44' },
    { publicKeySpkiBase64: 'bad***' },
    { signatureBase64: 'bad***' },
    { publicKeyHash: 'bad' },
    { signatureHash: 'bad' },
    { contextBase64: 'bad***' },
    { sourceRuntimeClass: '' },
  ]) {
    assert.throws(
      () => makeEnvelope(invalid),
      (error) => error?.code === 'E_PQ_EVIDENCE',
    );
  }
});

test('changing any signed-evidence byte changes or invalidates the PQ evidence commitment', () => {
  const base = makeEnvelope();
  const signature = Buffer.from(fixture.signatureBase64, 'base64');
  signature[0] ^= 1;
  const changedSignature = signature.toString('base64');

  assert.throws(
    () => makeEnvelope({ signatureBase64: changedSignature }),
    (error) => error?.code === 'E_PQ_EVIDENCE',
  );
  assert.equal(verifyPqEvidenceEnvelope(base).ok, true);
});

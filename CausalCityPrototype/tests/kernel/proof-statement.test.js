import test from 'node:test';
import assert from 'node:assert/strict';

import { createCryptoPolicyProfile } from '../../src/mesh/crypto-profile.js';
import {
  createProofStatement,
  verifyProofStatement,
} from '../../src/mesh/proof-statement.js';

const profile = createCryptoPolicyProfile({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

function input() {
  return {
    statementType: 'receipt-chain-validity',
    artifactType: 'run-export',
    artifactHash: 'a'.repeat(64),
    cryptoProfileId: profile.profileId,
    statementVersion: '1.0.0',
    publicInputs: {
      receiptCount: 3,
      terminalReceiptHash: 'b'.repeat(64),
    },
    privateWitnessCommitmentHash: 'c'.repeat(64),
  };
}

test('future-ZK public statement is deterministic, immutable, and explicitly proof-free', () => {
  const first = createProofStatement(input());
  const second = createProofStatement(input());
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.match(first.statementId, /^proof-statement-[a-f0-9]{64}$/);
  assert.match(first.publicInputsHash, /^[a-f0-9]{64}$/);
  assert.equal(first.proofSystem, 'none');
  assert.equal(first.proofGenerated, false);
  assert.equal(first.proofVerified, false);
  assert.equal(first.statementOnly, true);
  assert.equal(first.executionAuthority, 'none');
  assert.deepEqual(verifyProofStatement(first), { ok: true, firstMismatch: null, statementId: first.statementId });
});

test('proof statement supports only bounded statement types and canonical public inputs', () => {
  for (const statementType of ['receipt-chain-validity', 'terminal-commitment-membership', 'manifest-conformance']) {
    assert.equal(createProofStatement({ ...input(), statementType }).statementType, statementType);
  }
  assert.throws(() => createProofStatement({ ...input(), statementType: 'policy-is-correct' }), { code: 'E_PROOF_STATEMENT_SCHEMA' });
  assert.throws(() => createProofStatement({ ...input(), privateWitness: { secret: true } }), { code: 'E_PROOF_STATEMENT_SCHEMA' });
  assert.throws(() => createProofStatement({ ...input(), proof: 'forged' }), { code: 'E_PROOF_STATEMENT_SCHEMA' });
  assert.throws(() => createProofStatement({ ...input(), publicInputs: { unsafe: 1.5 } }), { code: 'E_PROOF_STATEMENT_SCHEMA' });
});

test('proof statement verification rejects stale nested commitments and overclaim mutations', () => {
  const statement = createProofStatement(input());
  for (const tampered of [
    { ...statement, statementId: `proof-statement-${'0'.repeat(64)}` },
    { ...statement, publicInputsHash: '1'.repeat(64) },
    { ...statement, publicInputs: { ...statement.publicInputs, receiptCount: 4 } },
    { ...statement, proofGenerated: true },
    { ...statement, proofVerified: true },
    { ...statement, proofSystem: 'groth16' },
  ]) assert.equal(verifyProofStatement(tampered).ok, false);
});

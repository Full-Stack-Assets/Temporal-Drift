import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createCryptoProfile } from '../../src/federation/crypto-profile.js';
import { createVerifierRegistry } from '../../src/federation/verifier-registry.js';
import {
  createVerificationAttestation,
  verifyVerificationAttestation,
} from '../../src/federation/attestation.js';
import {
  appendVerifierRevocation,
  createRevocationLedger,
  isKeyRevokedAt,
  verifyRevocationLedger,
} from '../../src/federation/revocation.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B] = fixture.keys;

function setup() {
  const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
  const registry = createVerifierRegistry({
    registryVersion: 'verifier-registry-v1',
    cryptoProfileHash: profile.profileHash,
    verifiers: [KEY_A, KEY_B].map((key, index) => ({
      verifierId: key.verifierId,
      keyId: key.keyId,
      algorithm: 'ed25519',
      publicKeySpkiBase64: key.publicKeySpkiBase64,
      weight: 1,
      validFromLogicalTime: 1,
      validUntilLogicalTime: null,
      role: key.role,
      index,
    })).map(({ index: _index, ...entry }) => entry),
  }, profile);
  return { profile, registry };
}

function unsigned(registry, logicalTime) {
  return {
    attestationVersion: 'verification-attestation-v1',
    registryHash: registry.registryHash,
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime,
    subjectType: 'frontier-foundations',
    subjectId: 'frontier-foundations-v1',
    subjectHash: 'd'.repeat(64),
    verificationProcedureId: 'npm-run-verify-v1',
    verificationProcedureHash: 'a'.repeat(64),
    verdict: 'pass',
    findingsHash: null,
    limitationsHash: null,
  };
}

test('revocation ledger appends immutably and resolves logical-time validity', () => {
  const { registry } = setup();
  const empty = createRevocationLedger(registry.registryHash);
  const emptyBytes = canonicalString(empty);

  const first = appendVerifierRevocation(empty, {
    verifierId: KEY_B.verifierId,
    keyId: KEY_B.keyId,
    logicalTime: 20,
    reasonCode: 'key-rotation',
    sourceEvidenceHash: 'c'.repeat(64),
  });
  const second = appendVerifierRevocation(first, {
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime: 30,
    reasonCode: 'key-compromise',
    sourceEvidenceHash: 'e'.repeat(64),
  });

  assert.equal(canonicalString(empty), emptyBytes);
  assert.equal(empty.records.length, 0);
  assert.equal(first.records.length, 1);
  assert.equal(second.records.length, 2);
  assert.equal(second.records[1].previousRevocationHash, first.records[0].recordHash);
  assert.equal(second.terminalRevocationHash, second.records[1].recordHash);
  assert.equal(Object.isFrozen(second), true);
  assert.equal(Object.isFrozen(second.records), true);
  assert.equal(verifyRevocationLedger(second).ok, true);

  assert.equal(isKeyRevokedAt(second, { verifierId: KEY_A.verifierId, keyId: KEY_A.keyId, logicalTime: 29 }), false);
  assert.equal(isKeyRevokedAt(second, { verifierId: KEY_A.verifierId, keyId: KEY_A.keyId, logicalTime: 30 }), true);
  assert.equal(isKeyRevokedAt(second, { verifierId: KEY_A.verifierId, keyId: KEY_A.keyId, logicalTime: 31 }), true);
});

test('revocation ledger rejects non-monotonic time, duplicates, malformed hashes, and registry mismatch', () => {
  const { registry } = setup();
  const empty = createRevocationLedger(registry.registryHash);
  const first = appendVerifierRevocation(empty, {
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime: 30,
    reasonCode: 'key-compromise',
    sourceEvidenceHash: 'e'.repeat(64),
  });

  for (const record of [
    {
      verifierId: KEY_B.verifierId,
      keyId: KEY_B.keyId,
      logicalTime: 30,
      reasonCode: 'same-time',
      sourceEvidenceHash: 'f'.repeat(64),
    },
    {
      verifierId: KEY_B.verifierId,
      keyId: KEY_B.keyId,
      logicalTime: 29,
      reasonCode: 'backward-time',
      sourceEvidenceHash: 'f'.repeat(64),
    },
    {
      verifierId: KEY_A.verifierId,
      keyId: KEY_A.keyId,
      logicalTime: 31,
      reasonCode: 'duplicate-key',
      sourceEvidenceHash: 'f'.repeat(64),
    },
    {
      verifierId: KEY_B.verifierId,
      keyId: KEY_B.keyId,
      logicalTime: 31,
      reasonCode: 'bad-hash',
      sourceEvidenceHash: 'bad',
    },
  ]) {
    assert.throws(
      () => appendVerifierRevocation(first, record),
      (error) => error?.code === 'E_REVOCATION_SCHEMA',
    );
  }

  assert.throws(
    () => createRevocationLedger('bad'),
    (error) => error?.code === 'E_REVOCATION_SCHEMA',
  );
});

test('revocation chain verification detects content, link, terminal, and ledger-hash tampering', () => {
  const { registry } = setup();
  let ledger = createRevocationLedger(registry.registryHash);
  ledger = appendVerifierRevocation(ledger, {
    verifierId: KEY_B.verifierId,
    keyId: KEY_B.keyId,
    logicalTime: 20,
    reasonCode: 'key-rotation',
    sourceEvidenceHash: 'c'.repeat(64),
  });
  ledger = appendVerifierRevocation(ledger, {
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime: 30,
    reasonCode: 'key-compromise',
    sourceEvidenceHash: 'e'.repeat(64),
  });

  const cases = [
    { ...ledger, ledgerHash: '0'.repeat(64) },
    { ...ledger, terminalRevocationHash: '0'.repeat(64) },
    { ...ledger, records: [{ ...ledger.records[0], sourceEvidenceHash: 'f'.repeat(64) }, ledger.records[1]] },
    { ...ledger, records: [ledger.records[0], { ...ledger.records[1], previousRevocationHash: '0'.repeat(64) }] },
  ];

  for (const tampered of cases) {
    assert.throws(
      () => verifyRevocationLedger(tampered),
      (error) => error?.code === 'E_REVOCATION_SCHEMA',
    );
  }
});

test('attestation verification honors revocation at the attestation logical time', () => {
  const { profile, registry } = setup();
  const before = createVerificationAttestation(unsigned(registry, 29), KEY_A.privateKeyPem, registry, profile);
  const at = createVerificationAttestation(unsigned(registry, 30), KEY_A.privateKeyPem, registry, profile);
  let ledger = createRevocationLedger(registry.registryHash);
  ledger = appendVerifierRevocation(ledger, {
    verifierId: KEY_A.verifierId,
    keyId: KEY_A.keyId,
    logicalTime: 30,
    reasonCode: 'key-compromise',
    sourceEvidenceHash: 'e'.repeat(64),
  });

  assert.equal(verifyVerificationAttestation(before, registry, profile, ledger).ok, true);
  assert.throws(
    () => verifyVerificationAttestation(at, registry, profile, ledger),
    (error) => error?.code === 'E_ATTESTATION_REVOKED',
  );
});

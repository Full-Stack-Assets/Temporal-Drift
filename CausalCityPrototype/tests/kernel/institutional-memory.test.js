import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendInstitutionalMemory,
  createInstitutionalMemoryLedger,
  verifyInstitutionalMemoryLedger,
} from '../../src/frontier/institutional-memory.js';
import { canonicalString } from '../../src/kernel/canonicalize.js';

function record(logicalTime, decisionId) {
  return {
    decisionId,
    logicalTime,
    sourceEvidenceHash: 'a'.repeat(64),
    decisionSummary: `Decision ${decisionId}`,
    expectedOutcomeHash: 'b'.repeat(64),
    observedOutcomeHash: logicalTime > 1 ? 'c'.repeat(64) : null,
    narrativeHash: null,
    reviewStatus: logicalTime > 1 ? 'reviewed' : 'pending',
  };
}

test('institutional memory appends immutably with hash-linked records', () => {
  const empty = createInstitutionalMemoryLedger();
  const one = appendInstitutionalMemory(empty, record(1, 'd1'));
  const oneBytes = canonicalString(one);
  const two = appendInstitutionalMemory(one, record(2, 'd2'));

  assert.equal(empty.records.length, 0);
  assert.equal(one.records.length, 1);
  assert.equal(two.records.length, 2);
  assert.equal(canonicalString(one), oneBytes);
  assert.equal(two.records[1].previousRecordHash, one.records[0].recordHash);
  assert.match(two.records[1].recordHash, /^[a-f0-9]{64}$/);
  assert.equal(verifyInstitutionalMemoryLedger(two).ok, true);
  assert.ok(Object.isFrozen(two));
});

test('institutional memory verification rejects content and link tampering', () => {
  let ledger = createInstitutionalMemoryLedger();
  ledger = appendInstitutionalMemory(ledger, record(1, 'd1'));
  ledger = appendInstitutionalMemory(ledger, record(2, 'd2'));

  const content = structuredClone(ledger);
  content.records[1].decisionSummary = 'tampered';
  assert.equal(verifyInstitutionalMemoryLedger(content).ok, false);

  const link = structuredClone(ledger);
  link.records[1].previousRecordHash = 'f'.repeat(64);
  assert.equal(verifyInstitutionalMemoryLedger(link).ok, false);
});

test('institutional memory rejects non-monotonic logical time and malformed hashes', () => {
  let ledger = createInstitutionalMemoryLedger();
  ledger = appendInstitutionalMemory(ledger, record(2, 'd1'));
  assert.throws(() => appendInstitutionalMemory(ledger, record(1, 'd2')), { code: 'E_INSTITUTIONAL_MEMORY_SCHEMA' });
  assert.throws(() => appendInstitutionalMemory(createInstitutionalMemoryLedger(), { ...record(1, 'bad'), sourceEvidenceHash: 'bad' }), { code: 'E_INSTITUTIONAL_MEMORY_SCHEMA' });
});

import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

const HASH = /^[a-f0-9]{64}$/;
const STATUSES = new Set(['pending', 'reviewed', 'accepted', 'rejected']);

function fail(message, path = 'institutionalMemory') {
  throw new TrustKernelError('E_INSTITUTIONAL_MEMORY_SCHEMA', message, { path });
}

function hashOrNull(value, path) {
  if (value === null) return null;
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${path} must be null or a SHA-256 hash`, path);
  return value;
}

function normalizeRecordInput(input) {
  const keys = ['decisionId', 'logicalTime', 'sourceEvidenceHash', 'decisionSummary', 'expectedOutcomeHash', 'observedOutcomeHash', 'narrativeHash', 'reviewStatus'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.getPrototypeOf(input) !== Object.prototype) fail('record must be a plain object', 'record');
  const own = Reflect.ownKeys(input);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key))) fail('record contains missing, hidden, symbol, or unknown fields', 'record');
  if (typeof input.decisionId !== 'string' || input.decisionId.length === 0) fail('decisionId must be a non-empty string', 'record.decisionId');
  if (!Number.isSafeInteger(input.logicalTime) || input.logicalTime < 0) fail('logicalTime must be a non-negative safe integer', 'record.logicalTime');
  if (typeof input.decisionSummary !== 'string' || input.decisionSummary.length === 0) fail('decisionSummary must be a non-empty string', 'record.decisionSummary');
  if (!STATUSES.has(input.reviewStatus)) fail('reviewStatus is unsupported', 'record.reviewStatus');
  return cloneAndFreeze({
    decisionId: input.decisionId.normalize('NFC'),
    logicalTime: input.logicalTime,
    sourceEvidenceHash: hashOrNull(input.sourceEvidenceHash, 'record.sourceEvidenceHash'),
    decisionSummary: input.decisionSummary.normalize('NFC'),
    expectedOutcomeHash: hashOrNull(input.expectedOutcomeHash, 'record.expectedOutcomeHash'),
    observedOutcomeHash: hashOrNull(input.observedOutcomeHash, 'record.observedOutcomeHash'),
    narrativeHash: hashOrNull(input.narrativeHash, 'record.narrativeHash'),
    reviewStatus: input.reviewStatus,
  });
}

function recordCore(input, sequence, previousRecordHash) {
  return cloneAndFreeze({ sequence, previousRecordHash, ...input });
}

export function createInstitutionalMemoryLedger() {
  return cloneAndFreeze({ format: 'institutional-memory-ledger', schemaVersion: '1.0.0', records: [] });
}

export function appendInstitutionalMemory(ledger, input) {
  const verification = verifyInstitutionalMemoryLedger(ledger);
  if (!verification.ok) fail('ledger must verify before append', verification.firstMismatch ?? 'ledger');
  const normalized = normalizeRecordInput(input);
  const previous = ledger.records.at(-1) ?? null;
  if (previous && normalized.logicalTime < previous.logicalTime) fail('logicalTime cannot move backward', 'record.logicalTime');
  const core = recordCore(normalized, ledger.records.length, previous?.recordHash ?? null);
  const record = cloneAndFreeze({ ...core, recordHash: sha256Hex(core) });
  return cloneAndFreeze({ ...ledger, records: [...ledger.records, record] });
}

export function verifyInstitutionalMemoryLedger(ledger) {
  try {
    if (!ledger || ledger.format !== 'institutional-memory-ledger' || ledger.schemaVersion !== '1.0.0' || !Array.isArray(ledger.records)) return cloneAndFreeze({ ok: false, firstMismatch: 'ledger' });
    let previousHash = null;
    let previousTime = -1;
    for (let index = 0; index < ledger.records.length; index += 1) {
      const record = ledger.records[index];
      if (!record || record.sequence !== index || record.previousRecordHash !== previousHash || !HASH.test(record.recordHash)) return cloneAndFreeze({ ok: false, firstMismatch: `records.${index}` });
      const input = normalizeRecordInput({
        decisionId: record.decisionId,
        logicalTime: record.logicalTime,
        sourceEvidenceHash: record.sourceEvidenceHash,
        decisionSummary: record.decisionSummary,
        expectedOutcomeHash: record.expectedOutcomeHash,
        observedOutcomeHash: record.observedOutcomeHash,
        narrativeHash: record.narrativeHash,
        reviewStatus: record.reviewStatus,
      });
      if (input.logicalTime < previousTime) return cloneAndFreeze({ ok: false, firstMismatch: `records.${index}.logicalTime` });
      const core = recordCore(input, index, previousHash);
      if (sha256Hex(core) !== record.recordHash) return cloneAndFreeze({ ok: false, firstMismatch: `records.${index}.recordHash` });
      previousHash = record.recordHash;
      previousTime = input.logicalTime;
    }
    return cloneAndFreeze({ ok: true, firstMismatch: null, recordCount: ledger.records.length, terminalRecordHash: previousHash });
  } catch {
    return cloneAndFreeze({ ok: false, firstMismatch: 'ledger' });
  }
}

import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

const LEDGER_VERSION = 'verifier-revocation-ledger-v1';
const HASH_RE = /^[a-f0-9]{64}$/u;
const INPUT_KEYS = ['verifierId', 'keyId', 'logicalTime', 'reasonCode', 'sourceEvidenceHash'];
const RECORD_KEYS = [
  'revocationId', 'registryHash', 'verifierId', 'keyId', 'logicalTime', 'reasonCode',
  'sourceEvidenceHash', 'previousRevocationHash', 'recordHash',
];
const LEDGER_KEYS = ['ledgerVersion', 'registryHash', 'records', 'terminalRevocationHash', 'ledgerHash'];

function exactObject(value, keys, label) {
  let normalized;
  try {
    normalized = normalizeCanonicalValue(value);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `${label} is not canonical`);
  }
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `${label} must be an object`);
  }
  const actual = Object.keys(normalized).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `${label} contains missing or unknown fields`);
  }
  return normalized;
}

function requireHash(value, label, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !HASH_RE.test(value)) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `${label} must be a lowercase SHA-256 digest${nullable ? ' or null' : ''}`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `${label} must be a non-empty string`);
  }
}

function recordCore(fields) {
  return {
    registryHash: fields.registryHash,
    verifierId: fields.verifierId,
    keyId: fields.keyId,
    logicalTime: fields.logicalTime,
    reasonCode: fields.reasonCode,
    sourceEvidenceHash: fields.sourceEvidenceHash,
    previousRevocationHash: fields.previousRevocationHash,
  };
}

function deriveRecord(core) {
  const revocationId = `revocation-${sha256Hex(core)}`;
  const withoutHash = { revocationId, ...core };
  return { ...withoutHash, recordHash: sha256Hex(withoutHash) };
}

function ledgerCore(ledgerVersion, registryHash, records, terminalRevocationHash) {
  return { ledgerVersion, registryHash, records, terminalRevocationHash };
}

function keyIdentity(verifierId, keyId) {
  return sha256Hex({ verifierId, keyId });
}

export function createRevocationLedger(registryHash) {
  requireHash(registryHash, 'registryHash');
  const core = ledgerCore(LEDGER_VERSION, registryHash, [], null);
  return cloneAndFreeze({ ...core, ledgerHash: sha256Hex(core) });
}

export function verifyRevocationLedger(rawLedger) {
  const ledger = exactObject(rawLedger, LEDGER_KEYS, 'Revocation ledger');
  if (ledger.ledgerVersion !== LEDGER_VERSION) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `Unsupported revocation ledger version: ${ledger.ledgerVersion}`);
  }
  requireHash(ledger.registryHash, 'registryHash');
  requireHash(ledger.terminalRevocationHash, 'terminalRevocationHash', true);
  requireHash(ledger.ledgerHash, 'ledgerHash');
  if (!Array.isArray(ledger.records)) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation ledger records must be an array');
  }

  let previousRevocationHash = null;
  let previousLogicalTime = -1;
  const revokedKeys = new Set();
  const verifiedRecords = [];

  for (const rawRecord of ledger.records) {
    const record = exactObject(rawRecord, RECORD_KEYS, 'Revocation record');
    requireString(record.revocationId, 'revocationId');
    requireString(record.verifierId, 'verifierId');
    requireString(record.keyId, 'keyId');
    requireString(record.reasonCode, 'reasonCode');
    requireHash(record.registryHash, 'record.registryHash');
    requireHash(record.sourceEvidenceHash, 'sourceEvidenceHash');
    requireHash(record.previousRevocationHash, 'previousRevocationHash', true);
    requireHash(record.recordHash, 'recordHash');
    if (!Number.isSafeInteger(record.logicalTime) || record.logicalTime < 0) {
      throw new TrustKernelError('E_REVOCATION_SCHEMA', 'logicalTime must be a non-negative safe integer');
    }
    if (record.registryHash !== ledger.registryHash) {
      throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation record registry hash does not match ledger');
    }
    if (record.logicalTime <= previousLogicalTime) {
      throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation logical time must strictly increase');
    }
    if (record.previousRevocationHash !== previousRevocationHash) {
      throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation previous-record link is invalid');
    }
    const identity = keyIdentity(record.verifierId, record.keyId);
    if (revokedKeys.has(identity)) {
      throw new TrustKernelError('E_REVOCATION_SCHEMA', `Verifier key is revoked more than once: ${record.verifierId}/${record.keyId}`);
    }

    const expected = deriveRecord(recordCore(record));
    if (record.revocationId !== expected.revocationId || record.recordHash !== expected.recordHash) {
      throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation record content address is invalid');
    }

    revokedKeys.add(identity);
    previousLogicalTime = record.logicalTime;
    previousRevocationHash = record.recordHash;
    verifiedRecords.push(record);
  }

  const expectedTerminal = verifiedRecords.length ? verifiedRecords.at(-1).recordHash : null;
  if (ledger.terminalRevocationHash !== expectedTerminal) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation terminal hash is invalid');
  }
  const core = ledgerCore(ledger.ledgerVersion, ledger.registryHash, verifiedRecords, expectedTerminal);
  if (ledger.ledgerHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation ledger hash is invalid');
  }

  return cloneAndFreeze({
    ok: true,
    registryHash: ledger.registryHash,
    recordCount: verifiedRecords.length,
    terminalRevocationHash: expectedTerminal,
    ledgerHash: ledger.ledgerHash,
  });
}

export function appendVerifierRevocation(rawLedger, rawRecord) {
  verifyRevocationLedger(rawLedger);
  const ledger = normalizeCanonicalValue(rawLedger);
  const input = exactObject(rawRecord, INPUT_KEYS, 'Revocation input');
  requireString(input.verifierId, 'verifierId');
  requireString(input.keyId, 'keyId');
  requireString(input.reasonCode, 'reasonCode');
  requireHash(input.sourceEvidenceHash, 'sourceEvidenceHash');
  if (!Number.isSafeInteger(input.logicalTime) || input.logicalTime < 0) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', 'logicalTime must be a non-negative safe integer');
  }
  const previous = ledger.records.at(-1) ?? null;
  if (previous && input.logicalTime <= previous.logicalTime) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', 'Revocation logical time must strictly increase');
  }
  if (ledger.records.some((record) => record.verifierId === input.verifierId && record.keyId === input.keyId)) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', `Verifier key is already revoked: ${input.verifierId}/${input.keyId}`);
  }

  const record = deriveRecord(recordCore({
    registryHash: ledger.registryHash,
    verifierId: input.verifierId,
    keyId: input.keyId,
    logicalTime: input.logicalTime,
    reasonCode: input.reasonCode,
    sourceEvidenceHash: input.sourceEvidenceHash,
    previousRevocationHash: previous?.recordHash ?? null,
  }));
  const records = [...ledger.records, record];
  const core = ledgerCore(ledger.ledgerVersion, ledger.registryHash, records, record.recordHash);
  return cloneAndFreeze({ ...core, ledgerHash: sha256Hex(core) });
}

export function isKeyRevokedAt(rawLedger, query) {
  verifyRevocationLedger(rawLedger);
  const ledger = normalizeCanonicalValue(rawLedger);
  const normalized = exactObject(query, ['verifierId', 'keyId', 'logicalTime'], 'Revocation query');
  requireString(normalized.verifierId, 'verifierId');
  requireString(normalized.keyId, 'keyId');
  if (!Number.isSafeInteger(normalized.logicalTime) || normalized.logicalTime < 0) {
    throw new TrustKernelError('E_REVOCATION_SCHEMA', 'logicalTime must be a non-negative safe integer');
  }
  return ledger.records.some((record) => record.verifierId === normalized.verifierId
    && record.keyId === normalized.keyId
    && record.logicalTime <= normalized.logicalTime);
}

import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

const REQUEST_VERSION = 'anchor-request-v1';
const RECEIPT_VERSION = 'anchor-receipt-v1';
const HASH_RE = /^[a-f0-9]{64}$/u;
const REQUEST_INPUT_KEYS = ['subjectType', 'subjectId', 'subjectHash', 'targetProfile', 'nonce'];
const REQUEST_KEYS = ['requestVersion', ...REQUEST_INPUT_KEYS, 'requestHash'];
const RECEIPT_INPUT_KEYS = [
  'request',
  'providerId',
  'providerReceiptId',
  'anchoredHash',
  'externalLocator',
  'observedAt',
  'providerEvidenceHash',
];
const RECEIPT_KEYS = [
  'receiptVersion',
  'requestHash',
  'providerId',
  'providerReceiptId',
  'anchoredHash',
  'externalLocator',
  'observedAt',
  'providerEvidenceHash',
  'evidenceClass',
  'finalityClaim',
  'timestampAuthorityClaim',
  'executionAuthority',
  'receiptHash',
];

function exactObject(value, keys, code, label) {
  let normalized;
  try {
    normalized = normalizeCanonicalValue(value);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    throw new TrustKernelError(code, `${label} is not canonical`);
  }
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') {
    throw new TrustKernelError(code, `${label} must be an object`);
  }
  const actual = Object.keys(normalized).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TrustKernelError(code, `${label} contains missing or unknown fields`);
  }
  return normalized;
}

function requireString(value, code, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError(code, `${label} must be a non-empty string`);
  }
}

function requireHash(value, code, label) {
  if (typeof value !== 'string' || !HASH_RE.test(value)) {
    throw new TrustKernelError(code, `${label} must be a lowercase SHA-256 digest`);
  }
}

function requestCore(input) {
  return {
    requestVersion: REQUEST_VERSION,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    subjectHash: input.subjectHash,
    targetProfile: input.targetProfile,
    nonce: input.nonce,
  };
}

export function createAnchorRequest(rawInput) {
  const input = exactObject(rawInput, REQUEST_INPUT_KEYS, 'E_ANCHOR_REQUEST', 'Anchor request input');
  requireString(input.subjectType, 'E_ANCHOR_REQUEST', 'subjectType');
  requireString(input.subjectId, 'E_ANCHOR_REQUEST', 'subjectId');
  requireHash(input.subjectHash, 'E_ANCHOR_REQUEST', 'subjectHash');
  requireString(input.targetProfile, 'E_ANCHOR_REQUEST', 'targetProfile');
  requireString(input.nonce, 'E_ANCHOR_REQUEST', 'nonce');
  const core = requestCore(input);
  return cloneAndFreeze({ ...core, requestHash: sha256Hex(core) });
}

export function verifyAnchorRequest(rawRequest) {
  const request = exactObject(rawRequest, REQUEST_KEYS, 'E_ANCHOR_REQUEST', 'Anchor request');
  if (request.requestVersion !== REQUEST_VERSION) {
    throw new TrustKernelError('E_ANCHOR_REQUEST', `Unsupported anchor request version: ${request.requestVersion}`);
  }
  requireString(request.subjectType, 'E_ANCHOR_REQUEST', 'subjectType');
  requireString(request.subjectId, 'E_ANCHOR_REQUEST', 'subjectId');
  requireHash(request.subjectHash, 'E_ANCHOR_REQUEST', 'subjectHash');
  requireString(request.targetProfile, 'E_ANCHOR_REQUEST', 'targetProfile');
  requireString(request.nonce, 'E_ANCHOR_REQUEST', 'nonce');
  requireHash(request.requestHash, 'E_ANCHOR_REQUEST', 'requestHash');
  const core = requestCore(request);
  if (request.requestHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_ANCHOR_REQUEST', 'Anchor request content hash is invalid');
  }
  return cloneAndFreeze({ ok: true, requestHash: request.requestHash, subjectHash: request.subjectHash });
}

function receiptCore(input) {
  return {
    receiptVersion: RECEIPT_VERSION,
    requestHash: input.requestHash,
    providerId: input.providerId,
    providerReceiptId: input.providerReceiptId,
    anchoredHash: input.anchoredHash,
    externalLocator: input.externalLocator,
    observedAt: input.observedAt,
    providerEvidenceHash: input.providerEvidenceHash,
    evidenceClass: 'external-anchor-linkage-evidence',
    finalityClaim: 'none',
    timestampAuthorityClaim: 'none',
    executionAuthority: 'none',
  };
}

export function createAnchorReceipt(rawInput) {
  const input = exactObject(rawInput, RECEIPT_INPUT_KEYS, 'E_ANCHOR_RECEIPT', 'Anchor receipt input');
  const requestReport = verifyAnchorRequest(input.request);
  requireString(input.providerId, 'E_ANCHOR_RECEIPT', 'providerId');
  requireString(input.providerReceiptId, 'E_ANCHOR_RECEIPT', 'providerReceiptId');
  requireHash(input.anchoredHash, 'E_ANCHOR_RECEIPT', 'anchoredHash');
  requireString(input.externalLocator, 'E_ANCHOR_RECEIPT', 'externalLocator');
  requireString(input.observedAt, 'E_ANCHOR_RECEIPT', 'observedAt');
  requireHash(input.providerEvidenceHash, 'E_ANCHOR_RECEIPT', 'providerEvidenceHash');
  if (input.anchoredHash !== requestReport.subjectHash) {
    throw new TrustKernelError('E_ANCHOR_RECEIPT', 'Anchored hash does not match request subject hash');
  }
  const core = receiptCore({
    requestHash: requestReport.requestHash,
    providerId: input.providerId,
    providerReceiptId: input.providerReceiptId,
    anchoredHash: input.anchoredHash,
    externalLocator: input.externalLocator,
    observedAt: input.observedAt,
    providerEvidenceHash: input.providerEvidenceHash,
  });
  return cloneAndFreeze({ ...core, receiptHash: sha256Hex(core) });
}

export function verifyAnchorReceipt(rawReceipt, rawRequest) {
  const requestReport = verifyAnchorRequest(rawRequest);
  const receipt = exactObject(rawReceipt, RECEIPT_KEYS, 'E_ANCHOR_RECEIPT', 'Anchor receipt');
  if (receipt.receiptVersion !== RECEIPT_VERSION) {
    throw new TrustKernelError('E_ANCHOR_RECEIPT', `Unsupported anchor receipt version: ${receipt.receiptVersion}`);
  }
  requireHash(receipt.requestHash, 'E_ANCHOR_RECEIPT', 'requestHash');
  requireString(receipt.providerId, 'E_ANCHOR_RECEIPT', 'providerId');
  requireString(receipt.providerReceiptId, 'E_ANCHOR_RECEIPT', 'providerReceiptId');
  requireHash(receipt.anchoredHash, 'E_ANCHOR_RECEIPT', 'anchoredHash');
  requireString(receipt.externalLocator, 'E_ANCHOR_RECEIPT', 'externalLocator');
  requireString(receipt.observedAt, 'E_ANCHOR_RECEIPT', 'observedAt');
  requireHash(receipt.providerEvidenceHash, 'E_ANCHOR_RECEIPT', 'providerEvidenceHash');
  requireHash(receipt.receiptHash, 'E_ANCHOR_RECEIPT', 'receiptHash');
  if (receipt.evidenceClass !== 'external-anchor-linkage-evidence'
      || receipt.finalityClaim !== 'none'
      || receipt.timestampAuthorityClaim !== 'none'
      || receipt.executionAuthority !== 'none') {
    throw new TrustKernelError('E_ANCHOR_RECEIPT', 'Anchor receipt authority or evidence class is invalid');
  }
  if (receipt.requestHash !== requestReport.requestHash) {
    throw new TrustKernelError('E_ANCHOR_RECEIPT', 'Anchor receipt is linked to a different request');
  }
  if (receipt.anchoredHash !== requestReport.subjectHash) {
    throw new TrustKernelError('E_ANCHOR_RECEIPT', 'Anchor receipt hash does not match request subject hash');
  }
  const core = receiptCore(receipt);
  if (receipt.receiptHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_ANCHOR_RECEIPT', 'Anchor receipt content hash is invalid');
  }
  return cloneAndFreeze({
    ok: true,
    requestHash: receipt.requestHash,
    receiptHash: receipt.receiptHash,
    anchoredHash: receipt.anchoredHash,
  });
}

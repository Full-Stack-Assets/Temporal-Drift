import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  immutableReport,
  meshFail,
  normalizeBoolean,
  normalizeHash,
  normalizeNonNegativeInteger,
  normalizeProfileId,
  normalizeText,
} from './common.js';

const REQUEST_INPUT_KEYS = [
  'artifactType',
  'artifactHash',
  'cryptoProfileId',
  'externalNetworkId',
  'requestedAtLogical',
  'metadataHash',
];
const REQUEST_OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  ...REQUEST_INPUT_KEYS,
  'anchorCommitmentHash',
  'externalPublicationPerformed',
  'externalVerificationRequired',
  'externalNetworkAuthority',
  'requestId',
];
const RECEIPT_INPUT_KEYS = [
  'providerId',
  'externalRecordId',
  'providerEvidenceHash',
  'anchoredAtLogical',
  'confirmationCount',
  'externalPublicationPerformed',
];
const RECEIPT_OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  'requestId',
  'anchorCommitmentHash',
  'artifactHash',
  'cryptoProfileId',
  'externalNetworkId',
  ...RECEIPT_INPUT_KEYS,
  'externalVerificationRequired',
  'externalVerificationStatus',
  'externalNetworkAuthority',
  'receiptId',
];

function normalizeRequestInput(input) {
  const code = 'E_ANCHOR_SCHEMA';
  assertExactPlainObject(input, REQUEST_INPUT_KEYS, code, 'anchorRequestInput');
  return cloneAndFreeze({
    artifactType: normalizeText(input.artifactType, code, 'anchorRequestInput.artifactType'),
    artifactHash: normalizeHash(input.artifactHash, code, 'anchorRequestInput.artifactHash'),
    cryptoProfileId: normalizeProfileId(input.cryptoProfileId, code, 'anchorRequestInput.cryptoProfileId'),
    externalNetworkId: normalizeText(input.externalNetworkId, code, 'anchorRequestInput.externalNetworkId'),
    requestedAtLogical: normalizeNonNegativeInteger(input.requestedAtLogical, code, 'anchorRequestInput.requestedAtLogical'),
    metadataHash: normalizeHash(input.metadataHash, code, 'anchorRequestInput.metadataHash'),
  });
}

function requestCore(input) {
  const anchorCommitmentHash = sha256Hex({ domain: 'external-anchor-commitment-v1', ...input });
  return cloneAndFreeze({
    format: 'external-anchor-request',
    schemaVersion: '1.0.0',
    ...input,
    anchorCommitmentHash,
    externalPublicationPerformed: false,
    externalVerificationRequired: true,
    externalNetworkAuthority: 'none',
  });
}

export function createAnchorRequest(input) {
  const core = requestCore(normalizeRequestInput(input));
  return cloneAndFreeze({ ...core, requestId: `anchor-request-${sha256Hex(core)}` });
}

export function verifyAnchorRequest(request) {
  try {
    assertExactPlainObject(request, REQUEST_OUTPUT_KEYS, 'E_ANCHOR_SCHEMA', 'anchorRequest');
    if (request.format !== 'external-anchor-request' || request.schemaVersion !== '1.0.0' || request.externalPublicationPerformed !== false || request.externalVerificationRequired !== true || request.externalNetworkAuthority !== 'none') throw new Error('format');
    const rebuilt = createAnchorRequest(Object.fromEntries(REQUEST_INPUT_KEYS.map((key) => [key, request[key]])));
    if (canonicalString(rebuilt) !== canonicalString(request)) throw new Error('requestId');
    return immutableReport({ ok: true, firstMismatch: null, requestId: rebuilt.requestId });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'anchorRequest', requestId: null });
  }
}

function normalizeReceiptInput(input, request) {
  const code = 'E_ANCHOR_SCHEMA';
  assertExactPlainObject(input, RECEIPT_INPUT_KEYS, code, 'anchorReceiptInput');
  const normalized = {
    providerId: normalizeText(input.providerId, code, 'anchorReceiptInput.providerId'),
    externalRecordId: normalizeText(input.externalRecordId, code, 'anchorReceiptInput.externalRecordId'),
    providerEvidenceHash: normalizeHash(input.providerEvidenceHash, code, 'anchorReceiptInput.providerEvidenceHash'),
    anchoredAtLogical: normalizeNonNegativeInteger(input.anchoredAtLogical, code, 'anchorReceiptInput.anchoredAtLogical'),
    confirmationCount: normalizeNonNegativeInteger(input.confirmationCount, code, 'anchorReceiptInput.confirmationCount'),
    externalPublicationPerformed: normalizeBoolean(input.externalPublicationPerformed, code, 'anchorReceiptInput.externalPublicationPerformed'),
  };
  if (normalized.anchoredAtLogical < request.requestedAtLogical) meshFail(code, 'anchoredAtLogical cannot precede the request', 'anchorReceiptInput.anchoredAtLogical');
  return cloneAndFreeze(normalized);
}

function receiptCore(request, input) {
  return cloneAndFreeze({
    format: 'external-anchor-receipt',
    schemaVersion: '1.0.0',
    requestId: request.requestId,
    anchorCommitmentHash: request.anchorCommitmentHash,
    artifactHash: request.artifactHash,
    cryptoProfileId: request.cryptoProfileId,
    externalNetworkId: request.externalNetworkId,
    ...input,
    externalVerificationRequired: true,
    externalVerificationStatus: 'not-verified-by-local-envelope',
    externalNetworkAuthority: 'none',
  });
}

export function createAnchorReceipt(request, input) {
  if (!verifyAnchorRequest(request).ok) meshFail('E_ANCHOR_SCHEMA', 'anchor request must verify', 'anchorRequest');
  const core = receiptCore(request, normalizeReceiptInput(input, request));
  return cloneAndFreeze({ ...core, receiptId: `anchor-receipt-${sha256Hex(core)}` });
}

export function verifyAnchorReceipt(receipt, request) {
  try {
    assertExactPlainObject(receipt, RECEIPT_OUTPUT_KEYS, 'E_ANCHOR_SCHEMA', 'anchorReceipt');
    if (!verifyAnchorRequest(request).ok) throw new Error('request');
    if (receipt.format !== 'external-anchor-receipt' || receipt.schemaVersion !== '1.0.0' || receipt.externalVerificationRequired !== true || receipt.externalVerificationStatus !== 'not-verified-by-local-envelope' || receipt.externalNetworkAuthority !== 'none') throw new Error('format');
    if (receipt.requestId !== request.requestId || receipt.anchorCommitmentHash !== request.anchorCommitmentHash || receipt.artifactHash !== request.artifactHash || receipt.cryptoProfileId !== request.cryptoProfileId || receipt.externalNetworkId !== request.externalNetworkId) throw new Error('binding');
    const rebuilt = createAnchorReceipt(request, Object.fromEntries(RECEIPT_INPUT_KEYS.map((key) => [key, receipt[key]])));
    if (canonicalString(rebuilt) !== canonicalString(receipt)) throw new Error('receiptId');
    return immutableReport({ ok: true, firstMismatch: null, receiptId: rebuilt.receiptId });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'anchorReceipt', receiptId: null });
  }
}

import { sha256Hex } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze, deepFreeze } from './immutable.js';
import { KERNEL_VERSION, SCHEMA_VERSION, manifestCore } from './manifest.js';

const HASH_PATTERN = /^[a-f0-9]{64}$/;

function withReceiptHash(payload) {
  return cloneAndFreeze({ ...payload, receiptHash: sha256Hex(payload) });
}

export function receiptPayload(receipt) {
  const { receiptHash: _receiptHash, ...payload } = receipt;
  return cloneAndFreeze(payload);
}

export function createGenesisReceipt(manifest) {
  const stateHash = sha256Hex(manifest.initialState);
  return withReceiptHash({
    schemaVersion: SCHEMA_VERSION,
    kernelVersion: manifest.kernelVersion,
    kind: 'genesis',
    runId: manifest.runId,
    branchId: manifest.branchId,
    stepId: 'genesis',
    sequence: 0,
    previousReceiptHash: null,
    inputHash: sha256Hex({ type: 'genesis' }),
    previousStateHash: stateHash,
    resultingStateHash: stateHash,
    resultingPrngStateHash: sha256Hex(manifest.initialPrngState),
    eventBatchHash: sha256Hex([]),
    manifestCoreHash: sha256Hex(manifestCore(manifest)),
  });
}

export function createTransitionReceipt({
  kernelVersion = KERNEL_VERSION,
  runId,
  branchId,
  stepId,
  sequence,
  previousReceiptHash,
  input,
  previousState,
  resultingState,
  resultingPrngState,
  eventBatch,
}) {
  if (!HASH_PATTERN.test(previousReceiptHash)) throw new TrustKernelError('E_RECEIPT_HASH', 'Transition requires a valid previous receipt hash');
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new TrustKernelError('E_RECEIPT_HASH', 'Transition sequence must be positive');
  return withReceiptHash({
    schemaVersion: SCHEMA_VERSION,
    kernelVersion,
    kind: 'transition',
    runId,
    branchId,
    stepId,
    sequence,
    previousReceiptHash,
    inputHash: sha256Hex(input),
    previousStateHash: sha256Hex(previousState),
    resultingStateHash: sha256Hex(resultingState),
    resultingPrngStateHash: sha256Hex(resultingPrngState),
    eventBatchHash: sha256Hex(eventBatch),
    manifestCoreHash: null,
  });
}

export function verifyReceiptHash(receipt) {
  try {
    if (!receipt || typeof receipt !== 'object' || !HASH_PATTERN.test(receipt.receiptHash)) return false;
    return sha256Hex(receiptPayload(receipt)) === receipt.receiptHash;
  } catch {
    return false;
  }
}

export function appendReceipt(ledger, receipt) {
  if (!Array.isArray(ledger) || !verifyReceiptHash(receipt)) throw new TrustKernelError('E_RECEIPT_HASH', 'Cannot append an invalid receipt');
  if (ledger.length === 0) {
    if (receipt.kind !== 'genesis' || receipt.sequence !== 0 || receipt.previousReceiptHash !== null) {
      throw new TrustKernelError('E_RECEIPT_HASH', 'A ledger must begin with genesis');
    }
  } else {
    const previous = ledger.at(-1);
    if (!verifyReceiptHash(previous) || receipt.kind !== 'transition' || receipt.sequence !== previous.sequence + 1 || receipt.previousReceiptHash !== previous.receiptHash) {
      throw new TrustKernelError('E_RECEIPT_HASH', 'Receipt chain linkage is invalid');
    }
  }
  return deepFreeze([...ledger, receipt]);
}

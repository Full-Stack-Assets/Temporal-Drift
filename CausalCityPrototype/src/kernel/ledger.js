import { hashCanonical } from './canonicalize.js';
import { deepCloneFreeze } from './immutable.js';
import { KERNEL_VERSION, SCHEMA_VERSION } from './manifest.js';

export const ZERO_HASH = '0'.repeat(64);

export function createReceipt(fields) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    kernelVersion: KERNEL_VERSION,
    runId: fields.runId,
    branchId: fields.branchId,
    stepId: fields.stepId,
    sequence: fields.sequence,
    previousReceiptHash: fields.previousReceiptHash,
    inputHash: fields.inputHash,
    previousStateHash: fields.previousStateHash,
    resultingStateHash: fields.resultingStateHash,
    resultingPrngHash: fields.resultingPrngHash,
    eventBatchHash: fields.eventBatchHash,
  };
  return deepCloneFreeze({ ...payload, receiptHash: hashCanonical(payload) });
}

export function receiptPayload(receipt) {
  const { receiptHash, ...payload } = receipt;
  return payload;
}

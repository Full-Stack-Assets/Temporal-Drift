import { sha256Hex } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze, deepFreeze } from './immutable.js';
import { createPrng } from './prng.js';

const HASH_PATTERN = /^[a-f0-9]{64}$/;

function requireIdentifier(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TrustKernelError('E_UNSAFE_VALUE', `${label} must be a non-empty string`);
  }
  return value.normalize('NFC');
}

export function hashState(modelState) {
  return sha256Hex(modelState);
}

export function createSnapstate({
  runId,
  branchId,
  stepId,
  sequence,
  modelState,
  prngState,
  previousReceiptHash,
}) {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new TrustKernelError('E_UNSAFE_VALUE', 'Snapstate sequence must be a non-negative safe integer');
  }
  if (previousReceiptHash !== null && !HASH_PATTERN.test(previousReceiptHash)) {
    throw new TrustKernelError('E_STATE_HASH', 'Previous receipt hash must be null or lowercase SHA-256');
  }
  const ownedState = cloneAndFreeze(modelState);
  const ownedPrngState = createPrng(prngState).snapshot();
  return deepFreeze({
    runId: requireIdentifier(runId, 'runId'),
    branchId: requireIdentifier(branchId, 'branchId'),
    stepId: requireIdentifier(stepId, 'stepId'),
    sequence,
    modelState: ownedState,
    prngState: ownedPrngState,
    stateHash: hashState(ownedState),
    previousReceiptHash,
  });
}

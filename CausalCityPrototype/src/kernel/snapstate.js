import { deepCloneFreeze } from './immutable.js';
import { hashCanonical } from './canonicalize.js';

export function createSnapstate({ runId, branchId, stepId, sequence, modelState, prngState, previousReceiptHash }) {
  const frozenState = deepCloneFreeze(modelState);
  const frozenPrng = deepCloneFreeze([...prngState]);
  return deepCloneFreeze({
    runId,
    branchId,
    stepId,
    sequence,
    modelState: frozenState,
    prngState: frozenPrng,
    stateHash: hashCanonical(frozenState),
    previousReceiptHash,
  });
}

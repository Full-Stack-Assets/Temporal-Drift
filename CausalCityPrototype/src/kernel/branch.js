import { createManifest } from './manifest.js';
import { hashCanonical } from './canonicalize.js';
import { receiptPayload } from './ledger.js';
import { TrustKernelError } from './errors.js';

export function assertStoredStepVerified(run, index) {
  const receipt = run.ledger[index];
  const snapstate = run.snapstates[index];
  const events = run.eventBatches[index];
  if (!receipt || !snapstate || !events) throw new TrustKernelError('E_UNVERIFIED_FORK', 'Fork point is incomplete');
  if (hashCanonical(receiptPayload(receipt)) !== receipt.receiptHash) throw new TrustKernelError('E_UNVERIFIED_FORK', 'Fork receipt hash is invalid');
  if (hashCanonical(snapstate.modelState) !== snapstate.stateHash) throw new TrustKernelError('E_UNVERIFIED_FORK', 'Fork state hash is invalid');
  if (receipt.resultingStateHash !== snapstate.stateHash) throw new TrustKernelError('E_UNVERIFIED_FORK', 'Receipt/state mismatch at fork');
  if (receipt.eventBatchHash !== hashCanonical(events)) throw new TrustKernelError('E_UNVERIFIED_FORK', 'Event batch mismatch at fork');
  return true;
}

export function createForkManifest(parentRun, forkStepId, childBranchId) {
  if (typeof childBranchId !== 'string' || childBranchId.length === 0 || childBranchId === parentRun.branchId) {
    throw new TrustKernelError('E_BRANCH_EXISTS', 'Child branch ID must be non-empty and different from parent');
  }
  const index = parentRun.ledger.findIndex((receipt) => receipt.stepId === forkStepId);
  if (index < 0) throw new TrustKernelError('E_UNVERIFIED_FORK', `Fork step not found: ${forkStepId}`);
  assertStoredStepVerified(parentRun, index);
  const receipt = parentRun.ledger[index];
  const snapstate = parentRun.snapstates[index];
  return createManifest({
    model: parentRun.manifest.model,
    branchId: childBranchId,
    ancestry: [...parentRun.manifest.ancestry, {
      parentRunId: parentRun.runId,
      parentBranchId: parentRun.branchId,
      parentReceiptHash: receipt.receiptHash,
      forkStepId,
    }],
    initialState: snapstate.modelState,
    initialPrngState: snapstate.prngState,
    inputs: [],
    normalization: parentRun.manifest.normalization,
  });
}

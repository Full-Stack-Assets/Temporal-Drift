import { sha256Hex } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { createGenesisReceipt, verifyReceiptHash } from './ledger.js';
import { createManifest } from './manifest.js';
import { createRun } from './replay.js';

function parentPrefixIsVerified(parentRun) {
  if (
    parentRun.ledger.length !== parentRun.snapstates.length
    || parentRun.ledger.length !== parentRun.eventBatches.length
    || parentRun.ledger.length < 1
  ) return false;
  if (createGenesisReceipt(parentRun.manifest).receiptHash !== parentRun.ledger[0].receiptHash) return false;
  for (let index = 0; index < parentRun.ledger.length; index += 1) {
    const receipt = parentRun.ledger[index];
    const snapstate = parentRun.snapstates[index];
    if (!verifyReceiptHash(receipt) || receipt.sequence !== index || snapstate.sequence !== index) return false;
    if (receipt.resultingStateHash !== sha256Hex(snapstate.modelState)) return false;
    if (receipt.resultingPrngStateHash !== sha256Hex(snapstate.prngState)) return false;
    if (receipt.eventBatchHash !== sha256Hex(parentRun.eventBatches[index])) return false;
    if (index > 0) {
      const previous = parentRun.ledger[index - 1];
      if (receipt.previousReceiptHash !== previous.receiptHash) return false;
      if (receipt.previousStateHash !== parentRun.snapstates[index - 1].stateHash) return false;
      if (receipt.inputHash !== sha256Hex(parentRun.manifest.inputs[index - 1])) return false;
    }
  }
  return true;
}

export function forkRun(parentRun, forkStepId, childBranchId) {
  if (typeof childBranchId !== 'string' || childBranchId.length === 0) {
    throw new TrustKernelError('E_BRANCH_EXISTS', 'Child branch ID must be a non-empty string');
  }
  const knownBranches = new Set([
    parentRun.manifest.branchId,
    parentRun.manifest.ancestry?.parentBranchId,
  ].filter(Boolean));
  if (knownBranches.has(childBranchId)) throw new TrustKernelError('E_BRANCH_EXISTS', `Branch already exists: ${childBranchId}`);

  if (!parentPrefixIsVerified(parentRun)) throw new TrustKernelError('E_UNVERIFIED_FORK', 'Parent run did not pass receipt verification');
  const snapstate = parentRun.snapstates.find((entry) => entry.stepId === forkStepId);
  const receipt = parentRun.ledger.find((entry) => entry.stepId === forkStepId);
  if (!snapstate || !receipt || snapstate.sequence !== receipt.sequence) {
    throw new TrustKernelError('E_UNVERIFIED_FORK', `Verified fork step not found: ${forkStepId}`);
  }
  const manifest = createManifest({
    ...parentRun.manifest,
    branchId: childBranchId,
    initialState: snapstate.modelState,
    initialPrngState: snapstate.prngState,
    inputs: parentRun.manifest.inputs.slice(snapstate.sequence),
    ancestry: {
      parentRunId: parentRun.manifest.runId,
      parentBranchId: parentRun.manifest.branchId,
      forkStepId,
      forkReceiptHash: receipt.receiptHash,
    },
    expectedTerminalReceiptHash: null,
    evidenceRuntime: `node-${process.version}`,
  });
  return createRun(manifest, parentRun.adapter);
}

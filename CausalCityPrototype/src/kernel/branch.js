import { sha256Hex } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze } from './immutable.js';
import { createGenesisReceipt, verifyReceiptHash } from './ledger.js';
import { createManifest } from './manifest.js';
import { createRun } from './replay.js';

function parentPrefixIsVerified(parentRun) {
  if (
    !parentRun
    || !parentRun.manifest
    || !Array.isArray(parentRun.ledger)
    || !Array.isArray(parentRun.snapstates)
    || !Array.isArray(parentRun.eventBatches)
    || parentRun.ledger.length !== parentRun.snapstates.length
    || parentRun.ledger.length !== parentRun.eventBatches.length
    || parentRun.ledger.length < 1
  ) return false;

  const { manifest } = parentRun;
  if (createGenesisReceipt(manifest).receiptHash !== parentRun.ledger[0].receiptHash) return false;

  for (let index = 0; index < parentRun.ledger.length; index += 1) {
    const receipt = parentRun.ledger[index];
    const snapstate = parentRun.snapstates[index];
    const events = parentRun.eventBatches[index];
    if (!receipt || !snapstate || !Array.isArray(events)) return false;
    if (!verifyReceiptHash(receipt) || receipt.sequence !== index || snapstate.sequence !== index) return false;
    if (receipt.kernelVersion !== manifest.kernelVersion || receipt.schemaVersion !== manifest.schemaVersion) return false;
    if (receipt.runId !== manifest.runId || receipt.branchId !== manifest.branchId) return false;
    if (snapstate.runId !== manifest.runId || snapstate.branchId !== manifest.branchId) return false;
    if (receipt.stepId !== snapstate.stepId) return false;
    if (snapstate.stateHash !== sha256Hex(snapstate.modelState)) return false;
    if (receipt.resultingStateHash !== snapstate.stateHash) return false;
    if (receipt.resultingPrngStateHash !== sha256Hex(snapstate.prngState)) return false;
    if (receipt.eventBatchHash !== sha256Hex(events)) return false;
    if (snapstate.previousReceiptHash !== receipt.previousReceiptHash) return false;

    if (index === 0) {
      if (receipt.kind !== 'genesis' || snapstate.stepId !== 'genesis' || receipt.previousReceiptHash !== null) return false;
      continue;
    }

    const previous = parentRun.ledger[index - 1];
    const previousSnapstate = parentRun.snapstates[index - 1];
    const input = manifest.inputs[index - 1];
    if (!input || receipt.kind !== 'transition') return false;
    if (receipt.stepId !== input.stepId) return false;
    if (receipt.previousReceiptHash !== previous.receiptHash) return false;
    if (snapstate.previousReceiptHash !== previous.receiptHash) return false;
    if (receipt.previousStateHash !== previousSnapstate.stateHash) return false;
    if (receipt.inputHash !== sha256Hex(input)) return false;
  }
  return true;
}

export function forkRun(parentRun, forkStepId, childBranchId) {
  if (typeof childBranchId !== 'string' || childBranchId.length === 0) {
    throw new TrustKernelError('E_BRANCH_EXISTS', 'Child branch ID must be a non-empty string');
  }
  if (!parentPrefixIsVerified(parentRun)) {
    throw new TrustKernelError('E_UNVERIFIED_FORK', 'Parent run did not pass receipt verification');
  }

  const normalizedChildBranchId = cloneAndFreeze(childBranchId);
  const knownBranches = new Set([
    parentRun.manifest.branchId,
    parentRun.manifest.ancestry?.parentBranchId,
  ].filter(Boolean));
  if (knownBranches.has(normalizedChildBranchId)) {
    throw new TrustKernelError('E_BRANCH_EXISTS', `Branch already exists: ${normalizedChildBranchId}`);
  }

  const snapstate = parentRun.snapstates.find((entry) => entry.stepId === forkStepId);
  const receipt = parentRun.ledger.find((entry) => entry.stepId === forkStepId);
  if (!snapstate || !receipt || snapstate.sequence !== receipt.sequence) {
    throw new TrustKernelError('E_UNVERIFIED_FORK', `Verified fork step not found: ${forkStepId}`);
  }
  const manifest = createManifest({
    ...parentRun.manifest,
    branchId: normalizedChildBranchId,
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

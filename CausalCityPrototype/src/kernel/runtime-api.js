import { createManifest, createRun, advanceRun, adapterFor } from './index.js';
import { createForkManifest } from './branch.js';
import { exportRunData } from './replay.js';
import { compareReplay, verificationReport } from './verify.js';
import { TrustKernelError } from './errors.js';

const branchRegistries = new Map();

function registryFor(run) {
  const root = run.manifest.ancestry.length ? run.manifest.ancestry[0].parentRunId : run.runId;
  let registry = branchRegistries.get(root);
  if (!registry) {
    registry = new Set([run.branchId]);
    branchRegistries.set(root, registry);
  }
  return registry;
}

export function forkRun(parentRun, forkStepId, childBranchId) {
  const adapter = adapterFor(parentRun);
  if (!adapter) throw new TrustKernelError('E_MODEL_NOT_FOUND', 'Parent run has no registered model adapter');
  const registry = registryFor(parentRun);
  if (registry.has(childBranchId)) throw new TrustKernelError('E_BRANCH_EXISTS', `Branch already exists: ${childBranchId}`);
  const manifest = createForkManifest(parentRun, forkStepId, childBranchId);
  const child = createRun(manifest, adapter);
  registry.add(childBranchId);
  return child;
}

export function exportRun(run) {
  return exportRunData(run);
}

export function replayRun(exportedRun, adapter) {
  const manifest = createManifest({
    model: exportedRun.manifest.model,
    branchId: exportedRun.manifest.branchId,
    ancestry: exportedRun.manifest.ancestry,
    initialState: exportedRun.manifest.initialState,
    initialPrngState: exportedRun.manifest.initialPrngState,
    inputs: exportedRun.manifest.inputs,
    normalization: exportedRun.manifest.normalization,
    expectedTerminalReceiptHash: exportedRun.manifest.expectedTerminalReceiptHash,
  });
  if (manifest.manifestCoreHash !== exportedRun.manifest.manifestCoreHash) throw new TrustKernelError('E_REPLAY_MISMATCH', 'Exported manifest core hash mismatch');
  let run = createRun(manifest, adapter);
  for (const input of manifest.inputs) run = advanceRun(run, input);
  return run;
}

export function verifyRun(exportedRun, adapter) {
  try {
    const replayed = replayRun(exportedRun, adapter);
    const comparison = compareReplay(exportedRun, replayed);
    if (!comparison.ok) return verificationReport({
      ok: false,
      verifiedStepCount: comparison.sequence,
      mismatch: comparison,
      code: 'E_REPLAY_MISMATCH',
      model: replayed.manifest.model,
      kernelVersion: replayed.manifest.kernelVersion,
    });
    const terminal = replayed.ledger[replayed.ledger.length - 1].receiptHash;
    if (exportedRun.manifest.expectedTerminalReceiptHash !== terminal) return verificationReport({
      ok: false,
      verifiedStepCount: replayed.ledger.length - 1,
      mismatch: { sequence: replayed.ledger.length - 1, field: 'expectedTerminalReceiptHash', expected: exportedRun.manifest.expectedTerminalReceiptHash, actual: terminal },
      code: 'E_RECEIPT_HASH',
      model: replayed.manifest.model,
      kernelVersion: replayed.manifest.kernelVersion,
    });
    return verificationReport({ ok: true, verifiedStepCount: replayed.ledger.length, model: replayed.manifest.model, kernelVersion: replayed.manifest.kernelVersion });
  } catch (error) {
    return verificationReport({
      ok: false,
      verifiedStepCount: 0,
      mismatch: { sequence: 0, field: 'exception', expected: 'valid export', actual: error.code ?? error.name },
      code: error.code ?? 'E_REPLAY_MISMATCH',
      model: exportedRun?.manifest?.model ?? { id: 'unknown', version: 'unknown' },
      kernelVersion: exportedRun?.manifest?.kernelVersion ?? 'unknown',
    });
  }
}

import { canonicalString, sha256BytesHex, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { createManifest } from '../kernel/manifest.js';
import { parseExportedRun, replayRun } from '../kernel/replay.js';
import { verifyRun } from '../kernel/verify.js';

function fail(code, message, path = 'rewind') {
  throw new TrustKernelError(code, message, { path });
}

function artifactCore(artifact) {
  const { artifactHash: _hash, ...core } = artifact;
  return cloneAndFreeze(core);
}

export function createRewindArtifact(run, targetSequence) {
  if (!run || !run.manifest || !run.adapter || !Array.isArray(run.ledger) || !Array.isArray(run.snapstates) || !Array.isArray(run.eventBatches)) {
    fail('E_REWIND_SCHEMA', 'Source must be an executable run', 'run');
  }
  const fullReport = verifyRun(run, run.adapter);
  if (!fullReport.ok) fail('E_REWIND_SOURCE', `Source run failed verification at ${fullReport.firstMismatch}`, fullReport.firstMismatch ?? 'run');
  if (!Number.isSafeInteger(targetSequence) || targetSequence < 0 || targetSequence >= run.ledger.length) {
    fail('E_REWIND_SCHEMA', 'targetSequence is outside the verified run', 'targetSequence');
  }
  const targetReceipt = run.ledger[targetSequence];
  const targetSnapstate = run.snapstates[targetSequence];
  const prefixManifest = createManifest({
    ...run.manifest,
    inputs: run.manifest.inputs.slice(0, targetSequence),
    expectedTerminalReceiptHash: targetReceipt.receiptHash,
    evidenceRuntime: 'logical-rewind-v1',
  });
  const prefixValue = {
    eventBatches: run.eventBatches.slice(0, targetSequence + 1),
    manifest: prefixManifest,
    receipts: run.ledger.slice(0, targetSequence + 1),
    snapstates: run.snapstates.slice(0, targetSequence + 1),
  };
  const prefixExport = canonicalString(prefixValue);
  const prefixReport = verifyRun(prefixExport, run.adapter);
  if (!prefixReport.ok) fail('E_REWIND_SOURCE', `Prefix run failed verification at ${prefixReport.firstMismatch}`, prefixReport.firstMismatch ?? 'prefix');

  const core = cloneAndFreeze({
    format: 'logical-rewind-artifact',
    schemaVersion: '1.0.0',
    runId: run.manifest.runId,
    branchId: run.manifest.branchId,
    sourceTerminalReceiptHash: run.ledger.at(-1).receiptHash,
    targetSequence,
    targetStepId: targetSnapstate.stepId,
    targetReceiptHash: targetReceipt.receiptHash,
    targetStateHash: targetSnapstate.stateHash,
    targetPrngStateHash: sha256Hex(targetSnapstate.prngState),
    prefixExport,
    prefixExportHash: sha256BytesHex(Buffer.from(prefixExport, 'utf8')),
  });
  return cloneAndFreeze({ ...core, artifactHash: sha256Hex(core) });
}

export function restoreRewindArtifact(artifact, adapter) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) fail('E_REWIND_SCHEMA', 'Rewind artifact must be an object', 'artifact');
  if (typeof artifact.artifactHash !== 'string' || artifact.artifactHash !== sha256Hex(artifactCore(artifact))) fail('E_REWIND_HASH', 'Rewind artifact hash mismatch', 'artifact.artifactHash');
  if (typeof artifact.prefixExport !== 'string' || sha256BytesHex(Buffer.from(artifact.prefixExport, 'utf8')) !== artifact.prefixExportHash) fail('E_REWIND_HASH', 'Prefix export hash mismatch', 'artifact.prefixExportHash');
  const parsed = parseExportedRun(artifact.prefixExport);
  if (parsed.manifest.runId !== artifact.runId || parsed.manifest.branchId !== artifact.branchId) fail('E_REWIND_HASH', 'Prefix identity differs from rewind artifact', 'artifact.prefixExport');
  const report = verifyRun(artifact.prefixExport, adapter);
  if (!report.ok) fail('E_REWIND_HASH', `Prefix verification failed at ${report.firstMismatch}`, report.firstMismatch ?? 'artifact.prefixExport');
  const run = replayRun(artifact.prefixExport, adapter);
  const snapstate = run.snapstates.at(-1);
  const receipt = run.ledger.at(-1);
  if (snapstate.sequence !== artifact.targetSequence || snapstate.stepId !== artifact.targetStepId || receipt.receiptHash !== artifact.targetReceiptHash || snapstate.stateHash !== artifact.targetStateHash || sha256Hex(snapstate.prngState) !== artifact.targetPrngStateHash) {
    fail('E_REWIND_HASH', 'Restored target does not match rewind commitments', 'artifact.targetReceiptHash');
  }
  return run;
}

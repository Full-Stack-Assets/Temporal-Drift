import { canonicalString, sha256BytesHex, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { advanceRun, createRun, exportRun, parseExportedRun } from '../kernel/replay.js';
import { verifyRun } from '../kernel/verify.js';

function fail(code, message, path = 'rewind') {
  throw new TrustKernelError(code, message, { path });
}

function artifactCore(artifact) {
  const { artifactHash: _hash, ...core } = artifact;
  return cloneAndFreeze(core);
}

function replayPrefix(parsed, adapter, targetSequence, errorCode) {
  if (!Number.isSafeInteger(targetSequence) || targetSequence < 0 || targetSequence >= parsed.receipts.length) {
    fail(errorCode, 'targetSequence is outside the prefix evidence', 'targetSequence');
  }
  if (parsed.receipts.length !== targetSequence + 1 || parsed.snapstates.length !== targetSequence + 1 || parsed.eventBatches.length !== targetSequence + 1) {
    fail(errorCode, 'Prefix evidence length does not match targetSequence', 'prefixExport');
  }
  let replayed = createRun(parsed.manifest, adapter);
  for (let index = 0; index < targetSequence; index += 1) replayed = advanceRun(replayed, replayed.manifest.inputs[index]);
  if (canonicalString(replayed.ledger) !== canonicalString(parsed.receipts)) fail(errorCode, 'Prefix receipts do not replay exactly', 'prefixExport.receipts');
  if (canonicalString(replayed.snapstates) !== canonicalString(parsed.snapstates)) fail(errorCode, 'Prefix Snapstates do not replay exactly', 'prefixExport.snapstates');
  if (canonicalString(replayed.eventBatches) !== canonicalString(parsed.eventBatches)) fail(errorCode, 'Prefix event batches do not replay exactly', 'prefixExport.eventBatches');
  return replayed;
}

export function createRewindArtifact(run, targetSequence) {
  if (!run || !run.manifest || !run.adapter || !Array.isArray(run.ledger) || !Array.isArray(run.snapstates) || !Array.isArray(run.eventBatches)) {
    fail('E_REWIND_SCHEMA', 'Source must be an executable run', 'run');
  }
  const sourceExport = exportRun(run);
  const fullReport = verifyRun(sourceExport, run.adapter);
  if (!fullReport.ok) fail('E_REWIND_SOURCE', `Source run failed verification at ${fullReport.firstMismatch}`, fullReport.firstMismatch ?? 'run');
  if (!Number.isSafeInteger(targetSequence) || targetSequence < 0 || targetSequence >= run.ledger.length) {
    fail('E_REWIND_SCHEMA', 'targetSequence is outside the verified run', 'targetSequence');
  }

  const sourceParsed = parseExportedRun(sourceExport);
  const targetReceipt = run.ledger[targetSequence];
  const targetSnapstate = run.snapstates[targetSequence];
  const prefixValue = {
    eventBatches: run.eventBatches.slice(0, targetSequence + 1),
    manifest: sourceParsed.manifest,
    receipts: run.ledger.slice(0, targetSequence + 1),
    snapstates: run.snapstates.slice(0, targetSequence + 1),
  };
  const prefixExport = canonicalString(prefixValue);
  replayPrefix(parseExportedRun(prefixExport), run.adapter, targetSequence, 'E_REWIND_SOURCE');

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
  if (parsed.manifest.expectedTerminalReceiptHash !== artifact.sourceTerminalReceiptHash) fail('E_REWIND_HASH', 'Source terminal commitment differs from rewind artifact', 'artifact.sourceTerminalReceiptHash');
  const run = replayPrefix(parsed, adapter, artifact.targetSequence, 'E_REWIND_HASH');
  const snapstate = run.snapstates.at(-1);
  const receipt = run.ledger.at(-1);
  if (snapstate.sequence !== artifact.targetSequence || snapstate.stepId !== artifact.targetStepId || receipt.receiptHash !== artifact.targetReceiptHash || snapstate.stateHash !== artifact.targetStateHash || sha256Hex(snapstate.prngState) !== artifact.targetPrngStateHash) {
    fail('E_REWIND_HASH', 'Restored target does not match rewind commitments', 'artifact.targetReceiptHash');
  }
  return run;
}

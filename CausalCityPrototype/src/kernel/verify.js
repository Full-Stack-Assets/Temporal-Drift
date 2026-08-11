import { canonicalString } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze } from './immutable.js';
import { parseExportedRun, replayRun } from './replay.js';

function report(fields) {
  return cloneAndFreeze({
    ok: false,
    verifiedStepCount: 0,
    firstMismatch: null,
    errorCode: 'E_REPLAY_MISMATCH',
    expectedHash: null,
    actualHash: null,
    model: null,
    kernelVersion: '1.0.0',
    ...fields,
  });
}

function mismatch(path, code, verifiedStepCount, expected, actual, metadata) {
  return report({
    ...metadata,
    verifiedStepCount,
    firstMismatch: path,
    errorCode: code,
    expectedHash: typeof expected === 'string' ? expected : null,
    actualHash: typeof actual === 'string' ? actual : null,
  });
}

function sameCanonical(left, right) {
  try {
    return canonicalString(left) === canonicalString(right);
  } catch {
    return false;
  }
}

export function verifyRun(exportedRun, modelAdapter) {
  let exported;
  let replayed;
  try {
    exported = parseExportedRun(exportedRun);
    replayed = replayRun(exported, modelAdapter);
  } catch (error) {
    const code = error instanceof TrustKernelError ? error.code : 'E_REPLAY_MISMATCH';
    return report({ firstMismatch: 'export', errorCode: code });
  }
  const metadata = {
    model: `${replayed.manifest.model.id}@${replayed.manifest.model.version}`,
    kernelVersion: replayed.manifest.kernelVersion,
  };
  const expectedReceipts = replayed.ledger;
  const actualReceipts = exported.receipts;
  if (!Array.isArray(actualReceipts)) return mismatch('receipts', 'E_RECEIPT_HASH', 0, null, null, metadata);
  const receiptCount = Math.max(expectedReceipts.length, actualReceipts.length);
  for (let index = 0; index < receiptCount; index += 1) {
    const expected = expectedReceipts[index];
    const actual = actualReceipts[index];
    if (!expected || !actual) {
      return mismatch(`receipts[${index}].receiptHash`, 'E_RECEIPT_HASH', Math.max(0, index - 1), expected?.receiptHash, actual?.receiptHash, metadata);
    }
    if (expected.receiptHash !== actual.receiptHash || !sameCanonical(expected, actual)) {
      return mismatch(`receipts[${index}].receiptHash`, 'E_RECEIPT_HASH', Math.max(0, index - 1), expected.receiptHash, actual.receiptHash, metadata);
    }
  }
  for (const [name, expectedValues, actualValues, code] of [
    ['snapstates', replayed.snapstates, exported.snapstates, 'E_STATE_HASH'],
    ['eventBatches', replayed.eventBatches, exported.eventBatches, 'E_REPLAY_MISMATCH'],
  ]) {
    if (!Array.isArray(actualValues)) return mismatch(name, code, 0, null, null, metadata);
    const count = Math.max(expectedValues.length, actualValues.length);
    for (let index = 0; index < count; index += 1) {
      if (!sameCanonical(expectedValues[index] ?? null, actualValues[index] ?? null)) {
        return mismatch(`${name}[${index}]`, code, Math.max(0, index - 1), expectedReceipts[index]?.receiptHash, actualReceipts[index]?.receiptHash, metadata);
      }
    }
  }
  const terminal = expectedReceipts.at(-1).receiptHash;
  if (exported.manifest.expectedTerminalReceiptHash !== terminal) {
    return mismatch('manifest.expectedTerminalReceiptHash', 'E_RECEIPT_HASH', replayed.manifest.inputs.length, terminal, exported.manifest.expectedTerminalReceiptHash, metadata);
  }
  return report({
    ...metadata,
    ok: true,
    verifiedStepCount: replayed.manifest.inputs.length,
    firstMismatch: null,
    errorCode: null,
    expectedHash: terminal,
    actualHash: terminal,
  });
}

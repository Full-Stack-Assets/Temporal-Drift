import { deepCloneFreeze } from './immutable.js';

export function exportRunData(run) {
  const terminal = run.ledger[run.ledger.length - 1].receiptHash;
  return deepCloneFreeze({
    format: 'trust-export-v1',
    manifest: { ...run.manifest, expectedTerminalReceiptHash: terminal },
    ledger: run.ledger,
    snapstates: run.snapstates,
    eventBatches: run.eventBatches,
  });
}

import { advanceRun, createRun } from '../../../src/kernel/replay.js';
import { counterAdapter, counterManifest } from './counter-fixture.js';

let run = createRun(counterManifest({ evidenceRuntime: 'node-cross-process' }), counterAdapter);
for (const input of run.manifest.inputs) run = advanceRun(run, input);
process.stdout.write(JSON.stringify({
  fixtureVersion: 'counter-chain-v1',
  receiptHashes: run.ledger.map((receipt) => receipt.receiptHash),
  terminalReceiptHash: run.ledger.at(-1).receiptHash,
}));

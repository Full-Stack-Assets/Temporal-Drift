import { createManifest } from '../../../src/kernel/manifest.js';

export const counterAdapter = Object.freeze({
  id: 'counter',
  version: '1.0.0',
  transition({ state, input, prng }) {
    if (input.type !== 'increment') throw new Error('unexpected input');
    const noise = prng.nextInt(5);
    const count = state.count + input.payload.amount + noise;
    return { state: { count }, events: [{ type: 'incremented', amount: input.payload.amount, noise }] };
  },
});

export function counterManifest(overrides = {}) {
  return createManifest({
    format: 'ripple-trust-run', schemaVersion: '1.0.0', kernelVersion: '1.0.0',
    model: { id: 'counter', version: '1.0.0' }, runId: 'counter-run', branchId: 'baseline',
    initialState: { count: 0 }, initialPrngState: [1, 2, 3, 4],
    inputs: [
      { stepId: 's1', type: 'increment', payload: { amount: 1 } },
      { stepId: 's2', type: 'increment', payload: { amount: 2 } },
      { stepId: 's3', type: 'increment', payload: { amount: 3 } },
    ],
    ancestry: null,
    normalization: { id: 'counter-fixed', version: '1.0.0', scales: { count: 1 } },
    expectedTerminalReceiptHash: null, evidenceRuntime: `node-${process.version}`,
    ...overrides,
  });
}

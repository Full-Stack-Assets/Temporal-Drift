import { advanceRun, createRun } from '../../../src/kernel/replay.js';
import { TrustKernelError } from '../../../src/kernel/errors.js';
import { counterAdapter, counterManifest } from './counter-fixture.js';

export function completeCounterRun(overrides = {}) {
  let run = createRun(counterManifest(overrides), counterAdapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  return run;
}

export function resolveCounterAdapter(model) {
  if (model?.id === counterAdapter.id && model?.version === counterAdapter.version) return counterAdapter;
  throw new TrustKernelError('E_GRAPH_ADAPTER', `No adapter for ${model?.id ?? 'unknown'}@${model?.version ?? 'unknown'}`);
}

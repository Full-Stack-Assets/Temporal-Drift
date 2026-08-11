import { hashCanonical } from './canonicalize.js';
import { deepCloneFreeze } from './immutable.js';
import { createPrng } from './prng.js';
import { createManifest as makeManifest, validateManifest } from './manifest.js';
import { createSnapstate } from './snapstate.js';
import { createReceipt, ZERO_HASH } from './ledger.js';
import { TrustKernelError } from './errors.js';

const adapters = new WeakMap();

function assertRuntime() {
  if (typeof process === 'undefined' || !process.versions?.node) return;
  const major = Number(process.versions.node.split('.')[0]);
  if (major !== 22 && major !== 24) throw new TrustKernelError('E_UNSUPPORTED_RUNTIME', `Unsupported Node major: ${major}`);
}

function assertAdapter(manifest, adapter) {
  if (!adapter || typeof adapter.transition !== 'function') throw new TrustKernelError('E_MODEL_NOT_FOUND', 'Model adapter not found');
  if (adapter.id !== manifest.model.id) throw new TrustKernelError('E_MODEL_NOT_FOUND', 'Model adapter id mismatch');
  if (adapter.version !== manifest.model.version) throw new TrustKernelError('E_MODEL_VERSION', 'Model adapter version mismatch');
}

function buildRun({ manifest, snapstates, ledger, eventBatches, nextInputIndex }) {
  return deepCloneFreeze({
    format: 'trust-run-v1',
    runId: snapstates[0].runId,
    branchId: manifest.branchId,
    manifest,
    currentSnapstate: snapstates[snapstates.length - 1],
    snapstates,
    ledger,
    eventBatches,
    nextInputIndex,
  });
}

export function createManifest(config) { return makeManifest(config); }

export function createRun(manifest, adapter) {
  assertRuntime();
  validateManifest(manifest);
  assertAdapter(manifest, adapter);
  const runId = `run-${manifest.manifestCoreHash.slice(0, 24)}`;
  const initialPrng = createPrng(manifest.initialPrngState);
  const snapstate = createSnapstate({
    runId,
    branchId: manifest.branchId,
    stepId: 'genesis',
    sequence: 0,
    modelState: manifest.initialState,
    prngState: initialPrng.snapshot(),
    previousReceiptHash: ZERO_HASH,
  });
  const events = deepCloneFreeze([]);
  const receipt = createReceipt({
    runId,
    branchId: manifest.branchId,
    stepId: 'genesis',
    sequence: 0,
    previousReceiptHash: ZERO_HASH,
    inputHash: hashCanonical({ type: 'genesis', manifestCoreHash: manifest.manifestCoreHash }),
    previousStateHash: snapstate.stateHash,
    resultingStateHash: snapstate.stateHash,
    resultingPrngHash: hashCanonical(snapstate.prngState),
    eventBatchHash: hashCanonical(events),
  });
  const run = buildRun({ manifest, snapstates: [snapstate], ledger: [receipt], eventBatches: [events], nextInputIndex: 0 });
  adapters.set(run, adapter);
  return run;
}

export function advanceRun(run, input) {
  const adapter = adapters.get(run);
  if (!adapter) throw new TrustKernelError('E_MODEL_NOT_FOUND', 'Run has no registered model adapter');
  const expected = run.manifest.inputs[run.nextInputIndex];
  if (!expected || hashCanonical(expected) !== hashCanonical(input)) throw new TrustKernelError('E_REPLAY_MISMATCH', 'Input does not match manifest sequence');
  const previous = run.currentSnapstate;
  const prng = createPrng(previous.prngState);
  const immutableInput = deepCloneFreeze(input);
  const result = adapter.transition(previous.modelState, immutableInput, prng);
  if (!result || typeof result !== 'object' || !('state' in result)) throw new TrustKernelError('E_REPLAY_MISMATCH', 'Adapter returned invalid transition result');
  const events = deepCloneFreeze(result.events ?? []);
  hashCanonical(events);
  const previousReceipt = run.ledger[run.ledger.length - 1];
  const sequence = previousReceipt.sequence + 1;
  const snapstate = createSnapstate({
    runId: run.runId,
    branchId: run.branchId,
    stepId: input.stepId,
    sequence,
    modelState: result.state,
    prngState: prng.snapshot(),
    previousReceiptHash: previousReceipt.receiptHash,
  });
  const receipt = createReceipt({
    runId: run.runId,
    branchId: run.branchId,
    stepId: input.stepId,
    sequence,
    previousReceiptHash: previousReceipt.receiptHash,
    inputHash: hashCanonical(immutableInput),
    previousStateHash: previous.stateHash,
    resultingStateHash: snapstate.stateHash,
    resultingPrngHash: hashCanonical(snapstate.prngState),
    eventBatchHash: hashCanonical(events),
  });
  const next = buildRun({
    manifest: run.manifest,
    snapstates: [...run.snapstates, snapstate],
    ledger: [...run.ledger, receipt],
    eventBatches: [...run.eventBatches, events],
    nextInputIndex: run.nextInputIndex + 1,
  });
  adapters.set(next, adapter);
  return next;
}

export function adapterFor(run) { return adapters.get(run); }
export { TrustKernelError } from './errors.js';
export { createPrng, seedToState } from './prng.js';
export { canonicalBytes, canonicalString, hashCanonical } from './canonicalize.js';
export { forkRun, exportRun, replayRun, verifyRun } from './runtime-api.js';
export { recordAnomaly, appendAnomalyReview } from './anomalies.js';

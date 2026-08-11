import { canonicalString } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze, deepFreeze } from './immutable.js';
import { appendReceipt, createGenesisReceipt, createTransitionReceipt } from './ledger.js';
import { createInputEnvelope, createManifest } from './manifest.js';
import { createPrng } from './prng.js';
import { createSnapstate } from './snapstate.js';

function validateAdapter(manifest, adapter) {
  if (!adapter || adapter.id !== manifest.model.id || typeof adapter.transition !== 'function') {
    throw new TrustKernelError('E_MODEL_NOT_FOUND', `Model adapter ${manifest.model.id} is unavailable`);
  }
  if (adapter.version !== manifest.model.version) {
    throw new TrustKernelError('E_MODEL_VERSION', `Expected model ${manifest.model.version}, received ${adapter.version}`);
  }
}

function makeRun({ manifest, adapter, snapstates, ledger, eventBatches }) {
  return Object.freeze({
    manifest,
    adapter,
    snapstates: Object.freeze([...snapstates]),
    ledger: Object.freeze([...ledger]),
    eventBatches: Object.freeze([...eventBatches]),
  });
}

export function createRun(manifestInput, modelAdapter) {
  const manifest = createManifest(manifestInput);
  validateAdapter(manifest, modelAdapter);
  const genesis = createGenesisReceipt(manifest);
  const snapstate = createSnapstate({
    runId: manifest.runId,
    branchId: manifest.branchId,
    stepId: 'genesis',
    sequence: 0,
    modelState: manifest.initialState,
    prngState: manifest.initialPrngState,
    previousReceiptHash: null,
  });
  return makeRun({
    manifest,
    adapter: modelAdapter,
    snapstates: [snapstate],
    ledger: appendReceipt([], genesis),
    eventBatches: [cloneAndFreeze([])],
  });
}

export function advanceRun(run, inputValue) {
  const sequence = run.ledger.length;
  const expectedInput = run.manifest.inputs[sequence - 1];
  if (!expectedInput) throw new TrustKernelError('E_DUPLICATE_STEP', 'No declared input remains for this run');
  const input = createInputEnvelope(inputValue);
  if (canonicalString(input) !== canonicalString(expectedInput)) {
    throw new TrustKernelError('E_REPLAY_MISMATCH', `Input does not match declared step ${expectedInput.stepId}`);
  }
  const previousSnapstate = run.snapstates.at(-1);
  const previousReceipt = run.ledger.at(-1);
  const prng = createPrng(previousSnapstate.prngState);
  const result = run.adapter.transition({
    state: cloneAndFreeze(previousSnapstate.modelState),
    input,
    prng,
  });
  if (!result || typeof result !== 'object' || Array.isArray(result) || !('state' in result) || !Array.isArray(result.events)) {
    throw new TrustKernelError('E_REPLAY_MISMATCH', 'Model transition must return state and an event array');
  }
  const state = cloneAndFreeze(result.state);
  const events = cloneAndFreeze(result.events);
  const prngState = prng.snapshot();
  const receipt = createTransitionReceipt({
    kernelVersion: run.manifest.kernelVersion,
    runId: run.manifest.runId,
    branchId: run.manifest.branchId,
    stepId: input.stepId,
    sequence,
    previousReceiptHash: previousReceipt.receiptHash,
    input,
    previousState: previousSnapstate.modelState,
    resultingState: state,
    resultingPrngState: prngState,
    eventBatch: events,
  });
  const snapstate = createSnapstate({
    runId: run.manifest.runId,
    branchId: run.manifest.branchId,
    stepId: input.stepId,
    sequence,
    modelState: state,
    prngState,
    previousReceiptHash: previousReceipt.receiptHash,
  });
  return makeRun({
    manifest: run.manifest,
    adapter: run.adapter,
    snapstates: [...run.snapstates, snapstate],
    ledger: appendReceipt(run.ledger, receipt),
    eventBatches: [...run.eventBatches, events],
  });
}

function exportedManifest(run) {
  return createManifest({
    ...run.manifest,
    expectedTerminalReceiptHash: run.ledger.at(-1).receiptHash,
  });
}

export function exportRun(run) {
  return canonicalString({
    eventBatches: run.eventBatches,
    manifest: exportedManifest(run),
    receipts: run.ledger,
    snapstates: run.snapstates,
  });
}

export function parseExportedRun(exportedRun) {
  let value;
  try {
    value = typeof exportedRun === 'string' ? JSON.parse(exportedRun) : structuredClone(exportedRun);
  } catch (error) {
    throw new TrustKernelError('E_REPLAY_MISMATCH', 'Run export is not valid JSON', { cause: error.name });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TrustKernelError('E_REPLAY_MISMATCH', 'Run export must be an object');
  }
  const keys = Object.keys(value).sort();
  if (canonicalString(keys) !== canonicalString(['eventBatches', 'manifest', 'receipts', 'snapstates'])) {
    throw new TrustKernelError('E_REPLAY_MISMATCH', 'Run export contains missing or unknown fields');
  }
  return value;
}

export function replayRun(exportedRun, modelAdapter) {
  const exported = parseExportedRun(exportedRun);
  let run = createRun(createManifest(exported.manifest), modelAdapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  return run;
}

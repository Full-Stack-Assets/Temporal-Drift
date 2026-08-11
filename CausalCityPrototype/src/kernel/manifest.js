import { TrustKernelError } from './errors.js';
import { cloneAndFreeze } from './immutable.js';
import { createPrng } from './prng.js';

export const RUN_FORMAT = 'ripple-trust-run';
export const SCHEMA_VERSION = '1.0.0';
export const KERNEL_VERSION = '1.0.0';
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TrustKernelError('E_UNSAFE_VALUE', `${label} must be a plain object`);
  }
  const keys = Object.keys(value);
  if (keys.length !== allowed.length || keys.some((key) => !allowed.includes(key))) {
    throw new TrustKernelError('E_UNSAFE_VALUE', `${label} contains missing or unknown fields`);
  }
}

function identifier(value, code, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TrustKernelError(code, `${label} must be a non-empty string`);
}

function validateModel(model) {
  exactKeys(model, ['id', 'version'], 'model');
  identifier(model.id, 'E_MODEL_NOT_FOUND', 'model.id');
  identifier(model.version, 'E_MODEL_VERSION', 'model.version');
}

function validateInput(input) {
  exactKeys(input, ['stepId', 'type', 'payload'], 'input envelope');
  identifier(input.stepId, 'E_UNSAFE_VALUE', 'input.stepId');
  identifier(input.type, 'E_UNSAFE_VALUE', 'input.type');
  cloneAndFreeze(input.payload);
}

function validateAncestry(ancestry) {
  if (ancestry === null) return;
  try {
    exactKeys(ancestry, ['parentRunId', 'parentBranchId', 'forkStepId', 'forkReceiptHash'], 'ancestry');
    identifier(ancestry.parentRunId, 'E_UNVERIFIED_FORK', 'ancestry.parentRunId');
    identifier(ancestry.parentBranchId, 'E_UNVERIFIED_FORK', 'ancestry.parentBranchId');
    identifier(ancestry.forkStepId, 'E_UNVERIFIED_FORK', 'ancestry.forkStepId');
    if (!HASH_PATTERN.test(ancestry.forkReceiptHash)) throw new Error('hash');
  } catch (error) {
    if (error instanceof TrustKernelError && error.code === 'E_UNVERIFIED_FORK') throw error;
    throw new TrustKernelError('E_UNVERIFIED_FORK', 'Ancestry must identify a verified fork receipt');
  }
}

function validateNormalization(normalization) {
  exactKeys(normalization, ['id', 'version', 'scales'], 'normalization');
  identifier(normalization.id, 'E_UNSAFE_VALUE', 'normalization.id');
  identifier(normalization.version, 'E_UNSAFE_VALUE', 'normalization.version');
  if (!normalization.scales || typeof normalization.scales !== 'object' || Array.isArray(normalization.scales)) {
    throw new TrustKernelError('E_UNSAFE_VALUE', 'normalization.scales must be an object');
  }
  for (const value of Object.values(normalization.scales)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TrustKernelError('E_UNSAFE_INTEGER', 'Every normalization scale must be a positive safe integer');
  }
}

export function createManifest(fields) {
  exactKeys(fields, [
    'format', 'schemaVersion', 'kernelVersion', 'model', 'runId', 'branchId',
    'initialState', 'initialPrngState', 'inputs', 'ancestry', 'normalization',
    'expectedTerminalReceiptHash', 'evidenceRuntime',
  ], 'run manifest');
  if (fields.format !== RUN_FORMAT || fields.schemaVersion !== SCHEMA_VERSION) {
    throw new TrustKernelError('E_SCHEMA_VERSION', `Expected ${RUN_FORMAT} schema ${SCHEMA_VERSION}`);
  }
  if (fields.kernelVersion !== KERNEL_VERSION) throw new TrustKernelError('E_SCHEMA_VERSION', `Unsupported kernel version ${fields.kernelVersion}`);
  validateModel(fields.model);
  identifier(fields.runId, 'E_UNSAFE_VALUE', 'runId');
  identifier(fields.branchId, 'E_UNSAFE_VALUE', 'branchId');
  cloneAndFreeze(fields.initialState);
  createPrng(fields.initialPrngState);
  if (!Array.isArray(fields.inputs)) throw new TrustKernelError('E_UNSAFE_VALUE', 'inputs must be an array');
  const stepIds = new Set();
  for (const input of fields.inputs) {
    validateInput(input);
    if (stepIds.has(input.stepId)) throw new TrustKernelError('E_DUPLICATE_STEP', `Duplicate step ID: ${input.stepId}`);
    stepIds.add(input.stepId);
  }
  validateAncestry(fields.ancestry);
  validateNormalization(fields.normalization);
  if (fields.expectedTerminalReceiptHash !== null && !HASH_PATTERN.test(fields.expectedTerminalReceiptHash)) {
    throw new TrustKernelError('E_RECEIPT_HASH', 'Expected terminal receipt must be lowercase SHA-256 or null');
  }
  identifier(fields.evidenceRuntime, 'E_UNSAFE_VALUE', 'evidenceRuntime');
  return cloneAndFreeze(fields);
}

export function manifestCore(manifest) {
  const { expectedTerminalReceiptHash: _terminal, evidenceRuntime: _runtime, ...core } = manifest;
  return cloneAndFreeze(core);
}

export function createInputEnvelope(input) {
  validateInput(input);
  return cloneAndFreeze(input);
}

import { hashCanonical } from './canonicalize.js';
import { deepCloneFreeze } from './immutable.js';
import { TrustKernelError } from './errors.js';
import { createPrng } from './prng.js';

export const FORMAT_ID = 'ripple-trust-run';
export const SCHEMA_VERSION = '1';
export const KERNEL_VERSION = '1.0.0';

const HASH_PATTERN = /^[0-9a-f]{64}$/;

function requireString(value, code, field) {
  if (typeof value !== 'string' || value.length === 0) throw new TrustKernelError(code, `${field} must be a non-empty string`);
}

function requireExactKeys(value, allowed, field) {
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === 'symbol')) throw new TrustKernelError('E_SCHEMA_VERSION', `${field} may not contain symbol keys`);
  const expected = new Set(allowed);
  if (keys.some((key) => !expected.has(key))) throw new TrustKernelError('E_SCHEMA_VERSION', `${field} contains an unknown field`);
}

function validateAncestry(ancestry) {
  if (!Array.isArray(ancestry)) throw new TrustKernelError('E_SCHEMA_VERSION', 'ancestry must be an array');
  for (const entry of ancestry) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new TrustKernelError('E_SCHEMA_VERSION', 'ancestry entry must be an object');
    requireExactKeys(entry, ['parentRunId', 'parentBranchId', 'parentReceiptHash', 'forkStepId'], 'ancestry entry');
    requireString(entry.parentRunId, 'E_SCHEMA_VERSION', 'parentRunId');
    requireString(entry.parentBranchId, 'E_SCHEMA_VERSION', 'parentBranchId');
    requireString(entry.forkStepId, 'E_SCHEMA_VERSION', 'forkStepId');
    if (!HASH_PATTERN.test(entry.parentReceiptHash)) throw new TrustKernelError('E_SCHEMA_VERSION', 'parentReceiptHash must be a SHA-256 hex digest');
  }
}

export function manifestCore(manifest) {
  return {
    format: manifest.format,
    schemaVersion: manifest.schemaVersion,
    kernelVersion: manifest.kernelVersion,
    model: manifest.model,
    branchId: manifest.branchId,
    ancestry: manifest.ancestry,
    initialState: manifest.initialState,
    initialPrngState: manifest.initialPrngState,
    inputs: manifest.inputs,
    normalization: manifest.normalization,
  };
}

export function createManifest(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new TrustKernelError('E_SCHEMA_VERSION', 'Manifest config must be an object');
  const model = config.model;
  if (!model || typeof model !== 'object' || Array.isArray(model)) throw new TrustKernelError('E_MODEL_NOT_FOUND', 'Model identity is required');
  requireExactKeys(model, ['id', 'version'], 'model');
  requireString(model.id, 'E_MODEL_NOT_FOUND', 'model.id');
  requireString(model.version, 'E_MODEL_VERSION', 'model.version');
  requireString(config.branchId ?? 'root', 'E_SCHEMA_VERSION', 'branchId');
  createPrng(config.initialPrngState);
  const ancestry = config.ancestry ?? [];
  validateAncestry(ancestry);
  const inputs = config.inputs ?? [];
  if (!Array.isArray(inputs)) throw new TrustKernelError('E_SCHEMA_VERSION', 'inputs must be an array');
  const ids = new Set();
  for (const input of inputs) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TrustKernelError('E_SCHEMA_VERSION', 'input must be an object');
    requireExactKeys(input, ['stepId', 'type', 'data'], 'input');
    requireString(input.stepId, 'E_SCHEMA_VERSION', 'input.stepId');
    requireString(input.type, 'E_SCHEMA_VERSION', 'input.type');
    if (!Object.hasOwn(input, 'data')) throw new TrustKernelError('E_SCHEMA_VERSION', 'input.data is required');
    if (ids.has(input.stepId)) throw new TrustKernelError('E_DUPLICATE_STEP', `Duplicate step id: ${input.stepId}`);
    ids.add(input.stepId);
    hashCanonical(input);
  }
  if (config.expectedTerminalReceiptHash != null && !HASH_PATTERN.test(config.expectedTerminalReceiptHash)) {
    throw new TrustKernelError('E_SCHEMA_VERSION', 'expectedTerminalReceiptHash must be null or a SHA-256 hex digest');
  }
  hashCanonical(config.initialState);
  hashCanonical(config.normalization ?? { id: 'default', scales: {} });
  const base = {
    format: FORMAT_ID,
    schemaVersion: SCHEMA_VERSION,
    kernelVersion: KERNEL_VERSION,
    model: { id: model.id, version: model.version },
    branchId: config.branchId ?? 'root',
    ancestry,
    initialState: config.initialState,
    initialPrngState: [...config.initialPrngState],
    inputs,
    normalization: config.normalization ?? { id: 'default', scales: {} },
  };
  const manifestCoreHash = hashCanonical(base);
  const frozenCore = deepCloneFreeze(base);
  return deepCloneFreeze({ ...frozenCore, manifestCoreHash, expectedTerminalReceiptHash: config.expectedTerminalReceiptHash ?? null });
}

export function validateManifest(manifest) {
  if (!manifest || manifest.format !== FORMAT_ID || manifest.schemaVersion !== SCHEMA_VERSION || manifest.kernelVersion !== KERNEL_VERSION) {
    throw new TrustKernelError('E_SCHEMA_VERSION', 'Unsupported manifest format or version');
  }
  if (manifest.expectedTerminalReceiptHash != null && !HASH_PATTERN.test(manifest.expectedTerminalReceiptHash)) throw new TrustKernelError('E_SCHEMA_VERSION', 'Invalid terminal receipt hash');
  const expected = hashCanonical(manifestCore(manifest));
  if (expected !== manifest.manifestCoreHash) throw new TrustKernelError('E_REPLAY_MISMATCH', 'Manifest core hash mismatch');
  createPrng(manifest.initialPrngState);
  return manifest;
}

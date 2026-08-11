import { hashCanonical } from './canonicalize.js';
import { deepCloneFreeze } from './immutable.js';
import { TrustKernelError } from './errors.js';
import { createPrng } from './prng.js';

export const FORMAT_ID = 'ripple-trust-run';
export const SCHEMA_VERSION = '1';
export const KERNEL_VERSION = '1.0.0';

function requireString(value, code, field) {
  if (typeof value !== 'string' || value.length === 0) throw new TrustKernelError(code, `${field} must be a non-empty string`);
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
  if (!model || typeof model !== 'object') throw new TrustKernelError('E_MODEL_NOT_FOUND', 'Model identity is required');
  requireString(model.id, 'E_MODEL_NOT_FOUND', 'model.id');
  requireString(model.version, 'E_MODEL_VERSION', 'model.version');
  requireString(config.branchId ?? 'root', 'E_SCHEMA_VERSION', 'branchId');
  createPrng(config.initialPrngState);
  const inputs = config.inputs ?? [];
  if (!Array.isArray(inputs)) throw new TrustKernelError('E_SCHEMA_VERSION', 'inputs must be an array');
  const ids = new Set();
  for (const input of inputs) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TrustKernelError('E_SCHEMA_VERSION', 'input must be an object');
    requireString(input.stepId, 'E_SCHEMA_VERSION', 'input.stepId');
    requireString(input.type, 'E_SCHEMA_VERSION', 'input.type');
    if (ids.has(input.stepId)) throw new TrustKernelError('E_DUPLICATE_STEP', `Duplicate step id: ${input.stepId}`);
    ids.add(input.stepId);
    hashCanonical(input);
  }
  hashCanonical(config.initialState);
  hashCanonical(config.normalization ?? { id: 'default', scales: {} });
  const base = {
    format: FORMAT_ID,
    schemaVersion: SCHEMA_VERSION,
    kernelVersion: KERNEL_VERSION,
    model: { id: model.id, version: model.version },
    branchId: config.branchId ?? 'root',
    ancestry: config.ancestry ?? [],
    initialState: config.initialState,
    initialPrngState: [...config.initialPrngState],
    inputs,
    normalization: config.normalization ?? { id: 'default', scales: {} },
  };
  const frozenCore = deepCloneFreeze(base);
  const manifestCoreHash = hashCanonical(frozenCore);
  return deepCloneFreeze({ ...frozenCore, manifestCoreHash, expectedTerminalReceiptHash: config.expectedTerminalReceiptHash ?? null });
}

export function validateManifest(manifest) {
  if (!manifest || manifest.format !== FORMAT_ID || manifest.schemaVersion !== SCHEMA_VERSION || manifest.kernelVersion !== KERNEL_VERSION) {
    throw new TrustKernelError('E_SCHEMA_VERSION', 'Unsupported manifest format or version');
  }
  const expected = hashCanonical(manifestCore(manifest));
  if (expected !== manifest.manifestCoreHash) throw new TrustKernelError('E_REPLAY_MISMATCH', 'Manifest core hash mismatch');
  createPrng(manifest.initialPrngState);
  return manifest;
}

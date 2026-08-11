import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  approxFail,
  assertPlainExact,
  existingBranch,
  requiredString,
  resolveSafeIntegerPath,
  safeInteger,
  verifiedGraph,
} from './common.js';

export const SENSITIVITY_FORMAT = 'ripple-sensitivity-topography';
export const SENSITIVITY_SCHEMA_VERSION = '1.0.0';

function normalizeLevers(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    approxFail('E_APPROX_SCHEMA', `${path} must be a plain object`, path);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string')) approxFail('E_APPROX_SCHEMA', `${path} cannot contain symbol keys`, path);
  const entries = Object.entries(value);
  if (entries.length === 0) approxFail('E_APPROX_SCHEMA', `${path} must declare at least one lever`, path);
  const normalized = {};
  for (const [key, lever] of entries) {
    requiredString(key, 'E_APPROX_SCHEMA', `${path}.${key}`);
    normalized[key] = safeInteger(lever, 'E_APPROX_SCHEMA', `${path}.${key}`);
  }
  return cloneAndFreeze(normalized);
}

function normalizeOutcomes(value) {
  if (!Array.isArray(value) || value.length === 0) approxFail('E_APPROX_SCHEMA', 'outcomes must be a non-empty array', 'outcomes');
  const seen = new Set();
  return cloneAndFreeze(value.map((outcome, index) => {
    assertPlainExact(outcome, ['id', 'path'], 'E_APPROX_SCHEMA', `outcomes.${index}`);
    const id = requiredString(outcome.id, 'E_APPROX_SCHEMA', `outcomes.${index}.id`);
    if (seen.has(id)) approxFail('E_APPROX_SCHEMA', `Duplicate outcome ID: ${id}`, `outcomes.${index}.id`);
    seen.add(id);
    const path = requiredString(outcome.path, 'E_APPROX_SCHEMA', `outcomes.${index}.path`);
    return cloneAndFreeze({ id, path });
  }));
}

function normalizeThresholds(value, outcomes) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    approxFail('E_APPROX_SCHEMA', 'cliffThresholds must be a plain object', 'cliffThresholds');
  }
  const ids = new Set(outcomes.map((outcome) => outcome.id));
  const normalized = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !ids.has(key)) approxFail('E_APPROX_SCHEMA', `Unknown cliff threshold: ${String(key)}`, 'cliffThresholds');
    normalized[key] = safeInteger(value[key], 'E_APPROX_SCHEMA', `cliffThresholds.${key}`, { min: 0 });
  }
  return cloneAndFreeze(normalized);
}

function delta(left, right, path) {
  const value = right - left;
  if (!Number.isSafeInteger(value)) approxFail('E_APPROX_SCHEMA', `Delta exceeds safe-integer range: ${path}`, path);
  return value;
}

export function sampleSensitivityTopography(graph, config) {
  verifiedGraph(graph);
  assertPlainExact(config, ['samples', 'outcomes', 'cliffThresholds'], 'E_APPROX_SCHEMA', 'config');
  if (!Array.isArray(config.samples) || config.samples.length < 1) approxFail('E_APPROX_SCHEMA', 'samples must contain at least one entry', 'samples');
  const outcomes = normalizeOutcomes(config.outcomes);
  const thresholds = normalizeThresholds(config.cliffThresholds, outcomes);

  const points = config.samples.map((sample, index) => {
    assertPlainExact(sample, ['branchId', 'levers'], 'E_APPROX_SCHEMA', `samples.${index}`);
    const branchId = requiredString(sample.branchId, 'E_APPROX_SCHEMA', `samples.${index}.branchId`);
    const run = existingBranch(graph, branchId, `samples.${index}.branchId`);
    const levers = normalizeLevers(sample.levers, `samples.${index}.levers`);
    const terminalState = run.snapstates.at(-1).modelState;
    const values = {};
    for (const outcome of outcomes) values[outcome.id] = resolveSafeIntegerPath(terminalState, outcome.path, `outcomes.${outcome.id}.path`);
    return cloneAndFreeze({ branchId, levers, outcomes: values });
  });

  points.sort((left, right) => canonicalString(left.levers).localeCompare(canonicalString(right.levers)) || left.branchId.localeCompare(right.branchId));

  const neighborDeltas = [];
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1];
    const right = points[index];
    const outcomeDeltas = {};
    const cliffs = {};
    for (const outcome of outcomes) {
      const change = delta(left.outcomes[outcome.id], right.outcomes[outcome.id], `neighborDeltas.${index}.${outcome.id}`);
      outcomeDeltas[outcome.id] = change;
      const threshold = thresholds[outcome.id];
      cliffs[outcome.id] = threshold === undefined ? false : Math.abs(change) >= threshold;
    }
    neighborDeltas.push(cloneAndFreeze({
      fromBranchId: left.branchId,
      toBranchId: right.branchId,
      outcomeDeltas,
      cliffs,
    }));
  }

  const core = cloneAndFreeze({
    format: SENSITIVITY_FORMAT,
    schemaVersion: SENSITIVITY_SCHEMA_VERSION,
    semanticClass: 'approximate-sensitivity',
    graphId: graph.graphId,
    sourceGraphHash: graph.graphHash,
    outcomes,
    cliffThresholds: thresholds,
    points,
    neighborDeltas,
  });
  return cloneAndFreeze({ ...core, topographyHash: sha256Hex(core) });
}

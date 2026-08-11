import { sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  addFractions,
  approxFail,
  assertPlainExact,
  compareFractions,
  existingBranch,
  fractionOutput,
  multiplyFraction,
  reduceFraction,
  requiredString,
  resolveSafeIntegerPath,
  safeInteger,
  verifiedGraph,
} from './common.js';

export const BRANCH_RANKING_FORMAT = 'ripple-branch-ranking';
export const BRANCH_RANKING_SCHEMA_VERSION = '1.0.0';

function normalizeObjectives(value) {
  if (!Array.isArray(value) || value.length === 0) approxFail('E_APPROX_SCHEMA', 'objectives must be a non-empty array', 'objectives');
  const ids = new Set();
  return value.map((objective, index) => {
    assertPlainExact(objective, ['id', 'path', 'direction', 'weight'], 'E_APPROX_SCHEMA', `objectives.${index}`);
    const id = requiredString(objective.id, 'E_APPROX_SCHEMA', `objectives.${index}.id`);
    if (ids.has(id)) approxFail('E_APPROX_SCHEMA', `Duplicate objective ID: ${id}`, `objectives.${index}.id`);
    ids.add(id);
    const path = requiredString(objective.path, 'E_APPROX_SCHEMA', `objectives.${index}.path`);
    if (!['maximize', 'minimize'].includes(objective.direction)) approxFail('E_APPROX_SCHEMA', 'Objective direction must be maximize or minimize', `objectives.${index}.direction`);
    const weight = safeInteger(objective.weight, 'E_APPROX_SCHEMA', `objectives.${index}.weight`, { min: 1 });
    return cloneAndFreeze({ id, path, direction: objective.direction, weight });
  });
}

function normalizedFraction(rawValue, min, max, direction) {
  if (max === min) return { numerator: 0n, denominator: 1n };
  const numerator = direction === 'maximize' ? BigInt(rawValue - min) : BigInt(max - rawValue);
  return reduceFraction(numerator, BigInt(max - min));
}

export function rankBranches(graph, config) {
  verifiedGraph(graph);
  assertPlainExact(config, ['branchIds', 'objectives', 'limit'], 'E_APPROX_SCHEMA', 'config');
  if (!Array.isArray(config.branchIds) || config.branchIds.length === 0) approxFail('E_APPROX_SCHEMA', 'branchIds must be a non-empty array', 'branchIds');
  const unique = new Set(config.branchIds);
  if (unique.size !== config.branchIds.length) approxFail('E_APPROX_SCHEMA', 'branchIds must be unique', 'branchIds');
  const branchIds = [...config.branchIds].map((id, index) => requiredString(id, 'E_APPROX_BRANCH', `branchIds.${index}`));
  const objectives = normalizeObjectives(config.objectives);
  const limit = safeInteger(config.limit, 'E_APPROX_SCHEMA', 'limit', { min: 1, max: branchIds.length });

  const rawByBranch = new Map();
  for (const branchId of branchIds) {
    const run = existingBranch(graph, branchId, `branchIds.${branchId}`);
    const terminalState = run.snapstates.at(-1).modelState;
    const raw = {};
    for (const objective of objectives) raw[objective.id] = resolveSafeIntegerPath(terminalState, objective.path, `objectives.${objective.id}.path`);
    rawByBranch.set(branchId, raw);
  }

  const ranges = new Map();
  for (const objective of objectives) {
    const values = branchIds.map((branchId) => rawByBranch.get(branchId)[objective.id]);
    ranges.set(objective.id, { min: Math.min(...values), max: Math.max(...values) });
  }

  const scored = branchIds.map((branchId) => {
    let aggregate = { numerator: 0n, denominator: 1n };
    const objectiveResults = objectives.map((objective) => {
      const rawValue = rawByBranch.get(branchId)[objective.id];
      const range = ranges.get(objective.id);
      const normalized = normalizedFraction(rawValue, range.min, range.max, objective.direction);
      const weighted = multiplyFraction(normalized, objective.weight);
      aggregate = addFractions(aggregate, weighted);
      return cloneAndFreeze({
        id: objective.id,
        path: objective.path,
        direction: objective.direction,
        weight: objective.weight,
        rawValue,
        normalized: fractionOutput(normalized),
        weightedContribution: fractionOutput(weighted),
      });
    });
    return {
      branchId,
      objectives: objectiveResults,
      aggregateInternal: aggregate,
      aggregateScore: fractionOutput(aggregate),
    };
  });

  scored.sort((left, right) => {
    const comparison = compareFractions(right.aggregateInternal, left.aggregateInternal);
    return comparison || left.branchId.localeCompare(right.branchId);
  });

  const rankings = scored.slice(0, limit).map((entry, index) => cloneAndFreeze({
    rank: index + 1,
    branchId: entry.branchId,
    objectives: entry.objectives,
    aggregateScore: entry.aggregateScore,
  }));

  const core = cloneAndFreeze({
    format: BRANCH_RANKING_FORMAT,
    schemaVersion: BRANCH_RANKING_SCHEMA_VERSION,
    semanticClass: 'synthetic-fitness-table',
    advisoryOnly: true,
    graphId: graph.graphId,
    sourceGraphHash: graph.graphHash,
    candidateBranchIds: [...branchIds].sort(),
    objectives,
    limit,
    rankings,
  });
  return cloneAndFreeze({ ...core, rankingHash: sha256Hex(core) });
}

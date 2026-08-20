import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { createPrng } from '../kernel/prng.js';
import {
  assertExactKeys,
  assertNonEmptyString,
  assertPlainDataObject,
  assertSafeInteger,
  contentAddress,
  evaluateDeterministically,
  normalizeSafeIntegerMap,
  pinDeterministicEvaluator,
  safeIntegerProduct,
  safeIntegerSum,
} from './common.js';

export const BRANCH_EXPLORATION_FORMAT = 'ripple-branch-exploration';
export const BRANCH_EXPLORATION_SCHEMA_VERSION = '1.0.0';

const HASH = /^[a-f0-9]{64}$/;
const GRAPH_ID = /^graph-[a-f0-9]{64}$/;
const BRANCH_ID = /^branch-[a-f0-9]{64}$/;

function fail(code, message, path = 'exploration', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function parseArtifact(value) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    fail('E_APPROX_SCHEMA', 'Branch exploration is not valid JSON', 'exploration');
  }
}

function artifactCore(value) {
  const { explorationHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function normalizeParentRef(value, label = 'config.parentRef') {
  assertExactKeys(value, ['graphId', 'parentBranchId', 'forkStepId', 'parentReceiptHash'], label, 'E_EXPLORATION_CONFIG');
  const parentRef = {
    graphId: assertNonEmptyString(value.graphId, `${label}.graphId`, 'E_EXPLORATION_CONFIG'),
    parentBranchId: assertNonEmptyString(value.parentBranchId, `${label}.parentBranchId`, 'E_EXPLORATION_CONFIG'),
    forkStepId: assertNonEmptyString(value.forkStepId, `${label}.forkStepId`, 'E_EXPLORATION_CONFIG'),
    parentReceiptHash: assertNonEmptyString(value.parentReceiptHash, `${label}.parentReceiptHash`, 'E_EXPLORATION_CONFIG'),
  };
  if (!GRAPH_ID.test(parentRef.graphId) || !BRANCH_ID.test(parentRef.parentBranchId) || !HASH.test(parentRef.parentReceiptHash)) {
    fail('E_EXPLORATION_CONFIG', 'Parent reference contains malformed identities', label);
  }
  return cloneAndFreeze(parentRef);
}

function normalizeState(value, label = 'config.seedState') {
  try {
    return createPrng(value).snapshot();
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    fail('E_EXPLORATION_CONFIG', 'Invalid PRNG state', label);
  }
}

function normalizeAxes(axesInput) {
  if (!Array.isArray(axesInput) || axesInput.length === 0) fail('E_EXPLORATION_CONFIG', 'axes must be a non-empty array', 'config.axes');
  const seen = new Set();
  return cloneAndFreeze(axesInput.map((axis, index) => {
    assertExactKeys(axis, ['axisId', 'minimum', 'maximum', 'step'], `config.axes.${index}`, 'E_EXPLORATION_CONFIG');
    const axisId = assertNonEmptyString(axis.axisId, `config.axes.${index}.axisId`, 'E_EXPLORATION_CONFIG');
    if (seen.has(axisId)) fail('E_EXPLORATION_CONFIG', `Duplicate axis ${axisId}`, `config.axes.${index}.axisId`);
    seen.add(axisId);
    const minimum = assertSafeInteger(axis.minimum, `config.axes.${index}.minimum`, 'E_EXPLORATION_CONFIG');
    const maximum = assertSafeInteger(axis.maximum, `config.axes.${index}.maximum`, 'E_EXPLORATION_CONFIG');
    const step = assertSafeInteger(axis.step, `config.axes.${index}.step`, 'E_EXPLORATION_CONFIG');
    if (minimum > maximum || step <= 0) fail('E_EXPLORATION_CONFIG', `Invalid axis bounds for ${axisId}`, `config.axes.${index}`);
    return cloneAndFreeze({ axisId, minimum, maximum, step });
  }).sort((left, right) => left.axisId.localeCompare(right.axisId)));
}

function normalizeObjectives(objectivesInput) {
  if (!Array.isArray(objectivesInput) || objectivesInput.length === 0) fail('E_EXPLORATION_CONFIG', 'objectives must be a non-empty array', 'config.objectives');
  const seen = new Set();
  return cloneAndFreeze(objectivesInput.map((objective, index) => {
    assertExactKeys(objective, ['metricId', 'direction', 'weight'], `config.objectives.${index}`, 'E_EXPLORATION_CONFIG');
    const metricId = assertNonEmptyString(objective.metricId, `config.objectives.${index}.metricId`, 'E_EXPLORATION_CONFIG');
    if (seen.has(metricId)) fail('E_EXPLORATION_CONFIG', `Duplicate objective ${metricId}`, `config.objectives.${index}.metricId`);
    seen.add(metricId);
    if (!['maximize', 'minimize'].includes(objective.direction)) fail('E_EXPLORATION_CONFIG', `Invalid objective direction for ${metricId}`, `config.objectives.${index}.direction`);
    const weight = assertSafeInteger(objective.weight, `config.objectives.${index}.weight`, 'E_EXPLORATION_CONFIG');
    if (weight <= 0) fail('E_EXPLORATION_CONFIG', `Objective weight must be positive for ${metricId}`, `config.objectives.${index}.weight`);
    return cloneAndFreeze({ metricId, direction: objective.direction, weight });
  }).sort((left, right) => left.metricId.localeCompare(right.metricId)));
}

function normalizeParameters(value, axes, label) {
  const parameters = normalizeSafeIntegerMap(value, label, {
    expectedKeys: axes.map((axis) => axis.axisId),
    code: 'E_EXPLORATION_CONFIG',
  });
  for (const axis of axes) {
    if (parameters[axis.axisId] < axis.minimum || parameters[axis.axisId] > axis.maximum) {
      fail('E_EXPLORATION_CONFIG', `${label}.${axis.axisId} is outside declared bounds`, `${label}.${axis.axisId}`);
    }
  }
  return parameters;
}

function scoreMetrics(metrics, objectives) {
  const terms = objectives.map((objective) => {
    const weighted = safeIntegerProduct(metrics[objective.metricId], objective.weight, `score.${objective.metricId}`);
    return objective.direction === 'maximize' ? weighted : safeIntegerProduct(weighted, -1, `score.${objective.metricId}.direction`);
  });
  return safeIntegerSum(terms, 'candidate.score');
}

function objectiveHash(objectives) {
  return sha256Hex(objectives);
}

function candidateContent(context, parameters, metrics, score) {
  return cloneAndFreeze({
    parentRef: context.parentRef,
    evaluator: context.evaluator,
    objectiveHash: context.objectiveHash,
    parameters,
    metrics,
    score,
  });
}

function makeCandidate(context, parameters, pinned) {
  const metrics = evaluateDeterministically(pinned, parameters);
  const score = scoreMetrics(metrics, context.objectives);
  const identity = candidateContent(context, parameters, metrics, score);
  return cloneAndFreeze({ parameters, metrics, score, candidateId: contentAddress('candidate', identity) });
}

function rankCandidates(candidates) {
  return [...candidates].sort((left, right) => right.score - left.score || left.candidateId.localeCompare(right.candidateId));
}

function mutationRecord(generation, parentCandidateId, candidateId) {
  const content = cloneAndFreeze({ generation, parentCandidateId, candidateId });
  return cloneAndFreeze({ ...content, mutationId: contentAddress('mutation', content) });
}

function generationRecord(generation, population, survivors, mutations) {
  const content = cloneAndFreeze({
    generation,
    populationCandidateIds: cloneAndFreeze(population.map((candidate) => candidate.candidateId).sort()),
    survivorCandidateIds: cloneAndFreeze(survivors.map((candidate) => candidate.candidateId).sort()),
    mutations: cloneAndFreeze([...mutations].sort((left, right) => left.mutationId.localeCompare(right.mutationId))),
  });
  return cloneAndFreeze({ ...content, generationId: contentAddress('generation', content) });
}

function mutateValue(value, axis, direction) {
  const candidate = BigInt(value) + BigInt(direction) * BigInt(axis.step);
  const bounded = candidate < BigInt(axis.minimum)
    ? BigInt(axis.minimum)
    : candidate > BigInt(axis.maximum)
      ? BigInt(axis.maximum)
      : candidate;
  if (bounded < BigInt(Number.MIN_SAFE_INTEGER) || bounded > BigInt(Number.MAX_SAFE_INTEGER)) fail('E_APPROX_OVERFLOW', `Mutation overflow for ${axis.axisId}`, `axis.${axis.axisId}`);
  return Number(bounded);
}

function mutateParameters(parent, axes, prng) {
  const next = { ...parent.parameters };
  let changed = false;
  for (const axis of axes) {
    const direction = prng.nextInt(3) - 1;
    const value = mutateValue(next[axis.axisId], axis, direction);
    if (value !== next[axis.axisId]) changed = true;
    next[axis.axisId] = value;
  }
  if (!changed) {
    const axis = axes[prng.nextInt(axes.length)];
    const preferred = prng.nextInt(2) === 0 ? -1 : 1;
    let value = mutateValue(next[axis.axisId], axis, preferred);
    if (value === next[axis.axisId]) value = mutateValue(next[axis.axisId], axis, -preferred);
    if (value !== next[axis.axisId]) {
      next[axis.axisId] = value;
      changed = true;
    }
  }
  return changed ? cloneAndFreeze(next) : null;
}

function dominates(left, right, objectives) {
  let strict = false;
  for (const objective of objectives) {
    const leftValue = left.metrics[objective.metricId];
    const rightValue = right.metrics[objective.metricId];
    if (objective.direction === 'maximize') {
      if (leftValue < rightValue) return false;
      if (leftValue > rightValue) strict = true;
    } else {
      if (leftValue > rightValue) return false;
      if (leftValue < rightValue) strict = true;
    }
  }
  return strict;
}

function paretoFrontier(candidates, objectives) {
  return cloneAndFreeze(candidates
    .filter((candidate) => !candidates.some((other) => other.candidateId !== candidate.candidateId && dominates(other, candidate, objectives)))
    .map((candidate) => candidate.candidateId)
    .sort());
}

function proposalRecord(candidate, parentRef) {
  const content = cloneAndFreeze({
    candidateId: candidate.candidateId,
    parentRef,
    parameters: candidate.parameters,
    metrics: candidate.metrics,
    score: candidate.score,
    status: 'proposed-for-human-review',
    reviewRequired: true,
    executionAuthority: 'none',
  });
  return cloneAndFreeze({ ...content, proposalId: contentAddress('branch-proposal', content) });
}

function normalizeConfig(input) {
  assertExactKeys(input, [
    'parentRef', 'seedState', 'axes', 'initialCandidates', 'objectives', 'evaluator',
    'populationLimit', 'survivorCount', 'generations', 'proposalLimit',
  ], 'config', 'E_EXPLORATION_CONFIG');
  const parentRef = normalizeParentRef(input.parentRef);
  const seedState = normalizeState(input.seedState);
  const axes = normalizeAxes(input.axes);
  const objectives = normalizeObjectives(input.objectives);
  if (!Array.isArray(input.initialCandidates) || input.initialCandidates.length === 0) fail('E_EXPLORATION_CONFIG', 'initialCandidates must be non-empty', 'config.initialCandidates');
  const initialCandidates = input.initialCandidates.map((candidate, index) => {
    assertExactKeys(candidate, ['parameters'], `config.initialCandidates.${index}`, 'E_EXPLORATION_CONFIG');
    return cloneAndFreeze({ parameters: normalizeParameters(candidate.parameters, axes, `config.initialCandidates.${index}.parameters`) });
  });
  const uniqueInitial = new Set(initialCandidates.map((candidate) => canonicalString(candidate.parameters)));
  if (uniqueInitial.size !== initialCandidates.length) fail('E_EXPLORATION_CONFIG', 'initialCandidates contain duplicate parameter vectors', 'config.initialCandidates');
  const populationLimit = assertSafeInteger(input.populationLimit, 'config.populationLimit', 'E_EXPLORATION_CONFIG');
  const survivorCount = assertSafeInteger(input.survivorCount, 'config.survivorCount', 'E_EXPLORATION_CONFIG');
  const generations = assertSafeInteger(input.generations, 'config.generations', 'E_EXPLORATION_CONFIG');
  const proposalLimit = assertSafeInteger(input.proposalLimit, 'config.proposalLimit', 'E_EXPLORATION_CONFIG');
  if (populationLimit < initialCandidates.length || populationLimit < 2 || survivorCount < 1 || survivorCount > populationLimit || generations < 0 || proposalLimit < 1 || proposalLimit > populationLimit) {
    fail('E_EXPLORATION_CONFIG', 'Exploration limits are inconsistent', 'config');
  }
  const metricIds = objectives.map((objective) => objective.metricId);
  const pinned = pinDeterministicEvaluator(input.evaluator, metricIds);
  return cloneAndFreeze({
    parentRef,
    seedState,
    axes,
    initialCandidates: cloneAndFreeze(initialCandidates),
    objectives,
    pinned,
    config: cloneAndFreeze({ populationLimit, survivorCount, generations, proposalLimit }),
  });
}

function build(input) {
  const normalized = normalizeConfig(input);
  const context = {
    parentRef: normalized.parentRef,
    evaluator: normalized.pinned.identity,
    objectives: normalized.objectives,
    objectiveHash: objectiveHash(normalized.objectives),
  };
  const prng = createPrng(normalized.seedState);
  const candidateByGenome = new Map();
  const candidateById = new Map();
  function admit(parameters) {
    const genome = canonicalString(parameters);
    if (candidateByGenome.has(genome)) return candidateByGenome.get(genome);
    const candidate = makeCandidate(context, parameters, normalized.pinned);
    candidateByGenome.set(genome, candidate);
    candidateById.set(candidate.candidateId, candidate);
    return candidate;
  }
  let population = normalized.initialCandidates.map((candidate) => admit(candidate.parameters));
  let survivors = rankCandidates(population).slice(0, normalized.config.survivorCount);
  const generations = [generationRecord(0, population, survivors, [])];
  const attemptCeiling = normalized.config.populationLimit * normalized.axes.length * 8;

  for (let generation = 1; generation <= normalized.config.generations; generation += 1) {
    const nextById = new Map(survivors.map((candidate) => [candidate.candidateId, candidate]));
    const mutations = [];
    for (let attempt = 0; attempt < attemptCeiling && nextById.size < normalized.config.populationLimit; attempt += 1) {
      const parent = survivors[attempt % survivors.length];
      const parameters = mutateParameters(parent, normalized.axes, prng);
      if (!parameters) continue;
      const candidate = admit(parameters);
      if (candidate.candidateId === parent.candidateId || nextById.has(candidate.candidateId)) continue;
      nextById.set(candidate.candidateId, candidate);
      mutations.push(mutationRecord(generation, parent.candidateId, candidate.candidateId));
    }
    population = [...nextById.values()];
    survivors = rankCandidates(population).slice(0, normalized.config.survivorCount);
    generations.push(generationRecord(generation, population, survivors, mutations));
  }

  const candidates = [...candidateById.values()].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  const frontier = paretoFrontier(candidates, normalized.objectives);
  const frontierCandidates = rankCandidates(frontier.map((candidateId) => candidateById.get(candidateId)));
  const proposals = frontierCandidates.slice(0, normalized.config.proposalLimit).map((candidate) => proposalRecord(candidate, normalized.parentRef));
  const core = cloneAndFreeze({
    format: BRANCH_EXPLORATION_FORMAT,
    schemaVersion: BRANCH_EXPLORATION_SCHEMA_VERSION,
    approximation: true,
    executionAuthority: 'none',
    reviewRequired: true,
    parentRef: normalized.parentRef,
    evaluator: normalized.pinned.identity,
    seedState: normalized.seedState,
    terminalPrngState: prng.snapshot(),
    axes: normalized.axes,
    objectives: normalized.objectives,
    config: normalized.config,
    candidates,
    generations: cloneAndFreeze(generations),
    paretoFrontier: frontier,
    proposals: cloneAndFreeze(proposals),
  });
  return cloneAndFreeze({ ...core, explorationHash: sha256Hex(core) });
}

function verifyArrayIds(values, pattern, path) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string' || !pattern.test(value)) || new Set(values).size !== values.length) fail('E_APPROX_SCHEMA', `${path} contains invalid or duplicate IDs`, path);
}

function verifyInternal(value) {
  assertPlainDataObject(value, 'exploration');
  assertExactKeys(value, [
    'format', 'schemaVersion', 'approximation', 'executionAuthority', 'reviewRequired',
    'parentRef', 'evaluator', 'seedState', 'terminalPrngState', 'axes', 'objectives',
    'config', 'candidates', 'generations', 'paretoFrontier', 'proposals', 'explorationHash',
  ], 'exploration');
  if (value.format !== BRANCH_EXPLORATION_FORMAT || value.schemaVersion !== BRANCH_EXPLORATION_SCHEMA_VERSION || value.approximation !== true || value.executionAuthority !== 'none' || value.reviewRequired !== true) fail('E_APPROX_SCHEMA', 'Unsupported branch-exploration artifact', 'exploration');
  if (typeof value.explorationHash !== 'string' || !HASH.test(value.explorationHash)) fail('E_APPROX_SCHEMA', 'Invalid exploration hash', 'exploration.explorationHash');
  const expectedHash = sha256Hex(artifactCore(value));
  if (expectedHash !== value.explorationHash) fail('E_APPROX_HASH', 'Exploration hash mismatch', 'exploration.explorationHash', expectedHash, value.explorationHash);
  const parentRef = normalizeParentRef(value.parentRef, 'exploration.parentRef');
  const seedState = normalizeState(value.seedState, 'exploration.seedState');
  normalizeState(value.terminalPrngState, 'exploration.terminalPrngState');
  const axes = normalizeAxes(value.axes);
  const objectives = normalizeObjectives(value.objectives);
  assertExactKeys(value.evaluator, ['id', 'version'], 'exploration.evaluator');
  const evaluatorIdentity = cloneAndFreeze({
    id: assertNonEmptyString(value.evaluator.id, 'exploration.evaluator.id'),
    version: assertNonEmptyString(value.evaluator.version, 'exploration.evaluator.version'),
  });
  assertExactKeys(value.config, ['populationLimit', 'survivorCount', 'generations', 'proposalLimit'], 'exploration.config');
  for (const key of ['populationLimit', 'survivorCount', 'generations', 'proposalLimit']) assertSafeInteger(value.config[key], `exploration.config.${key}`);
  if (!Array.isArray(value.candidates) || !Array.isArray(value.generations) || !Array.isArray(value.paretoFrontier) || !Array.isArray(value.proposals)) fail('E_APPROX_SCHEMA', 'Exploration collections must be arrays', 'exploration');
  const context = { parentRef, evaluator: evaluatorIdentity, objectives, objectiveHash: objectiveHash(objectives) };
  const candidateById = new Map();
  for (const candidate of value.candidates) {
    assertExactKeys(candidate, ['parameters', 'metrics', 'score', 'candidateId'], `exploration.candidates.${candidate.candidateId}`);
    const parameters = normalizeParameters(candidate.parameters, axes, `exploration.candidates.${candidate.candidateId}.parameters`);
    const metrics = normalizeSafeIntegerMap(candidate.metrics, `exploration.candidates.${candidate.candidateId}.metrics`, { expectedKeys: objectives.map((objective) => objective.metricId) });
    const score = scoreMetrics(metrics, objectives);
    if (score !== candidate.score) fail('E_APPROX_HASH', 'Candidate score arithmetic mismatch', `exploration.candidates.${candidate.candidateId}.score`, score, candidate.score);
    const expectedId = contentAddress('candidate', candidateContent(context, parameters, metrics, score));
    if (candidate.candidateId !== expectedId) fail('E_APPROX_HASH', 'Candidate content ID mismatch', `exploration.candidates.${candidate.candidateId}.candidateId`, expectedId, candidate.candidateId);
    if (candidateById.has(candidate.candidateId)) fail('E_APPROX_SCHEMA', 'Duplicate candidate ID', `exploration.candidates.${candidate.candidateId}`);
    candidateById.set(candidate.candidateId, cloneAndFreeze({ parameters, metrics, score, candidateId: candidate.candidateId }));
  }
  if (candidateById.size < 1) fail('E_APPROX_REFERENCE', 'Exploration contains no candidates', 'exploration.candidates');
  for (let index = 0; index < value.generations.length; index += 1) {
    const generation = value.generations[index];
    assertExactKeys(generation, ['generation', 'populationCandidateIds', 'survivorCandidateIds', 'mutations', 'generationId'], `exploration.generations.${index}`);
    if (generation.generation !== index) fail('E_APPROX_REFERENCE', 'Generation numbering is not contiguous', `exploration.generations.${index}.generation`);
    verifyArrayIds(generation.populationCandidateIds, /^candidate-[a-f0-9]{64}$/, `exploration.generations.${index}.populationCandidateIds`);
    verifyArrayIds(generation.survivorCandidateIds, /^candidate-[a-f0-9]{64}$/, `exploration.generations.${index}.survivorCandidateIds`);
    if (generation.populationCandidateIds.some((id) => !candidateById.has(id)) || generation.survivorCandidateIds.some((id) => !generation.populationCandidateIds.includes(id))) fail('E_APPROX_REFERENCE', 'Generation references unknown candidates', `exploration.generations.${index}`);
    if (generation.populationCandidateIds.length > value.config.populationLimit || generation.survivorCandidateIds.length > value.config.survivorCount) fail('E_APPROX_REFERENCE', 'Generation exceeds configured limits', `exploration.generations.${index}`);
    if (!Array.isArray(generation.mutations)) fail('E_APPROX_SCHEMA', 'Generation mutations must be an array', `exploration.generations.${index}.mutations`);
    for (const mutation of generation.mutations) {
      assertExactKeys(mutation, ['generation', 'parentCandidateId', 'candidateId', 'mutationId'], `exploration.generations.${index}.mutations.${mutation.mutationId}`);
      const expected = mutationRecord(mutation.generation, mutation.parentCandidateId, mutation.candidateId);
      if (canonicalString(expected) !== canonicalString(mutation)) fail('E_APPROX_HASH', 'Mutation content ID mismatch', `exploration.generations.${index}.mutations.${mutation.mutationId}`);
      if (mutation.generation !== index || !candidateById.has(mutation.parentCandidateId) || !candidateById.has(mutation.candidateId)) fail('E_APPROX_REFERENCE', 'Mutation references invalid generation or candidate', `exploration.generations.${index}.mutations.${mutation.mutationId}`);
    }
    const expectedGeneration = generationRecord(
      generation.generation,
      generation.populationCandidateIds.map((id) => candidateById.get(id)),
      generation.survivorCandidateIds.map((id) => candidateById.get(id)),
      generation.mutations,
    );
    if (canonicalString(expectedGeneration) !== canonicalString(generation)) fail('E_APPROX_HASH', 'Generation content ID mismatch', `exploration.generations.${index}.generationId`);
  }
  if (value.generations.length !== value.config.generations + 1) fail('E_APPROX_REFERENCE', 'Generation count differs from configuration', 'exploration.generations');
  const candidates = [...candidateById.values()];
  const expectedFrontier = paretoFrontier(candidates, objectives);
  if (canonicalString(expectedFrontier) !== canonicalString(value.paretoFrontier)) fail('E_APPROX_HASH', 'Pareto frontier mismatch', 'exploration.paretoFrontier');
  const proposalsById = new Set();
  for (const proposal of value.proposals) {
    const candidate = candidateById.get(proposal.candidateId);
    if (!candidate) fail('E_APPROX_REFERENCE', 'Proposal references an unknown candidate', `exploration.proposals.${proposal.proposalId}`);
    const expected = proposalRecord(candidate, parentRef);
    if (canonicalString(expected) !== canonicalString(proposal)) fail('E_APPROX_HASH', 'Proposal content ID or gate mismatch', `exploration.proposals.${proposal.proposalId}`);
    if (proposalsById.has(proposal.proposalId)) fail('E_APPROX_SCHEMA', 'Duplicate proposal ID', `exploration.proposals.${proposal.proposalId}`);
    proposalsById.add(proposal.proposalId);
  }
  if (value.proposals.length > value.config.proposalLimit || value.proposals.some((proposal) => !value.paretoFrontier.includes(proposal.candidateId))) fail('E_APPROX_REFERENCE', 'Proposal set differs from declared frontier or limit', 'exploration.proposals');
  void seedState;
  return cloneAndFreeze(value);
}

function report(fields = {}) {
  return cloneAndFreeze({ ok: false, explorationHash: null, firstMismatch: null, errorCode: 'E_APPROX_SCHEMA', ...fields });
}

export function exploreBranchCandidates(config) {
  return build(config);
}

export function verifyBranchExploration(input) {
  try {
    const value = parseArtifact(input);
    const verified = verifyInternal(value);
    return report({ ok: true, explorationHash: verified.explorationHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return report({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'exploration' : 'exploration',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_APPROX_SCHEMA',
    });
  }
}

export function exportBranchExploration(input) {
  const value = parseArtifact(input);
  const verified = verifyBranchExploration(value);
  if (!verified.ok) fail(verified.errorCode, 'Branch exploration failed verification', verified.firstMismatch ?? 'exploration');
  return canonicalString(value);
}

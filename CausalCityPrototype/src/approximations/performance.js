import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { verifyProjection } from '../projector/index.js';
import {
  assertExactKeys,
  assertNonEmptyString,
  assertPlainDataObject,
  assertSafeInteger,
  contentAddress,
  safeIntegerSum,
} from './common.js';

export const WORK_PROFILE_FORMAT = 'ripple-projection-work-profile';
export const CHUNK_PLAN_FORMAT = 'ripple-trustscape-chunk-plan';
export const PERFORMANCE_SCHEMA_VERSION = '1.0.0';

const HASH = /^[a-f0-9]{64}$/;
const BRANCH_ID = /^branch-[a-f0-9]{64}$/;

function fail(code, message, path = 'performance', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function parseValue(value, code, path) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    fail(code, `${path} is not valid JSON`, path);
  }
}

function ensureProjection(projection) {
  const report = verifyProjection(projection);
  if (!report.ok) fail('E_CHUNK_PLAN', 'Projection failed verification', report.firstMismatch ?? 'projection');
  return typeof projection === 'string' ? JSON.parse(projection) : structuredClone(projection);
}

function countProfile(projection) {
  const branchCount = projection.dimensions.branching.nodes.length;
  const temporalPointCount = projection.dimensions.temporal.points.length;
  const causalNodeCount = projection.dimensions.causal.nodes.length;
  const causalEdgeCount = projection.dimensions.causal.edges.length;
  const branchEdgeCount = projection.dimensions.branching.edges.length;
  const subjectiveRecordCount = projection.dimensions.subjective.records.length;
  const expectedSceneObjectCount = safeIntegerSum(
    [branchCount, temporalPointCount, causalNodeCount, subjectiveRecordCount],
    'workProfile.expectedSceneObjectCount',
  );
  const expectedThreadCount = safeIntegerSum(
    [causalEdgeCount, branchEdgeCount],
    'workProfile.expectedThreadCount',
  );
  // One unit for orchestration, then each primary source or projected scene item.
  const workUnitCount = safeIntegerSum([
    1,
    branchCount,
    temporalPointCount,
    causalNodeCount,
    causalEdgeCount,
    subjectiveRecordCount,
    expectedSceneObjectCount,
    expectedThreadCount,
  ], 'workProfile.workUnitCount');
  return cloneAndFreeze({
    branchCount,
    temporalPointCount,
    causalNodeCount,
    causalEdgeCount,
    branchEdgeCount,
    subjectiveRecordCount,
    expectedSceneObjectCount,
    expectedThreadCount,
    workUnitCount,
  });
}

function makeProfile(projection) {
  const core = cloneAndFreeze({
    format: WORK_PROFILE_FORMAT,
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    canonical: true,
    sourceProjectionId: projection.projectionId,
    sourceProjectionHash: projection.projectionHash,
    ...countProfile(projection),
  });
  return cloneAndFreeze({ ...core, workProfileHash: sha256Hex(core) });
}

function profileCore(value) {
  const { workProfileHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function verifyProfileShape(value) {
  assertPlainDataObject(value, 'workProfile');
  assertExactKeys(value, [
    'format', 'schemaVersion', 'canonical', 'sourceProjectionId', 'sourceProjectionHash',
    'branchCount', 'temporalPointCount', 'causalNodeCount', 'causalEdgeCount',
    'branchEdgeCount', 'subjectiveRecordCount', 'expectedSceneObjectCount',
    'expectedThreadCount', 'workUnitCount', 'workProfileHash',
  ], 'workProfile', 'E_CHUNK_PLAN');
  if (value.format !== WORK_PROFILE_FORMAT || value.schemaVersion !== PERFORMANCE_SCHEMA_VERSION || value.canonical !== true) {
    fail('E_CHUNK_PLAN', 'Unsupported work-profile artifact', 'workProfile.schemaVersion');
  }
  for (const key of [
    'branchCount', 'temporalPointCount', 'causalNodeCount', 'causalEdgeCount',
    'branchEdgeCount', 'subjectiveRecordCount', 'expectedSceneObjectCount',
    'expectedThreadCount', 'workUnitCount',
  ]) {
    const count = assertSafeInteger(value[key], `workProfile.${key}`, 'E_CHUNK_PLAN');
    if (count < 0) fail('E_CHUNK_PLAN', `${key} cannot be negative`, `workProfile.${key}`);
  }
  if (typeof value.workProfileHash !== 'string' || !HASH.test(value.workProfileHash)) fail('E_CHUNK_PLAN', 'Invalid workProfileHash', 'workProfile.workProfileHash');
  const expectedHash = sha256Hex(profileCore(value));
  if (expectedHash !== value.workProfileHash) fail('E_APPROX_HASH', 'Work profile hash mismatch', 'workProfile.workProfileHash', expectedHash, value.workProfileHash);
}

function chunkContent(branchId, points) {
  const first = points[0];
  const last = points.at(-1);
  return cloneAndFreeze({
    branchId,
    startSequence: first.sequence,
    endSequence: last.sequence,
    temporalPointIds: cloneAndFreeze(points.map((point) => point.temporalPointId)),
    receiptHashes: cloneAndFreeze(points.map((point) => point.receiptHash)),
    firstPreviousReceiptHash: first.previousReceiptHash,
    terminalReceiptHash: last.receiptHash,
    pointCount: points.length,
  });
}

function makeChunk(branchId, points) {
  const content = chunkContent(branchId, points);
  return cloneAndFreeze({ ...content, chunkId: contentAddress('trustscape-chunk', content) });
}

function makeChunkPlan(projection, maximum) {
  const chunks = [];
  const branchIds = projection.dimensions.branching.nodes.map((node) => node.branchId).sort();
  for (const branchId of branchIds) {
    const points = projection.dimensions.temporal.points
      .filter((point) => point.branchId === branchId)
      .sort((left, right) => left.sequence - right.sequence || left.temporalPointId.localeCompare(right.temporalPointId));
    for (let index = 0; index < points.length; index += maximum) {
      chunks.push(makeChunk(branchId, points.slice(index, index + maximum)));
    }
  }
  chunks.sort((left, right) => left.branchId.localeCompare(right.branchId) || left.startSequence - right.startSequence);
  const core = cloneAndFreeze({
    format: CHUNK_PLAN_FORMAT,
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    canonical: true,
    sourceProjectionId: projection.projectionId,
    sourceProjectionHash: projection.projectionHash,
    sourceTemporalPointCount: projection.dimensions.temporal.points.length,
    maxTemporalPointsPerChunk: maximum,
    chunks: cloneAndFreeze(chunks),
  });
  return cloneAndFreeze({ ...core, chunkPlanHash: sha256Hex(core) });
}

function chunkPlanCore(value) {
  const { chunkPlanHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function verifyPlanShape(value) {
  assertPlainDataObject(value, 'chunkPlan');
  assertExactKeys(value, [
    'format', 'schemaVersion', 'canonical', 'sourceProjectionId', 'sourceProjectionHash',
    'sourceTemporalPointCount', 'maxTemporalPointsPerChunk', 'chunks', 'chunkPlanHash',
  ], 'chunkPlan', 'E_CHUNK_PLAN');
  if (value.format !== CHUNK_PLAN_FORMAT || value.schemaVersion !== PERFORMANCE_SCHEMA_VERSION || value.canonical !== true) fail('E_CHUNK_PLAN', 'Unsupported chunk-plan artifact', 'chunkPlan.schemaVersion');
  for (const key of ['sourceTemporalPointCount', 'maxTemporalPointsPerChunk']) {
    const count = assertSafeInteger(value[key], `chunkPlan.${key}`, 'E_CHUNK_PLAN');
    if (count < 1) fail('E_CHUNK_PLAN', `${key} must be positive`, `chunkPlan.${key}`);
  }
  if (!Array.isArray(value.chunks) || value.chunks.length === 0) fail('E_CHUNK_PLAN', 'chunks must be a non-empty array', 'chunkPlan.chunks');
  if (typeof value.chunkPlanHash !== 'string' || !HASH.test(value.chunkPlanHash)) fail('E_CHUNK_PLAN', 'Invalid chunkPlanHash', 'chunkPlan.chunkPlanHash');
  const expectedHash = sha256Hex(chunkPlanCore(value));
  if (expectedHash !== value.chunkPlanHash) fail('E_APPROX_HASH', 'Chunk-plan hash mismatch', 'chunkPlan.chunkPlanHash', expectedHash, value.chunkPlanHash);
}

function report(fields = {}) {
  return cloneAndFreeze({ ok: false, artifactHash: null, firstMismatch: null, errorCode: 'E_CHUNK_PLAN', ...fields });
}

export function profileProjectionWork(projectionInput) {
  return makeProfile(ensureProjection(projectionInput));
}

export function verifyProjectionWorkProfile(profileInput, projectionInput = null) {
  try {
    const value = parseValue(profileInput, 'E_CHUNK_PLAN', 'workProfile');
    verifyProfileShape(value);
    if (projectionInput !== null) {
      const expected = makeProfile(ensureProjection(projectionInput));
      if (canonicalString(expected) !== canonicalString(value)) fail('E_APPROX_HASH', 'Work profile does not reproduce from projection', 'workProfile');
    }
    return report({ ok: true, artifactHash: value.workProfileHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return report({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'workProfile' : 'workProfile',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_CHUNK_PLAN',
    });
  }
}

export function planTrustscapeChunks(projectionInput, options) {
  assertExactKeys(options, ['maxTemporalPointsPerChunk'], 'chunkOptions', 'E_CHUNK_PLAN');
  const maximum = assertSafeInteger(options.maxTemporalPointsPerChunk, 'chunkOptions.maxTemporalPointsPerChunk', 'E_CHUNK_PLAN');
  if (maximum < 1) fail('E_CHUNK_PLAN', 'maxTemporalPointsPerChunk must be positive', 'chunkOptions.maxTemporalPointsPerChunk');
  return makeChunkPlan(ensureProjection(projectionInput), maximum);
}

export function verifyTrustscapeChunkPlan(planInput, projectionInput = null) {
  try {
    const value = parseValue(planInput, 'E_CHUNK_PLAN', 'chunkPlan');
    verifyPlanShape(value);
    const chunkIds = new Set();
    for (let index = 0; index < value.chunks.length; index += 1) {
      const chunk = value.chunks[index];
      assertExactKeys(chunk, [
        'branchId', 'startSequence', 'endSequence', 'temporalPointIds', 'receiptHashes',
        'firstPreviousReceiptHash', 'terminalReceiptHash', 'pointCount', 'chunkId',
      ], `chunkPlan.chunks.${index}`, 'E_CHUNK_PLAN');
      if (!BRANCH_ID.test(chunk.branchId)) fail('E_CHUNK_PLAN', 'Invalid chunk branchId', `chunkPlan.chunks.${index}.branchId`);
      for (const key of ['startSequence', 'endSequence', 'pointCount']) {
        const count = assertSafeInteger(chunk[key], `chunkPlan.chunks.${index}.${key}`, 'E_CHUNK_PLAN');
        if (count < 0) fail('E_CHUNK_PLAN', `${key} cannot be negative`, `chunkPlan.chunks.${index}.${key}`);
      }
      if (!Array.isArray(chunk.temporalPointIds) || !Array.isArray(chunk.receiptHashes) || chunk.temporalPointIds.length !== chunk.pointCount || chunk.receiptHashes.length !== chunk.pointCount || chunk.pointCount < 1 || chunk.pointCount > value.maxTemporalPointsPerChunk) fail('E_CHUNK_PLAN', 'Chunk membership lengths are inconsistent', `chunkPlan.chunks.${index}`);
      if (chunk.endSequence - chunk.startSequence + 1 !== chunk.pointCount) fail('E_CHUNK_PLAN', 'Chunk sequence range is not contiguous', `chunkPlan.chunks.${index}`);
      const content = chunkContent(chunk.branchId, chunk.temporalPointIds.map((temporalPointId, pointIndex) => ({
        sequence: chunk.startSequence + pointIndex,
        temporalPointId,
        receiptHash: chunk.receiptHashes[pointIndex],
        previousReceiptHash: pointIndex === 0 ? chunk.firstPreviousReceiptHash : chunk.receiptHashes[pointIndex - 1],
      })));
      const expectedId = contentAddress('trustscape-chunk', content);
      if (expectedId !== chunk.chunkId) fail('E_APPROX_HASH', 'Chunk content ID mismatch', `chunkPlan.chunks.${index}.chunkId`, expectedId, chunk.chunkId);
      if (chunk.terminalReceiptHash !== chunk.receiptHashes.at(-1)) fail('E_APPROX_HASH', 'Chunk terminal receipt mismatch', `chunkPlan.chunks.${index}.terminalReceiptHash`);
      if (chunkIds.has(chunk.chunkId)) fail('E_CHUNK_PLAN', 'Duplicate chunk ID', `chunkPlan.chunks.${index}.chunkId`);
      chunkIds.add(chunk.chunkId);
    }
    if (safeIntegerSum(value.chunks.map((chunk) => chunk.pointCount), 'chunkPlan.coverage') !== value.sourceTemporalPointCount) fail('E_CHUNK_PLAN', 'Chunk coverage differs from sourceTemporalPointCount', 'chunkPlan.chunks');
    if (projectionInput !== null) {
      const projection = ensureProjection(projectionInput);
      const expected = makeChunkPlan(projection, value.maxTemporalPointsPerChunk);
      if (canonicalString(expected) !== canonicalString(value)) fail('E_APPROX_HASH', 'Chunk plan does not reproduce from projection', 'chunkPlan');
    }
    return report({ ok: true, artifactHash: value.chunkPlanHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return report({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'chunkPlan' : 'chunkPlan',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_CHUNK_PLAN',
    });
  }
}

export function exportTrustscapeChunkPlan(planInput) {
  const value = parseValue(planInput, 'E_CHUNK_PLAN', 'chunkPlan');
  const reportValue = verifyTrustscapeChunkPlan(value);
  if (!reportValue.ok) fail(reportValue.errorCode, 'Chunk plan failed verification', reportValue.firstMismatch ?? 'chunkPlan');
  return canonicalString(value);
}

export function assessTrustscapeCapacity(profileInput, budgetInput) {
  const profile = parseValue(profileInput, 'E_CHUNK_PLAN', 'workProfile');
  const profileReport = verifyProjectionWorkProfile(profile);
  if (!profileReport.ok) fail(profileReport.errorCode, 'Work profile failed verification', profileReport.firstMismatch ?? 'workProfile');
  assertExactKeys(budgetInput, ['maxBranches', 'maxTemporalPoints', 'maxCausalNodes', 'maxWorkUnits'], 'capacityBudget', 'E_CHUNK_PLAN');
  const budget = {};
  for (const key of ['maxBranches', 'maxTemporalPoints', 'maxCausalNodes', 'maxWorkUnits']) {
    budget[key] = assertSafeInteger(budgetInput[key], `capacityBudget.${key}`, 'E_CHUNK_PLAN');
    if (budget[key] < 1) fail('E_CHUNK_PLAN', `${key} must be positive`, `capacityBudget.${key}`);
  }
  const exceeded = [];
  if (profile.branchCount > budget.maxBranches) exceeded.push('branches');
  if (profile.causalNodeCount > budget.maxCausalNodes) exceeded.push('causalNodes');
  if (profile.temporalPointCount > budget.maxTemporalPoints) exceeded.push('temporalPoints');
  if (profile.workUnitCount > budget.maxWorkUnits) exceeded.push('workUnits');
  exceeded.sort();
  const core = cloneAndFreeze({
    format: 'ripple-trustscape-capacity-assessment',
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    approximation: true,
    sourceWorkProfileHash: profile.workProfileHash,
    budget: cloneAndFreeze(budget),
    exceeded: cloneAndFreeze(exceeded),
    withinBudget: exceeded.length === 0,
    chunkingRequired: exceeded.length > 0,
  });
  return cloneAndFreeze({ ...core, assessmentHash: sha256Hex(core) });
}

export function createTimingObservation(input) {
  assertExactKeys(input, ['operationId', 'runtimeId', 'elapsedMicroseconds', 'workProfileHash'], 'timingObservation', 'E_CHUNK_PLAN');
  const content = cloneAndFreeze({
    canonical: false,
    operationId: assertNonEmptyString(input.operationId, 'timingObservation.operationId', 'E_CHUNK_PLAN'),
    runtimeId: assertNonEmptyString(input.runtimeId, 'timingObservation.runtimeId', 'E_CHUNK_PLAN'),
    elapsedMicroseconds: assertSafeInteger(input.elapsedMicroseconds, 'timingObservation.elapsedMicroseconds', 'E_CHUNK_PLAN'),
    workProfileHash: assertNonEmptyString(input.workProfileHash, 'timingObservation.workProfileHash', 'E_CHUNK_PLAN'),
  });
  if (content.elapsedMicroseconds < 0 || !HASH.test(content.workProfileHash)) fail('E_CHUNK_PLAN', 'Invalid timing observation', 'timingObservation');
  return cloneAndFreeze({ ...content, observationId: contentAddress('timing-observation', content) });
}

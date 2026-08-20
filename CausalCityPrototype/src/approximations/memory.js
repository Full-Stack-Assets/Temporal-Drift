import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactKeys,
  assertNonEmptyString,
  assertPlainDataObject,
  assertSafeInteger,
  contentAddress,
  safeIntegerDifference,
  safeIntegerProduct,
  safeIntegerSum,
} from './common.js';

export const MEMORY_WINDOWS_FORMAT = 'ripple-memory-windows';
export const MEMORY_WINDOWS_SCHEMA_VERSION = '1.0.0';

const BRANCH_ID = /^branch-[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const MEMORY_KINDS = ['cultural', 'institutional', 'personal'];

function fail(code, message, path = 'memory', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function parseArtifact(value) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    fail('E_MEMORY_WINDOW', 'Memory artifact is not valid JSON', 'memory');
  }
}

function artifactCore(value) {
  const { memoryArtifactHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function canonicalInteger(value, path, options = {}) {
  const integer = assertSafeInteger(value, path, 'E_MEMORY_WINDOW');
  if (options.minimum !== undefined && integer < options.minimum) {
    fail('E_MEMORY_WINDOW', `${path} is below the minimum`, path);
  }
  return integer;
}

function normalizeNullablePerspective(value, path) {
  if (value === null) return null;
  return assertNonEmptyString(value, path, 'E_MEMORY_WINDOW');
}

function rawRecord(record, label = 'record') {
  assertExactKeys(record, [
    'perspectiveId', 'branchId', 'sequence', 'stepId', 'metricPath',
    'objectiveValue', 'perceivedValue', 'scale', 'sourceRef', 'sourceVersion',
    'memoryKind', 'generation', 'inheritedFromPerspectiveId',
  ], label, 'E_MEMORY_WINDOW');
  const normalized = {
    perspectiveId: assertNonEmptyString(record.perspectiveId, `${label}.perspectiveId`, 'E_MEMORY_WINDOW'),
    branchId: assertNonEmptyString(record.branchId, `${label}.branchId`, 'E_MEMORY_WINDOW'),
    sequence: canonicalInteger(record.sequence, `${label}.sequence`, { minimum: 0 }),
    stepId: assertNonEmptyString(record.stepId, `${label}.stepId`, 'E_MEMORY_WINDOW'),
    metricPath: assertNonEmptyString(record.metricPath, `${label}.metricPath`, 'E_MEMORY_WINDOW'),
    objectiveValue: canonicalInteger(record.objectiveValue, `${label}.objectiveValue`),
    perceivedValue: canonicalInteger(record.perceivedValue, `${label}.perceivedValue`),
    scale: canonicalInteger(record.scale, `${label}.scale`, { minimum: 1 }),
    sourceRef: assertNonEmptyString(record.sourceRef, `${label}.sourceRef`, 'E_MEMORY_WINDOW'),
    sourceVersion: assertNonEmptyString(record.sourceVersion, `${label}.sourceVersion`, 'E_MEMORY_WINDOW'),
    memoryKind: assertNonEmptyString(record.memoryKind, `${label}.memoryKind`, 'E_MEMORY_WINDOW'),
    generation: canonicalInteger(record.generation, `${label}.generation`, { minimum: 0 }),
    inheritedFromPerspectiveId: normalizeNullablePerspective(record.inheritedFromPerspectiveId, `${label}.inheritedFromPerspectiveId`),
  };
  if (!BRANCH_ID.test(normalized.branchId)) fail('E_MEMORY_WINDOW', 'Memory record branchId is malformed', `${label}.branchId`);
  if (!MEMORY_KINDS.includes(normalized.memoryKind)) fail('E_MEMORY_WINDOW', 'Unsupported memoryKind', `${label}.memoryKind`);
  if (normalized.generation === 0 && normalized.inheritedFromPerspectiveId !== null) {
    fail('E_MEMORY_WINDOW', 'Generation zero cannot declare inherited memory', `${label}.inheritedFromPerspectiveId`);
  }
  return cloneAndFreeze(normalized);
}

function scoredRecordFromRaw(raw) {
  const tension = safeIntegerDifference(raw.perceivedValue, raw.objectiveValue, `memory.${raw.perspectiveId}.${raw.stepId}.tension`);
  const magnitude = Math.abs(tension);
  const direction = tension > 0 ? 'positive' : tension < 0 ? 'negative' : 'aligned';
  const content = cloneAndFreeze({ ...raw, tension, magnitude, direction });
  return cloneAndFreeze({ ...content, memoryRecordId: contentAddress('memory-record', content) });
}

function scoredRecordToRaw(record) {
  const {
    tension: _tension,
    magnitude: _magnitude,
    direction: _direction,
    memoryRecordId: _memoryRecordId,
    ...raw
  } = record;
  return raw;
}

function normalizeWindows(windowsInput, label = 'config.windows') {
  if (!Array.isArray(windowsInput) || windowsInput.length === 0) fail('E_MEMORY_WINDOW', 'windows must be a non-empty array', label);
  const seen = new Set();
  const windows = windowsInput.map((window, index) => {
    assertExactKeys(window, ['windowId', 'length'], `${label}.${index}`, 'E_MEMORY_WINDOW');
    const windowId = assertNonEmptyString(window.windowId, `${label}.${index}.windowId`, 'E_MEMORY_WINDOW');
    if (seen.has(windowId)) fail('E_MEMORY_WINDOW', `Duplicate window ${windowId}`, `${label}.${index}.windowId`);
    seen.add(windowId);
    const length = canonicalInteger(window.length, `${label}.${index}.length`, { minimum: 1 });
    return cloneAndFreeze({ windowId, length });
  });
  return cloneAndFreeze(windows.sort((left, right) => left.windowId.localeCompare(right.windowId)));
}

function validateInheritance(records) {
  const generationsByPerspective = new Map();
  for (const record of records) {
    const generations = generationsByPerspective.get(record.perspectiveId) ?? [];
    generations.push(record.generation);
    generationsByPerspective.set(record.perspectiveId, generations);
  }
  for (const record of records) {
    if (record.inheritedFromPerspectiveId === null) continue;
    const sourceGenerations = generationsByPerspective.get(record.inheritedFromPerspectiveId);
    if (!sourceGenerations || !sourceGenerations.some((generation) => generation < record.generation)) {
      fail('E_MEMORY_WINDOW', 'Inherited memory lacks an explicit earlier-generation source perspective', `records.${record.memoryRecordId}.inheritedFromPerspectiveId`);
    }
  }
}

function groupKey(record) {
  return canonicalString({
    perspectiveId: record.perspectiveId,
    branchId: record.branchId,
    metricPath: record.metricPath,
  });
}

function groupRecords(records) {
  const groups = new Map();
  for (const record of records) {
    const key = groupKey(record);
    const entry = groups.get(key) ?? {
      perspectiveId: record.perspectiveId,
      branchId: record.branchId,
      metricPath: record.metricPath,
      records: [],
    };
    entry.records.push(record);
    groups.set(key, entry);
  }
  return [...groups.values()].sort((left, right) => groupKey(left).localeCompare(groupKey(right)));
}

function directionCounts(records) {
  return cloneAndFreeze({
    aligned: records.filter((record) => record.direction === 'aligned').length,
    negative: records.filter((record) => record.direction === 'negative').length,
    positive: records.filter((record) => record.direction === 'positive').length,
  });
}

function makeWindowGroup(source, window, currentSequence) {
  const weighted = source.records.flatMap((record) => {
    const age = currentSequence - record.sequence;
    if (age < 0 || age >= window.length) return [];
    const weight = window.length - age;
    return [{ record, weight }];
  });
  const includedRecords = weighted.map((entry) => entry.record);
  const totalWeight = safeIntegerSum(weighted.map((entry) => entry.weight), `memory.group.${source.perspectiveId}.${window.windowId}.totalWeight`);
  const weightedTensionNumerator = safeIntegerSum(weighted.map((entry) => safeIntegerProduct(
    entry.record.tension,
    entry.weight,
    `memory.group.${source.perspectiveId}.${window.windowId}.${entry.record.memoryRecordId}`,
  )), `memory.group.${source.perspectiveId}.${window.windowId}.weightedTensionNumerator`);
  const content = cloneAndFreeze({
    perspectiveId: source.perspectiveId,
    branchId: source.branchId,
    metricPath: source.metricPath,
    windowId: window.windowId,
    windowLength: window.length,
    currentSequence,
    status: includedRecords.length > 0 ? 'modeled-from-explicit-records' : 'not-modeled-in-window',
    recordIds: cloneAndFreeze(includedRecords.map((record) => record.memoryRecordId).sort()),
    recordCount: includedRecords.length,
    totalWeight,
    weightedTensionNumerator,
    directionCounts: directionCounts(includedRecords),
  });
  return cloneAndFreeze({ ...content, memoryWindowGroupId: contentAddress('memory-window-group', content) });
}

function buildGroups(records, windows, currentSequence) {
  const groups = [];
  for (const source of groupRecords(records)) {
    for (const window of windows) groups.push(makeWindowGroup(source, window, currentSequence));
  }
  return cloneAndFreeze(groups.sort((left, right) => left.memoryWindowGroupId.localeCompare(right.memoryWindowGroupId)));
}

function normalizeRecords(recordsInput, currentSequence = null, label = 'config.records') {
  if (!Array.isArray(recordsInput) || recordsInput.length === 0) fail('E_MEMORY_WINDOW', 'records must be a non-empty array', label);
  const records = recordsInput.map((record, index) => {
    const scored = record.memoryRecordId
      ? (() => {
        assertExactKeys(record, [
          'perspectiveId', 'branchId', 'sequence', 'stepId', 'metricPath',
          'objectiveValue', 'perceivedValue', 'scale', 'sourceRef', 'sourceVersion',
          'memoryKind', 'generation', 'inheritedFromPerspectiveId', 'tension',
          'magnitude', 'direction', 'memoryRecordId',
        ], `${label}.${index}`, 'E_MEMORY_WINDOW');
        const expected = scoredRecordFromRaw(rawRecord(scoredRecordToRaw(record), `${label}.${index}`));
        if (canonicalString(expected) !== canonicalString(record)) {
          fail('E_APPROX_HASH', 'Memory record content or arithmetic mismatch', `${label}.${index}`);
        }
        return expected;
      })()
      : scoredRecordFromRaw(rawRecord(record, `${label}.${index}`));
    if (currentSequence !== null && scored.sequence > currentSequence) {
      fail('E_MEMORY_WINDOW', 'Memory record occurs after currentSequence', `${label}.${index}.sequence`);
    }
    return scored;
  });
  const ids = new Set();
  for (const record of records) {
    if (ids.has(record.memoryRecordId)) fail('E_MEMORY_WINDOW', `Duplicate memory record ${record.memoryRecordId}`, label);
    ids.add(record.memoryRecordId);
  }
  validateInheritance(records);
  return cloneAndFreeze(records.sort((left, right) => left.memoryRecordId.localeCompare(right.memoryRecordId)));
}

function build(configInput) {
  assertExactKeys(configInput, ['records', 'windows', 'currentSequence'], 'config', 'E_MEMORY_WINDOW');
  const currentSequence = canonicalInteger(configInput.currentSequence, 'config.currentSequence', { minimum: 0 });
  const windows = normalizeWindows(configInput.windows);
  const records = normalizeRecords(configInput.records, currentSequence);
  const groups = buildGroups(records, windows, currentSequence);
  const core = cloneAndFreeze({
    format: MEMORY_WINDOWS_FORMAT,
    schemaVersion: MEMORY_WINDOWS_SCHEMA_VERSION,
    approximation: true,
    currentSequence,
    windows,
    records,
    groups,
  });
  return cloneAndFreeze({ ...core, memoryArtifactHash: sha256Hex(core) });
}

function verifyInternal(value) {
  assertPlainDataObject(value, 'memory');
  assertExactKeys(value, [
    'format', 'schemaVersion', 'approximation', 'currentSequence',
    'windows', 'records', 'groups', 'memoryArtifactHash',
  ], 'memory', 'E_MEMORY_WINDOW');
  if (value.format !== MEMORY_WINDOWS_FORMAT || value.schemaVersion !== MEMORY_WINDOWS_SCHEMA_VERSION || value.approximation !== true) {
    fail('E_MEMORY_WINDOW', 'Unsupported memory-windows artifact', 'memory.schemaVersion');
  }
  if (typeof value.memoryArtifactHash !== 'string' || !HASH.test(value.memoryArtifactHash)) fail('E_MEMORY_WINDOW', 'Invalid memory artifact hash', 'memory.memoryArtifactHash');
  const expectedHash = sha256Hex(artifactCore(value));
  if (expectedHash !== value.memoryArtifactHash) fail('E_APPROX_HASH', 'Memory artifact hash mismatch', 'memory.memoryArtifactHash', expectedHash, value.memoryArtifactHash);
  const currentSequence = canonicalInteger(value.currentSequence, 'memory.currentSequence', { minimum: 0 });
  const windows = normalizeWindows(value.windows, 'memory.windows');
  const records = normalizeRecords(value.records, currentSequence, 'memory.records');
  const expectedGroups = buildGroups(records, windows, currentSequence);
  if (canonicalString(expectedGroups) !== canonicalString(value.groups)) {
    fail('E_APPROX_HASH', 'Memory-window groups do not reproduce from records and windows', 'memory.groups');
  }
  return cloneAndFreeze(value);
}

function report(fields = {}) {
  return cloneAndFreeze({ ok: false, memoryArtifactHash: null, firstMismatch: null, errorCode: 'E_MEMORY_WINDOW', ...fields });
}

export function scoreNarrativeTension(record) {
  return scoredRecordFromRaw(rawRecord(record));
}

export function buildMemoryWindows(config) {
  return build(config);
}

export function verifyMemoryWindows(input) {
  try {
    const value = parseArtifact(input);
    const verified = verifyInternal(value);
    return report({ ok: true, memoryArtifactHash: verified.memoryArtifactHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return report({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'memory' : 'memory',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_MEMORY_WINDOW',
    });
  }
}

export function exportMemoryWindows(input) {
  const value = parseArtifact(input);
  const verified = verifyMemoryWindows(value);
  if (!verified.ok) fail(verified.errorCode, 'Memory-window artifact failed verification', verified.firstMismatch ?? 'memory');
  return canonicalString(value);
}

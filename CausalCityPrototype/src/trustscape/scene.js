import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { parseProjection, verifyProjection } from '../projector/projection.js';

export const TRUSTSCAPE_FORMAT = 'ripple-trustscape-scene';
export const TRUSTSCAPE_SCHEMA_VERSION = '1.0.0';
export const TRUSTSCAPE_VERSION = 'trustscape-lite-v1';

function fail(code, message, path = 'scene', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function exactObject(value, keys, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, `${label} must be an object`, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code, `${label} must be a plain object`, label);
  if (Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) fail(code, `${label} contains hidden fields`, label);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) fail(code, `${label} contains missing or unknown fields`, label);
}

function sceneCore(scene) {
  const { sceneHash: _sceneHash, ...core } = scene;
  return cloneAndFreeze(core);
}

function parseSceneValue(scene) {
  if (typeof scene !== 'string') return structuredClone(scene);
  try {
    return JSON.parse(scene);
  } catch {
    fail('E_TRUSTSCAPE_SCHEMA', 'Scene is not valid JSON', 'scene');
  }
}

function normalizeView(projection, viewInput = {}) {
  if (viewInput === undefined) viewInput = {};
  if (!viewInput || typeof viewInput !== 'object' || Array.isArray(viewInput)) fail('E_TRUSTSCAPE_VIEW', 'View must be an object', 'view');
  const allowed = new Set(['startSequence', 'endSequence', 'activeBranchIds', 'compareBranchIds']);
  if (Object.keys(viewInput).some((key) => !allowed.has(key))) fail('E_TRUSTSCAPE_VIEW', 'View contains unknown fields', 'view');
  const branchIds = projection.dimensions.branching.nodes.map((node) => node.branchId).sort();
  const known = new Set(branchIds);
  const maximum = Math.max(...projection.dimensions.temporal.points.map((point) => point.sequence));
  const startSequence = viewInput.startSequence ?? 0;
  const endSequence = viewInput.endSequence ?? maximum;
  if (!Number.isSafeInteger(startSequence) || !Number.isSafeInteger(endSequence) || startSequence < 0 || endSequence < startSequence) {
    fail('E_TRUSTSCAPE_VIEW', 'Invalid sequence range', 'view.startSequence');
  }
  const activeBranchIds = [...(viewInput.activeBranchIds ?? branchIds)];
  if (!Array.isArray(activeBranchIds) || activeBranchIds.length === 0 || activeBranchIds.some((branchId) => typeof branchId !== 'string' || !known.has(branchId))) {
    fail('E_TRUSTSCAPE_VIEW', 'Active branches must be known projection branches', 'view.activeBranchIds');
  }
  const active = [...new Set(activeBranchIds)].sort();
  if (active.length !== activeBranchIds.length) fail('E_TRUSTSCAPE_VIEW', 'Active branches cannot contain duplicates', 'view.activeBranchIds');
  const compareBranchIds = [...(viewInput.compareBranchIds ?? [])];
  if (!Array.isArray(compareBranchIds) || ![0, 2].includes(compareBranchIds.length)) fail('E_TRUSTSCAPE_VIEW', 'Comparison requires exactly zero or two branches', 'view.compareBranchIds');
  if (compareBranchIds.some((branchId) => !active.includes(branchId)) || new Set(compareBranchIds).size !== compareBranchIds.length) {
    fail('E_TRUSTSCAPE_VIEW', 'Comparison branches must be distinct active branches', 'view.compareBranchIds');
  }
  return cloneAndFreeze({ startSequence, endSequence, activeBranchIds: active, compareBranchIds: compareBranchIds.sort() });
}

function objectId(kind, sourceId) {
  return `object-${sha256Hex({ kind, sourceId })}`;
}

function thread(content) {
  const frozen = cloneAndFreeze(content);
  return cloneAndFreeze({ ...frozen, threadId: `thread-${sha256Hex(frozen)}` });
}

function comparison(content) {
  const frozen = cloneAndFreeze(content);
  return cloneAndFreeze({ ...frozen, comparisonId: `comparison-${sha256Hex(frozen)}` });
}

function radarEntry(content) {
  const frozen = cloneAndFreeze(content);
  return cloneAndFreeze({ ...frozen, radarId: `radar-${sha256Hex(frozen)}` });
}

function buildScene(projection, view) {
  const active = new Set(view.activeBranchIds);
  const inRange = (entry) => entry.sequence >= view.startSequence && entry.sequence <= view.endSequence;
  const objects = [];
  const objectBySource = new Map();

  for (const branch of projection.dimensions.branching.nodes) {
    if (!active.has(branch.branchId)) continue;
    const entry = cloneAndFreeze({
      objectId: objectId('branch', branch.nodeId), kind: 'branch', sourceId: branch.nodeId,
      branchId: branch.branchId, stepId: null, sequence: 0,
      position: { x: branch.coordinates.t, y: branch.coordinates.b, z: branch.coordinates.c },
      intensity: Math.abs(branch.coordinates.s),
    });
    objects.push(entry);
    objectBySource.set(branch.nodeId, entry.objectId);
  }
  for (const point of projection.dimensions.temporal.points) {
    if (!active.has(point.branchId) || !inRange(point)) continue;
    const entry = cloneAndFreeze({
      objectId: objectId('snapstate', point.temporalPointId), kind: 'snapstate', sourceId: point.temporalPointId,
      branchId: point.branchId, stepId: point.stepId, sequence: point.sequence,
      stateHash: point.stateHash,
      position: { x: point.coordinates.t, y: point.coordinates.b, z: point.coordinates.c },
      intensity: Math.abs(point.coordinates.s),
    });
    objects.push(entry);
    objectBySource.set(point.temporalPointId, entry.objectId);
  }
  for (const causalNode of projection.dimensions.causal.nodes) {
    if (!active.has(causalNode.branchId) || !inRange(causalNode)) continue;
    const entry = cloneAndFreeze({
      objectId: objectId(causalNode.kind, causalNode.nodeId), kind: causalNode.kind, sourceId: causalNode.nodeId,
      branchId: causalNode.branchId, stepId: causalNode.stepId, sequence: causalNode.sequence,
      position: { x: causalNode.coordinates.t, y: causalNode.coordinates.b, z: causalNode.coordinates.c },
      intensity: Math.abs(causalNode.coordinates.s),
    });
    objects.push(entry);
    objectBySource.set(causalNode.nodeId, entry.objectId);
  }
  for (const subjective of projection.dimensions.subjective.records) {
    if (!active.has(subjective.branchId)) continue;
    const point = projection.dimensions.temporal.points.find((entry) => entry.branchId === subjective.branchId && entry.stepId === subjective.stepId);
    if (!point || !inRange(point)) continue;
    const entry = cloneAndFreeze({
      objectId: objectId('subjective', subjective.subjectiveRecordId), kind: 'subjective', sourceId: subjective.subjectiveRecordId,
      branchId: subjective.branchId, stepId: subjective.stepId, sequence: point.sequence,
      position: { x: point.coordinates.t, y: point.coordinates.b, z: point.coordinates.c + 500 },
      intensity: Math.abs(subjective.tension),
    });
    objects.push(entry);
    objectBySource.set(subjective.subjectiveRecordId, entry.objectId);
  }

  const threads = [];
  for (const sourceEdge of [...projection.dimensions.causal.edges, ...projection.dimensions.branching.edges]) {
    const fromObjectId = objectBySource.get(sourceEdge.fromNodeId);
    const toObjectId = objectBySource.get(sourceEdge.toNodeId);
    if (fromObjectId && toObjectId) threads.push(thread({ kind: sourceEdge.kind, sourceEdgeId: sourceEdge.edgeId, fromObjectId, toObjectId }));
  }

  const comparisons = [];
  if (view.compareBranchIds.length === 2) {
    const [leftBranchId, rightBranchId] = view.compareBranchIds;
    const left = new Map(projection.dimensions.temporal.points.filter((point) => point.branchId === leftBranchId && inRange(point)).map((point) => [point.stepId, point]));
    const right = new Map(projection.dimensions.temporal.points.filter((point) => point.branchId === rightBranchId && inRange(point)).map((point) => [point.stepId, point]));
    for (const stepId of [...left.keys()].filter((step) => right.has(step)).sort()) {
      const leftPoint = left.get(stepId);
      const rightPoint = right.get(stepId);
      comparisons.push(comparison({
        leftBranchId, rightBranchId, stepId,
        leftObjectId: objectBySource.get(leftPoint.temporalPointId),
        rightObjectId: objectBySource.get(rightPoint.temporalPointId),
        leftStateHash: leftPoint.stateHash,
        rightStateHash: rightPoint.stateHash,
        stateHashesEqual: leftPoint.stateHash === rightPoint.stateHash,
      }));
    }
  }

  const radar = projection.dimensions.subjective.records.flatMap((subjective) => {
    if (!active.has(subjective.branchId)) return [];
    const point = projection.dimensions.temporal.points.find((entry) => entry.branchId === subjective.branchId && entry.stepId === subjective.stepId);
    if (!point || !inRange(point)) return [];
    return [radarEntry({
      branchId: subjective.branchId,
      stepId: subjective.stepId,
      metricPath: subjective.metricPath,
      tension: subjective.tension,
      magnitude: Math.abs(subjective.tension),
      sourceRef: subjective.sourceRef,
      sourceVersion: subjective.sourceVersion,
      targetObjectId: objectBySource.get(point.temporalPointId),
      subjectiveObjectId: objectBySource.get(subjective.subjectiveRecordId),
    })];
  });

  const core = cloneAndFreeze({
    format: TRUSTSCAPE_FORMAT,
    schemaVersion: TRUSTSCAPE_SCHEMA_VERSION,
    sceneVersion: TRUSTSCAPE_VERSION,
    sourceProjectionId: projection.projectionId,
    sourceProjectionHash: projection.projectionHash,
    view,
    objects: objects.sort((left, right) => left.objectId.localeCompare(right.objectId)),
    threads: threads.sort((left, right) => left.threadId.localeCompare(right.threadId)),
    comparisons: comparisons.sort((left, right) => left.comparisonId.localeCompare(right.comparisonId)),
    radar: radar.sort((left, right) => left.radarId.localeCompare(right.radarId)),
  });
  return cloneAndFreeze({ ...core, sceneHash: sha256Hex(core) });
}

function validateScene(value) {
  exactObject(value, [
    'format', 'schemaVersion', 'sceneVersion', 'sourceProjectionId', 'sourceProjectionHash',
    'view', 'objects', 'threads', 'comparisons', 'radar', 'sceneHash',
  ], 'E_TRUSTSCAPE_SCHEMA', 'scene');
  if (value.format !== TRUSTSCAPE_FORMAT || value.schemaVersion !== TRUSTSCAPE_SCHEMA_VERSION || value.sceneVersion !== TRUSTSCAPE_VERSION) fail('E_TRUSTSCAPE_SCHEMA', 'Unsupported Trustscape scene version', 'scene.schemaVersion');
  if (!/^projection-[a-f0-9]{64}$/.test(value.sourceProjectionId) || !/^[a-f0-9]{64}$/.test(value.sourceProjectionHash) || !/^[a-f0-9]{64}$/.test(value.sceneHash)) fail('E_TRUSTSCAPE_SCHEMA', 'Invalid scene commitment', 'scene');
  if (!Array.isArray(value.objects) || !Array.isArray(value.threads) || !Array.isArray(value.comparisons) || !Array.isArray(value.radar)) fail('E_TRUSTSCAPE_SCHEMA', 'Scene collections must be arrays', 'scene');
  const objectIds = new Set();
  for (const object of value.objects) {
    if (typeof object.objectId !== 'string' || objectIds.has(object.objectId)) fail('E_TRUSTSCAPE_SCHEMA', 'Invalid or duplicate scene object', 'scene.objects');
    for (const coordinate of Object.values(object.position ?? {})) if (!Number.isSafeInteger(coordinate)) fail('E_TRUSTSCAPE_SCHEMA', 'Scene position must use safe integers', `scene.objects.${object.objectId}.position`);
    if (!Number.isSafeInteger(object.intensity) || object.intensity < 0) fail('E_TRUSTSCAPE_SCHEMA', 'Scene intensity must be a non-negative safe integer', `scene.objects.${object.objectId}.intensity`);
    objectIds.add(object.objectId);
  }
  for (const entry of value.threads) if (!objectIds.has(entry.fromObjectId) || !objectIds.has(entry.toObjectId)) fail('E_TRUSTSCAPE_REFERENCE', 'Scene thread references an unknown object', `scene.threads.${entry.threadId}`);
  for (const entry of value.comparisons) if (!objectIds.has(entry.leftObjectId) || !objectIds.has(entry.rightObjectId)) fail('E_TRUSTSCAPE_REFERENCE', 'Comparison references an unknown object', `scene.comparisons.${entry.comparisonId}`);
  for (const entry of value.radar) if (!objectIds.has(entry.targetObjectId) || !objectIds.has(entry.subjectiveObjectId)) fail('E_TRUSTSCAPE_REFERENCE', 'Radar entry references an unknown object', `scene.radar.${entry.radarId}`);
  const expected = sha256Hex(sceneCore(value));
  if (expected !== value.sceneHash) fail('E_TRUSTSCAPE_HASH', 'Scene hash mismatch', 'scene.sceneHash', expected, value.sceneHash);
  return cloneAndFreeze(value);
}

function verificationReport(fields = {}) {
  return cloneAndFreeze({ ok: false, sceneHash: null, firstMismatch: null, errorCode: 'E_TRUSTSCAPE_SCHEMA', ...fields });
}

export function createTrustscapeScene(projectionInput, viewInput = {}) {
  const projection = parseProjection(typeof projectionInput === 'string' ? projectionInput : canonicalString(projectionInput));
  const projectionReport = verifyProjection(projection);
  if (!projectionReport.ok) fail('E_TRUSTSCAPE_SOURCE', 'Projection failed verification', projectionReport.firstMismatch ?? 'projection');
  return buildScene(projection, normalizeView(projection, viewInput));
}

export function exportTrustscapeScene(scene) {
  return canonicalString(validateScene(parseSceneValue(scene)));
}

export function verifyTrustscapeScene(sceneInput, projectionInput = null) {
  try {
    const scene = validateScene(parseSceneValue(sceneInput));
    if (projectionInput !== null) {
      const projection = parseProjection(typeof projectionInput === 'string' ? projectionInput : canonicalString(projectionInput));
      if (scene.sourceProjectionId !== projection.projectionId || scene.sourceProjectionHash !== projection.projectionHash) fail('E_TRUSTSCAPE_SOURCE', 'Scene source does not match projection', 'scene.sourceProjectionHash');
      const reproduced = createTrustscapeScene(projection, scene.view);
      if (canonicalString(reproduced) !== canonicalString(scene)) fail('E_TRUSTSCAPE_SOURCE', 'Scene does not reproduce from projection and view', 'scene');
    }
    return verificationReport({ ok: true, sceneHash: scene.sceneHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return verificationReport({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'scene' : 'scene',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_TRUSTSCAPE_SCHEMA',
    });
  }
}

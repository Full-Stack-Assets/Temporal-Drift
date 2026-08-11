import { canonicalString, sha256BytesHex, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { exportRunGraph } from '../kernel/run-graph.js';

export const PROJECTION_FORMAT = 'ripple-4d-projection';
export const PROJECTION_SCHEMA_VERSION = '1.0.0';
export const PROJECTION_VERSION = '4d-projector-v1';
export const COORDINATE_SCALE = 1000;

const HASH = /^[a-f0-9]{64}$/;
const GRAPH_ID = /^graph-[a-f0-9]{64}$/;
const BRANCH_ID = /^branch-[a-f0-9]{64}$/;
const PROJECTION_ID = /^projection-[a-f0-9]{64}$/;
const SUBJECTIVE_ID = /^subjective-[a-f0-9]{64}$/;

function fail(code, message, path = 'projection', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function assertPlainObject(value, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, `${label} must be an object`, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code, `${label} must be a plain object`, label);
  if (Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) {
    fail(code, `${label} contains hidden or symbol fields`, label);
  }
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail(code, `${label} contains an accessor`, `${label}.${key}`);
    }
  }
}

function exactObject(value, keys, code, label) {
  assertPlainObject(value, code, label);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    fail(code, `${label} contains missing or unknown fields`, label);
  }
}

function requireString(value, code, label) {
  if (typeof value !== 'string' || value.length === 0) fail(code, `${label} must be a non-empty string`, label);
  return cloneAndFreeze(value);
}

function requireInteger(value, code, label) {
  if (!Number.isSafeInteger(value)) fail(code, `${label} must be a safe integer`, label);
  return value;
}

function safeAdd(left, right, code, label) {
  const value = left + right;
  if (!Number.isSafeInteger(value)) fail(code, `${label} exceeds the safe-integer range`, label);
  return value;
}

function graphExportHash(exported) {
  return sha256BytesHex(Buffer.from(exported, 'utf8'));
}

function projectionCore(value) {
  const { projectionHash: _projectionHash, ...core } = value;
  return cloneAndFreeze(core);
}

function parseJson(value, code, label) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    fail(code, `${label} is not valid JSON`, label);
  }
}

function branchLayout(graph) {
  const branchIds = Object.keys(graph.branches).sort();
  const globalOrdinal = new Map(branchIds.map((branchId, index) => [branchId, index]));
  const depthMemo = new Map();
  const visiting = new Set();
  function depth(branchId) {
    if (depthMemo.has(branchId)) return depthMemo.get(branchId);
    if (visiting.has(branchId)) fail('E_PROJECTION_SOURCE', 'RunGraph contains a cycle', `branches.${branchId}`);
    visiting.add(branchId);
    const descriptor = graph.branches[branchId];
    if (!descriptor) fail('E_PROJECTION_SOURCE', `Unknown graph branch ${branchId}`, `branches.${branchId}`);
    const value = descriptor.parentBranchId === null ? 0 : depth(descriptor.parentBranchId) + 1;
    visiting.delete(branchId);
    depthMemo.set(branchId, value);
    return value;
  }
  return new Map(branchIds.map((branchId) => {
    const branchDepth = depth(branchId);
    const branchCoordinate = safeAdd(branchDepth * 1_000_000, globalOrdinal.get(branchId) * 10_000, 'E_PROJECTION_SCHEMA', 'branch coordinate');
    return [branchId, cloneAndFreeze({ depth: branchDepth, ordinal: globalOrdinal.get(branchId), b: branchCoordinate })];
  }));
}

function normalizeSubjectiveRecords(recordsInput, graph, runValues) {
  if (!Array.isArray(recordsInput)) fail('E_PROJECTION_SCHEMA', 'subjectiveRecords must be an array', 'options.subjectiveRecords');
  const branchIds = new Set(Object.keys(graph.branches));
  const stepIds = new Map(Object.entries(runValues).map(([branchId, run]) => [branchId, new Set(run.snapstates.map((entry) => entry.stepId))]));
  const seen = new Set();
  const records = recordsInput.map((record, index) => {
    exactObject(record, [
      'perspectiveId', 'branchId', 'stepId', 'metricPath', 'objectiveValue',
      'perceivedValue', 'scale', 'sourceRef', 'sourceVersion',
    ], 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}`);
    const normalized = {
      perspectiveId: requireString(record.perspectiveId, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.perspectiveId`),
      branchId: requireString(record.branchId, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.branchId`),
      stepId: requireString(record.stepId, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.stepId`),
      metricPath: requireString(record.metricPath, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.metricPath`),
      objectiveValue: requireInteger(record.objectiveValue, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.objectiveValue`),
      perceivedValue: requireInteger(record.perceivedValue, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.perceivedValue`),
      scale: requireInteger(record.scale, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.scale`),
      sourceRef: requireString(record.sourceRef, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.sourceRef`),
      sourceVersion: requireString(record.sourceVersion, 'E_PROJECTION_SCHEMA', `options.subjectiveRecords.${index}.sourceVersion`),
    };
    if (normalized.scale < 1) fail('E_PROJECTION_SCHEMA', 'subjective scale must be positive', `options.subjectiveRecords.${index}.scale`);
    if (!branchIds.has(normalized.branchId)) fail('E_PROJECTION_REFERENCE', 'subjective record references an unknown branch', `options.subjectiveRecords.${index}.branchId`);
    if (!stepIds.get(normalized.branchId).has(normalized.stepId)) fail('E_PROJECTION_REFERENCE', 'subjective record references an unknown step', `options.subjectiveRecords.${index}.stepId`);
    const tension = normalized.perceivedValue - normalized.objectiveValue;
    if (!Number.isSafeInteger(tension)) fail('E_PROJECTION_SCHEMA', 'subjective tension exceeds the safe-integer range', `options.subjectiveRecords.${index}`);
    const content = cloneAndFreeze({ schemaVersion: '1.0.0', ...normalized, tension });
    const result = cloneAndFreeze({ ...content, subjectiveRecordId: `subjective-${sha256Hex(content)}` });
    if (seen.has(result.subjectiveRecordId)) fail('E_PROJECTION_SCHEMA', `Duplicate subjective record ${result.subjectiveRecordId}`, `options.subjectiveRecords.${index}`);
    seen.add(result.subjectiveRecordId);
    return result;
  });
  return cloneAndFreeze(records.sort((left, right) => left.subjectiveRecordId.localeCompare(right.subjectiveRecordId)));
}

function tensionByStep(records) {
  const values = new Map();
  for (const record of records) {
    const key = `${record.branchId}\u0000${record.stepId}`;
    values.set(key, safeAdd(values.get(key) ?? 0, record.tension, 'E_PROJECTION_SCHEMA', `subjective tension ${key}`));
  }
  return values;
}

function makeTemporalPoint(branchId, run, receipt, snapstate, layout, subjectiveTension) {
  if (receipt.sequence !== snapstate.sequence || receipt.stepId !== snapstate.stepId) {
    fail('E_PROJECTION_SOURCE', 'Receipt and Snapstate identity differ', `runExports.${branchId}.sequence.${receipt.sequence}`);
  }
  if (receipt.branchId !== branchId || snapstate.branchId !== branchId) {
    fail('E_PROJECTION_SOURCE', 'Receipt or Snapstate branch differs from graph identity', `runExports.${branchId}.sequence.${receipt.sequence}`);
  }
  if (receipt.resultingStateHash !== snapstate.stateHash) {
    fail('E_PROJECTION_SOURCE', 'Receipt and Snapstate state commitments differ', `runExports.${branchId}.sequence.${receipt.sequence}`);
  }
  const content = cloneAndFreeze({
    branchId,
    runId: run.manifest.runId,
    stepId: receipt.stepId,
    sequence: receipt.sequence,
    receiptHash: receipt.receiptHash,
    previousReceiptHash: receipt.previousReceiptHash,
    stateHash: snapstate.stateHash,
    prngStateHash: receipt.resultingPrngStateHash,
    coordinates: {
      t: receipt.sequence * COORDINATE_SCALE,
      c: receipt.sequence * COORDINATE_SCALE,
      b: layout.b,
      s: subjectiveTension,
    },
  });
  return cloneAndFreeze({ ...content, temporalPointId: `temporal-${sha256Hex(content)}` });
}

function node(content, prefix) {
  const frozen = cloneAndFreeze(content);
  return cloneAndFreeze({ ...frozen, nodeId: `${prefix}-${sha256Hex(frozen)}` });
}

function edge(content) {
  const frozen = cloneAndFreeze(content);
  return cloneAndFreeze({ ...frozen, edgeId: `edge-${sha256Hex(frozen)}` });
}

function buildProjection(graph, graphExport, subjectiveRecords) {
  const graphValue = JSON.parse(graphExport);
  const branchIds = Object.keys(graphValue.branches).sort();
  const runValues = Object.fromEntries(branchIds.map((branchId) => [branchId, JSON.parse(graphValue.runExports[branchId])]));
  const layoutByBranch = branchLayout(graphValue);
  const records = normalizeSubjectiveRecords(subjectiveRecords, graphValue, runValues);
  const tension = tensionByStep(records);

  const temporalPoints = [];
  const causalNodes = [];
  const causalEdges = [];
  const receiptNodeByHash = new Map();

  for (const branchId of branchIds) {
    const run = runValues[branchId];
    const layout = layoutByBranch.get(branchId);
    for (let sequence = 0; sequence < run.receipts.length; sequence += 1) {
      const receipt = run.receipts[sequence];
      const snapstate = run.snapstates[sequence];
      const point = makeTemporalPoint(branchId, run, receipt, snapstate, layout, tension.get(`${branchId}\u0000${receipt.stepId}`) ?? 0);
      temporalPoints.push(point);
      const receiptNode = node({
        kind: 'receipt', branchId, stepId: receipt.stepId, sequence,
        receiptHash: receipt.receiptHash, eventHash: null, eventIndex: null,
        coordinates: point.coordinates,
      }, 'receipt-node');
      causalNodes.push(receiptNode);
      receiptNodeByHash.set(receipt.receiptHash, receiptNode.nodeId);
      if (sequence > 0) {
        const previous = run.receipts[sequence - 1];
        causalEdges.push(edge({
          kind: 'precedes', branchId,
          fromNodeId: receiptNodeByHash.get(previous.receiptHash),
          toNodeId: receiptNode.nodeId,
        }));
      }
      const events = run.eventBatches[sequence];
      for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
        const eventValue = events[eventIndex];
        const eventHash = sha256Hex(eventValue);
        const eventNode = node({
          kind: 'event', branchId, stepId: receipt.stepId, sequence,
          receiptHash: receipt.receiptHash, eventHash, eventIndex,
          coordinates: {
            t: point.coordinates.t,
            c: safeAdd(point.coordinates.c, (eventIndex + 1) * 100, 'E_PROJECTION_SCHEMA', 'event causal coordinate'),
            b: point.coordinates.b,
            s: point.coordinates.s,
          },
        }, 'event-node');
        causalNodes.push(eventNode);
        causalEdges.push(edge({ kind: 'emits', branchId, fromNodeId: receiptNode.nodeId, toNodeId: eventNode.nodeId }));
      }
    }
  }

  const branchingNodes = branchIds.map((branchId) => {
    const descriptor = graphValue.branches[branchId];
    const layout = layoutByBranch.get(branchId);
    const content = cloneAndFreeze({
      branchId,
      label: descriptor.label,
      parentBranchId: descriptor.parentBranchId,
      forkStepId: descriptor.forkStepId,
      parentReceiptHash: descriptor.parentReceiptHash,
      depth: layout.depth,
      ordinal: layout.ordinal,
      terminalReceiptHash: descriptor.terminalReceiptHash,
      manifestCoreHash: descriptor.manifestCoreHash,
      coordinates: { t: 0, c: 0, b: layout.b, s: 0 },
    });
    return cloneAndFreeze({ ...content, nodeId: `branch-node-${sha256Hex({ graphId: graphValue.graphId, branchId })}` });
  });
  const branchNodeById = new Map(branchingNodes.map((entry) => [entry.branchId, entry.nodeId]));
  const branchingEdges = [];
  for (const branchNode of branchingNodes) {
    if (branchNode.parentBranchId === null) continue;
    branchingEdges.push(edge({
      kind: 'parent',
      branchId: branchNode.branchId,
      fromNodeId: branchNodeById.get(branchNode.parentBranchId),
      toNodeId: branchNode.nodeId,
      forkStepId: branchNode.forkStepId,
      parentReceiptHash: branchNode.parentReceiptHash,
    }));
    const childRun = runValues[branchNode.branchId];
    const childGenesis = childRun.receipts[0];
    const parentReceiptNodeId = receiptNodeByHash.get(branchNode.parentReceiptHash);
    const childGenesisNodeId = receiptNodeByHash.get(childGenesis.receiptHash);
    if (!parentReceiptNodeId || !childGenesisNodeId) fail('E_PROJECTION_REFERENCE', 'Fork edge cannot resolve receipt nodes', `branches.${branchNode.branchId}`);
    causalEdges.push(edge({ kind: 'forks', branchId: branchNode.branchId, fromNodeId: parentReceiptNodeId, toNodeId: childGenesisNodeId }));
  }

  const statusByBranch = branchIds.map((branchId) => cloneAndFreeze({
    branchId,
    status: records.some((record) => record.branchId === branchId) ? 'modeled-from-explicit-records' : 'not-modeled',
    recordCount: records.filter((record) => record.branchId === branchId).length,
  }));

  const source = cloneAndFreeze({
    graphId: graphValue.graphId,
    graphHash: graphValue.graphHash,
    rootBranchId: graphValue.rootBranchId,
    branchCount: branchIds.length,
    runGraphExportHash: graphExportHash(graphExport),
  });
  const dimensions = cloneAndFreeze({
    temporal: { points: temporalPoints.sort((left, right) => left.branchId.localeCompare(right.branchId) || left.sequence - right.sequence) },
    causal: {
      nodes: causalNodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
      edges: causalEdges.sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
    },
    branching: {
      nodes: branchingNodes.sort((left, right) => left.branchId.localeCompare(right.branchId)),
      edges: branchingEdges.sort((left, right) => left.edgeId.localeCompare(right.edgeId)),
    },
    subjective: { statusByBranch, records },
  });
  const projectionId = `projection-${sha256Hex({
    projectionVersion: PROJECTION_VERSION,
    source,
    subjectiveRecordIds: records.map((record) => record.subjectiveRecordId),
  })}`;
  const core = cloneAndFreeze({
    format: PROJECTION_FORMAT,
    schemaVersion: PROJECTION_SCHEMA_VERSION,
    projectionVersion: PROJECTION_VERSION,
    coordinateScale: COORDINATE_SCALE,
    projectionId,
    source,
    dimensions,
  });
  return cloneAndFreeze({ ...core, projectionHash: sha256Hex(core) });
}

function validateCoordinate(value, label) {
  exactObject(value, ['t', 'c', 'b', 's'], 'E_PROJECTION_SCHEMA', label);
  for (const key of ['t', 'c', 'b', 's']) requireInteger(value[key], 'E_PROJECTION_SCHEMA', `${label}.${key}`);
}

function validateProjectionValue(value) {
  exactObject(value, [
    'format', 'schemaVersion', 'projectionVersion', 'coordinateScale', 'projectionId',
    'source', 'dimensions', 'projectionHash',
  ], 'E_PROJECTION_SCHEMA', 'projection');
  if (value.format !== PROJECTION_FORMAT || value.schemaVersion !== PROJECTION_SCHEMA_VERSION || value.projectionVersion !== PROJECTION_VERSION) {
    fail('E_PROJECTION_SCHEMA', 'Unsupported projection format or version', 'projection.schemaVersion');
  }
  if (value.coordinateScale !== COORDINATE_SCALE) fail('E_PROJECTION_SCHEMA', 'Unsupported coordinate scale', 'projection.coordinateScale');
  if (!PROJECTION_ID.test(value.projectionId)) fail('E_PROJECTION_SCHEMA', 'Invalid projectionId', 'projection.projectionId');
  if (!HASH.test(value.projectionHash)) fail('E_PROJECTION_SCHEMA', 'Invalid projectionHash', 'projection.projectionHash');
  exactObject(value.source, ['graphId', 'graphHash', 'rootBranchId', 'branchCount', 'runGraphExportHash'], 'E_PROJECTION_SCHEMA', 'projection.source');
  if (!GRAPH_ID.test(value.source.graphId) || !BRANCH_ID.test(value.source.rootBranchId)) fail('E_PROJECTION_SCHEMA', 'Invalid source identity', 'projection.source');
  for (const key of ['graphHash', 'runGraphExportHash']) if (!HASH.test(value.source[key])) fail('E_PROJECTION_SCHEMA', `Invalid source ${key}`, `projection.source.${key}`);
  if (!Number.isSafeInteger(value.source.branchCount) || value.source.branchCount < 1) fail('E_PROJECTION_SCHEMA', 'Invalid branch count', 'projection.source.branchCount');
  exactObject(value.dimensions, ['temporal', 'causal', 'branching', 'subjective'], 'E_PROJECTION_SCHEMA', 'projection.dimensions');
  if (!Array.isArray(value.dimensions.temporal?.points)) fail('E_PROJECTION_SCHEMA', 'Temporal points must be an array', 'projection.dimensions.temporal.points');
  if (!Array.isArray(value.dimensions.causal?.nodes) || !Array.isArray(value.dimensions.causal?.edges)) fail('E_PROJECTION_SCHEMA', 'Causal nodes and edges must be arrays', 'projection.dimensions.causal');
  if (!Array.isArray(value.dimensions.branching?.nodes) || !Array.isArray(value.dimensions.branching?.edges)) fail('E_PROJECTION_SCHEMA', 'Branching nodes and edges must be arrays', 'projection.dimensions.branching');
  if (!Array.isArray(value.dimensions.subjective?.statusByBranch) || !Array.isArray(value.dimensions.subjective?.records)) fail('E_PROJECTION_SCHEMA', 'Subjective arrays are required', 'projection.dimensions.subjective');

  const temporalIds = new Set();
  for (const point of value.dimensions.temporal.points) {
    exactObject(point, [
      'branchId', 'runId', 'stepId', 'sequence', 'receiptHash', 'previousReceiptHash',
      'stateHash', 'prngStateHash', 'coordinates', 'temporalPointId',
    ], 'E_PROJECTION_SCHEMA', 'projection.dimensions.temporal.point');
    if (!BRANCH_ID.test(point.branchId) || !HASH.test(point.receiptHash) || !HASH.test(point.stateHash) || !HASH.test(point.prngStateHash)) fail('E_PROJECTION_SCHEMA', 'Invalid temporal commitments', `projection.dimensions.temporal.${point.temporalPointId}`);
    if (point.previousReceiptHash !== null && !HASH.test(point.previousReceiptHash)) fail('E_PROJECTION_SCHEMA', 'Invalid previous receipt hash', `projection.dimensions.temporal.${point.temporalPointId}.previousReceiptHash`);
    requireInteger(point.sequence, 'E_PROJECTION_SCHEMA', `projection.dimensions.temporal.${point.temporalPointId}.sequence`);
    validateCoordinate(point.coordinates, `projection.dimensions.temporal.${point.temporalPointId}.coordinates`);
    if (!/^temporal-[a-f0-9]{64}$/.test(point.temporalPointId) || temporalIds.has(point.temporalPointId)) fail('E_PROJECTION_SCHEMA', 'Invalid or duplicate temporal point ID', `projection.dimensions.temporal.${point.temporalPointId}`);
    temporalIds.add(point.temporalPointId);
  }

  const nodeIds = new Set();
  for (const causalNode of value.dimensions.causal.nodes) {
    if (!causalNode || typeof causalNode !== 'object' || typeof causalNode.nodeId !== 'string') fail('E_PROJECTION_SCHEMA', 'Invalid causal node', 'projection.dimensions.causal.nodes');
    validateCoordinate(causalNode.coordinates, `projection.dimensions.causal.${causalNode.nodeId}.coordinates`);
    if (nodeIds.has(causalNode.nodeId)) fail('E_PROJECTION_SCHEMA', 'Duplicate causal node ID', `projection.dimensions.causal.${causalNode.nodeId}`);
    nodeIds.add(causalNode.nodeId);
  }
  for (const branchNode of value.dimensions.branching.nodes) {
    if (!branchNode || typeof branchNode !== 'object' || typeof branchNode.nodeId !== 'string' || !BRANCH_ID.test(branchNode.branchId)) fail('E_PROJECTION_SCHEMA', 'Invalid branch node', 'projection.dimensions.branching.nodes');
    validateCoordinate(branchNode.coordinates, `projection.dimensions.branching.${branchNode.nodeId}.coordinates`);
    if (nodeIds.has(branchNode.nodeId)) fail('E_PROJECTION_SCHEMA', 'Duplicate projection node ID', `projection.dimensions.branching.${branchNode.nodeId}`);
    nodeIds.add(branchNode.nodeId);
  }
  for (const collection of [value.dimensions.causal.edges, value.dimensions.branching.edges]) {
    const edgeIds = new Set();
    for (const projectionEdge of collection) {
      if (!projectionEdge || typeof projectionEdge !== 'object' || typeof projectionEdge.edgeId !== 'string') fail('E_PROJECTION_SCHEMA', 'Invalid projection edge', 'projection.dimensions.edges');
      if (edgeIds.has(projectionEdge.edgeId)) fail('E_PROJECTION_SCHEMA', 'Duplicate edge ID', `projection.dimensions.edges.${projectionEdge.edgeId}`);
      if (!nodeIds.has(projectionEdge.fromNodeId) || !nodeIds.has(projectionEdge.toNodeId)) fail('E_PROJECTION_REFERENCE', 'Projection edge references an unknown node', `projection.dimensions.edges.${projectionEdge.edgeId}`);
      edgeIds.add(projectionEdge.edgeId);
    }
  }
  const subjectiveIds = new Set();
  for (const record of value.dimensions.subjective.records) {
    if (!SUBJECTIVE_ID.test(record.subjectiveRecordId) || subjectiveIds.has(record.subjectiveRecordId)) fail('E_PROJECTION_SCHEMA', 'Invalid or duplicate subjective record ID', `projection.dimensions.subjective.${record.subjectiveRecordId}`);
    const { subjectiveRecordId: _id, ...content } = record;
    if (`subjective-${sha256Hex(content)}` !== record.subjectiveRecordId) fail('E_PROJECTION_HASH', 'Subjective record hash mismatch', `projection.dimensions.subjective.${record.subjectiveRecordId}`);
    if (record.tension !== record.perceivedValue - record.objectiveValue) fail('E_PROJECTION_SCHEMA', 'Subjective tension arithmetic mismatch', `projection.dimensions.subjective.${record.subjectiveRecordId}.tension`);
    subjectiveIds.add(record.subjectiveRecordId);
  }
  const expectedProjectionId = `projection-${sha256Hex({
    projectionVersion: value.projectionVersion,
    source: value.source,
    subjectiveRecordIds: value.dimensions.subjective.records.map((record) => record.subjectiveRecordId),
  })}`;
  if (expectedProjectionId !== value.projectionId) fail('E_PROJECTION_HASH', 'projectionId mismatch', 'projection.projectionId', expectedProjectionId, value.projectionId);
  const expectedHash = sha256Hex(projectionCore(value));
  if (expectedHash !== value.projectionHash) fail('E_PROJECTION_HASH', 'projectionHash mismatch', 'projection.projectionHash', expectedHash, value.projectionHash);
  return cloneAndFreeze(value);
}

function rawSubjectiveRecords(projection) {
  return projection.dimensions.subjective.records.map((record) => {
    const { schemaVersion: _schemaVersion, tension: _tension, subjectiveRecordId: _id, ...raw } = record;
    return raw;
  });
}

function report(fields = {}) {
  return cloneAndFreeze({
    ok: false,
    projectionId: null,
    projectionHash: null,
    firstMismatch: null,
    errorCode: 'E_PROJECTION_SCHEMA',
    expectedHash: null,
    actualHash: null,
    ...fields,
  });
}

export function projectRunGraph4D(graph, options = {}) {
  if (options === undefined) options = {};
  assertPlainObject(options, 'E_PROJECTION_SCHEMA', 'options');
  const keys = Object.keys(options);
  if (keys.some((key) => key !== 'subjectiveRecords')) fail('E_PROJECTION_SCHEMA', 'Projection options contain unknown fields', 'options');
  const graphExport = exportRunGraph(graph);
  return buildProjection(graph, graphExport, options.subjectiveRecords ?? []);
}

export function parseProjection(exportedProjection) {
  const value = parseJson(exportedProjection, 'E_PROJECTION_SCHEMA', 'projection');
  try {
    if (typeof exportedProjection === 'string' && canonicalString(value) !== exportedProjection) fail('E_PROJECTION_SCHEMA', 'Projection export is not canonical', 'projection');
    return validateProjectionValue(value);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    fail('E_PROJECTION_SCHEMA', 'Projection could not be parsed', 'projection');
  }
}

export function exportProjection(projection) {
  return canonicalString(validateProjectionValue(parseJson(projection, 'E_PROJECTION_SCHEMA', 'projection')));
}

export function verifyProjection(projection, sourceGraph = null) {
  try {
    const verified = validateProjectionValue(parseJson(projection, 'E_PROJECTION_SCHEMA', 'projection'));
    if (sourceGraph !== null) {
      const sourceExport = exportRunGraph(sourceGraph);
      const sourceValue = JSON.parse(sourceExport);
      const expectedSource = {
        graphId: sourceValue.graphId,
        graphHash: sourceValue.graphHash,
        rootBranchId: sourceValue.rootBranchId,
        branchCount: Object.keys(sourceValue.branches).length,
        runGraphExportHash: graphExportHash(sourceExport),
      };
      if (canonicalString(expectedSource) !== canonicalString(verified.source)) {
        fail('E_PROJECTION_SOURCE', 'Projection source commitments do not match RunGraph', 'projection.source');
      }
      const reproduced = projectRunGraph4D(sourceGraph, { subjectiveRecords: rawSubjectiveRecords(verified) });
      if (canonicalString(reproduced) !== canonicalString(verified)) fail('E_PROJECTION_SOURCE', 'Projection does not reproduce from the supplied RunGraph', 'projection');
    }
    return report({
      ok: true,
      projectionId: verified.projectionId,
      projectionHash: verified.projectionHash,
      firstMismatch: null,
      errorCode: null,
      expectedHash: verified.projectionHash,
      actualHash: verified.projectionHash,
    });
  } catch (error) {
    const details = error instanceof TrustKernelError ? error.details : null;
    return report({
      firstMismatch: details?.path ?? 'projection',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_PROJECTION_SCHEMA',
      expectedHash: typeof details?.expected === 'string' ? details.expected : null,
      actualHash: typeof details?.actual === 'string' ? details.actual : null,
    });
  }
}

import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { getBranch, verifyRunGraph } from '../kernel/run-graph.js';
import { normalizeAnnotations } from './annotations.js';

export const PROJECTION_FORMAT = 'ripple-4d-projection';
export const PROJECTION_SCHEMA_VERSION = '1.0.0';

function fail(code, message, path = 'projection') {
  throw new TrustKernelError(code, message, { path });
}

function projectionCore(value) {
  const { projectionHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function plainOptions(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('E_PROJECTION_SCHEMA', 'Projection options must be a plain object', 'options');
  }
  const allowed = new Set(['temporalSpacing', 'branchSpacing', 'annotations']);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) fail('E_PROJECTION_SCHEMA', 'Projection options contain unknown or symbol fields', 'options');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !('value' in descriptor)) fail('E_PROJECTION_SCHEMA', `Projection option ${key} must be an enumerable data property`, `options.${key}`);
  }
  return value;
}

function spacing(value, fallback, path) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) fail('E_PROJECTION_SCHEMA', `${path} must be a positive safe integer`, path);
  return resolved;
}

function depthFor(graph, branchId, cache) {
  if (cache.has(branchId)) return cache.get(branchId);
  const descriptor = graph.branches[branchId];
  if (!descriptor) fail('E_PROJECTION_GRAPH', `Unknown branch: ${branchId}`, `branches.${branchId}`);
  if (descriptor.parentBranchId === null) {
    cache.set(branchId, 0);
    return 0;
  }
  const depth = depthFor(graph, descriptor.parentBranchId, cache) + 1;
  cache.set(branchId, depth);
  return depth;
}

function receiptNodeId(branchId, receiptHash) {
  return `receipt:${branchId}:${receiptHash}`;
}

function snapstateNodeId(branchId, stepId, stateHash) {
  return `snapstate:${branchId}:${stepId}:${stateHash}`;
}

function eventBatchNodeId(branchId, sequence, eventBatchHash) {
  return `event-batch:${branchId}:${sequence}:${eventBatchHash}`;
}

function buildBaseProjection(graph, options) {
  const report = verifyRunGraph(graph);
  if (!report.ok) fail('E_PROJECTION_GRAPH', `RunGraph verification failed at ${report.firstMismatch}`, report.firstMismatch ?? 'graph');

  const temporalSpacing = spacing(options.temporalSpacing, 1000, 'options.temporalSpacing');
  const branchSpacing = spacing(options.branchSpacing, 1000, 'options.branchSpacing');
  const branchIds = Object.keys(graph.branches).sort();
  const laneByBranch = new Map(branchIds.map((branchId, index) => [branchId, index]));
  const depthCache = new Map();

  const branchingNodes = branchIds.map((branchId) => {
    const descriptor = graph.branches[branchId];
    return cloneAndFreeze({
      branchId,
      label: descriptor.label,
      parentBranchId: descriptor.parentBranchId,
      forkStepId: descriptor.forkStepId,
      parentReceiptHash: descriptor.parentReceiptHash,
      lane: laneByBranch.get(branchId),
      depth: depthFor(graph, branchId, depthCache),
    });
  });

  const branchingEdges = branchingNodes
    .filter((node) => node.parentBranchId !== null)
    .map((node) => cloneAndFreeze({
      edgeId: `branch-edge:${node.parentBranchId}:${node.branchId}:${node.parentReceiptHash}`,
      fromBranchId: node.parentBranchId,
      toBranchId: node.branchId,
      forkStepId: node.forkStepId,
      parentReceiptHash: node.parentReceiptHash,
    }));

  const temporalNodes = [];
  const causalEdges = [];
  const receiptIds = new Set();
  const snapstateIds = new Set();
  const eventBatchIds = new Set();

  for (const branchId of branchIds) {
    const run = getBranch(graph, branchId);
    const lane = laneByBranch.get(branchId);
    const depth = depthFor(graph, branchId, depthCache);
    for (let index = 0; index < run.snapstates.length; index += 1) {
      const snapstate = run.snapstates[index];
      const receipt = run.ledger[index];
      const nodeId = snapstateNodeId(branchId, snapstate.stepId, snapstate.stateHash);
      const receiptId = receiptNodeId(branchId, receipt.receiptHash);
      snapstateIds.add(nodeId);
      receiptIds.add(receiptId);
      temporalNodes.push(cloneAndFreeze({
        nodeId,
        receiptNodeId: receiptId,
        branchId,
        stepId: snapstate.stepId,
        sequence: snapstate.sequence,
        stateHash: snapstate.stateHash,
        previousReceiptHash: snapstate.previousReceiptHash,
        receiptHash: receipt.receiptHash,
        eventBatchHash: receipt.eventBatchHash,
        x: lane * branchSpacing,
        y: depth * branchSpacing,
        z: snapstate.sequence * temporalSpacing,
        t: snapstate.sequence * temporalSpacing,
      }));

      if (index > 0) {
        causalEdges.push(cloneAndFreeze({
          edgeId: `receipt-edge:${branchId}:${receipt.receiptHash}`,
          kind: 'receipt-chain',
          semanticClass: 'provenance',
          from: receiptNodeId(branchId, run.ledger[index - 1].receiptHash),
          to: receiptId,
        }));
      }

      const events = run.eventBatches[index];
      if (Array.isArray(events) && events.length > 0) {
        const batchId = eventBatchNodeId(branchId, index, receipt.eventBatchHash);
        eventBatchIds.add(batchId);
        causalEdges.push(cloneAndFreeze({
          edgeId: `event-edge:${branchId}:${index}:${receipt.eventBatchHash}`,
          kind: 'event-batch',
          semanticClass: 'provenance',
          from: receiptId,
          to: batchId,
        }));
      }
    }
  }

  for (const edge of branchingEdges) {
    const child = getBranch(graph, edge.toBranchId);
    const parentReceiptId = receiptNodeId(edge.fromBranchId, edge.parentReceiptHash);
    const childGenesisId = receiptNodeId(edge.toBranchId, child.ledger[0].receiptHash);
    if (!receiptIds.has(parentReceiptId) || !receiptIds.has(childGenesisId)) {
      fail('E_PROJECTION_GRAPH', 'Fork provenance edge cannot resolve verified receipts', edge.edgeId);
    }
    causalEdges.push(cloneAndFreeze({
      edgeId: `fork-edge:${edge.fromBranchId}:${edge.toBranchId}:${edge.parentReceiptHash}`,
      kind: 'fork',
      semanticClass: 'provenance',
      from: parentReceiptId,
      to: childGenesisId,
    }));
  }

  temporalNodes.sort((a, b) => a.branchId.localeCompare(b.branchId) || a.sequence - b.sequence || a.nodeId.localeCompare(b.nodeId));
  causalEdges.sort((a, b) => a.edgeId.localeCompare(b.edgeId));

  return {
    core: cloneAndFreeze({
      format: PROJECTION_FORMAT,
      schemaVersion: PROJECTION_SCHEMA_VERSION,
      graphId: graph.graphId,
      sourceGraphHash: graph.graphHash,
      baseProjectionHash: null,
      options: { temporalSpacing, branchSpacing },
      dimensions: {
        temporal: { nodes: temporalNodes },
        causal: { edges: causalEdges },
        branching: { nodes: branchingNodes, edges: branchingEdges },
        subjective: { annotations: [] },
      },
    }),
    targets: { branchIds: new Set(branchIds), receiptIds, snapstateIds, eventBatchIds },
  };
}

function validateAnnotationTargets(annotations, targets) {
  for (const annotation of annotations) {
    let valid = false;
    if (annotation.targetType === 'branch') valid = targets.branchIds.has(annotation.targetId);
    if (annotation.targetType === 'snapstate') valid = targets.snapstateIds.has(annotation.targetId);
    if (annotation.targetType === 'receipt') valid = targets.receiptIds.has(annotation.targetId);
    // Anomaly records are not part of RunGraph v1 projection input yet.
    if (annotation.targetType === 'anomaly') valid = false;
    if (!valid) fail('E_ANNOTATION_TARGET', `Annotation target is not present in projection: ${annotation.targetId}`, `annotations.${annotation.annotationId}.targetId`);
  }
}

function withHash(core) {
  const frozenCore = cloneAndFreeze(core);
  return cloneAndFreeze({ ...frozenCore, projectionHash: sha256Hex(frozenCore) });
}

export function projectRunGraph(graph, rawOptions) {
  const options = plainOptions(rawOptions);
  const { core: baseCore, targets } = buildBaseProjection(graph, options);
  const base = withHash(baseCore);
  const annotations = normalizeAnnotations(options.annotations ?? []);
  if (annotations.length === 0) return base;
  validateAnnotationTargets(annotations, targets);

  const annotatedCore = projectionCore({
    ...baseCore,
    baseProjectionHash: base.projectionHash,
    dimensions: {
      ...baseCore.dimensions,
      subjective: { annotations },
    },
    projectionHash: 'placeholder',
  });
  return withHash(annotatedCore);
}

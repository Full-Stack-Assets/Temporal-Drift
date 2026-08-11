import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { normalizeAnnotations } from '../projection/annotations.js';
import { PROJECTION_FORMAT, PROJECTION_SCHEMA_VERSION } from '../projection/project-4d.js';

export const TRUSTSCAPE_SCENE_FORMAT = 'trustscape-lite-scene';
export const TRUSTSCAPE_SCENE_SCHEMA_VERSION = '1.0.0';
export const TRUSTSCAPE_FIXTURE_FORMAT = 'trustscape-lite-fixture';
export const TRUSTSCAPE_FIXTURE_SCHEMA_VERSION = '1.0.0';

function fail(code, message, path = 'scene') {
  throw new TrustKernelError(code, message, { path });
}

function projectionCore(projection) {
  const { projectionHash: _hash, ...core } = projection;
  return cloneAndFreeze(core);
}

function validateProjection(projection) {
  if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
    fail('E_TRUSTSCAPE_PROJECTION', 'Projection must be an object', 'projection');
  }
  if (projection.format !== PROJECTION_FORMAT || projection.schemaVersion !== PROJECTION_SCHEMA_VERSION) {
    fail('E_TRUSTSCAPE_PROJECTION', 'Unsupported projection format or schema version', 'projection.schemaVersion');
  }
  if (typeof projection.projectionHash !== 'string' || sha256Hex(projectionCore(projection)) !== projection.projectionHash) {
    fail('E_TRUSTSCAPE_PROJECTION', 'Projection hash mismatch', 'projection.projectionHash');
  }
  if (!projection.dimensions?.temporal?.nodes || !projection.dimensions?.causal?.edges || !projection.dimensions?.branching?.nodes || !projection.dimensions?.branching?.edges) {
    fail('E_TRUSTSCAPE_PROJECTION', 'Projection dimensions are incomplete', 'projection.dimensions');
  }
}

function buildTargets(projection) {
  const points = projection.dimensions.temporal.nodes.map((node) => cloneAndFreeze({
    nodeId: node.nodeId,
    receiptNodeId: node.receiptNodeId,
    branchId: node.branchId,
    stepId: node.stepId,
    sequence: node.sequence,
    stateHash: node.stateHash,
    receiptHash: node.receiptHash,
    eventBatchHash: node.eventBatchHash,
    x: node.x,
    y: node.y,
    z: node.z,
    t: node.t,
  }));
  points.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  return {
    points,
    pointIds: new Set(points.map((point) => point.nodeId)),
    receiptIds: new Set(points.map((point) => point.receiptNodeId)),
    branchIds: new Set(projection.dimensions.branching.nodes.map((node) => node.branchId)),
  };
}

function receiptThreads(projection, receiptIds) {
  const threads = projection.dimensions.causal.edges
    .filter((edge) => edge.kind === 'receipt-chain' || edge.kind === 'fork')
    .map((edge) => {
      if (!receiptIds.has(edge.from) || !receiptIds.has(edge.to)) {
        fail('E_TRUSTSCAPE_REFERENCE', `Receipt thread references missing projection evidence: ${edge.edgeId}`, `projection.dimensions.causal.edges.${edge.edgeId}`);
      }
      return cloneAndFreeze({
        edgeId: edge.edgeId,
        kind: edge.kind,
        semanticClass: edge.semanticClass,
        from: edge.from,
        to: edge.to,
      });
    });
  threads.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
  return threads;
}

function branchEdges(projection, branchIds) {
  const edges = projection.dimensions.branching.edges.map((edge) => {
    if (!branchIds.has(edge.fromBranchId) || !branchIds.has(edge.toBranchId)) {
      fail('E_TRUSTSCAPE_REFERENCE', `Branch edge references missing branch: ${edge.edgeId}`, `projection.dimensions.branching.edges.${edge.edgeId}`);
    }
    return cloneAndFreeze(edge);
  });
  edges.sort((a, b) => a.edgeId.localeCompare(b.edgeId));
  return edges;
}

function buildRadarItems(records, targets) {
  const annotations = normalizeAnnotations(records);
  return annotations.map((annotation) => {
    let valid = false;
    if (annotation.targetType === 'branch') valid = targets.branchIds.has(annotation.targetId);
    if (annotation.targetType === 'snapstate') valid = targets.pointIds.has(annotation.targetId);
    if (annotation.targetType === 'receipt') valid = targets.receiptIds.has(annotation.targetId);
    if (!valid) {
      fail('E_TRUSTSCAPE_REFERENCE', `Annotation target is not available in scene: ${annotation.targetId}`, `annotations.${annotation.annotationId}.targetId`);
    }
    return cloneAndFreeze({
      radarId: `radar:${annotation.annotationId}`,
      annotationId: annotation.annotationId,
      authorId: annotation.authorId,
      targetType: annotation.targetType,
      targetId: annotation.targetId,
      body: annotation.body,
      createdLogicalTime: annotation.createdLogicalTime,
      supersedes: annotation.supersedes,
    });
  });
}

export function buildTrustscapeScene(projection, annotations = []) {
  validateProjection(projection);
  const targets = buildTargets(projection);
  const core = cloneAndFreeze({
    format: TRUSTSCAPE_SCENE_FORMAT,
    schemaVersion: TRUSTSCAPE_SCENE_SCHEMA_VERSION,
    graphId: projection.graphId,
    sourceGraphHash: projection.sourceGraphHash,
    sourceProjectionHash: projection.projectionHash,
    points: targets.points,
    receiptThreads: receiptThreads(projection, targets.receiptIds),
    branchEdges: branchEdges(projection, targets.branchIds),
    radarItems: buildRadarItems(annotations, targets),
  });
  return cloneAndFreeze({ ...core, sceneHash: sha256Hex(core) });
}

export function buildTrustscapeBrowserFixture(projection, annotations = []) {
  validateProjection(projection);
  const scene = buildTrustscapeScene(projection, annotations);
  const branches = projection.dimensions.branching.nodes.map((node) => cloneAndFreeze({
    branchId: node.branchId,
    label: node.label,
    parentBranchId: node.parentBranchId,
    forkStepId: node.forkStepId,
    lane: node.lane,
    depth: node.depth,
  }));
  branches.sort((a, b) => a.branchId.localeCompare(b.branchId));
  const core = cloneAndFreeze({
    format: TRUSTSCAPE_FIXTURE_FORMAT,
    schemaVersion: TRUSTSCAPE_FIXTURE_SCHEMA_VERSION,
    graphId: scene.graphId,
    sourceGraphHash: scene.sourceGraphHash,
    sourceProjectionHash: scene.sourceProjectionHash,
    sourceSceneHash: scene.sceneHash,
    branches,
    points: scene.points,
    receiptThreads: scene.receiptThreads,
    branchEdges: scene.branchEdges,
    radarItems: scene.radarItems,
  });
  return cloneAndFreeze({ ...core, fixtureHash: sha256Hex(core) });
}

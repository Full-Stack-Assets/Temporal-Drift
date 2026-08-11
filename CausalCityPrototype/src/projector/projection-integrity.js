import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  parseProjection,
  verifyProjection as verifyProjectionBase,
} from './projection.js';

function fail(code, message, path, expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function exactKeys(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('E_PROJECTION_SCHEMA', `${path} must be an object`, path);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    fail('E_PROJECTION_SCHEMA', `${path} contains missing or unknown fields`, path);
  }
}

function without(value, key) {
  const result = { ...value };
  delete result[key];
  return result;
}

function assertId(actual, expected, path) {
  if (actual !== expected) fail('E_PROJECTION_HASH', `${path} content ID mismatch`, path, expected, actual);
}

function validateProjectionContentIds(projection) {
  const branchNodes = projection.dimensions.branching.nodes;
  if (branchNodes.length !== projection.source.branchCount) {
    fail('E_PROJECTION_REFERENCE', 'Branch-node count differs from the source commitment', 'projection.dimensions.branching.nodes');
  }
  const branchById = new Map();
  const nodeIds = new Set();
  for (const branch of branchNodes) {
    exactKeys(branch, [
      'branchId', 'label', 'parentBranchId', 'forkStepId', 'parentReceiptHash',
      'depth', 'ordinal', 'terminalReceiptHash', 'manifestCoreHash', 'coordinates', 'nodeId',
    ], `projection.dimensions.branching.${branch.nodeId}`);
    assertId(branch.nodeId, `branch-node-${sha256Hex({ graphId: projection.source.graphId, branchId: branch.branchId })}`, `projection.dimensions.branching.${branch.nodeId}.nodeId`);
    if (branchById.has(branch.branchId) || nodeIds.has(branch.nodeId)) fail('E_PROJECTION_REFERENCE', 'Duplicate branch identity', `projection.dimensions.branching.${branch.branchId}`);
    branchById.set(branch.branchId, branch);
    nodeIds.add(branch.nodeId);
  }
  if (!branchById.has(projection.source.rootBranchId)) fail('E_PROJECTION_REFERENCE', 'Source root branch is absent', 'projection.source.rootBranchId');

  const temporalKeys = new Set();
  for (const point of projection.dimensions.temporal.points) {
    exactKeys(point, [
      'branchId', 'runId', 'stepId', 'sequence', 'receiptHash', 'previousReceiptHash',
      'stateHash', 'prngStateHash', 'coordinates', 'temporalPointId',
    ], `projection.dimensions.temporal.${point.temporalPointId}`);
    assertId(point.temporalPointId, `temporal-${sha256Hex(without(point, 'temporalPointId'))}`, `projection.dimensions.temporal.${point.temporalPointId}.temporalPointId`);
    if (!branchById.has(point.branchId)) fail('E_PROJECTION_REFERENCE', 'Temporal point references an unknown branch', `projection.dimensions.temporal.${point.temporalPointId}.branchId`);
    const key = `${point.branchId}\u0000${point.sequence}`;
    if (temporalKeys.has(key)) fail('E_PROJECTION_REFERENCE', 'Duplicate temporal branch/sequence location', `projection.dimensions.temporal.${point.temporalPointId}`);
    temporalKeys.add(key);
  }

  for (const node of projection.dimensions.causal.nodes) {
    exactKeys(node, [
      'kind', 'branchId', 'stepId', 'sequence', 'receiptHash', 'eventHash',
      'eventIndex', 'coordinates', 'nodeId',
    ], `projection.dimensions.causal.${node.nodeId}`);
    const prefix = node.kind === 'receipt' ? 'receipt-node' : node.kind === 'event' ? 'event-node' : null;
    if (!prefix) fail('E_PROJECTION_SCHEMA', 'Unsupported causal node kind', `projection.dimensions.causal.${node.nodeId}.kind`);
    assertId(node.nodeId, `${prefix}-${sha256Hex(without(node, 'nodeId'))}`, `projection.dimensions.causal.${node.nodeId}.nodeId`);
    if (!branchById.has(node.branchId)) fail('E_PROJECTION_REFERENCE', 'Causal node references an unknown branch', `projection.dimensions.causal.${node.nodeId}.branchId`);
    if (nodeIds.has(node.nodeId)) fail('E_PROJECTION_REFERENCE', 'Duplicate projection node ID', `projection.dimensions.causal.${node.nodeId}`);
    nodeIds.add(node.nodeId);
  }

  const edgeIds = new Set();
  for (const edge of projection.dimensions.causal.edges) {
    exactKeys(edge, ['kind', 'branchId', 'fromNodeId', 'toNodeId', 'edgeId'], `projection.dimensions.causal.${edge.edgeId}`);
    if (!['precedes', 'emits', 'forks'].includes(edge.kind)) fail('E_PROJECTION_SCHEMA', 'Unsupported causal-provenance edge kind', `projection.dimensions.causal.${edge.edgeId}.kind`);
    assertId(edge.edgeId, `edge-${sha256Hex(without(edge, 'edgeId'))}`, `projection.dimensions.causal.${edge.edgeId}.edgeId`);
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) fail('E_PROJECTION_REFERENCE', 'Causal edge references an unknown node', `projection.dimensions.causal.${edge.edgeId}`);
    if (edgeIds.has(edge.edgeId)) fail('E_PROJECTION_REFERENCE', 'Duplicate projection edge ID', `projection.dimensions.causal.${edge.edgeId}`);
    edgeIds.add(edge.edgeId);
  }
  for (const edge of projection.dimensions.branching.edges) {
    exactKeys(edge, ['kind', 'branchId', 'fromNodeId', 'toNodeId', 'forkStepId', 'parentReceiptHash', 'edgeId'], `projection.dimensions.branching.${edge.edgeId}`);
    if (edge.kind !== 'parent') fail('E_PROJECTION_SCHEMA', 'Unsupported branch edge kind', `projection.dimensions.branching.${edge.edgeId}.kind`);
    assertId(edge.edgeId, `edge-${sha256Hex(without(edge, 'edgeId'))}`, `projection.dimensions.branching.${edge.edgeId}.edgeId`);
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) fail('E_PROJECTION_REFERENCE', 'Branch edge references an unknown node', `projection.dimensions.branching.${edge.edgeId}`);
    if (edgeIds.has(edge.edgeId)) fail('E_PROJECTION_REFERENCE', 'Duplicate projection edge ID', `projection.dimensions.branching.${edge.edgeId}`);
    edgeIds.add(edge.edgeId);
  }

  const recordCounts = new Map([...branchById.keys()].map((branchId) => [branchId, 0]));
  for (const record of projection.dimensions.subjective.records) {
    if (!recordCounts.has(record.branchId)) fail('E_PROJECTION_REFERENCE', 'Subjective record references an unknown branch', `projection.dimensions.subjective.${record.subjectiveRecordId}.branchId`);
    recordCounts.set(record.branchId, recordCounts.get(record.branchId) + 1);
  }
  const statusBranches = new Set();
  for (const status of projection.dimensions.subjective.statusByBranch) {
    exactKeys(status, ['branchId', 'status', 'recordCount'], `projection.dimensions.subjective.status.${status.branchId}`);
    if (!recordCounts.has(status.branchId) || statusBranches.has(status.branchId)) fail('E_PROJECTION_REFERENCE', 'Subjective status branch membership is invalid', `projection.dimensions.subjective.status.${status.branchId}`);
    const count = recordCounts.get(status.branchId);
    const expectedStatus = count > 0 ? 'modeled-from-explicit-records' : 'not-modeled';
    if (status.recordCount !== count || status.status !== expectedStatus) {
      fail('E_PROJECTION_REFERENCE', 'Subjective branch status differs from the explicit record set', `projection.dimensions.subjective.status.${status.branchId}`);
    }
    statusBranches.add(status.branchId);
  }
  if (statusBranches.size !== branchById.size) fail('E_PROJECTION_REFERENCE', 'Subjective status coverage differs from branch membership', 'projection.dimensions.subjective.statusByBranch');
}

function failedReport(base, error) {
  const details = error instanceof TrustKernelError ? error.details : null;
  return cloneAndFreeze({
    ...base,
    ok: false,
    firstMismatch: details?.path ?? 'projection',
    errorCode: error instanceof TrustKernelError ? error.code : 'E_PROJECTION_SCHEMA',
    expectedHash: typeof details?.expected === 'string' ? details.expected : null,
    actualHash: typeof details?.actual === 'string' ? details.actual : null,
  });
}

export function verifyProjection(projectionInput, sourceGraph = null) {
  const base = verifyProjectionBase(projectionInput, sourceGraph);
  if (!base.ok) return base;
  try {
    const projection = parseProjection(typeof projectionInput === 'string' ? projectionInput : canonicalString(projectionInput));
    validateProjectionContentIds(projection);
    return base;
  } catch (error) {
    return failedReport(base, error);
  }
}

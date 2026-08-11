import * as base from './browser-core.js?base';

export {
  appendAnnotationInBrowser,
  canonicalBrowserString,
  createAnnotationDocumentInBrowser,
  mergeAnnotationDocumentsInBrowser,
  sha256BrowserHex,
  verifyAnnotationDocumentInBrowser,
} from './browser-core.js?base';

function without(value, key) {
  const result = { ...value };
  delete result[key];
  return result;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

function errorReport(baseReport, code, path) {
  return deepFreeze({ ...baseReport, ok: false, projection: null, errorCode: code, firstMismatch: path });
}

async function assertProjectionContentIds(projection) {
  const branchIds = new Set();
  const nodeIds = new Set();
  for (const branch of projection.dimensions.branching.nodes) {
    const expected = `branch-node-${await base.sha256BrowserHex({ graphId: projection.source.graphId, branchId: branch.branchId })}`;
    if (branch.nodeId !== expected) throw Object.assign(new Error('Branch-node content ID mismatch'), { code: 'E_BROWSER_PROJECTION_HASH', path: `projection.dimensions.branching.${branch.nodeId}` });
    if (branchIds.has(branch.branchId) || nodeIds.has(branch.nodeId)) throw Object.assign(new Error('Duplicate branch identity'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: `projection.dimensions.branching.${branch.branchId}` });
    branchIds.add(branch.branchId);
    nodeIds.add(branch.nodeId);
  }
  if (branchIds.size !== projection.source.branchCount || !branchIds.has(projection.source.rootBranchId)) throw Object.assign(new Error('Branch membership mismatch'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: 'projection.dimensions.branching' });
  for (const point of projection.dimensions.temporal.points) {
    const expected = `temporal-${await base.sha256BrowserHex(without(point, 'temporalPointId'))}`;
    if (point.temporalPointId !== expected) throw Object.assign(new Error('Temporal content ID mismatch'), { code: 'E_BROWSER_PROJECTION_HASH', path: `projection.dimensions.temporal.${point.temporalPointId}` });
    if (!branchIds.has(point.branchId)) throw Object.assign(new Error('Temporal branch mismatch'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: `projection.dimensions.temporal.${point.temporalPointId}.branchId` });
  }
  for (const node of projection.dimensions.causal.nodes) {
    const prefix = node.kind === 'receipt' ? 'receipt-node' : node.kind === 'event' ? 'event-node' : null;
    if (!prefix) throw Object.assign(new Error('Unsupported causal node kind'), { code: 'E_BROWSER_PROJECTION_SCHEMA', path: `projection.dimensions.causal.${node.nodeId}.kind` });
    const expected = `${prefix}-${await base.sha256BrowserHex(without(node, 'nodeId'))}`;
    if (node.nodeId !== expected) throw Object.assign(new Error('Causal-node content ID mismatch'), { code: 'E_BROWSER_PROJECTION_HASH', path: `projection.dimensions.causal.${node.nodeId}` });
    if (nodeIds.has(node.nodeId)) throw Object.assign(new Error('Duplicate node ID'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: `projection.dimensions.causal.${node.nodeId}` });
    nodeIds.add(node.nodeId);
  }
  for (const edge of [...projection.dimensions.causal.edges, ...projection.dimensions.branching.edges]) {
    const expected = `edge-${await base.sha256BrowserHex(without(edge, 'edgeId'))}`;
    if (edge.edgeId !== expected) throw Object.assign(new Error('Projection-edge content ID mismatch'), { code: 'E_BROWSER_PROJECTION_HASH', path: `projection.edge.${edge.edgeId}` });
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) throw Object.assign(new Error('Projection-edge reference mismatch'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: `projection.edge.${edge.edgeId}` });
  }
  const counts = new Map([...branchIds].map((branchId) => [branchId, 0]));
  for (const record of projection.dimensions.subjective.records) {
    if (!counts.has(record.branchId)) throw Object.assign(new Error('Subjective branch mismatch'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: `projection.dimensions.subjective.${record.subjectiveRecordId}` });
    counts.set(record.branchId, counts.get(record.branchId) + 1);
  }
  const statuses = new Set();
  for (const status of projection.dimensions.subjective.statusByBranch) {
    const count = counts.get(status.branchId);
    const expectedStatus = count > 0 ? 'modeled-from-explicit-records' : 'not-modeled';
    if (count === undefined || statuses.has(status.branchId) || status.recordCount !== count || status.status !== expectedStatus) {
      throw Object.assign(new Error('Subjective status mismatch'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: `projection.dimensions.subjective.status.${status.branchId}` });
    }
    statuses.add(status.branchId);
  }
  if (statuses.size !== branchIds.size) throw Object.assign(new Error('Subjective status coverage mismatch'), { code: 'E_BROWSER_PROJECTION_REFERENCE', path: 'projection.dimensions.subjective.statusByBranch' });
}

export async function verifyProjectionInBrowser(input) {
  const baseReport = await base.verifyProjectionInBrowser(input);
  if (!baseReport.ok) return baseReport;
  try {
    await assertProjectionContentIds(baseReport.projection);
    return baseReport;
  } catch (error) {
    return errorReport(baseReport, error.code ?? 'E_BROWSER_PROJECTION_SCHEMA', error.path ?? 'projection');
  }
}

async function hardenRenderModel(model) {
  const objectMap = new Map();
  const objects = [];
  for (const object of model.objects) {
    const content = without(object, 'objectId');
    const objectId = `object-${await base.sha256BrowserHex(content)}`;
    objectMap.set(object.objectId, objectId);
    objects.push(deepFreeze({ ...content, objectId }));
  }
  objects.sort((left, right) => left.objectId.localeCompare(right.objectId));
  const threads = [];
  for (const entry of model.threads) {
    const content = { ...without(entry, 'threadId'), fromObjectId: objectMap.get(entry.fromObjectId), toObjectId: objectMap.get(entry.toObjectId) };
    threads.push(deepFreeze({ ...content, threadId: `thread-${await base.sha256BrowserHex(content)}` }));
  }
  threads.sort((left, right) => left.threadId.localeCompare(right.threadId));
  const comparisons = [];
  for (const entry of model.comparisons) {
    const content = { ...without(entry, 'comparisonId'), leftObjectId: objectMap.get(entry.leftObjectId), rightObjectId: objectMap.get(entry.rightObjectId) };
    comparisons.push(deepFreeze({ ...content, comparisonId: `comparison-${await base.sha256BrowserHex(content)}` }));
  }
  comparisons.sort((left, right) => left.comparisonId.localeCompare(right.comparisonId));
  const radar = [];
  for (const entry of model.radar) {
    const content = { ...without(entry, 'radarId'), targetObjectId: objectMap.get(entry.targetObjectId), subjectiveObjectId: objectMap.get(entry.subjectiveObjectId) };
    radar.push(deepFreeze({ ...content, radarId: `radar-${await base.sha256BrowserHex(content)}` }));
  }
  radar.sort((left, right) => left.radarId.localeCompare(right.radarId));
  const core = { ...without(model, 'renderModelHash'), objects, threads, comparisons, radar };
  return deepFreeze({ ...core, renderModelHash: await base.sha256BrowserHex(core) });
}

export async function createBrowserRenderModel(projectionInput, viewInput = {}) {
  const verified = await verifyProjectionInBrowser(typeof projectionInput === 'string' ? projectionInput : base.canonicalBrowserString(projectionInput));
  if (!verified.ok) throw Object.assign(new Error('Projection failed browser integrity verification'), { code: verified.errorCode, path: verified.firstMismatch });
  return hardenRenderModel(await base.createBrowserRenderModel(verified.projection, viewInput));
}

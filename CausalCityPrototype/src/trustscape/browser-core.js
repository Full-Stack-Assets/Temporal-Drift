export const BROWSER_RENDER_MODEL_FORMAT = 'ripple-trustscape-render-model';
export const BROWSER_RENDER_MODEL_VERSION = 'trustscape-browser-v1';

const HASH = /^[a-f0-9]{64}$/;
const PROJECTION_ID = /^projection-[a-f0-9]{64}$/;
const BRANCH_ID = /^branch-[a-f0-9]{64}$/;
const ANNOTATION_ID = /^annotation-[a-f0-9]{64}$/;
const encoder = new TextEncoder();

class BrowserTrustError extends Error {
  constructor(code, message, path = 'browser') {
    super(message);
    this.name = 'BrowserTrustError';
    this.code = code;
    this.path = path;
  }
}

function fail(code, message, path = 'browser') {
  throw new BrowserTrustError(code, message, path);
}

function assertValidUnicode(value, path) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('E_BROWSER_CANONICAL', `Unpaired high surrogate at ${path}`, path);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      fail('E_BROWSER_CANONICAL', `Unpaired low surrogate at ${path}`, path);
    }
  }
}

function normalizedString(value, path) {
  assertValidUnicode(value, path);
  return value.normalize('NFC');
}

function compareBytes(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function assertPlainEnumerableDataObject(value, path) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail('E_BROWSER_CANONICAL', `Non-plain object at ${path}`, path);
  if (Object.getOwnPropertySymbols(value).length > 0) fail('E_BROWSER_CANONICAL', `Symbol keys are forbidden at ${path}`, path);
  const names = Object.getOwnPropertyNames(value);
  const keys = Object.keys(value);
  if (names.length !== keys.length) fail('E_BROWSER_CANONICAL', `Hidden properties are forbidden at ${path}`, path);
  for (const key of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail('E_BROWSER_CANONICAL', `Accessors are forbidden at ${path}.${key}`, `${path}.${key}`);
    }
  }
}

function canonicalize(value, path, stack) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(normalizedString(value, path));
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) fail('E_BROWSER_CANONICAL', `Unsafe number at ${path}`, path);
    return String(value);
  }
  if (typeof value !== 'object') fail('E_BROWSER_CANONICAL', `Unsupported value at ${path}`, path);
  if (stack.has(value)) fail('E_BROWSER_CANONICAL', `Cycle at ${path}`, path);
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length) fail('E_BROWSER_CANONICAL', `Sparse or augmented array at ${path}`, path);
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) fail('E_BROWSER_CANONICAL', `Sparse array at ${path}[${index}]`, `${path}[${index}]`);
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) fail('E_BROWSER_CANONICAL', `Accessor array entry at ${path}[${index}]`, `${path}[${index}]`);
      }
      return `[${value.map((entry, index) => canonicalize(entry, `${path}[${index}]`, stack)).join(',')}]`;
    }
    assertPlainEnumerableDataObject(value, path);
    const seen = new Set();
    const entries = Object.keys(value).map((key) => {
      const normalized = normalizedString(key, `${path}.<key>`);
      if (seen.has(normalized)) fail('E_BROWSER_CANONICAL', `NFC key collision at ${path}.${normalized}`, `${path}.${normalized}`);
      seen.add(normalized);
      return { original: key, normalized, bytes: encoder.encode(normalized) };
    }).sort((left, right) => compareBytes(left.bytes, right.bytes));
    return `{${entries.map(({ original, normalized }) => `${JSON.stringify(normalized)}:${canonicalize(value[original], `${path}.${normalized}`, stack)}`).join(',')}}`;
  } finally {
    stack.delete(value);
  }
}

export function canonicalBrowserString(value) {
  return canonicalize(value, '$', new WeakSet());
}

function cryptoProvider() {
  const provider = globalThis.crypto;
  if (!provider?.subtle) fail('E_BROWSER_CRYPTO', 'Web Crypto SHA-256 is unavailable', 'crypto.subtle');
  return provider;
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function sha256BrowserHex(value) {
  const bytes = encoder.encode(canonicalBrowserString(value));
  return hex(await cryptoProvider().subtle.digest('SHA-256', bytes));
}

async function sha256TextHex(value) {
  if (typeof value !== 'string') fail('E_BROWSER_CANONICAL', 'Raw hash input must be text', 'hash.input');
  return hex(await cryptoProvider().subtle.digest('SHA-256', encoder.encode(value)));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    Object.freeze(value);
  }
  return value;
}

function parseJson(input, code, path) {
  if (typeof input !== 'string') return structuredClone(input);
  try {
    return JSON.parse(input);
  } catch {
    fail(code, 'Artifact is not valid JSON', path);
  }
}

function exactObject(value, keys, code, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, `${path} must be an object`, path);
  assertPlainEnumerableDataObject(value, path);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) fail(code, `${path} contains missing or unknown fields`, path);
}

function coordinate(value, path) {
  exactObject(value, ['t', 'c', 'b', 's'], 'E_BROWSER_PROJECTION_SCHEMA', path);
  for (const key of ['t', 'c', 'b', 's']) if (!Number.isSafeInteger(value[key])) fail('E_BROWSER_PROJECTION_SCHEMA', `${path}.${key} must be a safe integer`, `${path}.${key}`);
}

function projectionCore(value) {
  const { projectionHash: _projectionHash, ...core } = value;
  return core;
}

async function assertProjection(value, originalText = null) {
  exactObject(value, [
    'format', 'schemaVersion', 'projectionVersion', 'coordinateScale', 'projectionId',
    'source', 'dimensions', 'projectionHash',
  ], 'E_BROWSER_PROJECTION_SCHEMA', 'projection');
  if (value.format !== 'ripple-4d-projection' || value.schemaVersion !== '1.0.0' || value.projectionVersion !== '4d-projector-v1' || value.coordinateScale !== 1000) {
    fail('E_BROWSER_PROJECTION_SCHEMA', 'Unsupported projection format or version', 'projection.schemaVersion');
  }
  if (!PROJECTION_ID.test(value.projectionId) || !HASH.test(value.projectionHash)) fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid projection commitment', 'projection');
  exactObject(value.source, ['graphId', 'graphHash', 'rootBranchId', 'branchCount', 'runGraphExportHash'], 'E_BROWSER_PROJECTION_SCHEMA', 'projection.source');
  if (!/^graph-[a-f0-9]{64}$/.test(value.source.graphId) || !BRANCH_ID.test(value.source.rootBranchId) || !HASH.test(value.source.graphHash) || !HASH.test(value.source.runGraphExportHash) || !Number.isSafeInteger(value.source.branchCount) || value.source.branchCount < 1) {
    fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid projection source', 'projection.source');
  }
  exactObject(value.dimensions, ['temporal', 'causal', 'branching', 'subjective'], 'E_BROWSER_PROJECTION_SCHEMA', 'projection.dimensions');
  if (!Array.isArray(value.dimensions.temporal?.points) || !Array.isArray(value.dimensions.causal?.nodes) || !Array.isArray(value.dimensions.causal?.edges) || !Array.isArray(value.dimensions.branching?.nodes) || !Array.isArray(value.dimensions.branching?.edges) || !Array.isArray(value.dimensions.subjective?.statusByBranch) || !Array.isArray(value.dimensions.subjective?.records)) {
    fail('E_BROWSER_PROJECTION_SCHEMA', 'Projection dimension collections are invalid', 'projection.dimensions');
  }

  const nodeIds = new Set();
  const branchIds = new Set();
  for (const point of value.dimensions.temporal.points) {
    if (!point || !BRANCH_ID.test(point.branchId) || !HASH.test(point.receiptHash) || !HASH.test(point.stateHash) || !HASH.test(point.prngStateHash) || !Number.isSafeInteger(point.sequence)) fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid temporal point', 'projection.dimensions.temporal.points');
    coordinate(point.coordinates, `projection.dimensions.temporal.${point.temporalPointId}.coordinates`);
  }
  for (const node of value.dimensions.causal.nodes) {
    if (!node || !['receipt', 'event'].includes(node.kind) || typeof node.nodeId !== 'string' || nodeIds.has(node.nodeId) || !BRANCH_ID.test(node.branchId)) fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid causal node', 'projection.dimensions.causal.nodes');
    coordinate(node.coordinates, `projection.dimensions.causal.${node.nodeId}.coordinates`);
    nodeIds.add(node.nodeId);
  }
  for (const node of value.dimensions.branching.nodes) {
    if (!node || typeof node.nodeId !== 'string' || nodeIds.has(node.nodeId) || !BRANCH_ID.test(node.branchId) || branchIds.has(node.branchId)) fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid branch node', 'projection.dimensions.branching.nodes');
    coordinate(node.coordinates, `projection.dimensions.branching.${node.nodeId}.coordinates`);
    nodeIds.add(node.nodeId);
    branchIds.add(node.branchId);
  }
  if (branchIds.size !== value.source.branchCount || !branchIds.has(value.source.rootBranchId)) fail('E_BROWSER_PROJECTION_SCHEMA', 'Branch membership differs from source commitments', 'projection.dimensions.branching');
  for (const edge of [...value.dimensions.causal.edges, ...value.dimensions.branching.edges]) {
    if (!edge || typeof edge.edgeId !== 'string' || !nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) fail('E_BROWSER_PROJECTION_REFERENCE', 'Projection edge references an unknown node', `projection.edge.${edge?.edgeId ?? 'unknown'}`);
  }
  for (const status of value.dimensions.subjective.statusByBranch) {
    if (!status || !branchIds.has(status.branchId) || !['not-modeled', 'modeled-from-explicit-records'].includes(status.status) || !Number.isSafeInteger(status.recordCount) || status.recordCount < 0) fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid subjective branch status', 'projection.dimensions.subjective.statusByBranch');
  }
  for (const record of value.dimensions.subjective.records) {
    if (!record || !/^subjective-[a-f0-9]{64}$/.test(record.subjectiveRecordId) || !branchIds.has(record.branchId) || !Number.isSafeInteger(record.objectiveValue) || !Number.isSafeInteger(record.perceivedValue) || !Number.isSafeInteger(record.tension) || record.tension !== record.perceivedValue - record.objectiveValue) {
      fail('E_BROWSER_PROJECTION_SCHEMA', 'Invalid subjective record', `projection.dimensions.subjective.${record?.subjectiveRecordId ?? 'unknown'}`);
    }
    const { subjectiveRecordId: _id, ...content } = record;
    if (`subjective-${await sha256BrowserHex(content)}` !== record.subjectiveRecordId) fail('E_BROWSER_PROJECTION_HASH', 'Subjective record hash mismatch', `projection.dimensions.subjective.${record.subjectiveRecordId}`);
  }
  const expectedProjectionId = `projection-${await sha256BrowserHex({
    projectionVersion: value.projectionVersion,
    source: value.source,
    subjectiveRecordIds: value.dimensions.subjective.records.map((record) => record.subjectiveRecordId),
  })}`;
  if (expectedProjectionId !== value.projectionId) fail('E_BROWSER_PROJECTION_HASH', 'Projection ID mismatch', 'projection.projectionId');
  const expectedHash = await sha256BrowserHex(projectionCore(value));
  if (expectedHash !== value.projectionHash) fail('E_BROWSER_PROJECTION_HASH', 'Projection hash mismatch', 'projection.projectionHash');
  if (originalText !== null && canonicalBrowserString(value) !== originalText) fail('E_BROWSER_PROJECTION_SCHEMA', 'Projection export is not canonical', 'projection');
  return deepFreeze(value);
}

function projectionReport(fields = {}) {
  return deepFreeze({ ok: false, projection: null, projectionId: null, projectionHash: null, errorCode: 'E_BROWSER_PROJECTION_SCHEMA', firstMismatch: null, ...fields });
}

export async function verifyProjectionInBrowser(input) {
  try {
    const text = typeof input === 'string' ? input : null;
    const projection = await assertProjection(parseJson(input, 'E_BROWSER_PROJECTION_SCHEMA', 'projection'), text);
    return projectionReport({ ok: true, projection, projectionId: projection.projectionId, projectionHash: projection.projectionHash, errorCode: null });
  } catch (error) {
    return projectionReport({ errorCode: error instanceof BrowserTrustError ? error.code : 'E_BROWSER_PROJECTION_SCHEMA', firstMismatch: error instanceof BrowserTrustError ? error.path : 'projection' });
  }
}

function normalizeView(projection, input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('E_BROWSER_VIEW', 'View must be an object', 'view');
  const allowed = new Set(['startSequence', 'endSequence', 'activeBranchIds', 'compareBranchIds']);
  if (Object.keys(input).some((key) => !allowed.has(key))) fail('E_BROWSER_VIEW', 'View contains unknown fields', 'view');
  const known = projection.dimensions.branching.nodes.map((node) => node.branchId).sort();
  const knownSet = new Set(known);
  const maximum = Math.max(...projection.dimensions.temporal.points.map((point) => point.sequence));
  const startSequence = input.startSequence ?? 0;
  const endSequence = input.endSequence ?? maximum;
  if (!Number.isSafeInteger(startSequence) || !Number.isSafeInteger(endSequence) || startSequence < 0 || endSequence < startSequence) fail('E_BROWSER_VIEW', 'Invalid sequence range', 'view.startSequence');
  const activeBranchIds = [...(input.activeBranchIds ?? known)];
  if (activeBranchIds.length === 0 || activeBranchIds.some((branchId) => !knownSet.has(branchId)) || new Set(activeBranchIds).size !== activeBranchIds.length) fail('E_BROWSER_VIEW', 'Active branches are invalid', 'view.activeBranchIds');
  activeBranchIds.sort();
  const compareBranchIds = [...(input.compareBranchIds ?? [])];
  if (![0, 2].includes(compareBranchIds.length) || compareBranchIds.some((branchId) => !activeBranchIds.includes(branchId)) || new Set(compareBranchIds).size !== compareBranchIds.length) fail('E_BROWSER_VIEW', 'Comparison requires two distinct active branches', 'view.compareBranchIds');
  compareBranchIds.sort();
  return deepFreeze({ startSequence, endSequence, activeBranchIds, compareBranchIds });
}

async function contentId(prefix, content) {
  return `${prefix}-${await sha256BrowserHex(content)}`;
}

export async function createBrowserRenderModel(projectionInput, viewInput = {}) {
  const verification = await verifyProjectionInBrowser(typeof projectionInput === 'string' ? projectionInput : canonicalBrowserString(projectionInput));
  if (!verification.ok) fail(verification.errorCode, 'Projection failed browser verification', verification.firstMismatch ?? 'projection');
  const projection = verification.projection;
  const view = normalizeView(projection, viewInput);
  const active = new Set(view.activeBranchIds);
  const inRange = (entry) => entry.sequence >= view.startSequence && entry.sequence <= view.endSequence;
  const objects = [];
  const objectBySource = new Map();

  async function addObject(kind, sourceId, fields) {
    const objectId = await contentId('object', { kind, sourceId });
    const entry = deepFreeze({ objectId, kind, sourceId, ...fields });
    objects.push(entry);
    objectBySource.set(sourceId, objectId);
  }

  for (const branch of projection.dimensions.branching.nodes) {
    if (!active.has(branch.branchId)) continue;
    await addObject('branch', branch.nodeId, {
      branchId: branch.branchId, stepId: null, sequence: 0,
      position: { x: branch.coordinates.t, y: branch.coordinates.b, z: branch.coordinates.c },
      intensity: Math.abs(branch.coordinates.s),
    });
  }
  for (const point of projection.dimensions.temporal.points) {
    if (!active.has(point.branchId) || !inRange(point)) continue;
    await addObject('snapstate', point.temporalPointId, {
      branchId: point.branchId, stepId: point.stepId, sequence: point.sequence, stateHash: point.stateHash,
      position: { x: point.coordinates.t, y: point.coordinates.b, z: point.coordinates.c },
      intensity: Math.abs(point.coordinates.s),
    });
  }
  for (const node of projection.dimensions.causal.nodes) {
    if (!active.has(node.branchId) || !inRange(node)) continue;
    await addObject(node.kind, node.nodeId, {
      branchId: node.branchId, stepId: node.stepId, sequence: node.sequence,
      position: { x: node.coordinates.t, y: node.coordinates.b, z: node.coordinates.c },
      intensity: Math.abs(node.coordinates.s),
    });
  }
  for (const record of projection.dimensions.subjective.records) {
    if (!active.has(record.branchId)) continue;
    const point = projection.dimensions.temporal.points.find((entry) => entry.branchId === record.branchId && entry.stepId === record.stepId);
    if (!point || !inRange(point)) continue;
    await addObject('subjective', record.subjectiveRecordId, {
      branchId: record.branchId, stepId: record.stepId, sequence: point.sequence,
      position: { x: point.coordinates.t, y: point.coordinates.b, z: point.coordinates.c + 500 },
      intensity: Math.abs(record.tension),
    });
  }

  const threads = [];
  for (const edge of [...projection.dimensions.causal.edges, ...projection.dimensions.branching.edges]) {
    const fromObjectId = objectBySource.get(edge.fromNodeId);
    const toObjectId = objectBySource.get(edge.toNodeId);
    if (!fromObjectId || !toObjectId) continue;
    const content = { kind: edge.kind, sourceEdgeId: edge.edgeId, fromObjectId, toObjectId };
    threads.push(deepFreeze({ ...content, threadId: await contentId('thread', content) }));
  }

  const comparisons = [];
  if (view.compareBranchIds.length === 2) {
    const [leftBranchId, rightBranchId] = view.compareBranchIds;
    const left = new Map(projection.dimensions.temporal.points.filter((point) => point.branchId === leftBranchId && inRange(point)).map((point) => [point.stepId, point]));
    const right = new Map(projection.dimensions.temporal.points.filter((point) => point.branchId === rightBranchId && inRange(point)).map((point) => [point.stepId, point]));
    for (const stepId of [...left.keys()].filter((key) => right.has(key)).sort()) {
      const leftPoint = left.get(stepId);
      const rightPoint = right.get(stepId);
      const content = {
        leftBranchId, rightBranchId, stepId,
        leftObjectId: objectBySource.get(leftPoint.temporalPointId),
        rightObjectId: objectBySource.get(rightPoint.temporalPointId),
        leftStateHash: leftPoint.stateHash,
        rightStateHash: rightPoint.stateHash,
        stateHashesEqual: leftPoint.stateHash === rightPoint.stateHash,
      };
      comparisons.push(deepFreeze({ ...content, comparisonId: await contentId('comparison', content) }));
    }
  }

  const radar = [];
  for (const record of projection.dimensions.subjective.records) {
    if (!active.has(record.branchId)) continue;
    const point = projection.dimensions.temporal.points.find((entry) => entry.branchId === record.branchId && entry.stepId === record.stepId);
    if (!point || !inRange(point)) continue;
    const content = {
      branchId: record.branchId, stepId: record.stepId, metricPath: record.metricPath,
      tension: record.tension, magnitude: Math.abs(record.tension),
      sourceRef: record.sourceRef, sourceVersion: record.sourceVersion,
      targetObjectId: objectBySource.get(point.temporalPointId),
      subjectiveObjectId: objectBySource.get(record.subjectiveRecordId),
    };
    radar.push(deepFreeze({ ...content, radarId: await contentId('radar', content) }));
  }

  objects.sort((left, right) => left.objectId.localeCompare(right.objectId));
  threads.sort((left, right) => left.threadId.localeCompare(right.threadId));
  comparisons.sort((left, right) => left.comparisonId.localeCompare(right.comparisonId));
  radar.sort((left, right) => left.radarId.localeCompare(right.radarId));
  const core = {
    format: BROWSER_RENDER_MODEL_FORMAT,
    schemaVersion: '1.0.0',
    renderModelVersion: BROWSER_RENDER_MODEL_VERSION,
    sourceProjectionId: projection.projectionId,
    sourceProjectionHash: projection.projectionHash,
    view,
    objects,
    threads,
    comparisons,
    radar,
  };
  return deepFreeze({ ...core, renderModelHash: await sha256BrowserHex(core) });
}

function annotationOperationContent(operation, path = 'operation') {
  exactObject(operation, ['actorId', 'logicalClock', 'targetId', 'body', 'supersedes'], 'E_BROWSER_ANNOTATION_SCHEMA', path);
  if (typeof operation.actorId !== 'string' || operation.actorId.length === 0 || typeof operation.targetId !== 'string' || operation.targetId.length === 0 || typeof operation.body !== 'string') fail('E_BROWSER_ANNOTATION_SCHEMA', 'Invalid annotation text field', path);
  if (!Number.isSafeInteger(operation.logicalClock) || operation.logicalClock < 1) fail('E_BROWSER_ANNOTATION_CLOCK', 'Annotation clock must be a positive safe integer', `${path}.logicalClock`);
  if (operation.supersedes !== null && (typeof operation.supersedes !== 'string' || !ANNOTATION_ID.test(operation.supersedes))) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Invalid supersedes reference', `${path}.supersedes`);
  return {
    actorId: operation.actorId.normalize('NFC'),
    logicalClock: operation.logicalClock,
    targetId: operation.targetId.normalize('NFC'),
    body: operation.body.normalize('NFC'),
    supersedes: operation.supersedes,
  };
}

async function makeAnnotationDocument(actorIdsInput, operationsInput) {
  const actorIds = [...new Set(actorIdsInput.map((actorId) => {
    if (typeof actorId !== 'string' || actorId.length === 0) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Invalid annotation actor', 'actorIds');
    return actorId.normalize('NFC');
  }))].sort();
  if (actorIds.length === 0) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Annotation document requires an actor', 'actorIds');
  const operations = [...operationsInput].sort((left, right) => left.logicalClock - right.logicalClock || left.actorId.localeCompare(right.actorId) || left.annotationId.localeCompare(right.annotationId));
  const core = { format: 'ripple-annotation-document', schemaVersion: '1.0.0', actorIds, operations };
  return deepFreeze({ ...core, documentHash: await sha256BrowserHex(core) });
}

async function assertAnnotationDocument(input, originalText = null) {
  const value = parseJson(input, 'E_BROWSER_ANNOTATION_SCHEMA', 'annotations');
  exactObject(value, ['format', 'schemaVersion', 'actorIds', 'operations', 'documentHash'], 'E_BROWSER_ANNOTATION_SCHEMA', 'annotations');
  if (value.format !== 'ripple-annotation-document' || value.schemaVersion !== '1.0.0' || !Array.isArray(value.actorIds) || !Array.isArray(value.operations) || !HASH.test(value.documentHash)) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Invalid annotation document', 'annotations');
  const actorIds = value.actorIds.map((actorId) => {
    if (typeof actorId !== 'string' || actorId.length === 0) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Invalid actor', 'actorIds');
    return actorId.normalize('NFC');
  });
  if (new Set(actorIds).size !== actorIds.length || canonicalBrowserString(actorIds) !== canonicalBrowserString([...actorIds].sort())) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Actors must be unique and sorted', 'actorIds');
  const operations = [];
  const ids = new Set();
  const clocks = new Map();
  for (let index = 0; index < value.operations.length; index += 1) {
    const stored = value.operations[index];
    exactObject(stored, ['actorId', 'logicalClock', 'targetId', 'body', 'supersedes', 'annotationId'], 'E_BROWSER_ANNOTATION_SCHEMA', `operations.${index}`);
    const { annotationId, ...raw } = stored;
    const content = annotationOperationContent(raw, `operations.${index}`);
    if (annotationId !== `annotation-${await sha256BrowserHex(content)}`) fail('E_BROWSER_ANNOTATION_HASH', 'Annotation ID mismatch', `operations.${index}.annotationId`);
    if (!actorIds.includes(content.actorId) || ids.has(annotationId)) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Annotation membership is invalid', `operations.${index}`);
    const previous = clocks.get(content.actorId) ?? 0;
    if (content.logicalClock <= previous) fail('E_BROWSER_ANNOTATION_CLOCK', 'Actor clocks must increase', `operations.${index}.logicalClock`);
    clocks.set(content.actorId, content.logicalClock);
    ids.add(annotationId);
    operations.push(deepFreeze({ ...content, annotationId }));
  }
  for (const operation of operations) if (operation.supersedes !== null && !ids.has(operation.supersedes)) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Unknown supersedes reference', `operations.${operation.annotationId}.supersedes`);
  const expected = await makeAnnotationDocument(actorIds, operations);
  if (canonicalBrowserString(expected.operations) !== canonicalBrowserString(operations)) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Operations are not canonically ordered', 'operations');
  if (value.documentHash !== expected.documentHash) fail('E_BROWSER_ANNOTATION_HASH', 'Annotation document hash mismatch', 'documentHash');
  if (originalText !== null && canonicalBrowserString(value) !== originalText) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Annotation export is not canonical', 'annotations');
  return expected;
}

function annotationReport(fields = {}) {
  return deepFreeze({ ok: false, document: null, documentHash: null, errorCode: 'E_BROWSER_ANNOTATION_SCHEMA', firstMismatch: null, ...fields });
}

export async function verifyAnnotationDocumentInBrowser(input) {
  try {
    const document = await assertAnnotationDocument(input, typeof input === 'string' ? input : null);
    return annotationReport({ ok: true, document, documentHash: document.documentHash, errorCode: null });
  } catch (error) {
    return annotationReport({ errorCode: error instanceof BrowserTrustError ? error.code : 'E_BROWSER_ANNOTATION_SCHEMA', firstMismatch: error instanceof BrowserTrustError ? error.path : 'annotations' });
  }
}

export async function createAnnotationDocumentInBrowser(actorId) {
  return makeAnnotationDocument([actorId], []);
}

export async function appendAnnotationInBrowser(documentInput, operationInput) {
  const verified = await verifyAnnotationDocumentInBrowser(canonicalBrowserString(documentInput));
  if (!verified.ok) fail(verified.errorCode, 'Annotation document failed verification', verified.firstMismatch ?? 'annotations');
  const document = verified.document;
  const content = annotationOperationContent(operationInput);
  if (!document.actorIds.includes(content.actorId)) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Operation actor is absent from the document', 'operation.actorId');
  const maximum = document.operations.filter((entry) => entry.actorId === content.actorId).reduce((value, entry) => Math.max(value, entry.logicalClock), 0);
  if (content.logicalClock <= maximum) fail('E_BROWSER_ANNOTATION_CLOCK', 'Annotation clock must advance', 'operation.logicalClock');
  if (content.supersedes !== null && !document.operations.some((entry) => entry.annotationId === content.supersedes)) fail('E_BROWSER_ANNOTATION_SCHEMA', 'Unknown supersedes reference', 'operation.supersedes');
  const operation = deepFreeze({ ...content, annotationId: `annotation-${await sha256BrowserHex(content)}` });
  if (document.operations.some((entry) => entry.annotationId === operation.annotationId)) fail('E_BROWSER_ANNOTATION_CONFLICT', 'Duplicate annotation operation', `operations.${operation.annotationId}`);
  return makeAnnotationDocument(document.actorIds, [...document.operations, operation]);
}

export async function mergeAnnotationDocumentsInBrowser(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) fail('E_BROWSER_ANNOTATION_SCHEMA', 'At least one annotation document is required', 'documents');
  const documents = [];
  for (const input of inputs) {
    const verified = await verifyAnnotationDocumentInBrowser(canonicalBrowserString(input));
    if (!verified.ok) fail(verified.errorCode, 'Annotation document failed verification', verified.firstMismatch ?? 'annotations');
    documents.push(verified.document);
  }
  const actors = documents.flatMap((document) => document.actorIds);
  const byId = new Map();
  const clocks = new Set();
  for (const document of documents) {
    for (const operation of document.operations) {
      const existing = byId.get(operation.annotationId);
      if (existing && canonicalBrowserString(existing) !== canonicalBrowserString(operation)) fail('E_BROWSER_ANNOTATION_CONFLICT', 'Conflicting annotation bytes', `operations.${operation.annotationId}`);
      const clock = `${operation.actorId}\u0000${operation.logicalClock}`;
      if (!existing && clocks.has(clock)) fail('E_BROWSER_ANNOTATION_CONFLICT', 'Conflicting actor clock', `operations.${operation.actorId}.${operation.logicalClock}`);
      clocks.add(clock);
      byId.set(operation.annotationId, operation);
    }
  }
  return makeAnnotationDocument(actors, [...byId.values()]);
}

export async function hashRawProjectionExport(exportedProjection) {
  return sha256TextHex(exportedProjection);
}

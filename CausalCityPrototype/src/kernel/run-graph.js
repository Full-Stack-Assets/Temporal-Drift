import { forkRun } from './branch.js';
import { canonicalString, sha256BytesHex, sha256Hex } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze } from './immutable.js';
import { createInputEnvelope, createManifest, manifestCore } from './manifest.js';
import { advanceRun, createRun, exportRun, replayRun } from './replay.js';
import { verifyRun } from './verify.js';

export const RUN_GRAPH_FORMAT = 'ripple-run-graph';
export const RUN_GRAPH_SCHEMA_VERSION = '1.0.0';

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const BRANCH_PATTERN = /^branch-[a-f0-9]{64}$/;
const GRAPH_PATTERN = /^graph-[a-f0-9]{64}$/;
const runtimeByGraph = new WeakMap();

function fail(code, message, path = 'graph', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function exactObject(value, keys, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, `${label} must be an object`, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(code, `${label} must be a plain object`, label);
  }
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== 'string')) {
    fail(code, `${label} cannot contain symbol fields`, label);
  }
  for (const key of actual) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail(code, `${label} must contain enumerable data fields only`, label);
    }
  }
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    fail(code, `${label} contains missing or unknown fields`, label);
  }
}

function requireString(value, code, label) {
  if (typeof value !== 'string' || value.length === 0) fail(code, `${label} must be a non-empty string`, label);
  return cloneAndFreeze(value);
}

function requireHash(value, code, label) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) fail(code, `${label} must be lowercase SHA-256`, label);
  return value;
}

function normalizeLabel(label) {
  const normalized = requireString(label, 'E_BRANCH_LABEL', 'label');
  if (normalized.length === 0) fail('E_BRANCH_LABEL', 'Branch label cannot be empty', 'label');
  return normalized;
}

function rawUtf8Hash(value) {
  return sha256BytesHex(Buffer.from(value, 'utf8'));
}

function normalizedRunExport(run) {
  const exported = JSON.parse(exportRun(run));
  exported.manifest.evidenceRuntime = 'run-graph-v1';
  return canonicalString(exported);
}

function graphIdentityPayload(fields) {
  return cloneAndFreeze({
    format: 'ripple-run-graph-root-v1',
    sourceRootRunId: fields.sourceRootRunId,
    sourceRootBranchId: fields.sourceRootBranchId,
    sourceRootManifestCoreHash: fields.sourceRootManifestCoreHash,
    sourceRootExportHash: fields.sourceRootExportHash,
    sourceRootTerminalReceiptHash: fields.sourceRootTerminalReceiptHash,
  });
}

function deriveGraphId(fields) {
  return `graph-${sha256Hex(graphIdentityPayload(fields))}`;
}

function rootConstruction(fields) {
  return cloneAndFreeze({
    kind: 'root',
    graphId: fields.graphId,
    sourceRootRunId: fields.sourceRootRunId,
    sourceRootBranchId: fields.sourceRootBranchId,
    sourceRootManifestCoreHash: fields.sourceRootManifestCoreHash,
    sourceRootExportHash: fields.sourceRootExportHash,
    sourceRootTerminalReceiptHash: fields.sourceRootTerminalReceiptHash,
  });
}

function findForkPoint(parentRun, forkStepId) {
  const snapstate = parentRun.snapstates.find((entry) => entry.stepId === forkStepId);
  const receipt = parentRun.ledger.find((entry) => entry.stepId === forkStepId);
  if (!snapstate || !receipt || snapstate.sequence !== receipt.sequence || snapstate.stepId !== receipt.stepId) {
    fail('E_GRAPH_BRANCH', `Verified fork point not found: ${forkStepId}`, `branches.${parentRun.manifest.branchId}.forkStepId`);
  }
  return { snapstate, receipt };
}

function childConstruction(graphId, parentBranchId, parentRun, forkStepId, inputs) {
  const { snapstate, receipt } = findForkPoint(parentRun, forkStepId);
  return cloneAndFreeze({
    kind: 'fork',
    graphId,
    parentBranchId,
    parentReceiptHash: receipt.receiptHash,
    forkStepId,
    runId: parentRun.manifest.runId,
    model: parentRun.manifest.model,
    initialStateHash: snapstate.stateHash,
    initialPrngStateHash: sha256Hex(snapstate.prngState),
    inputs,
    normalization: parentRun.manifest.normalization,
  });
}

function branchIdFromConstruction(construction) {
  return `branch-${sha256Hex(construction)}`;
}

function descriptorFor(run, label, constructionHash, parent = null) {
  const exported = normalizedRunExport(run);
  return cloneAndFreeze({
    descriptor: {
      branchId: run.manifest.branchId,
      label,
      parentBranchId: parent?.parentBranchId ?? null,
      forkStepId: parent?.forkStepId ?? null,
      parentReceiptHash: parent?.parentReceiptHash ?? null,
      constructionHash,
      manifestCoreHash: sha256Hex(manifestCore(run.manifest)),
      terminalReceiptHash: run.ledger.at(-1).receiptHash,
      exportedRunHash: rawUtf8Hash(exported),
    },
    exported,
  });
}

function graphCore(graph) {
  const { graphHash: _graphHash, ...core } = graph;
  return cloneAndFreeze(core);
}

function makeGraph(coreFields, runtimes) {
  const core = cloneAndFreeze(coreFields);
  const graph = cloneAndFreeze({ ...core, graphHash: sha256Hex(core) });
  runtimeByGraph.set(graph, new Map(runtimes));
  return graph;
}

function assertCompleteVerifiedRun(run, code = 'E_GRAPH_BRANCH') {
  if (!run || !run.manifest || !run.adapter || !Array.isArray(run.ledger)) fail(code, 'Graph member is not an executable run');
  const exported = normalizedRunExport(run);
  const report = verifyRun(exported, run.adapter);
  if (!report.ok) fail(code, `Run verification failed at ${report.firstMismatch}`, report.firstMismatch ?? 'run');
  return exported;
}

function replayComplete(manifest, adapter) {
  let run = createRun(manifest, adapter);
  for (const input of run.manifest.inputs) run = advanceRun(run, input);
  assertCompleteVerifiedRun(run);
  return run;
}

function strictGraphShape(value) {
  exactObject(value, [
    'format', 'schemaVersion', 'graphId', 'revision', 'previousGraphHash',
    'sourceRootRunId', 'sourceRootBranchId', 'sourceRootManifestCoreHash',
    'sourceRootExportHash', 'sourceRootTerminalReceiptHash', 'rootBranchId',
    'branches', 'runExports', 'graphHash',
  ], 'E_GRAPH_SCHEMA', 'graph');
  if (value.format !== RUN_GRAPH_FORMAT || value.schemaVersion !== RUN_GRAPH_SCHEMA_VERSION) {
    fail('E_GRAPH_SCHEMA', 'Unsupported RunGraph format or version', 'graph.schemaVersion');
  }
  if (!GRAPH_PATTERN.test(value.graphId)) fail('E_GRAPH_SCHEMA', 'Invalid graphId', 'graph.graphId');
  if (!BRANCH_PATTERN.test(value.rootBranchId)) fail('E_GRAPH_SCHEMA', 'Invalid rootBranchId', 'graph.rootBranchId');
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) fail('E_GRAPH_SCHEMA', 'Revision must be non-negative', 'graph.revision');
  if (value.previousGraphHash !== null && !HASH_PATTERN.test(value.previousGraphHash)) {
    fail('E_GRAPH_SCHEMA', 'previousGraphHash must be null or SHA-256', 'graph.previousGraphHash');
  }
  for (const field of ['sourceRootRunId', 'sourceRootBranchId']) requireString(value[field], 'E_GRAPH_SCHEMA', `graph.${field}`);
  for (const field of ['sourceRootManifestCoreHash', 'sourceRootExportHash', 'sourceRootTerminalReceiptHash', 'graphHash']) {
    requireHash(value[field], 'E_GRAPH_SCHEMA', `graph.${field}`);
  }
  if (!value.branches || typeof value.branches !== 'object' || Array.isArray(value.branches)) fail('E_GRAPH_SCHEMA', 'branches must be an object', 'graph.branches');
  if (!value.runExports || typeof value.runExports !== 'object' || Array.isArray(value.runExports)) fail('E_GRAPH_SCHEMA', 'runExports must be an object', 'graph.runExports');
}

function strictDescriptor(descriptor, branchId) {
  exactObject(descriptor, [
    'branchId', 'label', 'parentBranchId', 'forkStepId', 'parentReceiptHash',
    'constructionHash', 'manifestCoreHash', 'terminalReceiptHash', 'exportedRunHash',
  ], 'E_GRAPH_SCHEMA', `branches.${branchId}`);
  if (descriptor.branchId !== branchId || !BRANCH_PATTERN.test(descriptor.branchId)) {
    fail('E_GRAPH_BRANCH', 'Branch map key and descriptor identity differ', `branches.${branchId}.branchId`);
  }
  if (normalizeLabel(descriptor.label) !== descriptor.label) fail('E_BRANCH_LABEL', 'Stored label is not NFC-normalized', `branches.${branchId}.label`);
  for (const field of ['constructionHash', 'manifestCoreHash', 'terminalReceiptHash', 'exportedRunHash']) {
    requireHash(descriptor[field], 'E_GRAPH_SCHEMA', `branches.${branchId}.${field}`);
  }
  if (descriptor.parentBranchId !== null && !BRANCH_PATTERN.test(descriptor.parentBranchId)) {
    fail('E_GRAPH_SCHEMA', 'Invalid parentBranchId', `branches.${branchId}.parentBranchId`);
  }
  if ((descriptor.forkStepId === null) !== (descriptor.parentBranchId === null)) {
    fail('E_GRAPH_BRANCH', 'Fork metadata must be null only for the root', `branches.${branchId}.forkStepId`);
  }
  if ((descriptor.parentReceiptHash === null) !== (descriptor.parentBranchId === null)) {
    fail('E_GRAPH_BRANCH', 'Parent receipt metadata must be null only for the root', `branches.${branchId}.parentReceiptHash`);
  }
  if (descriptor.forkStepId !== null) requireString(descriptor.forkStepId, 'E_GRAPH_SCHEMA', `branches.${branchId}.forkStepId`);
  if (descriptor.parentReceiptHash !== null) requireHash(descriptor.parentReceiptHash, 'E_GRAPH_SCHEMA', `branches.${branchId}.parentReceiptHash`);
}

function resolveAdapter(model, resolver) {
  if (typeof resolver !== 'function') fail('E_GRAPH_ADAPTER', `Adapter resolver required for ${model.id}@${model.version}`);
  let adapter;
  try {
    adapter = resolver(cloneAndFreeze(model));
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    fail('E_GRAPH_ADAPTER', `Adapter resolution failed for ${model.id}@${model.version}`);
  }
  if (!adapter || adapter.id !== model.id || adapter.version !== model.version || typeof adapter.transition !== 'function') {
    fail('E_GRAPH_ADAPTER', `Resolved adapter does not match ${model.id}@${model.version}`);
  }
  return adapter;
}

function parseGraphValue(graphOrExport) {
  if (typeof graphOrExport === 'string') {
    try {
      return JSON.parse(graphOrExport);
    } catch {
      fail('E_GRAPH_SCHEMA', 'RunGraph export is not valid JSON', 'graph');
    }
  }
  try {
    return JSON.parse(canonicalString(graphOrExport));
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    fail('E_GRAPH_SCHEMA', 'RunGraph value is not canonical', 'graph');
  }
}

function hydrateAndVerify(graphOrExport, resolver) {
  const suppliedRuntime = graphOrExport && typeof graphOrExport === 'object' ? runtimeByGraph.get(graphOrExport) : null;
  const value = parseGraphValue(graphOrExport);
  strictGraphShape(value);

  const actualGraphHash = sha256Hex(graphCore(value));
  if (actualGraphHash !== value.graphHash) {
    fail('E_GRAPH_HASH', 'RunGraph hash mismatch', 'graph.graphHash', value.graphHash, actualGraphHash);
  }

  const branchIds = Object.keys(value.branches).sort();
  const exportIds = Object.keys(value.runExports).sort();
  if (canonicalString(branchIds) !== canonicalString(exportIds) || branchIds.length === 0) {
    fail('E_GRAPH_BRANCH', 'Branch and run-export membership differ', 'graph.runExports');
  }
  if (value.revision !== branchIds.length - 1) fail('E_GRAPH_BRANCH', 'Revision does not match append-only membership', 'graph.revision');
  if (value.revision === 0 && value.previousGraphHash !== null) fail('E_GRAPH_BRANCH', 'Revision zero cannot have a previous graph hash', 'graph.previousGraphHash');
  if (value.revision > 0 && value.previousGraphHash === null) fail('E_GRAPH_BRANCH', 'Non-root revision requires a previous graph hash', 'graph.previousGraphHash');
  if (!value.branches[value.rootBranchId]) fail('E_GRAPH_BRANCH', 'Root branch is missing', 'graph.rootBranchId');

  const expectedGraphId = deriveGraphId(value);
  if (expectedGraphId !== value.graphId) fail('E_GRAPH_HASH', 'graphId does not match source-root commitments', 'graph.graphId', expectedGraphId, value.graphId);

  const runtimes = new Map();
  for (const branchId of branchIds) {
    const descriptor = value.branches[branchId];
    strictDescriptor(descriptor, branchId);
    const runExport = value.runExports[branchId];
    if (typeof runExport !== 'string') fail('E_GRAPH_SCHEMA', 'Run export must be a string', `runExports.${branchId}`);
    let exportedObject;
    try {
      exportedObject = JSON.parse(runExport);
    } catch {
      fail('E_GRAPH_BRANCH', 'Stored run export is invalid JSON', `runExports.${branchId}`);
    }
    if (canonicalString(exportedObject) !== runExport) fail('E_GRAPH_BRANCH', 'Stored run export is not canonical', `runExports.${branchId}`);
    if (rawUtf8Hash(runExport) !== descriptor.exportedRunHash) {
      fail('E_GRAPH_HASH', 'Run export hash mismatch', `branches.${branchId}.exportedRunHash`);
    }

    let run = suppliedRuntime?.get(branchId) ?? null;
    if (run) {
      if (normalizedRunExport(run) !== runExport) fail('E_GRAPH_BRANCH', 'Private runtime differs from graph export', `runExports.${branchId}`);
    } else {
      const adapter = resolveAdapter(exportedObject.manifest?.model ?? {}, resolver);
      const runReport = verifyRun(runExport, adapter);
      if (!runReport.ok) fail('E_GRAPH_BRANCH', `Stored run failed verification at ${runReport.firstMismatch}`, `runExports.${branchId}`);
      run = replayRun(runExport, adapter);
    }

    const runReport = verifyRun(runExport, run.adapter);
    if (!runReport.ok) fail('E_GRAPH_BRANCH', `Run failed verification at ${runReport.firstMismatch}`, `runExports.${branchId}`);
    if (run.manifest.branchId !== branchId) fail('E_GRAPH_BRANCH', 'Run manifest branch ID differs from graph identity', `runExports.${branchId}.manifest.branchId`);
    if (sha256Hex(manifestCore(run.manifest)) !== descriptor.manifestCoreHash) fail('E_GRAPH_HASH', 'Manifest-core hash mismatch', `branches.${branchId}.manifestCoreHash`);
    if (run.ledger.at(-1).receiptHash !== descriptor.terminalReceiptHash) fail('E_GRAPH_HASH', 'Terminal receipt mismatch', `branches.${branchId}.terminalReceiptHash`);
    runtimes.set(branchId, run);
  }

  const rootDescriptor = value.branches[value.rootBranchId];
  const rootRun = runtimes.get(value.rootBranchId);
  if (rootDescriptor.parentBranchId !== null || rootDescriptor.forkStepId !== null || rootDescriptor.parentReceiptHash !== null || rootRun.manifest.ancestry !== null) {
    fail('E_GRAPH_BRANCH', 'Root branch contains parent metadata', `branches.${value.rootBranchId}`);
  }
  const expectedRootConstruction = rootConstruction(value);
  const expectedRootHash = sha256Hex(expectedRootConstruction);
  if (rootDescriptor.constructionHash !== expectedRootHash || value.rootBranchId !== branchIdFromConstruction(expectedRootConstruction)) {
    fail('E_GRAPH_HASH', 'Root branch identity does not match construction', `branches.${value.rootBranchId}.constructionHash`);
  }

  const siblingLabels = new Map();
  for (const branchId of branchIds) {
    const descriptor = value.branches[branchId];
    if (branchId === value.rootBranchId) continue;
    const parentDescriptor = value.branches[descriptor.parentBranchId];
    const parentRun = runtimes.get(descriptor.parentBranchId);
    const childRun = runtimes.get(branchId);
    if (!parentDescriptor || !parentRun) fail('E_GRAPH_BRANCH', 'Parent branch is missing', `branches.${branchId}.parentBranchId`);

    const forkReceipt = parentRun.ledger.find((entry) => entry.stepId === descriptor.forkStepId && entry.receiptHash === descriptor.parentReceiptHash);
    const forkSnapstate = parentRun.snapstates.find((entry) => entry.stepId === descriptor.forkStepId);
    if (!forkReceipt || !forkSnapstate || forkReceipt.sequence !== forkSnapstate.sequence) {
      fail('E_GRAPH_BRANCH', 'Parent fork receipt is absent or inconsistent', `branches.${branchId}.parentReceiptHash`);
    }
    if (canonicalString(childRun.manifest.initialState) !== canonicalString(forkSnapstate.modelState)) {
      fail('E_GRAPH_BRANCH', 'Child initial state differs from parent fork state', `runExports.${branchId}.manifest.initialState`);
    }
    if (canonicalString(childRun.manifest.initialPrngState) !== canonicalString(forkSnapstate.prngState)) {
      fail('E_GRAPH_BRANCH', 'Child PRNG state differs from parent fork state', `runExports.${branchId}.manifest.initialPrngState`);
    }
    const ancestry = childRun.manifest.ancestry;
    if (!ancestry || ancestry.parentRunId !== parentRun.manifest.runId || ancestry.parentBranchId !== descriptor.parentBranchId || ancestry.forkStepId !== descriptor.forkStepId || ancestry.forkReceiptHash !== descriptor.parentReceiptHash) {
      fail('E_GRAPH_BRANCH', 'Child ancestry differs from graph topology', `runExports.${branchId}.manifest.ancestry`);
    }
    if (childRun.manifest.runId !== parentRun.manifest.runId || canonicalString(childRun.manifest.model) !== canonicalString(parentRun.manifest.model) || canonicalString(childRun.manifest.normalization) !== canonicalString(parentRun.manifest.normalization)) {
      fail('E_GRAPH_BRANCH', 'Child run contract differs from parent graph contract', `runExports.${branchId}.manifest`);
    }

    const expectedConstruction = childConstruction(value.graphId, descriptor.parentBranchId, parentRun, descriptor.forkStepId, childRun.manifest.inputs);
    const expectedConstructionHash = sha256Hex(expectedConstruction);
    if (descriptor.constructionHash !== expectedConstructionHash || branchId !== branchIdFromConstruction(expectedConstruction)) {
      fail('E_GRAPH_HASH', 'Child branch identity does not match construction', `branches.${branchId}.constructionHash`);
    }

    const labels = siblingLabels.get(descriptor.parentBranchId) ?? new Set();
    if (labels.has(descriptor.label)) fail('E_BRANCH_LABEL', 'Sibling labels collide after normalization', `branches.${branchId}.label`);
    labels.add(descriptor.label);
    siblingLabels.set(descriptor.parentBranchId, labels);
  }

  for (const branchId of branchIds) {
    const seen = new Set();
    let current = branchId;
    while (current !== value.rootBranchId) {
      if (seen.has(current)) fail('E_GRAPH_CYCLE', 'RunGraph contains a cycle', `branches.${branchId}.parentBranchId`);
      seen.add(current);
      const descriptor = value.branches[current];
      if (!descriptor?.parentBranchId) fail('E_GRAPH_BRANCH', 'Branch is orphaned from the root', `branches.${branchId}.parentBranchId`);
      current = descriptor.parentBranchId;
    }
  }

  const graph = cloneAndFreeze(value);
  runtimeByGraph.set(graph, runtimes);
  return { graph, runtimes };
}

function verificationReport(fields) {
  return cloneAndFreeze({
    ok: false,
    verifiedBranchCount: 0,
    firstMismatch: null,
    errorCode: 'E_GRAPH_SCHEMA',
    expectedHash: null,
    actualHash: null,
    graphId: null,
    graphHash: null,
    ...fields,
  });
}

function requireHydratedGraph(graph) {
  const runtimes = runtimeByGraph.get(graph);
  if (!runtimes) fail('E_GRAPH_BRANCH', 'RunGraph must be created or parsed before topology reads', 'graph');
  return runtimes;
}

export function createRunGraph(rootRun, label = rootRun?.manifest?.branchId) {
  const normalizedLabel = normalizeLabel(label);
  const sourceExport = assertCompleteVerifiedRun(rootRun);
  const sourceFields = {
    sourceRootRunId: rootRun.manifest.runId,
    sourceRootBranchId: rootRun.manifest.branchId,
    sourceRootManifestCoreHash: sha256Hex(manifestCore(rootRun.manifest)),
    sourceRootExportHash: rawUtf8Hash(sourceExport),
    sourceRootTerminalReceiptHash: rootRun.ledger.at(-1).receiptHash,
  };
  const graphId = deriveGraphId(sourceFields);
  const construction = rootConstruction({ graphId, ...sourceFields });
  const rootBranchId = branchIdFromConstruction(construction);
  const canonicalManifest = createManifest({
    ...rootRun.manifest,
    branchId: rootBranchId,
    ancestry: null,
    expectedTerminalReceiptHash: null,
    evidenceRuntime: 'run-graph-v1',
  });
  const canonicalRoot = replayComplete(canonicalManifest, rootRun.adapter);
  if (canonicalString(canonicalRoot.snapstates.map((entry) => entry.modelState)) !== canonicalString(rootRun.snapstates.map((entry) => entry.modelState)) || canonicalString(canonicalRoot.eventBatches) !== canonicalString(rootRun.eventBatches)) {
    fail('E_GRAPH_BRANCH', 'Content-addressing the root changed model output', 'graph.rootBranchId');
  }
  const stored = descriptorFor(canonicalRoot, normalizedLabel, sha256Hex(construction));
  return makeGraph({
    format: RUN_GRAPH_FORMAT,
    schemaVersion: RUN_GRAPH_SCHEMA_VERSION,
    graphId,
    revision: 0,
    previousGraphHash: null,
    ...sourceFields,
    rootBranchId,
    branches: { [rootBranchId]: stored.descriptor },
    runExports: { [rootBranchId]: stored.exported },
  }, new Map([[rootBranchId, canonicalRoot]]));
}

export function forkBranch(graph, request) {
  const verified = hydrateAndVerify(graph);
  exactObject(request, ['parentBranchId', 'forkStepId', 'label', ...(Object.prototype.hasOwnProperty.call(request ?? {}, 'inputs') ? ['inputs'] : [])], 'E_GRAPH_SCHEMA', 'fork request');
  const parentBranchId = requireString(request.parentBranchId, 'E_GRAPH_BRANCH', 'fork request.parentBranchId');
  const forkStepId = requireString(request.forkStepId, 'E_GRAPH_BRANCH', 'fork request.forkStepId');
  const label = normalizeLabel(request.label);
  const parentRun = verified.runtimes.get(parentBranchId);
  if (!parentRun) fail('E_GRAPH_BRANCH', `Unknown parent branch: ${parentBranchId}`, 'fork request.parentBranchId');
  const { snapstate } = findForkPoint(parentRun, forkStepId);
  const inputs = Object.prototype.hasOwnProperty.call(request, 'inputs')
    ? (() => {
      if (!Array.isArray(request.inputs)) fail('E_GRAPH_SCHEMA', 'fork request.inputs must be an array', 'fork request.inputs');
      return cloneAndFreeze(request.inputs.map((input) => createInputEnvelope(input)));
    })()
    : cloneAndFreeze(parentRun.manifest.inputs.slice(snapstate.sequence));
  const construction = childConstruction(graph.graphId, parentBranchId, parentRun, forkStepId, inputs);
  const constructionHash = sha256Hex(construction);
  const branchId = branchIdFromConstruction(construction);
  const existing = graph.branches[branchId];
  if (existing) {
    if (existing.label !== label) fail('E_BRANCH_LABEL', 'Identical branch construction already has another label', 'fork request.label');
    return Object.freeze({ graph, branch: getBranch(graph, branchId), created: false });
  }
  for (const descriptor of Object.values(graph.branches)) {
    if (descriptor.parentBranchId === parentBranchId && descriptor.label === label) {
      fail('E_BRANCH_LABEL', `Sibling label already exists: ${label}`, 'fork request.label');
    }
  }

  let child = forkRun(parentRun, forkStepId, branchId, { inputs, parentBranchId });
  for (const input of child.manifest.inputs) child = advanceRun(child, input);
  assertCompleteVerifiedRun(child);
  const parentReceiptHash = parentRun.ledger.find((entry) => entry.stepId === forkStepId).receiptHash;
  const stored = descriptorFor(child, label, constructionHash, { parentBranchId, forkStepId, parentReceiptHash });
  const { graphHash: _oldGraphHash, ...currentCore } = graph;
  const runtimes = new Map(verified.runtimes);
  runtimes.set(branchId, child);
  const nextGraph = makeGraph({
    ...currentCore,
    revision: graph.revision + 1,
    previousGraphHash: graph.graphHash,
    branches: { ...graph.branches, [branchId]: stored.descriptor },
    runExports: { ...graph.runExports, [branchId]: stored.exported },
  }, runtimes);
  return Object.freeze({ graph: nextGraph, branch: child, created: true });
}

export function getBranch(graph, branchId) {
  const normalized = requireString(branchId, 'E_GRAPH_BRANCH', 'branchId');
  const runtimes = requireHydratedGraph(graph);
  const run = runtimes.get(normalized);
  if (!run) fail('E_GRAPH_BRANCH', `Unknown branch: ${normalized}`, `branches.${normalized}`);
  return run;
}

export function listChildren(graph, branchId) {
  requireHydratedGraph(graph);
  const normalized = requireString(branchId, 'E_GRAPH_BRANCH', 'branchId');
  if (!graph?.branches?.[normalized]) fail('E_GRAPH_BRANCH', `Unknown branch: ${normalized}`, `branches.${normalized}`);
  return cloneAndFreeze(Object.values(graph.branches)
    .filter((descriptor) => descriptor.parentBranchId === normalized)
    .map((descriptor) => descriptor.branchId)
    .sort());
}

export function listAncestors(graph, branchId) {
  requireHydratedGraph(graph);
  const normalized = requireString(branchId, 'E_GRAPH_BRANCH', 'branchId');
  if (!graph?.branches?.[normalized]) fail('E_GRAPH_BRANCH', `Unknown branch: ${normalized}`, `branches.${normalized}`);
  const ancestors = [];
  const seen = new Set();
  let current = graph.branches[normalized].parentBranchId;
  while (current !== null) {
    if (seen.has(current)) fail('E_GRAPH_CYCLE', 'RunGraph contains a cycle', `branches.${normalized}.parentBranchId`);
    seen.add(current);
    const descriptor = graph.branches[current];
    if (!descriptor) fail('E_GRAPH_BRANCH', 'Branch is orphaned', `branches.${normalized}.parentBranchId`);
    ancestors.push(current);
    current = descriptor.parentBranchId;
  }
  return cloneAndFreeze(ancestors.reverse());
}

export function exportRunGraph(graph) {
  const verified = hydrateAndVerify(graph);
  return canonicalString(verified.graph);
}

export function parseRunGraph(exportedGraph, resolveAdapter) {
  return hydrateAndVerify(exportedGraph, resolveAdapter).graph;
}

export function verifyRunGraph(graphOrExport, resolveAdapter) {
  try {
    const verified = hydrateAndVerify(graphOrExport, resolveAdapter);
    return verificationReport({
      ok: true,
      verifiedBranchCount: Object.keys(verified.graph.branches).length,
      firstMismatch: null,
      errorCode: null,
      expectedHash: verified.graph.graphHash,
      actualHash: verified.graph.graphHash,
      graphId: verified.graph.graphId,
      graphHash: verified.graph.graphHash,
    });
  } catch (error) {
    const code = error instanceof TrustKernelError ? error.code : 'E_GRAPH_SCHEMA';
    const details = error instanceof TrustKernelError ? error.details : null;
    return verificationReport({
      firstMismatch: details?.path ?? 'graph',
      errorCode: code,
      expectedHash: typeof details?.expected === 'string' ? details.expected : null,
      actualHash: typeof details?.actual === 'string' ? details.actual : null,
    });
  }
}

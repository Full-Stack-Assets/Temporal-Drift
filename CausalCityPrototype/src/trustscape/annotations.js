import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

export const ANNOTATION_FORMAT = 'ripple-annotation-document';
export const ANNOTATION_SCHEMA_VERSION = '1.0.0';

function fail(code, message, path = 'annotations') {
  throw new TrustKernelError(code, message, { path });
}

function exactObject(value, keys, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, `${label} must be an object`, label);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code, `${label} must be a plain object`, label);
  if (Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) fail(code, `${label} contains hidden fields`, label);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) fail(code, `${label} contains missing or unknown fields`, label);
}

function text(value, label, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) fail('E_ANNOTATION_SCHEMA', `${label} must be a string`, label);
  return cloneAndFreeze(value);
}

function documentCore(document) {
  const { documentHash: _documentHash, ...core } = document;
  return cloneAndFreeze(core);
}

function makeDocument(actorIds, operations) {
  const sortedActors = [...new Set(actorIds.map((actorId) => text(actorId, 'actorId')))].sort();
  if (sortedActors.length === 0) fail('E_ANNOTATION_SCHEMA', 'Annotation document requires at least one actor', 'actorIds');
  const sortedOperations = [...operations].sort((left, right) => left.logicalClock - right.logicalClock || left.actorId.localeCompare(right.actorId) || left.annotationId.localeCompare(right.annotationId));
  const core = cloneAndFreeze({ format: ANNOTATION_FORMAT, schemaVersion: ANNOTATION_SCHEMA_VERSION, actorIds: sortedActors, operations: sortedOperations });
  return cloneAndFreeze({ ...core, documentHash: sha256Hex(core) });
}

function operationContent(operation, label = 'operation') {
  exactObject(operation, ['actorId', 'logicalClock', 'targetId', 'body', 'supersedes'], 'E_ANNOTATION_SCHEMA', label);
  const content = {
    actorId: text(operation.actorId, `${label}.actorId`),
    logicalClock: operation.logicalClock,
    targetId: text(operation.targetId, `${label}.targetId`),
    body: text(operation.body, `${label}.body`, true),
    supersedes: operation.supersedes,
  };
  if (!Number.isSafeInteger(content.logicalClock) || content.logicalClock < 1) fail('E_ANNOTATION_CLOCK', 'logicalClock must be a positive safe integer', `${label}.logicalClock`);
  if (content.supersedes !== null && (typeof content.supersedes !== 'string' || !/^annotation-[a-f0-9]{64}$/.test(content.supersedes))) fail('E_ANNOTATION_SCHEMA', 'supersedes must be null or an annotation ID', `${label}.supersedes`);
  return cloneAndFreeze(content);
}

function normalizeStoredOperation(operation, index) {
  exactObject(operation, ['actorId', 'logicalClock', 'targetId', 'body', 'supersedes', 'annotationId'], 'E_ANNOTATION_SCHEMA', `operations.${index}`);
  const { annotationId, ...raw } = operation;
  const content = operationContent(raw, `operations.${index}`);
  const expected = `annotation-${sha256Hex(content)}`;
  if (annotationId !== expected) fail('E_ANNOTATION_HASH', 'Annotation ID mismatch', `operations.${index}.annotationId`);
  return cloneAndFreeze({ ...content, annotationId });
}

function parseValue(document) {
  if (typeof document !== 'string') return structuredClone(document);
  try {
    return JSON.parse(document);
  } catch {
    fail('E_ANNOTATION_SCHEMA', 'Annotation document is not valid JSON', 'annotations');
  }
}

function validateDocument(documentInput) {
  const value = parseValue(documentInput);
  exactObject(value, ['format', 'schemaVersion', 'actorIds', 'operations', 'documentHash'], 'E_ANNOTATION_SCHEMA', 'annotations');
  if (value.format !== ANNOTATION_FORMAT || value.schemaVersion !== ANNOTATION_SCHEMA_VERSION) fail('E_ANNOTATION_SCHEMA', 'Unsupported annotation document version', 'annotations.schemaVersion');
  if (!Array.isArray(value.actorIds) || !Array.isArray(value.operations)) fail('E_ANNOTATION_SCHEMA', 'Annotation arrays are required', 'annotations');
  const actorIds = value.actorIds.map((actorId) => text(actorId, 'actorIds'));
  if (new Set(actorIds).size !== actorIds.length || canonicalString(actorIds) !== canonicalString([...actorIds].sort())) fail('E_ANNOTATION_SCHEMA', 'actorIds must be unique and sorted', 'actorIds');
  const operations = value.operations.map(normalizeStoredOperation);
  const ids = new Set();
  const clocks = new Map();
  for (const operation of operations) {
    if (!actorIds.includes(operation.actorId)) fail('E_ANNOTATION_SCHEMA', 'Operation actor is absent from actorIds', `operations.${operation.annotationId}.actorId`);
    if (ids.has(operation.annotationId)) fail('E_ANNOTATION_CONFLICT', 'Duplicate annotation ID', `operations.${operation.annotationId}`);
    ids.add(operation.annotationId);
    const previous = clocks.get(operation.actorId) ?? 0;
    if (operation.logicalClock <= previous) fail('E_ANNOTATION_CLOCK', 'Actor clocks must increase strictly', `operations.${operation.annotationId}.logicalClock`);
    clocks.set(operation.actorId, operation.logicalClock);
    if (operation.supersedes !== null && !ids.has(operation.supersedes) && !operations.some((candidate) => candidate.annotationId === operation.supersedes)) fail('E_ANNOTATION_SCHEMA', 'supersedes references an unknown annotation', `operations.${operation.annotationId}.supersedes`);
  }
  const expected = makeDocument(actorIds, operations);
  if (canonicalString(expected.operations) !== canonicalString(operations)) fail('E_ANNOTATION_SCHEMA', 'Operations are not canonically ordered', 'operations');
  if (value.documentHash !== expected.documentHash) fail('E_ANNOTATION_HASH', 'Annotation document hash mismatch', 'documentHash');
  return expected;
}

export function createAnnotationDocument(actorId) {
  return makeDocument([actorId], []);
}

export function appendAnnotation(documentInput, operationInput) {
  const document = validateDocument(documentInput);
  const content = operationContent(operationInput);
  if (!document.actorIds.includes(content.actorId)) fail('E_ANNOTATION_SCHEMA', 'Operation actor is absent from this document', 'operation.actorId');
  const maximum = document.operations.filter((operation) => operation.actorId === content.actorId).reduce((value, operation) => Math.max(value, operation.logicalClock), 0);
  if (content.logicalClock <= maximum) fail('E_ANNOTATION_CLOCK', 'logicalClock must advance the actor history', 'operation.logicalClock');
  if (content.supersedes !== null && !document.operations.some((operation) => operation.annotationId === content.supersedes)) fail('E_ANNOTATION_SCHEMA', 'supersedes references an unknown annotation', 'operation.supersedes');
  const operation = cloneAndFreeze({ ...content, annotationId: `annotation-${sha256Hex(content)}` });
  if (document.operations.some((entry) => entry.annotationId === operation.annotationId)) fail('E_ANNOTATION_CONFLICT', 'Duplicate annotation operation', `operations.${operation.annotationId}`);
  return makeDocument(document.actorIds, [...document.operations, operation]);
}

export function mergeAnnotationDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) fail('E_ANNOTATION_SCHEMA', 'At least one annotation document is required', 'documents');
  const verified = documents.map(validateDocument);
  const actorIds = verified.flatMap((document) => document.actorIds);
  const byId = new Map();
  for (const document of verified) {
    for (const operation of document.operations) {
      const existing = byId.get(operation.annotationId);
      if (existing && canonicalString(existing) !== canonicalString(operation)) fail('E_ANNOTATION_CONFLICT', 'Same annotation ID has conflicting bytes', `operations.${operation.annotationId}`);
      byId.set(operation.annotationId, operation);
    }
  }
  const operations = [...byId.values()];
  const clockKeys = new Set();
  for (const operation of operations) {
    const key = `${operation.actorId}\u0000${operation.logicalClock}`;
    if (clockKeys.has(key)) fail('E_ANNOTATION_CONFLICT', 'Actor has conflicting operations at one logical clock', `operations.${operation.actorId}.${operation.logicalClock}`);
    clockKeys.add(key);
  }
  return makeDocument(actorIds, operations);
}

export function exportAnnotationDocument(document) {
  return canonicalString(validateDocument(document));
}

export function parseAnnotationDocument(exported) {
  const value = validateDocument(exported);
  if (typeof exported === 'string' && canonicalString(value) !== exported) fail('E_ANNOTATION_SCHEMA', 'Annotation export is not canonical', 'annotations');
  return value;
}

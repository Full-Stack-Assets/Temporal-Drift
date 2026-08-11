import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

const TARGET_TYPES = new Set(['branch', 'snapstate', 'receipt', 'anomaly']);
const ANNOTATION_PATTERN = /^annotation-[a-f0-9]{64}$/;

function fail(message, path = 'annotation') {
  throw new TrustKernelError('E_ANNOTATION_SCHEMA', message, { path });
}

function assertPlainExactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`${label} must be a plain object`, label);
  }
  if (Reflect.ownKeys(value).length !== keys.length) fail(`${label} contains missing, hidden, symbol, or unknown fields`, label);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) fail(`${label}.${key} must be an enumerable data property`, `${label}.${key}`);
  }
}

function requiredString(value, path) {
  if (typeof value !== 'string' || value.length === 0) fail(`${path} must be a non-empty string`, path);
  return cloneAndFreeze(value);
}

function coreFromFields(fields) {
  return cloneAndFreeze({
    authorId: fields.authorId,
    targetType: fields.targetType,
    targetId: fields.targetId,
    body: fields.body,
    createdLogicalTime: fields.createdLogicalTime,
    supersedes: fields.supersedes,
  });
}

export function createAnnotation(fields) {
  assertPlainExactObject(fields, ['authorId', 'targetType', 'targetId', 'body', 'createdLogicalTime', 'supersedes'], 'annotation');
  const authorId = requiredString(fields.authorId, 'annotation.authorId');
  const targetType = requiredString(fields.targetType, 'annotation.targetType');
  if (!TARGET_TYPES.has(targetType)) fail(`Unsupported target type: ${targetType}`, 'annotation.targetType');
  const targetId = requiredString(fields.targetId, 'annotation.targetId');
  const body = requiredString(fields.body, 'annotation.body');
  if (!Number.isSafeInteger(fields.createdLogicalTime) || fields.createdLogicalTime < 0) {
    fail('annotation.createdLogicalTime must be a non-negative safe integer', 'annotation.createdLogicalTime');
  }
  const supersedes = fields.supersedes === null ? null : requiredString(fields.supersedes, 'annotation.supersedes');
  if (supersedes !== null && !ANNOTATION_PATTERN.test(supersedes)) fail('annotation.supersedes must be an annotation ID', 'annotation.supersedes');

  const core = coreFromFields({ authorId, targetType, targetId, body, createdLogicalTime: fields.createdLogicalTime, supersedes });
  return cloneAndFreeze({ annotationId: `annotation-${sha256Hex(core)}`, ...core });
}

export function normalizeAnnotations(records = []) {
  if (!Array.isArray(records)) fail('annotations must be an array', 'annotations');
  const normalized = records.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) fail('annotation record must be an object', `annotations.${index}`);
    const expectedKeys = ['annotationId', 'authorId', 'targetType', 'targetId', 'body', 'createdLogicalTime', 'supersedes'];
    assertPlainExactObject(record, expectedKeys, `annotations.${index}`);
    const recreated = createAnnotation({
      authorId: record.authorId,
      targetType: record.targetType,
      targetId: record.targetId,
      body: record.body,
      createdLogicalTime: record.createdLogicalTime,
      supersedes: record.supersedes,
    });
    if (record.annotationId !== recreated.annotationId) fail('annotationId does not match annotation content', `annotations.${index}.annotationId`);
    return recreated;
  });

  normalized.sort((a, b) => a.annotationId.localeCompare(b.annotationId));
  const ids = new Set();
  for (const record of normalized) {
    if (ids.has(record.annotationId)) fail(`duplicate annotationId: ${record.annotationId}`, 'annotations');
    ids.add(record.annotationId);
  }
  return cloneAndFreeze(normalized);
}

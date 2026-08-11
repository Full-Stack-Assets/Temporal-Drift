import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  createTrustscapeScene as createTrustscapeSceneBase,
  verifyTrustscapeScene as verifyTrustscapeSceneBase,
} from './scene.js';

function without(value, key) {
  const result = { ...value };
  delete result[key];
  return result;
}

function sceneCore(scene) {
  return without(scene, 'sceneHash');
}

function parseScene(value) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    const error = new TrustKernelError('E_TRUSTSCAPE_SCHEMA', 'Scene is not valid JSON', { path: 'scene' });
    throw error;
  }
}

function contentAddress(prefix, content) {
  return `${prefix}-${sha256Hex(content)}`;
}

function hardenScene(sceneInput) {
  const scene = parseScene(sceneInput);
  const objectMap = new Map();
  const objects = scene.objects.map((object) => {
    const content = without(object, 'objectId');
    const objectId = contentAddress('object', content);
    objectMap.set(object.objectId, objectId);
    return cloneAndFreeze({ ...content, objectId });
  }).sort((left, right) => left.objectId.localeCompare(right.objectId));
  const threads = scene.threads.map((entry) => {
    const content = {
      ...without(entry, 'threadId'),
      fromObjectId: objectMap.get(entry.fromObjectId),
      toObjectId: objectMap.get(entry.toObjectId),
    };
    return cloneAndFreeze({ ...content, threadId: contentAddress('thread', content) });
  }).sort((left, right) => left.threadId.localeCompare(right.threadId));
  const comparisons = scene.comparisons.map((entry) => {
    const content = {
      ...without(entry, 'comparisonId'),
      leftObjectId: objectMap.get(entry.leftObjectId),
      rightObjectId: objectMap.get(entry.rightObjectId),
    };
    return cloneAndFreeze({ ...content, comparisonId: contentAddress('comparison', content) });
  }).sort((left, right) => left.comparisonId.localeCompare(right.comparisonId));
  const radar = scene.radar.map((entry) => {
    const content = {
      ...without(entry, 'radarId'),
      targetObjectId: objectMap.get(entry.targetObjectId),
      subjectiveObjectId: objectMap.get(entry.subjectiveObjectId),
    };
    return cloneAndFreeze({ ...content, radarId: contentAddress('radar', content) });
  }).sort((left, right) => left.radarId.localeCompare(right.radarId));
  const core = cloneAndFreeze({ ...sceneCore(scene), objects, threads, comparisons, radar });
  return cloneAndFreeze({ ...core, sceneHash: sha256Hex(core) });
}

function assertSceneContentIds(scene) {
  const objectIds = new Set();
  for (const object of scene.objects) {
    const expected = contentAddress('object', without(object, 'objectId'));
    if (object.objectId !== expected) throw new TrustKernelError('E_TRUSTSCAPE_HASH', 'Scene object content ID mismatch', { path: `scene.objects.${object.objectId}`, expected, actual: object.objectId });
    if (objectIds.has(object.objectId)) throw new TrustKernelError('E_TRUSTSCAPE_REFERENCE', 'Duplicate scene object ID', { path: `scene.objects.${object.objectId}` });
    objectIds.add(object.objectId);
  }
  for (const entry of scene.threads) {
    const expected = contentAddress('thread', without(entry, 'threadId'));
    if (entry.threadId !== expected) throw new TrustKernelError('E_TRUSTSCAPE_HASH', 'Scene thread content ID mismatch', { path: `scene.threads.${entry.threadId}`, expected, actual: entry.threadId });
    if (!objectIds.has(entry.fromObjectId) || !objectIds.has(entry.toObjectId)) throw new TrustKernelError('E_TRUSTSCAPE_REFERENCE', 'Scene thread references an unknown object', { path: `scene.threads.${entry.threadId}` });
  }
  for (const entry of scene.comparisons) {
    const expected = contentAddress('comparison', without(entry, 'comparisonId'));
    if (entry.comparisonId !== expected) throw new TrustKernelError('E_TRUSTSCAPE_HASH', 'Scene comparison content ID mismatch', { path: `scene.comparisons.${entry.comparisonId}`, expected, actual: entry.comparisonId });
    if (!objectIds.has(entry.leftObjectId) || !objectIds.has(entry.rightObjectId)) throw new TrustKernelError('E_TRUSTSCAPE_REFERENCE', 'Scene comparison references an unknown object', { path: `scene.comparisons.${entry.comparisonId}` });
  }
  for (const entry of scene.radar) {
    const expected = contentAddress('radar', without(entry, 'radarId'));
    if (entry.radarId !== expected) throw new TrustKernelError('E_TRUSTSCAPE_HASH', 'Scene radar content ID mismatch', { path: `scene.radar.${entry.radarId}`, expected, actual: entry.radarId });
    if (!objectIds.has(entry.targetObjectId) || !objectIds.has(entry.subjectiveObjectId)) throw new TrustKernelError('E_TRUSTSCAPE_REFERENCE', 'Scene radar references an unknown object', { path: `scene.radar.${entry.radarId}` });
  }
}

function report(fields = {}) {
  return cloneAndFreeze({ ok: false, sceneHash: null, firstMismatch: null, errorCode: 'E_TRUSTSCAPE_SCHEMA', ...fields });
}

export function createTrustscapeScene(projection, view = {}) {
  return hardenScene(createTrustscapeSceneBase(projection, view));
}

export function exportTrustscapeScene(sceneInput) {
  const result = verifyTrustscapeScene(sceneInput);
  if (!result.ok) throw new TrustKernelError(result.errorCode, 'Trustscape scene failed verification', { path: result.firstMismatch ?? 'scene' });
  return canonicalString(parseScene(sceneInput));
}

export function verifyTrustscapeScene(sceneInput, projection = null) {
  const base = verifyTrustscapeSceneBase(sceneInput);
  if (!base.ok) return base;
  try {
    const scene = parseScene(sceneInput);
    assertSceneContentIds(scene);
    if (projection !== null) {
      const reproduced = createTrustscapeScene(projection, scene.view);
      if (canonicalString(reproduced) !== canonicalString(scene)) throw new TrustKernelError('E_TRUSTSCAPE_SOURCE', 'Scene does not reproduce from the projection', { path: 'scene' });
    }
    return report({ ok: true, sceneHash: scene.sceneHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return report({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'scene' : 'scene',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_TRUSTSCAPE_SCHEMA',
    });
  }
}

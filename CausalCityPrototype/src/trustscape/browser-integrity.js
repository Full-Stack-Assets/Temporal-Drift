const ANNOTATION_TARGETS = new Set(['branch', 'snapstate', 'receipt', 'anomaly']);
const ANNOTATION_PATTERN = /^annotation-[a-f0-9]{64}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function validateUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('String contains an unpaired high surrogate');
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error('String contains an unpaired low surrogate');
    }
  }
}

function normalizedString(value) {
  validateUnicode(value);
  return value.normalize('NFC');
}

function compareUtf8(left, right) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
}

function normalizeCanonical(value, stack = new Set()) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return normalizedString(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || Object.is(value, -0)) throw new Error('Only finite integers other than negative zero are canonical');
    if (!Number.isSafeInteger(value)) throw new Error('Integer exceeds the JavaScript safe-integer range');
    return value;
  }
  if (typeof value !== 'object') throw new Error(`Unsupported canonical type: ${typeof value}`);
  if (stack.has(value)) throw new Error('Canonical values cannot contain cycles');
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      const allowed = new Set(['length', ...Array.from({ length: value.length }, (_, index) => String(index))]);
      if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowed.has(key))) throw new Error('Arrays cannot contain non-index properties');
      for (let index = 0; index < value.length; index += 1) if (!hasOwn(value, index)) throw new Error('Sparse arrays are not canonical');
      return value.map((entry) => normalizeCanonical(entry, stack));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new Error('Only plain objects are canonical');
    if (Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) {
      throw new Error('Symbol or hidden object keys are not canonical');
    }
    const normalizedKeys = new Set();
    const entries = [];
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !hasOwn(descriptor, 'value')) throw new Error('Accessors are not canonical');
      const normalizedKey = normalizedString(key);
      if (normalizedKeys.has(normalizedKey)) throw new Error(`Object keys collide after NFC normalization: ${normalizedKey}`);
      normalizedKeys.add(normalizedKey);
      entries.push([normalizedKey, normalizeCanonical(descriptor.value, stack)]);
    }
    entries.sort(([left], [right]) => compareUtf8(left, right));
    return Object.fromEntries(entries);
  } finally {
    stack.delete(value);
  }
}

export function canonicalBrowserString(value) {
  return JSON.stringify(normalizeCanonical(value));
}

async function sha256Text(text) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256Canonical(value) {
  return sha256Text(canonicalBrowserString(value));
}

function exactDataObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} must be a plain object`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) {
    throw new Error(`${label} contains unknown, missing, hidden, or symbol fields`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !hasOwn(descriptor, 'value')) throw new Error(`${label}.${key} must be an enumerable data property`);
  }
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return normalizedString(value);
}

function annotationCore(fields) {
  exactDataObject(fields, ['authorId', 'targetType', 'targetId', 'body', 'createdLogicalTime', 'supersedes'], 'annotation');
  const targetType = requiredString(fields.targetType, 'annotation.targetType');
  if (!ANNOTATION_TARGETS.has(targetType)) throw new Error(`Unsupported target type: ${targetType}`);
  if (!Number.isSafeInteger(fields.createdLogicalTime) || fields.createdLogicalTime < 0) throw new Error('annotation.createdLogicalTime must be a non-negative safe integer');
  const supersedes = fields.supersedes === null ? null : requiredString(fields.supersedes, 'annotation.supersedes');
  if (supersedes !== null && !ANNOTATION_PATTERN.test(supersedes)) throw new Error('annotation.supersedes must be an annotation ID');
  return {
    authorId: requiredString(fields.authorId, 'annotation.authorId'),
    targetType,
    targetId: requiredString(fields.targetId, 'annotation.targetId'),
    body: requiredString(fields.body, 'annotation.body'),
    createdLogicalTime: fields.createdLogicalTime,
    supersedes,
  };
}

export async function deriveBrowserAnnotation(fields) {
  const core = annotationCore(fields);
  return { annotationId: `annotation-${await sha256Canonical(core)}`, ...core };
}

export async function validateBrowserAnnotationBundle(graphId, bundle) {
  const normalizedGraphId = requiredString(graphId, 'graphId');
  exactDataObject(bundle, ['format', 'schemaVersion', 'graphId', 'annotations'], 'annotation bundle');
  if (bundle.format !== 'trustscape-local-annotations' || bundle.schemaVersion !== '1.0.0' || bundle.graphId !== normalizedGraphId || !Array.isArray(bundle.annotations)) {
    throw new Error('Annotation bundle is incompatible with this graph');
  }
  const annotations = [];
  const ids = new Set();
  for (let index = 0; index < bundle.annotations.length; index += 1) {
    const record = bundle.annotations[index];
    exactDataObject(record, ['annotationId', 'authorId', 'targetType', 'targetId', 'body', 'createdLogicalTime', 'supersedes'], `annotations.${index}`);
    if (typeof record.annotationId !== 'string' || !ANNOTATION_PATTERN.test(record.annotationId)) throw new Error(`annotations.${index}.annotationId is invalid`);
    const recreated = await deriveBrowserAnnotation({
      authorId: record.authorId,
      targetType: record.targetType,
      targetId: record.targetId,
      body: record.body,
      createdLogicalTime: record.createdLogicalTime,
      supersedes: record.supersedes,
    });
    if (record.annotationId !== recreated.annotationId) throw new Error(`annotations.${index}.annotationId does not match annotation content`);
    if (ids.has(record.annotationId)) throw new Error(`Duplicate annotationId: ${record.annotationId}`);
    ids.add(record.annotationId);
    annotations.push(recreated);
  }
  annotations.sort((left, right) => left.annotationId.localeCompare(right.annotationId));
  return { format: 'trustscape-local-annotations', schemaVersion: '1.0.0', graphId: normalizedGraphId, annotations };
}

export async function verifyTrustscapeFixture(fixture) {
  try {
    if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) return false;
    if (fixture.format !== 'trustscape-lite-fixture' || fixture.schemaVersion !== '1.0.0') return false;
    if (typeof fixture.fixtureHash !== 'string' || !HASH_PATTERN.test(fixture.fixtureHash)) return false;
    if (typeof fixture.sourceProjectionHash !== 'string' || !HASH_PATTERN.test(fixture.sourceProjectionHash)) return false;
    if (typeof fixture.sourceGraphHash !== 'string' || !HASH_PATTERN.test(fixture.sourceGraphHash)) return false;
    if (typeof fixture.sourceSceneHash !== 'string' || !HASH_PATTERN.test(fixture.sourceSceneHash)) return false;
    const { fixtureHash, ...core } = fixture;
    return await sha256Canonical(core) === fixtureHash;
  } catch {
    return false;
  }
}

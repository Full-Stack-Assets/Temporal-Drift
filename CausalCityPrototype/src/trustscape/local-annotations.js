const FORMAT = 'trustscape-local-annotations';
const VERSION = '1.0.0';

function key(graphId) {
  return `ripple:trustscape:annotations:${VERSION}:${graphId}`;
}

function normalizeString(value, name) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} must be a non-empty string`);
  return value.normalize('NFC');
}

function canonicalCore(fields) {
  // Annotation canonical-v1 keys are emitted in sorted UTF-8 order.
  return JSON.stringify({
    authorId: normalizeString(fields.authorId, 'authorId'),
    body: normalizeString(fields.body, 'body'),
    createdLogicalTime: fields.createdLogicalTime,
    supersedes: fields.supersedes,
    targetId: normalizeString(fields.targetId, 'targetId'),
    targetType: normalizeString(fields.targetType, 'targetType'),
  });
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function validateTargetType(value) {
  if (!['branch', 'snapstate', 'receipt'].includes(value)) throw new Error(`Unsupported target type: ${value}`);
  return value;
}

function normalizeBundle(graphId, bundle) {
  if (!bundle || bundle.format !== FORMAT || bundle.schemaVersion !== VERSION || bundle.graphId !== graphId || !Array.isArray(bundle.annotations)) {
    throw new Error('Annotation bundle is incompatible with this graph');
  }
  return {
    format: FORMAT,
    schemaVersion: VERSION,
    graphId,
    annotations: [...bundle.annotations].sort((a, b) => a.annotationId.localeCompare(b.annotationId)),
  };
}

export function loadAnnotations(graphId) {
  const raw = localStorage.getItem(key(graphId));
  if (!raw) return [];
  try {
    return normalizeBundle(graphId, JSON.parse(raw)).annotations;
  } catch {
    return [];
  }
}

export async function appendAnnotation(graphId, fields) {
  const current = loadAnnotations(graphId);
  const nextLogicalTime = current.reduce((max, record) => Math.max(max, record.createdLogicalTime), -1) + 1;
  const core = {
    authorId: normalizeString(fields.authorId, 'authorId'),
    body: normalizeString(fields.body, 'body'),
    createdLogicalTime: nextLogicalTime,
    supersedes: fields.supersedes ?? null,
    targetId: normalizeString(fields.targetId, 'targetId'),
    targetType: validateTargetType(fields.targetType),
  };
  const annotationId = `annotation-${await sha256Hex(canonicalCore(core))}`;
  const annotation = { annotationId, ...core };
  const annotations = [...current.filter((record) => record.annotationId !== annotationId), annotation]
    .sort((a, b) => a.annotationId.localeCompare(b.annotationId));
  const bundle = { format: FORMAT, schemaVersion: VERSION, graphId, annotations };
  localStorage.setItem(key(graphId), JSON.stringify(bundle));
  return annotation;
}

export function exportAnnotations(graphId) {
  return JSON.stringify({
    format: FORMAT,
    schemaVersion: VERSION,
    graphId,
    annotations: loadAnnotations(graphId),
  });
}

export function importAnnotations(graphId, json) {
  const parsed = JSON.parse(json);
  const bundle = normalizeBundle(graphId, parsed);
  localStorage.setItem(key(graphId), JSON.stringify(bundle));
  return bundle.annotations;
}

export function clearAnnotations(graphId) {
  localStorage.removeItem(key(graphId));
}

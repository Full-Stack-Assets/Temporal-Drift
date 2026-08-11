import { deriveBrowserAnnotation, validateBrowserAnnotationBundle } from './browser-integrity.js';

const FORMAT = 'trustscape-local-annotations';
const VERSION = '1.0.0';

function key(graphId) {
  return `ripple:trustscape:annotations:${VERSION}:${graphId}`;
}

export async function loadAnnotations(graphId) {
  const raw = localStorage.getItem(key(graphId));
  if (!raw) return [];
  try {
    const bundle = await validateBrowserAnnotationBundle(graphId, JSON.parse(raw));
    return bundle.annotations;
  } catch {
    return [];
  }
}

export async function appendAnnotation(graphId, fields) {
  const current = await loadAnnotations(graphId);
  const nextLogicalTime = current.reduce((max, record) => Math.max(max, record.createdLogicalTime), -1) + 1;
  const annotation = await deriveBrowserAnnotation({
    authorId: fields.authorId,
    body: fields.body,
    createdLogicalTime: nextLogicalTime,
    supersedes: fields.supersedes ?? null,
    targetId: fields.targetId,
    targetType: fields.targetType,
  });
  const annotations = [...current.filter((record) => record.annotationId !== annotation.annotationId), annotation]
    .sort((a, b) => a.annotationId.localeCompare(b.annotationId));
  const bundle = await validateBrowserAnnotationBundle(graphId, { format: FORMAT, schemaVersion: VERSION, graphId, annotations });
  localStorage.setItem(key(graphId), JSON.stringify(bundle));
  return annotation;
}

export async function exportAnnotations(graphId) {
  return JSON.stringify({
    format: FORMAT,
    schemaVersion: VERSION,
    graphId,
    annotations: await loadAnnotations(graphId),
  });
}

export async function importAnnotations(graphId, json) {
  const parsed = JSON.parse(json);
  const bundle = await validateBrowserAnnotationBundle(graphId, parsed);
  localStorage.setItem(key(graphId), JSON.stringify(bundle));
  return bundle.annotations;
}

export function clearAnnotations(graphId) {
  localStorage.removeItem(key(graphId));
}

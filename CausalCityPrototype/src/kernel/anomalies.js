import { sha256Hex } from './canonicalize.js';
import { TrustKernelError } from './errors.js';
import { cloneAndFreeze } from './immutable.js';

const SEVERITIES = new Set(['info', 'warning', 'critical']);
const OUTCOMES = new Set(['acknowledged', 'accepted_as_observation', 'rejected_as_invalid', 'resolved_by_later_version']);

function fail(message) {
  throw new TrustKernelError('E_ANOMALY_SCHEMA', message);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) fail(`${label} contains missing or unknown fields`);
}

function text(value, label, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) fail(`${label} must be a string`);
}

function validateRegistry(registry) {
  exactKeys(registry, ['records', 'reviews'], 'registry');
  if (!Array.isArray(registry.records) || !Array.isArray(registry.reviews)) fail('Registry arrays are required');
}

function normalizeAnomaly(value) {
  exactKeys(value, [
    'runId', 'branchId', 'stepId', 'metricPath', 'expected', 'observed', 'unit',
    'scale', 'sourceRef', 'sourceVersion', 'severity',
  ], 'anomaly');
  for (const key of ['runId', 'branchId', 'stepId', 'metricPath', 'unit', 'sourceRef', 'sourceVersion']) text(value[key], key);
  for (const key of ['expected', 'observed']) if (!Number.isSafeInteger(value[key])) fail(`${key} must be a safe integer`);
  if (!Number.isSafeInteger(value.scale) || value.scale < 1) fail('scale must be a positive safe integer');
  if (!SEVERITIES.has(value.severity)) fail('severity is invalid');
  const delta = value.observed - value.expected;
  if (!Number.isSafeInteger(delta)) fail('delta exceeds the safe-integer range');
  const content = cloneAndFreeze({ schemaVersion: '1.0.0', ...value, delta, requiresHumanReview: true });
  return cloneAndFreeze({
    ...content,
    anomalyId: `anomaly-${sha256Hex(content)}`,
  });
}

export function createAnomalyRegistry() {
  return cloneAndFreeze({ records: [], reviews: [] });
}

export function recordAnomaly(registry, anomaly) {
  validateRegistry(registry);
  const record = normalizeAnomaly(anomaly);
  if (registry.records.some((entry) => entry.anomalyId === record.anomalyId)) fail(`Duplicate anomaly: ${record.anomalyId}`);
  return cloneAndFreeze({ records: [...registry.records, record], reviews: registry.reviews });
}

export function appendAnomalyReview(registry, review) {
  validateRegistry(registry);
  exactKeys(review, ['anomalyId', 'outcome', 'reviewerId', 'note'], 'review');
  text(review.anomalyId, 'anomalyId');
  text(review.reviewerId, 'reviewerId');
  text(review.note, 'note', true);
  if (!OUTCOMES.has(review.outcome)) fail('review outcome is invalid');
  if (!registry.records.some((record) => record.anomalyId === review.anomalyId)) fail('review references an unknown anomaly');
  const content = cloneAndFreeze({ schemaVersion: '1.0.0', ...review });
  const event = cloneAndFreeze({ ...content, reviewId: `review-${sha256Hex(content)}` });
  if (registry.reviews.some((entry) => entry.reviewId === event.reviewId)) fail(`Duplicate review: ${event.reviewId}`);
  return cloneAndFreeze({ records: registry.records, reviews: [...registry.reviews, event] });
}

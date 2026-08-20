import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

function fail(message, path = 'anomalyReview') {
  throw new TrustKernelError('E_ANOMALY_REVIEW_SCHEMA', message, { path });
}

function exactObject(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(`${path} must be a plain object`, path);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key))) fail(`${path} contains missing, hidden, symbol, or unknown fields`, path);
}

function thresholds(value) {
  exactObject(value, ['watch', 'warning', 'critical'], 'thresholds');
  for (const key of ['watch', 'warning', 'critical']) if (!Number.isSafeInteger(value[key]) || value[key] < 0) fail(`thresholds.${key} must be a non-negative safe integer`, `thresholds.${key}`);
  if (!(value.watch < value.warning && value.warning < value.critical)) fail('thresholds must increase strictly: watch < warning < critical', 'thresholds');
  return cloneAndFreeze({ watch: value.watch, warning: value.warning, critical: value.critical });
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('record must be an anomaly object', 'record');
  if (typeof record.anomalyId !== 'string' || !/^anomaly-[a-f0-9]{64}$/u.test(record.anomalyId)) fail('record.anomalyId is invalid', 'record.anomalyId');
  if (!Number.isSafeInteger(record.delta)) fail('record.delta must be a safe integer', 'record.delta');
  if (record.requiresHumanReview !== true) fail('source anomaly must require human review', 'record.requiresHumanReview');
  return record;
}

function absoluteSafe(value) {
  const absolute = value < 0 ? -value : value;
  if (!Number.isSafeInteger(absolute)) fail('absolute anomaly delta exceeds safe-integer range', 'record.delta');
  return absolute;
}

export function classifyAnomalyForReview(record, rawThresholds) {
  validateRecord(record);
  const limits = thresholds(rawThresholds);
  const absoluteDelta = absoluteSafe(record.delta);
  let classification = 'informational';
  if (absoluteDelta >= limits.critical) classification = 'critical';
  else if (absoluteDelta >= limits.warning) classification = 'warning';
  else if (absoluteDelta >= limits.watch) classification = 'watch';

  const core = cloneAndFreeze({
    anomalyId: record.anomalyId,
    runId: record.runId,
    branchId: record.branchId,
    stepId: record.stepId,
    metricPath: record.metricPath,
    delta: record.delta,
    absoluteDelta,
    classification,
    thresholds: limits,
    advisoryOnly: true,
    humanReviewRequired: true,
    autoForkAllowed: false,
    autoCalibrationAllowed: false,
  });
  return cloneAndFreeze({ ...core, classificationHash: sha256Hex(core) });
}

const PRIORITY = Object.freeze({ critical: 3, warning: 2, watch: 1, informational: 0 });

export function createAnomalyReviewQueue(records, rawThresholds) {
  if (!Array.isArray(records)) fail('records must be an array', 'records');
  const limits = thresholds(rawThresholds);
  const items = records.map((record) => classifyAnomalyForReview(record, limits));
  items.sort((left, right) => PRIORITY[right.classification] - PRIORITY[left.classification]
    || right.absoluteDelta - left.absoluteDelta
    || left.anomalyId.localeCompare(right.anomalyId));

  const core = cloneAndFreeze({
    format: 'ripple-anomaly-review-queue',
    schemaVersion: '1.0.0',
    thresholds: limits,
    advisoryOnly: true,
    humanReviewRequired: true,
    autoForkAllowed: false,
    autoCalibrationAllowed: false,
    items,
  });
  return cloneAndFreeze({ ...core, queueHash: sha256Hex(core) });
}

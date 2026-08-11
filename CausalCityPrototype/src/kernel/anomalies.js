import { deepCloneFreeze } from './immutable.js';
import { hashCanonical } from './canonicalize.js';
import { TrustKernelError } from './errors.js';

const OUTCOMES = new Set(['acknowledged', 'accepted_as_observation', 'rejected_as_invalid', 'resolved_by_later_version']);
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info']);

function emptyRegistry() { return deepCloneFreeze({ records: [], reviews: [] }); }
function requireString(value, field) {
  if (typeof value !== 'string' || value.length === 0) throw new TrustKernelError('E_ANOMALY_SCHEMA', `${field} required`);
}

export function recordAnomaly(registry = emptyRegistry(), anomaly) {
  try {
    requireString(anomaly.runId, 'runId');
    requireString(anomaly.branchId, 'branchId');
    requireString(anomaly.stepId, 'stepId');
    if (!Array.isArray(anomaly.metricPath) || anomaly.metricPath.length === 0 || anomaly.metricPath.some((value) => typeof value !== 'string')) throw new Error('metricPath');
    if (!Number.isSafeInteger(anomaly.expected) || !Number.isSafeInteger(anomaly.observed) || !Number.isSafeInteger(anomaly.scale) || anomaly.scale <= 0) throw new Error('integers');
    requireString(anomaly.unit, 'unit');
    requireString(anomaly.sourceRef, 'sourceRef');
    requireString(anomaly.sourceVersion, 'sourceVersion');
    if (!SEVERITIES.has(anomaly.severity)) throw new Error('severity');
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    throw new TrustKernelError('E_ANOMALY_SCHEMA', 'Invalid anomaly record');
  }
  const payload = {
    runId: anomaly.runId,
    branchId: anomaly.branchId,
    stepId: anomaly.stepId,
    metricPath: anomaly.metricPath,
    expected: anomaly.expected,
    observed: anomaly.observed,
    unit: anomaly.unit,
    scale: anomaly.scale,
    delta: anomaly.observed - anomaly.expected,
    sourceRef: anomaly.sourceRef,
    sourceVersion: anomaly.sourceVersion,
    severity: anomaly.severity,
    requiresHumanReview: true,
  };
  const record = deepCloneFreeze({ id: hashCanonical(payload), ...payload });
  return deepCloneFreeze({ records: [...registry.records, record], reviews: [...registry.reviews] });
}

export function appendAnomalyReview(registry = emptyRegistry(), review) {
  if (!review || typeof review !== 'object' || typeof review.anomalyId !== 'string' || typeof review.reviewer !== 'string' || !OUTCOMES.has(review.outcome)) {
    throw new TrustKernelError('E_ANOMALY_SCHEMA', 'Invalid anomaly review');
  }
  if (!registry.records.some((record) => record.id === review.anomalyId)) throw new TrustKernelError('E_ANOMALY_SCHEMA', 'Review references unknown anomaly');
  const payload = { anomalyId: review.anomalyId, outcome: review.outcome, reviewer: review.reviewer };
  const event = deepCloneFreeze({ id: hashCanonical(payload), ...payload });
  return deepCloneFreeze({ records: [...registry.records], reviews: [...registry.reviews, event] });
}

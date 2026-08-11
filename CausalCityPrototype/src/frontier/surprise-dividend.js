import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

function fail(message, path = 'surprises') {
  throw new TrustKernelError('E_SURPRISE_SCHEMA', message, { path });
}

function exactRecord(record, index) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || Object.getPrototypeOf(record) !== Object.prototype) fail(`surprises.${index} must be a plain object`, `surprises.${index}`);
  const keys = ['surpriseId', 'delta', 'persistence', 'sourceHash'];
  const own = Reflect.ownKeys(record);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key))) fail(`surprises.${index} contains unknown or missing fields`, `surprises.${index}`);
  if (typeof record.surpriseId !== 'string' || record.surpriseId.length === 0) fail('surpriseId must be a non-empty string', `surprises.${index}.surpriseId`);
  if (!Number.isSafeInteger(record.delta)) fail('delta must be a safe integer', `surprises.${index}.delta`);
  if (!Number.isSafeInteger(record.persistence) || record.persistence < 0) fail('persistence must be a non-negative safe integer', `surprises.${index}.persistence`);
  if (typeof record.sourceHash !== 'string' || !/^[a-f0-9]{64}$/u.test(record.sourceHash)) fail('sourceHash must be SHA-256', `surprises.${index}.sourceHash`);
}

function safeScore(delta, persistence) {
  const magnitude = BigInt(delta < 0 ? -delta : delta);
  const score = magnitude * BigInt(persistence);
  if (score > BigInt(Number.MAX_SAFE_INTEGER)) fail('surprise score exceeds safe-integer range', 'surprises.score');
  return Number(score);
}

export function rankSurprises(records) {
  if (!Array.isArray(records)) fail('surprises must be an array');
  const items = records.map((record, index) => {
    exactRecord(record, index);
    return cloneAndFreeze({
      surpriseId: record.surpriseId.normalize('NFC'),
      delta: record.delta,
      absoluteDelta: record.delta < 0 ? -record.delta : record.delta,
      persistence: record.persistence,
      sourceHash: record.sourceHash,
      score: safeScore(record.delta, record.persistence),
      advisoryOnly: true,
      humanReviewRequired: true,
      autoCalibrationAllowed: false,
      autoForkAllowed: false,
    });
  });
  items.sort((left, right) => right.score - left.score || right.absoluteDelta - left.absoluteDelta || left.surpriseId.localeCompare(right.surpriseId));
  const core = cloneAndFreeze({
    format: 'ripple-surprise-dividend',
    schemaVersion: '1.0.0',
    semanticClass: 'model-reality-divergence',
    advisoryOnly: true,
    humanReviewRequired: true,
    autoCalibrationAllowed: false,
    autoForkAllowed: false,
    items,
  });
  return cloneAndFreeze({ ...core, surpriseHash: sha256Hex(core) });
}

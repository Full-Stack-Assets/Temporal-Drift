import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

function fail(code, message, path = 'approximation', details = {}) {
  throw new TrustKernelError(code, message, { path, ...details });
}

export function assertPlainDataObject(value, label = 'value') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('E_APPROX_SCHEMA', `${label} must be a plain object`, label);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail('E_APPROX_SCHEMA', `${label} must not contain inherited state`, label);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    fail('E_APPROX_SCHEMA', `${label} contains symbol fields`, label);
  }
  const names = Object.getOwnPropertyNames(value);
  const keys = Object.keys(value);
  if (names.length !== keys.length) {
    fail('E_APPROX_SCHEMA', `${label} contains hidden fields`, label);
  }
  for (const key of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      fail('E_APPROX_SCHEMA', `${label}.${key} must be an enumerable data property`, `${label}.${key}`);
    }
  }
  return value;
}

export function assertExactKeys(value, keys, label = 'value', code = 'E_APPROX_SCHEMA') {
  assertPlainDataObject(value, label);
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (canonicalString(actual) !== canonicalString(expected)) {
    fail(code, `${label} contains missing or unknown fields`, label, { expected, actual });
  }
  return value;
}

export function assertSafeInteger(value, label = 'value', code = 'E_APPROX_SCHEMA') {
  if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
    fail(code, `${label} must be a canonical safe integer`, label);
  }
  return value;
}

export function assertNonEmptyString(value, label = 'value', code = 'E_APPROX_SCHEMA') {
  if (typeof value !== 'string' || value.length === 0) {
    fail(code, `${label} must be a non-empty string`, label);
  }
  return cloneAndFreeze(value);
}

export function normalizeStringList(values, label = 'values') {
  if (!Array.isArray(values) || values.length === 0) {
    fail('E_APPROX_SCHEMA', `${label} must be a non-empty array`, label);
  }
  const normalized = values.map((value, index) => assertNonEmptyString(value, `${label}.${index}`));
  const sorted = [...normalized].sort();
  if (new Set(sorted).size !== sorted.length) {
    fail('E_APPROX_SCHEMA', `${label} contains duplicates`, label);
  }
  return cloneAndFreeze(sorted);
}

export function normalizeSafeIntegerMap(value, label = 'value', options = {}) {
  assertPlainDataObject(value, label);
  const keys = Object.keys(value).sort();
  if (keys.length === 0 && options.allowEmpty !== true) {
    fail('E_APPROX_SCHEMA', `${label} must contain at least one field`, label);
  }
  if (options.expectedKeys) {
    const expected = [...options.expectedKeys].sort();
    if (canonicalString(keys) !== canonicalString(expected)) {
      fail(options.code ?? 'E_APPROX_SCHEMA', `${label} differs from the declared fields`, label, { expected, actual: keys });
    }
  }
  const normalized = {};
  for (const key of keys) {
    assertNonEmptyString(key, `${label}.<key>`);
    normalized[key] = assertSafeInteger(value[key], `${label}.${key}`, options.code ?? 'E_APPROX_SCHEMA');
  }
  return cloneAndFreeze(normalized);
}

function bigintToSafeInteger(value, label) {
  const minimum = BigInt(Number.MIN_SAFE_INTEGER);
  const maximum = BigInt(Number.MAX_SAFE_INTEGER);
  if (value < minimum || value > maximum) {
    fail('E_APPROX_OVERFLOW', `${label} exceeds the safe-integer range`, label);
  }
  return Number(value);
}

export function safeIntegerSum(values, label = 'sum') {
  if (!Array.isArray(values)) fail('E_APPROX_SCHEMA', `${label} terms must be an array`, label);
  const total = values.reduce((sum, value, index) => sum + BigInt(assertSafeInteger(value, `${label}.${index}`)), 0n);
  return bigintToSafeInteger(total, label);
}

export function safeIntegerProduct(left, right, label = 'product') {
  return bigintToSafeInteger(
    BigInt(assertSafeInteger(left, `${label}.left`)) * BigInt(assertSafeInteger(right, `${label}.right`)),
    label,
  );
}

export function safeIntegerDifference(left, right, label = 'difference') {
  return bigintToSafeInteger(
    BigInt(assertSafeInteger(left, `${label}.left`)) - BigInt(assertSafeInteger(right, `${label}.right`)),
    label,
  );
}

export function safeIntegerClamp(value, minimum, maximum, label = 'value') {
  const canonicalValue = assertSafeInteger(value, label);
  const low = assertSafeInteger(minimum, `${label}.minimum`);
  const high = assertSafeInteger(maximum, `${label}.maximum`);
  if (low > high) fail('E_APPROX_SCHEMA', `${label} bounds are inverted`, label);
  return Math.min(high, Math.max(low, canonicalValue));
}

export function contentAddress(prefix, content) {
  const normalizedPrefix = assertNonEmptyString(prefix, 'content prefix');
  return `${normalizedPrefix}-${sha256Hex(content)}`;
}

export function pinDeterministicEvaluator(evaluator, metricIds) {
  assertPlainDataObject(evaluator, 'evaluator');
  const allowed = ['evaluate', 'id', 'version'];
  if (Object.keys(evaluator).some((key) => !allowed.includes(key)) || Object.keys(evaluator).length !== allowed.length) {
    fail('E_APPROX_EVALUATOR', 'evaluator must contain exactly id, version, and evaluate', 'evaluator');
  }
  const id = assertNonEmptyString(evaluator.id, 'evaluator.id', 'E_APPROX_EVALUATOR');
  const version = assertNonEmptyString(evaluator.version, 'evaluator.version', 'E_APPROX_EVALUATOR');
  if (typeof evaluator.evaluate !== 'function') {
    fail('E_APPROX_EVALUATOR', 'evaluator.evaluate must be a function', 'evaluator.evaluate');
  }
  const evaluate = evaluator.evaluate;
  const metrics = normalizeStringList(metricIds, 'metricIds');
  return Object.freeze({
    identity: cloneAndFreeze({ id, version }),
    metricIds: metrics,
    evaluate,
  });
}

function evaluateOnce(pinned, parameters) {
  let result;
  try {
    result = pinned.evaluate(parameters);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    fail('E_APPROX_EVALUATOR', `Evaluator ${pinned.identity.id}@${pinned.identity.version} threw`, 'evaluator.evaluate');
  }
  try {
    return normalizeSafeIntegerMap(result, 'evaluator.result', {
      expectedKeys: pinned.metricIds,
      code: 'E_APPROX_EVALUATOR',
    });
  } catch (error) {
    if (error instanceof TrustKernelError && error.code === 'E_APPROX_EVALUATOR') throw error;
    if (error instanceof TrustKernelError) {
      fail('E_APPROX_EVALUATOR', error.message, error.details?.path ?? 'evaluator.result');
    }
    fail('E_APPROX_EVALUATOR', 'Evaluator returned an unsupported result', 'evaluator.result');
  }
}

export function evaluateDeterministically(pinned, parametersInput) {
  if (!pinned || typeof pinned.evaluate !== 'function' || !pinned.identity || !Array.isArray(pinned.metricIds)) {
    fail('E_APPROX_EVALUATOR', 'Pinned evaluator contract is invalid', 'evaluator');
  }
  const parameters = normalizeSafeIntegerMap(parametersInput, 'parameters');
  const first = evaluateOnce(pinned, parameters);
  const second = evaluateOnce(pinned, parameters);
  if (canonicalString(first) !== canonicalString(second)) {
    fail('E_APPROX_EVALUATOR', `Evaluator ${pinned.identity.id}@${pinned.identity.version} is nondeterministic`, 'evaluator.evaluate');
  }
  return first;
}

export function canonicalArtifact(value, label = 'artifact') {
  assertPlainDataObject(value, label);
  return cloneAndFreeze(value);
}

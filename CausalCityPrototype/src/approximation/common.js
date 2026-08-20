import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { getBranch, verifyRunGraph } from '../kernel/run-graph.js';

export function approxFail(code, message, path = 'approximation') {
  throw new TrustKernelError(code, message, { path });
}

export function assertPlainExact(value, keys, code = 'E_APPROX_SCHEMA', label = 'value') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    approxFail(code, `${label} must be a plain object`, label);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) {
    approxFail(code, `${label} contains missing, hidden, symbol, or unknown fields`, label);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      approxFail(code, `${label}.${key} must be an enumerable data property`, `${label}.${key}`);
    }
  }
}

export function requiredString(value, code = 'E_APPROX_SCHEMA', path = 'value') {
  if (typeof value !== 'string' || value.length === 0) approxFail(code, `${path} must be a non-empty string`, path);
  return cloneAndFreeze(value);
}

export function safeInteger(value, code = 'E_APPROX_SCHEMA', path = 'value', { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) approxFail(code, `${path} must be a safe integer in range`, path);
  return value;
}

export function verifiedGraph(graph) {
  const report = verifyRunGraph(graph);
  if (!report.ok) approxFail('E_APPROX_BRANCH', `RunGraph verification failed at ${report.firstMismatch}`, report.firstMismatch ?? 'graph');
  return graph;
}

export function existingBranch(graph, branchId, path = 'branchId') {
  requiredString(branchId, 'E_APPROX_BRANCH', path);
  try {
    return getBranch(graph, branchId);
  } catch {
    approxFail('E_APPROX_BRANCH', `Unknown or unavailable branch: ${branchId}`, path);
  }
}

function decodePointerSegment(segment) {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

export function resolveSafeIntegerPath(root, path, label = 'path') {
  requiredString(path, 'E_APPROX_SCHEMA', label);
  if (!path.startsWith('/')) approxFail('E_APPROX_PATH', `${label} must be an absolute JSON-pointer-like path`, label);
  const segments = path.slice(1).split('/').map(decodePointerSegment);
  let value = root;
  for (const segment of segments) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.prototype.hasOwnProperty.call(value, segment)) {
      approxFail('E_APPROX_PATH', `Missing outcome path: ${path}`, label);
    }
    value = value[segment];
  }
  if (!Number.isSafeInteger(value)) approxFail('E_APPROX_PATH', `Outcome path is not a safe integer: ${path}`, label);
  return value;
}

function absolute(value) {
  return value < 0n ? -value : value;
}

export function gcdBigInt(left, right) {
  let a = absolute(left);
  let b = absolute(right);
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}

export function reduceFraction(numerator, denominator) {
  if (denominator === 0n) approxFail('E_APPROX_SCHEMA', 'Fraction denominator cannot be zero', 'fraction.denominator');
  let n = numerator;
  let d = denominator;
  if (d < 0n) { n = -n; d = -d; }
  const divisor = gcdBigInt(n, d);
  return { numerator: n / divisor, denominator: d / divisor };
}

export function addFractions(left, right) {
  return reduceFraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function multiplyFraction(fraction, integer) {
  return reduceFraction(fraction.numerator * BigInt(integer), fraction.denominator);
}

export function fractionOutput(fraction) {
  const reduced = reduceFraction(fraction.numerator, fraction.denominator);
  return cloneAndFreeze({ numerator: reduced.numerator.toString(), denominator: reduced.denominator.toString() });
}

export function compareFractions(left, right) {
  const l = left.numerator * right.denominator;
  const r = right.numerator * left.denominator;
  return l < r ? -1 : l > r ? 1 : 0;
}

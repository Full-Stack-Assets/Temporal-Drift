import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

function fail(code, message, path = 'memory') {
  throw new TrustKernelError(code, message, { path });
}

function exactObject(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('E_MEMORY_SCHEMA', `${path} must be a plain object`, path);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key))) fail('E_MEMORY_SCHEMA', `${path} contains missing, hidden, symbol, or unknown fields`, path);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) fail('E_MEMORY_SCHEMA', `${path}.${key} must be an enumerable data property`, `${path}.${key}`);
  }
}

function text(value, path) {
  if (typeof value !== 'string' || value.length === 0) fail('E_MEMORY_SCHEMA', `${path} must be a non-empty string`, path);
  return value.normalize('NFC');
}

function integer(value, path, min = Number.MIN_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min) fail('E_MEMORY_SCHEMA', `${path} must be a safe integer`, path);
  return value;
}

function gcd(left, right) {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}

function rational(numerator, denominator) {
  if (denominator === 0n) return { numerator: 0n, denominator: 1n };
  let n = numerator;
  let d = denominator;
  if (d < 0n) { n = -n; d = -d; }
  const divisor = gcd(n, d);
  return { numerator: n / divisor, denominator: d / divisor };
}

function safeBigIntToNumber(value, path) {
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (value < min || value > max) fail('E_MEMORY_SCHEMA', `${path} exceeds safe-integer range`, path);
  return Number(value);
}

export function createMemoryProfile(fields) {
  exactObject(fields, ['profileId', 'shortWindow', 'longWindow', 'observations'], 'memory');
  const profileId = text(fields.profileId, 'memory.profileId');
  const shortWindow = integer(fields.shortWindow, 'memory.shortWindow', 1);
  const longWindow = integer(fields.longWindow, 'memory.longWindow', 1);
  if (shortWindow > longWindow) fail('E_MEMORY_SCHEMA', 'shortWindow cannot exceed longWindow', 'memory.shortWindow');
  if (!Array.isArray(fields.observations)) fail('E_MEMORY_SCHEMA', 'memory.observations must be an array', 'memory.observations');

  const observations = fields.observations.map((observation, index) => {
    exactObject(observation, ['logicalTime', 'value', 'salience', 'generation'], `memory.observations.${index}`);
    return cloneAndFreeze({
      logicalTime: integer(observation.logicalTime, `memory.observations.${index}.logicalTime`, 0),
      value: integer(observation.value, `memory.observations.${index}.value`),
      salience: integer(observation.salience, `memory.observations.${index}.salience`, 1),
      generation: integer(observation.generation, `memory.observations.${index}.generation`, 0),
    });
  });
  observations.sort((left, right) => left.logicalTime - right.logicalTime || left.value - right.value || left.salience - right.salience || left.generation - right.generation);
  return cloneAndFreeze({ profileId, shortWindow, longWindow, observations });
}

export function perceivedValue(profile, now) {
  const normalized = createMemoryProfile(profile);
  if (!Number.isSafeInteger(now) || now < 0) fail('E_MEMORY_TIME', 'now must be a non-negative safe integer', 'now');
  if (normalized.observations.some((observation) => observation.logicalTime > now)) fail('E_MEMORY_TIME', 'memory contains an observation from the future', 'memory.observations');

  const active = normalized.observations.filter((observation) => now - observation.logicalTime <= normalized.longWindow);
  let numerator = 0n;
  let denominator = 0n;
  for (const observation of active) {
    const age = now - observation.logicalTime;
    const shortFactor = age <= normalized.shortWindow ? 2 : 1;
    const generationFactor = Math.max(1, normalized.longWindow - observation.generation);
    const weight = BigInt(observation.salience) * BigInt(shortFactor) * BigInt(generationFactor);
    numerator += BigInt(observation.value) * weight;
    denominator += weight;
  }
  const reduced = rational(numerator, denominator);
  const truncated = reduced.denominator === 0n ? 0n : reduced.numerator / reduced.denominator;
  const value = safeBigIntToNumber(truncated, 'perceivedValue.value');
  return cloneAndFreeze({
    profileId: normalized.profileId,
    now,
    value,
    rational: {
      numerator: reduced.numerator.toString(),
      denominator: reduced.denominator.toString(),
    },
    activeCount: active.length,
    includedObservations: active.map((observation) => `${observation.logicalTime}:${observation.value}`),
  });
}

export function narrativeTension({ objectiveValue, perceivedValue: subjectiveValue, scale }) {
  integer(objectiveValue, 'objectiveValue');
  integer(subjectiveValue, 'perceivedValue');
  integer(scale, 'scale', 1);
  const signedBig = BigInt(objectiveValue) - BigInt(subjectiveValue);
  const signedGap = safeBigIntToNumber(signedBig, 'signedGap');
  const tension = safeBigIntToNumber(signedBig < 0n ? -signedBig : signedBig, 'tension');
  return cloneAndFreeze({ objectiveValue, perceivedValue: subjectiveValue, signedGap, tension, scale });
}

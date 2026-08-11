import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

export const SHA256 = /^[a-f0-9]{64}$/u;
export const PROFILE_ID = /^crypto-profile-[a-f0-9]{64}$/u;
export const BASE64URL = /^[A-Za-z0-9_-]+$/u;

export function meshFail(code, message, path) {
  throw new TrustKernelError(code, message, { path });
}

export function assertExactPlainObject(value, keys, code, path = 'value') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    meshFail(code, `${path} must be a plain object`, path);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== 'string' || !keys.includes(key))) {
    meshFail(code, `${path} contains missing, hidden, symbol, or unknown fields`, path);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      meshFail(code, `${path}.${key} must be an enumerable data property`, `${path}.${key}`);
    }
  }
}

function readExactDataArray(value, code, path, allowEmpty) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || (!allowEmpty && value.length === 0)) {
    meshFail(code, `${path} must be ${allowEmpty ? 'an' : 'a non-empty'} ordinary array`, path);
  }
  const expectedKeys = new Set(['length', ...Array.from({ length: value.length }, (_, index) => String(index))]);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== expectedKeys.size || ownKeys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    meshFail(code, `${path} contains sparse, hidden, symbol, or unknown array fields`, path);
  }
  const entries = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      meshFail(code, `${path}.${index} must be an enumerable data element`, `${path}.${index}`);
    }
    entries.push(descriptor.value);
  }
  return entries;
}

export function normalizeText(value, code, path) {
  if (typeof value !== 'string' || value.length === 0) meshFail(code, `${path} must be a non-empty string`, path);
  return value.normalize('NFC');
}

export function normalizeHash(value, code, path) {
  if (typeof value !== 'string' || !SHA256.test(value)) meshFail(code, `${path} must be a lowercase SHA-256 hash`, path);
  return value;
}

export function normalizeProfileId(value, code, path = 'cryptoProfileId') {
  if (typeof value !== 'string' || !PROFILE_ID.test(value)) meshFail(code, `${path} must be a crypto profile ID`, path);
  return value;
}

export function normalizeNonNegativeInteger(value, code, path) {
  if (!Number.isSafeInteger(value) || value < 0) meshFail(code, `${path} must be a non-negative safe integer`, path);
  return value;
}

export function normalizePositiveInteger(value, code, path) {
  if (!Number.isSafeInteger(value) || value < 1) meshFail(code, `${path} must be a positive safe integer`, path);
  return value;
}

export function normalizeBoolean(value, code, path) {
  if (typeof value !== 'boolean') meshFail(code, `${path} must be boolean`, path);
  return value;
}

export function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

export function normalizeStringSet(value, code, path, { pattern = null, allowEmpty = false } = {}) {
  const entries = readExactDataArray(value, code, path, allowEmpty);
  const normalized = entries.map((entry, index) => {
    const text = normalizeText(entry, code, `${path}.${index}`);
    if (pattern && !pattern.test(text)) meshFail(code, `${path}.${index} has an unsupported format`, `${path}.${index}`);
    return text;
  });
  if (new Set(normalized).size !== normalized.length) meshFail(code, `${path} cannot contain duplicates`, path);
  return cloneAndFreeze([...normalized].sort(compareUtf8));
}

export function decodeBase64url(value, code, path) {
  if (typeof value !== 'string' || !BASE64URL.test(value)) meshFail(code, `${path} must be canonical base64url`, path);
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length === 0 || bytes.toString('base64url') !== value) meshFail(code, `${path} must be canonical base64url`, path);
  return bytes;
}

export function immutableReport(value) {
  return cloneAndFreeze(value);
}

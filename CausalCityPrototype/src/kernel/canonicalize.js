import { createHash } from 'node:crypto';

import { TrustKernelError } from './errors.js';

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function validateUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TrustKernelError('E_UNSAFE_VALUE', 'String contains an unpaired high surrogate');
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TrustKernelError('E_UNSAFE_VALUE', 'String contains an unpaired low surrogate');
    }
  }
}

function normalizedString(value) {
  validateUnicode(value);
  return value.normalize('NFC');
}

function keyCompare(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function normalize(value, stack) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return normalizedString(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || Object.is(value, -0)) {
      throw new TrustKernelError('E_UNSAFE_VALUE', 'Only finite integers other than negative zero are canonical');
    }
    if (!Number.isSafeInteger(value)) {
      throw new TrustKernelError('E_UNSAFE_INTEGER', 'Integer exceeds the JavaScript safe-integer range');
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new TrustKernelError('E_UNSAFE_VALUE', `Unsupported canonical type: ${typeof value}`);
  }
  if (stack.has(value)) throw new TrustKernelError('E_UNSAFE_VALUE', 'Canonical values cannot contain cycles');
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      const allowedProperties = new Set(['length', ...Array.from({ length: value.length }, (_, index) => String(index))]);
      if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !allowedProperties.has(key))) {
        throw new TrustKernelError('E_UNSAFE_VALUE', 'Arrays cannot contain non-index properties');
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!hasOwn(value, index)) throw new TrustKernelError('E_UNSAFE_VALUE', 'Sparse arrays are not canonical');
      }
      return value.map((entry) => normalize(entry, stack));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TrustKernelError('E_UNSAFE_VALUE', 'Only plain objects are canonical');
    }
    if (Object.getOwnPropertySymbols(value).length || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) {
      throw new TrustKernelError('E_UNSAFE_VALUE', 'Symbol object keys are not canonical');
    }
    const entries = [];
    const normalizedKeys = new Set();
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !hasOwn(descriptor, 'value')) {
        throw new TrustKernelError('E_UNSAFE_VALUE', 'Accessors are not canonical');
      }
      const normalizedKey = normalizedString(key);
      if (normalizedKeys.has(normalizedKey)) {
        throw new TrustKernelError('E_DUPLICATE_KEY', `Object keys collide after NFC normalization: ${normalizedKey}`);
      }
      normalizedKeys.add(normalizedKey);
      entries.push([normalizedKey, normalize(descriptor.value, stack)]);
    }
    entries.sort(([left], [right]) => keyCompare(left, right));
    return Object.fromEntries(entries);
  } finally {
    stack.delete(value);
  }
}

export function normalizeCanonicalValue(value) {
  return normalize(value, new Set());
}

export function canonicalString(value) {
  return JSON.stringify(normalizeCanonicalValue(value));
}

export function canonicalBytes(value) {
  return Buffer.from(canonicalString(value), 'utf8');
}

export function sha256Hex(value) {
  return createHash('sha256').update(canonicalBytes(value)).digest('hex');
}

export function sha256BytesHex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

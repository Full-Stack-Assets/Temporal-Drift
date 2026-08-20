import { normalizeCanonicalValue } from './canonicalize.js';

export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

export function deepClone(value) {
  return normalizeCanonicalValue(value);
}

export function cloneAndFreeze(value) {
  return deepFreeze(deepClone(value));
}

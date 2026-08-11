import { TrustKernelError } from './errors.js';

function clone(value, seen) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value !== 'object') throw new TrustKernelError('E_UNSAFE_VALUE', 'Unsupported immutable value');
  if (seen.has(value)) throw new TrustKernelError('E_UNSAFE_VALUE', 'Cyclic values are not supported');
  seen.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new TrustKernelError('E_UNSAFE_VALUE', 'Sparse arrays are not supported');
    result = value.map((item) => clone(item, seen));
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TrustKernelError('E_UNSAFE_VALUE', 'Only plain objects are supported');
    result = {};
    for (const key of Object.keys(value)) result[key] = clone(value[key], seen);
  }
  seen.delete(value);
  for (const child of Object.values(result)) if (child && typeof child === 'object' && !Object.isFrozen(child)) Object.freeze(child);
  return Object.freeze(result);
}

export function deepCloneFreeze(value) {
  return clone(value, new WeakSet());
}

import { deepCloneFreeze } from './immutable.js';

function firstDifference(expected, actual, path = '') {
  if (Object.is(expected, actual)) return null;
  if (typeof expected !== typeof actual || expected === null || actual === null) return { path, expected, actual };
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return { path, expected, actual };
    if (expected.length !== actual.length) return { path: `${path}.length`, expected: expected.length, actual: actual.length };
    for (let i = 0; i < expected.length; i += 1) {
      const difference = firstDifference(expected[i], actual[i], `${path}[${i}]`);
      if (difference) return difference;
    }
    return null;
  }
  if (typeof expected === 'object') {
    const expectedKeys = Object.keys(expected).sort();
    const actualKeys = Object.keys(actual).sort();
    if (expectedKeys.join('\0') !== actualKeys.join('\0')) return { path: `${path}.keys`, expected: expectedKeys, actual: actualKeys };
    for (const key of expectedKeys) {
      const difference = firstDifference(expected[key], actual[key], path ? `${path}.${key}` : key);
      if (difference) return difference;
    }
    return null;
  }
  return { path, expected, actual };
}

export function verificationReport({ ok, verifiedStepCount, mismatch = null, code = null, model, kernelVersion }) {
  return deepCloneFreeze({ ok, verifiedStepCount, mismatch, code, model, kernelVersion });
}

export function compareReplay(exported, replayed) {
  for (const collection of ['ledger', 'snapstates', 'eventBatches']) {
    const expected = exported[collection];
    const actual = replayed[collection];
    if (!Array.isArray(expected) || expected.length !== actual.length) {
      return { ok: false, sequence: Math.min(expected?.length ?? 0, actual.length), field: `${collection}.length`, expected: expected?.length ?? null, actual: actual.length };
    }
    for (let i = 0; i < expected.length; i += 1) {
      const difference = firstDifference(expected[i], actual[i], collection);
      if (difference) return { ok: false, sequence: i, field: difference.path, expected: difference.expected, actual: difference.actual };
    }
  }
  return { ok: true };
}

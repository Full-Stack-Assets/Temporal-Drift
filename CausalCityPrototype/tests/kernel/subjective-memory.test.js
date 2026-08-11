import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMemoryProfile,
  perceivedValue,
  narrativeTension,
} from '../../src/approximation/subjective-memory.js';
import { canonicalString } from '../../src/kernel/canonicalize.js';

test('memory windows are deterministic, immutable, and exclude observations outside the long window', () => {
  const profile = createMemoryProfile({
    profileId: 'household-a',
    shortWindow: 2,
    longWindow: 5,
    observations: [
      { logicalTime: 0, value: -100, salience: 10, generation: 0 },
      { logicalTime: 8, value: 0, salience: 1, generation: 1 },
      { logicalTime: 9, value: 100, salience: 4, generation: 0 },
    ],
  });
  const before = canonicalString(profile);
  const first = perceivedValue(profile, 10);
  const second = perceivedValue(profile, 10);

  assert.equal(canonicalString(first), canonicalString(second));
  assert.equal(canonicalString(profile), before);
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(first));
  assert.equal(first.includedObservations.includes('0:-100'), false);
  assert.ok(first.value > 0 && first.value <= 100);
  assert.match(first.rational.numerator, /^-?\d+$/);
  assert.match(first.rational.denominator, /^\d+$/);
});

test('a single active short-term observation determines the perceived value exactly', () => {
  const profile = createMemoryProfile({
    profileId: 'single', shortWindow: 2, longWindow: 5,
    observations: [
      { logicalTime: 0, value: 5, salience: 9, generation: 0 },
      { logicalTime: 9, value: 77, salience: 3, generation: 0 },
    ],
  });
  const result = perceivedValue(profile, 10);
  assert.equal(result.value, 77);
  assert.equal(result.activeCount, 1);
});

test('narrative tension is reconstructable from objective and perceived integers', () => {
  const result = narrativeTension({ objectiveValue: 120, perceivedValue: 75, scale: 100 });
  assert.deepEqual(result, {
    objectiveValue: 120,
    perceivedValue: 75,
    signedGap: 45,
    tension: 45,
    scale: 100,
  });
  assert.ok(Object.isFrozen(result));
});

test('subjective-memory inputs fail closed on unsafe values and chronology', () => {
  assert.throws(() => createMemoryProfile({
    profileId: 'bad', shortWindow: 2, longWindow: 1, observations: [],
  }), { code: 'E_MEMORY_SCHEMA' });
  assert.throws(() => createMemoryProfile({
    profileId: 'bad', shortWindow: 1, longWindow: 2,
    observations: [{ logicalTime: 1, value: 1.5, salience: 1, generation: 0 }],
  }), { code: 'E_MEMORY_SCHEMA' });
  const profile = createMemoryProfile({
    profileId: 'future', shortWindow: 1, longWindow: 2,
    observations: [{ logicalTime: 5, value: 1, salience: 1, generation: 0 }],
  });
  assert.throws(() => perceivedValue(profile, 4), { code: 'E_MEMORY_TIME' });
});

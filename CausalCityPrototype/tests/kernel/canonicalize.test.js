import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { canonicalBytes, canonicalString, sha256Hex } from '../../src/kernel/canonicalize.js';
import { cloneAndFreeze } from '../../src/kernel/immutable.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/canonical-v1.json', import.meta.url), 'utf8'));

test('canonical-v1 literal vectors reproduce exact UTF-8 bytes and hashes', () => {
  assert.equal(fixture.fixtureVersion, 'canonical-v1');
  for (const vector of fixture.vectors) {
    assert.equal(canonicalString(vector.value), vector.canonical, vector.id);
    assert.deepEqual(canonicalBytes(vector.value), Buffer.from(vector.canonical, 'utf8'), vector.id);
    assert.equal(sha256Hex(vector.value), vector.sha256, vector.id);
  }
});

test('keys are ordered by normalized UTF-8 bytes and values are NFC-normalized', () => {
  assert.equal(canonicalString({ 'é': 'e\u0301', z: 1, a: 2 }), '{"a":2,"z":1,"é":"é"}');
});

test('normalization-colliding keys fail closed', () => {
  assert.throws(() => canonicalString({ 'é': 1, 'e\u0301': 2 }), { code: 'E_DUPLICATE_KEY' });
});

test('unsafe canonical values fail with stable codes', () => {
  const cycle = {};
  cycle.self = cycle;
  const sparse = [];
  sparse[1] = 1;
  const accessor = {};
  Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 1 });
  const arrayWithProperty = [];
  arrayWithProperty.extra = 1;
  const hiddenObject = {};
  Object.defineProperty(hiddenObject, 'hidden', { value: 1 });
  const invalidUnicode = '\ud800';
  const cases = [
    [1.5, 'E_UNSAFE_VALUE'],
    [-0, 'E_UNSAFE_VALUE'],
    [Number.NaN, 'E_UNSAFE_VALUE'],
    [Number.POSITIVE_INFINITY, 'E_UNSAFE_VALUE'],
    [9007199254740992, 'E_UNSAFE_INTEGER'],
    [undefined, 'E_UNSAFE_VALUE'],
    [1n, 'E_UNSAFE_VALUE'],
    [Symbol('x'), 'E_UNSAFE_VALUE'],
    [new Date(0), 'E_UNSAFE_VALUE'],
    [new Uint8Array([1]), 'E_UNSAFE_VALUE'],
    [new Map(), 'E_UNSAFE_VALUE'],
    [sparse, 'E_UNSAFE_VALUE'],
    [arrayWithProperty, 'E_UNSAFE_VALUE'],
    [hiddenObject, 'E_UNSAFE_VALUE'],
    [accessor, 'E_UNSAFE_VALUE'],
    [cycle, 'E_UNSAFE_VALUE'],
    [invalidUnicode, 'E_UNSAFE_VALUE'],
  ];
  for (const [value, code] of cases) assert.throws(() => canonicalString(value), { code });
});

test('cloneAndFreeze owns no caller containers and recursively freezes output', () => {
  const source = { nested: [{ value: 'e\u0301' }] };
  const result = cloneAndFreeze(source);
  source.nested[0].value = 'changed';
  assert.equal(result.nested[0].value, 'é');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.nested));
  assert.ok(Object.isFrozen(result.nested[0]));
  assert.throws(() => { result.nested.push(2); }, TypeError);
});

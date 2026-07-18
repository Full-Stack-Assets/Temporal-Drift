import test from 'node:test';
import assert from 'node:assert/strict';

import { createRandom, clamp } from '../src/random.js';
import { BRANCHES, START_YEAR, END_YEAR } from '../src/city-data.js';
import { simulateBranch, getSnapshot, compareSnapshots } from '../src/simulation.js';

test('seeded random sequences repeat', () => {
  const a = createRandom(42);
  const b = createRandom(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('clamp constrains values', () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-4, 0, 10), 0);
  assert.equal(clamp(6, 0, 10), 6);
});

test('exactly three scenario branches are defined', () => {
  assert.deepEqual(Object.keys(BRANCHES), ['baseline', 'shutdown', 'reinvention']);
});

test('same branch and seed produce identical histories', () => {
  assert.deepEqual(simulateBranch('shutdown', 77), simulateBranch('shutdown', 77));
});

test('shutdown branch shows material damage by 2032', () => {
  const baseline = getSnapshot(simulateBranch('baseline'), 2032);
  const shutdown = getSnapshot(simulateBranch('shutdown'), 2032);
  assert.ok(shutdown.metrics.employmentRate < baseline.metrics.employmentRate - 5);
  assert.ok(shutdown.metrics.businessIndex < baseline.metrics.businessIndex - 8);
  assert.ok(shutdown.metrics.fiscalHealth < baseline.metrics.fiscalHealth - 8);
});

test('reinvention preserves the shock then outperforms shutdown by 2040', () => {
  const shutdown2030 = getSnapshot(simulateBranch('shutdown'), 2030);
  const reinvention2030 = getSnapshot(simulateBranch('reinvention'), 2030);
  assert.ok(Math.abs(shutdown2030.metrics.employmentRate - reinvention2030.metrics.employmentRate) < 2.5);

  const shutdown2040 = getSnapshot(simulateBranch('shutdown'), 2040);
  const reinvention2040 = getSnapshot(simulateBranch('reinvention'), 2040);
  assert.ok(reinvention2040.metrics.employmentRate > shutdown2040.metrics.employmentRate + 5);
  assert.ok(reinvention2040.metrics.cityHealth > shutdown2040.metrics.cityHealth + 8);
});

test('getSnapshot clamps years to the simulation range', () => {
  const result = simulateBranch('baseline');
  assert.equal(getSnapshot(result, 1900).year, START_YEAR);
  assert.equal(getSnapshot(result, 9999).year, END_YEAR);
});

test('comparison returns signed metric deltas', () => {
  const left = getSnapshot(simulateBranch('shutdown'), 2032);
  const right = getSnapshot(simulateBranch('baseline'), 2032);
  const deltas = compareSnapshots(left, right);
  const employment = deltas.find((entry) => entry.id === 'employmentRate');
  assert.ok(employment);
  assert.equal(employment.delta, Math.round((left.metrics.employmentRate - right.metrics.employmentRate) * 10) / 10);
});

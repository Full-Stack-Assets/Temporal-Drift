import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateBranch, getSnapshot } from '../../src/simulation.js';
import { BRANCHES, START_YEAR, END_YEAR } from '../../src/city-data.js';
import { createRun, advanceRun, verifyRun, exportRun } from '../../src/kernel/index.js';
import {
  bellwetherAdapter,
  createBellwetherManifest,
  normalizeBellwetherSnapshot,
  normalizeBellwetherEvents,
} from '../../src/adapters/bellwether-model.js';

const branchIds = Object.keys(BRANCHES);

test('Bellwether normalization converts all authoritative decimals to safe fixed-point integers', () => {
  const legacy = simulateBranch('baseline', 2026);
  const normalized = normalizeBellwetherSnapshot(getSnapshot(legacy, 2026));
  assert.equal(normalized.year, 2026);
  assert.equal(normalized.metrics.population, 184000);
  for (const [key, value] of Object.entries(normalized.metrics)) {
    assert(Number.isSafeInteger(value), `${key} must be a safe integer`);
  }
  for (const district of Object.values(normalized.districts)) {
    for (const value of Object.values(district)) assert(Number.isSafeInteger(value));
  }
});

test('shadow kernel matches every normalized Bellwether state and transition event batch', () => {
  for (const branchId of branchIds) {
    const seed = 2026;
    const legacy = simulateBranch(branchId, seed);
    const manifest = createBellwetherManifest(branchId, seed);
    let run = createRun(manifest, bellwetherAdapter);
    assert.deepEqual(run.currentSnapstate.modelState, normalizeBellwetherSnapshot(getSnapshot(legacy, START_YEAR)));
    for (const input of manifest.inputs) {
      run = advanceRun(run, input);
      assert.deepEqual(run.currentSnapstate.modelState, normalizeBellwetherSnapshot(getSnapshot(legacy, input.data.year)));
      assert.deepEqual(run.eventBatches.at(-1), normalizeBellwetherEvents(legacy.events.filter((event) => event.year === input.data.year)));
    }
    assert.equal(verifyRun(exportRun(run), bellwetherAdapter).ok, true);
  }
});

test('1,000 deterministic Bellwether branch/seed cases remain shadow-equivalent at every year', () => {
  for (let index = 0; index < 1000; index += 1) {
    const branchId = branchIds[index % branchIds.length];
    const seed = 1000 + index;
    const legacy = simulateBranch(branchId, seed);
    const manifest = createBellwetherManifest(branchId, seed);
    let run = createRun(manifest, bellwetherAdapter);
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
      if (year > START_YEAR) run = advanceRun(run, manifest.inputs[year - START_YEAR - 1]);
      assert.deepEqual(run.currentSnapstate.modelState, normalizeBellwetherSnapshot(getSnapshot(legacy, year)), `state mismatch for ${branchId}/${seed}/${year}`);
      if (year > START_YEAR) {
        assert.deepEqual(run.eventBatches.at(-1), normalizeBellwetherEvents(legacy.events.filter((event) => event.year === year)), `event mismatch for ${branchId}/${seed}/${year}`);
      }
    }
  }
});

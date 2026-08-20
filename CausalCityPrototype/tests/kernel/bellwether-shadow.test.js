import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { getSnapshot, simulateBranch } from '../../src/simulation.js';
import {
  BELLWETHER_SCALES,
  bellwetherModelAdapter,
  normalizeBellwetherEvents,
  normalizeBellwetherState,
  runBellwetherShadow,
} from '../../src/adapters/bellwether-model.js';

const receiptFixture = JSON.parse(await readFile(new URL('../fixtures/receipt-hashes-v1.json', import.meta.url), 'utf8'));

test('Bellwether normalization converts every decimal metric to declared fixed-point integers', () => {
  const legacy = getSnapshot(simulateBranch('baseline', 2026), 2026);
  const normalized = normalizeBellwetherState(legacy);
  assert.equal(BELLWETHER_SCALES.population, 1);
  assert.equal(BELLWETHER_SCALES.metric, 1000);
  assert.equal(BELLWETHER_SCALES.district, 1000);
  assert.equal(normalized.year, 2026);
  assert.equal(normalized.metrics.population, 184000);
  assert.equal(normalized.metrics.employmentRate, 94000);
  assert.equal(normalized.districts.downtown.commercialHealth, 82000);
  for (const value of Object.values(normalized.metrics)) assert.ok(Number.isSafeInteger(value));
  for (const district of Object.values(normalized.districts)) {
    for (const value of Object.values(district)) assert.ok(Number.isSafeInteger(value));
  }
});

test('event normalization is ordered, integer-only, and year-scoped', () => {
  const result = simulateBranch('shutdown', 12);
  const events = normalizeBellwetherEvents(result.events, 2028);
  assert.deepEqual(events.map((event) => event.id), ['spending-shock']);
  assert.equal(events[0].year, 2028);
  assert.ok(Number.isSafeInteger(events[0].magnitude));
  assert.ok(Object.isFrozen(events));
});

test('shadow adapter matches every normalized step for all authored branches', () => {
  for (const branchId of ['baseline', 'shutdown', 'reinvention']) {
    const report = runBellwetherShadow(branchId, 2026);
    assert.equal(report.ok, true, branchId);
    assert.equal(report.steps, 21, branchId);
    assert.equal(report.firstMismatch, null, branchId);
    assert.match(report.terminalReceiptHash, /^[a-f0-9]{64}$/);
    assert.equal(report.terminalReceiptHash, receiptFixture.bellwetherTerminalReceiptHashes[branchId]);
  }
});

test('shadow reports the first differing path when adapter output changes', () => {
  const changedAdapter = {
    ...bellwetherModelAdapter,
    transition(context) {
      const result = bellwetherModelAdapter.transition(context);
      return {
        ...result,
        state: {
          ...result.state,
          metrics: { ...result.state.metrics, population: result.state.metrics.population + 1 },
        },
      };
    },
  };
  const report = runBellwetherShadow('baseline', 1, changedAdapter);
  assert.equal(report.ok, false);
  assert.equal(report.firstMismatch, '/metrics/population');
  assert.equal(report.stepId, 'year-2026');
});

test('legacy visible simulation API remains the browser authority', () => {
  const legacy = simulateBranch('baseline', 2026);
  assert.equal(legacy.snapshots.length, 21);
  assert.equal(legacy.snapshots[1].metrics.incomeIndex, 100.8);
  assert.equal('ledger' in legacy, false);
});

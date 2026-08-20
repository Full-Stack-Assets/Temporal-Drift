import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { createManifest } from '../kernel/manifest.js';
import { seedToState } from '../kernel/prng.js';
import { advanceRun, createRun } from '../kernel/replay.js';
import { simulateBranch } from '../simulation.js';

export const BELLWETHER_SCALES = Object.freeze({ population: 1, metric: 1000, district: 1000 });

function fixed(value, scale, path) {
  const result = Math.round(Number(value) * scale);
  if (!Number.isSafeInteger(result)) throw new TrustKernelError('E_UNSAFE_INTEGER', `${path} cannot be represented as fixed-point`);
  return result;
}

export function normalizeBellwetherState(snapshot) {
  const metrics = {};
  for (const [key, value] of Object.entries(snapshot.metrics)) {
    metrics[key] = fixed(value, key === 'population' ? BELLWETHER_SCALES.population : BELLWETHER_SCALES.metric, `/metrics/${key}`);
  }
  const districts = {};
  for (const [districtId, district] of Object.entries(snapshot.districts)) {
    districts[districtId] = Object.fromEntries(Object.entries(district).map(([key, value]) => [
      key, fixed(value, BELLWETHER_SCALES.district, `/districts/${districtId}/${key}`),
    ]));
  }
  return cloneAndFreeze({
    year: snapshot.year,
    metrics,
    districts,
    provenance: snapshot.provenance,
  });
}

export function normalizeBellwetherEvents(events, year) {
  return cloneAndFreeze(events
    .filter((event) => event.year === year)
    .map((event) => ({
      id: event.id,
      year: event.year,
      title: event.title,
      summary: event.summary,
      category: event.category,
      magnitude: fixed(event.magnitude, 1, `/events/${event.id}/magnitude`),
      causes: [...event.causes],
      metrics: [...event.metrics],
      districts: [...event.districts],
      root: Boolean(event.root),
    }))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
}

export function createBellwetherManifest(branchId, seed = 2026) {
  if (!Number.isSafeInteger(seed)) throw new TrustKernelError('E_UNSAFE_INTEGER', 'Bellwether seed must be a safe integer');
  const legacy = simulateBranch(branchId, seed);
  const inputs = legacy.snapshots.map((snapshot) => ({
    stepId: `year-${snapshot.year}`,
    type: 'bellwether.step',
    payload: {
      branchId: legacy.branchId,
      seed,
      year: snapshot.year,
    },
  }));
  return createManifest({
    format: 'ripple-trust-run',
    schemaVersion: '1.0.0',
    kernelVersion: '1.0.0',
    model: { id: 'bellwether-shadow', version: '1.0.0' },
    runId: `bellwether-${legacy.branchId}-${seed}`,
    branchId: legacy.branchId,
    initialState: { branchId: legacy.branchId, year: legacy.startYear - 1, metrics: {}, districts: {}, provenance: {} },
    initialPrngState: seedToState(`bellwether-shadow-v1:${legacy.branchId}:${seed}`),
    inputs,
    ancestry: null,
    normalization: {
      id: 'bellwether-fixed-v1', version: '1.0.0',
      scales: BELLWETHER_SCALES,
    },
    expectedTerminalReceiptHash: null,
    evidenceRuntime: `node-${process.version}`,
  });
}

export const bellwetherModelAdapter = Object.freeze({
  id: 'bellwether-shadow',
  version: '1.0.0',
  transition({ state, input, prng }) {
    if (input.type !== 'bellwether.step' || input.payload.year !== state.year + 1) {
      throw new TrustKernelError('E_REPLAY_MISMATCH', `Invalid Bellwether step ${input.stepId}`);
    }
    prng.nextUint32();
    const legacy = simulateBranch(input.payload.branchId, input.payload.seed);
    const snapshot = legacy.snapshots.find((entry) => entry.year === input.payload.year);
    if (!snapshot) throw new TrustKernelError('E_REPLAY_MISMATCH', `Bellwether year is unavailable: ${input.payload.year}`);
    return {
      state: normalizeBellwetherState(snapshot),
      events: normalizeBellwetherEvents(legacy.events, snapshot.year),
    };
  },
});

function firstDifference(expected, actual, path = '') {
  if (Object.is(expected, actual)) return null;
  if (typeof expected !== typeof actual || expected === null || actual === null || typeof expected !== 'object') return path || '/';
  const expectedKeys = Object.keys(expected);
  const actualKeys = Object.keys(actual);
  const keys = [...new Set([...expectedKeys, ...actualKeys])].sort();
  for (const key of keys) {
    if (!(key in expected) || !(key in actual)) return `${path}/${key}`;
    const difference = firstDifference(expected[key], actual[key], `${path}/${key}`);
    if (difference) return difference;
  }
  return null;
}

export function runBellwetherShadow(branchId, seed = 2026, adapter = bellwetherModelAdapter) {
  const legacy = simulateBranch(branchId, seed);
  let run = createRun(createBellwetherManifest(branchId, seed), adapter);
  for (let index = 0; index < run.manifest.inputs.length; index += 1) {
    const input = run.manifest.inputs[index];
    run = advanceRun(run, input);
    const expectedState = normalizeBellwetherState(legacy.snapshots[index]);
    const expectedEvents = normalizeBellwetherEvents(legacy.events, legacy.snapshots[index].year);
    const actualState = run.snapstates[index + 1].modelState;
    const actualEvents = run.eventBatches[index + 1];
    if (sha256Hex(actualState) !== sha256Hex(expectedState)) {
      return cloneAndFreeze({
        ok: false, branchId: legacy.branchId, seed, steps: index,
        stepId: input.stepId, firstMismatch: firstDifference(expectedState, actualState),
        terminalReceiptHash: run.ledger.at(-1).receiptHash,
      });
    }
    if (sha256Hex(actualEvents) !== sha256Hex(expectedEvents)) {
      return cloneAndFreeze({
        ok: false, branchId: legacy.branchId, seed, steps: index,
        stepId: input.stepId, firstMismatch: `/events${firstDifference(expectedEvents, actualEvents) ?? ''}`,
        terminalReceiptHash: run.ledger.at(-1).receiptHash,
      });
    }
    if (canonicalString(actualState) !== canonicalString(expectedState)) {
      throw new TrustKernelError('E_STATE_HASH', `Canonical Bellwether state mismatch at ${input.stepId}`);
    }
  }
  return cloneAndFreeze({
    ok: true,
    branchId: legacy.branchId,
    seed,
    steps: legacy.snapshots.length,
    stepId: null,
    firstMismatch: null,
    terminalReceiptHash: run.ledger.at(-1).receiptHash,
  });
}

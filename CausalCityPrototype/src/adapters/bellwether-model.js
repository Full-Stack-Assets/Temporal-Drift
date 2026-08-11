import { BRANCHES, START_YEAR, END_YEAR } from '../city-data.js';
import { simulateBranch, getSnapshot } from '../simulation.js';
import { createManifest } from '../kernel/manifest.js';
import { seedToState } from '../kernel/prng.js';
import { deepCloneFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

export const BELLWETHER_MODEL_ID = 'bellwether-shadow';
export const BELLWETHER_MODEL_VERSION = '1';
export const BELLWETHER_NORMALIZATION_ID = 'bellwether-fixed-point-v1';

const cache = new Map();

function legacyRun(branchId, seed) {
  const key = `${branchId}:${seed}`;
  if (!cache.has(key)) cache.set(key, simulateBranch(branchId, seed));
  return cache.get(key);
}

function fixed(value, scale) {
  const result = Math.round(value * scale);
  if (!Number.isSafeInteger(result)) throw new TrustKernelError('E_UNSAFE_INTEGER', 'Bellwether fixed-point conversion overflow');
  return result;
}

function normalizeStringArrayObject(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Number.isInteger(value)) return value;
  if (typeof value === 'number') return fixed(value, 1000);
  if (Array.isArray(value)) return value.map(normalizeStringArrayObject);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeStringArrayObject(item)]));
  throw new TrustKernelError('E_UNSAFE_VALUE', 'Unsupported Bellwether value');
}

export function normalizeBellwetherSnapshot(snapshot) {
  if (!snapshot || !Number.isInteger(snapshot.year)) throw new TrustKernelError('E_UNSAFE_VALUE', 'Bellwether snapshot requires an integer year');
  const metrics = {};
  for (const [key, value] of Object.entries(snapshot.metrics)) {
    metrics[key] = key === 'population' ? fixed(value, 1) : fixed(value, 1000);
  }
  const districts = {};
  for (const [districtId, district] of Object.entries(snapshot.districts)) {
    districts[districtId] = Object.fromEntries(Object.entries(district).map(([key, value]) => [key, fixed(value, 1000)]));
  }
  return deepCloneFreeze({
    year: snapshot.year,
    metrics,
    districts,
    provenance: normalizeStringArrayObject(snapshot.provenance),
  });
}

export function normalizeBellwetherEvents(events) {
  return deepCloneFreeze(events.map((event) => normalizeStringArrayObject(event)));
}

export function createBellwetherManifest(branchId, seed = 2026) {
  if (!BRANCHES[branchId]) throw new TrustKernelError('E_MODEL_NOT_FOUND', `Unknown Bellwether branch: ${branchId}`);
  if (!Number.isSafeInteger(seed)) throw new TrustKernelError('E_INVALID_PRNG_STATE', 'Bellwether seed must be a safe integer');
  const legacy = legacyRun(branchId, seed);
  const inputs = [];
  for (let year = START_YEAR + 1; year <= END_YEAR; year += 1) {
    inputs.push({ stepId: `year-${year}`, type: 'bellwether-year', data: { branchId, seed, year } });
  }
  return createManifest({
    model: { id: BELLWETHER_MODEL_ID, version: BELLWETHER_MODEL_VERSION },
    branchId,
    initialState: normalizeBellwetherSnapshot(getSnapshot(legacy, START_YEAR)),
    initialPrngState: seedToState(seed),
    inputs,
    normalization: {
      id: BELLWETHER_NORMALIZATION_ID,
      scales: { population: 1, metric: 1000, district: 1000 },
    },
  });
}

export const bellwetherAdapter = Object.freeze({
  id: BELLWETHER_MODEL_ID,
  version: BELLWETHER_MODEL_VERSION,
  transition(previousState, input, prng) {
    if (input.type !== 'bellwether-year') throw new TrustKernelError('E_REPLAY_MISMATCH', 'Unsupported Bellwether input type');
    const { branchId, seed, year } = input.data;
    if (!BRANCHES[branchId] || !Number.isSafeInteger(seed) || !Number.isInteger(year) || year <= START_YEAR || year > END_YEAR) {
      throw new TrustKernelError('E_REPLAY_MISMATCH', 'Invalid Bellwether transition input');
    }
    if (previousState.year !== year - 1) throw new TrustKernelError('E_REPLAY_MISMATCH', 'Bellwether year sequence mismatch');
    prng.nextUint32();
    const legacy = legacyRun(branchId, seed);
    return {
      state: normalizeBellwetherSnapshot(getSnapshot(legacy, year)),
      events: normalizeBellwetherEvents(legacy.events.filter((event) => event.year === year)),
    };
  },
});

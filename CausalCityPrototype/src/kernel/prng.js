import { TrustKernelError } from './errors.js';

function rotl(x, k) { return ((x << k) | (x >>> (32 - k))) >>> 0; }

function validateState(input) {
  if (!Array.isArray(input) || input.length !== 4 || input.some((x) => !Number.isInteger(x) || x < 0 || x > 0xffffffff)) {
    throw new TrustKernelError('E_INVALID_PRNG_STATE', 'PRNG state must contain four uint32 values');
  }
  const state = input.map((x) => x >>> 0);
  if (state.every((x) => x === 0)) throw new TrustKernelError('E_INVALID_PRNG_STATE', 'All-zero PRNG state is invalid');
  return state;
}

function mix32(x) {
  x = (x + 0x9e3779b9) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

export function seedToState(seed) {
  if (!Number.isSafeInteger(seed)) throw new TrustKernelError('E_INVALID_PRNG_STATE', 'Seed must be a safe integer');
  let x = seed >>> 0;
  const state = [];
  for (let i = 0; i < 4; i += 1) {
    x = mix32((x + i) >>> 0);
    state.push(x);
  }
  if (state.every((value) => value === 0)) state[0] = 1;
  return Object.freeze(state);
}

export function createPrng(initialState) {
  let state = validateState(initialState);
  const api = {
    nextUint32() {
      const result = Math.imul(rotl(Math.imul(state[1], 5) >>> 0, 7), 9) >>> 0;
      const t = (state[1] << 9) >>> 0;
      state[2] = (state[2] ^ state[0]) >>> 0;
      state[3] = (state[3] ^ state[1]) >>> 0;
      state[1] = (state[1] ^ state[2]) >>> 0;
      state[0] = (state[0] ^ state[3]) >>> 0;
      state[2] = (state[2] ^ t) >>> 0;
      state[3] = rotl(state[3], 11);
      return result;
    },
    nextInt(maxExclusive) {
      if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) {
        throw new TrustKernelError('E_UNSAFE_INTEGER', 'maxExclusive must be in 1..2^32');
      }
      if (maxExclusive === 0x100000000) return api.nextUint32();
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      let value;
      do { value = api.nextUint32(); } while (value >= limit);
      return value % maxExclusive;
    },
    snapshot() { return Object.freeze([...state]); },
    clone() { return createPrng(state); },
  };
  return Object.freeze(api);
}

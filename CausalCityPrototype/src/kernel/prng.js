import { createHash } from 'node:crypto';

import { TrustKernelError } from './errors.js';

const UINT32_RANGE = 0x1_0000_0000;

function validateState(state) {
  if (!Array.isArray(state) || state.length !== 4 || state.some((word) => !Number.isInteger(word) || word < 0 || word >= UINT32_RANGE)) {
    throw new TrustKernelError('E_INVALID_PRNG_STATE', 'xoshiro128** state must contain four unsigned 32-bit words');
  }
  if (state.every((word) => word === 0)) {
    throw new TrustKernelError('E_INVALID_PRNG_STATE', 'xoshiro128** state cannot be all zero');
  }
  return state.map((word) => word >>> 0);
}

function rotateLeft(value, bits) {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

export function seedToState(seed) {
  if (!(typeof seed === 'string' || Number.isSafeInteger(seed))) {
    throw new TrustKernelError('E_INVALID_PRNG_STATE', 'Seed must be a string or safe integer');
  }
  const digest = createHash('sha256').update(`ripple-xoshiro128ss-v1:${String(seed)}`, 'utf8').digest();
  const state = [0, 4, 8, 12].map((offset) => digest.readUInt32LE(offset));
  if (state.every((word) => word === 0)) state[0] = 1;
  return Object.freeze(state);
}

export function createPrng(initialState) {
  let state = validateState(initialState);

  function nextUint32() {
    const result = Math.imul(rotateLeft(Math.imul(state[1], 5) >>> 0, 7), 9) >>> 0;
    const shifted = (state[1] << 9) >>> 0;
    state[2] = (state[2] ^ state[0]) >>> 0;
    state[3] = (state[3] ^ state[1]) >>> 0;
    state[1] = (state[1] ^ state[2]) >>> 0;
    state[0] = (state[0] ^ state[3]) >>> 0;
    state[2] = (state[2] ^ shifted) >>> 0;
    state[3] = rotateLeft(state[3], 11);
    return result;
  }

  function nextInt(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive >= UINT32_RANGE) {
      throw new TrustKernelError('E_INVALID_PRNG_STATE', 'nextInt bound must be an integer from 1 through 4294967295');
    }
    const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
    let value;
    do value = nextUint32(); while (value >= limit);
    return value % maxExclusive;
  }

  function snapshot() {
    return Object.freeze([...state]);
  }

  function clone() {
    return createPrng(snapshot());
  }

  return Object.freeze({ nextUint32, nextInt, snapshot, clone });
}

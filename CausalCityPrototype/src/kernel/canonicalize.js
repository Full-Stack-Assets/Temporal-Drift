import { TrustKernelError } from './errors.js';

const encoder = new TextEncoder();

function validUnicode(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

function normalizeString(value) {
  if (!validUnicode(value)) throw new TrustKernelError('E_UNSAFE_VALUE', 'String contains unpaired surrogate');
  return value.normalize('NFC');
}

function compareUtf8(left, right) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

function serialize(value, seen) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(normalizeString(value));
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new TrustKernelError('E_UNSAFE_INTEGER', 'Only safe non-negative-zero integers are canonical');
    return String(value);
  }
  if (typeof value !== 'object') throw new TrustKernelError('E_UNSAFE_VALUE', `Unsupported canonical type: ${typeof value}`);
  if (seen.has(value)) throw new TrustKernelError('E_UNSAFE_VALUE', 'Cyclic values are not canonical');
  seen.add(value);
  let output;
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new TrustKernelError('E_UNSAFE_VALUE', 'Sparse arrays are not canonical');
    output = `[${value.map((item) => serialize(item, seen)).join(',')}]`;
  } else {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TrustKernelError('E_UNSAFE_VALUE', 'Only plain objects are canonical');
    const normalized = [];
    const used = new Set();
    for (const key of Object.keys(value)) {
      const normalizedKey = normalizeString(key);
      if (used.has(normalizedKey)) throw new TrustKernelError('E_DUPLICATE_KEY', 'Object keys collide after NFC normalization');
      used.add(normalizedKey);
      normalized.push([normalizedKey, value[key]]);
    }
    normalized.sort((a, b) => compareUtf8(a[0], b[0]));
    output = `{${normalized.map(([key, item]) => `${JSON.stringify(key)}:${serialize(item, seen)}`).join(',')}}`;
  }
  seen.delete(value);
  return output;
}

export function canonicalString(value) { return serialize(value, new WeakSet()); }
export function canonicalBytes(value) { return encoder.encode(canonicalString(value)); }

function rotr(value, count) { return (value >>> count) | (value << (32 - count)); }
const K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];

export function sha256Bytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const bitLength = bytes.length * 8;
  const paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const words = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = (rotr(words[i-15],7) ^ rotr(words[i-15],18) ^ (words[i-15] >>> 3)) >>> 0;
      const s1 = (rotr(words[i-2],17) ^ rotr(words[i-2],19) ^ (words[i-2] >>> 10)) >>> 0;
      words[i] = (words[i-16] + s0 + words[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)) >>> 0;
      const choose = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + S1 + choose + K[i] + words[i]) >>> 0;
      const S0 = (rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + majority) >>> 0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    hash[0]=(hash[0]+a)>>>0; hash[1]=(hash[1]+b)>>>0; hash[2]=(hash[2]+c)>>>0; hash[3]=(hash[3]+d)>>>0;
    hash[4]=(hash[4]+e)>>>0; hash[5]=(hash[5]+f)>>>0; hash[6]=(hash[6]+g)>>>0; hash[7]=(hash[7]+h)>>>0;
  }
  return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
}

export function hashCanonical(value) { return sha256Bytes(canonicalBytes(value)); }

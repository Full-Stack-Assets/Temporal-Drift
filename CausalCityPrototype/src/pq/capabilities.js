import { normalizeCanonicalValue, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import { TrustKernelError } from '../kernel/errors.js';

const CAPABILITY_VERSION = 'pq-capabilities-v1';
const POLICY_VERSION = 'pq-migration-policy-v1';
const POLICY_INPUT_KEYS = [
  'policyVersion',
  'requiredClassical',
  'optionalPostQuantum',
  'allowClassicalOnly',
  'allowPqUnavailable',
  'requireHybridForRelease',
  'executionAuthority',
];
const POLICY_KEYS = [...POLICY_INPUT_KEYS, 'policyHash'];
const HASH_RE = /^[a-f0-9]{64}$/u;

function exactObject(value, keys, label) {
  let normalized;
  try {
    normalized = normalizeCanonicalValue(value);
  } catch (error) {
    if (error instanceof TrustKernelError) throw error;
    throw new TrustKernelError('E_PQ_CAPABILITY', `${label} is not canonical`);
  }
  if (!normalized || Array.isArray(normalized) || typeof normalized !== 'object') {
    throw new TrustKernelError('E_PQ_CAPABILITY', `${label} must be an object`);
  }
  const actual = Object.keys(normalized).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TrustKernelError('E_PQ_CAPABILITY', `${label} contains missing or unknown fields`);
  }
  return normalized;
}

function policyCore(raw) {
  const input = exactObject(raw, POLICY_INPUT_KEYS, 'PQ capability policy');
  if (input.policyVersion !== POLICY_VERSION) {
    throw new TrustKernelError('E_PQ_CAPABILITY', `Unsupported PQ policy version: ${input.policyVersion}`);
  }
  if (input.requiredClassical !== 'ed25519') {
    throw new TrustKernelError('E_PQ_CAPABILITY', 'requiredClassical must be ed25519');
  }
  if (input.optionalPostQuantum !== 'ml-dsa-65') {
    throw new TrustKernelError('E_PQ_CAPABILITY', 'optionalPostQuantum must be ml-dsa-65');
  }
  for (const field of ['allowClassicalOnly', 'allowPqUnavailable', 'requireHybridForRelease']) {
    if (typeof input[field] !== 'boolean') {
      throw new TrustKernelError('E_PQ_CAPABILITY', `${field} must be boolean`);
    }
  }
  if (input.executionAuthority !== 'none') {
    throw new TrustKernelError('E_PQ_CAPABILITY', 'PQ migration policy cannot grant execution authority');
  }
  return input;
}

export function detectPqCapabilities(runtimeMajor = Number(process.versions.node.split('.')[0])) {
  if (!Number.isSafeInteger(runtimeMajor) || ![22, 24].includes(runtimeMajor)) {
    throw new TrustKernelError('E_PQ_CAPABILITY', `Unsupported runtime major: ${runtimeMajor}`);
  }
  const node24 = runtimeMajor === 24;
  return cloneAndFreeze({
    capabilityVersion: CAPABILITY_VERSION,
    runtimeMajor,
    classical: {
      ed25519: 'supported',
    },
    postQuantum: {
      mlDsa: node24 ? 'supported' : 'unavailable',
      mlDsaProfiles: node24 ? ['ml-dsa-44', 'ml-dsa-65', 'ml-dsa-87'] : [],
      slhDsa: node24 ? 'supported' : 'unavailable',
    },
    claimClass: 'runtime-capability-observation',
    executionAuthority: 'none',
  });
}

export function createPqCapabilityPolicy(config) {
  const core = policyCore(config);
  return cloneAndFreeze({ ...core, policyHash: sha256Hex(core) });
}

export function verifyPqCapabilityPolicy(rawPolicy) {
  const policy = exactObject(rawPolicy, POLICY_KEYS, 'PQ capability policy');
  if (typeof policy.policyHash !== 'string' || !HASH_RE.test(policy.policyHash)) {
    throw new TrustKernelError('E_PQ_CAPABILITY', 'policyHash must be a lowercase SHA-256 digest');
  }
  const core = policyCore(Object.fromEntries(POLICY_INPUT_KEYS.map((key) => [key, policy[key]])));
  if (policy.policyHash !== sha256Hex(core)) {
    throw new TrustKernelError('E_PQ_CAPABILITY', 'PQ migration policy hash is invalid');
  }
  return cloneAndFreeze({ ok: true, policyHash: policy.policyHash });
}

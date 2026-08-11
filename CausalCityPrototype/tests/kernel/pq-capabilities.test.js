import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import {
  createPqCapabilityPolicy,
  detectPqCapabilities,
  verifyPqCapabilityPolicy,
} from '../../src/pq/capabilities.js';

test('runtime PQ capability observation is explicit, immutable, and honest for Node 22/24', () => {
  const current = detectPqCapabilities();
  const major = Number(process.versions.node.split('.')[0]);

  assert.equal(current.capabilityVersion, 'pq-capabilities-v1');
  assert.equal(current.runtimeMajor, major);
  assert.equal(current.classical.ed25519, 'supported');
  assert.equal(current.claimClass, 'runtime-capability-observation');
  assert.equal(current.executionAuthority, 'none');
  assert.equal(Object.isFrozen(current), true);
  assert.equal(Object.isFrozen(current.postQuantum), true);

  if (major === 22) {
    assert.equal(current.postQuantum.mlDsa, 'unavailable');
    assert.deepEqual(current.postQuantum.mlDsaProfiles, []);
    assert.equal(current.postQuantum.slhDsa, 'unavailable');
  } else {
    assert.equal(major, 24);
    assert.equal(current.postQuantum.mlDsa, 'supported');
    assert.deepEqual(current.postQuantum.mlDsaProfiles, ['ml-dsa-44', 'ml-dsa-65', 'ml-dsa-87']);
    assert.equal(current.postQuantum.slhDsa, 'supported');
  }
});

test('explicit Node 22/24 capability observations are deterministic and differ only by documented runtime support', () => {
  const node22a = detectPqCapabilities(22);
  const node22b = detectPqCapabilities(22);
  const node24a = detectPqCapabilities(24);
  const node24b = detectPqCapabilities(24);

  assert.equal(canonicalString(node22a), canonicalString(node22b));
  assert.equal(canonicalString(node24a), canonicalString(node24b));
  assert.notEqual(canonicalString(node22a), canonicalString(node24a));
  assert.equal(node22a.postQuantum.mlDsa, 'unavailable');
  assert.equal(node24a.postQuantum.mlDsa, 'supported');
});

test('unsupported runtime majors fail closed instead of inheriting a capability claim', () => {
  for (const major of [20, 23, 25, -1, 22.5]) {
    assert.throws(
      () => detectPqCapabilities(major),
      (error) => error?.code === 'E_PQ_CAPABILITY',
    );
  }
});

test('PQ migration policy is exact, immutable, content-addressed, and grants no release authority', () => {
  const input = {
    policyVersion: 'pq-migration-policy-v1',
    requiredClassical: 'ed25519',
    optionalPostQuantum: 'ml-dsa-65',
    allowClassicalOnly: true,
    allowPqUnavailable: true,
    requireHybridForRelease: false,
    executionAuthority: 'none',
  };
  const policy = createPqCapabilityPolicy(input);

  assert.equal(policy.policyVersion, input.policyVersion);
  assert.equal(policy.requiredClassical, 'ed25519');
  assert.equal(policy.optionalPostQuantum, 'ml-dsa-65');
  assert.equal(policy.allowClassicalOnly, true);
  assert.equal(policy.allowPqUnavailable, true);
  assert.equal(policy.requireHybridForRelease, false);
  assert.equal(policy.executionAuthority, 'none');
  assert.match(policy.policyHash, /^[a-f0-9]{64}$/u);
  assert.equal(Object.isFrozen(policy), true);
  assert.equal(verifyPqCapabilityPolicy(policy).ok, true);

  input.requiredClassical = 'rsa';
  assert.equal(policy.requiredClassical, 'ed25519');
});

test('PQ migration policy rejects unsupported algorithms, authority inflation, unknown fields, and stale hashes', () => {
  const base = {
    policyVersion: 'pq-migration-policy-v1',
    requiredClassical: 'ed25519',
    optionalPostQuantum: 'ml-dsa-65',
    allowClassicalOnly: true,
    allowPqUnavailable: true,
    requireHybridForRelease: false,
    executionAuthority: 'none',
  };

  for (const invalid of [
    { ...base, requiredClassical: 'rsa' },
    { ...base, optionalPostQuantum: 'slh-dsa-shake-128s' },
    { ...base, executionAuthority: 'release' },
    { ...base, allowClassicalOnly: 'yes' },
    { ...base, unknown: true },
  ]) {
    assert.throws(
      () => createPqCapabilityPolicy(invalid),
      (error) => error?.code === 'E_PQ_CAPABILITY',
    );
  }

  const policy = createPqCapabilityPolicy(base);
  assert.throws(
    () => verifyPqCapabilityPolicy({ ...policy, policyHash: '0'.repeat(64) }),
    (error) => error?.code === 'E_PQ_CAPABILITY',
  );
});

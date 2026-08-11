import { hashCanonical } from '../src/kernel/canonicalize.js';
import { KERNEL_VERSION } from '../src/kernel/manifest.js';

const fixture = { fixture: 'trust-kernel-v1', nested: { a: 1, b: [true, null, 'café'] } };
const summary = {
  runtime: `node-${process.versions.node}`,
  kernelVersion: KERNEL_VERSION,
  fixtureVersion: 'canonical-v1',
  canonicalFixtureHash: hashCanonical(fixture),
};

console.log(JSON.stringify(summary, null, 2));

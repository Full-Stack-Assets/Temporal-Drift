import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { commitSyntheticPopulation } from '../../src/frontier/population-commitment.js';

test('population commitment is deterministic, immutable, and parameter-sensitive', () => {
  const config = { seed: 'population-seed-v1', populationSize: 10000, shardSize: 1024, profileVersion: 'profile-v1' };
  const first = commitSyntheticPopulation(config);
  const second = commitSyntheticPopulation(config);
  assert.equal(canonicalString(first), canonicalString(second));
  assert.ok(Object.isFrozen(first));
  assert.equal(first.populationSize, 10000);
  assert.equal(first.shards.length, 10);
  assert.match(first.populationRoot, /^[a-f0-9]{64}$/);
  assert.equal(first.shards[0].start, 0);
  assert.equal(first.shards.at(-1).endExclusive, 10000);
  assert.equal(first.shards.reduce((sum, shard) => sum + shard.count, 0), 10000);

  for (const variation of [
    { ...config, seed: 'other-seed' },
    { ...config, populationSize: 9999 },
    { ...config, shardSize: 1000 },
    { ...config, profileVersion: 'profile-v2' },
  ]) assert.notEqual(commitSyntheticPopulation(variation).populationRoot, first.populationRoot);
});

test('population commitment rejects unsafe or ambiguous configuration', () => {
  assert.throws(() => commitSyntheticPopulation({ seed: 'x', populationSize: 0, shardSize: 10, profileVersion: 'v1' }), { code: 'E_FRONTIER_SCHEMA' });
  assert.throws(() => commitSyntheticPopulation({ seed: 'x', populationSize: 10, shardSize: 0, profileVersion: 'v1' }), { code: 'E_FRONTIER_SCHEMA' });
  assert.throws(() => commitSyntheticPopulation({ seed: 'x', populationSize: 10, shardSize: 10, profileVersion: 'v1', extra: true }), { code: 'E_FRONTIER_SCHEMA' });
});

import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

function fail(message, path = 'population') {
  throw new TrustKernelError('E_FRONTIER_SCHEMA', message, { path });
}

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('Population configuration must be a plain object');
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some((key) => typeof key !== 'string' || !keys.includes(key))) fail('Population configuration contains missing, hidden, symbol, or unknown fields');
}

function text(value, path) {
  if (typeof value !== 'string' || value.length === 0) fail(`${path} must be a non-empty string`, path);
  return value.normalize('NFC');
}

function positiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${path} must be a positive safe integer`, path);
  return value;
}

function agentCommitment(seed, profileVersion, index) {
  return sha256Hex({ profileVersion, seed, index });
}

export function commitSyntheticPopulation(config) {
  exactObject(config, ['seed', 'populationSize', 'shardSize', 'profileVersion']);
  const seed = text(config.seed, 'population.seed');
  const profileVersion = text(config.profileVersion, 'population.profileVersion');
  const populationSize = positiveInteger(config.populationSize, 'population.populationSize');
  const shardSize = positiveInteger(config.shardSize, 'population.shardSize');
  if (populationSize > 1_000_000) fail('populationSize exceeds v1 safety limit of 1,000,000', 'population.populationSize');

  const shards = [];
  for (let start = 0, shardIndex = 0; start < populationSize; start += shardSize, shardIndex += 1) {
    const endExclusive = Math.min(populationSize, start + shardSize);
    const agentCommitments = [];
    for (let index = start; index < endExclusive; index += 1) agentCommitments.push(agentCommitment(seed, profileVersion, index));
    const shardCore = { shardIndex, start, endExclusive, count: endExclusive - start, agentCommitments };
    shards.push(cloneAndFreeze({
      shardIndex,
      start,
      endExclusive,
      count: endExclusive - start,
      shardHash: sha256Hex(shardCore),
    }));
  }

  const rootCore = cloneAndFreeze({
    format: 'synthetic-population-commitment',
    schemaVersion: '1.0.0',
    seed,
    profileVersion,
    populationSize,
    shardSize,
    shardHashes: shards.map((shard) => shard.shardHash),
  });
  return cloneAndFreeze({
    ...rootCore,
    shards,
    populationRoot: sha256Hex(rootCore),
  });
}

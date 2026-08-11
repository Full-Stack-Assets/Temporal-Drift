import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

const HASH = /^[a-f0-9]{64}$/;

function fail(message, path = 'crystal') {
  throw new TrustKernelError('E_CRYSTAL_SCHEMA', message, { path });
}

function validHash(value, path) {
  if (typeof value !== 'string' || !HASH.test(value)) fail(`${path} must be a lowercase SHA-256 hash`, path);
  return value;
}

function parentNode(children, level, fanout) {
  const start = children[0].start;
  const endExclusive = children.at(-1).endExclusive;
  const payload = {
    format: 'temporal-crystal-node-v1',
    fanout,
    level,
    start,
    endExclusive,
    childHashes: children.map((child) => child.hash),
  };
  return cloneAndFreeze({ level, start, endExclusive, hash: sha256Hex(payload) });
}

export function buildTemporalCrystal(receiptHashes, fanout = 8) {
  if (!Array.isArray(receiptHashes) || receiptHashes.length === 0) fail('receiptHashes must be a non-empty array', 'receiptHashes');
  if (!Number.isSafeInteger(fanout) || fanout < 2 || fanout > 1024) fail('fanout must be a safe integer from 2 through 1024', 'fanout');
  const leaves = receiptHashes.map((hash, index) => cloneAndFreeze({ level: 0, start: index, endExclusive: index + 1, hash: validHash(hash, `receiptHashes.${index}`) }));
  const levels = [cloneAndFreeze(leaves)];
  let current = leaves;
  let level = 1;
  while (current.length > 1) {
    const parents = [];
    for (let index = 0; index < current.length; index += fanout) parents.push(parentNode(current.slice(index, index + fanout), level, fanout));
    levels.push(cloneAndFreeze(parents));
    current = parents;
    level += 1;
  }
  const core = cloneAndFreeze({
    format: 'temporal-crystal',
    schemaVersion: '1.0.0',
    fanout,
    leafCount: leaves.length,
    levels,
    rootHash: levels.at(-1)[0].hash,
  });
  return cloneAndFreeze({ ...core, crystalHash: sha256Hex(core) });
}

export function createCrystalInclusionProof(crystal, leafIndex) {
  if (!crystal || crystal.format !== 'temporal-crystal' || !Array.isArray(crystal.levels)) fail('Invalid Temporal Crystal', 'crystal');
  if (!Number.isSafeInteger(leafIndex) || leafIndex < 0 || leafIndex >= crystal.leafCount) fail('leafIndex is outside the crystal', 'leafIndex');
  const levels = [];
  let nodeIndex = leafIndex;
  for (let level = 0; level < crystal.levels.length - 1; level += 1) {
    const current = crystal.levels[level];
    const groupStart = Math.floor(nodeIndex / crystal.fanout) * crystal.fanout;
    const group = current.slice(groupStart, groupStart + crystal.fanout);
    const childPosition = nodeIndex - groupStart;
    const target = group[childPosition];
    const siblings = group
      .map((node, position) => ({ node, position }))
      .filter(({ position }) => position !== childPosition)
      .map(({ node, position }) => cloneAndFreeze({ position, start: node.start, endExclusive: node.endExclusive, hash: node.hash }));
    const parent = crystal.levels[level + 1][Math.floor(nodeIndex / crystal.fanout)];
    levels.push(cloneAndFreeze({
      level: level + 1,
      childPosition,
      childStart: target.start,
      childEndExclusive: target.endExclusive,
      parentStart: parent.start,
      parentEndExclusive: parent.endExclusive,
      childCount: group.length,
      siblings,
    }));
    nodeIndex = Math.floor(nodeIndex / crystal.fanout);
  }
  return cloneAndFreeze({
    format: 'temporal-crystal-inclusion-proof',
    schemaVersion: '1.0.0',
    fanout: crystal.fanout,
    leafIndex,
    leafCount: crystal.leafCount,
    levels,
  });
}

function proofNodeHash(level, fanout, entry, currentHash) {
  if (!Number.isSafeInteger(entry.childPosition) || entry.childPosition < 0 || entry.childPosition >= entry.childCount) return null;
  const children = Array(entry.childCount).fill(null);
  children[entry.childPosition] = { start: entry.childStart, endExclusive: entry.childEndExclusive, hash: currentHash };
  for (const sibling of entry.siblings) {
    if (!sibling || !Number.isSafeInteger(sibling.position) || sibling.position < 0 || sibling.position >= entry.childCount || children[sibling.position]) return null;
    if (!HASH.test(sibling.hash)) return null;
    children[sibling.position] = { start: sibling.start, endExclusive: sibling.endExclusive, hash: sibling.hash };
  }
  if (children.some((child) => child === null)) return null;
  if (children[0].start !== entry.parentStart || children.at(-1).endExclusive !== entry.parentEndExclusive) return null;
  for (let index = 1; index < children.length; index += 1) if (children[index - 1].endExclusive !== children[index].start) return null;
  return sha256Hex({
    format: 'temporal-crystal-node-v1',
    fanout,
    level,
    start: entry.parentStart,
    endExclusive: entry.parentEndExclusive,
    childHashes: children.map((child) => child.hash),
  });
}

export function verifyCrystalInclusionProof(leafHash, proof, expectedRoot) {
  try {
    if (!HASH.test(leafHash) || !HASH.test(expectedRoot)) return false;
    if (!proof || proof.format !== 'temporal-crystal-inclusion-proof' || proof.schemaVersion !== '1.0.0') return false;
    if (!Number.isSafeInteger(proof.fanout) || proof.fanout < 2 || !Array.isArray(proof.levels)) return false;
    let currentHash = leafHash;
    for (let index = 0; index < proof.levels.length; index += 1) {
      currentHash = proofNodeHash(index + 1, proof.fanout, proof.levels[index], currentHash);
      if (!currentHash) return false;
    }
    return currentHash === expectedRoot;
  } catch {
    return false;
  }
}

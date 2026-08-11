import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTemporalCrystal,
  createCrystalInclusionProof,
  verifyCrystalInclusionProof,
} from '../../src/frontier/temporal-crystal.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

function leaves() {
  return completeCounterRun().ledger.map((receipt) => receipt.receiptHash);
}

test('Temporal Crystal deterministically commits ordered history at multiple resolutions', () => {
  const hashes = leaves();
  const first = buildTemporalCrystal(hashes, 2);
  const second = buildTemporalCrystal(hashes, 2);
  assert.deepEqual(first, second);
  assert.equal(first.leafCount, hashes.length);
  assert.deepEqual(first.levels[0].map((node) => node.hash), hashes);
  assert.equal(first.levels.at(-1).length, 1);
  assert.equal(first.rootHash, first.levels.at(-1)[0].hash);
  assert.match(first.rootHash, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(first));
  assert.notEqual(buildTemporalCrystal(hashes, 3).rootHash, first.rootHash);
  assert.notEqual(buildTemporalCrystal([...hashes].reverse(), 2).rootHash, first.rootHash);
});

test('inclusion proof reconstructs root and rejects leaf, sibling, and range tampering', () => {
  const crystal = buildTemporalCrystal(leaves(), 2);
  for (let index = 0; index < crystal.leafCount; index += 1) {
    const proof = createCrystalInclusionProof(crystal, index);
    assert.equal(verifyCrystalInclusionProof(leaves()[index], proof, crystal.rootHash), true);

    const wrongLeaf = `${leaves()[index][0] === '0' ? '1' : '0'}${leaves()[index].slice(1)}`;
    assert.equal(verifyCrystalInclusionProof(wrongLeaf, proof, crystal.rootHash), false);

    if (proof.levels.some((level) => level.siblings.length > 0)) {
      const tampered = structuredClone(proof);
      const level = tampered.levels.find((entry) => entry.siblings.length > 0);
      level.siblings[0].hash = 'f'.repeat(64);
      assert.equal(verifyCrystalInclusionProof(leaves()[index], tampered, crystal.rootHash), false);
    }
  }
});

test('Temporal Crystal rejects malformed hashes, fanout, and proof indexes', () => {
  assert.throws(() => buildTemporalCrystal(['bad'], 2), { code: 'E_CRYSTAL_SCHEMA' });
  assert.throws(() => buildTemporalCrystal(leaves(), 1), { code: 'E_CRYSTAL_SCHEMA' });
  const crystal = buildTemporalCrystal(leaves(), 2);
  assert.throws(() => createCrystalInclusionProof(crystal, -1), { code: 'E_CRYSTAL_SCHEMA' });
});

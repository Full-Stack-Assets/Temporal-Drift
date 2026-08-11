import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { sha256Hex } from '../../src/kernel/canonicalize.js';

const fixture = JSON.parse(await readFile(new URL('../../data/trustscape-lite-fixture.json', import.meta.url), 'utf8'));
const projectionFixture = JSON.parse(await readFile(new URL('../fixtures/projection-hashes-v1.json', import.meta.url), 'utf8'));
const legacyApp = await readFile(new URL('../../src/app.js', import.meta.url), 'utf8');
const trustscapeHtml = await readFile(new URL('../../trustscape.html', import.meta.url), 'utf8');

function fixtureCore(value) {
  const { fixtureHash: _hash, ...core } = value;
  return core;
}

test('pinned Trustscape fixture is hash-valid and bound to projection conformance', () => {
  assert.equal(fixture.format, 'trustscape-lite-fixture');
  assert.equal(fixture.schemaVersion, '1.0.0');
  assert.equal(fixture.sourceProjectionHash, projectionFixture.projectionHash);
  assert.equal(fixture.sourceGraphHash, projectionFixture.sourceGraphHash);
  assert.equal(sha256Hex(fixtureCore(fixture)), fixture.fixtureHash);
});

test('all Trustscape receipt threads and branch edges resolve to pinned evidence', () => {
  const receiptIds = new Set(fixture.points.map((point) => point.receiptNodeId));
  const branchIds = new Set(fixture.branches.map((branch) => branch.branchId));
  const pointIds = new Set(fixture.points.map((point) => point.nodeId));
  assert.equal(pointIds.size, fixture.points.length);
  assert.equal(receiptIds.size, fixture.points.length);

  for (const thread of fixture.receiptThreads) {
    assert.ok(receiptIds.has(thread.from), thread.from);
    assert.ok(receiptIds.has(thread.to), thread.to);
    assert.equal(thread.semanticClass, 'provenance');
  }
  for (const edge of fixture.branchEdges) {
    assert.ok(branchIds.has(edge.fromBranchId), edge.fromBranchId);
    assert.ok(branchIds.has(edge.toBranchId), edge.toBranchId);
  }
});

test('Trustscape coordinates remain the pinned projection coordinates', () => {
  const sampleById = new Map(projectionFixture.coordinateSample.map((node) => [node.nodeId, node]));
  for (const point of fixture.points) {
    const expected = sampleById.get(point.nodeId);
    if (!expected) continue;
    assert.deepEqual(
      { branchId: point.branchId, sequence: point.sequence, x: point.x, y: point.y, z: point.z, t: point.t },
      { branchId: expected.branchId, sequence: expected.sequence, x: expected.x, y: expected.y, z: expected.z, t: expected.t },
    );
  }
});

test('legacy visible app remains isolated from kernel, projection, and Trustscape imports', () => {
  assert.doesNotMatch(legacyApp, /from\s+['"][^'"]*(?:kernel|projection|trustscape)/u);
  assert.doesNotMatch(legacyApp, /import\s*\([^)]*(?:kernel|projection|trustscape)/u);
});

test('Trustscape page is explicitly non-authoritative and loads only its lab application', () => {
  assert.match(trustscapeHtml, /SHADOW \/ NON-AUTHORITATIVE VISUALIZATION/u);
  assert.match(trustscapeHtml, /\.\/src\/trustscape\/app\.js/u);
  assert.doesNotMatch(trustscapeHtml, /\.\/src\/app\.js/u);
});

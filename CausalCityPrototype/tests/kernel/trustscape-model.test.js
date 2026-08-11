import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createRunGraph, forkBranch } from '../../src/kernel/run-graph.js';
import { createAnnotation } from '../../src/projection/annotations.js';
import { projectRunGraph } from '../../src/projection/project-4d.js';
import { buildTrustscapeScene } from '../../src/trustscape/model.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

function projectionFixture() {
  let graph = createRunGraph(completeCounterRun(), 'Root');
  const a = forkBranch(graph, { parentBranchId: graph.rootBranchId, forkStepId: 's1', label: 'Plan A' });
  graph = a.graph;
  const b = forkBranch(graph, {
    parentBranchId: graph.rootBranchId,
    forkStepId: 's2',
    label: 'Plan B',
    inputs: [{ stepId: 'alt', type: 'increment', payload: { amount: 9 } }],
  });
  return projectRunGraph(b.graph);
}

test('Trustscape scene is deterministic, immutable, and preserves projection coordinates', () => {
  const projection = projectionFixture();
  const first = buildTrustscapeScene(projection);
  const second = buildTrustscapeScene(projection);

  assert.equal(first.format, 'trustscape-lite-scene');
  assert.equal(first.schemaVersion, '1.0.0');
  assert.equal(first.sourceProjectionHash, projection.projectionHash);
  assert.equal(canonicalString(first), canonicalString(second));
  assert.ok(Object.isFrozen(first));
  assert.match(first.sceneHash, /^[a-f0-9]{64}$/);
  assert.equal(first.points.length, projection.dimensions.temporal.nodes.length);

  const projectedById = new Map(projection.dimensions.temporal.nodes.map((node) => [node.nodeId, node]));
  for (const point of first.points) {
    const source = projectedById.get(point.nodeId);
    assert.ok(source);
    assert.deepEqual([point.x, point.y, point.z, point.t], [source.x, source.y, source.z, source.t]);
  }
});

test('scene threads and branch edges resolve only to declared projection evidence', () => {
  const projection = projectionFixture();
  const scene = buildTrustscapeScene(projection);
  const receiptIds = new Set(projection.dimensions.temporal.nodes.map((node) => node.receiptNodeId));
  const branchIds = new Set(projection.dimensions.branching.nodes.map((node) => node.branchId));

  for (const thread of scene.receiptThreads) {
    assert.ok(receiptIds.has(thread.from));
    assert.ok(receiptIds.has(thread.to));
    assert.equal(thread.semanticClass, 'provenance');
  }
  for (const edge of scene.branchEdges) {
    assert.ok(branchIds.has(edge.fromBranchId));
    assert.ok(branchIds.has(edge.toBranchId));
  }
});

test('annotations create radar items without changing source projection identity', () => {
  const projection = projectionFixture();
  const target = projection.dimensions.temporal.nodes.at(-1);
  const annotation = createAnnotation({
    authorId: 'planner-a',
    targetType: 'snapstate',
    targetId: target.nodeId,
    body: 'Review this branch point.',
    createdLogicalTime: 11,
    supersedes: null,
  });
  const base = buildTrustscapeScene(projection);
  const annotated = buildTrustscapeScene(projection, [annotation]);

  assert.equal(annotated.sourceProjectionHash, base.sourceProjectionHash);
  assert.equal(annotated.radarItems.length, 1);
  assert.equal(annotated.radarItems[0].targetId, target.nodeId);
  assert.notEqual(annotated.sceneHash, base.sceneHash);
});

test('tampered projection hashes and unresolved annotation references fail closed', () => {
  const projection = projectionFixture();
  const tampered = JSON.parse(canonicalString(projection));
  tampered.dimensions.temporal.nodes[0].x += 1;
  assert.throws(() => buildTrustscapeScene(tampered), { code: 'E_TRUSTSCAPE_PROJECTION' });

  const missing = createAnnotation({
    authorId: 'planner-a',
    targetType: 'snapstate',
    targetId: 'snapstate:missing',
    body: 'Should fail.',
    createdLogicalTime: 12,
    supersedes: null,
  });
  assert.throws(() => buildTrustscapeScene(projection, [missing]), { code: 'E_TRUSTSCAPE_REFERENCE' });
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { createRunGraph, forkBranch } from '../../src/kernel/run-graph.js';
import { canonicalString } from '../../src/kernel/canonicalize.js';
import { createAnnotation } from '../../src/projection/annotations.js';
import { projectRunGraph } from '../../src/projection/project-4d.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

function fixtureGraph(rootLabel = 'Root') {
  const root = createRunGraph(completeCounterRun(), rootLabel);
  const a = forkBranch(root, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: 'Plan A',
  });
  const b = forkBranch(a.graph, {
    parentBranchId: a.graph.rootBranchId,
    forkStepId: 's2',
    label: 'Plan B',
    inputs: [{ stepId: 'alt', type: 'increment', payload: { amount: 9 } }],
  });
  return b.graph;
}

test('projectRunGraph is deterministic, deeply immutable, and integer-coordinate only', () => {
  const graph = fixtureGraph();
  const graphBefore = canonicalString(graph);
  const first = projectRunGraph(graph);
  const second = projectRunGraph(graph);

  assert.equal(first.format, 'ripple-4d-projection');
  assert.equal(first.schemaVersion, '1.0.0');
  assert.equal(first.graphId, graph.graphId);
  assert.equal(first.sourceGraphHash, graph.graphHash);
  assert.equal(canonicalString(first), canonicalString(second));
  assert.equal(canonicalString(graph), graphBefore);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.dimensions));
  assert.match(first.projectionHash, /^[a-f0-9]{64}$/);

  for (const node of first.dimensions.temporal.nodes) {
    for (const coordinate of [node.x, node.y, node.z, node.t]) assert.ok(Number.isSafeInteger(coordinate));
  }
});

test('branch lanes and projection hash ignore human labels but react to construction', () => {
  const alpha = projectRunGraph(fixtureGraph('Alpha'));
  const beta = projectRunGraph(fixtureGraph('Beta'));

  const alphaLanes = alpha.dimensions.branching.nodes.map(({ branchId, lane, depth }) => ({ branchId, lane, depth }));
  const betaLanes = beta.dimensions.branching.nodes.map(({ branchId, lane, depth }) => ({ branchId, lane, depth }));
  assert.deepEqual(alphaLanes, betaLanes);

  // Labels are presentation metadata and therefore may change the projection bytes,
  // but cannot alter canonical branch identity or deterministic coordinates.
  assert.deepEqual(
    alpha.dimensions.temporal.nodes.map(({ branchId, x, y, z, t }) => ({ branchId, x, y, z, t })),
    beta.dimensions.temporal.nodes.map(({ branchId, x, y, z, t }) => ({ branchId, x, y, z, t })),
  );
});

test('causal dimension contains provenance-only receipt, fork, and event commitment edges', () => {
  const projection = projectRunGraph(fixtureGraph());
  assert.ok(projection.dimensions.causal.edges.length > 0);
  for (const edge of projection.dimensions.causal.edges) {
    assert.equal(edge.semanticClass, 'provenance');
    assert.ok(['receipt-chain', 'fork', 'event-batch'].includes(edge.kind));
    assert.equal(typeof edge.from, 'string');
    assert.equal(typeof edge.to, 'string');
  }

  const forkEdges = projection.dimensions.causal.edges.filter((edge) => edge.kind === 'fork');
  assert.equal(forkEdges.length, projection.dimensions.branching.edges.length);
});

test('annotations are content-addressed adjuncts and do not alter the base projection hash', () => {
  const graph = fixtureGraph();
  const base = projectRunGraph(graph);
  const target = base.dimensions.temporal.nodes.at(-1);
  const annotation = createAnnotation({
    authorId: 'reviewer-a',
    targetType: 'snapstate',
    targetId: target.nodeId,
    body: 'Inspect this divergence.',
    createdLogicalTime: 7,
    supersedes: null,
  });
  const annotated = projectRunGraph(graph, { annotations: [annotation] });

  assert.match(annotation.annotationId, /^annotation-[a-f0-9]{64}$/);
  assert.equal(annotated.baseProjectionHash, base.projectionHash);
  assert.equal(annotated.dimensions.subjective.annotations.length, 1);
  assert.notEqual(annotated.projectionHash, base.projectionHash);
});

test('annotation validation fails closed for malformed or ambiguous records', () => {
  assert.throws(() => createAnnotation({
    authorId: 'a',
    targetType: 'snapstate',
    targetId: 'x',
    body: 'bad',
    createdLogicalTime: 1,
    supersedes: null,
    extra: true,
  }), { code: 'E_ANNOTATION_SCHEMA' });

  assert.throws(() => createAnnotation({
    authorId: 'a',
    targetType: 'unknown',
    targetId: 'x',
    body: 'bad',
    createdLogicalTime: 1,
    supersedes: null,
  }), { code: 'E_ANNOTATION_SCHEMA' });
});

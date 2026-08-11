import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import { exportRunGraph } from '../../src/kernel/run-graph.js';
import {
  exportProjection,
  parseProjection,
  projectRunGraph4D,
  verifyProjection,
} from '../../src/projector/index.js';
import { createProjectionGraph, subjectiveRecord } from './helpers/projection-fixture.js';

const HASH = /^[a-f0-9]{64}$/;
const PROJECTION_ID = /^projection-[a-f0-9]{64}$/;

function projectionCoordinates(projection) {
  return Object.fromEntries(projection.dimensions.temporal.points.map((point) => [
    `${point.branchId}:${point.stepId}`,
    point.coordinates,
  ]));
}

test('4D projection is pure and binds every temporal point to its exact receipt and Snapstate', () => {
  const fixture = createProjectionGraph();
  const graphBefore = exportRunGraph(fixture.graph);
  const projection = projectRunGraph4D(fixture.graph);

  assert.equal(exportRunGraph(fixture.graph), graphBefore);
  assert.equal(projection.format, 'ripple-4d-projection');
  assert.equal(projection.schemaVersion, '1.0.0');
  assert.equal(projection.projectionVersion, '4d-projector-v1');
  assert.equal(projection.coordinateScale, 1000);
  assert.equal(projection.source.branchCount, 4);
  assert.match(projection.projectionId, PROJECTION_ID);
  assert.match(projection.projectionHash, HASH);
  assert.equal(projection.dimensions.temporal.points.length, 12);
  assert.ok(Object.isFrozen(projection));
  assert.ok(Object.isFrozen(projection.dimensions.temporal.points));

  const graphValue = JSON.parse(graphBefore);
  for (const point of projection.dimensions.temporal.points) {
    const run = JSON.parse(graphValue.runExports[point.branchId]);
    const receipt = run.receipts[point.sequence];
    const snapstate = run.snapstates[point.sequence];
    assert.equal(point.runId, run.manifest.runId);
    assert.equal(point.stepId, receipt.stepId);
    assert.equal(point.stepId, snapstate.stepId);
    assert.equal(point.receiptHash, receipt.receiptHash);
    assert.equal(point.stateHash, snapstate.stateHash);
    assert.equal(point.previousReceiptHash, receipt.previousReceiptHash);
    assert.equal(point.coordinates.t, point.sequence * projection.coordinateScale);
    for (const value of Object.values(point.coordinates)) assert.equal(Number.isSafeInteger(value), true);
  }
});

test('causal-provenance dimension contains complete receipt, event, sequence, emission, and fork edges', () => {
  const { graph } = createProjectionGraph();
  const projection = projectRunGraph4D(graph);
  const { nodes, edges } = projection.dimensions.causal;
  const receiptNodes = nodes.filter((node) => node.kind === 'receipt');
  const eventNodes = nodes.filter((node) => node.kind === 'event');
  const precedes = edges.filter((edge) => edge.kind === 'precedes');
  const emits = edges.filter((edge) => edge.kind === 'emits');
  const forks = edges.filter((edge) => edge.kind === 'forks');

  assert.equal(receiptNodes.length, 12);
  assert.equal(eventNodes.length, 8);
  assert.equal(precedes.length, 8);
  assert.equal(emits.length, 8);
  assert.equal(forks.length, 3);
  assert.equal(new Set(nodes.map((node) => node.nodeId)).size, nodes.length);
  assert.equal(new Set(edges.map((edge) => edge.edgeId)).size, edges.length);
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  for (const edge of edges) {
    assert.equal(nodeIds.has(edge.fromNodeId), true, edge.fromNodeId);
    assert.equal(nodeIds.has(edge.toNodeId), true, edge.toNodeId);
  }
});

test('branch coordinates depend on canonical topology rather than display labels', () => {
  const left = createProjectionGraph({ root: 'One', planA: 'A', planB: 'B', detail: 'C' });
  const right = createProjectionGraph({ root: 'Root renamed', planA: 'Alpha', planB: 'Beta', detail: 'Gamma' });
  const leftProjection = projectRunGraph4D(left.graph);
  const rightProjection = projectRunGraph4D(right.graph);

  assert.deepEqual(projectionCoordinates(leftProjection), projectionCoordinates(rightProjection));
  assert.equal(leftProjection.dimensions.branching.nodes.length, 4);
  assert.equal(leftProjection.dimensions.branching.edges.length, 3);
  const root = leftProjection.dimensions.branching.nodes.find((node) => node.branchId === left.rootBranchId);
  const detail = leftProjection.dimensions.branching.nodes.find((node) => node.branchId === left.detailBranchId);
  assert.equal(root.depth, 0);
  assert.equal(detail.depth, 2);
  assert.equal(root.parentBranchId, null);
});

test('subjective absence is explicit and supplied records receive deterministic signed tension', () => {
  const fixture = createProjectionGraph();
  const empty = projectRunGraph4D(fixture.graph);
  assert.deepEqual(new Set(empty.dimensions.subjective.statusByBranch.map((entry) => entry.status)), new Set(['not-modeled']));
  assert.equal(empty.dimensions.subjective.records.length, 0);

  const record = subjectiveRecord(fixture.planABranchId);
  const first = projectRunGraph4D(fixture.graph, { subjectiveRecords: [record] });
  const second = projectRunGraph4D(fixture.graph, { subjectiveRecords: [structuredClone(record)] });
  assert.equal(exportProjection(first), exportProjection(second));
  assert.equal(first.dimensions.subjective.records.length, 1);
  assert.equal(first.dimensions.subjective.records[0].tension, 5);
  assert.match(first.dimensions.subjective.records[0].subjectiveRecordId, /^subjective-[a-f0-9]{64}$/);
  assert.equal(first.dimensions.subjective.statusByBranch.find((entry) => entry.branchId === fixture.planABranchId).status, 'modeled-from-explicit-records');
  assert.throws(() => projectRunGraph4D(fixture.graph, { subjectiveRecords: [record, record] }), { code: 'E_PROJECTION_SCHEMA' });
});

test('projection export parses canonically and verification fails closed on hash or source mismatch', () => {
  const fixture = createProjectionGraph();
  const projection = projectRunGraph4D(fixture.graph, { subjectiveRecords: [subjectiveRecord(fixture.planABranchId)] });
  const exported = exportProjection(projection);
  const parsed = parseProjection(exported);

  assert.equal(exportProjection(parsed), exported);
  assert.equal(verifyProjection(parsed).ok, true);
  assert.equal(verifyProjection(parsed, fixture.graph).ok, true);

  const hashTamper = JSON.parse(exported);
  hashTamper.projectionHash = 'f'.repeat(64);
  assert.equal(verifyProjection(hashTamper).ok, false);
  assert.equal(verifyProjection(hashTamper).errorCode, 'E_PROJECTION_HASH');

  const different = createProjectionGraph();
  const otherGraphValue = JSON.parse(exportRunGraph(different.graph));
  otherGraphValue.sourceRootRunId = 'another-run';
  assert.notEqual(canonicalString(otherGraphValue), exportRunGraph(fixture.graph));
  const sourceReport = verifyProjection(parsed, different.graph);
  assert.equal(sourceReport.ok, true, 'semantically identical graph fixture is accepted');
});

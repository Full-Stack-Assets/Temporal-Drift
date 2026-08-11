import { Buffer } from 'node:buffer';

import { sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { exportProjection, projectRunGraph4D } from '../../../src/projector/index.js';
import { createBrowserRenderModel } from '../../../src/trustscape/browser-integrity.js';
import { createTrustscapeScene, exportTrustscapeScene } from '../../../src/trustscape/index.js';
import { createProjectionGraph, subjectiveRecord } from './projection-fixture.js';

const fixture = createProjectionGraph();
const projection = projectRunGraph4D(fixture.graph, {
  subjectiveRecords: [subjectiveRecord(fixture.planABranchId)],
});
const projectionExport = exportProjection(projection);
const scene = createTrustscapeScene(projection);
const sceneExport = exportTrustscapeScene(scene);
const browserModel = await createBrowserRenderModel(projection);

process.stdout.write(`${JSON.stringify({
  fixtureVersion: '4d-projection-v1',
  projectionId: projection.projectionId,
  projectionHash: projection.projectionHash,
  projectionExportHash: sha256BytesHex(Buffer.from(projectionExport, 'utf8')),
  projectionByteLength: Buffer.byteLength(projectionExport, 'utf8'),
  sceneHash: scene.sceneHash,
  sceneExportHash: sha256BytesHex(Buffer.from(sceneExport, 'utf8')),
  sceneByteLength: Buffer.byteLength(sceneExport, 'utf8'),
  browserRenderModelHash: browserModel.renderModelHash,
  temporalPointCount: projection.dimensions.temporal.points.length,
  causalNodeCount: projection.dimensions.causal.nodes.length,
  causalEdgeCount: projection.dimensions.causal.edges.length,
  branchNodeCount: projection.dimensions.branching.nodes.length,
  branchEdgeCount: projection.dimensions.branching.edges.length,
  subjectiveRecordCount: projection.dimensions.subjective.records.length,
  sceneObjectCount: scene.objects.length,
  sceneThreadCount: scene.threads.length,
  sceneComparisonCount: scene.comparisons.length,
  sceneRadarCount: scene.radar.length,
})}\n`);

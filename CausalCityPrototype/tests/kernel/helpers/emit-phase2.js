import { Buffer } from 'node:buffer';

import { canonicalString, sha256BytesHex, sha256Hex } from '../../../src/kernel/canonicalize.js';
import { createPhase2Fixture } from './phase2-fixture.js';

const fixture = createPhase2Fixture();
const byteHash = (value) => sha256BytesHex(Buffer.from(value, 'utf8'));
const summary = {
  fixtureVersion: 'phase2-approximations-v1',
  topographyHash: fixture.topography.topographyHash,
  topographyExportHash: byteHash(fixture.exports.topography),
  topographyByteLength: Buffer.byteLength(fixture.exports.topography, 'utf8'),
  sampleIds: fixture.topography.samples.map((entry) => entry.sampleId),
  cliffCandidateCount: fixture.topography.sensitivities.filter((entry) => entry.classification === 'cliff-candidate').length,
  explorationHash: fixture.exploration.explorationHash,
  explorationExportHash: byteHash(fixture.exports.exploration),
  explorationByteLength: Buffer.byteLength(fixture.exports.exploration, 'utf8'),
  terminalPrngState: fixture.exploration.terminalPrngState,
  candidateCount: fixture.exploration.candidates.length,
  paretoFrontier: fixture.exploration.paretoFrontier,
  explorationProposalIds: fixture.exploration.proposals.map((entry) => entry.proposalId),
  memoryArtifactHash: fixture.memory.memoryArtifactHash,
  memoryExportHash: byteHash(fixture.exports.memory),
  memoryByteLength: Buffer.byteLength(fixture.exports.memory, 'utf8'),
  memoryRecordIds: fixture.memory.records.map((entry) => entry.memoryRecordId),
  memoryWindowGroupIds: fixture.memory.groups.map((entry) => entry.memoryWindowGroupId),
  registryHash: fixture.registry.registryHash,
  registryExportHash: byteHash(fixture.exports.registry),
  registryByteLength: Buffer.byteLength(fixture.exports.registry, 'utf8'),
  registryProposalId: fixture.registry.proposals[0].proposalId,
  registryReviewIds: fixture.registry.reviews.map((entry) => entry.reviewId),
  registryDecisionId: fixture.registry.decisions[0].decisionId,
  proposalStatus: fixture.proposalStatus.status,
  workProfileHash: fixture.workProfile.workProfileHash,
  workUnitCount: fixture.workProfile.workUnitCount,
  chunkPlanHash: fixture.chunkPlan.chunkPlanHash,
  chunkPlanExportHash: byteHash(fixture.exports.chunkPlan),
  chunkPlanByteLength: Buffer.byteLength(fixture.exports.chunkPlan, 'utf8'),
  chunkIds: fixture.chunkPlan.chunks.map((entry) => entry.chunkId),
};
summary.bundleHash = sha256Hex(summary);
process.stdout.write(`${JSON.stringify(summary)}\n`);

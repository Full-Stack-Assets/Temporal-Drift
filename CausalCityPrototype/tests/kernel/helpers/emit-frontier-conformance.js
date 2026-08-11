import { canonicalString, sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { commitSyntheticPopulation } from '../../../src/frontier/population-commitment.js';
import {
  buildTemporalCrystal,
  createCrystalInclusionProof,
  verifyCrystalInclusionProof,
} from '../../../src/frontier/temporal-crystal.js';
import { createRewindArtifact, restoreRewindArtifact } from '../../../src/frontier/rewind.js';
import { rankSurprises } from '../../../src/frontier/surprise-dividend.js';
import { scoreRobustness } from '../../../src/frontier/robustness.js';
import {
  appendInstitutionalMemory,
  createInstitutionalMemoryLedger,
  verifyInstitutionalMemoryLedger,
} from '../../../src/frontier/institutional-memory.js';
import { completeCounterRun, resolveCounterAdapter } from './run-graph-fixture.js';

const population = commitSyntheticPopulation({
  seed: 'frontier-population-seed-v1',
  populationSize: 100000,
  shardSize: 1024,
  profileVersion: 'minimal-agent-commitment-v1',
});

const run = completeCounterRun({ evidenceRuntime: 'frontier-conformance-v1' });
const receiptHashes = run.ledger.map((receipt) => receipt.receiptHash);
const crystal = buildTemporalCrystal(receiptHashes, 2);
const proof = createCrystalInclusionProof(crystal, 2);
if (!verifyCrystalInclusionProof(receiptHashes[2], proof, crystal.rootHash)) throw new Error('Temporal Crystal proof did not verify');

const rewind = createRewindArtifact(run, 2);
const restored = restoreRewindArtifact(rewind, resolveCounterAdapter(run.manifest.model));

const surprises = rankSurprises([
  { surpriseId: 's-a', delta: 4, persistence: 10, sourceHash: 'a'.repeat(64) },
  { surpriseId: 's-b', delta: -20, persistence: 2, sourceHash: 'b'.repeat(64) },
  { surpriseId: 's-c', delta: 9, persistence: 8, sourceHash: 'c'.repeat(64) },
]);

const robustness = scoreRobustness({
  branches: [
    { branchId: 'branch-a', outcomes: { normal: 80, recession: 50, storm: 60 } },
    { branchId: 'branch-b', outcomes: { normal: 95, recession: 20, storm: 70 } },
    { branchId: 'branch-c', outcomes: { normal: 70, recession: 65, storm: 68 } },
  ],
}, { survivalThreshold: 60 });

let institutional = createInstitutionalMemoryLedger();
institutional = appendInstitutionalMemory(institutional, {
  decisionId: 'decision-1', logicalTime: 1, sourceEvidenceHash: '1'.repeat(64),
  decisionSummary: 'Synthetic decision one', expectedOutcomeHash: '2'.repeat(64),
  observedOutcomeHash: null, narrativeHash: null, reviewStatus: 'pending',
});
institutional = appendInstitutionalMemory(institutional, {
  decisionId: 'decision-2', logicalTime: 2, sourceEvidenceHash: '3'.repeat(64),
  decisionSummary: 'Synthetic decision two', expectedOutcomeHash: '4'.repeat(64),
  observedOutcomeHash: '5'.repeat(64), narrativeHash: '6'.repeat(64), reviewStatus: 'reviewed',
});
const institutionalReport = verifyInstitutionalMemoryLedger(institutional);
if (!institutionalReport.ok) throw new Error('Institutional memory ledger did not verify');

const populationBytes = canonicalString(population);
const crystalBytes = canonicalString(crystal);
const rewindBytes = canonicalString(rewind);
const robustnessBytes = canonicalString(robustness);

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'frontier-foundations-v1',
  populationSize: population.populationSize,
  populationShardCount: population.shards.length,
  populationRoot: population.populationRoot,
  populationFirstShardHash: population.shards[0].shardHash,
  populationLastShardHash: population.shards.at(-1).shardHash,
  populationBytesHash: sha256BytesHex(Buffer.from(populationBytes, 'utf8')),
  crystalRootHash: crystal.rootHash,
  crystalHash: crystal.crystalHash,
  crystalBytesHash: sha256BytesHex(Buffer.from(crystalBytes, 'utf8')),
  crystalProofLevelCount: proof.levels.length,
  crystalProofVerified: true,
  rewindArtifactHash: rewind.artifactHash,
  rewindBytesHash: sha256BytesHex(Buffer.from(rewindBytes, 'utf8')),
  rewindTargetReceiptHash: rewind.targetReceiptHash,
  rewindRestoredReceiptHash: restored.ledger.at(-1).receiptHash,
  rewindRestoredStateHash: restored.snapstates.at(-1).stateHash,
  surpriseHash: surprises.surpriseHash,
  surpriseOrder: surprises.items.map((item) => item.surpriseId),
  robustnessHash: robustness.robustnessHash,
  robustnessBytesHash: sha256BytesHex(Buffer.from(robustnessBytes, 'utf8')),
  robustnessOrder: robustness.branches.map((branch) => branch.branchId),
  institutionalRecordCount: institutionalReport.recordCount,
  institutionalTerminalRecordHash: institutionalReport.terminalRecordHash,
  institutionalLedgerBytesHash: sha256BytesHex(Buffer.from(canonicalString(institutional), 'utf8')),
  surpriseHumanReviewRequired: surprises.humanReviewRequired,
  surpriseAutoCalibrationAllowed: surprises.autoCalibrationAllowed,
  surpriseAutoForkAllowed: surprises.autoForkAllowed,
})}\n`);

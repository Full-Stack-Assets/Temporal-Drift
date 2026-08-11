import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString, sha256Hex } from '../../src/kernel/canonicalize.js';
import {
  exploreBranchCandidates,
  exportBranchExploration,
  verifyBranchExploration,
} from '../../src/approximations/explorer.js';

const GRAPH_ID = `graph-${'a'.repeat(64)}`;
const BRANCH_ID = `branch-${'b'.repeat(64)}`;
const RECEIPT_HASH = 'c'.repeat(64);

function evaluator() {
  return {
    id: 'branch-policy-evaluator',
    version: '1.0.0',
    evaluate(parameters) {
      return {
        employment: parameters.jobs * 3 + parameters.housing,
        pressure: parameters.jobs * 2 - parameters.housing,
      };
    },
  };
}

function config(overrides = {}) {
  return {
    parentRef: {
      graphId: GRAPH_ID,
      parentBranchId: BRANCH_ID,
      forkStepId: 's1',
      parentReceiptHash: RECEIPT_HASH,
    },
    seedState: [1, 2, 3, 4],
    axes: [
      { axisId: 'jobs', minimum: 0, maximum: 100, step: 10 },
      { axisId: 'housing', minimum: 0, maximum: 200, step: 20 },
    ],
    initialCandidates: [
      { parameters: { jobs: 40, housing: 100 } },
      { parameters: { jobs: 60, housing: 80 } },
    ],
    objectives: [
      { metricId: 'employment', direction: 'maximize', weight: 2 },
      { metricId: 'pressure', direction: 'minimize', weight: 1 },
    ],
    evaluator: evaluator(),
    populationLimit: 6,
    survivorCount: 2,
    generations: 2,
    proposalLimit: 3,
    ...overrides,
  };
}

function rehash(value) {
  const { explorationHash: _old, ...core } = value;
  value.explorationHash = sha256Hex(core);
  return value;
}

test('bounded exploration is deterministic, pure, and preserves explicit PRNG state', () => {
  const input = config();
  const before = canonicalString({ ...input, evaluator: { id: input.evaluator.id, version: input.evaluator.version } });
  const first = exploreBranchCandidates(input);
  const second = exploreBranchCandidates(config());

  assert.equal(canonicalString({ ...input, evaluator: { id: input.evaluator.id, version: input.evaluator.version } }), before);
  assert.equal(exportBranchExploration(first), exportBranchExploration(second));
  assert.equal(first.format, 'ripple-branch-exploration');
  assert.equal(first.schemaVersion, '1.0.0');
  assert.equal(first.approximation, true);
  assert.equal(first.executionAuthority, 'none');
  assert.equal(first.reviewRequired, true);
  assert.deepEqual(first.seedState, [1, 2, 3, 4]);
  assert.equal(first.terminalPrngState.length, 4);
  assert.notDeepEqual(first.terminalPrngState, first.seedState);
  assert.equal(first.generations.length, 3, 'initial generation plus two mutation generations');
  assert.equal(new Set(first.candidates.map((candidate) => candidate.candidateId)).size, first.candidates.length);
  assert.ok(first.candidates.length >= 2);
  assert.ok(Object.isFrozen(first));
  assert.equal(verifyBranchExploration(first).ok, true);
});

test('candidate score arithmetic, ranking, and bounds are explicit safe integers', () => {
  const artifact = exploreBranchCandidates(config());
  const initialA = artifact.candidates.find((candidate) => candidate.parameters.jobs === 40 && candidate.parameters.housing === 100);
  const initialB = artifact.candidates.find((candidate) => candidate.parameters.jobs === 60 && candidate.parameters.housing === 80);
  assert.equal(initialA.metrics.employment, 220);
  assert.equal(initialA.metrics.pressure, -20);
  assert.equal(initialA.score, 460);
  assert.equal(initialB.metrics.employment, 260);
  assert.equal(initialB.metrics.pressure, 40);
  assert.equal(initialB.score, 480);

  for (const candidate of artifact.candidates) {
    assert.match(candidate.candidateId, /^candidate-[a-f0-9]{64}$/);
    assert.equal(Number.isSafeInteger(candidate.score), true);
    assert.ok(candidate.parameters.jobs >= 0 && candidate.parameters.jobs <= 100);
    assert.ok(candidate.parameters.housing >= 0 && candidate.parameters.housing <= 200);
  }
  for (const generation of artifact.generations) {
    assert.match(generation.generationId, /^generation-[a-f0-9]{64}$/);
    assert.equal(generation.populationCandidateIds.length <= artifact.config.populationLimit, true);
    assert.equal(generation.survivorCandidateIds.length <= artifact.config.survivorCount, true);
  }
});

test('Pareto frontier is nondominated and proposals remain human-gated without execution authority', () => {
  const artifact = exploreBranchCandidates(config());
  assert.ok(artifact.paretoFrontier.length > 0);
  const byId = new Map(artifact.candidates.map((candidate) => [candidate.candidateId, candidate]));
  for (const candidateId of artifact.paretoFrontier) assert.equal(byId.has(candidateId), true);
  assert.equal(artifact.proposals.length <= 3, true);
  for (const proposal of artifact.proposals) {
    assert.match(proposal.proposalId, /^branch-proposal-[a-f0-9]{64}$/);
    assert.equal(proposal.status, 'proposed-for-human-review');
    assert.equal(proposal.reviewRequired, true);
    assert.equal(proposal.executionAuthority, 'none');
    assert.equal(byId.has(proposal.candidateId), true);
    assert.deepEqual(proposal.parentRef, artifact.parentRef);
    assert.equal('run' in proposal, false);
    assert.equal('branch' in proposal, false);
  }
});

test('generation mutations record parentage and stay within deterministic attempt ceilings', () => {
  const artifact = exploreBranchCandidates(config());
  for (const generation of artifact.generations.slice(1)) {
    assert.equal(generation.mutations.length <= artifact.config.populationLimit * artifact.axes.length * 8, true);
    for (const mutation of generation.mutations) {
      assert.match(mutation.mutationId, /^mutation-[a-f0-9]{64}$/);
      assert.ok(artifact.candidates.some((candidate) => candidate.candidateId === mutation.parentCandidateId));
      assert.ok(artifact.candidates.some((candidate) => candidate.candidateId === mutation.candidateId));
    }
  }
});

test('exploration rejects malformed identity, state, axes, limits, evaluator behavior, and score overflow', () => {
  assert.throws(() => exploreBranchCandidates(config({ parentRef: { ...config().parentRef, graphId: 'bad' } })), { code: 'E_EXPLORATION_CONFIG' });
  assert.throws(() => exploreBranchCandidates(config({ seedState: [0, 0, 0, 0] })), { code: /E_(INVALID_PRNG_STATE|EXPLORATION_CONFIG)/ });
  assert.throws(() => exploreBranchCandidates(config({ axes: [{ axisId: 'jobs', minimum: 10, maximum: 0, step: 1 }] })), { code: 'E_EXPLORATION_CONFIG' });
  assert.throws(() => exploreBranchCandidates(config({ survivorCount: 7 })), { code: 'E_EXPLORATION_CONFIG' });
  assert.throws(() => exploreBranchCandidates(config({ populationLimit: 1 })), { code: 'E_EXPLORATION_CONFIG' });
  assert.throws(() => exploreBranchCandidates(config({ proposalLimit: 0 })), { code: 'E_EXPLORATION_CONFIG' });

  let calls = 0;
  assert.throws(() => exploreBranchCandidates(config({
    evaluator: {
      id: 'unstable',
      version: '1',
      evaluate() {
        calls += 1;
        return { employment: calls, pressure: 0 };
      },
    },
  })), { code: 'E_APPROX_EVALUATOR' });

  assert.throws(() => exploreBranchCandidates(config({
    objectives: [{ metricId: 'employment', direction: 'maximize', weight: Number.MAX_SAFE_INTEGER }],
    evaluator: {
      id: 'overflow',
      version: '1',
      evaluate: () => ({ employment: 2 }),
    },
  })), { code: 'E_APPROX_OVERFLOW' });
});

test('verification rejects validly re-hashed candidate, generation, and proposal records with stale IDs', () => {
  const artifact = exploreBranchCandidates(config());

  const candidateTamper = JSON.parse(exportBranchExploration(artifact));
  candidateTamper.candidates[0].score += 1;
  rehash(candidateTamper);
  const candidateReport = verifyBranchExploration(candidateTamper);
  assert.equal(candidateReport.ok, false);
  assert.equal(candidateReport.errorCode, 'E_APPROX_HASH');

  const generationTamper = JSON.parse(exportBranchExploration(artifact));
  generationTamper.generations[0].survivorCandidateIds.reverse();
  rehash(generationTamper);
  const generationReport = verifyBranchExploration(generationTamper);
  assert.equal(generationReport.ok, false);
  assert.equal(generationReport.errorCode, 'E_APPROX_HASH');

  const proposalTamper = JSON.parse(exportBranchExploration(artifact));
  proposalTamper.proposals[0].score += 1;
  rehash(proposalTamper);
  const proposalReport = verifyBranchExploration(proposalTamper);
  assert.equal(proposalReport.ok, false);
  assert.equal(proposalReport.errorCode, 'E_APPROX_HASH');
});

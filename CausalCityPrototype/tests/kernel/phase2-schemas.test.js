import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { sampleSparseTopography } from '../../src/approximations/topography.js';
import { exploreBranchCandidates } from '../../src/approximations/explorer.js';
import { buildMemoryWindows } from '../../src/approximations/memory.js';
import {
  appendProposalReview,
  createProposalRegistry,
  decideBranchProposal,
  submitBranchProposal,
} from '../../src/approximations/proposals.js';
import { planTrustscapeChunks } from '../../src/approximations/performance.js';
import { projectRunGraph4D } from '../../src/projector/index.js';
import { createProjectionGraph } from './helpers/projection-fixture.js';

const schemaNames = [
  'sparse-topography-v1',
  'branch-exploration-v1',
  'memory-windows-v1',
  'branch-proposal-registry-v1',
  'trustscape-chunk-plan-v1',
];

async function load(name) {
  return JSON.parse(await readFile(new URL(`../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
}

function resolveRef(root, reference) {
  if (!reference.startsWith('#/')) throw new Error(`Unsupported reference: ${reference}`);
  return reference.slice(2).split('/').reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function typeMatches(type, value) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isSafeInteger(value);
  return typeof value === type;
}

function validate(schema, value, root = schema) {
  if (schema.$ref) return validate(resolveRef(root, schema.$ref), value, root);
  if (schema.oneOf && schema.oneOf.filter((candidate) => validate(candidate, value, root)).length !== 1) return false;
  if (schema.anyOf && !schema.anyOf.some((candidate) => validate(candidate, value, root))) return false;
  if (schema.allOf && !schema.allOf.every((candidate) => validate(candidate, value, root))) return false;
  if (schema.not && validate(schema.not, value, root)) return false;
  if (schema.const !== undefined && !isDeepStrictEqual(value, schema.const)) return false;
  if (schema.enum && !schema.enum.some((candidate) => isDeepStrictEqual(value, candidate))) return false;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(type, value))) return false;
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.items && !value.every((entry) => validate(schema.items, entry, root))) return false;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) return false;
    if (schema.required && schema.required.some((key) => !(key in value))) return false;
    if (schema.properties) {
      for (const [key, property] of Object.entries(schema.properties)) {
        if (key in value && !validate(property, value[key], root)) return false;
      }
    }
    const known = new Set(Object.keys(schema.properties ?? {}));
    const unknown = keys.filter((key) => !known.has(key));
    if (schema.additionalProperties === false && unknown.length) return false;
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      if (!unknown.every((key) => validate(schema.additionalProperties, value[key], root))) return false;
    }
  }
  return true;
}

const evaluator = {
  id: 'phase2-schema-evaluator',
  version: '1.0.0',
  evaluate(parameters) {
    return {
      employment: parameters.jobs * 2 + parameters.housing,
      pressure: parameters.jobs - parameters.housing,
    };
  },
};

function topography() {
  return sampleSparseTopography({
    baseline: { housing: 100, jobs: 50 },
    axes: [
      { axisId: 'housing', minimum: 0, maximum: 200, step: 20 },
      { axisId: 'jobs', minimum: 0, maximum: 100, step: 10 },
    ],
    metrics: ['employment', 'pressure'],
    evaluator,
    cliffThreshold: { outputNumerator: 2, inputDenominator: 1 },
    pairLimit: 1,
  });
}

function exploration() {
  return exploreBranchCandidates({
    parentRef: {
      graphId: `graph-${'a'.repeat(64)}`,
      parentBranchId: `branch-${'b'.repeat(64)}`,
      forkStepId: 's1',
      parentReceiptHash: 'c'.repeat(64),
    },
    seedState: [1, 2, 3, 4],
    axes: [
      { axisId: 'housing', minimum: 0, maximum: 200, step: 20 },
      { axisId: 'jobs', minimum: 0, maximum: 100, step: 10 },
    ],
    initialCandidates: [
      { parameters: { housing: 100, jobs: 40 } },
      { parameters: { housing: 80, jobs: 60 } },
    ],
    objectives: [
      { metricId: 'employment', direction: 'maximize', weight: 2 },
      { metricId: 'pressure', direction: 'minimize', weight: 1 },
    ],
    evaluator,
    populationLimit: 5,
    survivorCount: 2,
    generations: 1,
    proposalLimit: 2,
  });
}

function memory() {
  return buildMemoryWindows({
    records: [{
      perspectiveId: 'resident-1',
      branchId: `branch-${'d'.repeat(64)}`,
      sequence: 5,
      stepId: 'year-2040',
      metricPath: '/housing/rentPressure',
      objectiveValue: 100,
      perceivedValue: 120,
      scale: 1,
      sourceRef: 'memory-workshop-1',
      sourceVersion: 'v1',
      memoryKind: 'personal',
      generation: 0,
      inheritedFromPerspectiveId: null,
    }],
    windows: [{ windowId: 'short', length: 5 }],
    currentSequence: 5,
  });
}

function proposalRegistry() {
  let registry = createProposalRegistry({ minimumApprovals: 1 });
  registry = submitBranchProposal(registry, {
    anomalyId: `anomaly-${'e'.repeat(64)}`,
    requesterId: 'analyst',
    parentRef: {
      graphId: `graph-${'a'.repeat(64)}`,
      parentBranchId: `branch-${'b'.repeat(64)}`,
      forkStepId: 's1',
      parentReceiptHash: 'c'.repeat(64),
    },
    hypothesis: 'Test one bounded candidate manually.',
    parameters: { housing: 20, jobs: 10 },
    evidenceRefs: [],
    reviewRequired: true,
    executionAuthority: 'none',
  });
  const proposalId = registry.proposals[0].proposalId;
  registry = appendProposalReview(registry, {
    proposalId,
    reviewerId: 'reviewer',
    disposition: 'approve-for-manual-simulation',
    rationale: 'Bounded and clearly labeled.',
    evidenceRefs: [],
  });
  return decideBranchProposal(registry, {
    proposalId,
    deciderId: 'chair',
    disposition: 'approved-for-manual-simulation',
    rationale: 'Approved only for a separate manual simulation step.',
  });
}

function chunkPlan() {
  const fixture = createProjectionGraph();
  return planTrustscapeChunks(projectRunGraph4D(fixture.graph), { maxTemporalPointsPerChunk: 2 });
}

test('all Phase-2 schemas are strict JSON Schema 2020-12 documents', async () => {
  for (const name of schemaNames) {
    const schema = await load(name);
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
  }
});

test('authoritative Phase-2 artifacts satisfy their complete schemas', async () => {
  const artifacts = [topography(), exploration(), memory(), proposalRegistry(), chunkPlan()];
  for (let index = 0; index < schemaNames.length; index += 1) {
    assert.equal(validate(await load(schemaNames[index]), artifacts[index]), true, schemaNames[index]);
  }
});

test('schemas reject unknown fields, floats, malformed IDs, and missing human gates', async () => {
  const topographySchema = await load('sparse-topography-v1');
  assert.equal(validate(topographySchema, { ...topography(), extra: true }), false);
  const floating = structuredClone(topography());
  floating.samples[0].metrics.employment = 1.5;
  assert.equal(validate(topographySchema, floating), false);

  const explorationSchema = await load('branch-exploration-v1');
  const malformed = structuredClone(exploration());
  malformed.candidates[0].candidateId = 'bad';
  assert.equal(validate(explorationSchema, malformed), false);
  const ungated = structuredClone(exploration());
  ungated.executionAuthority = 'execute';
  assert.equal(validate(explorationSchema, ungated), false);

  const registrySchema = await load('branch-proposal-registry-v1');
  const proposalUngated = structuredClone(proposalRegistry());
  proposalUngated.proposals[0].reviewRequired = false;
  assert.equal(validate(registrySchema, proposalUngated), false);

  const chunkSchema = await load('trustscape-chunk-plan-v1');
  const timed = { ...chunkPlan(), elapsedMicroseconds: 25 };
  assert.equal(validate(chunkSchema, timed), false, 'timing cannot contaminate canonical chunk plans');
});

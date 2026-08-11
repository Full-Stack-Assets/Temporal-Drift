import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString, sha256Hex } from '../../src/kernel/canonicalize.js';
import {
  exportSparseTopography,
  sampleSparseTopography,
  verifySparseTopography,
} from '../../src/approximations/topography.js';

function evaluator() {
  return {
    id: 'housing-jobs-response',
    version: '1.0.0',
    evaluate(parameters) {
      return {
        employment: parameters.jobs * 3 + parameters.housing,
        pressure: parameters.jobs * 4 - parameters.housing * 2,
      };
    },
  };
}

function config(overrides = {}) {
  return {
    baseline: { housing: 100, jobs: 50 },
    axes: [
      { axisId: 'jobs', minimum: 0, maximum: 100, step: 10 },
      { axisId: 'housing', minimum: 0, maximum: 200, step: 20 },
    ],
    metrics: ['employment', 'pressure'],
    evaluator: evaluator(),
    cliffThreshold: { outputNumerator: 2, inputDenominator: 1 },
    pairLimit: 1,
    ...overrides,
  };
}

function rehash(value) {
  const { topographyHash: _old, ...core } = value;
  value.topographyHash = sha256Hex(core);
  return value;
}

test('sparse topography deterministically samples baseline, axis perturbations, and bounded pairs', () => {
  const input = config();
  const before = canonicalString({ ...input, evaluator: { id: input.evaluator.id, version: input.evaluator.version } });
  const first = sampleSparseTopography(input);
  const second = sampleSparseTopography(config());

  assert.equal(canonicalString({ ...input, evaluator: { id: input.evaluator.id, version: input.evaluator.version } }), before);
  assert.equal(exportSparseTopography(first), exportSparseTopography(second));
  assert.equal(first.format, 'ripple-sparse-topography');
  assert.equal(first.schemaVersion, '1.0.0');
  assert.equal(first.approximation, true);
  assert.deepEqual(first.evaluator, { id: 'housing-jobs-response', version: '1.0.0' });
  assert.equal(first.samples.length, 6);
  assert.equal(first.samples.filter((sample) => sample.kind === 'baseline').length, 1);
  assert.equal(first.samples.filter((sample) => sample.kind === 'axis-negative').length, 2);
  assert.equal(first.samples.filter((sample) => sample.kind === 'axis-positive').length, 2);
  assert.equal(first.samples.filter((sample) => sample.kind === 'pair-positive').length, 1);
  assert.equal(new Set(first.samples.map((sample) => sample.sampleId)).size, first.samples.length);
  assert.ok(Object.isFrozen(first));
  assert.equal(verifySparseTopography(first).ok, true);
});

test('sensitivities use signed integer fractions and identify cliff candidates without floating point', () => {
  const artifact = sampleSparseTopography(config());
  assert.equal(artifact.sensitivities.length, 8);
  for (const sensitivity of artifact.sensitivities) {
    assert.match(sensitivity.sensitivityId, /^sensitivity-[a-f0-9]{64}$/);
    assert.ok(['positive', 'negative', 'flat', 'cliff-candidate'].includes(sensitivity.classification));
    assert.ok(['positive', 'negative'].includes(sensitivity.sampleDirection));
    assert.equal(Number.isSafeInteger(sensitivity.deltaInput), true);
    assert.equal(Number.isSafeInteger(sensitivity.deltaOutput), true);
    assert.equal(Number.isSafeInteger(sensitivity.slopeNumerator), true);
    assert.equal(Number.isSafeInteger(sensitivity.slopeDenominator), true);
    assert.notEqual(sensitivity.slopeDenominator, 0);
  }
  const jobsPressure = artifact.sensitivities.find((entry) => entry.axisId === 'jobs' && entry.metricId === 'pressure' && entry.sampleDirection === 'positive');
  assert.equal(jobsPressure.deltaInput, 10);
  assert.equal(jobsPressure.deltaOutput, 40);
  assert.equal(jobsPressure.classification, 'cliff-candidate');
});

test('bounded pair samples expose deterministic interaction residuals', () => {
  const artifact = sampleSparseTopography(config());
  assert.equal(artifact.interactions.length, 2);
  for (const interaction of artifact.interactions) {
    assert.deepEqual(interaction.axisIds, ['housing', 'jobs']);
    assert.equal(interaction.interactionDelta, 0, 'linear evaluator has no pair residual');
    assert.match(interaction.interactionId, /^interaction-[a-f0-9]{64}$/);
  }
});

test('axis bounds remove unavailable directions and duplicate vectors collapse', () => {
  const artifact = sampleSparseTopography(config({
    baseline: { housing: 0, jobs: 100 },
    pairLimit: 1,
  }));
  assert.equal(artifact.samples.some((sample) => sample.kind === 'axis-negative' && sample.axisIds.includes('housing')), false);
  assert.equal(artifact.samples.some((sample) => sample.kind === 'axis-positive' && sample.axisIds.includes('jobs')), false);
  assert.equal(new Set(artifact.samples.map((sample) => canonicalString(sample.parameters))).size, artifact.samples.length);
});

test('topography rejects invalid axes, thresholds, metrics, overflow, and nondeterministic evaluators', () => {
  assert.throws(() => sampleSparseTopography(config({ axes: [{ axisId: 'jobs', minimum: 10, maximum: 0, step: 1 }] })), { code: 'E_TOPOGRAPHY_AXIS' });
  assert.throws(() => sampleSparseTopography(config({ axes: [{ axisId: 'jobs', minimum: 0, maximum: 100, step: 0 }, { axisId: 'housing', minimum: 0, maximum: 200, step: 20 }] })), { code: 'E_TOPOGRAPHY_AXIS' });
  assert.throws(() => sampleSparseTopography(config({ cliffThreshold: { outputNumerator: 0, inputDenominator: 1 } })), { code: 'E_APPROX_SCHEMA' });
  assert.throws(() => sampleSparseTopography(config({ metrics: ['missing'] })), { code: 'E_APPROX_EVALUATOR' });

  let calls = 0;
  assert.throws(() => sampleSparseTopography(config({
    evaluator: {
      id: 'unstable',
      version: '1',
      evaluate() {
        calls += 1;
        return { employment: calls, pressure: 0 };
      },
    },
  })), { code: 'E_APPROX_EVALUATOR' });

  assert.throws(() => sampleSparseTopography(config({
    baseline: { housing: Number.MAX_SAFE_INTEGER, jobs: 50 },
    axes: [
      { axisId: 'housing', minimum: Number.MAX_SAFE_INTEGER - 1, maximum: Number.MAX_SAFE_INTEGER, step: 1 },
      { axisId: 'jobs', minimum: 0, maximum: 100, step: 10 },
    ],
  })), { code: /E_APPROX_(OVERFLOW|EVALUATOR)/ });
});

test('verification rejects validly re-hashed samples and sensitivity arithmetic with stale content IDs', () => {
  const original = sampleSparseTopography(config());
  const sampleTamper = JSON.parse(exportSparseTopography(original));
  sampleTamper.samples[0].metrics.employment += 1;
  rehash(sampleTamper);
  const sampleReport = verifySparseTopography(sampleTamper);
  assert.equal(sampleReport.ok, false);
  assert.equal(sampleReport.errorCode, 'E_APPROX_HASH');

  const sensitivityTamper = JSON.parse(exportSparseTopography(original));
  sensitivityTamper.sensitivities[0].deltaOutput += 1;
  rehash(sensitivityTamper);
  const sensitivityReport = verifySparseTopography(sensitivityTamper);
  assert.equal(sensitivityReport.ok, false);
  assert.equal(sensitivityReport.errorCode, 'E_APPROX_HASH');
});

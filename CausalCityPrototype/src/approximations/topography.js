import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactKeys,
  assertNonEmptyString,
  assertPlainDataObject,
  assertSafeInteger,
  contentAddress,
  evaluateDeterministically,
  normalizeSafeIntegerMap,
  normalizeStringList,
  pinDeterministicEvaluator,
  safeIntegerDifference,
  safeIntegerSum,
} from './common.js';

export const SPARSE_TOPOGRAPHY_FORMAT = 'ripple-sparse-topography';
export const SPARSE_TOPOGRAPHY_SCHEMA_VERSION = '1.0.0';

function fail(code, message, path = 'topography', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function artifactCore(value) {
  const { topographyHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function parseArtifact(value) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    fail('E_APPROX_SCHEMA', 'Sparse topography is not valid JSON', 'topography');
  }
}

function bigintPerturb(value, delta, label) {
  const result = BigInt(value) + BigInt(delta);
  if (result < BigInt(Number.MIN_SAFE_INTEGER) || result > BigInt(Number.MAX_SAFE_INTEGER)) {
    fail('E_APPROX_OVERFLOW', `${label} exceeds the safe-integer range`, label);
  }
  return Number(result);
}

function normalizeAxes(axesInput, baseline) {
  if (!Array.isArray(axesInput) || axesInput.length === 0) {
    fail('E_TOPOGRAPHY_AXIS', 'axes must be a non-empty array', 'config.axes');
  }
  const seen = new Set();
  const axes = axesInput.map((axis, index) => {
    assertExactKeys(axis, ['axisId', 'minimum', 'maximum', 'step'], `config.axes.${index}`, 'E_TOPOGRAPHY_AXIS');
    const axisId = assertNonEmptyString(axis.axisId, `config.axes.${index}.axisId`, 'E_TOPOGRAPHY_AXIS');
    if (seen.has(axisId)) fail('E_TOPOGRAPHY_AXIS', `Duplicate axis ${axisId}`, `config.axes.${index}.axisId`);
    seen.add(axisId);
    const minimum = assertSafeInteger(axis.minimum, `config.axes.${index}.minimum`, 'E_TOPOGRAPHY_AXIS');
    const maximum = assertSafeInteger(axis.maximum, `config.axes.${index}.maximum`, 'E_TOPOGRAPHY_AXIS');
    const step = assertSafeInteger(axis.step, `config.axes.${index}.step`, 'E_TOPOGRAPHY_AXIS');
    if (minimum > maximum || step <= 0) fail('E_TOPOGRAPHY_AXIS', `Invalid bounds or step for ${axisId}`, `config.axes.${index}`);
    return cloneAndFreeze({ axisId, minimum, maximum, step });
  }).sort((left, right) => left.axisId.localeCompare(right.axisId));
  const axisIds = axes.map((axis) => axis.axisId);
  const normalizedBaseline = normalizeSafeIntegerMap(baseline, 'config.baseline', { expectedKeys: axisIds, code: 'E_TOPOGRAPHY_AXIS' });
  for (const axis of axes) {
    const value = normalizedBaseline[axis.axisId];
    if (value < axis.minimum || value > axis.maximum) {
      fail('E_TOPOGRAPHY_AXIS', `Baseline ${axis.axisId} is outside declared bounds`, `config.baseline.${axis.axisId}`);
    }
  }
  return cloneAndFreeze({ axes, baseline: normalizedBaseline });
}

function normalizeThreshold(value) {
  assertExactKeys(value, ['outputNumerator', 'inputDenominator'], 'config.cliffThreshold');
  const outputNumerator = assertSafeInteger(value.outputNumerator, 'config.cliffThreshold.outputNumerator');
  const inputDenominator = assertSafeInteger(value.inputDenominator, 'config.cliffThreshold.inputDenominator');
  if (outputNumerator <= 0 || inputDenominator <= 0) {
    fail('E_APPROX_SCHEMA', 'Cliff threshold terms must be positive', 'config.cliffThreshold');
  }
  return cloneAndFreeze({ outputNumerator, inputDenominator });
}

function sampleContent(kind, axisIds, parameters, metrics) {
  return cloneAndFreeze({ kind, axisIds: cloneAndFreeze([...axisIds].sort()), parameters, metrics });
}

function makeSample(kind, axisIds, parameters, pinned) {
  const metrics = evaluateDeterministically(pinned, parameters);
  const content = sampleContent(kind, axisIds, parameters, metrics);
  return cloneAndFreeze({ ...content, sampleId: contentAddress('sample', content) });
}

function addSample(samplesByParameters, kind, axisIds, parameters, pinned) {
  const key = canonicalString(parameters);
  if (samplesByParameters.has(key)) return samplesByParameters.get(key);
  const sample = makeSample(kind, axisIds, parameters, pinned);
  samplesByParameters.set(key, sample);
  return sample;
}

function classify(deltaInput, deltaOutput, threshold) {
  if (deltaOutput === 0) return 'flat';
  const left = (deltaOutput < 0 ? -BigInt(deltaOutput) : BigInt(deltaOutput)) * BigInt(threshold.inputDenominator);
  const right = (deltaInput < 0 ? -BigInt(deltaInput) : BigInt(deltaInput)) * BigInt(threshold.outputNumerator);
  if (left >= right) return 'cliff-candidate';
  return deltaOutput > 0 ? 'positive' : 'negative';
}

function sensitivityRecord(baselineSample, sample, axisId, metricId, threshold) {
  const deltaInput = safeIntegerDifference(sample.parameters[axisId], baselineSample.parameters[axisId], `sensitivity.${axisId}.deltaInput`);
  const deltaOutput = safeIntegerDifference(sample.metrics[metricId], baselineSample.metrics[metricId], `sensitivity.${axisId}.${metricId}.deltaOutput`);
  const content = cloneAndFreeze({
    baselineSampleId: baselineSample.sampleId,
    sampleId: sample.sampleId,
    axisId,
    sampleDirection: deltaInput > 0 ? 'positive' : 'negative',
    metricId,
    deltaInput,
    deltaOutput,
    slopeNumerator: deltaOutput,
    slopeDenominator: deltaInput,
    classification: classify(deltaInput, deltaOutput, threshold),
  });
  return cloneAndFreeze({ ...content, sensitivityId: contentAddress('sensitivity', content) });
}

function interactionRecord(baselineSample, pairSample, firstSample, secondSample, axisIds, metricId) {
  const combinedDelta = safeIntegerDifference(pairSample.metrics[metricId], baselineSample.metrics[metricId], `interaction.${metricId}.combined`);
  const firstDelta = safeIntegerDifference(firstSample.metrics[metricId], baselineSample.metrics[metricId], `interaction.${metricId}.first`);
  const secondDelta = safeIntegerDifference(secondSample.metrics[metricId], baselineSample.metrics[metricId], `interaction.${metricId}.second`);
  const interactionDelta = safeIntegerDifference(
    safeIntegerDifference(combinedDelta, firstDelta, `interaction.${metricId}.residualA`),
    secondDelta,
    `interaction.${metricId}.residualB`,
  );
  const content = cloneAndFreeze({
    baselineSampleId: baselineSample.sampleId,
    pairSampleId: pairSample.sampleId,
    singleSampleIds: cloneAndFreeze([firstSample.sampleId, secondSample.sampleId]),
    axisIds: cloneAndFreeze([...axisIds]),
    metricId,
    combinedDelta,
    singleDeltas: cloneAndFreeze([firstDelta, secondDelta]),
    interactionDelta,
  });
  return cloneAndFreeze({ ...content, interactionId: contentAddress('interaction', content) });
}

function build(configInput) {
  assertExactKeys(configInput, ['baseline', 'axes', 'metrics', 'evaluator', 'cliffThreshold', 'pairLimit'], 'config');
  const normalized = normalizeAxes(configInput.axes, configInput.baseline);
  const metrics = normalizeStringList(configInput.metrics, 'config.metrics');
  const threshold = normalizeThreshold(configInput.cliffThreshold);
  const pairLimit = assertSafeInteger(configInput.pairLimit, 'config.pairLimit');
  const maximumPairs = (normalized.axes.length * (normalized.axes.length - 1)) / 2;
  if (pairLimit < 0 || pairLimit > maximumPairs) fail('E_APPROX_SCHEMA', 'pairLimit exceeds the declared axis-pair count', 'config.pairLimit');
  const pinned = pinDeterministicEvaluator(configInput.evaluator, metrics);
  const samplesByParameters = new Map();
  const baselineSample = addSample(samplesByParameters, 'baseline', [], normalized.baseline, pinned);
  const positiveByAxis = new Map();

  for (const axis of normalized.axes) {
    const baselineValue = normalized.baseline[axis.axisId];
    const negativeValue = bigintPerturb(baselineValue, -axis.step, `config.axes.${axis.axisId}.negative`);
    if (negativeValue >= axis.minimum) {
      addSample(samplesByParameters, 'axis-negative', [axis.axisId], cloneAndFreeze({ ...normalized.baseline, [axis.axisId]: negativeValue }), pinned);
    }
    const positiveValue = bigintPerturb(baselineValue, axis.step, `config.axes.${axis.axisId}.positive`);
    if (positiveValue <= axis.maximum) {
      const sample = addSample(samplesByParameters, 'axis-positive', [axis.axisId], cloneAndFreeze({ ...normalized.baseline, [axis.axisId]: positiveValue }), pinned);
      positiveByAxis.set(axis.axisId, sample);
    }
  }

  const pairs = [];
  for (let left = 0; left < normalized.axes.length; left += 1) {
    for (let right = left + 1; right < normalized.axes.length; right += 1) {
      pairs.push([normalized.axes[left], normalized.axes[right]]);
    }
  }
  const pairSamples = [];
  for (const [first, second] of pairs.slice(0, pairLimit)) {
    const firstSample = positiveByAxis.get(first.axisId);
    const secondSample = positiveByAxis.get(second.axisId);
    if (!firstSample || !secondSample) continue;
    const parameters = cloneAndFreeze({
      ...normalized.baseline,
      [first.axisId]: firstSample.parameters[first.axisId],
      [second.axisId]: secondSample.parameters[second.axisId],
    });
    const pairSample = addSample(samplesByParameters, 'pair-positive', [first.axisId, second.axisId], parameters, pinned);
    pairSamples.push({ pairSample, firstSample, secondSample, axisIds: [first.axisId, second.axisId] });
  }

  const samples = [...samplesByParameters.values()].sort((left, right) => left.sampleId.localeCompare(right.sampleId));
  const sensitivities = [];
  for (const sample of samples.filter((entry) => entry.kind === 'axis-negative' || entry.kind === 'axis-positive')) {
    const [axisId] = sample.axisIds;
    for (const metricId of metrics) sensitivities.push(sensitivityRecord(baselineSample, sample, axisId, metricId, threshold));
  }
  sensitivities.sort((left, right) => left.sensitivityId.localeCompare(right.sensitivityId));
  const interactions = [];
  for (const pair of pairSamples) {
    for (const metricId of metrics) interactions.push(interactionRecord(baselineSample, pair.pairSample, pair.firstSample, pair.secondSample, pair.axisIds, metricId));
  }
  interactions.sort((left, right) => left.interactionId.localeCompare(right.interactionId));

  const core = cloneAndFreeze({
    format: SPARSE_TOPOGRAPHY_FORMAT,
    schemaVersion: SPARSE_TOPOGRAPHY_SCHEMA_VERSION,
    approximation: true,
    evaluator: pinned.identity,
    baseline: normalized.baseline,
    axes: normalized.axes,
    metrics,
    cliffThreshold: threshold,
    pairLimit,
    samples,
    sensitivities,
    interactions,
  });
  return cloneAndFreeze({ ...core, topographyHash: sha256Hex(core) });
}

function sameKeys(value, expected, path) {
  const keys = Object.keys(value).sort();
  if (canonicalString(keys) !== canonicalString([...expected].sort())) fail('E_APPROX_SCHEMA', `${path} contains missing or unknown fields`, path);
}

function verifyInternal(value) {
  assertPlainDataObject(value, 'topography');
  sameKeys(value, ['format', 'schemaVersion', 'approximation', 'evaluator', 'baseline', 'axes', 'metrics', 'cliffThreshold', 'pairLimit', 'samples', 'sensitivities', 'interactions', 'topographyHash'], 'topography');
  if (value.format !== SPARSE_TOPOGRAPHY_FORMAT || value.schemaVersion !== SPARSE_TOPOGRAPHY_SCHEMA_VERSION || value.approximation !== true) fail('E_APPROX_SCHEMA', 'Unsupported sparse-topography format', 'topography.schemaVersion');
  if (typeof value.topographyHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.topographyHash)) fail('E_APPROX_SCHEMA', 'Invalid topography hash', 'topography.topographyHash');
  const expectedHash = sha256Hex(artifactCore(value));
  if (expectedHash !== value.topographyHash) fail('E_APPROX_HASH', 'Topography hash mismatch', 'topography.topographyHash', expectedHash, value.topographyHash);
  const normalized = normalizeAxes(value.axes, value.baseline);
  const metrics = normalizeStringList(value.metrics, 'topography.metrics');
  const threshold = normalizeThreshold(value.cliffThreshold);
  if (!Array.isArray(value.samples) || !Array.isArray(value.sensitivities) || !Array.isArray(value.interactions)) fail('E_APPROX_SCHEMA', 'Topography collections must be arrays', 'topography');
  const sampleById = new Map();
  let baselineSample = null;
  for (const sample of value.samples) {
    sameKeys(sample, ['kind', 'axisIds', 'parameters', 'metrics', 'sampleId'], `topography.samples.${sample.sampleId}`);
    if (!['baseline', 'axis-negative', 'axis-positive', 'pair-positive'].includes(sample.kind)) fail('E_APPROX_SCHEMA', 'Unknown sample kind', `topography.samples.${sample.sampleId}.kind`);
    const parameters = normalizeSafeIntegerMap(sample.parameters, `topography.samples.${sample.sampleId}.parameters`, { expectedKeys: normalized.axes.map((axis) => axis.axisId) });
    const sampleMetrics = normalizeSafeIntegerMap(sample.metrics, `topography.samples.${sample.sampleId}.metrics`, { expectedKeys: metrics });
    const content = sampleContent(sample.kind, sample.axisIds, parameters, sampleMetrics);
    const expectedId = contentAddress('sample', content);
    if (sample.sampleId !== expectedId) fail('E_APPROX_HASH', 'Sample content ID mismatch', `topography.samples.${sample.sampleId}.sampleId`, expectedId, sample.sampleId);
    if (sampleById.has(sample.sampleId)) fail('E_APPROX_SCHEMA', 'Duplicate sample ID', `topography.samples.${sample.sampleId}`);
    sampleById.set(sample.sampleId, sample);
    if (sample.kind === 'baseline') {
      if (baselineSample) fail('E_APPROX_SCHEMA', 'Multiple baseline samples', 'topography.samples');
      baselineSample = sample;
      if (canonicalString(sample.parameters) !== canonicalString(value.baseline)) fail('E_APPROX_REFERENCE', 'Baseline sample differs from baseline parameters', `topography.samples.${sample.sampleId}`);
    }
  }
  if (!baselineSample) fail('E_APPROX_REFERENCE', 'Baseline sample is missing', 'topography.samples');
  const sensitivityIds = new Set();
  for (const sensitivity of value.sensitivities) {
    sameKeys(sensitivity, ['baselineSampleId', 'sampleId', 'axisId', 'sampleDirection', 'metricId', 'deltaInput', 'deltaOutput', 'slopeNumerator', 'slopeDenominator', 'classification', 'sensitivityId'], `topography.sensitivities.${sensitivity.sensitivityId}`);
    const sample = sampleById.get(sensitivity.sampleId);
    if (!sample || sensitivity.baselineSampleId !== baselineSample.sampleId || !metrics.includes(sensitivity.metricId)) fail('E_APPROX_REFERENCE', 'Sensitivity references missing evidence', `topography.sensitivities.${sensitivity.sensitivityId}`);
    const expected = sensitivityRecord(baselineSample, sample, sensitivity.axisId, sensitivity.metricId, threshold);
    if (canonicalString(expected) !== canonicalString(sensitivity)) fail('E_APPROX_HASH', 'Sensitivity content or arithmetic mismatch', `topography.sensitivities.${sensitivity.sensitivityId}`);
    if (sensitivityIds.has(sensitivity.sensitivityId)) fail('E_APPROX_SCHEMA', 'Duplicate sensitivity ID', `topography.sensitivities.${sensitivity.sensitivityId}`);
    sensitivityIds.add(sensitivity.sensitivityId);
  }
  const interactionIds = new Set();
  for (const interaction of value.interactions) {
    sameKeys(interaction, ['baselineSampleId', 'pairSampleId', 'singleSampleIds', 'axisIds', 'metricId', 'combinedDelta', 'singleDeltas', 'interactionDelta', 'interactionId'], `topography.interactions.${interaction.interactionId}`);
    const pairSample = sampleById.get(interaction.pairSampleId);
    const firstSample = sampleById.get(interaction.singleSampleIds?.[0]);
    const secondSample = sampleById.get(interaction.singleSampleIds?.[1]);
    if (!pairSample || !firstSample || !secondSample || interaction.baselineSampleId !== baselineSample.sampleId || !metrics.includes(interaction.metricId)) fail('E_APPROX_REFERENCE', 'Interaction references missing evidence', `topography.interactions.${interaction.interactionId}`);
    const expected = interactionRecord(baselineSample, pairSample, firstSample, secondSample, interaction.axisIds, interaction.metricId);
    if (canonicalString(expected) !== canonicalString(interaction)) fail('E_APPROX_HASH', 'Interaction content or arithmetic mismatch', `topography.interactions.${interaction.interactionId}`);
    if (interactionIds.has(interaction.interactionId)) fail('E_APPROX_SCHEMA', 'Duplicate interaction ID', `topography.interactions.${interaction.interactionId}`);
    interactionIds.add(interaction.interactionId);
  }
  return cloneAndFreeze(value);
}

function report(fields = {}) {
  return cloneAndFreeze({ ok: false, topographyHash: null, firstMismatch: null, errorCode: 'E_APPROX_SCHEMA', ...fields });
}

export function sampleSparseTopography(config) {
  return build(config);
}

export function verifySparseTopography(input) {
  try {
    const value = parseArtifact(input);
    const verified = verifyInternal(value);
    return report({ ok: true, topographyHash: verified.topographyHash, firstMismatch: null, errorCode: null });
  } catch (error) {
    return report({
      firstMismatch: error instanceof TrustKernelError ? error.details?.path ?? 'topography' : 'topography',
      errorCode: error instanceof TrustKernelError ? error.code : 'E_APPROX_SCHEMA',
    });
  }
}

export function exportSparseTopography(input) {
  const value = parseArtifact(input);
  const verified = verifySparseTopography(value);
  if (!verified.ok) fail(verified.errorCode, 'Sparse topography failed verification', verified.firstMismatch ?? 'topography');
  return canonicalString(value);
}

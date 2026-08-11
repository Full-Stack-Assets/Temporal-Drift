import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { createAnomalyRegistry, recordAnomaly } from '../../src/kernel/anomalies.js';
import { createGenesisReceipt, createTransitionReceipt } from '../../src/kernel/ledger.js';
import { createRunGraph, exportRunGraph, forkBranch } from '../../src/kernel/run-graph.js';
import { counterManifest } from './helpers/counter-fixture.js';
import { completeCounterRun } from './helpers/run-graph-fixture.js';

const schemaNames = ['anomaly-record-v1', 'run-manifest-v1', 'verification-receipt-v1', 'run-graph-v1'];

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

function validateSchema(schema, value, root = schema) {
  if (schema.$ref) return validateSchema(resolveRef(root, schema.$ref), value, root);
  if (schema.oneOf && schema.oneOf.filter((candidate) => validateSchema(candidate, value, root)).length !== 1) return false;
  if (schema.anyOf && !schema.anyOf.some((candidate) => validateSchema(candidate, value, root))) return false;
  if (schema.allOf && !schema.allOf.every((candidate) => validateSchema(candidate, value, root))) return false;
  if (schema.not && validateSchema(schema.not, value, root)) return false;
  if (schema.if) {
    const branch = validateSchema(schema.if, value, root) ? schema.then : schema.else;
    if (branch && !validateSchema(branch, value, root)) return false;
  }
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
    if (schema.items && !value.every((entry) => validateSchema(schema.items, entry, root))) return false;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) return false;
    if (schema.maxProperties !== undefined && keys.length > schema.maxProperties) return false;
    if (schema.propertyNames && !keys.every((key) => validateSchema(schema.propertyNames, key, root))) return false;
    if (schema.required && schema.required.some((key) => !(key in value))) return false;
    if (schema.properties) {
      for (const [key, property] of Object.entries(schema.properties)) {
        if (key in value && !validateSchema(property, value[key], root)) return false;
      }
    }
    const known = new Set(Object.keys(schema.properties ?? {}));
    const unknown = keys.filter((key) => !known.has(key));
    if (schema.additionalProperties === false && unknown.length) return false;
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      if (!unknown.every((key) => validateSchema(schema.additionalProperties, value[key], root))) return false;
    }
  }
  return true;
}

function anomalyRecord() {
  const registry = recordAnomaly(createAnomalyRegistry(), {
    runId: 'run-1',
    branchId: 'baseline',
    stepId: 'year-2030',
    metricPath: '/metrics/employmentRate',
    expected: 91000,
    observed: 88750,
    unit: 'percent',
    scale: 1000,
    sourceRef: 'obs-1',
    sourceVersion: 'v1',
    severity: 'warning',
  });
  return registry.records[0];
}

function transitionReceipt() {
  const manifest = counterManifest({ inputs: [] });
  const genesis = createGenesisReceipt(manifest);
  return {
    genesis,
    transition: createTransitionReceipt({
      kernelVersion: manifest.kernelVersion,
      runId: manifest.runId,
      branchId: manifest.branchId,
      stepId: 's1',
      sequence: 1,
      previousReceiptHash: genesis.receiptHash,
      input: { stepId: 's1', type: 'increment', payload: { amount: 1 } },
      previousState: { count: 0 },
      resultingState: { count: 1 },
      resultingPrngState: [1, 2, 3, 4],
      eventBatch: [],
    }),
  };
}

function runGraphRecord() {
  const root = createRunGraph(completeCounterRun(), 'Root');
  const { graph } = forkBranch(root, {
    parentBranchId: root.rootBranchId,
    forkStepId: 's1',
    label: 'Child',
  });
  return JSON.parse(exportRunGraph(graph));
}

test('all v1 schemas are strict JSON Schema 2020-12 documents', async () => {
  for (const name of schemaNames) {
    const schema = await load(name);
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0);
    assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
  }
});

test('authoritative anomaly, manifest, receipts, and RunGraph satisfy their complete schemas', async () => {
  const anomalySchema = await load('anomaly-record-v1');
  const manifestSchema = await load('run-manifest-v1');
  const receiptSchema = await load('verification-receipt-v1');
  const graphSchema = await load('run-graph-v1');
  const manifest = counterManifest();
  const { genesis, transition } = transitionReceipt();

  assert.equal(validateSchema(anomalySchema, anomalyRecord()), true);
  assert.equal(validateSchema(manifestSchema, manifest), true);
  assert.equal(validateSchema(receiptSchema, genesis), true);
  assert.equal(validateSchema(receiptSchema, transition), true);
  assert.equal(validateSchema(graphSchema, runGraphRecord()), true);
});

test('schemas reject nested invalid values and kind-specific receipt contradictions', async () => {
  const manifestSchema = await load('run-manifest-v1');
  const receiptSchema = await load('verification-receipt-v1');
  const manifest = structuredClone(counterManifest());
  manifest.initialPrngState = [0, 0, 0, 0];
  assert.equal(validateSchema(manifestSchema, manifest), false, 'all-zero PRNG state');

  const { genesis, transition } = transitionReceipt();
  assert.equal(validateSchema(receiptSchema, { ...genesis, previousReceiptHash: 'a'.repeat(64) }), false, 'genesis previous hash');
  assert.equal(validateSchema(receiptSchema, { ...genesis, manifestCoreHash: null }), false, 'genesis manifest hash');
  assert.equal(validateSchema(receiptSchema, { ...transition, previousReceiptHash: null }), false, 'transition previous hash');
  assert.equal(validateSchema(receiptSchema, { ...transition, manifestCoreHash: 'a'.repeat(64) }), false, 'transition manifest hash');
  assert.equal(validateSchema(receiptSchema, { ...transition, sequence: 0 }), false, 'transition sequence');
});

test('RunGraph schema rejects malformed IDs, descriptors, membership values, and unknown fields', async () => {
  const schema = await load('run-graph-v1');
  const valid = runGraphRecord();
  const childId = Object.keys(valid.branches).find((branchId) => branchId !== valid.rootBranchId);

  assert.equal(validateSchema(schema, { ...valid, extra: true }), false, 'unknown top-level field');
  assert.equal(validateSchema(schema, { ...valid, graphId: 'graph-bad' }), false, 'malformed graph id');

  const invalidBranchKey = structuredClone(valid);
  invalidBranchKey.branches.bad = invalidBranchKey.branches[childId];
  delete invalidBranchKey.branches[childId];
  assert.equal(validateSchema(schema, invalidBranchKey), false, 'branch key pattern');

  const invalidDescriptor = structuredClone(valid);
  invalidDescriptor.branches[childId].extra = true;
  assert.equal(validateSchema(schema, invalidDescriptor), false, 'descriptor additional property');

  const invalidExport = structuredClone(valid);
  invalidExport.runExports[childId] = { not: 'a string' };
  assert.equal(validateSchema(schema, invalidExport), false, 'run export type');

  const missingMembership = structuredClone(valid);
  delete missingMembership.runExports[childId];
  assert.equal(validateSchema(schema, missingMembership), true, 'schema handles shapes; semantic membership equality is enforced by verifyRunGraph');
});

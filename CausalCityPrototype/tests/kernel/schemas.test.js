import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schemaNames = ['anomaly-record-v1', 'run-manifest-v1', 'verification-receipt-v1'];

async function load(name) {
  return JSON.parse(await readFile(new URL(`../../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
}

function validateRoot(schema, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (schema.additionalProperties === false && Object.keys(value).some((key) => !(key in schema.properties))) return false;
  if (schema.required.some((key) => !(key in value))) return false;
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!(key in value)) continue;
    const actual = value[key];
    if (property.const !== undefined && actual !== property.const) return false;
    if (property.enum && !property.enum.includes(actual)) return false;
    if (property.type === 'string' && typeof actual !== 'string') return false;
    if (property.type === 'integer' && !Number.isSafeInteger(actual)) return false;
    if (property.type === 'boolean' && typeof actual !== 'boolean') return false;
    if (property.pattern && !new RegExp(property.pattern).test(actual)) return false;
    if (property.minimum !== undefined && actual < property.minimum) return false;
  }
  return true;
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

test('anomaly schema accepts the authoritative shape and rejects missing or unknown fields', async () => {
  const schema = await load('anomaly-record-v1');
  const valid = {
    schemaVersion: '1.0.0', anomalyId: `anomaly-${'a'.repeat(64)}`, runId: 'run-1', branchId: 'baseline',
    stepId: 'year-2030', metricPath: '/metrics/employmentRate', expected: 91000, observed: 88750,
    unit: 'percent', scale: 1000, delta: -2250, sourceRef: 'obs-1', sourceVersion: 'v1',
    severity: 'warning', requiresHumanReview: true,
  };
  assert.equal(validateRoot(schema, valid), true);
  assert.equal(validateRoot(schema, { ...valid, extra: true }), false);
  const missing = { ...valid };
  delete missing.metricPath;
  assert.equal(validateRoot(schema, missing), false);
});

test('manifest and receipt schemas enforce their format/version discriminators', async () => {
  const manifest = await load('run-manifest-v1');
  const receipt = await load('verification-receipt-v1');
  assert.equal(manifest.properties.format.const, 'ripple-trust-run');
  assert.equal(manifest.properties.schemaVersion.const, '1.0.0');
  assert.equal(receipt.properties.schemaVersion.const, '1.0.0');
  assert.deepEqual(receipt.properties.kind.enum, ['genesis', 'transition']);
  assert.equal(receipt.properties.receiptHash.pattern, '^[a-f0-9]{64}$');
});

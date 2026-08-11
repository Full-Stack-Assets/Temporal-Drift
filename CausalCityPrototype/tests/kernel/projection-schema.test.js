import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { projectRunGraph4D } from '../../src/projector/index.js';
import { createProjectionGraph, subjectiveRecord } from './helpers/projection-fixture.js';

async function loadSchema() {
  return JSON.parse(await readFile(new URL('../../schemas/4d-projection-v1.schema.json', import.meta.url), 'utf8'));
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
    if (schema.propertyNames && !keys.every((key) => validate(schema.propertyNames, key, root))) return false;
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

function projectionValue() {
  const fixture = createProjectionGraph();
  return projectRunGraph4D(fixture.graph, { subjectiveRecords: [subjectiveRecord(fixture.planABranchId)] });
}

test('4D projection schema is a strict JSON Schema 2020-12 document', async () => {
  const schema = await loadSchema();
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...schema.required].sort(), Object.keys(schema.properties).sort());
});

test('authoritative 4D projection satisfies the complete schema', async () => {
  const schema = await loadSchema();
  assert.equal(validate(schema, projectionValue()), true);
});

test('4D projection schema rejects malformed identities, coordinates, records, and unknown fields', async () => {
  const schema = await loadSchema();
  const valid = projectionValue();

  assert.equal(validate(schema, { ...valid, extra: true }), false, 'unknown top-level field');
  assert.equal(validate(schema, { ...valid, projectionId: 'projection-bad' }), false, 'malformed projection id');

  const coordinate = structuredClone(valid);
  coordinate.dimensions.temporal.points[0].coordinates.t = 1.5;
  assert.equal(validate(schema, coordinate), false, 'non-integer coordinate');

  const subjective = structuredClone(valid);
  subjective.dimensions.subjective.records[0].extra = true;
  assert.equal(validate(schema, subjective), false, 'subjective unknown field');

  const edge = structuredClone(valid);
  edge.dimensions.causal.edges[0].kind = 'invented-causality';
  assert.equal(validate(schema, edge), false, 'unsupported edge kind');
});

import { isDeepStrictEqual } from 'node:util';

function resolveRef(root, reference) {
  if (!reference.startsWith('#/')) throw new Error(`Unsupported reference: ${reference}`);
  return reference.slice(2).split('/').reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function typeMatches(type, value) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isSafeInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

export function validateSchema(schema, value, root = schema) {
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
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) return false;
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) return false;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.uniqueItems && new Set(value.map((entry) => JSON.stringify(entry))).size !== value.length) return false;
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

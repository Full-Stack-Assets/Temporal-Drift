import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const syntaxScript = new URL('../../scripts/check-syntax.js', import.meta.url);
const randomnessScript = new URL('../../scripts/check-randomness.js', import.meta.url);
const meshRoot = new URL('../../src/mesh/', import.meta.url);

test('key-lifecycle deterministic sources remain inside syntax and ambient-randomness gates', async () => {
  const [syntax, randomness, entries] = await Promise.all([
    readFile(syntaxScript, 'utf8'),
    readFile(randomnessScript, 'utf8'),
    readdir(meshRoot, { withFileTypes: true }),
  ]);
  const modules = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js')).map((entry) => entry.name).sort();
  assert.ok(modules.includes('key-registry.js'), 'key-registry module must exist');
  assert.ok(modules.includes('key-admission.js'), 'key-admission module must exist');
  assert.ok(modules.length >= 8, 'expected mesh v1 plus key-lifecycle modules');
  assert.match(syntax, /new URL\('\.\.\/src\/mesh\/'/u);
  assert.match(randomness, /new URL\('\.\.\/src\/mesh\/'/u);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const syntaxScript = new URL('../../scripts/check-syntax.js', import.meta.url);
const randomnessScript = new URL('../../scripts/check-randomness.js', import.meta.url);
const meshRoot = new URL('../../src/mesh/', import.meta.url);

test('mesh deterministic sources are covered by syntax and ambient-randomness gates', async () => {
  const [syntax, randomness, entries] = await Promise.all([
    readFile(syntaxScript, 'utf8'),
    readFile(randomnessScript, 'utf8'),
    readdir(meshRoot, { withFileTypes: true }),
  ]);
  const modules = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js')).map((entry) => entry.name).sort();
  assert.ok(modules.length >= 5, 'expected the complete mesh module tranche');
  assert.match(syntax, /new URL\('\.\.\/src\/mesh\/'/u, 'syntax gate must enumerate src/mesh');
  assert.match(randomness, /new URL\('\.\.\/src\/mesh\/'/u, 'randomness gate must enumerate src/mesh');
});

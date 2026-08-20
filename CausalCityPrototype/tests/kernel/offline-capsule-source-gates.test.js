import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const syntaxScript = new URL('../../scripts/check-syntax.js', import.meta.url);
const randomnessScript = new URL('../../scripts/check-randomness.js', import.meta.url);
const meshRoot = new URL('../../src/mesh/', import.meta.url);
const cliUrl = new URL('../../scripts/verify-offline-capsule.js', import.meta.url);

test('offline capsule source and CLI remain inside syntax and ambient-randomness gates', async () => {
  const [syntax, randomness, entries, cli] = await Promise.all([
    readFile(syntaxScript, 'utf8'),
    readFile(randomnessScript, 'utf8'),
    readdir(meshRoot, { withFileTypes: true }),
    readFile(cliUrl, 'utf8'),
  ]);
  const modules = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.js')).map((entry) => entry.name).sort();
  assert.ok(modules.includes('offline-capsule.js'));
  assert.match(syntax, /new URL\('\.\.\/src\/mesh\/'/u);
  assert.match(syntax, /new URL\('\.\/'/u, 'scripts directory must be syntax-scanned');
  assert.match(randomness, /new URL\('\.\.\/src\/mesh\/'/u);
  assert.doesNotMatch(cli, /Math\s*\.\s*random\s*\(/u);
});

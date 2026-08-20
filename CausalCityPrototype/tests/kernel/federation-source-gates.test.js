import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const syntaxSource = await readFile(new URL('../../scripts/check-syntax.js', import.meta.url), 'utf8');
const randomnessSource = await readFile(new URL('../../scripts/check-randomness.js', import.meta.url), 'utf8');
const federationRoot = new URL('../../src/federation/', import.meta.url);
const federationFiles = (await readdir(federationRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort();

test('federation deterministic sources are covered by syntax and ambient-randomness gates', () => {
  assert.match(syntaxSource, /\.\.\/src\/federation\//u, 'syntax gate must enumerate src/federation');
  assert.match(randomnessSource, /\.\.\/src\/federation\//u, 'randomness gate must enumerate src/federation');
});

test('federation layer cannot mutate simulation truth or perform external network I/O', async () => {
  assert.ok(federationFiles.length >= 6, 'expected implemented federation source files');
  const forbidden = [
    /\badvanceRun\b/u,
    /\bforkRun\b/u,
    /\bforkBranch\b/u,
    /\bfetch\s*\(/u,
    /from\s+['"]node:http['"]/u,
    /from\s+['"]node:https['"]/u,
    /from\s+['"]node:net['"]/u,
    /from\s+['"]node:tls['"]/u,
    /Date\s*\.\s*now\s*\(/u,
    /new\s+Date\s*\(/u,
    /Math\s*\.\s*random\s*\(/u,
  ];

  for (const file of federationFiles) {
    const source = await readFile(new URL(file, federationRoot), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} must not contain ${pattern}`);
    }
  }
});

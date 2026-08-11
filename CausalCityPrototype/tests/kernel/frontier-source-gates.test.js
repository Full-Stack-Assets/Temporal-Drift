import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const FRONTIER_DIRECTORY = new URL('../../src/frontier/', import.meta.url);
const SYNTAX_SCRIPT = new URL('../../scripts/check-syntax.js', import.meta.url);
const RANDOMNESS_SCRIPT = new URL('../../scripts/check-randomness.js', import.meta.url);

function escapedRootPattern(relativePath) {
  return new RegExp(`new URL\\(['\"]${relativePath.replaceAll('/', '\\/')}['\"]`, 'u');
}

test('frontier deterministic sources are covered by syntax and ambient-randomness gates', async () => {
  const entries = await readdir(FRONTIER_DIRECTORY, { withFileTypes: true });
  const frontierFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name)
    .sort();

  assert.ok(frontierFiles.length >= 6, 'expected the complete frontier source tranche');

  const [syntaxSource, randomnessSource] = await Promise.all([
    readFile(SYNTAX_SCRIPT, 'utf8'),
    readFile(RANDOMNESS_SCRIPT, 'utf8'),
  ]);

  const frontierRoot = escapedRootPattern('../src/frontier/');
  assert.match(syntaxSource, frontierRoot, 'syntax gate must enumerate src/frontier');
  assert.match(randomnessSource, frontierRoot, 'randomness gate must enumerate src/frontier');

  for (const fileName of frontierFiles) {
    const source = await readFile(new URL(fileName, FRONTIER_DIRECTORY), 'utf8');
    assert.doesNotMatch(source, /Math\s*\.\s*random\s*\(/u, `${fileName} uses ambient randomness`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
  findAmbientRandomnessViolations,
  listJavaScriptFiles,
} from '../../scripts/source-scan.js';

function relative(url) {
  return fileURLToPath(url).replaceAll('\\', '/').split('/CausalCityPrototype/').at(-1);
}

test('recursive source discovery includes every deterministic Phase-0 and Phase-1 module', async () => {
  const files = await listJavaScriptFiles([new URL('../../src/', import.meta.url)]);
  const paths = files.map(relative);

  for (const expected of [
    'src/kernel/replay.js',
    'src/kernel/run-graph.js',
    'src/adapters/bellwether-model.js',
    'src/projector/projection.js',
    'src/trustscape/scene.js',
    'src/trustscape/annotations.js',
  ]) assert.equal(paths.includes(expected), true, expected);

  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual(paths, [...paths].sort());
});

test('ambient-randomness scan covers projector and Trustscape without false exclusions', async () => {
  const files = await listJavaScriptFiles([
    new URL('../../src/kernel/', import.meta.url),
    new URL('../../src/adapters/', import.meta.url),
    new URL('../../src/projector/', import.meta.url),
    new URL('../../src/trustscape/', import.meta.url),
  ]);
  const paths = files.map(relative);
  assert.equal(paths.includes('src/projector/projection.js'), true);
  assert.equal(paths.includes('src/trustscape/annotations.js'), true);
  assert.deepEqual(await findAmbientRandomnessViolations(files), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', 'src');
function files(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
    : [];
}

test('kernel and adapters contain no Math.random calls', () => {
  for (const dir of ['kernel', 'adapters']) {
    for (const file of files(path.join(root, dir)).filter((name) => name.endsWith('.js'))) {
      assert.equal(fs.readFileSync(file, 'utf8').includes('Math.random'), false, `${file} contains Math.random`);
    }
  }
});

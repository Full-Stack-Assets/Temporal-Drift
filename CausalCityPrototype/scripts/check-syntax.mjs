import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function javascriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(dir, entry.name);
      return entry.isDirectory() ? javascriptFiles(target) : target.endsWith('.js') || target.endsWith('.mjs') ? [target] : [];
    });
}

const targets = [...javascriptFiles(path.join(root, 'src')), ...javascriptFiles(path.join(root, 'scripts'))].sort();
for (const target of targets) {
  const result = spawnSync(process.execPath, ['--check', target], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax check passed: ${targets.length} JavaScript modules`);

import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const roots = [
  new URL('../src/', import.meta.url),
  new URL('../src/kernel/', import.meta.url),
  new URL('../src/adapters/', import.meta.url),
  new URL('../src/projection/', import.meta.url),
  new URL('../src/trustscape/', import.meta.url),
  new URL('../src/approximation/', import.meta.url),
  new URL('./', import.meta.url),
];
const files = [];
for (const root of roots) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(fileURLToPath(new URL(entry.name, root)));
  }
}
files.sort();
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}
process.stdout.write(`syntax-ok files=${files.length}\n`);

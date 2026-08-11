import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { listJavaScriptFiles } from './source-scan.js';

const files = await listJavaScriptFiles([
  new URL('../src/', import.meta.url),
  new URL('./', import.meta.url),
]);

for (const file of files) {
  const path = fileURLToPath(file);
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
}

process.stdout.write(`syntax-ok files=${files.length}\n`);

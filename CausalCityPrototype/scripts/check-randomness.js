import { readdir, readFile } from 'node:fs/promises';

const roots = [
  new URL('../src/kernel/', import.meta.url),
  new URL('../src/adapters/', import.meta.url),
  new URL('../src/projection/', import.meta.url),
  new URL('../src/trustscape/', import.meta.url),
];
const violations = [];
let filesChecked = 0;

for (const root of roots) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    filesChecked += 1;
    const url = new URL(entry.name, root);
    const source = await readFile(url, 'utf8');
    if (/Math\s*\.\s*random\s*\(/u.test(source)) violations.push(url.pathname);
  }
}

if (violations.length) {
  process.stderr.write(`E_RANDOMNESS_BAN: prohibited ambient randomness in ${violations.join(', ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`randomness-ban-ok files=${filesChecked}\n`);
}

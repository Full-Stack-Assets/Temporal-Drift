import { fileURLToPath } from 'node:url';

import {
  findAmbientRandomnessViolations,
  listJavaScriptFiles,
} from './source-scan.js';

const files = await listJavaScriptFiles([
  new URL('../src/kernel/', import.meta.url),
  new URL('../src/adapters/', import.meta.url),
  new URL('../src/projector/', import.meta.url),
  new URL('../src/trustscape/', import.meta.url),
]);
const violations = await findAmbientRandomnessViolations(files);

if (violations.length) {
  process.stderr.write(`E_RANDOMNESS_BAN: prohibited ambient randomness in ${violations.map(fileURLToPath).join(', ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`randomness-ban-ok files=${files.length}\n`);
}

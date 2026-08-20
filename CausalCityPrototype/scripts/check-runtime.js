import { pathToFileURL } from 'node:url';

import { assertSupportedRuntime, runtimeMajor } from '../src/kernel/runtime.js';

export { assertSupportedRuntime, runtimeMajor };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const major = assertSupportedRuntime();
  process.stdout.write(`runtime-ok node-${major} (${process.version})\n`);
}

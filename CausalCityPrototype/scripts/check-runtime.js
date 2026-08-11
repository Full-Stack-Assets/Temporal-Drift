import { pathToFileURL } from 'node:url';

import { TrustKernelError } from '../src/kernel/errors.js';

export function runtimeMajor(version) {
  const match = /^v(\d+)\./.exec(version);
  return match ? Number(match[1]) : null;
}

export function assertSupportedRuntime(version = process.version) {
  const major = runtimeMajor(version);
  if (major !== 22 && major !== 24) {
    throw new TrustKernelError('E_UNSUPPORTED_RUNTIME', `Trust Kernel v1 supports Node 22 and 24; received ${version}`);
  }
  return major;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const major = assertSupportedRuntime();
  process.stdout.write(`runtime-ok node-${major} (${process.version})\n`);
}

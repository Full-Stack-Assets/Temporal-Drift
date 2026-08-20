import { readFile } from 'node:fs/promises';

import { canonicalString } from '../src/kernel/canonicalize.js';
import { parseOfflineVerificationCapsule, verifyOfflineVerificationCapsule } from '../src/mesh/offline-capsule.js';

function writeError(errorCode) {
  process.stderr.write(`${canonicalString({
    format: 'offline-capsule-cli-error',
    schemaVersion: '1.0.0',
    ok: false,
    errorCode,
    firstMismatch: 'capsuleFile',
  })}\n`);
  process.exitCode = 1;
}

if (process.argv.length !== 3) {
  writeError('E_CAPSULE_CLI_ARGUMENT');
} else {
  let source;
  try {
    source = await readFile(process.argv[2], 'utf8');
  } catch {
    writeError('E_CAPSULE_CLI_READ');
  }
  if (source !== undefined) {
    try {
      const capsule = parseOfflineVerificationCapsule(source);
      const report = verifyOfflineVerificationCapsule(capsule);
      if (!report.ok) throw new Error('verification failed');
      process.stdout.write(`${canonicalString(report)}\n`);
    } catch (error) {
      writeError(error?.code === 'E_CAPSULE_CANONICAL' ? 'E_CAPSULE_CANONICAL' : 'E_CAPSULE_CANONICAL');
    }
  }
}

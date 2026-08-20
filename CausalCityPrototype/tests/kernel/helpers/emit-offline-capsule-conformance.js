import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import {
  createOfflineVerificationCapsule,
  exportOfflineVerificationCapsule,
  verifyOfflineVerificationCapsule,
} from '../../../src/mesh/offline-capsule.js';
import { buildOfflineCapsuleInput } from './offline-capsule-fixture.js';

const input = await buildOfflineCapsuleInput();
const capsule = createOfflineVerificationCapsule(input);
const report = verifyOfflineVerificationCapsule(capsule);
if (!report.ok) throw new Error('Offline capsule did not verify');
const exported = exportOfflineVerificationCapsule(capsule);

const directory = await mkdtemp(join(tmpdir(), 'ripple-offline-capsule-conformance-'));
let cliStdout;
let cliExitCode;
try {
  const path = join(directory, 'capsule.json');
  await writeFile(path, exported, 'utf8');
  const cli = fileURLToPath(new URL('../../../scripts/verify-offline-capsule.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, path], { encoding: 'utf8', timeout: 60000 });
  cliExitCode = result.status;
  if (result.status !== 0) throw new Error(result.stderr || 'Offline capsule CLI failed');
  cliStdout = result.stdout;
} finally {
  await rm(directory, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'offline-verification-capsule-v1',
  artifactHash: capsule.artifactHash,
  artifactByteLength: capsule.artifactByteLength,
  schemaBundleHash: capsule.schemaBundleHash,
  keyRegistryHash: capsule.keyRegistry.registryHash,
  attestationIds: capsule.attestations.map((item) => item.attestationId),
  registryAwareBundleHash: capsule.expectedRegistryAwareBundle.bundleHash,
  capsuleId: capsule.capsuleId,
  capsuleHash: capsule.capsuleHash,
  capsuleBytesHash: sha256BytesHex(Buffer.from(exported, 'utf8')),
  capsuleByteLength: Buffer.byteLength(exported, 'utf8'),
  reportHash: report.reportHash,
  cliExitCode,
  cliStdoutHash: sha256BytesHex(Buffer.from(cliStdout, 'utf8')),
  artifactBytesVerified: report.artifactBytesVerified,
  quorumStatus: report.quorumStatus,
  identityVerified: report.identityVerified,
  independentReviewEstablished: report.independentReviewEstablished,
  scientificValidityEstablished: report.scientificValidityEstablished,
  approvalAuthority: report.approvalAuthority,
})}\n`);

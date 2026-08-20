import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createOfflineVerificationCapsule,
  exportOfflineVerificationCapsule,
} from '../../src/mesh/offline-capsule.js';
import { buildOfflineCapsuleInput } from './helpers/offline-capsule-fixture.js';

const cli = fileURLToPath(new URL('../../scripts/verify-offline-capsule.js', import.meta.url));

async function withTempDir(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'ripple-offline-capsule-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('offline CLI verifies a canonical capsule and emits one deterministic JSON report', async () => {
  await withTempDir(async (directory) => {
    const capsule = createOfflineVerificationCapsule(await buildOfflineCapsuleInput());
    const path = join(directory, 'capsule.json');
    await writeFile(path, exportOfflineVerificationCapsule(capsule), 'utf8');
    const before = await readdir(directory);
    const first = spawnSync(process.execPath, [cli, path], { encoding: 'utf8', timeout: 60000 });
    const second = spawnSync(process.execPath, [cli, path], { encoding: 'utf8', timeout: 60000 });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stderr, '');
    assert.equal(first.stdout, second.stdout);
    const report = JSON.parse(first.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.capsuleId, capsule.capsuleId);
    assert.match(report.reportHash, /^[a-f0-9]{64}$/);
    assert.deepEqual(await readdir(directory), before, 'CLI must not write files');
  });
});

test('offline CLI fails closed with stable JSON for tampered, noncanonical, missing, and ambiguous inputs', async () => {
  await withTempDir(async (directory) => {
    const capsule = createOfflineVerificationCapsule(await buildOfflineCapsuleInput());
    const exported = exportOfflineVerificationCapsule(capsule);
    const cases = [
      { name: 'noncanonical.json', content: ` ${exported}`, code: 'E_CAPSULE_CANONICAL' },
      { name: 'tampered.json', content: exported.replace(capsule.artifactHash, '0'.repeat(64)), code: 'E_CAPSULE_CANONICAL' },
    ];
    for (const item of cases) {
      const path = join(directory, item.name);
      await writeFile(path, item.content, 'utf8');
      const result = spawnSync(process.execPath, [cli, path], { encoding: 'utf8', timeout: 60000 });
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, '');
      assert.equal(JSON.parse(result.stderr).errorCode, item.code);
    }

    const missing = spawnSync(process.execPath, [cli, join(directory, 'missing.json')], { encoding: 'utf8', timeout: 60000 });
    assert.notEqual(missing.status, 0);
    assert.equal(JSON.parse(missing.stderr).errorCode, 'E_CAPSULE_CLI_READ');

    for (const args of [[], ['a', 'b']]) {
      const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 60000 });
      assert.notEqual(result.status, 0);
      assert.equal(JSON.parse(result.stderr).errorCode, 'E_CAPSULE_CLI_ARGUMENT');
    }
  });
});

test('offline CLI source has no network imports or calls', async () => {
  const source = await readFile(cli, 'utf8');
  assert.doesNotMatch(source, /node:(?:http|https|net|tls|dns)/u);
  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /XMLHttpRequest/u);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('../kernel/helpers/emit-counter-chain.js', import.meta.url));
const expected = JSON.parse(await readFile(new URL('../fixtures/receipt-hashes-v1.json', import.meta.url), 'utf8'));

function emit() {
  const child = spawnSync(process.execPath, [runner], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout.trim();
}

test('acceptance: fresh processes emit byte-identical complete receipt chains', () => {
  const outputs = Array.from({ length: 4 }, emit);
  for (const output of outputs.slice(1)) assert.equal(output, outputs[0]);
  const fixture = JSON.parse(outputs[0]);
  assert.equal(fixture.fixtureVersion, 'counter-chain-v1');
  assert.equal(fixture.receiptHashes.length, 4);
  assert.equal(fixture.receiptHashes.at(-1), fixture.terminalReceiptHash);
  assert.equal(fixture.terminalReceiptHash, expected.counterTerminalReceiptHash);
  for (const hash of fixture.receiptHashes) assert.match(hash, /^[a-f0-9]{64}$/);
});

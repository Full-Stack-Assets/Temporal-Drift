import test from 'node:test';
import assert from 'node:assert/strict';

import { sha256Hex } from '../../src/kernel/canonicalize.js';
import {
  buildMemoryWindows,
  exportMemoryWindows,
  scoreNarrativeTension,
  verifyMemoryWindows,
} from '../../src/approximations/memory.js';

const BRANCH = `branch-${'d'.repeat(64)}`;

function record(overrides = {}) {
  return {
    perspectiveId: 'resident-1',
    branchId: BRANCH,
    sequence: 10,
    stepId: 'year-2045',
    metricPath: '/housing/rentPressure',
    objectiveValue: 100,
    perceivedValue: 120,
    scale: 1,
    sourceRef: 'memory-workshop-1',
    sourceVersion: 'v1',
    memoryKind: 'personal',
    generation: 0,
    inheritedFromPerspectiveId: null,
    ...overrides,
  };
}

function records() {
  return [
    record({
      perspectiveId: 'resident-parent',
      sequence: 5,
      stepId: 'year-2040',
      objectiveValue: 100,
      perceivedValue: 110,
      sourceRef: 'parent-interview',
    }),
    record(),
    record({
      sequence: 6,
      stepId: 'year-2041',
      objectiveValue: 100,
      perceivedValue: 80,
      memoryKind: 'cultural',
      generation: 1,
      inheritedFromPerspectiveId: 'resident-parent',
      sourceRef: 'family-archive',
    }),
    record({
      perspectiveId: 'planning-office',
      sequence: 0,
      stepId: 'year-2035',
      objectiveValue: 100,
      perceivedValue: 100,
      memoryKind: 'institutional',
      generation: 2,
      inheritedFromPerspectiveId: null,
      sourceRef: 'institutional-record',
    }),
  ];
}

function config(overrides = {}) {
  return {
    records: records(),
    windows: [
      { windowId: 'short', length: 5 },
      { windowId: 'medium', length: 10 },
      { windowId: 'long', length: 20 },
    ],
    currentSequence: 10,
    ...overrides,
  };
}

function rehash(value) {
  const { memoryArtifactHash: _old, ...core } = value;
  value.memoryArtifactHash = sha256Hex(core);
  return value;
}

test('narrative tension scoring is explicit, signed, content-addressed, and non-interpretive', () => {
  const positive = scoreNarrativeTension(record());
  assert.equal(positive.tension, 20);
  assert.equal(positive.magnitude, 20);
  assert.equal(positive.direction, 'positive');
  assert.match(positive.memoryRecordId, /^memory-record-[a-f0-9]{64}$/);

  const negative = scoreNarrativeTension(record({ perceivedValue: 70 }));
  assert.equal(negative.tension, -30);
  assert.equal(negative.magnitude, 30);
  assert.equal(negative.direction, 'negative');

  const aligned = scoreNarrativeTension(record({ perceivedValue: 100 }));
  assert.equal(aligned.tension, 0);
  assert.equal(aligned.magnitude, 0);
  assert.equal(aligned.direction, 'aligned');
  assert.equal('truth', positive, false);
  assert.equal('trauma', positive, false);
  assert.equal('trust', positive, false);
});

test('multi-resolution windows use exact integer weights and rational aggregates', () => {
  const artifact = buildMemoryWindows(config());
  assert.equal(artifact.format, 'ripple-memory-windows');
  assert.equal(artifact.schemaVersion, '1.0.0');
  assert.equal(artifact.approximation, true);
  assert.equal(artifact.currentSequence, 10);
  assert.equal(artifact.records.length, 4);
  assert.ok(Object.isFrozen(artifact));
  assert.equal(verifyMemoryWindows(artifact).ok, true);

  const residentShort = artifact.groups.find((group) => group.perspectiveId === 'resident-1' && group.windowId === 'short');
  assert.equal(residentShort.recordCount, 2);
  assert.equal(residentShort.totalWeight, 6);
  assert.equal(residentShort.weightedTensionNumerator, 80);
  assert.deepEqual(residentShort.directionCounts, { aligned: 0, negative: 1, positive: 1 });

  const residentMedium = artifact.groups.find((group) => group.perspectiveId === 'resident-1' && group.windowId === 'medium');
  assert.equal(residentMedium.totalWeight, 16);
  assert.equal(residentMedium.weightedTensionNumerator, 80);

  const residentLong = artifact.groups.find((group) => group.perspectiveId === 'resident-1' && group.windowId === 'long');
  assert.equal(residentLong.totalWeight, 36);
  assert.equal(residentLong.weightedTensionNumerator, 80);

  const institutionalShort = artifact.groups.find((group) => group.perspectiveId === 'planning-office' && group.windowId === 'short');
  assert.equal(institutionalShort.status, 'not-modeled-in-window');
  assert.equal(institutionalShort.recordCount, 0);
  assert.equal(institutionalShort.totalWeight, 0);
});

test('personal, cultural, and institutional records remain explicit and inheritance is never invented', () => {
  const artifact = buildMemoryWindows(config());
  assert.deepEqual(new Set(artifact.records.map((entry) => entry.memoryKind)), new Set(['personal', 'cultural', 'institutional']));
  const inherited = artifact.records.find((entry) => entry.memoryKind === 'cultural');
  assert.equal(inherited.inheritedFromPerspectiveId, 'resident-parent');
  assert.equal(inherited.generation, 1);
  const parent = artifact.records.find((entry) => entry.perspectiveId === 'resident-parent');
  assert.ok(parent);
  assert.ok(parent.generation < inherited.generation);
});

test('window construction is deterministic and preserves source inputs', () => {
  const input = config();
  const before = JSON.stringify(input);
  const first = buildMemoryWindows(input);
  const second = buildMemoryWindows(config());
  assert.equal(JSON.stringify(input), before);
  assert.equal(exportMemoryWindows(first), exportMemoryWindows(second));
  assert.match(first.memoryArtifactHash, /^[a-f0-9]{64}$/);
  assert.equal(new Set(first.records.map((entry) => entry.memoryRecordId)).size, first.records.length);
  assert.equal(new Set(first.groups.map((entry) => entry.memoryWindowGroupId)).size, first.groups.length);
});

test('memory windows reject future records, duplicate records, invalid generations, inheritance gaps, and invalid windows', () => {
  assert.throws(() => buildMemoryWindows(config({ records: [record({ sequence: 11 })] })), { code: 'E_MEMORY_WINDOW' });
  assert.throws(() => buildMemoryWindows(config({ records: [record(), record()] })), { code: 'E_MEMORY_WINDOW' });
  assert.throws(() => scoreNarrativeTension(record({ generation: -1 })), { code: 'E_MEMORY_WINDOW' });
  assert.throws(() => buildMemoryWindows(config({ records: [record({ memoryKind: 'cultural', generation: 1, inheritedFromPerspectiveId: 'missing' })] })), { code: 'E_MEMORY_WINDOW' });
  assert.throws(() => buildMemoryWindows(config({ windows: [{ windowId: 'short', length: 0 }] })), { code: 'E_MEMORY_WINDOW' });
  assert.throws(() => buildMemoryWindows(config({ windows: [{ windowId: 'same', length: 5 }, { windowId: 'same', length: 10 }] })), { code: 'E_MEMORY_WINDOW' });
});

test('verification rejects validly re-hashed records, weights, and group IDs with stale content commitments', () => {
  const artifact = buildMemoryWindows(config());

  const recordTamper = JSON.parse(exportMemoryWindows(artifact));
  recordTamper.records[0].tension += 1;
  rehash(recordTamper);
  const recordReport = verifyMemoryWindows(recordTamper);
  assert.equal(recordReport.ok, false);
  assert.equal(recordReport.errorCode, 'E_APPROX_HASH');

  const groupTamper = JSON.parse(exportMemoryWindows(artifact));
  groupTamper.groups[0].totalWeight += 1;
  rehash(groupTamper);
  const groupReport = verifyMemoryWindows(groupTamper);
  assert.equal(groupReport.ok, false);
  assert.equal(groupReport.errorCode, 'E_APPROX_HASH');

  const idTamper = JSON.parse(exportMemoryWindows(artifact));
  idTamper.groups[0].memoryWindowGroupId = `memory-window-group-${'f'.repeat(64)}`;
  rehash(idTamper);
  const idReport = verifyMemoryWindows(idTamper);
  assert.equal(idReport.ok, false);
  assert.equal(idReport.errorCode, 'E_APPROX_HASH');
});

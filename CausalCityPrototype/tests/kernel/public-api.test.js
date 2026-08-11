import test from 'node:test';
import assert from 'node:assert/strict';

import * as kernel from '../../src/kernel/index.js';

test('Trust Kernel v1 exposes the approved additive API surface', () => {
  for (const name of [
    'createRun', 'advanceRun', 'forkRun', 'exportRun', 'replayRun', 'verifyRun',
    'recordAnomaly', 'appendAnomalyReview',
  ]) assert.equal(typeof kernel[name], 'function', name);
});

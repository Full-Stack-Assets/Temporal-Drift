import test from 'node:test';
import assert from 'node:assert/strict';

import * as kernel from '../../src/kernel/index.js';

test('Trust Kernel and Phase-1 projection expose the approved additive API surface', () => {
  for (const name of [
    'createRun', 'advanceRun', 'forkRun', 'exportRun', 'replayRun', 'verifyRun',
    'createRunGraph', 'forkBranch', 'getBranch', 'listChildren', 'listAncestors',
    'exportRunGraph', 'parseRunGraph', 'verifyRunGraph',
    'recordAnomaly', 'appendAnomalyReview',
    'createAnnotation', 'normalizeAnnotations', 'projectRunGraph',
  ]) assert.equal(typeof kernel[name], 'function', name);
});

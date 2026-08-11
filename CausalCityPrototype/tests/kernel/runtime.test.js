import test from 'node:test';
import assert from 'node:assert/strict';

import { assertSupportedRuntime, runtimeMajor } from '../../scripts/check-runtime.js';

test('runtime guard accepts only Node 22 and 24 majors', () => {
  assert.equal(runtimeMajor('v22.18.0'), 22);
  assert.equal(runtimeMajor('v24.1.0'), 24);
  assert.doesNotThrow(() => assertSupportedRuntime('v22.0.0'));
  assert.doesNotThrow(() => assertSupportedRuntime('v24.99.0'));
  for (const version of ['v20.19.0', 'v23.1.0', 'v25.0.0', 'bad']) {
    assert.throws(() => assertSupportedRuntime(version), { code: 'E_UNSUPPORTED_RUNTIME' });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertPlainDataObject,
  contentAddress,
  evaluateDeterministically,
  normalizeSafeIntegerMap,
  pinDeterministicEvaluator,
  safeIntegerProduct,
  safeIntegerSum,
} from '../../src/approximations/common.js';

test('Phase-2 common validation rejects hidden, symbolic, accessor, inherited, and non-plain state', () => {
  assert.doesNotThrow(() => assertPlainDataObject({ alpha: 1 }, 'value'));

  const hidden = { alpha: 1 };
  Object.defineProperty(hidden, 'secret', { value: 2, enumerable: false });
  assert.throws(() => assertPlainDataObject(hidden, 'value'), { code: 'E_APPROX_SCHEMA' });

  const symbolic = { alpha: 1, [Symbol('secret')]: 2 };
  assert.throws(() => assertPlainDataObject(symbolic, 'value'), { code: 'E_APPROX_SCHEMA' });

  const accessor = {};
  Object.defineProperty(accessor, 'alpha', { enumerable: true, get: () => 1 });
  assert.throws(() => assertPlainDataObject(accessor, 'value'), { code: 'E_APPROX_SCHEMA' });

  const inherited = Object.create({ inherited: 1 });
  inherited.alpha = 1;
  assert.throws(() => assertPlainDataObject(inherited, 'value'), { code: 'E_APPROX_SCHEMA' });

  assert.throws(() => assertPlainDataObject(new Map(), 'value'), { code: 'E_APPROX_SCHEMA' });
});

test('safe integer maps are normalized, frozen, and reject unsafe numeric values', () => {
  const normalized = normalizeSafeIntegerMap({ zeta: -4, alpha: 7 }, 'metrics');
  assert.deepEqual(Object.keys(normalized), ['alpha', 'zeta']);
  assert.deepEqual(normalized, { alpha: 7, zeta: -4 });
  assert.ok(Object.isFrozen(normalized));
  assert.throws(() => normalizeSafeIntegerMap({ value: 1.5 }, 'metrics'), { code: 'E_APPROX_SCHEMA' });
  assert.throws(() => normalizeSafeIntegerMap({ value: -0 }, 'metrics'), { code: 'E_APPROX_SCHEMA' });
  assert.throws(() => normalizeSafeIntegerMap({}, 'metrics'), { code: 'E_APPROX_SCHEMA' });
});

test('evaluator identity and function are pinned and duplicate evaluation must agree', () => {
  const evaluator = {
    id: 'linear',
    version: '1.0.0',
    evaluate(parameters) {
      return { output: parameters.input * 2 };
    },
  };
  const pinned = pinDeterministicEvaluator(evaluator, ['output']);
  evaluator.id = 'mutated';
  evaluator.version = 'mutated';
  evaluator.evaluate = () => ({ output: 999 });
  assert.deepEqual(pinned.identity, { id: 'linear', version: '1.0.0' });
  assert.deepEqual(evaluateDeterministically(pinned, { input: 3 }), { output: 6 });

  let call = 0;
  const unstable = pinDeterministicEvaluator({
    id: 'unstable',
    version: '1',
    evaluate() {
      call += 1;
      return { output: call };
    },
  }, ['output']);
  assert.throws(() => evaluateDeterministically(unstable, { input: 1 }), { code: 'E_APPROX_EVALUATOR' });
});

test('evaluator outputs must contain exactly declared safe-integer metrics', () => {
  const missing = pinDeterministicEvaluator({ id: 'missing', version: '1', evaluate: () => ({}) }, ['output']);
  assert.throws(() => evaluateDeterministically(missing, { input: 1 }), { code: 'E_APPROX_EVALUATOR' });

  const extra = pinDeterministicEvaluator({ id: 'extra', version: '1', evaluate: () => ({ output: 1, extra: 2 }) }, ['output']);
  assert.throws(() => evaluateDeterministically(extra, { input: 1 }), { code: 'E_APPROX_EVALUATOR' });

  const floating = pinDeterministicEvaluator({ id: 'float', version: '1', evaluate: () => ({ output: 1.5 }) }, ['output']);
  assert.throws(() => evaluateDeterministically(floating, { input: 1 }), { code: 'E_APPROX_EVALUATOR' });

  const throwing = pinDeterministicEvaluator({ id: 'throw', version: '1', evaluate: () => { throw new Error('boom'); } }, ['output']);
  assert.throws(() => evaluateDeterministically(throwing, { input: 1 }), { code: 'E_APPROX_EVALUATOR' });
});

test('safe integer arithmetic fails closed on overflow', () => {
  assert.equal(safeIntegerSum([1, 2, -3], 'sum'), 0);
  assert.equal(safeIntegerProduct(7, -3, 'product'), -21);
  assert.throws(() => safeIntegerSum([Number.MAX_SAFE_INTEGER, 1], 'sum'), { code: 'E_APPROX_OVERFLOW' });
  assert.throws(() => safeIntegerProduct(Number.MAX_SAFE_INTEGER, 2, 'product'), { code: 'E_APPROX_OVERFLOW' });
});

test('content addresses are stable and domain separated', () => {
  const content = { alpha: 1, beta: 'two' };
  const first = contentAddress('sample', content);
  assert.equal(first, contentAddress('sample', structuredClone(content)));
  assert.match(first, /^sample-[a-f0-9]{64}$/);
  assert.notEqual(first, contentAddress('candidate', content));
});

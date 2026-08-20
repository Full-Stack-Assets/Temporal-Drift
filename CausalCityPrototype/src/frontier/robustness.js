import { sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';

function fail(message, path = 'robustness') {
  throw new TrustKernelError('E_ROBUSTNESS_SCHEMA', message, { path });
}

function validateMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix) || Object.getPrototypeOf(matrix) !== Object.prototype || Reflect.ownKeys(matrix).length !== 1 || !Array.isArray(matrix.branches) || matrix.branches.length === 0) fail('matrix must contain a non-empty branches array', 'matrix');
  let shocks = null;
  const ids = new Set();
  const branches = matrix.branches.map((branch, index) => {
    if (!branch || typeof branch !== 'object' || Array.isArray(branch) || Object.getPrototypeOf(branch) !== Object.prototype) fail('branch must be a plain object', `matrix.branches.${index}`);
    const own = Reflect.ownKeys(branch);
    if (own.length !== 2 || !own.includes('branchId') || !own.includes('outcomes')) fail('branch must contain branchId and outcomes only', `matrix.branches.${index}`);
    if (typeof branch.branchId !== 'string' || branch.branchId.length === 0) fail('branchId must be a non-empty string', `matrix.branches.${index}.branchId`);
    if (ids.has(branch.branchId)) fail('branchId values must be unique', `matrix.branches.${index}.branchId`);
    ids.add(branch.branchId);
    if (!branch.outcomes || typeof branch.outcomes !== 'object' || Array.isArray(branch.outcomes) || Object.getPrototypeOf(branch.outcomes) !== Object.prototype) fail('outcomes must be a plain object', `matrix.branches.${index}.outcomes`);
    const currentShocks = Object.keys(branch.outcomes).sort();
    if (currentShocks.length === 0) fail('outcomes must contain at least one shock', `matrix.branches.${index}.outcomes`);
    if (shocks === null) shocks = currentShocks;
    else if (JSON.stringify(currentShocks) !== JSON.stringify(shocks)) fail('all branches must declare the same shock set', `matrix.branches.${index}.outcomes`);
    const outcomes = {};
    for (const shock of currentShocks) {
      const value = branch.outcomes[shock];
      if (!Number.isSafeInteger(value)) fail('outcome must be a safe integer', `matrix.branches.${index}.outcomes.${shock}`);
      outcomes[shock] = value;
    }
    return { branchId: branch.branchId.normalize('NFC'), outcomes };
  });
  return { branches, shocks };
}

function safeAdd(left, right, path) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) fail('integer arithmetic exceeds safe range', path);
  return result;
}

export function scoreRobustness(matrix, config) {
  if (!config || typeof config !== 'object' || Array.isArray(config) || Object.getPrototypeOf(config) !== Object.prototype || Reflect.ownKeys(config).length !== 1 || !Object.prototype.hasOwnProperty.call(config, 'survivalThreshold') || !Number.isSafeInteger(config.survivalThreshold)) fail('config must contain a safe-integer survivalThreshold', 'config');
  const normalized = validateMatrix(matrix);
  const bestByShock = Object.fromEntries(normalized.shocks.map((shock) => [shock, Math.max(...normalized.branches.map((branch) => branch.outcomes[shock]))]));
  const results = normalized.branches.map((branch) => {
    const values = normalized.shocks.map((shock) => branch.outcomes[shock]);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const spread = maximum - minimum;
    if (!Number.isSafeInteger(spread)) fail('spread exceeds safe-integer range', `branches.${branch.branchId}.spread`);
    const survivalCount = values.filter((value) => value >= config.survivalThreshold).length;
    const regrets = {};
    let totalRegret = 0;
    for (const shock of normalized.shocks) {
      const regret = bestByShock[shock] - branch.outcomes[shock];
      if (!Number.isSafeInteger(regret) || regret < 0) fail('regret calculation is invalid', `branches.${branch.branchId}.regret.${shock}`);
      regrets[shock] = regret;
      totalRegret = safeAdd(totalRegret, regret, `branches.${branch.branchId}.totalRegret`);
    }
    return cloneAndFreeze({
      branchId: branch.branchId,
      outcomes: branch.outcomes,
      minimum,
      maximum,
      spread,
      survivalCount,
      shockCount: normalized.shocks.length,
      survivalFraction: { numerator: String(survivalCount), denominator: String(normalized.shocks.length) },
      regrets,
      totalRegret,
    });
  });
  results.sort((left, right) => right.survivalCount - left.survivalCount || left.totalRegret - right.totalRegret || left.spread - right.spread || left.branchId.localeCompare(right.branchId));
  const core = cloneAndFreeze({
    format: 'ripple-robustness-accounting',
    schemaVersion: '1.0.0',
    semanticClass: 'synthetic-robustness-accounting',
    survivalThreshold: config.survivalThreshold,
    shocks: normalized.shocks,
    branches: results,
  });
  return cloneAndFreeze({ ...core, robustnessHash: sha256Hex(core) });
}

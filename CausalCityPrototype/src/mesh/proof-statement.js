import {
  canonicalString,
  normalizeCanonicalValue,
  sha256Hex,
} from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  immutableReport,
  meshFail,
  normalizeHash,
  normalizeProfileId,
  normalizeText,
} from './common.js';

const INPUT_KEYS = [
  'statementType',
  'artifactType',
  'artifactHash',
  'cryptoProfileId',
  'statementVersion',
  'publicInputs',
  'privateWitnessCommitmentHash',
];
const OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  ...INPUT_KEYS,
  'publicInputsHash',
  'proofSystem',
  'proofGenerated',
  'proofVerified',
  'statementOnly',
  'executionAuthority',
  'statementId',
];
const TYPES = new Set(['receipt-chain-validity', 'terminal-commitment-membership', 'manifest-conformance']);

function normalizeInput(input) {
  const code = 'E_PROOF_STATEMENT_SCHEMA';
  assertExactPlainObject(input, INPUT_KEYS, code, 'proofStatementInput');
  const statementType = normalizeText(input.statementType, code, 'proofStatementInput.statementType');
  if (!TYPES.has(statementType)) meshFail(code, 'statementType is unsupported', 'proofStatementInput.statementType');
  if (!input.publicInputs || typeof input.publicInputs !== 'object' || Array.isArray(input.publicInputs) || Object.getPrototypeOf(input.publicInputs) !== Object.prototype) meshFail(code, 'publicInputs must be a plain object', 'proofStatementInput.publicInputs');
  let publicInputs;
  try {
    publicInputs = normalizeCanonicalValue(input.publicInputs);
  } catch {
    meshFail(code, 'publicInputs must be canonical-v1 compatible', 'proofStatementInput.publicInputs');
  }
  return cloneAndFreeze({
    statementType,
    artifactType: normalizeText(input.artifactType, code, 'proofStatementInput.artifactType'),
    artifactHash: normalizeHash(input.artifactHash, code, 'proofStatementInput.artifactHash'),
    cryptoProfileId: normalizeProfileId(input.cryptoProfileId, code, 'proofStatementInput.cryptoProfileId'),
    statementVersion: normalizeText(input.statementVersion, code, 'proofStatementInput.statementVersion'),
    publicInputs,
    privateWitnessCommitmentHash: normalizeHash(input.privateWitnessCommitmentHash, code, 'proofStatementInput.privateWitnessCommitmentHash'),
  });
}

function statementCore(input) {
  return cloneAndFreeze({
    format: 'future-zk-public-statement',
    schemaVersion: '1.0.0',
    ...input,
    publicInputsHash: sha256Hex(input.publicInputs),
    proofSystem: 'none',
    proofGenerated: false,
    proofVerified: false,
    statementOnly: true,
    executionAuthority: 'none',
  });
}

export function createProofStatement(input) {
  const core = statementCore(normalizeInput(input));
  return cloneAndFreeze({ ...core, statementId: `proof-statement-${sha256Hex(core)}` });
}

export function verifyProofStatement(statement) {
  try {
    assertExactPlainObject(statement, OUTPUT_KEYS, 'E_PROOF_STATEMENT_SCHEMA', 'proofStatement');
    if (statement.format !== 'future-zk-public-statement' || statement.schemaVersion !== '1.0.0' || statement.proofSystem !== 'none' || statement.proofGenerated !== false || statement.proofVerified !== false || statement.statementOnly !== true || statement.executionAuthority !== 'none') throw new Error('claim');
    const rebuilt = createProofStatement(Object.fromEntries(INPUT_KEYS.map((key) => [key, statement[key]])));
    if (canonicalString(rebuilt) !== canonicalString(statement)) throw new Error('statementId');
    return immutableReport({ ok: true, firstMismatch: null, statementId: rebuilt.statementId });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'proofStatement', statementId: null });
  }
}

import { canonicalString, sha256Hex } from '../kernel/canonicalize.js';
import { TrustKernelError } from '../kernel/errors.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactKeys,
  assertNonEmptyString,
  assertPlainDataObject,
  assertSafeInteger,
  contentAddress,
  normalizeSafeIntegerMap,
} from './common.js';

export const PROPOSAL_REGISTRY_FORMAT = 'ripple-branch-proposal-registry';
export const PROPOSAL_REGISTRY_SCHEMA_VERSION = '1.0.0';

const GRAPH_ID = /^graph-[a-f0-9]{64}$/;
const BRANCH_ID = /^branch-[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const ANOMALY_ID = /^anomaly-[a-f0-9]{64}$/;
const PROPOSAL_ID = /^branch-proposal-[a-f0-9]{64}$/;
const REVIEW_ID = /^proposal-review-[a-f0-9]{64}$/;
const DECISION_ID = /^proposal-decision-[a-f0-9]{64}$/;
const REVIEW_DISPOSITIONS = [
  'approve-for-manual-simulation',
  'needs-evidence',
  'reject',
];
const DECISION_DISPOSITIONS = [
  'approved-for-manual-simulation',
  'needs-evidence',
  'rejected',
];

function fail(code, message, path = 'proposalRegistry', expected = null, actual = null) {
  throw new TrustKernelError(code, message, { path, expected, actual });
}

function registryCore(value) {
  const { registryHash: _hash, ...core } = value;
  return cloneAndFreeze(core);
}

function makeRegistry(minimumApprovals, proposals, reviews, decisions) {
  const core = cloneAndFreeze({
    format: PROPOSAL_REGISTRY_FORMAT,
    schemaVersion: PROPOSAL_REGISTRY_SCHEMA_VERSION,
    minimumApprovals,
    proposals: cloneAndFreeze([...proposals]),
    reviews: cloneAndFreeze([...reviews]),
    decisions: cloneAndFreeze([...decisions]),
  });
  return cloneAndFreeze({ ...core, registryHash: sha256Hex(core) });
}

function parseValue(value) {
  if (typeof value !== 'string') return structuredClone(value);
  try {
    return JSON.parse(value);
  } catch {
    fail('E_PROPOSAL_SCHEMA', 'Proposal registry is not valid JSON', 'proposalRegistry');
  }
}

function normalizeStringArray(values, path) {
  if (!Array.isArray(values)) fail('E_PROPOSAL_SCHEMA', `${path} must be an array`, path);
  const normalized = values.map((value, index) => assertNonEmptyString(value, `${path}.${index}`, 'E_PROPOSAL_SCHEMA')).sort();
  if (new Set(normalized).size !== normalized.length) fail('E_PROPOSAL_SCHEMA', `${path} contains duplicates`, path);
  return cloneAndFreeze(normalized);
}

function normalizeParentRef(value, path = 'proposal.parentRef') {
  assertExactKeys(value, ['graphId', 'parentBranchId', 'forkStepId', 'parentReceiptHash'], path, 'E_PROPOSAL_SCHEMA');
  const result = {
    graphId: assertNonEmptyString(value.graphId, `${path}.graphId`, 'E_PROPOSAL_SCHEMA'),
    parentBranchId: assertNonEmptyString(value.parentBranchId, `${path}.parentBranchId`, 'E_PROPOSAL_SCHEMA'),
    forkStepId: assertNonEmptyString(value.forkStepId, `${path}.forkStepId`, 'E_PROPOSAL_SCHEMA'),
    parentReceiptHash: assertNonEmptyString(value.parentReceiptHash, `${path}.parentReceiptHash`, 'E_PROPOSAL_SCHEMA'),
  };
  if (!GRAPH_ID.test(result.graphId) || !BRANCH_ID.test(result.parentBranchId) || !HASH.test(result.parentReceiptHash)) {
    fail('E_PROPOSAL_SCHEMA', 'Proposal parent reference contains malformed identities', path);
  }
  return cloneAndFreeze(result);
}

function proposalContent(input, path = 'proposal') {
  assertExactKeys(input, [
    'anomalyId', 'requesterId', 'parentRef', 'hypothesis', 'parameters',
    'evidenceRefs', 'reviewRequired', 'executionAuthority',
  ], path, 'E_PROPOSAL_SCHEMA');
  const anomalyId = assertNonEmptyString(input.anomalyId, `${path}.anomalyId`, 'E_PROPOSAL_SCHEMA');
  if (!ANOMALY_ID.test(anomalyId)) fail('E_PROPOSAL_SCHEMA', 'Proposal anomalyId is malformed', `${path}.anomalyId`);
  if (input.reviewRequired !== true || input.executionAuthority !== 'none') {
    fail('E_PROPOSAL_SCHEMA', 'Proposal must require review and carry no execution authority', path);
  }
  return cloneAndFreeze({
    anomalyId,
    requesterId: assertNonEmptyString(input.requesterId, `${path}.requesterId`, 'E_PROPOSAL_SCHEMA'),
    parentRef: normalizeParentRef(input.parentRef, `${path}.parentRef`),
    hypothesis: assertNonEmptyString(input.hypothesis, `${path}.hypothesis`, 'E_PROPOSAL_SCHEMA'),
    parameters: normalizeSafeIntegerMap(input.parameters, `${path}.parameters`, { code: 'E_PROPOSAL_SCHEMA' }),
    evidenceRefs: normalizeStringArray(input.evidenceRefs, `${path}.evidenceRefs`),
    reviewRequired: true,
    executionAuthority: 'none',
  });
}

function makeProposal(input, path = 'proposal') {
  const content = proposalContent(input, path);
  return cloneAndFreeze({ ...content, proposalId: contentAddress('branch-proposal', content) });
}

function reviewContent(input, path = 'review') {
  assertExactKeys(input, ['proposalId', 'reviewerId', 'disposition', 'rationale', 'evidenceRefs'], path, 'E_PROPOSAL_REVIEW');
  const proposalId = assertNonEmptyString(input.proposalId, `${path}.proposalId`, 'E_PROPOSAL_REVIEW');
  if (!PROPOSAL_ID.test(proposalId)) fail('E_PROPOSAL_REVIEW', 'Review proposalId is malformed', `${path}.proposalId`);
  if (!REVIEW_DISPOSITIONS.includes(input.disposition)) fail('E_PROPOSAL_REVIEW', 'Unsupported review disposition', `${path}.disposition`);
  return cloneAndFreeze({
    proposalId,
    reviewerId: assertNonEmptyString(input.reviewerId, `${path}.reviewerId`, 'E_PROPOSAL_REVIEW'),
    disposition: input.disposition,
    rationale: assertNonEmptyString(input.rationale, `${path}.rationale`, 'E_PROPOSAL_REVIEW'),
    evidenceRefs: normalizeStringArray(input.evidenceRefs, `${path}.evidenceRefs`),
  });
}

function makeReview(input, path = 'review') {
  const content = reviewContent(input, path);
  return cloneAndFreeze({ ...content, reviewId: contentAddress('proposal-review', content) });
}

function decisionContent(input, path = 'decision') {
  assertExactKeys(input, ['proposalId', 'deciderId', 'disposition', 'rationale'], path, 'E_PROPOSAL_DECISION');
  const proposalId = assertNonEmptyString(input.proposalId, `${path}.proposalId`, 'E_PROPOSAL_DECISION');
  if (!PROPOSAL_ID.test(proposalId)) fail('E_PROPOSAL_DECISION', 'Decision proposalId is malformed', `${path}.proposalId`);
  if (!DECISION_DISPOSITIONS.includes(input.disposition)) fail('E_PROPOSAL_DECISION', 'Unsupported decision disposition', `${path}.disposition`);
  return cloneAndFreeze({
    proposalId,
    deciderId: assertNonEmptyString(input.deciderId, `${path}.deciderId`, 'E_PROPOSAL_DECISION'),
    disposition: input.disposition,
    rationale: assertNonEmptyString(input.rationale, `${path}.rationale`, 'E_PROPOSAL_DECISION'),
    reviewRequired: true,
    executionAuthority: 'none',
  });
}

function makeDecision(input, path = 'decision') {
  const content = decisionContent(input, path);
  return cloneAndFreeze({ ...content, decisionId: contentAddress('proposal-decision', content) });
}

function findProposal(registry, proposalId, code) {
  const proposal = registry.proposals.find((entry) => entry.proposalId === proposalId);
  if (!proposal) fail(code, `Unknown proposal ${proposalId}`, `proposals.${proposalId}`);
  return proposal;
}

function reviewsFor(registry, proposalId) {
  return registry.reviews.filter((review) => review.proposalId === proposalId);
}

function decisionFor(registry, proposalId) {
  return registry.decisions.find((decision) => decision.proposalId === proposalId) ?? null;
}

function deriveStatus(registry, proposalId) {
  const decision = decisionFor(registry, proposalId);
  if (decision) return decision.disposition;
  const reviews = reviewsFor(registry, proposalId);
  if (reviews.some((review) => review.disposition === 'reject')) return 'rejected';
  if (reviews.some((review) => review.disposition === 'needs-evidence')) return 'needs-evidence';
  const approvals = reviews.filter((review) => review.disposition === 'approve-for-manual-simulation').length;
  return approvals >= registry.minimumApprovals ? 'ready-for-decision' : 'under-review';
}

function validateDecisionPrerequisites(registry, proposal, decisionInput) {
  if (decisionInput.deciderId === proposal.requesterId) fail('E_PROPOSAL_DECISION', 'Requester cannot decide their own proposal', `decisions.${proposal.proposalId}.deciderId`);
  if (decisionFor(registry, proposal.proposalId)) fail('E_PROPOSAL_DECISION', 'Proposal already has a final decision', `decisions.${proposal.proposalId}`);
  const reviews = reviewsFor(registry, proposal.proposalId);
  const approvals = reviews.filter((review) => review.disposition === 'approve-for-manual-simulation').length;
  const rejected = reviews.some((review) => review.disposition === 'reject');
  const needsEvidence = reviews.some((review) => review.disposition === 'needs-evidence');
  if (decisionInput.disposition === 'approved-for-manual-simulation') {
    if (approvals < registry.minimumApprovals || rejected || needsEvidence) {
      fail('E_PROPOSAL_DECISION', 'Approval prerequisites are not satisfied', `decisions.${proposal.proposalId}`);
    }
  } else if (decisionInput.disposition === 'rejected' && !rejected) {
    fail('E_PROPOSAL_DECISION', 'A rejection decision requires a rejection review', `decisions.${proposal.proposalId}`);
  } else if (decisionInput.disposition === 'needs-evidence' && !needsEvidence) {
    fail('E_PROPOSAL_DECISION', 'A needs-evidence decision requires a needs-evidence review', `decisions.${proposal.proposalId}`);
  }
}

function verifyRegistry(value) {
  assertPlainDataObject(value, 'proposalRegistry');
  assertExactKeys(value, ['format', 'schemaVersion', 'minimumApprovals', 'proposals', 'reviews', 'decisions', 'registryHash'], 'proposalRegistry', 'E_PROPOSAL_SCHEMA');
  if (value.format !== PROPOSAL_REGISTRY_FORMAT || value.schemaVersion !== PROPOSAL_REGISTRY_SCHEMA_VERSION) fail('E_PROPOSAL_SCHEMA', 'Unsupported proposal registry format', 'proposalRegistry.schemaVersion');
  const minimumApprovals = assertSafeInteger(value.minimumApprovals, 'proposalRegistry.minimumApprovals', 'E_PROPOSAL_SCHEMA');
  if (minimumApprovals < 1) fail('E_PROPOSAL_SCHEMA', 'minimumApprovals must be positive', 'proposalRegistry.minimumApprovals');
  if (!Array.isArray(value.proposals) || !Array.isArray(value.reviews) || !Array.isArray(value.decisions)) fail('E_PROPOSAL_SCHEMA', 'Registry collections must be arrays', 'proposalRegistry');
  if (typeof value.registryHash !== 'string' || !HASH.test(value.registryHash)) fail('E_PROPOSAL_SCHEMA', 'registryHash is malformed', 'proposalRegistry.registryHash');
  const expectedHash = sha256Hex(registryCore(value));
  if (expectedHash !== value.registryHash) fail('E_APPROX_HASH', 'Registry hash mismatch', 'proposalRegistry.registryHash', expectedHash, value.registryHash);

  const proposals = value.proposals.map((proposal, index) => {
    assertExactKeys(proposal, [
      'anomalyId', 'requesterId', 'parentRef', 'hypothesis', 'parameters',
      'evidenceRefs', 'reviewRequired', 'executionAuthority', 'proposalId',
    ], `proposals.${index}`, 'E_PROPOSAL_SCHEMA');
    const { proposalId, ...raw } = proposal;
    const expected = makeProposal(raw, `proposals.${index}`);
    if (proposalId !== expected.proposalId) fail('E_APPROX_HASH', 'Proposal content ID mismatch', `proposals.${index}.proposalId`, expected.proposalId, proposalId);
    return expected;
  });
  if (new Set(proposals.map((proposal) => proposal.proposalId)).size !== proposals.length) fail('E_PROPOSAL_SCHEMA', 'Duplicate proposal ID', 'proposals');

  const reviews = value.reviews.map((review, index) => {
    assertExactKeys(review, ['proposalId', 'reviewerId', 'disposition', 'rationale', 'evidenceRefs', 'reviewId'], `reviews.${index}`, 'E_PROPOSAL_REVIEW');
    const { reviewId, ...raw } = review;
    const expected = makeReview(raw, `reviews.${index}`);
    if (reviewId !== expected.reviewId) fail('E_APPROX_HASH', 'Review content ID mismatch', `reviews.${index}.reviewId`, expected.reviewId, reviewId);
    return expected;
  });
  const proposalById = new Map(proposals.map((proposal) => [proposal.proposalId, proposal]));
  const reviewerKeys = new Set();
  for (const review of reviews) {
    const proposal = proposalById.get(review.proposalId);
    if (!proposal) fail('E_PROPOSAL_REVIEW', 'Review references an unknown proposal', `reviews.${review.reviewId}.proposalId`);
    if (proposal.requesterId === review.reviewerId) fail('E_PROPOSAL_REVIEW', 'Requester cannot review their own proposal', `reviews.${review.reviewId}.reviewerId`);
    const key = `${review.proposalId}\u0000${review.reviewerId}`;
    if (reviewerKeys.has(key)) fail('E_PROPOSAL_REVIEW', 'Reviewer submitted multiple reviews for one proposal', `reviews.${review.reviewId}`);
    reviewerKeys.add(key);
  }

  const decisions = value.decisions.map((decision, index) => {
    assertExactKeys(decision, ['proposalId', 'deciderId', 'disposition', 'rationale', 'reviewRequired', 'executionAuthority', 'decisionId'], `decisions.${index}`, 'E_PROPOSAL_DECISION');
    const { decisionId, reviewRequired, executionAuthority, ...raw } = decision;
    if (reviewRequired !== true || executionAuthority !== 'none') fail('E_PROPOSAL_DECISION', 'Decision carries invalid gate fields', `decisions.${index}`);
    const expected = makeDecision(raw, `decisions.${index}`);
    if (decisionId !== expected.decisionId) fail('E_APPROX_HASH', 'Decision content ID mismatch', `decisions.${index}.decisionId`, expected.decisionId, decisionId);
    return expected;
  });
  if (new Set(decisions.map((decision) => decision.proposalId)).size !== decisions.length) fail('E_PROPOSAL_DECISION', 'Proposal has multiple final decisions', 'decisions');

  const registry = makeRegistry(minimumApprovals, proposals, reviews, []);
  for (const decision of decisions) {
    const proposal = findProposal({ ...registry, decisions: [] }, decision.proposalId, 'E_PROPOSAL_DECISION');
    validateDecisionPrerequisites({ ...registry, decisions: [] }, proposal, decision);
  }
  return makeRegistry(minimumApprovals, proposals, reviews, decisions);
}

export function createProposalRegistry({ minimumApprovals }) {
  const value = assertSafeInteger(minimumApprovals, 'minimumApprovals', 'E_PROPOSAL_SCHEMA');
  if (value < 1) fail('E_PROPOSAL_SCHEMA', 'minimumApprovals must be positive', 'minimumApprovals');
  return makeRegistry(value, [], [], []);
}

export function submitBranchProposal(registryInput, proposalInput) {
  const registry = verifyRegistry(registryInput);
  const proposal = makeProposal(proposalInput);
  if (registry.proposals.some((entry) => entry.proposalId === proposal.proposalId)) fail('E_PROPOSAL_SCHEMA', 'Proposal already exists', `proposals.${proposal.proposalId}`);
  return makeRegistry(registry.minimumApprovals, [...registry.proposals, proposal], registry.reviews, registry.decisions);
}

export function appendProposalReview(registryInput, reviewInput) {
  const registry = verifyRegistry(registryInput);
  const review = makeReview(reviewInput);
  const proposal = findProposal(registry, review.proposalId, 'E_PROPOSAL_REVIEW');
  if (proposal.requesterId === review.reviewerId) fail('E_PROPOSAL_REVIEW', 'Requester cannot review their own proposal', `reviews.${review.reviewId}.reviewerId`);
  if (decisionFor(registry, review.proposalId)) fail('E_PROPOSAL_REVIEW', 'Cannot review a proposal after final decision', `reviews.${review.reviewId}`);
  if (registry.reviews.some((entry) => entry.proposalId === review.proposalId && entry.reviewerId === review.reviewerId)) fail('E_PROPOSAL_REVIEW', 'Reviewer already reviewed this proposal', `reviews.${review.reviewId}`);
  return makeRegistry(registry.minimumApprovals, registry.proposals, [...registry.reviews, review], registry.decisions);
}

export function decideBranchProposal(registryInput, decisionInput) {
  const registry = verifyRegistry(registryInput);
  const content = decisionContent(decisionInput);
  const proposal = findProposal(registry, content.proposalId, 'E_PROPOSAL_DECISION');
  validateDecisionPrerequisites(registry, proposal, content);
  const decision = makeDecision(decisionInput);
  return makeRegistry(registry.minimumApprovals, registry.proposals, registry.reviews, [...registry.decisions, decision]);
}

export function getProposalStatus(registryInput, proposalIdInput) {
  const registry = verifyRegistry(registryInput);
  const proposalId = assertNonEmptyString(proposalIdInput, 'proposalId', 'E_PROPOSAL_SCHEMA');
  findProposal(registry, proposalId, 'E_PROPOSAL_SCHEMA');
  const reviews = reviewsFor(registry, proposalId);
  return cloneAndFreeze({
    proposalId,
    status: deriveStatus(registry, proposalId),
    approvalCount: reviews.filter((review) => review.disposition === 'approve-for-manual-simulation').length,
    rejectionCount: reviews.filter((review) => review.disposition === 'reject').length,
    needsEvidenceCount: reviews.filter((review) => review.disposition === 'needs-evidence').length,
    minimumApprovals: registry.minimumApprovals,
    decisionId: decisionFor(registry, proposalId)?.decisionId ?? null,
  });
}

export function exportProposalRegistry(registryInput) {
  return canonicalString(verifyRegistry(registryInput));
}

export function parseProposalRegistry(exported) {
  const registry = verifyRegistry(parseValue(exported));
  if (typeof exported === 'string' && canonicalString(registry) !== exported) fail('E_PROPOSAL_SCHEMA', 'Proposal registry export is not canonical', 'proposalRegistry');
  return registry;
}

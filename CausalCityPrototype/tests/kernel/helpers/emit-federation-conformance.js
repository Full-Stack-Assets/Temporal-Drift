import { readFile } from 'node:fs/promises';

import { canonicalString, sha256BytesHex, sha256Hex } from '../../../src/kernel/canonicalize.js';
import {
  appendVerifierRevocation,
  createAnchorReceipt,
  createAnchorRequest,
  createCryptoProfile,
  createQuorumPolicy,
  createRevocationLedger,
  createVerificationAttestation,
  createVerifierRegistry,
  evaluateVerificationQuorum,
  verifyAnchorReceipt,
  verifyRevocationLedger,
  verifyVerificationAttestation,
} from '../../../src/federation/index.js';

const keyFixture = JSON.parse(await readFile(new URL('../../fixtures/federation-ed25519-test-key-v1.json', import.meta.url), 'utf8'));
const [KEY_A, KEY_B, KEY_C] = keyFixture.keys;
const frontierReportBytes = await readFile(new URL('../../../FRONTIER_VERIFICATION_REPORT.md', import.meta.url));
const subjectHash = sha256BytesHex(frontierReportBytes);
const verificationProcedureHash = sha256Hex({
  procedureVersion: 'npm-run-verify-procedure-v1',
  command: 'npm run verify',
  runtimeMajors: [22, 24],
  requiredGates: ['runtime', 'syntax', 'randomness', 'legacy-tests', 'kernel-tests', 'acceptance-tests', 'acceptance-summary'],
});

const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
const registry = createVerifierRegistry({
  registryVersion: 'verifier-registry-v1',
  cryptoProfileHash: profile.profileHash,
  verifiers: [
    { key: KEY_A, weight: 1 },
    { key: KEY_B, weight: 1 },
    { key: KEY_C, weight: 1 },
  ].map(({ key, weight }) => ({
    verifierId: key.verifierId,
    keyId: key.keyId,
    algorithm: 'ed25519',
    publicKeySpkiBase64: key.publicKeySpkiBase64,
    weight,
    validFromLogicalTime: 1,
    validUntilLogicalTime: null,
    role: key.role,
  })),
}, profile);

const subject = {
  subjectType: 'frontier-verification-report',
  subjectId: 'frontier-foundations-v1',
  subjectHash,
};

function unsignedFor(key, verdict, logicalTime) {
  return {
    attestationVersion: 'verification-attestation-v1',
    registryHash: registry.registryHash,
    verifierId: key.verifierId,
    keyId: key.keyId,
    logicalTime,
    ...subject,
    verificationProcedureId: 'npm-run-verify-procedure-v1',
    verificationProcedureHash,
    verdict,
    findingsHash: verdict === 'fail' ? sha256Hex({ finding: 'synthetic-conformance-fail-evidence' }) : null,
    limitationsHash: sha256Hex({ limitation: 'test-only-cryptographic-identity-not-independent-review' }),
  };
}

const attestationA = createVerificationAttestation(unsignedFor(KEY_A, 'pass', 10), KEY_A.privateKeyPem, registry, profile);
const attestationB = createVerificationAttestation(unsignedFor(KEY_B, 'pass', 10), KEY_B.privateKeyPem, registry, profile);
const attestationC = createVerificationAttestation(unsignedFor(KEY_C, 'fail', 10), KEY_C.privateKeyPem, registry, profile);
for (const attestation of [attestationA, attestationB, attestationC]) {
  const report = verifyVerificationAttestation(attestation, registry, profile);
  if (!report.ok) throw new Error(`Attestation failed verification: ${attestation.verifierId}`);
}

let revocations = createRevocationLedger(registry.registryHash);
revocations = appendVerifierRevocation(revocations, {
  verifierId: KEY_C.verifierId,
  keyId: KEY_C.keyId,
  logicalTime: 30,
  reasonCode: 'test-key-retirement',
  sourceEvidenceHash: sha256Hex({ evidence: 'test-key-retirement-after-attestation' }),
});
const revocationReport = verifyRevocationLedger(revocations);
if (!revocationReport.ok) throw new Error('Revocation ledger failed verification');

const passPolicy = createQuorumPolicy({
  policyVersion: 'quorum-policy-v1',
  minimumDistinctVerifiers: 2,
  minimumPassWeight: 2,
  maximumFailWeight: 0,
  allowAbstain: true,
  requiredRoles: ['security-review', 'reproducibility-review'],
});
const passQuorum = evaluateVerificationQuorum({
  attestations: [attestationB, attestationA],
  registry,
  cryptoProfile: profile,
  revocations,
  policy: passPolicy,
  subject,
});
if (passQuorum.disposition !== 'quorum-pass') throw new Error(`Unexpected pass quorum: ${passQuorum.disposition}`);

const conflictPolicy = createQuorumPolicy({
  policyVersion: 'quorum-policy-v1',
  minimumDistinctVerifiers: 2,
  minimumPassWeight: 1,
  maximumFailWeight: 0,
  allowAbstain: true,
  requiredRoles: [],
});
const conflictQuorum = evaluateVerificationQuorum({
  attestations: [attestationC, attestationA],
  registry,
  cryptoProfile: profile,
  revocations,
  policy: conflictPolicy,
  subject,
});
if (conflictQuorum.disposition !== 'conflicted') throw new Error(`Unexpected conflict quorum: ${conflictQuorum.disposition}`);

const anchorRequest = createAnchorRequest({
  ...subject,
  targetProfile: 'generic-external-anchor-v1',
  nonce: 'federation-conformance-explicit-nonce-v1',
});
const anchorReceipt = createAnchorReceipt({
  request: anchorRequest,
  providerId: 'test-anchor-provider',
  providerReceiptId: 'test-anchor-record-v1',
  anchoredHash: subjectHash,
  externalLocator: 'test://anchor/test-anchor-record-v1',
  observedAt: 'opaque-conformance-observation-v1',
  providerEvidenceHash: sha256Hex({ providerEvidence: 'test-only-linkage-evidence-v1' }),
});
if (!verifyAnchorReceipt(anchorReceipt, anchorRequest).ok) throw new Error('Anchor receipt failed verification');

const output = {
  fixtureVersion: 'verification-federation-v1',
  subjectType: subject.subjectType,
  subjectId: subject.subjectId,
  subjectHash,
  verificationProcedureHash,
  cryptoProfileHash: profile.profileHash,
  verifierRegistryHash: registry.registryHash,
  keyIds: registry.verifiers.map((entry) => entry.keyId),
  attestationABytesHash: sha256BytesHex(Buffer.from(canonicalString(attestationA), 'utf8')),
  attestationASignatureBase64: attestationA.signatureBase64,
  attestationAHash: attestationA.attestationHash,
  attestationBBytesHash: sha256BytesHex(Buffer.from(canonicalString(attestationB), 'utf8')),
  attestationBSignatureBase64: attestationB.signatureBase64,
  attestationBHash: attestationB.attestationHash,
  revocationRecordCount: revocationReport.recordCount,
  revocationTerminalHash: revocationReport.terminalRevocationHash,
  revocationLedgerHash: revocationReport.ledgerHash,
  passQuorumDisposition: passQuorum.disposition,
  passQuorumHash: passQuorum.quorumHash,
  conflictQuorumDisposition: conflictQuorum.disposition,
  conflictQuorumHash: conflictQuorum.quorumHash,
  anchorRequestHash: anchorRequest.requestHash,
  anchorReceiptHash: anchorReceipt.receiptHash,
  executionAuthority: 'none',
  autoMergeAllowed: false,
  autoTagAllowed: false,
  autoCutoverAllowed: false,
  postQuantumSecurityClaim: false,
  zeroKnowledgeProofClaim: false,
  anchorFinalityClaim: anchorReceipt.finalityClaim,
  reviewerIndependenceClaim: false,
};

process.stdout.write(`${JSON.stringify(output)}\n`);

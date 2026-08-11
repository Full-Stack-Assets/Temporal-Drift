import { canonicalString, sha256BytesHex } from '../../../src/kernel/canonicalize.js';
import { createCryptoPolicyProfile } from '../../../src/mesh/crypto-profile.js';
import { createVerificationAttestation } from '../../../src/mesh/attestation.js';
import {
  aggregateVerificationMesh,
  createVerificationMeshPolicy,
} from '../../../src/mesh/verification-mesh.js';
import {
  createAnchorReceipt,
  createAnchorRequest,
} from '../../../src/mesh/anchor-envelope.js';
import { createProofStatement } from '../../../src/mesh/proof-statement.js';
import { TEST_PRIVATE_KEYS } from '../../fixtures/mesh-test-ed25519-key.js';

const profile = createCryptoPolicyProfile({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

const artifactHash = 'a'.repeat(64);
function attestationInput(node, operator, logical, result = 'pass') {
  return {
    artifactType: 'run-export',
    artifactId: 'run-bellwether-baseline',
    artifactHash,
    verifierNodeId: `node-${node}`,
    operatorId: `operator-${operator}`,
    verificationMethod: 'trust-kernel-replay',
    verificationVersion: '1.0.0',
    verifiedAtLogical: logical,
    runtime: 'conformance-runtime-independent',
    evidenceHash: String(logical).repeat(64),
    result,
    failureCodes: result === 'pass' ? [] : ['E_VERIFICATION_FAILED'],
  };
}

const alpha = createVerificationAttestation(attestationInput('alpha', 'alpha', 1), TEST_PRIVATE_KEYS.alpha, profile);
const beta = createVerificationAttestation(attestationInput('beta', 'beta', 2), TEST_PRIVATE_KEYS.beta, profile);
const gamma = createVerificationAttestation(attestationInput('gamma', 'gamma', 3, 'fail'), TEST_PRIVATE_KEYS.gamma, profile);

const meshPolicy = createVerificationMeshPolicy({
  networkId: 'ripple-mesh-conformance-v1',
  artifactType: 'run-export',
  artifactHash,
  cryptoProfileId: profile.profileId,
  minimumPassingAttestations: 2,
  minimumDistinctOperators: 2,
  allowedVerifierNodeIds: ['node-alpha', 'node-beta', 'node-gamma'],
  allowedOperatorIds: ['operator-alpha', 'operator-beta', 'operator-gamma'],
  requireDistinctKeyFingerprints: true,
});
const mesh = aggregateVerificationMesh(meshPolicy, [gamma, alpha, beta], profile);

const anchorRequest = createAnchorRequest({
  artifactType: 'verification-mesh',
  artifactHash: mesh.meshHash,
  cryptoProfileId: profile.profileId,
  externalNetworkId: 'external-ledger-test-placeholder',
  requestedAtLogical: 10,
  metadataHash: 'd'.repeat(64),
});
const anchorReceipt = createAnchorReceipt(anchorRequest, {
  providerId: 'provider-placeholder',
  externalRecordId: 'record-placeholder-001',
  providerEvidenceHash: 'e'.repeat(64),
  anchoredAtLogical: 11,
  confirmationCount: 0,
  externalPublicationPerformed: false,
});

const proofStatement = createProofStatement({
  statementType: 'receipt-chain-validity',
  artifactType: 'run-export',
  artifactHash,
  cryptoProfileId: profile.profileId,
  statementVersion: '1.0.0',
  publicInputs: {
    receiptCount: 3,
    terminalReceiptHash: 'f'.repeat(64),
  },
  privateWitnessCommitmentHash: '9'.repeat(64),
});

const bytesHash = (value) => sha256BytesHex(Buffer.from(canonicalString(value), 'utf8'));

process.stdout.write(`${JSON.stringify({
  fixtureVersion: 'verification-mesh-v1',
  profileId: profile.profileId,
  profileBytesHash: bytesHash(profile),
  postQuantumMode: profile.postQuantumMode,
  quantumResistanceClaimed: profile.quantumResistanceClaimed,
  alphaAttestationId: alpha.attestationId,
  alphaStatementHash: alpha.statementHash,
  alphaPublicKeyFingerprint: alpha.publicKeyFingerprint,
  alphaSignature: alpha.signature,
  betaAttestationId: beta.attestationId,
  gammaAttestationId: gamma.attestationId,
  meshPolicyId: meshPolicy.policyId,
  meshHash: mesh.meshHash,
  meshBytesHash: bytesHash(mesh),
  meshStatus: mesh.status,
  meshPassingCount: mesh.passingAttestationCount,
  meshFailingCount: mesh.failingAttestationCount,
  meshDistinctOperatorCount: mesh.distinctPassingOperatorCount,
  meshAttestationOrder: mesh.attestations.map((item) => item.verifierNodeId),
  independenceVerified: mesh.independenceVerified,
  approvalAuthority: mesh.approvalAuthority,
  anchorRequestId: anchorRequest.requestId,
  anchorCommitmentHash: anchorRequest.anchorCommitmentHash,
  anchorReceiptId: anchorReceipt.receiptId,
  anchorReceiptBytesHash: bytesHash(anchorReceipt),
  anchorExternalPublicationPerformed: anchorReceipt.externalPublicationPerformed,
  anchorExternalVerificationRequired: anchorReceipt.externalVerificationRequired,
  proofStatementId: proofStatement.statementId,
  proofStatementBytesHash: bytesHash(proofStatement),
  proofGenerated: proofStatement.proofGenerated,
  proofVerified: proofStatement.proofVerified,
})}\n`);

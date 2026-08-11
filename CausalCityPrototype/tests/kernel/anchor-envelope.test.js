import test from 'node:test';
import assert from 'node:assert/strict';

import { createCryptoPolicyProfile } from '../../src/mesh/crypto-profile.js';
import {
  createAnchorReceipt,
  createAnchorRequest,
  verifyAnchorReceipt,
  verifyAnchorRequest,
} from '../../src/mesh/anchor-envelope.js';

const profile = createCryptoPolicyProfile({
  profileName: 'classical-ed25519-v1',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  publicKeyEncoding: 'spki-der-base64url',
  signatureEncoding: 'base64url',
  postQuantumMode: 'not-implemented',
  hybridSignatureRequired: false,
});

function requestInput() {
  return {
    artifactType: 'verification-mesh',
    artifactHash: 'a'.repeat(64),
    cryptoProfileId: profile.profileId,
    externalNetworkId: 'external-ledger-test-placeholder',
    requestedAtLogical: 200,
    metadataHash: 'b'.repeat(64),
  };
}

test('anchor request and receipt are deterministic, immutable, and exactly bound', () => {
  const request = createAnchorRequest(requestInput());
  const same = createAnchorRequest(requestInput());
  assert.deepEqual(request, same);
  assert.ok(Object.isFrozen(request));
  assert.match(request.requestId, /^anchor-request-[a-f0-9]{64}$/);
  assert.match(request.anchorCommitmentHash, /^[a-f0-9]{64}$/);
  assert.equal(request.externalPublicationPerformed, false);
  assert.equal(request.externalVerificationRequired, true);
  assert.deepEqual(verifyAnchorRequest(request), { ok: true, firstMismatch: null, requestId: request.requestId });

  const receipt = createAnchorReceipt(request, {
    providerId: 'provider-placeholder',
    externalRecordId: 'record-placeholder-001',
    providerEvidenceHash: 'c'.repeat(64),
    anchoredAtLogical: 205,
    confirmationCount: 0,
    externalPublicationPerformed: false,
  });
  assert.ok(Object.isFrozen(receipt));
  assert.match(receipt.receiptId, /^anchor-receipt-[a-f0-9]{64}$/);
  assert.equal(receipt.requestId, request.requestId);
  assert.equal(receipt.anchorCommitmentHash, request.anchorCommitmentHash);
  assert.equal(receipt.externalVerificationStatus, 'not-verified-by-local-envelope');
  assert.equal(receipt.externalNetworkAuthority, 'none');
  assert.deepEqual(verifyAnchorReceipt(receipt, request), { ok: true, firstMismatch: null, receiptId: receipt.receiptId });
});

test('anchor verification rejects request rebinding and validly re-hashed stale identifiers', () => {
  const request = createAnchorRequest(requestInput());
  const receipt = createAnchorReceipt(request, {
    providerId: 'provider-placeholder',
    externalRecordId: 'record-placeholder-001',
    providerEvidenceHash: 'c'.repeat(64),
    anchoredAtLogical: 205,
    confirmationCount: 0,
    externalPublicationPerformed: false,
  });

  assert.equal(verifyAnchorRequest({ ...request, requestId: `anchor-request-${'0'.repeat(64)}` }).ok, false);
  assert.equal(verifyAnchorReceipt({ ...receipt, requestId: `anchor-request-${'1'.repeat(64)}` }, request).ok, false);
  assert.equal(verifyAnchorReceipt({ ...receipt, anchorCommitmentHash: '2'.repeat(64) }, request).ok, false);
  assert.equal(verifyAnchorReceipt({ ...receipt, providerEvidenceHash: '3'.repeat(64) }, request).ok, false);
});

test('anchor envelopes cannot smuggle local claims of external verification or authority', () => {
  const request = { ...requestInput(), externalVerified: true };
  assert.throws(() => createAnchorRequest(request), { code: 'E_ANCHOR_SCHEMA' });

  const valid = createAnchorRequest(requestInput());
  assert.throws(() => createAnchorReceipt(valid, {
    providerId: 'provider-placeholder',
    externalRecordId: 'record-placeholder-001',
    providerEvidenceHash: 'c'.repeat(64),
    anchoredAtLogical: 205,
    confirmationCount: 1,
    externalPublicationPerformed: true,
    externallyVerified: true,
  }), { code: 'E_ANCHOR_SCHEMA' });

  assert.throws(() => createAnchorReceipt(valid, {
    providerId: 'provider-placeholder',
    externalRecordId: 'record-placeholder-001',
    providerEvidenceHash: 'c'.repeat(64),
    anchoredAtLogical: 199,
    confirmationCount: 0,
    externalPublicationPerformed: false,
  }), { code: 'E_ANCHOR_SCHEMA' });
});

test('anchor receipt rejects confirmations when publication is declared false', () => {
  const request = createAnchorRequest(requestInput());
  assert.throws(() => createAnchorReceipt(request, {
    providerId: 'provider-placeholder',
    externalRecordId: 'record-placeholder-001',
    providerEvidenceHash: 'c'.repeat(64),
    anchoredAtLogical: 205,
    confirmationCount: 1,
    externalPublicationPerformed: false,
  }), { code: 'E_ANCHOR_SCHEMA' });
});

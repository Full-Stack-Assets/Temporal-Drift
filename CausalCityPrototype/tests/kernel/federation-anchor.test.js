import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import {
  createAnchorReceipt,
  createAnchorRequest,
  verifyAnchorReceipt,
  verifyAnchorRequest,
} from '../../src/federation/anchor.js';

function makeRequest(overrides = {}) {
  return createAnchorRequest({
    subjectType: 'frontier-foundations',
    subjectId: 'frontier-foundations-v1',
    subjectHash: 'd'.repeat(64),
    targetProfile: 'transparency-log-generic-v1',
    nonce: 'explicit-nonce-0001',
    ...overrides,
  });
}

test('anchor request is deterministic, immutable, and content-addressed', () => {
  const first = makeRequest();
  const second = makeRequest();

  assert.equal(first.requestVersion, 'anchor-request-v1');
  assert.equal(first.requestHash, second.requestHash);
  assert.equal(canonicalString(first), canonicalString(second));
  assert.match(first.requestHash, /^[a-f0-9]{64}$/u);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(verifyAnchorRequest(first).ok, true);
});

test('anchor receipt binds exact request and subject hash without claiming external finality', () => {
  const request = makeRequest();
  const receipt = createAnchorReceipt({
    request,
    providerId: 'test-anchor-provider',
    providerReceiptId: 'provider-record-1',
    anchoredHash: request.subjectHash,
    externalLocator: 'test://anchor/provider-record-1',
    observedAt: '2026-08-11T20:00:00Z',
    providerEvidenceHash: 'e'.repeat(64),
  });

  assert.equal(receipt.receiptVersion, 'anchor-receipt-v1');
  assert.equal(receipt.requestHash, request.requestHash);
  assert.equal(receipt.anchoredHash, request.subjectHash);
  assert.equal(receipt.evidenceClass, 'external-anchor-linkage-evidence');
  assert.equal(receipt.finalityClaim, 'none');
  assert.equal(receipt.timestampAuthorityClaim, 'none');
  assert.equal(receipt.executionAuthority, 'none');
  assert.match(receipt.receiptHash, /^[a-f0-9]{64}$/u);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(verifyAnchorReceipt(receipt, request).ok, true);
});

test('anchor request and receipt reject malformed, mismatched, or stale content', () => {
  const request = makeRequest();
  const receipt = createAnchorReceipt({
    request,
    providerId: 'test-anchor-provider',
    providerReceiptId: 'provider-record-1',
    anchoredHash: request.subjectHash,
    externalLocator: 'test://anchor/provider-record-1',
    observedAt: '2026-08-11T20:00:00Z',
    providerEvidenceHash: 'e'.repeat(64),
  });

  for (const invalid of [
    { ...request, requestHash: '0'.repeat(64) },
    { ...request, subjectHash: 'bad' },
    { ...request, nonce: '' },
    { ...request, extra: true },
  ]) {
    assert.throws(
      () => verifyAnchorRequest(invalid),
      (error) => ['E_ANCHOR_REQUEST', 'E_UNSAFE_VALUE'].includes(error?.code),
    );
  }

  for (const invalid of [
    { ...receipt, requestHash: '0'.repeat(64) },
    { ...receipt, anchoredHash: 'f'.repeat(64) },
    { ...receipt, providerEvidenceHash: 'bad' },
    { ...receipt, receiptHash: '0'.repeat(64) },
    { ...receipt, finalityClaim: 'confirmed' },
  ]) {
    assert.throws(
      () => verifyAnchorReceipt(invalid, request),
      (error) => ['E_ANCHOR_RECEIPT', 'E_UNSAFE_VALUE'].includes(error?.code),
    );
  }
});

test('anchor construction is pure evidence-envelope logic with no hidden time or random inputs', () => {
  const left = makeRequest({ nonce: 'explicit-nonce-left' });
  const right = makeRequest({ nonce: 'explicit-nonce-right' });
  assert.notEqual(left.requestHash, right.requestHash);

  const request = makeRequest();
  const a = createAnchorReceipt({
    request,
    providerId: 'provider-a',
    providerReceiptId: 'record-a',
    anchoredHash: request.subjectHash,
    externalLocator: 'test://provider-a/record-a',
    observedAt: 'opaque-provider-metadata',
    providerEvidenceHash: 'a'.repeat(64),
  });
  const b = createAnchorReceipt({
    request,
    providerId: 'provider-a',
    providerReceiptId: 'record-a',
    anchoredHash: request.subjectHash,
    externalLocator: 'test://provider-a/record-a',
    observedAt: 'opaque-provider-metadata',
    providerEvidenceHash: 'a'.repeat(64),
  });
  assert.equal(a.receiptHash, b.receiptHash);
});

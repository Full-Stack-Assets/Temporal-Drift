# Ripple Verification Federation & Crypto-Agility v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved under standing autonomous project authorization; isolated R&D only  
**Base:** `codex/ripple-frontier-foundations-v1@02ef6e0208d70838c0077195e705abfb245dc058`  
**Branch:** `codex/ripple-verification-federation-v1`

## 1. Purpose

This layer lets independent verifiers publish cryptographically attributable statements about already-committed Trust Kernel, RunGraph, projection, approximation, or frontier artifacts without giving those verifiers authority to mutate simulation truth.

The layer adds:

- content-addressed verifier registries;
- algorithm-agility profiles;
- Ed25519-signed verification attestations using Node built-in crypto;
- append-only verifier revocation records;
- deterministic quorum aggregation with explicit conflict states;
- external-anchor request and receipt envelopes;
- strict schemas and cross-runtime conformance fixtures.

It does **not** establish real-world truth, reviewer independence by itself, public-chain finality, zero-knowledge proof soundness, post-quantum security, decentralized governance, or authority to merge/tag/cut over a lower layer.

## 2. Trust model

A valid signature proves only that the holder of the corresponding private key signed the exact canonical attestation payload. A valid quorum proves only that the configured verifier set satisfied the declared quorum rule over the same committed subject.

Neither proves:

- that verifier identities are socially independent;
- that the subject is scientifically valid;
- that source data are accurate or lawful;
- that a model is calibrated, fair, legitimate, or fit for municipal use;
- that an external anchor provider is honest beyond the supplied receipt evidence.

Verifier independence therefore remains an institutional property recorded outside the cryptographic primitive and reviewed explicitly.

## 3. Canonical primitives

All deterministic artifacts use the existing `canonical-v1` serializer and SHA-256 commitments. All caller-provided strings are NFC-normalized by canonicalization. No wall-clock time, ambient randomness, or unordered map iteration participates in identity derivation.

Logical times are caller-supplied safe integers. Real timestamps may appear only as evidence metadata supplied by an external adapter and are never generated inside deterministic core functions.

## 4. Algorithm-agility profile

`createCryptoProfile(config)` returns a deeply immutable, content-addressed profile.

Minimum fields:

```text
profileVersion
canonicalization = canonical-v1
hashAlgorithms = [sha256]
signatureAlgorithms = [ed25519]
primarySignatureAlgorithm = ed25519
unsupportedFutureAlgorithms = []
profileHash
```

v1 implements only `sha256` and `ed25519` in the deterministic core. Future post-quantum algorithms require a separately reviewed adapter and conformance fixture; merely naming an algorithm in metadata does not make it supported.

## 5. Verifier registry

`createVerifierRegistry({ registryVersion, cryptoProfileHash, verifiers })`

Each verifier descriptor contains:

```text
verifierId
keyId
algorithm
publicKeySpkiBase64
weight
validFromLogicalTime
validUntilLogicalTime | null
role
```

Requirements:

- `verifierId` and `keyId` are content-bound stable strings;
- duplicate verifier IDs or key IDs fail closed;
- weights are positive safe integers;
- only algorithms enabled by the referenced profile are accepted;
- registry order is canonical and independent of caller order;
- registry identity changes when any verifier, key, weight, validity interval, or profile changes.

The registry is configuration evidence, not proof that named verifiers are independent people or organizations.

## 6. Signed verification attestation

`createVerificationAttestation(unsigned, privateKeyPem)` constructs and signs a canonical payload.

Unsigned payload:

```text
attestationVersion
registryHash
verifierId
keyId
logicalTime
subjectType
subjectId
subjectHash
verificationProcedureId
verificationProcedureHash
verdict = pass | fail | abstain
findingsHash | null
limitationsHash | null
```

The signature is Ed25519 over the exact canonical UTF-8 bytes of the unsigned payload. The signed envelope contains:

```text
algorithm = ed25519
signatureBase64
attestationHash
```

`verifyVerificationAttestation(attestation, registry, cryptoProfile)` must:

- recompute all content IDs;
- validate registry/profile linkage;
- resolve verifier and key exactly;
- enforce logical validity intervals;
- verify the Ed25519 signature;
- reject stale content IDs, unknown fields, wrong subjects, wrong keys, and revoked keys.

## 7. Append-only revocation ledger

`appendVerifierRevocation(ledger, record)` creates an immutable hash-linked revocation record.

Record fields:

```text
revocationId
registryHash
verifierId
keyId
logicalTime
reasonCode
sourceEvidenceHash
previousRevocationHash | null
recordHash
```

Rules:

- logical time must be monotonic;
- a key may not be revoked twice under the same ledger;
- revocation does not erase or rewrite earlier signatures;
- evaluation functions decide whether an attestation was valid at its declared logical time and whether it remains acceptable under the current policy.

## 8. Quorum policy and aggregation

`evaluateVerificationQuorum({ attestations, registry, cryptoProfile, revocations, policy, subject })`

Policy fields:

```text
policyVersion
minimumDistinctVerifiers
minimumPassWeight
maximumFailWeight
allowAbstain
requiredRoles[]
policyHash
```

The aggregator verifies every attestation independently before counting it.

Possible dispositions:

- `quorum-pass`
- `quorum-fail`
- `conflicted`
- `insufficient-quorum`
- `invalid-evidence`

Rules:

- only attestations for the exact same subject type, ID, and hash participate;
- duplicate verifier IDs count once;
- revoked/invalid signatures do not count;
- `pass`, `fail`, and `abstain` weights are reported separately;
- disagreement is preserved, never averaged away;
- a quorum artifact never grants simulation, merge, tag, deployment, or policy-execution authority.

## 9. External-anchor envelopes

The deterministic core does not call a blockchain, transparency log, timestamp authority, or external network.

`createAnchorRequest({ subjectType, subjectId, subjectHash, targetProfile, nonce })`

produces a content-addressed request. `nonce` is explicit caller input, never ambient randomness.

`createAnchorReceipt({ request, providerId, providerReceiptId, anchoredHash, externalLocator, observedAt, providerEvidenceHash })`

creates a linked evidence envelope from adapter-supplied values.

`verifyAnchorReceipt(receipt, request)` verifies only deterministic linkage:

- request hash;
- anchored hash equals subject hash;
- provider fields are structurally valid;
- receipt content ID is correct.

It does not prove chain finality, legal timestamp status, censorship resistance, or provider honesty. Those properties belong to provider-specific adapters and later reviews.

## 10. Error handling

All invalid deterministic inputs fail closed with stable error codes. No verifier, signature, registry, revocation, quorum, or anchor artifact is silently repaired.

Representative codes:

```text
E_CRYPTO_PROFILE
E_VERIFIER_REGISTRY
E_SIGNATURE_ALGORITHM
E_ATTESTATION_SCHEMA
E_ATTESTATION_SIGNATURE
E_ATTESTATION_REVOKED
E_REVOCATION_SCHEMA
E_QUORUM_POLICY
E_QUORUM_SUBJECT
E_ANCHOR_REQUEST
E_ANCHOR_RECEIPT
```

## 11. Schemas

Add strict JSON Schema 2020-12 documents for:

- crypto profile;
- verifier registry;
- verification attestation;
- verifier revocation ledger;
- quorum result;
- anchor request;
- anchor receipt.

Schemas are validation contracts, not substitutes for cryptographic verification.

## 12. Acceptance gates

v1 requires all of the following:

1. A fixed Ed25519 private key signs the same canonical attestation bytes identically in fresh Node 22 and Node 24 processes.
2. The corresponding public key verifies the signature in both runtimes.
3. A one-byte subject-hash, procedure-hash, verdict, verifier, or signature change fails verification.
4. Wrong-key, expired-key, future-key, and revoked-key attestations fail closed.
5. Registry ordering does not change registry identity.
6. Quorum aggregation is order-independent and preserves pass/fail/abstain evidence.
7. Duplicate verifier attestations cannot increase quorum weight.
8. Conflicting valid attestations produce an explicit conflict or policy-defined failure; conflict is never hidden.
9. Anchor request/receipt linkage rejects mismatched subject hashes and request hashes.
10. All new source is covered by syntax and ambient-randomness gates.
11. All inherited Phase-0/1/2/frontier acceptance tests remain green.
12. A literal cross-runtime conformance fixture pins registry, attestation, revocation, quorum, and anchor commitments only after Node 22/24 emit identical values.

## 13. Explicit non-goals and future design gates

Separate design/review cycles remain mandatory for:

- ML-DSA / SLH-DSA or other post-quantum signature implementations;
- public blockchain or transparency-log adapters;
- hardware-backed or HSM key custody;
- zero-knowledge statements and proof systems;
- decentralized verifier discovery or Sybil resistance;
- cross-language cryptographic conformance;
- automated reviewer assignment;
- autonomous merge/tag/cut-over decisions;
- municipal or legal certification.

## 14. Phase relationship

This branch is stacked on Frontier Foundations v1 and must remain draft. It may demonstrate that multiple cryptographic identities produced valid attributable attestations about committed artifacts. It cannot retroactively satisfy the existing independent-review gate unless the actual reviewer identities, independence, review scope, findings, and disposition are separately established and attributable.

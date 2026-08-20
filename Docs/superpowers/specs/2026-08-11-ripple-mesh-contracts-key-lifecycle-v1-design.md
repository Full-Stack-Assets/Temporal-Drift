# Ripple City Portable Mesh Contracts & Key Lifecycle v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for isolated synthetic R&D only  
**Base:** `codex/ripple-verification-mesh-v1@a6ba06de43dcefa8ce84c507e5ef9b918cbaa163`  
**Branch:** `codex/ripple-mesh-contracts-key-lifecycle-v1`

## 1. Purpose

Verification Mesh v1 is internally deterministic but explicitly lacks portable schemas and key-history semantics. This tranche adds:

1. strict JSON Schema 2020-12 contracts for every mesh artifact;
2. an immutable declared key registry with registration, rotation, revocation, historical status resolution, and registry-aware attestation admission.

It does not implement real identity verification, certificate authority, external networking, hardware custody, post-quantum signatures, zero-knowledge proofs, branch authority, or municipal approval.

## 2. Portable schema bundle

Add strict schemas for:

- `crypto-policy-profile-v1.schema.json`
- `verification-attestation-v1.schema.json`
- `verification-mesh-policy-v1.schema.json`
- `verification-mesh-v1.schema.json`
- `external-anchor-request-v1.schema.json`
- `external-anchor-receipt-v1.schema.json`
- `proof-statement-v1.schema.json`
- `verification-key-registry-v1.schema.json`

Every top-level schema uses draft 2020-12, `type: object`, `additionalProperties: false`, and complete `required` fields. Schemas constrain IDs, hashes, constants, enums, and local pass/fail relations. Runtime verifiers remain responsible for signatures, complete ID recomputation, event-chain rules, duplicate detection, and historical interval semantics.

## 3. Verification key registry

`createVerificationKeyRegistry({ networkId, cryptoProfileId, registryVersion })` returns an immutable registry containing:

```text
format = verification-key-registry
schemaVersion = 1.0.0
identityBasis = declared-node-and-operator
identityVerified = false
registryAuthority = none
events = []
registryHash
```

Every append returns a new registry and preserves all prior bytes.

### Key events

Each event records:

- `eventType`: `register`, `rotate`, or `revoke`;
- sequence and strictly increasing logical time;
- declared verifier node and operator;
- subject Ed25519 public key as SPKI DER base64url;
- SHA-256 key fingerprint;
- predecessor fingerprint or null;
- stable reason code;
- previous-event hash or null;
- event hash.

#### Register

Creates the first key for an unseen node, requires no predecessor, and requires a globally unused fingerprint.

#### Rotate

Requires the node’s current active key as predecessor, the same declared operator, and a new globally unused fingerprint. The predecessor is valid before the rotation time; the replacement is valid at and after that time.

#### Revoke

Requires the node’s current active key and closes its interval at the revocation time. The key is not valid at that exact time. v1 permits no event after node revocation.

## 4. Registry verification

`verifyVerificationKeyRegistry()` recomputes:

- event hashes and previous-event links;
- sequence and logical-time continuity;
- fingerprints from public-key bytes;
- global fingerprint uniqueness;
- one initial registration per node;
- operator continuity;
- valid rotation predecessor;
- valid revocation subject;
- terminal registry hash.

Malformed stored registries return immutable failure reports and are never repaired.

## 5. Historical key status

`resolveVerificationKeyStatus(registry, query)` returns:

- `active`
- `not-yet-active`
- `superseded`
- `revoked`
- `unknown-key`
- `identity-mismatch`

for a declared node, operator, fingerprint, and logical time. Results include relevant event commitments and interval boundaries.

## 6. Registry-aware attestation admission

`evaluateAttestationKeyAdmission(registry, attestation, cryptoProfile)` requires:

1. the existing cryptographic verifier to return `ok: true`;
2. the attestation key to be `active` for its node/operator at `verifiedAtLogical`.

The result records:

```text
admitted = true | false
cryptographicSignatureValid = true | false
registryStatus
identityVerified = false
approvalAuthority = none
```

Historical attestations made while a key was active remain admissible after later rotation or revocation. Registry admission does not prove real identity, competence, truth, independence, or authority.

`aggregateVerificationMeshWithRegistry()` is additive: it records registry admission for every supplied attestation, passes only admitted attestations to the existing quorum engine, and retains rejected admission evidence separately.

## 7. Boundary rules

Inputs reject unknown, hidden, symbolic, accessor, inherited, sparse, or non-plain structures before reading values. Public keys must decode canonically and be Ed25519 SPKI DER. Integers must be safe. Returned artifacts are recursively immutable.

Stable codes:

- `E_KEY_REGISTRY_SCHEMA`
- `E_KEY_REGISTRY_EVENT`
- `E_KEY_REGISTRY_CHAIN`
- `E_KEY_STATUS_QUERY`
- `E_KEY_ADMISSION`

## 8. Conformance fixture

The fixture uses the existing public test-only keys:

1. register alpha at logical time 10;
2. rotate alpha to beta at 20;
3. revoke beta at 30.

It records registry/event hashes, canonical bytes, interval boundary results, registry-aware admission and rejection examples, and a canonical schema-bundle hash. Four fresh processes and both supported Node majors must emit identical values.

## 9. Acceptance gates

- all eight schemas are strict JSON Schema 2020-12 documents;
- valid mesh and registry artifacts satisfy their schemas;
- malformed nested values and constant contradictions fail schema validation;
- registry appends are immutable and hash-linked;
- half-open validity intervals are correct;
- fingerprints are recomputed from public-key bytes;
- rotation and revocation rules fail closed;
- historical admission semantics are deterministic;
- rejected admissions are retained but excluded from quorum;
- fresh-process and Node 22/24 fixture values are identical;
- all inherited tests and static gates remain green.

## 10. Deferred work

Separate reviews are required for real identity verification, signed registry administration, multisignature governance, retroactive compromise handling, recovery after revocation, expiration, remote transport, standards-based PKI interoperability, post-quantum lifecycles, external publication, proof systems, or operational authority.

## 11. Claim boundary

This tranche is a portable schema and declared key-lifecycle prototype. It is not a production identity system, certificate authority, independently governed registry, recovery system, externally authenticated network, post-quantum system, or source of approval authority.

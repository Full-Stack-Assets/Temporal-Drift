# Ripple City Portable Mesh Contracts & Key Lifecycle v1 — Implementation Plan

> Implement every correctness behavior test-first. Preserve every inherited fixture and authority boundary.

**Goal:** Add portable JSON Schemas and deterministic declared key-history semantics without claiming real identity, certificate authority, production custody, external networking, or approval power.

## Task 1 — Portable mesh schemas

**Create:**
- `CausalCityPrototype/schemas/crypto-policy-profile-v1.schema.json`
- `CausalCityPrototype/schemas/verification-attestation-v1.schema.json`
- `CausalCityPrototype/schemas/verification-mesh-policy-v1.schema.json`
- `CausalCityPrototype/schemas/verification-mesh-v1.schema.json`
- `CausalCityPrototype/schemas/external-anchor-request-v1.schema.json`
- `CausalCityPrototype/schemas/external-anchor-receipt-v1.schema.json`
- `CausalCityPrototype/schemas/proof-statement-v1.schema.json`
- `CausalCityPrototype/schemas/verification-key-registry-v1.schema.json`

**Modify:** `CausalCityPrototype/tests/kernel/schemas.test.js`

- [ ] RED: missing schema files and artifact-validation expectations.
- [ ] GREEN: strict draft-2020-12 shapes, constants, patterns, and local conditional rules.
- [ ] Prove malformed IDs, hashes, enums, nested records, and overclaim fields fail.

## Task 2 — Immutable key registry

**Create:**
- `CausalCityPrototype/src/mesh/key-registry.js`
- `CausalCityPrototype/tests/kernel/key-registry.test.js`

- [ ] RED: empty registry identity, immutable append, registration, fingerprint derivation, hash links, sequence/time rules.
- [ ] GREEN: dependency-light implementation using existing canonical and strict-boundary utilities.

## Task 3 — Rotation and revocation

Extend key-registry tests first:

- [ ] RED: valid rotation, invalid predecessor, operator drift, key reuse, valid revocation, events after revocation.
- [ ] GREEN: half-open interval lifecycle and fail-closed chain rules.

## Task 4 — Historical status resolution

- [ ] RED: active/not-yet-active/superseded/revoked/unknown/identity-mismatch at exact interval boundaries.
- [ ] GREEN: deterministic immutable status evidence with event and interval commitments.

## Task 5 — Registry-aware admission and quorum

**Create:**
- `CausalCityPrototype/src/mesh/key-admission.js`
- `CausalCityPrototype/tests/kernel/key-admission.test.js`

- [ ] RED: cryptographic verification plus historical key admission.
- [ ] RED: old-key admission before rotation and rejection at rotation time.
- [ ] RED: replacement-key admission at rotation time and rejection at revocation time.
- [ ] RED: registry-aware quorum excludes rejected admissions but retains evidence.
- [ ] GREEN: additive APIs; existing mesh API and fixture remain unchanged.

## Task 6 — Boundary and scanner hardening

**Modify:**
- `CausalCityPrototype/tests/kernel/mesh-source-gates.test.js`
- scanner files only if necessary

- [ ] Confirm all new deterministic mesh modules are already covered.
- [ ] Add descriptor-first nested-event tests.
- [ ] Reject malformed public-key encodings without invoking accessors.

## Task 7 — Literal conformance

**Create:**
- `CausalCityPrototype/tests/kernel/helpers/emit-key-lifecycle-conformance.js`
- `CausalCityPrototype/tests/fixtures/key-lifecycle-hashes-v1.json`
- `CausalCityPrototype/tests/acceptance/key-lifecycle-conformance.test.js`

**Modify:** `CausalCityPrototype/scripts/acceptance-summary.js`

- [ ] RED with explicit placeholders.
- [ ] Observe Node 22/24 actuals independently.
- [ ] Pin only byte-identical commitments.
- [ ] Preserve all inherited conformance values.

## Task 8 — Internal adversarial review

- [ ] Tamper event hashes, previous links, sequence, time, fingerprint, predecessor, operator, and terminal registry hash.
- [ ] Attempt key reuse across nodes.
- [ ] Attempt valid signature with inactive key.
- [ ] Attempt stale nested IDs in registry-aware quorum evidence.
- [ ] Convert each discovered defect into a RED regression before correction.

## Task 9 — Evidence package and stacked draft PR

**Create:** `CausalCityPrototype/KEY_LIFECYCLE_VERIFICATION_REPORT.md`

- [ ] Record exact heads, workflow/job IDs, Node versions, counts, schema-bundle hash, registry commitments, TDD history, and limitations.
- [ ] Open a draft PR stacked on `codex/ripple-verification-mesh-v1`.
- [ ] Keep unmerged, untagged, undeployed, and non-authoritative.
- [ ] Require independent version-pinned review.

## Explicit exclusions

No real identity proof, production key material, certificate authority, remote transport, recovery after revocation, retroactive compromise handling, external publication, post-quantum implementation, zero-knowledge proof, branch mutation, calibration, municipal authority, merge, tag, deployment, or cut-over is included.

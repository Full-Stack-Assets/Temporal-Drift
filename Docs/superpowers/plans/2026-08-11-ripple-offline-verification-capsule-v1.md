# Ripple City Portable Verification Capsule & Offline Verifier v1 — Implementation Plan

> Implement every correctness behavior test-first. Preserve every inherited fixture and claim boundary.

**Goal:** Create a canonical self-contained evidence capsule and deterministic offline verifier without claiming model replay, real identity, independent operation, external publication, or approval authority.

## Task 1 — Artifact and schema-bundle contracts

**Create:**
- `CausalCityPrototype/src/mesh/offline-capsule.js`
- `CausalCityPrototype/tests/kernel/offline-capsule.test.js`

- [ ] RED: artifact string must parse and reproduce exact canonical-v1 bytes.
- [ ] RED: artifact hash/length, schema names, strictness, and schema-bundle hash.
- [ ] RED: hidden/accessor/symbol/sparse bundle structures fail before reads.
- [ ] GREEN: bounded normalizers and immutable owned values.

## Task 2 — Evidence assembly

Extend tests first:

- [ ] RED: crypto profile, registry, policy, attestation, artifact, and expected-bundle binding.
- [ ] RED: cryptographic and registry-aware reconstruction must match exactly.
- [ ] RED: inconsistent evidence cannot create a capsule.
- [ ] GREEN: complete verified capsule construction.

## Task 3 — Capsule verification and content identity

- [ ] RED: recompute every nested ID and the capsule hash/ID.
- [ ] RED: tampered artifact, profile, schema, registry, attestation, expected bundle, claim boundary, capsule hash, and capsule ID fail.
- [ ] GREEN: immutable verification report with deterministic `reportHash`.

## Task 4 — Canonical export and parse

- [ ] RED: byte-identical export/parse round trip.
- [ ] RED: noncanonical whitespace, key order, Unicode, and tampering fail closed.
- [ ] GREEN: canonical parser returns a verified immutable capsule.

## Task 5 — Portable schema

**Create:**
- `CausalCityPrototype/schemas/offline-verification-capsule-v1.schema.json`
- `CausalCityPrototype/tests/kernel/offline-capsule-schema.test.js`

- [ ] RED: missing schema and complete nested validation expectations.
- [ ] GREEN: strict draft-2020-12 contract.
- [ ] Prove schema validation is necessary but not sufficient for cryptographic verification.

## Task 6 — Offline CLI

**Create:**
- `CausalCityPrototype/scripts/verify-offline-capsule.js`
- `CausalCityPrototype/tests/kernel/offline-capsule-cli.test.js`

- [ ] RED: valid file exits zero and emits canonical report.
- [ ] RED: tampered/noncanonical/missing files exit nonzero with stable JSON error.
- [ ] RED: CLI writes no files and contains no network imports/calls.
- [ ] GREEN: dependency-light one-file verification command.

## Task 7 — Source gates and literal conformance

**Create:**
- `CausalCityPrototype/tests/kernel/helpers/emit-offline-capsule-conformance.js`
- `CausalCityPrototype/tests/fixtures/offline-capsule-hashes-v1.json`
- `CausalCityPrototype/tests/acceptance/offline-capsule-conformance.test.js`

**Modify:**
- `CausalCityPrototype/scripts/acceptance-summary.js`
- source-gate tests if needed

- [ ] RED with explicit literal placeholders.
- [ ] Observe Node 22/24 actual values independently.
- [ ] Pin only byte-identical values.
- [ ] Preserve every inherited commitment.

## Task 8 — Internal adversarial review

- [ ] Attempt stale nested schema, registry, admission, mesh, capsule, and report IDs.
- [ ] Attempt artifact hash substitution with same metadata.
- [ ] Attempt out-of-policy and inactive-key evidence.
- [ ] Attempt valid capsule schema with invalid signature.
- [ ] Attempt noncanonical strings that parse to the same object.
- [ ] Attempt CLI argument and file-content ambiguity.
- [ ] Convert each discovered issue into a RED regression before correction.

## Task 9 — Evidence package and stacked draft PR

**Create:** `CausalCityPrototype/OFFLINE_CAPSULE_VERIFICATION_REPORT.md`

- [ ] Record exact heads, workflows/jobs, runtimes, counts, hashes, CLI behavior, RED/GREEN history, and limitations.
- [ ] Open a draft PR stacked on `codex/ripple-mesh-contracts-key-lifecycle-v1`.
- [ ] Keep unmerged, untagged, undeployed, and non-authoritative.
- [ ] Require independent version-pinned review.

## Explicit exclusions

No model-specific replay, bundled executable code, real identity, remote verifier transport, network discovery, production key custody, external ledger call, PQ signature, ZK proof, branch mutation, calibration, municipal authority, merge, tag, deployment, or browser cut-over is included.
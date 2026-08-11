# Ripple City Verification Mesh & Crypto-Agility Foundations v1 — Implementation Plan

> Implement every correctness behavior test-first. Preserve all lower-layer fixtures and authority boundaries.

**Goal:** Add deterministic signed attestations, declared-operator quorum aggregation, external-anchor envelopes, and future-ZK public statements without claiming external independence, public publication, post-quantum security, or proof generation.

## Task 1 — Crypto-policy profile

**Create:**
- `CausalCityPrototype/src/mesh/crypto-profile.js`
- `CausalCityPrototype/tests/kernel/crypto-profile.test.js`

- [ ] RED: exact profile shape, deterministic profile ID, immutability, unsupported/PQ claim rejection, hidden/accessor/symbol rejection.
- [ ] GREEN: classical SHA-256 + Ed25519 profile with explicit `postQuantumMode: not-implemented`.

## Task 2 — Signed verification attestation

**Create:**
- `CausalCityPrototype/src/mesh/attestation.js`
- `CausalCityPrototype/tests/kernel/attestation.test.js`
- `CausalCityPrototype/tests/fixtures/mesh-test-ed25519-key.js`

- [ ] RED: deterministic statement hash/signature, public-key fingerprint, verification, mutation rejection, wrong-profile rejection, stable failure codes.
- [ ] GREEN: canonical-v1 Ed25519 signing and independent verification.

## Task 3 — Verification mesh quorum

**Create:**
- `CausalCityPrototype/src/mesh/verification-mesh.js`
- `CausalCityPrototype/tests/kernel/verification-mesh.test.js`

- [ ] RED: canonical ordering, threshold calculation, distinct node/operator/key enforcement, failed attestation retention, wrong-artifact rejection, immutable aggregation.
- [ ] GREEN: declared-operator quorum with `independenceVerified: false` and no approval authority.

## Task 4 — External-anchor envelopes

**Create:**
- `CausalCityPrototype/src/mesh/anchor-envelope.js`
- `CausalCityPrototype/tests/kernel/anchor-envelope.test.js`

- [ ] RED: deterministic request/receipt IDs, exact request binding, tamper rejection, internal-vs-external verification distinction.
- [ ] GREEN: ledger-neutral request and receipt envelopes; no external API call.

## Task 5 — Future-ZK statement contract

**Create:**
- `CausalCityPrototype/src/mesh/proof-statement.js`
- `CausalCityPrototype/tests/kernel/proof-statement.test.js`

- [ ] RED: supported statement types, public-input commitment, private-witness commitment, no proof fields/claims, tamper rejection.
- [ ] GREEN: statement-only contract with `proofGenerated: false` and `proofVerified: false`.

## Task 6 — Source-gate coverage

**Create:**
- `CausalCityPrototype/tests/kernel/mesh-source-gates.test.js`

**Modify:**
- `CausalCityPrototype/scripts/check-syntax.js`
- `CausalCityPrototype/scripts/check-randomness.js`

- [ ] RED: prove both scanners initially omit `src/mesh/`.
- [ ] GREEN: enumerate every deterministic mesh module.

## Task 7 — Literal conformance

**Create:**
- `CausalCityPrototype/tests/kernel/helpers/emit-mesh-conformance.js`
- `CausalCityPrototype/tests/fixtures/mesh-hashes-v1.json`
- `CausalCityPrototype/tests/acceptance/mesh-conformance.test.js`

**Modify:**
- `CausalCityPrototype/scripts/acceptance-summary.js`

- [ ] RED with explicit placeholder commitments.
- [ ] Observe actual values independently on Node 22 and Node 24.
- [ ] Pin only byte-identical values.
- [ ] GREEN full matrix, retaining all lower-layer fixtures.

## Task 8 — Internal adversarial review

- [ ] Attempt validly re-hashed stale nested IDs.
- [ ] Attempt duplicate operator/node/key identities.
- [ ] Attempt signature substitution across artifacts and profiles.
- [ ] Attempt anchor receipt rebinding.
- [ ] Attempt proof-statement overclaiming.
- [ ] Add every discovered defect as a RED regression before correction.

## Task 9 — Evidence package and stacked draft PR

**Create:**
- `CausalCityPrototype/VERIFICATION_MESH_REPORT.md`

- [ ] Record exact heads, Node versions, workflow/job IDs, tests, static-gate counts, signatures, hashes, RED/GREEN history, and limitations.
- [ ] Open a draft PR stacked on `codex/ripple-frontier-foundations-v1`.
- [ ] Keep unmerged, untagged, undeployed, and non-authoritative.
- [ ] Require independent version-pinned review before any approval.

## Explicit exclusions

No production keys, remote verifier network, external anchor publication, PQ algorithm, ZK proof, blockchain call, formal proof, branch mutation, model calibration, authority, merge, tag, deployment, or browser cut-over is included.
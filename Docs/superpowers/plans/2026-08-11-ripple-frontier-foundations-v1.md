# Ripple City Frontier Foundations v1 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development. Implement every correctness behavior test-first.

**Goal:** Build deterministic commitment, hierarchical verification, rewind, surprise, robustness, and institutional-memory prototypes while preserving every Phase-0/1/2 boundary.

## Task 1 — Deterministic population commitments

**Create:**
- `CausalCityPrototype/src/frontier/population-commitment.js`
- `CausalCityPrototype/tests/kernel/population-commitment.test.js`

- [ ] RED: deterministic IDs, shard boundaries, population root, parameter sensitivity, immutability.
- [ ] GREEN: dependency-free implementation.
- [ ] Add acceptance fixture that commits 100,000 synthetic agents and compare fresh-process Node 22/24 roots.

## Task 2 — Temporal Crystal hierarchy and inclusion proofs

**Create:**
- `CausalCityPrototype/src/frontier/temporal-crystal.js`
- `CausalCityPrototype/tests/kernel/temporal-crystal.test.js`

- [ ] RED: deterministic hierarchy, range metadata, root, inclusion proof, tamper rejection.
- [ ] GREEN: integer-indexed canonical hierarchy and proof verification.

## Task 3 — Logical rewind artifacts

**Create:**
- `CausalCityPrototype/src/frontier/rewind.js`
- `CausalCityPrototype/tests/kernel/rewind.test.js`

- [ ] RED: verified source required, target prefix commitment, exact target Snapstate/PRNG restore, source bytes unchanged, tamper rejection.
- [ ] GREEN: checkpoint/replay implementation; no physical reversibility claim.

## Task 4 — Surprise Dividend

**Create:**
- `CausalCityPrototype/src/frontier/surprise-dividend.js`
- `CausalCityPrototype/tests/kernel/surprise-dividend.test.js`

- [ ] RED: deterministic ranking, explicit persistence weight, mandatory human review, no calibration/fork authority.
- [ ] GREEN: advisory divergence artifact.

## Task 5 — Robustness accounting

**Create:**
- `CausalCityPrototype/src/frontier/robustness.js`
- `CausalCityPrototype/tests/kernel/robustness.test.js`

- [ ] RED: min/max/spread, threshold survival fraction, shock regret, deterministic ordering, integer/rational evidence.
- [ ] GREEN: supplied-matrix-only robustness artifact.

## Task 6 — Institutional memory ledger

**Create:**
- `CausalCityPrototype/src/frontier/institutional-memory.js`
- `CausalCityPrototype/tests/kernel/institutional-memory.test.js`

- [ ] RED: immutable append, previous-record hash chain, record content address, chronological logical time, tamper verification.
- [ ] GREEN: explicit record ledger only; no inferred memory.

## Task 7 — Frontier conformance and gates

**Create:**
- `CausalCityPrototype/tests/kernel/helpers/emit-frontier-conformance.js`
- `CausalCityPrototype/tests/fixtures/frontier-hashes-v1.json`
- `CausalCityPrototype/tests/acceptance/frontier-conformance.test.js`

**Modify:**
- `CausalCityPrototype/scripts/check-syntax.js`
- `CausalCityPrototype/scripts/check-randomness.js`
- `CausalCityPrototype/scripts/acceptance-summary.js`

- [ ] RED with literal placeholders; observe matching Node 22/24 actuals.
- [ ] Pin only identical cross-runtime values.
- [ ] GREEN complete matrix.

## Task 8 — Evidence and stacked draft PR

**Create:** `CausalCityPrototype/FRONTIER_VERIFICATION_REPORT.md`

- [ ] Record exact test counts, workflow/job IDs, hashes, 100k-population evidence, and limitations.
- [ ] Keep draft PR stacked on Phase 2 and unmerged.
- [ ] No merge/tag/cutover or real-data/authority claim.

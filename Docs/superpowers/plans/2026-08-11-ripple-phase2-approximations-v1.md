# Ripple City Phase 2 Approximation Layer v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans or subagent-driven-development. Implement every behavior test-first.

**Goal:** Add deterministic, explicitly approximate sensitivity, branch ranking, subjective-memory, anomaly-review, and performance-observation tools without mutating authoritative graph evidence or introducing real-data/causal-validity claims.

## Task 1 — Sparse sensitivity topography

**Create:**
- `CausalCityPrototype/src/approximation/sensitivity-topography.js`
- `CausalCityPrototype/tests/kernel/sensitivity-topography.test.js`

- [ ] RED: graph verification, safe-integer lever/outcome contract, deterministic sample order, neighbor deltas, cliff thresholds, immutability.
- [ ] GREEN: minimal implementation carrying `semanticClass: 'approximate-sensitivity'`.

## Task 2 — Existing-branch multi-objective explorer

**Create:**
- `CausalCityPrototype/src/approximation/branch-ranking.js`
- `CausalCityPrototype/tests/kernel/branch-ranking.test.js`

- [ ] RED: maximize/minimize objectives, integer weights, exact normalized fractions, deterministic tie break, requested limit, graph byte preservation.
- [ ] GREEN: rank only branches already present in RunGraph; never call `forkBranch` or `forkRun`.

## Task 3 — Synthetic Subjective Time

**Create:**
- `CausalCityPrototype/src/approximation/subjective-memory.js`
- `CausalCityPrototype/tests/kernel/subjective-memory.test.js`

- [ ] RED: short/long windows, generation weighting, logical-time filtering, deterministic perceived value, reconstructable narrative tension, invalid-value rejection.
- [ ] GREEN: integer-only deterministic profile and tension functions.

## Task 4 — Human-gated anomaly workflow

**Create:**
- `CausalCityPrototype/src/approximation/anomaly-review.js`
- `CausalCityPrototype/tests/kernel/anomaly-review.test.js`

- [ ] RED: explicit threshold classes, deterministic queue order, immutable output, mandatory human review, auto-fork/calibration false.
- [ ] GREEN: advisory-only classification.

## Task 5 — Cross-runtime Phase-2 conformance

**Create:**
- `CausalCityPrototype/tests/kernel/helpers/emit-phase2-conformance.js`
- `CausalCityPrototype/tests/fixtures/phase2-hashes-v1.json`
- `CausalCityPrototype/tests/acceptance/phase2-conformance.test.js`

**Modify:**
- `CausalCityPrototype/scripts/acceptance-summary.js`
- `CausalCityPrototype/scripts/check-randomness.js`
- `CausalCityPrototype/scripts/check-syntax.js` if required.

- [ ] RED with placeholder literal fixture on Node 22/24 while printing actual identical values.
- [ ] Pin actual values only after both runtimes agree.
- [ ] GREEN full matrix.

## Task 6 — Performance observation

**Create:**
- `CausalCityPrototype/scripts/phase2-benchmark.js`

- [ ] Report runtime version, graph/point counts, canonical artifact byte sizes, and wall-clock duration.
- [ ] Explicitly exclude benchmark results from any integrity hash.
- [ ] Do not create hardware-independent performance claims.

## Task 7 — Evidence and stacked draft PR

**Create:**
- `CausalCityPrototype/PHASE2_VERIFICATION_REPORT.md`

**Modify:**
- `CausalCityPrototype/README.md`

- [ ] Record only observed RED/GREEN workflows, counts, hashes, and limitations.
- [ ] Open draft stacked PR into `codex/ripple-4d-projection-v1`.
- [ ] Do not merge, tag, cut over, enable real data, or auto-fork.

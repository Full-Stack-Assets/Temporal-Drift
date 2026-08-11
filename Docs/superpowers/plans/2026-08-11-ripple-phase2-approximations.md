# Ripple Phase-2 Approximations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build bounded deterministic approximation tools for sparse response topography, candidate exploration, explicit memory windows, human-gated branch proposals, and Trustscape chunk planning without granting execution authority.

**Architecture:** `src/approximations/` contains pure canonical modules that consume explicit safe-integer inputs and pinned deterministic evaluator adapters. Outputs are content-addressed approximations or review artifacts. No module imports browser UI code, mutates RunGraph, executes a branch, or ingests live data.

**Tech Stack:** ECMAScript modules, existing canonicalization and xoshiro128** utilities, Node 22/24 built-in test runner, JSON Schema 2020-12, SHA-256, safe-integer canonical artifacts, `BigInt` only for internal overflow-safe comparisons.

## Global Constraints

- Base all work on `codex/ripple-phase2-approximations` at Phase-1 head `a19fab9284d303d1302354bffc3c60c71e324979`.
- Use RED/GREEN test-first commits.
- Keep every approximation output safe-integer and canonical.
- Ban `Math.random`, wall-clock values, process IDs, network data, and filesystem order from canonical outputs.
- Never call `forkRun` or `forkBranch` from Phase-2 approximation modules.
- Every branch candidate remains `reviewRequired: true`, `executionAuthority: 'none'`.
- Preserve all Phase-0 and Phase-1 fixture hashes.
- Do not merge, tag, deploy, calibrate, auto-fork, or cut over.

---

### Task 1: Shared approximation validation

**Files:**
- Create: `CausalCityPrototype/src/approximations/common.js`
- Create: `CausalCityPrototype/tests/kernel/approximation-common.test.js`

**Interfaces:**
- Produces `assertPlainDataObject`, `assertSafeIntegerRecord`, `pinEvaluator`, `evaluateDeterministically`, `safeIntegerSum`, and `contentRecord`.

- [ ] Write failing tests for hidden fields, symbols, accessors, non-plain prototypes, floats, negative zero, missing metrics, evaluator identity mutation, evaluator exceptions, and nondeterministic evaluator output.
- [ ] Run `npm run test:kernel`; expect missing-module failure while prior suites remain green.
- [ ] Implement the minimum shared validation and evaluator pinning.
- [ ] Re-run `npm run test:kernel`; require all tests green.
- [ ] Commit RED and GREEN tranches separately.

### Task 2: Sparse topography

**Files:**
- Create: `CausalCityPrototype/src/approximations/topography.js`
- Create: `CausalCityPrototype/tests/kernel/topography.test.js`

**Interfaces:**
- Produces `sampleSparseTopography(config)`, `exportSparseTopography(artifact)`, and `verifySparseTopography(artifact)`.

- [ ] Write failing tests for baseline sampling, positive/negative axis samples, bounded pair samples, de-duplication, signed sensitivity fractions, cliff classification, pair interaction arithmetic, purity, and stable content IDs.
- [ ] Include negative tests for invalid bounds, zero step, undeclared metrics, evaluator nondeterminism, overflow, and validly re-hashed stale sample IDs.
- [ ] Implement canonical axis normalization and deterministic sample generation.
- [ ] Implement duplicate evaluator execution and exact output validation.
- [ ] Implement sensitivity and interaction records without floating-point division.
- [ ] Implement top-level and sub-record verification.
- [ ] Run kernel tests and commit GREEN.

### Task 3: Bounded branch-candidate exploration

**Files:**
- Create: `CausalCityPrototype/src/approximations/explorer.js`
- Create: `CausalCityPrototype/tests/kernel/explorer.test.js`

**Interfaces:**
- Produces `exploreBranchCandidates(config)`, `exportBranchExploration(artifact)`, and `verifyBranchExploration(artifact)`.

- [ ] Write failing tests for deterministic xoshiro mutation, candidate de-duplication, score ranking, safe-integer overflow, survivor selection, attempt ceilings, Pareto frontier, proposal generation, terminal PRNG state, and source-input purity.
- [ ] Assert no exported function can execute or mutate a RunGraph.
- [ ] Assert every proposal is `proposed-for-human-review`, `reviewRequired: true`, and `executionAuthority: 'none'`.
- [ ] Implement deterministic mutation and bounded generation loops.
- [ ] Implement objective scoring and nondominance checks.
- [ ] Implement content IDs and complete verification.
- [ ] Run kernel tests and commit GREEN.

### Task 4: Explicit multi-resolution memory

**Files:**
- Create: `CausalCityPrototype/src/approximations/memory.js`
- Create: `CausalCityPrototype/tests/kernel/memory-windows.test.js`

**Interfaces:**
- Produces `scoreNarrativeTension(record)`, `buildMemoryWindows(config)`, `exportMemoryWindows(artifact)`, and `verifyMemoryWindows(artifact)`.

- [ ] Write failing tests for signed tension, magnitude, direction, content IDs, explicit inheritance, personal/cultural/institutional kinds, short/medium/long windows, linear integer weights, rational aggregate fields, and `not-modeled` behavior for absent groups.
- [ ] Reject future records, duplicate records, invalid generation, invented inheritance, zero-length windows, duplicate window IDs, and overflow.
- [ ] Implement canonical scoring and window aggregation.
- [ ] Verify every group/window ID and arithmetic from source records.
- [ ] Run kernel tests and commit GREEN.

### Task 5: Human-gated proposal registry

**Files:**
- Create: `CausalCityPrototype/src/approximations/proposals.js`
- Create: `CausalCityPrototype/tests/kernel/proposals.test.js`

**Interfaces:**
- Produces `createProposalRegistry`, `submitBranchProposal`, `appendProposalReview`, `decideBranchProposal`, `getProposalStatus`, `exportProposalRegistry`, and `parseProposalRegistry`.

- [ ] Write failing tests for content-addressed proposals, immutable append, requester/reviewer separation, one review per reviewer, minimum approvals, rejection blocking, needs-evidence status, final decision rules, export/parse, and stale-ID tampering.
- [ ] Assert the module contains no graph-execution or branch-creation API.
- [ ] Implement append-only proposal, review, and decision events.
- [ ] Derive status from events without rewriting prior records.
- [ ] Run kernel tests and commit GREEN.

### Task 6: Work profiles and Trustscape chunks

**Files:**
- Create: `CausalCityPrototype/src/approximations/performance.js`
- Create: `CausalCityPrototype/tests/kernel/phase2-performance.test.js`

**Interfaces:**
- Produces `profileProjectionWork`, `planTrustscapeChunks`, `assessTrustscapeCapacity`, `createTimingObservation`, and corresponding export/verify helpers.

- [ ] Write failing tests for exact work counts, long-timeline chunk boundaries, branch isolation, first/terminal receipt commitments, deterministic chunk IDs, capacity budgets, and canonical/noncanonical separation.
- [ ] Build a deterministic long counter run with at least 500 transitions and verify chunk planning without changing the projection.
- [ ] Assert elapsed timing values never affect work-profile or chunk-plan hashes.
- [ ] Implement profiles, chunk plans, capacity assessments, and explicitly noncanonical timing records.
- [ ] Run kernel tests and commit GREEN.

### Task 7: Strict Phase-2 schemas

**Files:**
- Create: `CausalCityPrototype/schemas/sparse-topography-v1.schema.json`
- Create: `CausalCityPrototype/schemas/branch-exploration-v1.schema.json`
- Create: `CausalCityPrototype/schemas/memory-windows-v1.schema.json`
- Create: `CausalCityPrototype/schemas/branch-proposal-registry-v1.schema.json`
- Create: `CausalCityPrototype/schemas/trustscape-chunk-plan-v1.schema.json`
- Create: `CausalCityPrototype/tests/kernel/phase2-schemas.test.js`

**Interfaces:**
- Consumes authoritative Phase-2 artifacts.
- Produces strict JSON Schema 2020-12 structural validation.

- [ ] Add failing schema tests before schema files exist.
- [ ] Add strict schemas with closed nested records and exact ID patterns.
- [ ] Add negative fixtures for unknown fields, floats, malformed IDs, missing review gates, and canonical timing contamination.
- [ ] Run kernel tests and commit GREEN.

### Task 8: Cross-process Phase-2 conformance

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/phase2-fixture.js`
- Create: `CausalCityPrototype/tests/kernel/helpers/emit-phase2.js`
- Create: `CausalCityPrototype/tests/acceptance/phase2-conformance.test.js`
- Create: `CausalCityPrototype/tests/fixtures/phase2-hashes-v1.json`
- Modify: `CausalCityPrototype/scripts/acceptance-summary.js`

**Interfaces:**
- Produces exact Phase-2 IDs, hashes, byte hashes, counts, Pareto frontier, and terminal PRNG state.

- [ ] Commit a placeholder fixture and observe identical actual values on Node 22 and Node 24.
- [ ] Pin only independently matching values.
- [ ] Re-run the full matrix with all prior fixtures unchanged.
- [ ] Commit the conformance fixture.

### Task 9: Evidence package and stacked draft PR

**Files:**
- Create: `CausalCityPrototype/PHASE2_VERIFICATION_REPORT.md`
- Modify: `CausalCityPrototype/README.md`
- Create: `Docs/reviews/2026-08-11-phase2-design-review-gate.md`
- Create: `Docs/migrations/2026-08-11-python-worldline-reference-quarantine.md`

**Interfaces:**
- Consumes only observed workflow results and source-supported migration findings.

- [ ] Record exact implementation heads, workflow/job IDs, test counts, source scan counts, hashes, RED/GREEN history, and residual risks.
- [ ] Document the Python bundle quarantine: reference only, no trusted code import.
- [ ] Document the formal design-review gate for cut-over, real-data adapters, automatic calibration, and auto-forking.
- [ ] Open a stacked draft PR targeting `codex/ripple-4d-projection-phase1`.
- [ ] Request independent review of approximation labeling, evaluator determinism, proposal gating, PRNG use, memory arithmetic, chunk commitments, and preserved claim boundaries.
- [ ] Do not merge, tag, deploy, execute proposals, or cut over.

## Completion gate

Phase 2 is internally review-ready only after the complete Node 22/24 matrix passes on the evidence-packaged head with every Phase-0 and Phase-1 literal commitment preserved. Independent approval and all cut-over/real-data/auto-fork design reviews remain separate mandatory gates.

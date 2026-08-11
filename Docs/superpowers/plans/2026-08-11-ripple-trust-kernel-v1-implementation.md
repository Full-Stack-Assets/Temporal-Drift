# Ripple City Trust Kernel v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and independently verify the deterministic Trust Kernel, Bellwether shadow adapter, pure 4D projection layer, and Trustscape Lite while preserving the legacy browser simulation as the visible source of output until explicit cut-over approval.

**Architecture:** The existing Bellwether simulation remains untouched and authoritative for browser presentation. A dependency-free deterministic kernel is added under `CausalCityPrototype/src/kernel/`; the Bellwether adapter normalizes legacy model states into fixed-point canonical values and runs the kernel in shadow. After all kernel acceptance gates pass, a pure deterministic projector derives 4D visual coordinates and descriptors from verified kernel objects, and Trustscape Lite renders only those projections without becoming part of the authoritative state transition path.

**Tech Stack:** JavaScript ES modules, Node.js 22/24, Node built-in `node:test`, Node `crypto` SHA-256, browser WebGL2 with optional WebGPU capability detection, JSON Schema documents, GitHub Actions.

## Global Constraints

- Authoritative baseline: `7dbd6f7d6096284a70559a8005873570ba8fe3b1`.
- Working branch: `codex/ripple-trust-kernel-v1`.
- Node runtime support: majors 22 and 24 only; package range `>=22.0.0 <25.0.0`.
- No production dependency additions.
- `Math.random` is forbidden in `src/kernel` and `src/adapters`.
- Canonical hashed values exclude floats, BigInt, Date, Map, Set, typed arrays, functions, symbols, sparse arrays, non-plain prototypes, cycles, undefined, NaN, infinities, and negative zero.
- Legacy browser output remains authoritative until a separately approved cut-over.
- No real-city data, causal inference, auto-calibration, auto-forking, municipal authority, or production-readiness claims.
- Verification reports must cite only fresh observed test results and fixture hashes.

---

### Task 1: Kernel primitives — errors, immutability, canonicalization, SHA-256, PRNG

**Files:**
- Create: `CausalCityPrototype/src/kernel/errors.js`
- Create: `CausalCityPrototype/src/kernel/immutable.js`
- Create: `CausalCityPrototype/src/kernel/canonicalize.js`
- Create: `CausalCityPrototype/src/kernel/prng.js`
- Test: `CausalCityPrototype/tests/kernel/primitives.test.js`
- Test: `CausalCityPrototype/tests/kernel/prng.test.js`

**Interfaces:**
- Produces `TrustKernelError(code, message, context?)`, `deepCloneFreeze(value)`, `canonicalBytes(value)`, `hashCanonical(value)`, `createPrng(state)`, `seedToState(seed)`, `nextUint32()`, `nextInt(maxExclusive)`, `snapshot()`, and `clone()`.

- [ ] Write failing tests for accepted primitive values, NFC string normalization, UTF-8 key ordering, duplicate normalized keys, invalid values, immutability, deterministic hashes, xoshiro128** reference vectors, rejection-sampled `nextInt`, cloned generator isolation, and all-zero PRNG rejection.
- [ ] Run `node --test tests/kernel/primitives.test.js tests/kernel/prng.test.js` and confirm failures are caused by missing modules.
- [ ] Implement the four modules with no external dependencies.
- [ ] Re-run the focused tests until green, then run `npm test`.
- [ ] Commit the completed primitive tranche.

### Task 2: Manifest, snapstate, receipt ledger, run creation and advancement

**Files:**
- Create: `CausalCityPrototype/src/kernel/manifest.js`
- Create: `CausalCityPrototype/src/kernel/snapstate.js`
- Create: `CausalCityPrototype/src/kernel/ledger.js`
- Create: `CausalCityPrototype/src/kernel/index.js`
- Test: `CausalCityPrototype/tests/kernel/run.test.js`

**Interfaces:**
- Produces `createManifest(config)`, `createRun(manifest, adapter)`, `advanceRun(run, input)`, immutable `Snapstate` envelopes, genesis receipts, and transition receipts.

- [ ] Write failing tests for schema/version validation, duplicate step IDs, manifest-core hashing, immutable initial state, genesis receipt commitment, one-step advancement, previous-receipt linkage, input/state/event/PRNG hashes, and non-mutation of the previous run.
- [ ] Verify RED with the focused test.
- [ ] Implement minimal manifest/snapstate/ledger/run APIs.
- [ ] Verify GREEN and run all tests.
- [ ] Commit.

### Task 3: Branch isolation, replay, verification and tamper detection

**Files:**
- Create: `CausalCityPrototype/src/kernel/branch.js`
- Create: `CausalCityPrototype/src/kernel/replay.js`
- Create: `CausalCityPrototype/src/kernel/verify.js`
- Modify: `CausalCityPrototype/src/kernel/index.js`
- Test: `CausalCityPrototype/tests/kernel/branch-replay.test.js`
- Test: `CausalCityPrototype/tests/kernel/tamper.test.js`

**Interfaces:**
- Produces `forkRun(run, forkStepId, childBranchId)`, `exportRun(run)`, `replayRun(exportedRun, adapter)`, and `verifyRun(exportedRun, adapter)`.

- [ ] Write failing branch-isolation tests that mutate nested child data, advance parent/child in different orders, and compare serialized parent bytes before/after.
- [ ] Write failing replay tests for exact receipt-by-receipt reconstruction.
- [ ] Write failing tamper tests for manifest, seed, input, state, PRNG state, event batch, previous hash, removed/reordered/duplicated steps, and terminal receipt.
- [ ] Implement branch/replay/verify minimally and fail closed at first mismatch.
- [ ] Run focused and full suites; commit.

### Task 4: Append-only anomaly registry

**Files:**
- Create: `CausalCityPrototype/src/kernel/anomalies.js`
- Modify: `CausalCityPrototype/src/kernel/index.js`
- Test: `CausalCityPrototype/tests/kernel/anomalies.test.js`

**Interfaces:**
- Produces `recordAnomaly(registry, anomaly)` and `appendAnomalyReview(registry, review)`.

- [ ] Write failing tests for content-derived IDs, fixed-point delta, mandatory human-review flag, immutability, append-only semantics, valid review outcomes, and rejection of malformed anomalies.
- [ ] Verify RED.
- [ ] Implement minimal anomaly APIs.
- [ ] Verify GREEN and full regression; commit.

### Task 5: Bellwether normalization and shadow equivalence adapter

**Files:**
- Create: `CausalCityPrototype/src/adapters/bellwether-model.js`
- Test: `CausalCityPrototype/tests/kernel/shadow.test.js`

**Interfaces:**
- Produces `BELLWETHER_MODEL_ID`, `BELLWETHER_MODEL_VERSION`, `normalizeBellwetherSnapshot(snapshot)`, `createBellwetherManifest(branchId, seed)`, and the adapter `transition(previousState, input, prng)`.

- [ ] Write failing tests proving every branch/year legacy snapshot normalizes deterministically to fixed-point integers and the kernel path produces identical normalized per-step state/event hashes.
- [ ] Verify RED.
- [ ] Implement adapter by translating the existing Bellwether simulation contract without changing legacy exports or UI imports.
- [ ] Run all three branches across all 2026–2046 years plus 1,000 deterministic branch/seed cases.
- [ ] Commit.

### Task 6: Schemas and acceptance harness

**Files:**
- Create: `CausalCityPrototype/schemas/anomaly-record-v1.schema.json`
- Create: `CausalCityPrototype/schemas/run-manifest-v1.schema.json`
- Create: `CausalCityPrototype/schemas/verification-receipt-v1.schema.json`
- Create: `CausalCityPrototype/tests/kernel/cross-process.test.js`
- Create: `CausalCityPrototype/tests/kernel/acceptance.test.js`
- Create: `CausalCityPrototype/tests/kernel/randomness-ban.test.js`
- Create: `CausalCityPrototype/scripts/verify-kernel.mjs`
- Modify: `CausalCityPrototype/package.json`

- [ ] Write failing acceptance tests for canonical fixtures, fresh-process equality, 10,000 seed cases, 1,000 fork-isolation cases, replay/verify, tamper detection, 1,000 shadow cases, and source randomness scan.
- [ ] Verify RED where harness behavior is not yet implemented.
- [ ] Implement the harness/scripts and package commands without adding dependencies.
- [ ] Run `npm test`, `npm run check`, and `npm run verify:kernel` under Node 22.
- [ ] Commit.

### Task 7: Node 22/24 CI and evidence report

**Files:**
- Create: `.github/workflows/trust-kernel.yml`
- Create: `CausalCityPrototype/docs/TRUST-KERNEL-VERIFICATION.md`
- Create: `CausalCityPrototype/docs/TRUST-KERNEL-API.md`
- Create: `CausalCityPrototype/docs/TRUST-KERNEL-CONFORMANCE.md`

- [ ] Add a Node 22/24 matrix that runs the complete acceptance commands and uploads no sensitive artifacts.
- [ ] Generate the verification report from fresh Node 22 results, including exact fixture hashes only.
- [ ] Push and inspect GitHub Actions results for both runtime jobs.
- [ ] Update the report only after observed CI evidence exists; never pre-fill Node 24 success.
- [ ] Commit.

### Task 8: Draft PR, independent review and kernel baseline freeze

**Files:**
- Modify files only when review findings require changes.

- [ ] Open a draft PR from `codex/ripple-trust-kernel-v1` to `main` with no merge.
- [ ] Perform an independent diff review focused on canonicalization ambiguity, PRNG correctness, branch object identity, replay completeness, adapter equivalence, and test validity.
- [ ] Address each actionable finding using TDD and rerun full verification.
- [ ] Confirm every acceptance criterion is green on Node 22 and 24.
- [ ] Record signed-off review evidence in the PR and verification report.
- [ ] Create internal tag `kernel-v0.6-ALPHA` only after all gates are observed green.

### Task 9: Pure 4D projection layer

**Files:**
- Create: `CausalCityPrototype/src/projection/temporal.js`
- Create: `CausalCityPrototype/src/projection/causal.js`
- Create: `CausalCityPrototype/src/projection/branching.js`
- Create: `CausalCityPrototype/src/projection/subjective.js`
- Create: `CausalCityPrototype/src/projection/project4d.js`
- Test: `CausalCityPrototype/tests/projection/project4d.test.js`

**Interfaces:**
- `project4D(verifiedRunGraph) -> frozen deterministic projection`.
- Temporal coordinates derive from sequence/time fields; causal links derive only from verified event/provenance fields available in Bellwether; branch coordinates derive from ancestry and receipt hashes; subjective descriptors derive only from deterministic story/memory fields present in synthetic Bellwether data.

- [ ] Write failing purity/reproducibility tests: same verified input => byte-identical projection; mutation attempts fail; unrelated render state cannot alter projection; tampered/unverified runs are rejected.
- [ ] Verify RED.
- [ ] Implement deterministic hash-derived coordinates using integer/fixed-point math and canonical output.
- [ ] Verify GREEN and full regression; commit.

### Task 10: Trustscape Lite visual layer

**Files:**
- Create: `CausalCityPrototype/src/trustscape/renderer.js`
- Create: `CausalCityPrototype/src/trustscape/navigation.js`
- Create: `CausalCityPrototype/src/trustscape/annotations.js`
- Create: `CausalCityPrototype/src/trustscape/trustscape.js`
- Create: `CausalCityPrototype/trustscape.html`
- Test: `CausalCityPrototype/tests/trustscape/trustscape-data.test.js`

- [ ] Write failing data-level tests for deterministic visual coordinates, receipt-thread continuity, branch overlays, anomaly radar aggregation, deterministic time-window selection, and local-first annotation serialization that does not modify kernel/projection hashes.
- [ ] Verify RED.
- [ ] Implement a WebGL2 renderer with optional WebGPU capability detection; keep rendering entirely downstream of projection data.
- [ ] Add deterministic time navigation, branch comparison overlay, anomaly radar, and local-first browser annotations.
- [ ] Verify data-level tests and legacy browser regression; commit.

### Task 11: Combined verification, expert review, archive and Phase-1 freeze

**Files:**
- Create: `CausalCityPrototype/docs/4D-TRUSTSCAPE-VERIFICATION.md`
- Create: `CausalCityPrototype/docs/BASELINE-STATUS.md`

- [ ] Extend CI with projection and Trustscape data-consistency tests on Node 22/24.
- [ ] Produce a combined verification report from observed results only.
- [ ] Conduct an internal expert review of kernel + projection + visual boundaries and address findings with TDD.
- [ ] Confirm legacy browser output remains authoritative and cut-over remains unapproved.
- [ ] Record the frozen Phase-0/Phase-1 baseline, exact commit SHA, fixture hashes, CI run identifiers, and review sign-off.
- [ ] Archive available evidence in-repo and in the draft PR; do not merge.

### Task 12: Phase-2 approximation work (only after Task 11 gates close)

**Files:**
- Create under `CausalCityPrototype/src/phase2/` and corresponding `tests/phase2/` only after the frozen baseline exists.

- [ ] Add sparse causal-topography sampling using explicitly synthetic Bellwether levers and deterministic sampling grids.
- [ ] Add limited branch exploration under declared simple fitness functions; keep recommendations non-authoritative.
- [ ] Add configurable synthetic agent memory windows and narrative-tension scoring.
- [ ] Expand anomaly review workflows while requiring explicit human review events.
- [ ] Add performance instrumentation and larger branch-count stress fixtures.
- [ ] Produce a Phase-2 verification report and conformance fixtures.
- [ ] Hold formal design review before any real-data adapter, auto-fork, or authoritative cut-over work.
- [ ] Keep Causal Commons, multi-language conformance, ZK proofs, post-quantum signatures, AR/VR, and deeper formal verification as separately gated roadmap items.

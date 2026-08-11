# Ripple City Trust Kernel v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dependency-free deterministic Trust Kernel and Bellwether shadow adapter while leaving the legacy browser engine authoritative.

**Architecture:** A pure integer-only transition boundary advances recursively immutable snapstates using explicit xoshiro128** state. Canonical UTF-8 serialization feeds SHA-256 state and receipt hashes; manifests, replay, verification, branching, anomalies, and Bellwether normalization compose around that boundary without changing `simulateBranch`, `getSnapshot`, or `compareSnapshots`.

**Tech Stack:** ECMAScript modules, Node built-ins (`node:crypto`, `node:test`, `node:child_process`), JSON Schema 2020-12 documents, GitHub Actions Node 22/24 matrix.

## Global Constraints

- Work only in `CausalCityPrototype/` plus the targeted repository workflow and documentation files.
- Keep the legacy engine as the sole source of visible browser output.
- Declare `engines.node` as `>=22.0.0 <25.0.0`; accept only Node majors 22 and 24 at runtime.
- Use no runtime or test dependencies.
- Permit only canonical `null`, booleans, Unicode strings, dense arrays, plain objects, and safe integers.
- Prohibit `Math.random` in `src/kernel` and `src/adapters`.
- Use xoshiro128** with four non-zero-combination unsigned 32-bit state words.
- Fail closed with stable `TrustKernelError` codes.
- Do not merge, deploy, cut over browser output, ingest real municipal data, or expand Trustscape scope.

---

### Task 1: Canonical Values and Immutability

**Files:**
- Create: `CausalCityPrototype/src/kernel/errors.js`
- Create: `CausalCityPrototype/src/kernel/immutable.js`
- Create: `CausalCityPrototype/src/kernel/canonicalize.js`
- Create: `CausalCityPrototype/tests/kernel/canonicalize.test.js`
- Create: `CausalCityPrototype/tests/fixtures/canonical-v1.json`

**Interfaces:**
- Produces `TrustKernelError`, `assertKernel`, `deepClone`, `deepFreeze`, `cloneAndFreeze`, `canonicalBytes`, `canonicalString`, and `sha256Hex`.

- [ ] Write table-driven tests with literal canonical strings and SHA-256 hashes for reordered keys, NFC strings, escapes, safe-integer boundaries, dense arrays, and nested objects; add negative cases for floats, negative zero, invalid Unicode, sparse arrays, cycles, accessors, symbols, `BigInt`, typed arrays, non-plain objects, and normalization-colliding keys.
- [ ] Run `node --test tests/kernel/canonicalize.test.js`; confirm failure because the modules do not exist.
- [ ] Implement validation, NFC normalization, UTF-8 byte ordering, deterministic escaping, cloning, and recursive freezing; every rejected value must throw the specified stable code.
- [ ] Re-run the test and confirm every vector passes.

### Task 2: Explicit PRNG and Snapstates

**Files:**
- Create: `CausalCityPrototype/src/kernel/prng.js`
- Create: `CausalCityPrototype/src/kernel/snapstate.js`
- Create: `CausalCityPrototype/tests/kernel/prng.test.js`
- Create: `CausalCityPrototype/tests/kernel/snapstate.test.js`

**Interfaces:**
- Produces `createPrng(state)`, `seedToState(seed)`, `nextUint32()`, `nextInt(maxExclusive)`, `snapshot()`, `clone()`, `createSnapstate(fields)`, and `hashState(value)`.

- [ ] Add hand-derived xoshiro128** reference vectors, all-zero and malformed-state rejection, rejection-sampling range checks, clone independence, and 10,000-seed repeatability cases; run and observe missing-module failure.
- [ ] Implement unsigned 32-bit xoshiro128** rotation/multiplication, SHA-256 seed expansion, rejection-sampled integers, frozen copied snapshots, and independent clones; re-run until green.
- [ ] Add snapstate tests proving safe model-state validation, immutable cloned ownership, correct state hash, sequence metadata, and no exposed mutable references; run and observe failure.
- [ ] Implement `createSnapstate` with strict fields and canonical state hashing; re-run until green.

### Task 3: Manifests, Ledgers, and Receipts

**Files:**
- Create: `CausalCityPrototype/src/kernel/manifest.js`
- Create: `CausalCityPrototype/src/kernel/ledger.js`
- Create: `CausalCityPrototype/tests/kernel/manifest.test.js`
- Create: `CausalCityPrototype/tests/kernel/ledger.test.js`

**Interfaces:**
- Produces `createManifest(fields)`, `manifestCore(manifest)`, `createGenesisReceipt(manifest)`, `createTransitionReceipt(fields)`, `appendReceipt(ledger, receipt)`, and `verifyReceiptHash(receipt)`.

- [ ] Test strict v1 manifest fields, duplicate step IDs, unsupported versions, model metadata, ancestry, terminal expectations, and frozen copied ownership; verify RED, implement, and verify GREEN.
- [ ] Test literal genesis and transition hashes, chain linkage, immutable append semantics, and detection of deletion/reordering/payload alteration; verify RED, implement canonical receipt payload hashing, and verify GREEN.

### Task 4: Run, Replay, Verification, and Branch Isolation

**Files:**
- Create: `CausalCityPrototype/src/kernel/replay.js`
- Create: `CausalCityPrototype/src/kernel/verify.js`
- Create: `CausalCityPrototype/src/kernel/branch.js`
- Create: `CausalCityPrototype/tests/kernel/replay.test.js`
- Create: `CausalCityPrototype/tests/kernel/verify.test.js`
- Create: `CausalCityPrototype/tests/kernel/branch.test.js`

**Interfaces:**
- Produces `createRun(manifest, adapter)`, `advanceRun(run, input)`, `exportRun(run)`, `replayRun(exported, adapter)`, `verifyRun(exported, adapter)`, and `forkRun(run, forkStepId, childBranchId)`.

- [ ] Define a tiny integer-only fixture adapter; test create/advance/export/parse/replay equality and every per-step hash, then observe missing-module failure.
- [ ] Implement immutable run construction and advancement, adapter identity/version checks, event normalization, receipt production, JSON export, and deterministic replay; verify GREEN.
- [ ] Add independent tamper cases for manifest, state, PRNG, input, events, linkage, receipt, deletion, reordering, and duplication; assert the first mismatch code/location, observe RED, implement frozen verification reports, and verify GREEN.
- [ ] Add 1,000 fork cases proving verified-fork enforcement, ancestry, branch uniqueness, no shared mutable identity, parent-byte stability, and order-independent parent/child advancement; observe RED, implement independent fork containers/genesis, and verify GREEN.

### Task 5: Anomalies and Schemas

**Files:**
- Create: `CausalCityPrototype/src/kernel/anomalies.js`
- Create: `CausalCityPrototype/schemas/anomaly-record-v1.schema.json`
- Create: `CausalCityPrototype/schemas/run-manifest-v1.schema.json`
- Create: `CausalCityPrototype/schemas/verification-receipt-v1.schema.json`
- Create: `CausalCityPrototype/tests/kernel/anomalies.test.js`
- Create: `CausalCityPrototype/tests/kernel/schemas.test.js`

**Interfaces:**
- Produces `createAnomalyRegistry()`, `recordAnomaly(registry, anomaly)`, and `appendAnomalyReview(registry, review)`.

- [ ] Test content-derived anomaly IDs, signed deltas, immutable append-only records, required review flag, strict review outcomes, no record rewriting, and schema rejection; observe RED, implement, and verify GREEN.
- [ ] Test schemas as executable JSON contracts using a local strict subset validator for required fields, types, enums, patterns, bounds, and `additionalProperties: false`; observe RED, write the three schemas, and verify GREEN.

### Task 6: Bellwether Shadow Adapter

**Files:**
- Create: `CausalCityPrototype/src/adapters/bellwether-model.js`
- Create: `CausalCityPrototype/tests/kernel/bellwether-shadow.test.js`

**Interfaces:**
- Produces `BELLWETHER_SCALES`, `normalizeBellwetherState(snapshot)`, `normalizeBellwetherEvents(events, year)`, `createBellwetherManifest(branchId, seed)`, `bellwetherModelAdapter`, and `runBellwetherShadow(branchId, seed)`.

- [ ] Test fixed-point conversion and first-difference reporting with literal normalized snapshots; run and observe missing-module failure.
- [ ] Implement normalization with declared 1,000 scale for one-decimal metrics and exact integer population/year values; ensure adapter transition owns an incremental PRNG state and reproduces legacy snapshots/events without modifying legacy exports; re-run until green.
- [ ] Add all-branch/all-year equality plus 1,000 deterministic branch/seed cases comparing normalized state and event hashes at every step; confirm a deliberately changed scale or metric causes a first-step failure, then restore and verify GREEN.

### Task 7: Acceptance Commands and Node Matrix

**Files:**
- Modify: `CausalCityPrototype/package.json`
- Create: `CausalCityPrototype/scripts/check-runtime.js`
- Create: `CausalCityPrototype/scripts/check-randomness.js`
- Create: `CausalCityPrototype/scripts/acceptance.js`
- Create: `.github/workflows/ripple-trust-kernel-v1.yml`
- Create: `CausalCityPrototype/tests/kernel/cross-process.test.js`

**Interfaces:**
- Produces npm commands `test:legacy`, `test:kernel`, `test:acceptance`, `check:syntax`, `check:randomness`, `check:runtime`, and `verify`.

- [ ] Test fresh-process complete-chain equality and fixture hashes, observe RED, implement a child-process fixture runner, and verify GREEN.
- [ ] Add package runtime declaration/commands and runtime/randomness scripts; test supported/unsupported major behavior through injected version parsing and scan the actual source trees.
- [ ] Add the targeted Node 22/24 GitHub Actions matrix running `npm run verify`; no secrets or artifact uploads.
- [ ] Run the full local acceptance command on Node 24 and capture exit code, test counts, sweep counts, and terminal fixture hashes.

### Task 8: Evidence Report and Draft PR

**Files:**
- Create: `CausalCityPrototype/VERIFICATION_REPORT.md`
- Modify: `CausalCityPrototype/README.md`

**Interfaces:**
- The report records only observed commands, runtimes, pass/fail counts, fixture versions, exact fixture hashes, limitations, and deferred gates.

- [ ] Run `npm run verify` fresh and generate the report from that output; do not claim Node 22 CI before GitHub observes it.
- [ ] Document additive kernel APIs, shadow-only behavior, schemas, verification commands, and the unchanged browser authority in README.
- [ ] Inspect `git diff --check`, `git status`, the full diff from `7dbd6f7…`, and the requirement checklist; correct any discrepancy and rerun verification.
- [ ] Commit the implementation and evidence, push `codex/ripple-trust-kernel-v1`, and open a draft PR against `main` with no merge/deploy action.
- [ ] Record the draft PR and live check states; leave conceptual expansion and Trustscape work frozen pending independent technical review and Phase-0 closure.

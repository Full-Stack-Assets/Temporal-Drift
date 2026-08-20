# Ripple City Trust Kernel v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved design, specification awaiting review  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Branch:** `codex/ripple-trust-kernel-v1`  
**Implementation boundary:** `CausalCityPrototype/`

## 1. Verified Baseline

The repository's authoritative baseline is the merged fictional Bellwether browser prototype at main commit `7dbd6f7d6096284a70559a8005873570ba8fe3b1`.

The verified baseline contains:

- a dependency-free ES-module browser prototype;
- three authored branches: baseline, shutdown, and reinvention;
- deterministic yearly simulation from 2026 through 2046;
- causal explanations and deterministic citizen stories;
- 13 passing Node tests;
- a successful JavaScript syntax check.

The repository does not currently contain a verified New Bedford municipal edition, a Worldline production kernel, or a 92-test suite. Trust Kernel v1 establishes a new evidence-backed baseline without representing the fictional prototype as municipal decision software.

## 2. Purpose

Trust Kernel v1 supplies the smallest correctness layer needed to make deterministic-run claims testable. It creates immutable snapstates, explicit pseudo-random state, isolated branches, canonical hash-chain receipts, replay manifests, tamper detection, and append-only anomaly records.

The kernel is embedded in `CausalCityPrototype` so it can be validated against the working Bellwether model. Its contracts remain language-neutral so a later Python implementation can reproduce the same canonical bytes, PRNG sequence, manifests, and receipt hashes.

## 3. Goals

Trust Kernel v1 must:

1. produce identical receipt chains for identical versioned manifests;
2. preserve deterministic behavior across fresh processes and supported Node runtimes;
3. prevent a child branch from mutating its parent state, ledger, manifest, or PRNG state;
4. reconstruct every state transition from an exported manifest;
5. detect changes to manifests, inputs, events, states, PRNG state, and receipts;
6. preserve the existing public simulation APIs during shadow validation;
7. expose anomalies for human review without recalibrating or forking automatically;
8. fail closed with stable, machine-readable error codes;
9. retain dependency-free operation;
10. keep all real-world, municipal, predictive, and commercial claims out of scope.

## 4. Non-Goals

Version 1 will not:

- ingest New Bedford or other real-city data;
- perform automatic calibration or parameter fitting;
- infer causal relationships from observed correlations;
- auto-fork from anomalous observations;
- merge anomaly-born states into an authoritative branch;
- replace the legacy engine as the visible runtime;
- add probabilistic, genetic, agent-memory, or optimization engines;
- implement the Causal Radar, Tesseract, Causal Commons, or Foresight Reserve;
- authorize municipal actions, spending, publication, or policy selection;
- claim forecasting accuracy, causal proof, or production readiness.

## 5. Approved Strategic Decisions

### 5.1 Anomaly workflow

Version 1 uses append-only anomaly logging and human-review flags only. It does not create branches automatically. Auto-forking is deferred to a separately reviewed v1.1 proposal.

### 5.2 Adapter migration

The Bellwether adapter runs in shadow mode. The legacy engine remains the compatibility oracle and continues to produce visible prototype output. CI executes both paths against the same normalized inputs and fails on any per-step canonical hash mismatch.

### 5.3 Runtime support

The supported runtime majors are explicitly `22` and `24`, the supported LTS lines at the time this specification was written. Node 18 and 20 are excluded because they are end-of-life as of August 2026. Odd-numbered and Current releases are not production targets.

The package declares `engines.node: ">=22.0.0 <25.0.0"`, while an explicit runtime guard accepts only majors 22 and 24. CI tests both majors. The manifest records the runtime used for evidence, but runtime identity does not alter deterministic simulation hashes.

Changing the supported-major set requires a versioned compatibility change and a full cross-runtime acceptance run.

## 6. Architecture

The kernel uses a pure transition boundary:

`next = transition(previousSnapstate, input, prng)`

The transition receives immutable data and a private PRNG instance. It returns a proposed next state and zero or more domain events. Kernel code validates and normalizes those values, creates the new immutable snapstate, advances the receipt chain, and returns a new run object. It never mutates an earlier run.

Proposed structure:

    CausalCityPrototype/
    ├── schemas/
    │   ├── anomaly-record-v1.schema.json
    │   ├── run-manifest-v1.schema.json
    │   └── verification-receipt-v1.schema.json
    ├── src/
    │   ├── adapters/
    │   │   └── bellwether-model.js
    │   └── kernel/
    │       ├── anomalies.js
    │       ├── branch.js
    │       ├── canonicalize.js
    │       ├── errors.js
    │       ├── immutable.js
    │       ├── ledger.js
    │       ├── manifest.js
    │       ├── prng.js
    │       ├── replay.js
    │       ├── snapstate.js
    │       └── verify.js
    └── tests/
        └── kernel/

## 7. Canonical Data Model

Kernel-hashed values are restricted to:

- `null`;
- booleans;
- Unicode strings;
- arrays with meaningful order;
- objects with string keys;
- integers within JavaScript's safe-integer range.

The kernel rejects floating-point values, `NaN`, infinities, negative zero, `undefined`, functions, symbols, `BigInt`, dates, maps, sets, typed arrays, sparse arrays, non-plain prototypes, duplicate normalized keys, and cyclic references.

The Bellwether adapter converts domain decimals to fixed-point safe integers before values cross the kernel boundary. Each metric declares its scale. For example, a scale of 1,000 stores `72.125` as `72125`. Display conversion remains outside the kernel.

### 7.1 Canonical serialization

Canonical serialization is defined independently of ordinary JavaScript object insertion order:

1. strings and object keys must be valid Unicode and are normalized to NFC;
2. duplicate object keys created by normalization are rejected;
3. object keys are ordered lexicographically by their normalized UTF-8 byte sequences;
4. arrays retain their declared order;
5. integers use minimal base-10 notation without a leading plus sign or redundant zeros;
6. strings use deterministic RFC 8259 escaping;
7. output uses UTF-8 with no byte-order mark and no insignificant whitespace.

Canonicalization returns bytes. SHA-256 consumes those exact bytes. A future implementation in another language must reproduce the same byte vectors supplied in the conformance fixtures.

## 8. Explicit PRNG

The kernel owns all pseudo-random state. `Math.random` is prohibited in `src/kernel` and `src/adapters`.

The v1 generator uses xoshiro128** with four unsigned 32-bit state words. The manifest stores those words as decimal integers. The all-zero state is invalid.

The public generator exposes:

- `nextUint32()`;
- `nextInt(maxExclusive)`, implemented with rejection sampling;
- `snapshot()`, which returns a copied frozen state;
- `clone()`, which creates an independent generator.

The model adapter uses integer sampling. It must not depend on floating-point uniform sampling for authoritative transitions.

## 9. Manifests

A run manifest contains:

- format identifier and schema version;
- kernel version;
- model identifier and model version;
- initial snapstate;
- initial PRNG state;
- ordered input envelopes;
- branch ancestry when applicable;
- normalization and fixed-point scale identifiers;
- expected terminal receipt hash when verifying an exported run.

Inputs have stable step IDs and explicit types. Duplicate step IDs are invalid. Unknown fields are rejected in authoritative envelopes so a misspelled field cannot be silently ignored.

The manifest does not include timestamps, machine paths, process IDs, environment variables, or other nondeterministic values in the hashed simulation core.

## 10. Snapstates and Immutability

A snapstate envelope contains:

- run ID;
- branch ID;
- step ID and sequence number;
- model state;
- PRNG state after the transition;
- state hash;
- previous receipt hash.

Before storage, the kernel:

1. validates the proposed state;
2. canonicalizes it;
3. deep-clones it without preserving mutable references;
4. recursively freezes every container;
5. hashes the canonical state bytes.

Every public getter returns immutable values or independent copies. No public API exposes the internal mutable PRNG instance.

## 11. Ledger and Receipt Chain

The ledger is append-only. Every transition produces a receipt containing:

- schema and kernel versions;
- run, branch, step, and sequence identifiers;
- previous receipt hash;
- input hash;
- previous state hash;
- resulting state hash;
- resulting PRNG-state hash;
- event-batch hash;
- receipt hash.

The receipt hash is SHA-256 over a canonical receipt payload with the `receiptHash` field omitted. The payload contains the previous receipt hash, making ordering and deletion detectable.

The genesis receipt commits to the manifest core, initial state, initial PRNG state, model identity, and normalization contract.

## 12. Branch Isolation

`forkRun(parentRun, forkStepId, childBranchId)` creates a child from a verified parent receipt.

The child receives:

- a deep-cloned and recursively frozen snapstate;
- a cloned PRNG state;
- an independent ledger container;
- an ancestry record containing the parent run ID and fork receipt hash;
- a new branch ID and derived genesis receipt.

No mutable object identity is shared across parent and child containers. Advancing or discarding the child cannot change any parent value or receipt.

Branch IDs must be unique within a run graph. Forking from an unverified or missing receipt fails closed.

## 13. Replay and Verification

Replay accepts a manifest and a registered model adapter. It starts from the manifest's initial state and executes each ordered input.

At every step it recomputes:

- normalized input bytes and hash;
- prior state hash;
- resulting state hash;
- PRNG-state hash;
- event-batch hash;
- receipt hash.

Verification compares every recomputed receipt with the exported chain. A terminal-hash-only comparison is insufficient.

Verification returns a frozen report containing:

- overall result;
- verified step count;
- first mismatch location, if any;
- stable error code;
- expected and actual hashes;
- model and kernel versions.

Verification never repairs, truncates, skips, or accepts a mismatched run.

## 14. Anomaly Registry

An anomaly compares one expected kernel value with one externally observed value. Both must use a declared unit and fixed-point scale.

An anomaly record contains:

- content-derived anomaly ID;
- related run, branch, and step;
- metric path;
- expected and observed integers;
- unit and scale;
- signed delta;
- source reference and source-version identifier;
- severity supplied by the domain adapter;
- `requiresHumanReview: true`.

Records are immutable and append-only. Human review creates a separate review event with one of:

- `acknowledged`;
- `accepted_as_observation`;
- `rejected_as_invalid`;
- `resolved_by_later_version`.

Review events never rewrite the original anomaly. Version 1 does not convert an accepted observation into a model parameter, new baseline, or branch.

The existing prototype may display a read-only “Review required” marker when the current run has open anomalies. No decision or recalibration control is added.

## 15. Bellwether Shadow Adapter

The adapter translates existing legacy snapshots and transition inputs into the canonical fixed-point kernel contract.

During v1:

1. the legacy engine runs normally;
2. the adapter runs the kernel path with the same branch, seed, and year inputs;
3. both outputs pass through the same Bellwether normalization function;
4. normalized per-step hashes are compared;
5. any mismatch fails CI and reports the first differing path.

The shadow suite covers all three branches, all years, and 1,000 deterministic branch/seed cases. “Single hash” means a mismatch in any normalized per-step state, event batch, or terminal chain, not merely the final state.

The browser continues to render legacy output until a separate cutover decision is approved.

## 16. Public API Compatibility

The existing exports remain available:

- `simulateBranch(branchId, seed)`;
- `getSnapshot(result, year)`;
- `compareSnapshots(left, right)`.

New kernel APIs are additive:

- `createRun(manifest, modelAdapter)`;
- `advanceRun(run, input)`;
- `forkRun(run, forkStepId, childBranchId)`;
- `exportRun(run)`;
- `replayRun(exportedRun, modelAdapter)`;
- `verifyRun(exportedRun, modelAdapter)`;
- `recordAnomaly(registry, anomaly)`;
- `appendAnomalyReview(registry, review)`.

All returned run, receipt, report, and registry objects are immutable.

## 17. Error Model

Failures use `TrustKernelError` with stable codes, including:

- `E_SCHEMA_VERSION`;
- `E_UNSUPPORTED_RUNTIME`;
- `E_UNSAFE_VALUE`;
- `E_UNSAFE_INTEGER`;
- `E_DUPLICATE_KEY`;
- `E_DUPLICATE_STEP`;
- `E_INVALID_PRNG_STATE`;
- `E_MODEL_NOT_FOUND`;
- `E_MODEL_VERSION`;
- `E_STATE_HASH`;
- `E_RECEIPT_HASH`;
- `E_REPLAY_MISMATCH`;
- `E_UNVERIFIED_FORK`;
- `E_BRANCH_EXISTS`;
- `E_ANOMALY_SCHEMA`.

Error messages may provide context, but tests and integrations rely on codes. Errors must not include secrets, full external datasets, or unstable stack-dependent text in verification receipts.

## 18. Acceptance and Test Strategy

### 18.1 Legacy regression

All 13 existing tests and the JavaScript syntax check must pass unchanged.

### 18.2 Canonicalization conformance

Fixtures cover nested objects, Unicode normalization, escaped strings, key ordering, integer boundaries, invalid values, cycles, and duplicate normalized keys. Each fixture includes expected canonical UTF-8 bytes and SHA-256.

### 18.3 Cross-process determinism

A parent test launches fresh Node processes with identical manifests and compares complete receipt chains byte for byte.

### 18.4 Cross-runtime determinism

CI runs the same conformance vectors and run fixtures on Node 22 and Node 24. All receipt chains must match.

### 18.5 Seed sweep

At least 10,000 generated PRNG and run cases verify repeatability, valid ranges, state restoration, and deterministic output.

### 18.6 Isolation fuzzing

At least 1,000 deterministic fork cases attempt nested mutation, advance parents and children in different orders, and confirm that all parent bytes and hashes remain unchanged.

### 18.7 Replay

Run → export → parse → replay → verify must pass for every branch fixture. Tests also detect removed, reordered, duplicated, and modified steps.

### 18.8 Tamper detection

Tests independently change the manifest, initial state, seed, input, event, snapstate, PRNG state, previous hash, and terminal receipt. Every modification must fail at the first affected step.

### 18.9 Shadow equivalence

The legacy and adapter-normalized paths run for 1,000 cases spanning every branch and year. Any path or hash mismatch fails the build.

### 18.10 Randomness ban

A source scan fails if `Math.random` appears in `src/kernel` or `src/adapters`.

## 19. CI

A targeted workflow runs only when relevant prototype, kernel, schema, test, package, or workflow files change.

The matrix includes Node 22 and 24. Jobs run:

1. `npm test`;
2. `npm run check`;
3. canonical conformance;
4. cross-process fixtures;
5. 10,000-seed acceptance;
6. 1,000-fork isolation;
7. 1,000-case shadow equivalence;
8. randomness-ban scan.

The workflow uploads no sensitive artifacts and requires no secrets. A compact verification summary records runtime, kernel version, fixture version, test counts, and terminal fixture hashes.

## 20. Delivery and Rollback

Implementation occurs only on `codex/ripple-trust-kernel-v1` and is submitted as a draft pull request.

The legacy engine remains intact and authoritative for browser output. Therefore rollback consists of disabling or removing the shadow adapter and kernel imports; no stored municipal data or production state exists to migrate.

No merge or deployment is included without explicit approval.

## 21. Documentation and Evidence

The implementation will add:

- the approved implementation plan;
- schema documentation;
- public API documentation;
- a verification command guide;
- generated conformance-vector documentation;
- a verification report based on fresh test output.

After implementation evidence exists, the Google Drive “Worldline” document will receive a dated engineering-baseline appendix. It will state that the repository started with 13 verified tests, identify the new verified totals without exaggeration, and link the draft pull request and CI evidence. It will not rewrite or delete the original conceptual material.

## 22. Deferred v1.1 Topics

A separate design review is required for:

- anomaly-born branches;
- human approval and merge workflows;
- real observed-data adapters;
- calibration or parameter updates;
- cutover from shadow to authoritative kernel output;
- Python conformance implementation;
- Causal Radar signals or UI;
- agent memory, trust, or narrative-tension models.

## 23. Final Acceptance Criteria

Trust Kernel v1 is complete only when:

1. all legacy and new tests pass on Node 22 and 24;
2. 10,000 seed cases and 1,000 isolation cases pass;
3. all shadow-equivalence cases match at every normalized step;
4. exported runs replay and verify every receipt;
5. all tamper fixtures fail at their first affected receipt;
6. no kernel or adapter code calls `Math.random`;
7. the existing browser prototype remains functional;
8. the verification report distinguishes proven behavior from deferred claims;
9. the work remains in a draft pull request pending independent review;
10. the Drive status appendix cites only observed repository and CI evidence.

# Ripple City Phase 2 — Approximation Layer Verification Report

**Evidence date:** 2026-08-11  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Phase-1 base head:** `56c0f79fb6e7d773945a55be67ed6928a7ba8643`  
**Working branch:** `codex/ripple-phase2-approximations-v1`  
**Stacked draft pull request:** `#20`  
**Verified implementation + benchmark-smoke head:** `bce7295006d169971b381db3f6489152258b6dd6`  
**Approximation fixture:** `phase2-approximation-v1`

## Verdict

The Phase-2 synthetic approximation layer passed the complete repository `npm run verify` matrix on Node 22 and Node 24 at head `bce7295006d169971b381db3f6489152258b6dd6`.

Workflow `31526122742` completed successfully:

- Node 22 job `93894751789` — `success`
- Node 24 job `93894751860` — `success`

The implementation is deterministic synthetic R&D only. It does not establish causal identification, forecast calibration, policy authority, municipal validation, or production readiness. PR #20 remains draft and unmerged.

## Observed final test and static-gate counts

Node 22 reported:

| Gate | Observed result |
|---|---:|
| Legacy Bellwether regression | 13 passed |
| Kernel + RunGraph + Phase-1 + Phase-2 tests | 89 passed |
| Acceptance | 8 passed |
| **Total automated tests** | **110 passed** |
| Fail / skipped / cancelled | **0 / 0 / 0** |
| Syntax scan | 40 JavaScript files passed |
| Ambient-randomness scan | 27 deterministic source files passed |

Node 24 completed the same repository verification command successfully.

## Implemented Phase-2 capabilities

### Sparse sensitivity topography

`src/approximation/sensitivity-topography.js` analyzes explicitly supplied, already-declared synthetic branches at explicitly declared safe-integer outcome paths.

It produces deterministic sampled points, neighboring outcome deltas, threshold-based cliff flags, canonical immutable output, and `topographyHash`.

Every artifact carries:

```text
semanticClass = "approximate-sensitivity"
```

It does not infer an unobserved response surface or claim a real-world causal effect.

### Existing-branch ranking

`src/approximation/branch-ranking.js` ranks only branches already admitted to a verified RunGraph. It uses safe-integer inputs, exact BigInt/rational normalization, deterministic weighted aggregation, and lexicographic branch-ID tie breaking.

The output is a `synthetic-fitness-table` with `advisoryOnly: true`. The implementation does not call `forkRun()` or `forkBranch()` and cannot admit a new branch.

### Synthetic Subjective Time

`src/approximation/subjective-memory.js` provides explicit synthetic short/long memory windows, integer salience and generation weighting, exact rational perceived-value evidence, and reconstructable narrative tension.

These values are supplied synthetic modeling inputs. No resident, social-media, biometric, or psychological inference is performed.

### Human-gated anomaly review

`src/approximation/anomaly-review.js` assigns deterministic advisory classes from explicit thresholds:

- `informational`
- `watch`
- `warning`
- `critical`

Every result records:

```text
advisoryOnly = true
humanReviewRequired = true
autoForkAllowed = false
autoCalibrationAllowed = false
```

### Performance instrumentation

`scripts/phase2-benchmark.js` reports environment-specific runtime observations. `tests/kernel/phase2-benchmark.test.js` proves the benchmark executes on the supported verification matrix and remains explicitly non-authoritative.

The benchmark reports:

```text
evidenceClass = environment-specific-performance-observation
correctnessGate = false
```

Timing values do not participate in any integrity hash and are not used as acceptance thresholds or portable performance guarantees.

## Literal Phase-2 conformance fixture

Fixture: `tests/fixtures/phase2-hashes-v1.json`

Node 22 and Node 24 emitted the same values before they were pinned.

| Field | Exact observed value |
|---|---|
| Source graph ID | `graph-0710269a4b8d2f275c95cc70383d21228b455a1609401facf1550a33ceb4346b` |
| Source graph hash | `fc592673aa90214cd77c04c418f2506cb205eaf9f8f1187504210cbc74a6e275` |
| Topography hash | `a4c9f2aaed6d4df374e810178e6055668ebc4d2bbbc67254ec6e8cbab5d47c37` |
| Topography bytes SHA-256 | `d70728307e7df7b6e676e123eaa26880ee953b7d802262d51dcdb7f69cd63fda` |
| Topography points | `3` |
| Cliff vector | `[false, true]` |
| Ranking hash | `57cec0ea4f84d0b664d1207958e6e87a961d77f0f320dc14b76fbc99a57e467a` |
| Ranking bytes SHA-256 | `d3529a2b32b1b3efc907be0f0d7bd5972a4de2e8ed7ddfa4c59cdd3e84b291c9` |
| Perceived value | `34` |
| Exact perceived rational | `1640 / 47` |
| Narrative tension | `26` |
| Memory bundle bytes SHA-256 | `9acb24be800c3502fdeea8d4cb2c91ebeed8c9feea6a76b8a7e6ab6a61caa166` |
| Anomaly queue hash | `84fb4dac81edfde40c7b011b830807951f52116656e496ee27ba1958dd42f14e` |
| Anomaly queue bytes SHA-256 | `937d6d8defe877b8faa57bf2092aa1d2b42c94c487dc47cd0c88bd11f0ae3e8b` |
| Sample classification hash | `a99fa1a7bb6f03a16d847c437dac90d5fc9fa7852ce3b33d5261149e0ff92070` |

Rank order:

1. `branch-d9032afcc11966c8d8bc284d5fed5f07bf185338bdf6f856c076e257bcc14690`
2. `branch-f147d7185e911dcf25a361bc81801f8f037b98be465f280cb8365b8122191d0e`
3. `branch-29eaaa3e1d4a963d49848bfeb8758e305630409965627402e37f30203352a672`

Exact score fractions: `3/1`, `12/19`, `0/1`.

Anomaly queue order: `critical → warning → watch → informational`.

The fixture explicitly verifies `humanReviewRequired: true`, `autoForkAllowed: false`, and `autoCalibrationAllowed: false`.

## TDD evidence

| Workflow | Purpose | Observed result |
|---|---|---|
| `31524729124` | Initial approximation contracts | RED: modules absent; inherited tests green |
| `31525075558` | First implementation | Exposed sensitivity validation-order defect |
| `31525281867` | Corrected approximation implementation | GREEN Node 22 / 24 |
| `31525462273` | Literal conformance placeholders | Deliberate RED; both runtimes emitted matching actual values |
| `31525745816` | Pinned conformance | GREEN Node 22 / 24; 109 tests/runtime |
| `31526122742` | Benchmark smoke gate | GREEN Node 22 / 24; 110 tests/runtime |

## Preserved inherited gates

The final Phase-2 matrix still runs:

- the unchanged 13-test legacy suite;
- canonical-v1 byte/hash fixtures;
- xoshiro128** vectors;
- 10,000 deterministic seed cases;
- 1,000 low-level fork-isolation cases;
- fresh-process receipt-chain equality;
- RunGraph identity/export conformance;
- replay, verify, and tamper detection;
- recursive schemas;
- 1,000 Bellwether branch/seed shadow cases;
- 4D projection conformance;
- pinned Trustscape browser-fixture equality;
- browser fixture and annotation integrity;
- deterministic Phase-2 conformance;
- ambient randomness ban.

## Claim boundaries and residual risks

Phase 2 does **not** implement or prove real-world causal identification, real-world forecasting, calibration authority, automatic branch creation, evolutionary search, municipal data ingestion, resident-memory inference, autonomous anomaly action, policy execution, formal proofs, external signatures, ZK proofs, public-ledger anchoring, large-population scaling, or hardware-independent performance guarantees.

Important residual risks:

1. Phase 0 still lacks the required independent technical review.
2. Phase 1 and Phase 2 have internal TDD/CI evidence but no independent external review.
3. Deterministic approximations can still be scientifically poor when supplied assumptions, levers, thresholds, objective weights, or memory profiles are poor.
4. The cliff detector is a threshold over neighboring supplied samples, not proof of a true discontinuity.
5. Synthetic memory and narrative tension are modeling primitives, not validated psychology.
6. Branch ranking removes arithmetic nondeterminism but does not make objective weights legitimate.
7. Auto-forking and auto-calibration remain intentionally disabled.

## Status

```text
Phase-2 deterministic implementation: GREEN
Node 22:                         GREEN
Node 24:                         GREEN
Tests per runtime:               110
Draft PR #20:                    OPEN / DRAFT / UNMERGED
Auto-forking:                    DISABLED
Auto-calibration:                DISABLED
Human anomaly review:            REQUIRED
Real-data integration:           NOT INCLUDED
Authoritative cut-over:          NOT APPROVED
```

Phase 2 may serve as an isolated synthetic R&D baseline for subsequent frontier prototypes. These results must not be represented as independent approval, scientific validation, municipal authority, or production readiness.

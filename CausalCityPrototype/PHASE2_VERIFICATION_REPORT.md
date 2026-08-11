# Ripple City Phase 2 — Approximation Layer Verification Report

**Evidence date:** 2026-08-11  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Phase-1 base head:** `56c0f79fb6e7d773945a55be67ed6928a7ba8643`  
**Working branch:** `codex/ripple-phase2-approximations-v1`  
**Stacked draft pull request:** `#20`  
**Verified implementation / conformance head:** `ff0a68bbeb8d28494821d2bde49063af238fb966`  
**Approximation fixture version:** `phase2-approximation-v1`

## Verdict

The Phase-2 approximation implementation passed the complete repository `npm run verify` command on both Node 22 and Node 24 in GitHub Actions workflow `31525745816`.

Observed jobs:

- Node 22 verification: job `93893504121` — `success`
- Node 24 verification: job `93893504158` — `success`

The implementation is deliberately bounded to deterministic **synthetic approximation**. It does not establish causal identification, forecasting accuracy, historical calibration, municipal authority, policy optimization authority, or production readiness.

The Phase-2 branch remains stacked, draft, and unmerged. Phase 0 remains independently review-gated, and Phase 1 remains non-authoritative.

## Observed verification counts

The Node 22 job reported:

| Suite / gate | Observed result |
|---|---:|
| Legacy Bellwether regression | 13 passed |
| Kernel + RunGraph + Phase-1 + Phase-2 deterministic modules | 88 passed |
| Acceptance | 8 passed |
| **Total automated tests** | **109 passed** |
| Failed | 0 |
| Skipped | 0 |
| Cancelled | 0 |
| Syntax scan | 40 JavaScript files passed |
| Ambient-randomness scan | 27 deterministic source files passed |

The Node 24 verification job also completed with conclusion `success` under the same matrix and fixture set.

## Phase-2 implemented capabilities

### 1. Sparse sensitivity topography

`src/approximation/sensitivity-topography.js` consumes an already verified hydrated RunGraph plus explicitly declared sample lever vectors and terminal outcome paths.

It produces:

- deterministic sample ordering;
- terminal safe-integer outcome values;
- neighbor outcome deltas;
- explicit cliff flags when a declared threshold is crossed;
- immutable canonical output;
- `topographyHash`.

Every artifact carries:

```text
semanticClass = "approximate-sensitivity"
```

The module does not infer an unobserved response surface, estimate intervention effects from real data, or claim that a sampled relationship is causally identified.

### 2. Existing-branch multi-objective ranking

`src/approximation/branch-ranking.js` ranks only branch IDs already admitted to the supplied verified RunGraph.

Verified behaviors include:

- maximize and minimize objectives;
- safe-integer objective values and weights;
- exact BigInt/rational normalization rather than floating-point scoring;
- deterministic lexicographic branch-ID tie-breaking;
- immutable output;
- graph-byte preservation;
- no call path that creates or admits a new graph branch.

The output is labeled `synthetic-fitness-table` and `advisoryOnly: true`. It is not a policy recommendation.

### 3. Synthetic Subjective Time

`src/approximation/subjective-memory.js` provides deterministic synthetic memory profiles with:

- short and long memory windows;
- explicit logical time;
- explicit integer salience;
- explicit generation number;
- deterministic weighted perceived value;
- exact rational numerator / denominator evidence;
- reconstructable narrative-tension score.

These records are synthetic inputs. They are not inferred from residents, social-media data, biometrics, or observed psychology.

### 4. Human-gated anomaly review

`src/approximation/anomaly-review.js` deterministically classifies already recorded anomaly evidence using explicit integer thresholds.

Supported advisory classes:

- `informational`
- `watch`
- `warning`
- `critical`

Every classification and review queue records:

```text
advisoryOnly = true
humanReviewRequired = true
autoForkAllowed = false
autoCalibrationAllowed = false
```

The module cannot recalibrate a model, mutate a run, alter a receipt, create a RunGraph branch, or authorize an action.

### 5. Performance observation

`scripts/phase2-benchmark.js` was added as a non-authoritative measurement utility. It reports runtime/platform context, branch and projection sizes, canonical artifact byte sizes, and observed wall-clock measurements.

Its output explicitly states:

- `evidenceClass: environment-specific-performance-observation`
- `correctnessGate: false`

Timing values are not included in any kernel, RunGraph, projection, scene, topography, ranking, memory, or anomaly integrity hash. No portable performance guarantee is claimed.

## Phase-2 literal cross-runtime fixture

Fixture: `tests/fixtures/phase2-hashes-v1.json`

The placeholder-fixture workflow `31525462273` deliberately failed on Node 22 and Node 24 while both runtimes emitted the same actual Phase-2 artifact values. Those values were then pinned and passed in workflow `31525745816`.

| Field | Exact observed value |
|---|---|
| Source graph ID | `graph-0710269a4b8d2f275c95cc70383d21228b455a1609401facf1550a33ceb4346b` |
| Source graph hash | `fc592673aa90214cd77c04c418f2506cb205eaf9f8f1187504210cbc74a6e275` |
| Topography hash | `a4c9f2aaed6d4df374e810178e6055668ebc4d2bbbc67254ec6e8cbab5d47c37` |
| Topography bytes SHA-256 | `d70728307e7df7b6e676e123eaa26880ee953b7d802262d51dcdb7f69cd63fda` |
| Topography point count | `3` |
| Cliff vector | `[false, true]` |
| Ranking hash | `57cec0ea4f84d0b664d1207958e6e87a961d77f0f320dc14b76fbc99a57e467a` |
| Ranking bytes SHA-256 | `d3529a2b32b1b3efc907be0f0d7bd5972a4de2e8ed7ddfa4c59cdd3e84b291c9` |
| Perceived value | `34` |
| Exact perceived rational | `1640 / 47` |
| Narrative tension | `26` |
| Memory bundle bytes SHA-256 | `9acb24be800c3502fdeea8d4cb2c91ebeed8c9feea6a76b8a7e6ab6a61caa166` |
| Anomaly queue hash | `84fb4dac81edfde40c7b011b830807951f52116656e496ee27ba1958dd42f14e` |
| Anomaly queue bytes SHA-256 | `937d6d8defe877b8faa57bf2092aa1d2b42c94c487dc47cd0c88bd11f0ae3e8b` |
| Sample anomaly classification hash | `a99fa1a7bb6f03a16d847c437dac90d5fc9fa7852ce3b33d5261149e0ff92070` |

Exact ranked branch order:

1. `branch-d9032afcc11966c8d8bc284d5fed5f07bf185338bdf6f856c076e257bcc14690`
2. `branch-f147d7185e911dcf25a361bc81801f8f037b98be465f280cb8365b8122191d0e`
3. `branch-29eaaa3e1d4a963d49848bfeb8758e305630409965627402e37f30203352a672`

Exact normalized score fractions:

1. `3 / 1`
2. `12 / 19`
3. `0 / 1`

Exact anomaly review order:

1. `critical`
2. `warning`
3. `watch`
4. `informational`

The fixture also verifies:

- `humanReviewRequired: true`
- `autoForkAllowed: false`
- `autoCalibrationAllowed: false`

## TDD / RED-GREEN evidence

The Phase-2 implementation used deliberate failing gates before production behavior or literal fixtures were accepted.

| Workflow | Purpose | Observed result |
|---|---|---|
| `31524729124` | Initial four approximation contracts | RED because Phase-2 modules did not exist; inherited Phase-0/1 tests stayed green |
| `31525075558` | First implementation attempt | Exposed sensitivity validation-order defect |
| `31525281867` | Corrected approximation implementation | GREEN on Node 22 / 24 before literal conformance fixture |
| `31525462273` | Literal cross-runtime conformance | Deliberate RED against placeholder hashes; Node 22 / 24 emitted matching actual values |
| `31525745816` | Pinned conformance + benchmark package | GREEN on Node 22 / 24; 109 tests/runtime |

The sensitivity defect was fixed by permitting a one-point sparse surface and resolving the supplied branch before neighbor-specific logic. This preserves precise unknown-branch error behavior and keeps sparse sampling valid.

## Preserved lower-layer gates

The complete Phase-2 matrix still runs all inherited correctness checks, including:

- 13 unchanged legacy Bellwether tests;
- canonical-v1 exact byte/hash fixtures;
- xoshiro128** vectors;
- 10,000-seed deterministic sweep;
- 1,000 low-level fork-isolation cases;
- receipt-chain fresh-process equality;
- RunGraph fresh-process identity/export equality;
- replay, verify, and tamper detection;
- recursive schemas;
- 1,000 Bellwether branch/seed shadow cases;
- Phase-1 4D projection conformance;
- pinned Trustscape browser fixture equality;
- browser fixture and annotation integrity;
- ambient randomness ban.

The Node 22 acceptance suite reported 8 / 8 passing acceptance tests.

## Claim boundaries

Phase 2 does **not** implement or prove:

- real-world causal identification;
- real-world prediction or forecast calibration;
- automatic or authoritative branch generation;
- genetic / evolutionary branch mutation;
- real municipal data ingestion;
- historical back-calibration authority;
- learned causal graphs;
- resident-memory inference;
- social-media sentiment inference;
- autonomous anomaly action;
- policy recommendation authority;
- policy execution;
- production cut-over;
- formal verification;
- external signatures, ZK proofs, blockchain anchoring, or decentralized attestations;
- large-population scaling guarantees;
- hardware-independent performance guarantees.

The current Phase-2 topography is an exact visualization / analysis of **supplied synthetic samples**, not a fitted causal surface.

The current branch ranking is an exact deterministic fitness table over **already-declared branches**, not an autonomous search engine.

## Residual risks

1. Phase 0 still lacks the required independent version-pinned technical review.
2. Phase 1 and Phase 2 have internal TDD / CI evidence but no independent external review.
3. Approximation outputs can be mathematically deterministic while remaining scientifically meaningless if supplied lever definitions, outcome paths, thresholds, or synthetic memory assumptions are poor.
4. Exact ranking arithmetic removes numerical nondeterminism but does not make objective weights legitimate or policy-optimal.
5. Cliff detection is threshold-based local comparison over supplied points; it does not establish a real discontinuity in an unknown response function.
6. Synthetic memory windows and narrative tension are modeling primitives, not validated measures of trauma, trust, perception, or psychology.
7. Review-class thresholds are explicit configuration, not learned severity truth.
8. No graph branch is created automatically; genuine autonomous branch exploration remains behind a separate formal design review.
9. Performance instrumentation has not been promoted into a hardware/runtime benchmark standard and must not be used as a correctness or SLA claim.

## Phase-2 status

**Technical implementation / conformance:** GREEN at `ff0a68bbeb8d28494821d2bde49063af238fb966`  
**Node 22 verification:** GREEN  
**Node 24 verification:** GREEN  
**Stacked draft PR #20:** OPEN / DRAFT / UNMERGED  
**Auto-forking:** DISABLED  
**Auto-calibration:** DISABLED  
**Human review for anomalies:** REQUIRED  
**Real-data integration:** NOT INCLUDED  
**Authoritative cut-over:** NOT APPROVED

Phase 2 can serve as an isolated synthetic R&D baseline for subsequent frontier prototypes. Later phases must not reinterpret these results as scientific validation, independent approval, municipal authority, or production readiness.

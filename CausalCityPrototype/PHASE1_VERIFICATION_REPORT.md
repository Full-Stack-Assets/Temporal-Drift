# Ripple 4D Projection and Trustscape Lite — Phase-1 Verification Report

**Evidence date:** 2026-08-11  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Phase-0 parent head:** `1f7421e7f86ceed7bd550628c34a25475c42df1b`  
**Phase-1 branch:** `codex/ripple-4d-projection-phase1`  
**Verified implementation head:** `dd58e9f1fa3c1fcc62fb4bda80575a37848be323`  
**Stacked draft pull request:** `#19`  
**Projection schema version:** `1.0.0`  
**Projection algorithm version:** `4d-projector-v1`  
**Trustscape scene version:** `trustscape-lite-v1`

## Verdict

The Phase-1 implementation head passed the complete repository verification command on Node `v22.23.1` and Node `v24.18.0`.

GitHub Actions workflow `31525664178` completed successfully:

- Node 22 job `93893236111`: success;
- Node 24 job `93893236154`: success.

Each runtime independently passed:

- the unchanged Bellwether legacy suite;
- the Trust Kernel and RunGraph suite;
- the 4D projector, schema, browser-verifier, Trustscape, annotation, and adversarial-integrity suites;
- fresh-process receipt, RunGraph, projection, scene, and browser-render conformance;
- the 10,000-seed sweep;
- 1,000 low-level fork-isolation cases;
- 1,000 Bellwether shadow-equivalence cases;
- recursive syntax validation;
- the expanded ambient-randomness ban.

Phase 1 is therefore **internally implementation-complete and review-ready** at the recorded head. It is not independently approved, merged, tagged, deployed, or authorized for browser cut-over. Phase 0 remains review-frozen pending independent technical review of its root of trust, and the combined Phase-1 system also requires independent review.

## Scope delivered

### Pure 4D Projection Layer

`src/projector/` maps a hydrated, verified RunGraph into a canonical projection containing four bounded dimensions:

1. **Temporal** — every Snapstate is bound to its exact receipt, state hash, PRNG-state hash, branch, step, and sequence.
2. **Causal provenance** — explicit `precedes`, `emits`, and `forks` edges represent receipt and event provenance. They are not scientific causal-effect claims.
3. **Branching** — graph topology, parent receipts, deterministic branch depth, canonical ordinal, terminal receipt, and manifest commitments.
4. **Subjective evidence** — only explicitly supplied objective/perceived records are projected. Missing evidence is marked `not-modeled`; it is never interpreted as consensus, trust, trauma, or zero tension.

Canonical coordinates use safe integers only:

```text
t = temporal sequence
c = provenance depth
a.k.a. b = deterministic branch topology coordinate
s = signed explicit subjective tension
```

The canonical artifact uses `{t, c, b, s}` and a fixed coordinate scale of `1000`.

### Projection verification

The public hardened verifier checks:

- strict format and versioning;
- projection and source commitments;
- canonical safe-integer coordinates;
- exact temporal-point content IDs;
- exact receipt/event/branch node IDs;
- exact causal and branch edge IDs;
- referential integrity;
- branch membership and root coverage;
- subjective-record content IDs and tension arithmetic;
- subjective branch-status reconciliation;
- optional complete reprojection from a supplied RunGraph;
- top-level projection-hash recomputation.

Verification does not repair, reorder, truncate, relabel, or accept inconsistent evidence.

### Trustscape deterministic scene

`src/trustscape/` maps verified projections into immutable, content-addressed scene artifacts containing:

- Snapstate, receipt, event, branch, and subjective-evidence objects;
- receipt and topology threads;
- deterministic time and branch filtering;
- two-branch state-hash comparison overlays;
- an explicit subjective-tension radar;
- content-addressed scene objects, threads, comparisons, and radar entries;
- a canonical `sceneHash`.

### Browser trust boundary

The isolated `trustscape.html` route:

- loads a projection JSON file locally;
- verifies its projection commitment through Web Crypto SHA-256 before rendering;
- reproduces the kernel canonicalization contract for supported projection values;
- generates a deterministic browser render model;
- requires WebGL2 and fails visibly when unavailable;
- imports no Node kernel or projector module;
- uses no ambient randomness;
- remains unlinked from `index.html` and unimported by `src/app.js`.

The browser entry is routed through the hardened browser integrity verifier. Node tests demonstrate byte-for-byte interoperability between Node and browser canonicalization, projection commitments, annotation documents, and deterministic render-model commitments.

### Local-first annotations

Annotations are append-only, content-addressed operations with actor-scoped logical clocks. The implementation supports:

- local document creation;
- monotonic append;
- append-only supersession;
- canonical export and parse;
- deterministic set-union merge;
- conflict rejection for reused actor clocks or inconsistent content IDs;
- localStorage persistence keyed by the projection hash;
- manual JSON import/export.

Annotations never alter RunGraph, simulation, projection, or scene truth.

## Observed verification matrix

| Evidence | Observed result |
|---|---|
| Workflow `31525664178` | Completed with conclusion `success` |
| Node 22 job `93893236111` | Node `v22.23.1`; complete `npm run verify` passed |
| Node 24 job `93893236154` | Node `v24.18.0`; complete `npm run verify` passed |
| Syntax scan | 39 JavaScript source/script modules passed |
| Randomness scan | 26 deterministic kernel/adapter/projector/Trustscape modules; no prohibited `Math.random` call |

## Observed automated test counts

Each runtime independently reported:

| Suite | Passed | Failed | Skipped | Cancelled |
|---|---:|---:|---:|---:|
| Legacy Bellwether regression | 13 | 0 | 0 | 0 |
| Trust Kernel, RunGraph, projector, Trustscape, annotations, browser boundary, and integrity review | 87 | 0 | 0 | 0 |
| Acceptance | 6 | 0 | 0 | 0 |
| **Total** | **106** | **0** | **0** | **0** |

## Phase-1 conformance fixture

Fixture version: `4d-projection-v1`

| Field | Exact value |
|---|---|
| Projection ID | `projection-b28bd8b725d2fbb308cf4fa4e03a7f4d56e18a52c185d6f3776df48f6d7aa2b6` |
| Projection hash | `1d603ceca56b85d9a7717bbb284250e34340fef6223ee209a5de66848a8eabb6` |
| Canonical projection-export SHA-256 | `419ce197bd234c65eb8c0ebff43af548bb398024fcc07a5ab65bc0e88cac3fcd` |
| Canonical projection size | `27819` bytes |
| Hardened scene hash | `f96cad51c3a6c5b58e78812d9d5c5ad49793e042bf1fb0da2b94959dd2f7b984` |
| Hardened scene-export SHA-256 | `72b2de0db3298be02a15c7f126653b2ed76b1795784427246500129a97159167` |
| Canonical scene size | `23639` bytes |
| Hardened browser render-model hash | `a2bce2016547482afa3718af0179964fd0238c738a88fa36d61399a1f4a0127c` |
| Temporal points | `12` |
| Causal-provenance nodes | `20` |
| Causal-provenance edges | `19` |
| Branch nodes | `4` |
| Branch edges | `3` |
| Explicit subjective records | `1` |
| Scene objects | `37` |
| Scene threads | `22` |
| Scene comparisons in default view | `0` |
| Scene radar entries | `1` |

Four fresh processes emitted identical values. Node 22 and Node 24 independently emitted the same projection, scene, and browser-render commitments.

## Phase-0 fixture preservation

The complete Phase-0 acceptance suite continued to pass. The following previously pinned commitments remained unchanged:

| Fixture | Exact value |
|---|---|
| Counter terminal receipt | `df797bb7f17a3583dada534fa65f60fe06a73916b55244ac273c78eb3a2887fd` |
| Bellwether baseline terminal receipt | `9e95347ca3f0fb76be8001d5a65173bc7e06d1e9e7554e94c2e9fcc2d10e0132` |
| Bellwether shutdown terminal receipt | `6be136d97d9f3d6436751358109728681d2c45688aade467d5571de0eff51497` |
| Bellwether reinvention terminal receipt | `42505367d03b25e9aff35950107c68100be59b8c74ce9e36efbaa95bc8cbc57a` |
| RunGraph ID | `graph-0710269a4b8d2f275c95cc70383d21228b455a1609401facf1550a33ceb4346b` |
| RunGraph terminal hash | `52fa3a52e9f0f08622f608ac83c65c133cf26085fba775f03df5eb9fe2d4fc23` |
| RunGraph exported-byte SHA-256 | `6790759112e00debf81ff03283ee7424a8c04b9115fd7eadf2d0e8e6064aa9e0` |

## TDD and internal-review evidence

Tests were committed before the corresponding production behavior.

| Workflow | Purpose | Observed disposition |
|---|---|---|
| `31522152601` | Initial projector, Trustscape, and annotation contracts | RED: production modules absent; existing 59 kernel tests remained green |
| `31522581062` | Pure projector, scene, and annotation core | GREEN on Node 22/24 |
| `31522758363` | Strict projection-schema contract | RED: schema absent |
| `31523009340` | Projection schema implementation | GREEN on Node 22/24 |
| `31523206892` | Recursive Phase-1 source-scan contract | RED: old scan omitted new directories |
| `31523333487` | Recursive syntax/randomness scan | GREEN on Node 22/24 |
| `31523551863` | Browser Web Crypto and annotation interoperability contract | RED: browser core absent |
| `31523810745` | Browser-safe verifier/render/annotation core | GREEN on Node 22/24 |
| `31523978750` | Isolated WebGL2 route contract | RED: viewer assets absent |
| `31524220660` | Isolated Trustscape route | GREEN on Node 22/24 |
| `31524404074` | Literal cross-runtime conformance fixture | RED against deliberate zero placeholders; both runtimes emitted identical actual values |
| `31524686682` | Initial pinned Phase-1 fixture | GREEN on Node 22/24 |
| `31524850050` | Adversarial content-addressing review | RED: exposed four validly re-hashed stale-ID gaps |
| `31525392656` | Hardened Node/browser/scene verifiers | All 87 kernel tests GREEN; only the expected pre-hardening literal scene fixture was stale |
| `31525664178` | Hardened literal fixture and complete final matrix | GREEN on Node 22/24; 106 tests per runtime |

### Defects found and corrected during internal review

1. A validly re-hashed projection could preserve a stale temporal-point content ID after changing committed point content.
2. A validly re-hashed projection could preserve stale causal node or edge IDs.
3. Subjective status counts could contradict the explicit record set while retaining a valid top-level projection hash.
4. A validly re-hashed Trustscape scene could preserve stale object or thread IDs.

The public Node verifier, browser verifier, and Trustscape verifier now recompute those identities from complete content and reject the adversarial cases.

This remains an **internal implementation review**, not an independent technical review.

## Proven boundaries

- The projection is deterministic and hashable from verified supplied evidence.
- The projection does not mutate its RunGraph, run exports, subjective inputs, or fixtures.
- Causal edges are provenance links only.
- Subjective records are explicit inputs only.
- Absence of subjective evidence is represented as `not-modeled`.
- Every canonical coordinate and score is a safe integer.
- The browser and Node paths reproduce the same projection and annotation commitments for the conformance fixtures.
- Trustscape is an isolated file-driven route.
- `index.html`, `src/app.js`, and the visible legacy simulation remain outside the Trustscape path.
- No package dependency, database, external account, municipal data, calibration, autonomous fork, policy optimization, deployment, tag, merge, or browser cut-over was introduced.

## Residual risks and limitations

1. **Independent review is incomplete.** Neither Phase 0 nor the combined Phase-1 system has attributable independent approval.
2. **Browser rendering was not exercised by browser automation in this evidence set.** Browser-safe logic is tested under Node Web Crypto and static route contracts; an actual WebGL2 browser render, accessibility review, and visual regression run remain separate evidence needs.
3. **Projection integrity is not scientific validity.** Determinism and content addressing do not prove causal truth, forecasting accuracy, data quality, fairness, policy legitimacy, or real-world calibration.
4. **Causal-provenance edges are not causal-effect estimates.** They show receipt order, event containment, and fork ancestry only.
5. **Subjective evidence is sparse and supplied.** Phase 1 does not implement agent memory, trust/trauma models, sentiment inference, or narrative consensus.
6. **Whole-evidence replacement remains outside v1.** These artifacts are unsigned; a party replacing a complete evidence set could construct another internally consistent history. Signatures and public anchoring are later work.
7. **Local-first collaboration is manual.** Annotation merge is deterministic, but there is no remote identity, transport, authorization, or conflict-resolution service.
8. **Performance evidence is bounded.** The fixture is small; large branch graphs and long histories require later instrumentation and optimization.
9. **The older Python Worldline / First Synthetic Century code line is not imported.** Its documented branch, replay, state-ownership, and randomness defects make it reference material until separately repaired and conformed.

## Required independent review

The reviewer must pin the exact reviewed Phase-1 head and examine:

- purity and source mutation resistance;
- safe-integer coordinate reproducibility;
- temporal receipt/Snapstate binding;
- causal-provenance claim boundaries;
- branch topology and fork-receipt representation;
- explicit subjective-record handling and `not-modeled` semantics;
- content-ID recomputation in Node, browser, and scene verifiers;
- projection and scene conformance fixtures;
- browser import-map trust routing;
- annotation merge properties and conflict behavior;
- recursive source scanning and ambient-randomness coverage;
- preservation of the legacy browser authority;
- whether any documentation claim exceeds the observed evidence.

Critical findings must be fixed. Important findings must be fixed or explicitly accepted with rationale. Every correction requires regression tests and a fresh Node 22/24 matrix, followed by reviewer confirmation.

## Phase status

```text
Phase-0 Trust Kernel / RunGraph implementation:  GREEN internally
Phase-0 independent technical review:            PENDING
Phase-1 projector / Trustscape implementation:    GREEN internally
Phase-1 independent technical review:             PENDING
Phase-1 stacked draft PR:                          OPEN / UNMERGED
Baseline tag:                                      NOT CREATED
Legacy browser authority:                          UNCHANGED
Authoritative cut-over:                            NOT APPROVED
Deployment:                                        NOT PERFORMED
Phase-2 approximation work:                        MAY PROCEED ONLY ON A SEPARATE STACKED DRAFT
```

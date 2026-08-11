# Ripple City Trust Kernel v1 — Verification Report

**Evidence date:** 2026-08-11

**Baseline:** `Full-Stack-Assets/Temporal-Drift@7dbd6f7d6096284a70559a8005873570ba8fe3b1`

**Working branch:** `codex/ripple-trust-kernel-v1`

**Verified implementation head:** `697a32065c862960347632c7d74689dfa80a5c8e`

**Kernel version:** `1.0.0`

## Verdict

The final Phase-0 hardening head passed the complete `npm run verify` command in GitHub Actions on Node `v22.23.1` and Node `v24.18.0`. Workflow run `31493519887` completed successfully; both runtime jobs passed the legacy regression suite, kernel suite, acceptance sweeps, syntax scan, ambient-randomness ban, and fixture-summary generation.

The browser has not been cut over. The visible runtime continues to use the legacy `simulateBranch`, `getSnapshot`, and `compareSnapshots` exports. The Bellwether adapter remains a shadow instrumentation path: it executes the same fictional legacy model from branch/seed/year inputs, independently normalizes returned state and event batches, and commits those values to Trust Kernel receipts. Shadow equivalence proves normalization, receipt, and replay parity around that legacy model; it does not prove that Bellwether is an independently implemented second causal model, a calibrated city model, or a forecast.

## Observed GitHub Actions matrix

| Workflow evidence | Observed result |
|---|---|
| `Ripple Trust Kernel v1`, run `31493519887` | Completed with conclusion `success` |
| Node 22 verification, job `93785472527` | Node `v22.23.1`; complete `npm run verify` passed |
| Node 24 verification, job `93785472431` | Node `v24.18.0`; complete `npm run verify` passed |
| Syntax scan | 26 JavaScript source/script files passed |
| Randomness scan | 14 kernel/adapter files scanned; no prohibited ambient-randomness call found |

## Observed automated test counts

Each runtime independently reported:

| Suite | Passed | Failed | Skipped | Cancelled |
|---|---:|---:|---:|---:|
| Legacy Bellwether regression | 13 | 0 | 0 | 0 |
| Trust Kernel | 47 | 0 | 0 | 0 |
| Acceptance | 4 | 0 | 0 | 0 |
| **Total** | **64** | **0** | **0** | **0** |

## Acceptance evidence

| Gate | Observed evidence |
|---|---|
| Canonicalization | Exact canonical UTF-8 strings and SHA-256 values matched the `canonical-v1` fixtures; NFC collisions, hidden/symbol/accessor properties, invalid Unicode, non-integers, sparse arrays, cycles, and unsupported values fail closed |
| PRNG | xoshiro128** matched the declared state-transition vector; all-zero and malformed states fail closed |
| Seed sweep | 10,000 seed expansions and first draws repeated exactly and stayed valid |
| Fork isolation | 1,000 forks preserved canonical parent bytes and hashes under alternating child advancement; immutable parent and child ownership remained separate |
| Fork integrity | Forking verifies receipt, snapstate, PRNG, event, input, run, branch, step, state-hash, and previous-link metadata; malformed parents and NFC-equivalent branch IDs fail closed |
| Fresh processes | Four fresh Node processes emitted byte-identical four-receipt counter chains |
| Runtime enforcement | `createRun` itself rejects unsupported Node majors even when npm preflight is bypassed |
| Adapter ownership | A run pins the validated adapter identity, version, and transition reference; later caller mutation cannot alter an existing run |
| Ledger integrity | Append rejects validly hashed receipts spliced across state, run, branch, kernel-version, sequence, or previous-receipt boundaries |
| Replay/verify | Run → canonical export → parse → replay reproduced every Snapstate, event batch, and receipt |
| Tamper detection | Manifest, input, Snapstate, PRNG, event, link, receipt, terminal, removal, reorder, duplication, and unsafe-value changes failed verification |
| Schemas | Authoritative anomaly, manifest, genesis-receipt, and transition-receipt artifacts passed recursive schema validation; nested invalid values and contradictory receipt kinds failed |
| Shadow equivalence | 1,000 branch/seed cases × 21 yearly steps matched normalized state and event hashes |
| Mismatch location | Deliberate Bellwether population corruption reported `/metrics/population` at `year-2026` |
| Randomness policy | Source scan covered `src/kernel` and `src/adapters` and found no `Math.random` use |

## Conformance fixture hashes

Fixture version: `ripple-trust-kernel-v1`

| Fixture | Terminal SHA-256 receipt hash |
|---|---|
| Counter chain v1 | `df797bb7f17a3583dada534fa65f60fe06a73916b55244ac273c78eb3a2887fd` |
| Bellwether baseline, seed 2026 | `9e95347ca3f0fb76be8001d5a65173bc7e06d1e9e7554e94c2e9fcc2d10e0132` |
| Bellwether shutdown, seed 2026 | `6be136d97d9f3d6436751358109728681d2c45688aade467d5571de0eff51497` |
| Bellwether reinvention, seed 2026 | `42505367d03b25e9aff35950107c68100be59b8c74ce9e36efbaa95bc8cbc57a` |

Canonical fixture SHA-256 values:

- ordered nested object: `98078372ea385d9faefb565d70290508ba5052ca7734b3798d331d19bb379345`
- Unicode NFC/escaping: `9146d0c0b9bfd01e28d7e12c4201ffeebe44a6aacf0d17d8a04c7d7d88aeebff`
- safe-integer boundaries: `96800f711edd6780b27c203b227a9d77227df8fd906a5236c3a17b6dea82d193`

The Node 22 and Node 24 acceptance summaries emitted the same counter and Bellwether terminal hashes.

## Internal technical audit and TDD evidence

A fresh internal source audit did not accept the previous green check as sufficient. It identified and tested the following issues:

1. Runtime support was enforced only by an npm preflight rather than the core `createRun` boundary.
2. A caller-owned mutable adapter could replace its transition after run creation.
3. A validly re-hashed receipt from another run, branch, kernel version, or discontinuous previous state could be appended.
4. Fork verification did not validate all Snapstate identity and link metadata.
5. Schema tests inspected mostly top-level fields and did not enforce all-zero PRNG or genesis/transition contradictions.
6. Malformed fork parents escaped as ordinary `TypeError`s, and raw Unicode branch IDs could bypass canonical collision checks.

The tests were committed before their production fixes. Workflow run `31492902539` failed on both Node 22 and Node 24 with five intended failures. After the corresponding fixes, run `31493230533` passed on both runtimes. A final edge-case test then made run `31493375149` fail as intended for malformed/NFC-equivalent branch handling. The final fix produced successful run `31493519887` on both runtimes.

This is an internal implementation review, not an independent external sign-off.

## Proven boundaries

- `simulateBranch`, `getSnapshot`, and `compareSnapshots` remain available and unchanged.
- `src/app.js`, `index.html`, UI modules, styles, and legacy browser imports remain outside the kernel path.
- The kernel and adapter add no package dependencies and ingest no municipal or other real-world data.
- Anomalies remain immutable, append-only, human-review records; they cannot recalibrate or auto-fork a run.
- Verification fails closed and does not repair, truncate, reorder, or accept mismatched evidence.
- No 4D projector, Trustscape, real-data adapter, optimization engine, autonomous policy action, deployment, or browser cutover is included.

## Open gates and deferred claims

1. **Independent technical review remains incomplete.** No external reviewer has submitted an approval or review findings on draft PR #17.
2. **Graph-wide branch-name uniqueness remains a design-level gate.** The current pure `forkRun(parentRun, forkStepId, childBranchId)` API enforces canonical uniqueness against the active branch and its recorded parent, but it has no authoritative run-graph registry capable of detecting duplicate sibling labels or reuse beyond the retained ancestry edge. Resolving this requires either an explicit immutable RunGraph aggregate, content-addressed branch identity semantics, or a versioned revision of the acceptance wording. It should not be represented as fully closed.
3. The Bellwether shadow path is not an independent model implementation and does not establish forecasting or causal validity.
4. No merge, tag, deployment, authoritative kernel cutover, real-data ingestion, calibration, automatic anomaly fork, 4D projection, Trustscape, or Phase-2 expansion is approved.

## Phase-0 status

The implemented correctness and acceptance command set is green on both supported runtimes at the recorded implementation head. Phase 0 remains **review-frozen, not closed**, pending independent technical review and resolution of the graph-wide branch-identity gate. The draft pull request must remain unmerged and no internal baseline tag should be created until those gates are explicitly signed off.

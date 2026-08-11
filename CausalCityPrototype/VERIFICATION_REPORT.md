# Ripple City Trust Kernel v1 — Verification Report

**Evidence date:** 2026-08-11

**Baseline:** `Full-Stack-Assets/Temporal-Drift@7dbd6f7d6096284a70559a8005873570ba8fe3b1`

**Working branch:** `codex/ripple-trust-kernel-v1`

**Local runtime:** Node `v24.14.0`

**Kernel version:** `1.0.0`

## Verdict

The local Node 24 Phase-0 command set passed with no failed, skipped, or cancelled tests. Node 22 and the second Node 24 execution remain CI evidence gates until the draft pull request workflow completes; this report does not infer cross-runtime success from the local run.

The browser has not been cut over. The visible runtime continues to use the legacy simulation exports. The new Bellwether adapter is a shadow instrumentation path: it executes the same legacy model from branch/seed/year inputs, independently normalizes the returned state and event batch, and passes those values through Trust Kernel receipts. Shadow equivalence proves wrapper, canonicalization, receipt, and replay parity; it does not prove that Bellwether is an independently implemented second causal model.

## Observed local commands

| Command | Observed result |
|---|---|
| `npm run check:runtime` | Exit 0; accepted Node 24 (`v24.14.0`) |
| `npm run check:syntax` | Exit 0; 25 JavaScript source/script files checked |
| `npm run check:randomness` | Exit 0; 13 kernel/adapter files scanned; no prohibited ambient-randomness call found |
| `npm run test:legacy` | 13 passed; 0 failed/skipped/cancelled |
| `npm run test:kernel` | 42 passed; 0 failed/skipped/cancelled |
| `npm run test:acceptance` | 4 passed; 0 failed/skipped/cancelled |
| `npm run acceptance:summary` | Exit 0; emitted the fixture hashes below |
| Static HTTP smoke on `127.0.0.1` | HTTP 200 for `/`, `/src/app.js`, and `/src/simulation.js`; expected legacy entry symbols present |

Total observed automated tests: **59 passed** (13 legacy + 42 kernel + 4 acceptance).

## Acceptance evidence

| Gate | Observed evidence |
|---|---|
| Canonicalization | Exact canonical UTF-8 strings and SHA-256 values matched `canonical-v1` fixtures |
| PRNG | xoshiro128** matched the eight-draw reference vector from state `[1,2,3,4]` |
| Seed sweep | 10,000 seed expansions/draws repeated exactly and stayed valid |
| Fork isolation | 1,000 forks preserved canonical parent bytes/hashes under alternating advancement order |
| Fresh processes | Four fresh Node processes emitted byte-identical four-receipt chains |
| Replay/verify | Run → canonical export → parse → replay reproduced every snapstate, event batch, and receipt |
| Tamper detection | Manifest, input, snapstate, PRNG, event, link, receipt, terminal, removal, reorder, and duplication changes failed verification |
| Shadow equivalence | 1,000 branch/seed cases × 21 yearly steps matched normalized state and event hashes |
| Mismatch location | Deliberate population corruption reported `/metrics/population` at `year-2026` |
| Randomness policy | Source scan covered `src/kernel` and `src/adapters` and returned no violation |

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

## Proven boundaries

- `simulateBranch`, `getSnapshot`, and `compareSnapshots` remain available and unchanged.
- `src/app.js`, `index.html`, UI modules, styles, and legacy browser imports were not changed by Trust Kernel v1.
- The kernel and adapter have no package dependencies and do not ingest real-city data.
- Anomalies remain append-only human-review records; they cannot recalibrate or auto-fork a run.
- Verification fails closed and does not repair, truncate, reorder, or accept mismatched evidence.

## Open gates and deferred claims

- Node 22/24 matrix results must come from the draft PR workflow; only Node 24 was executed locally.
- Independent technical review is not complete.
- No merge, deployment, browser cutover, real-data adapter, calibration, automatic anomaly fork, Trustscape, or broader conceptual expansion is included.
- The Bellwether model remains a fictional scenario model, not a forecast or causal proof.

Phase-0 remains review-frozen until the draft PR checks pass and an independent reviewer closes the outstanding gates.

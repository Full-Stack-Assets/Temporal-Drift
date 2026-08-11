# Ripple City Trust Kernel and RunGraph v1 — Verification Report

**Evidence date:** 2026-08-11

**Repository:** `Full-Stack-Assets/Temporal-Drift`

**Verified Bellwether baseline:** `7dbd6f7d6096284a70559a8005873570ba8fe3b1`

**Working branch:** `codex/ripple-trust-kernel-v1`

**Verified implementation-and-test head:** `99a466c6b69a54e84e04959524f9d9e8735cde7d`

**Draft pull request:** `#17`

**Trust Kernel version:** `1.0.0`

**RunGraph schema version:** `1.0.0`

## Verdict

The Trust Kernel, Bellwether shadow adapter, and RunGraph v1 implementation-and-test head passed the complete `npm run verify` command in GitHub Actions on Node `v22.23.1` and Node `v24.18.0`.

Workflow run `31497944415` completed successfully. Both runtime jobs passed:

- the unchanged legacy Bellwether suite;
- the Trust Kernel and RunGraph suite;
- the acceptance suite;
- recursive syntax validation;
- the kernel/adapter ambient-randomness ban;
- deterministic fixture-summary generation.

The hybrid branch-identity design is now implemented:

- an immutable `RunGraph` aggregate owns known branch membership and topology;
- graph-level branch IDs are content-addressed from graph, ancestry, verified fork, model, state, PRNG, input, and normalization facts;
- labels are separate NFC-normalized presentation metadata;
- sibling-label uniqueness, exact idempotency, one-parent topology, reachability, acyclicity, graph hashing, canonical export, parse, replay, and graph verification are enforced and tested.

This closes the **technical branch-identity design gap**. It does not close Phase 0 by itself. Independent technical review remains incomplete, so no tag, merge, deployment, or authoritative cut-over is permitted.

The visible browser still uses the legacy `simulateBranch`, `getSnapshot`, and `compareSnapshots` exports. RunGraph and the Trust Kernel remain downstream verification and shadow infrastructure.

## Versioned design and plan

- Trust Kernel design: `Docs/superpowers/specs/2026-08-11-ripple-trust-kernel-v1-design.md`
- Trust Kernel plan: `Docs/superpowers/plans/2026-08-11-ripple-trust-kernel-v1.md`
- RunGraph design: `Docs/superpowers/specs/2026-08-11-ripple-rungraph-v1-design.md`
- RunGraph plan: `Docs/superpowers/plans/2026-08-11-ripple-rungraph-v1.md`

## Observed final implementation matrix

| Workflow evidence | Observed result |
|---|---|
| `Ripple Trust Kernel v1`, run `31497944415` | Completed with conclusion `success` |
| Node 22 verification, job `93800267299` | Node `v22.23.1`; complete `npm run verify` passed |
| Node 24 verification, job `93800267243` | Node `v24.18.0`; complete `npm run verify` passed |
| Syntax scan | 27 JavaScript source/script files passed |
| Randomness scan | 15 kernel/adapter files scanned; no prohibited `Math.random` call found |

## Observed automated test counts

Each supported runtime independently reported:

| Suite | Passed | Failed | Skipped | Cancelled |
|---|---:|---:|---:|---:|
| Legacy Bellwether regression | 13 | 0 | 0 | 0 |
| Trust Kernel and RunGraph | 59 | 0 | 0 | 0 |
| Acceptance | 5 | 0 | 0 | 0 |
| **Total** | **77** | **0** | **0** | **0** |

## Trust Kernel acceptance evidence

| Gate | Observed evidence |
|---|---|
| Canonicalization | Exact canonical UTF-8 strings and SHA-256 values matched `canonical-v1`; NFC collisions, hidden/symbol/accessor properties, invalid Unicode, floats, negative zero, sparse arrays, cycles, non-plain values, and unsupported values fail closed |
| PRNG | xoshiro128** matched the declared state-transition vector; all-zero and malformed states fail closed |
| Seed sweep | 10,000 seed expansions and first draws repeated exactly and remained valid |
| Fork isolation | 1,000 low-level forks preserved canonical parent bytes and hashes under alternating child advancement; parent and child ownership remained separate |
| Fork integrity | Forking verifies receipts, Snapstates, PRNG state, events, inputs, run/branch/step identity, state hashes, and previous links; malformed parents and NFC-equivalent branch IDs fail closed |
| Fresh-process runs | Four fresh Node processes emitted byte-identical complete counter receipt chains |
| Runtime enforcement | `createRun` rejects unsupported Node majors even if npm preflight is bypassed |
| Adapter ownership | A run pins the validated adapter identity, version, and transition function; later caller mutation cannot alter an existing run |
| Ledger integrity | Append rejects validly re-hashed receipts spliced across state, run, branch, kernel version, sequence, or previous-receipt boundaries |
| Replay and verification | Run → canonical export → parse → replay reproduced every Snapstate, event batch, and receipt |
| Tamper detection | Manifest, input, Snapstate, PRNG, event, link, receipt, terminal, removal, reorder, duplication, and unsafe-value changes failed verification |
| Schemas | Authoritative anomaly, manifest, genesis-receipt, transition-receipt, and RunGraph artifacts passed recursive schema validation; nested invalid values and contradictory receipt kinds failed |
| Shadow equivalence | 1,000 Bellwether branch/seed cases × 21 yearly steps matched normalized state and event hashes |
| Mismatch location | Deliberate Bellwether population corruption reported `/metrics/population` at `year-2026` |
| Randomness policy | Source scan covered `src/kernel` and `src/adapters` and found no `Math.random` use |

## RunGraph acceptance evidence

| Gate | Observed evidence |
|---|---|
| Root import | A verified source run is not mutated; it is replayed under a content-addressed root identity while model states and event batches remain canonically identical |
| Content addressing | Root and child IDs are derived from canonical construction templates; parent, fork, state, PRNG, input, model, or normalization changes alter the derived identity |
| Label separation | Labels do not affect branch IDs; labels are NFC-normalized and never serve as integrity or authorization identifiers |
| Sibling uniqueness | Different sibling constructions cannot reuse the same normalized label; the same label may be reused under a different parent |
| Idempotency | An identical construction with the same label returns the existing graph/branch with `created: false`; a different label for the same construction fails |
| Parent integrity | Every child points to an existing parent and an exact verified parent receipt at the declared fork step |
| Fork-state binding | Child initial state and PRNG state must equal the parent Snapstate at the fork receipt |
| Topology | Root has no parent; every non-root branch has one parent; all branches are root-reachable; cycles and orphans fail verification |
| Membership integrity | Branch descriptor keys and canonical run-export keys must be identical; descriptor, run export, manifest-core, terminal receipt, and branch construction hashes are cross-checked |
| Append-only API | Each successful branch addition returns a new immutable revision with `previousGraphHash` set to the prior graph hash; the prior graph and runs remain byte-identical |
| Graph hash | Every canonical graph revision commits all source-root commitments, descriptors, labels, topology, and run exports |
| Export/parse | Canonical graph export parses, re-verifies every run, reconstructs private executable branches through an explicit adapter resolver, and reproduces the same export bytes |
| Request hardening | Graph fork requests and low-level graph-owned fork options reject accessors, symbols, hidden fields, inherited fields, and non-plain prototypes |
| Hydrated reads | `getBranch`, `listChildren`, and `listAncestors` operate only on graphs created or fully parsed and verified; plain look-alike objects are rejected |
| Cross-process conformance | Four fresh processes emitted byte-identical graph identity, branch identity, graph hash, and exported-byte commitments |
| Cross-runtime conformance | Node 22 and Node 24 emitted identical RunGraph fixture values and exact exported-byte hash |

## Receipt and canonical conformance fixtures

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

## RunGraph conformance fixture

Fixture version: `run-graph-v1`

| Field | Exact observed value |
|---|---|
| Graph ID | `graph-0710269a4b8d2f275c95cc70383d21228b455a1609401facf1550a33ceb4346b` |
| Root branch ID | `branch-f147d7185e911dcf25a361bc81801f8f037b98be465f280cb8365b8122191d0e` |
| Plan A branch ID | `branch-ee5136a14c9e9fbee68a2cdcbd4d1b79ce60189511e7c2685966fe4b1bb60463` |
| Plan B branch ID | `branch-2c82ad533ef909aa76015a16b3bed0ed73c4cb7fca16f15462ce0fd6f48fc782` |
| Detail branch ID | `branch-b2bc65934cc445dbb195a6358d086be132e088b49bb6501d80a05c32bd5e402b` |
| Terminal graph hash | `52fa3a52e9f0f08622f608ac83c65c133cf26085fba775f03df5eb9fe2d4fc23` |
| Canonical exported-byte SHA-256 | `6790759112e00debf81ff03283ee7424a8c04b9115fd7eadf2d0e8e6064aa9e0` |
| Canonical export size | `23271` bytes |

Ordered branch-ID set:

1. `branch-2c82ad533ef909aa76015a16b3bed0ed73c4cb7fca16f15462ce0fd6f48fc782`
2. `branch-b2bc65934cc445dbb195a6358d086be132e088b49bb6501d80a05c32bd5e402b`
3. `branch-ee5136a14c9e9fbee68a2cdcbd4d1b79ce60189511e7c2685966fe4b1bb60463`
4. `branch-f147d7185e911dcf25a361bc81801f8f037b98be465f280cb8365b8122191d0e`

The Node 22 and Node 24 acceptance summaries emitted the same receipt, Bellwether, and RunGraph values.

## TDD and internal-review evidence

Tests were committed before the corresponding production changes.

| Workflow run | Purpose | Observed result |
|---|---|---|
| `31495602386` | Initial RunGraph identity/topology test tranche | RED on Node 22/24 because `src/kernel/run-graph.js` did not exist; prior suites remained green |
| `31496038061` | First minimal implementation | RED on Node 22/24; exposed an incorrect fork-point receipt/Snapstate comparison |
| `31496207079` | Fork-point correction | GREEN on Node 22/24 for the core RunGraph tranche |
| `31496376677` | Strict RunGraph schema tranche | RED on Node 22/24 because `run-graph-v1.schema.json` did not exist |
| `31496521344` | RunGraph schema implementation | GREEN on Node 22/24 |
| `31496757630` | Literal cross-process/cross-runtime fixture tranche | RED on Node 22/24 against placeholder hashes; both runtimes emitted the same actual values |
| `31496967274` | Pinned RunGraph fixture | GREEN on Node 22/24 |
| `31497249225` | Internal boundary-review tranche | RED on Node 22/24; exposed hidden/accessor/symbol request fields and unhydrated topology reads |
| `31497759007` | Boundary fixes | GREEN on Node 22/24 |
| `31497944415` | Final API regression head | GREEN on Node 22/24; 77 tests per runtime |

Earlier Trust Kernel internal hardening also used deliberate RED/GREEN runs to address runtime enforcement, adapter ownership, receipt-splice resistance, fork identity/link verification, schema depth, malformed-parent handling, and Unicode-equivalent low-level branch IDs.

This entire process is an **internal technical audit**, not an independent external review.

## Proven implementation boundaries

- `simulateBranch`, `getSnapshot`, and `compareSnapshots` remain available and unchanged.
- `src/app.js`, `index.html`, UI modules, styles, and legacy browser imports remain outside the kernel and RunGraph paths.
- The implementation adds no package dependencies and ingests no municipal or other real-world data.
- Anomalies remain immutable, append-only, human-review records; they cannot recalibrate or auto-fork a run.
- Verification fails closed and does not repair, truncate, reorder, relabel, or accept mismatched evidence.
- Low-level `forkRun` remains a locally scoped primitive; graph-wide construction and identity are enforced by `forkBranch` and `RunGraph`.
- No 4D projector, Trustscape, real-data adapter, optimization engine, autonomous policy action, deployment, or browser cut-over is included.

## Residual risks and limitations

1. **Independent technical review remains incomplete.** No reviewer operating outside the implementation reasoning context has submitted a version-pinned disposition on draft PR #17.
2. **RunGraph is not externally signed.** Internal hashes detect inconsistency within supplied evidence, but they do not prove who authorized or published the evidence.
3. **Predecessor availability is external.** `previousGraphHash` commits a revision to its predecessor hash, but verifying the predecessor contents requires the predecessor artifact.
4. **Source-root provenance is external.** The graph commits an evidence-normalized canonical source export hash and source receipt/manfiest commitments; the original imported source-run artifact must remain in the evidence archive for provenance review.
5. **Whole-evidence replacement is outside v1.** A party able to replace an unsigned graph, all runs, and all referenced evidence could produce a different internally consistent history. Signatures, public anchoring, and independent attestations are later work.
6. **Scientific validity is not established.** Determinism and integrity do not prove data quality, causal truth, forecast accuracy, fairness, legitimacy, or policy correctness.
7. **Bellwether shadow equivalence is wrapper parity.** The shadow adapter calls the same fictional legacy model; it is not an independently implemented causal engine.
8. **Step IDs are branch-scoped.** A branch ID plus step ID identifies a graph location; step IDs alone are not global identifiers.
9. **Verification cost grows with graph size.** RunGraph v1 verifies complete stored branches; checkpoint proofs, incremental verification, and large-graph performance work are deferred.
10. **Cross-language conformance is deferred.** The current evidence covers fresh Node processes and Node 22/24, not Rust, Python, WebAssembly, or formal proofs.

## Independent review package

The reviewer must pin the final reviewed PR head and examine:

- the approved Trust Kernel and RunGraph specifications;
- both implementation plans;
- the complete diff from Bellwether baseline `7dbd6f7d6096284a70559a8005873570ba8fe3b1`;
- canonical and RunGraph fixture files;
- Node 22/24 workflow evidence;
- this verification report;
- the residual risks above.

Mandatory examination areas remain:

- Unicode normalization and canonical byte semantics;
- xoshiro128** and seed expansion;
- immutable ownership;
- receipt composition and chaining;
- ledger continuity and splice resistance;
- replay completeness;
- tamper-test independence and false-confidence risk;
- low-level fork and graph-level fork verification;
- content-addressing circularity resolution;
- graph hashing and topology invariants;
- Bellwether shadow boundaries;
- whether any claim exceeds observed evidence.

The required review artifact must include reviewer identity, reviewed commit, reviewed specification versions, examined files/tests, Critical/Important/Minor findings, disposition of every finding, residual risks, and an explicit Approval, Conditional Approval, or Rejection.

## Open closure gate

The graph-level identity gate is technically implemented and green on both supported runtimes. The remaining Phase-0 blocker is **independent technical review and final reviewer confirmation after any corrections**.

Phase 0 remains **review-frozen, not closed**. Until independent sign-off exists:

- draft PR #17 remains unmerged;
- no baseline tag is created;
- no authoritative kernel or browser cut-over occurs;
- 4D Projection and Trustscape remain gated;
- Phase-2 and real-data work remain deferred.

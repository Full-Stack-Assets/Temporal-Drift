# Ripple City Phase 1 — 4D Projection and Trustscape Lite Verification Report

**Evidence date:** 2026-08-11  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Phase-0 base head:** `1f7421e7f86ceed7bd550628c34a25475c42df1b`  
**Working branch:** `codex/ripple-4d-projection-v1`  
**Stacked draft pull request:** `#18`  
**Verified Phase-1 implementation head:** `c1b4706481ff1e696c79b037e42ea033491d3213`  
**Projection schema:** `1.0.0`  
**Trustscape scene / browser fixture schema:** `1.0.0`

## Verdict

The Phase-1 implementation head passed the complete repository `npm run verify` command on both Node 22 and Node 24 in GitHub Actions workflow `31523967947`.

Observed jobs:

- Node 22 verification: job `93887609431` — `success`
- Node 24 verification: job `93887609273` — `success`

The implementation adds a pure deterministic projection layer and a separate Trustscape Lite browser lab. It does **not** change the legacy Bellwether browser authority, merge or tag Phase 0, introduce real-world data, infer real-world causality, or perform an authoritative cut-over.

Phase 1 is technically green at the recorded implementation head, but it remains a stacked draft and non-authoritative while Phase 0 awaits independent technical review.

## Observed verification counts

The Node 22 job reported:

| Suite / gate | Observed result |
|---|---:|
| Legacy Bellwether regression | 13 passed |
| Kernel + RunGraph + projector + Trustscape | 76 passed |
| Acceptance | 7 passed |
| **Total automated tests** | **96 passed** |
| Failed | 0 |
| Skipped | 0 |
| Cancelled | 0 |
| Syntax scan | 34 JavaScript files passed |
| Ambient-randomness scan | 22 kernel/adapter/projection/Trustscape files passed |

The complete Node 24 job also concluded `success` under the same workflow matrix.

## Phase-1 functional evidence

### 1. Pure 4D projector

`src/projection/project-4d.js` consumes a hydrated, verified RunGraph and returns a recursively immutable, canonical, hashable projection.

Verified dimensions:

- **Temporal:** Snapstate and receipt identities, branch-local sequence, and deterministic integer coordinates.
- **Causal / provenance:** receipt-chain, fork, and event-batch commitment edges. Every v1 edge carries `semanticClass: 'provenance'`.
- **Branching:** RunGraph branch identity, parent/fork topology, branch depth, and deterministic branch lane.
- **Subjective:** explicit content-addressed annotations only.

No Phase-1 code claims that receipt adjacency is a learned or validated real-world causal relation. No resident belief, trust, trauma, sentiment, or subjective state is inferred from kernel evidence.

### 2. Deterministic coordinates

The projection uses safe-integer coordinates. For the conformance fixture:

- temporal spacing = `1000`
- branch spacing = `1000`
- branch lanes are assigned by lexicographically sorted canonical branch IDs
- time and z coordinates are derived from Snapstate sequence
- branch depth supplies the y coordinate

Tests verify that labels do not alter canonical branch identity or coordinates.

### 3. Projection conformance fixture

Fixture version: `projection-v1`

| Field | Exact observed value |
|---|---|
| Graph ID | `graph-0710269a4b8d2f275c95cc70383d21228b455a1609401facf1550a33ceb4346b` |
| Source graph hash | `2f8f34ca29378ce8df21fc2970b1ccea74f2f5de70c69b81dba8cfc124b6839a` |
| Projection hash | `71f74c3c83600cd75e9c1dd91c78fb4c73c2af0901849bb1a6c8a80f0ae50c56` |
| Canonical projection bytes SHA-256 | `893bdbe66c6d0434809f11926e3000efb0050a00d141a9a9c571ebc26d502d6d` |
| Canonical projection byte length | `16881` |
| Temporal nodes | `9` |
| Provenance edges | `14` |
| Branch nodes | `3` |
| Branch edges | `2` |

Four fresh processes must reproduce the literal fixture. The acceptance test is executed in both Node matrix jobs.

### 4. Trustscape scene consistency

`src/trustscape/model.js` constructs a pure scene from the verified projection.

Tests verify:

- point coordinates are copied exactly from projection nodes;
- receipt threads resolve only to receipt IDs present in projection evidence;
- branch edges resolve only to declared branch IDs;
- annotations create radar adjuncts without changing the source projection identity;
- a projection whose content no longer matches its projection hash is rejected;
- unresolved annotation targets are rejected.

### 5. Pinned Trustscape browser fixture

The browser consumes `data/trustscape-lite-fixture.json` rather than executing the kernel or RunGraph in the browser.

Exact commitments:

| Field | Exact observed value |
|---|---|
| Fixture hash | `160df0a5ec2379d45bdc43152feb86c9d4780a5a53465604529462efefb62c7b` |
| Source graph hash | `2f8f34ca29378ce8df21fc2970b1ccea74f2f5de70c69b81dba8cfc124b6839a` |
| Source projection hash | `71f74c3c83600cd75e9c1dd91c78fb4c73c2af0901849bb1a6c8a80f0ae50c56` |
| Source scene hash | `4e55511562997ba52628cdbae2451688d9e52f1371a96a090a3d4c979ec7ef20` |

The pinned fixture contains:

- 3 branch descriptors;
- 9 Snapstate points;
- 8 receipt/fork provenance threads;
- 2 branch edges;
- 0 built-in radar items.

The acceptance suite emits the browser fixture in four fresh processes and requires byte equality with the pinned file.

### 6. Browser runtime fixture verification

The internal Phase-1 review identified that a CI-pinned fixture should not be trusted blindly after delivery. `src/trustscape/browser-integrity.js` therefore implements browser-compatible canonical-v1 normalization and Web Crypto SHA-256 verification.

Before rendering, `src/trustscape/app.js` now recomputes the fixture commitment and aborts if it does not equal `fixtureHash`.

Tests verify:

- the pinned fixture passes browser-runtime verification;
- a changed coordinate fails browser-runtime verification;
- browser canonical annotation derivation produces the same content-addressed annotation ID as kernel `createAnnotation()` for the same Unicode-normalized fields.

### 7. Local-first annotations

Trustscape local annotations are adjunct evidence only.

They use:

- explicit `authorId`;
- explicit target type and target ID;
- body text;
- deterministic integer logical time;
- optional `supersedes` reference;
- SHA-256 content-derived annotation IDs.

Imported annotation bundles are re-derived and rejected when:

- an annotation ID does not match its content;
- a record contains unknown, hidden, symbol, accessor, or missing fields;
- the graph identity is incompatible;
- target type or logical time is invalid.

Local annotations never alter a kernel receipt, RunGraph hash, base projection hash, or simulation state.

### 8. Trustscape Lite browser surface

`trustscape.html` is a separate lab page and contains a permanent:

`SHADOW / NON-AUTHORITATIVE VISUALIZATION`

banner.

Implemented browser capabilities:

- WebGL2 point and provenance-thread rendering;
- deterministic DOM/table fallback when WebGL2 is unavailable;
- time-horizon slider;
- all-branch view and two-branch comparison selection;
- exact state, receipt, event-batch, graph, projection, and scene hash inspection;
- local multi-author annotations;
- annotation import/export;
- annotation radar.

Static tests verify that the legacy `src/app.js` imports none of the kernel, projection, or Trustscape modules.

## TDD / RED-GREEN evidence

The Phase-1 implementation was not accepted from green tests alone. The following deliberate failing stages were observed before their corresponding implementations or fixtures were added:

| Workflow | Purpose | Observed result |
|---|---|---|
| `31521792582` | Initial projector contract | RED on Node 22/24 because projection modules did not exist |
| `31521991949` | Minimal projector implementation | GREEN on Node 22/24 |
| `31522135593` | Literal projection conformance fixture | RED against deliberate placeholder hashes; both runtimes emitted matching actual values |
| `31522387543` | Trustscape scene contract | RED because `src/trustscape/model.js` did not exist |
| `31522460564` | Trustscape scene implementation | GREEN on Node 22/24 |
| `31523095870` | Browser fixture capture | Deliberate RED after deterministic fixture emission, prior to pinning |
| `31523421835` | Full initial Phase-1 matrix | GREEN on Node 22/24; 93 tests/runtime before browser-runtime integrity tranche |
| `31523697002` | Browser runtime integrity contract | RED on Node 22/24 because `browser-integrity.js` did not exist; previous tests remained green |
| `31523967947` | Browser integrity implementation | GREEN on Node 22/24; 96 tests/runtime |

## Preserved Phase-0 / legacy evidence

The complete Phase-1 matrix continues to execute the earlier gates, including:

- unchanged 13-test legacy Bellwether regression suite;
- canonical-v1 fixtures;
- xoshiro128** vector checks;
- 10,000-seed deterministic sweep;
- 1,000 low-level fork-isolation cases;
- fresh-process receipt-chain equality;
- RunGraph fresh-process conformance;
- replay and tamper detection;
- recursive schema validation;
- 1,000 Bellwether branch/seed shadow-equivalence cases;
- ambient `Math.random` ban.

Existing receipt and Bellwether fixture hashes remain unchanged by Phase 1.

## Claim boundaries

Phase 1 proves only the properties actually exercised by the recorded implementation and tests.

It does **not** prove or implement:

- independent external review of Phase 0 or Phase 1;
- authoritative kernel browser output;
- real-world causal inference;
- real-world forecasting or calibration;
- resident or agent subjective-memory inference;
- automatic anomaly discovery;
- anomaly-born branches;
- networked collaboration or authentication;
- municipal data ingestion;
- policy recommendation or policy execution;
- WebGPU compute;
- large-graph performance guarantees;
- production deployment readiness.

The word **Causal** in the Phase-1 projection describes provenance relationships only.

The **Subjective** dimension contains explicit annotations only.

The **radar** currently displays local review annotations; automatic anomaly classification is deferred.

## Residual risks

1. Phase 0 remains formally open because independent technical review of draft PR #17 has not been recorded.
2. Phase 1 has internal TDD and CI evidence but no independent external technical review.
3. Trustscape is tested through pure/static/browser-compatible modules, not through a full browser automation or GPU conformance suite.
4. WebGL rendering uses floating-point presentation coordinates after the integer projection contract; integrity is anchored in the integer source coordinates, not pixels.
5. Browser localStorage is not an authoritative evidence archive. Invalid local annotation bundles are ignored or rejected, but availability and user-controlled deletion remain outside the trust model.
6. The fixture is internally hash-verified but unsigned; whole-evidence replacement and publisher authenticity remain future signature/attestation work.
7. Projection verification currently requires complete RunGraph verification and therefore scales with stored evidence size.
8. The current synthetic fixture is intentionally small and does not demonstrate large-branch performance.

## Phase-1 status

**Technical implementation:** GREEN at `c1b4706481ff1e696c79b037e42ea033491d3213`  
**Node 22 verification:** GREEN  
**Node 24 verification:** GREEN  
**Stacked draft PR #18:** OPEN / DRAFT / UNMERGED  
**Legacy browser authority:** PRESERVED  
**Authoritative cut-over:** NOT APPROVED  
**Real-data integration:** NOT INCLUDED

Phase 1 may be used as the isolated technical base for subsequent approximation experiments, but no later phase may reinterpret these results as independent approval, scientific validation, municipal authority, or production readiness.

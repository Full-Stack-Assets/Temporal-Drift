# Ripple 4D Projection and Trustscape Lite — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for additive Phase-1 implementation  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Stacked branch:** `codex/ripple-4d-projection-phase1`  
**Required parent:** frozen Phase-0 head `1f7421e7f86ceed7bd550628c34a25475c42df1b`

## 1. Decision

Phase 1 adds two strictly downstream capabilities:

1. a pure, deterministic, hashable **4D Projection Layer** that maps verified Trust Kernel and RunGraph evidence into temporal, causal-provenance, branching, and subjective-evidence dimensions; and
2. **Trustscape Lite**, an isolated WebGL2 explorer that renders only verified projection artifacts and local-first annotations.

The legacy Bellwether browser remains the sole visible authority in `index.html`. Phase 1 does not cut over `src/app.js`, reinterpret model truth, infer real-world causality, or mutate any run, receipt, graph, anomaly, or source fixture.

## 2. Source boundary

The projector accepts a hydrated and verified RunGraph created by `createRunGraph` or `parseRunGraph`. It obtains a canonical graph export through `exportRunGraph`, then treats that export as its immutable source of truth.

Optional subjective evidence is accepted only as explicit, content-addressed records. The projector never invents memories, perceptions, sentiment, trust, trauma, or causal explanations from ordinary state values.

The older Python Worldline / First Synthetic Century bundles are reference and migration inputs only. Their documented unstable branch derivation, shared mutable branch memory, absent durable replay, and unseeded stochastic paths are not imported into this trusted baseline.

## 3. Non-goals

Phase 1 will not:

- infer causal effects from correlations;
- claim that a receipt-chain edge is a scientific causal edge;
- calibrate against municipal or real-world data;
- create autonomous branches;
- optimize policy;
- model subjective memory where no explicit subjective record exists;
- add authentication, remote collaboration, or a database;
- merge Phase 0, create a baseline tag, or authorize browser cut-over;
- implement sparse causal-topography search, evolutionary exploration, agent memory windows, or other Phase-2 approximations.

## 4. Canonical projection artifact

```js
{
  format: 'ripple-4d-projection',
  schemaVersion: '1.0.0',
  projectionVersion: '4d-projector-v1',
  coordinateScale: 1000,
  source: {
    graphId,
    graphHash,
    rootBranchId,
    branchCount,
    runGraphExportHash
  },
  dimensions: {
    temporal: { points: [] },
    causal: { nodes: [], edges: [] },
    branching: { nodes: [], edges: [] },
    subjective: { statusByBranch: [], records: [] }
  },
  projectionHash
}
```

`projectionHash` is SHA-256 over the canonical artifact with `projectionHash` omitted.

Every coordinate and score is a safe integer. No floating-point number enters a canonical projection.

## 5. Coordinate contract

Each projected point carries four integer coordinates:

```js
{ t, c, b, s }
```

- `t` — temporal position, `sequence * coordinateScale`;
- `c` — explicit provenance depth, derived from receipt sequence and event containment;
- `b` — branch depth and deterministic sibling ordinal;
- `s` — declared subjective tension, or zero when no explicit subjective record applies.

Trustscape maps these to three spatial axes without changing the source artifact:

```text
x = t
y = b
z = c
visual intensity = abs(s)
```

Deterministic ordering is by canonical branch ID, sequence, event index, and content ID. Labels never determine identity or coordinates.

## 6. Temporal dimension

For every graph branch and every Snapstate, the projector emits one temporal point bound to:

- graph branch ID;
- run ID;
- step ID;
- sequence;
- receipt hash;
- state hash;
- PRNG-state hash;
- previous receipt hash;
- four-dimensional coordinates.

A temporal point is rejected if the stored receipt and Snapstate do not share sequence, step, branch, or resulting-state commitments. Although RunGraph verification already checks the source, the projector rechecks the boundaries it projects so that projection errors fail locally and visibly.

## 7. Causal-provenance dimension

The causal dimension is deliberately named **causal provenance**, not causal inference.

It contains:

- one receipt node per verified receipt;
- one event node per event in each event batch;
- `precedes` edges between adjacent receipts in a branch;
- `emits` edges from a receipt to each event committed by its event-batch hash;
- `forks` edges from an exact parent fork receipt to the child branch genesis receipt.

No edge claims an unobserved treatment effect. Scientific causal edges require later versioned evidence and design review.

## 8. Branching dimension

The branching dimension mirrors RunGraph topology and contains:

- content-addressed branch IDs;
- display labels as non-authoritative metadata;
- parent branch IDs;
- fork step and parent receipt commitments;
- deterministic branch depth;
- deterministic sibling ordinal;
- terminal receipt and manifest-core commitments.

Every non-root branch has exactly one projected parent edge. Root reachability and acyclicity are inherited from verified RunGraph evidence and checked again in projection verification.

## 9. Subjective dimension

Phase 1 supports explicit records with this exact semantic boundary:

```js
{
  perspectiveId,
  branchId,
  stepId,
  metricPath,
  objectiveValue,
  perceivedValue,
  scale,
  sourceRef,
  sourceVersion
}
```

The projector creates:

```text
tension = perceivedValue - objectiveValue
```

The record receives a content-addressed `subjectiveRecordId`. If a branch has no explicit record, its status is `not-modeled`; the absence is never displayed as consensus, neutrality, or zero trauma.

## 10. Projection verification

`verifyProjection(projection, sourceGraph?)` returns a frozen report and never repairs evidence.

It checks:

- exact top-level shape and versions;
- safe-integer coordinates and scores;
- ID and hash formats;
- unique node and edge IDs;
- referential integrity;
- receipt-thread continuity represented in the projection;
- branch topology represented in the projection;
- subjective-record content IDs and tension arithmetic;
- projection-hash recomputation;
- optional source graph ID, graph hash, export hash, and complete reprojection equality.

Stable error codes:

- `E_PROJECTION_SCHEMA`
- `E_PROJECTION_SOURCE`
- `E_PROJECTION_HASH`
- `E_PROJECTION_REFERENCE`

## 11. Trustscape scene artifact

Trustscape does not render RunGraph directly. It renders a verified projection through:

```js
createTrustscapeScene(projection, view?) -> scene
```

The immutable scene contains:

- selected temporal range;
- selected branch IDs;
- optional two-branch comparison;
- point objects for Snapstates, receipts, events, branches, and subjective records;
- receipt and topology threads;
- comparison overlays at matching sequences;
- anomaly/subjective radar entries;
- `sceneHash` over the canonical scene core.

View controls are deterministic and contain only safe integers and canonical IDs.

## 12. Deterministic time navigation and comparison

A view may specify:

```js
{
  startSequence,
  endSequence,
  activeBranchIds,
  compareBranchIds
}
```

The scene rejects unknown branches, inverted ranges, non-integers, more than two comparison branches, or a comparison branch outside the active set.

Comparison overlays pair temporal points by sequence and report only committed hash equality/difference. They do not assign benefit, harm, superiority, or policy meaning.

## 13. Radar

Trustscape Lite radar entries are generated from explicit subjective records and may later accept reviewed anomaly records through a versioned adapter. Each entry contains:

- branch and step;
- metric path;
- signed tension;
- absolute magnitude;
- source references;
- target object ID.

The radar is descriptive evidence navigation, not an automated intervention trigger.

## 14. Local-first annotation model

Annotations are append-only, content-addressed operations:

```js
{
  actorId,
  logicalClock,
  targetId,
  body,
  supersedes
}
```

Public APIs:

```js
createAnnotationDocument(actorId)
appendAnnotation(document, operation)
mergeAnnotationDocuments(documents)
exportAnnotationDocument(document)
parseAnnotationDocument(exported)
```

Rules:

- no wall-clock timestamp participates in canonical state;
- each actor's logical clock must increase;
- an edit is a new operation that names `supersedes`;
- merge is set union by annotation ID followed by canonical sort;
- the same ID with different bytes fails closed;
- documents are stored locally and may be exported/imported manually;
- annotation text never changes projection or simulation truth.

## 15. Isolated WebGL2 explorer

`trustscape.html` is an additive experimental route. It is not linked as the default application.

The page:

- accepts a projection JSON file;
- verifies it before rendering;
- renders scene points and threads through WebGL2;
- provides deterministic sequence and branch controls;
- displays source hashes and evidence classifications;
- supports local annotation import/export;
- displays a clear `Experimental verified-data viewer` boundary.

If WebGL2 is unavailable, it fails visibly and does not silently substitute unverified rendering data.

## 16. Schema

`schemas/4d-projection-v1.schema.json` covers the complete exported projection shape. Runtime verification remains authoritative for semantic constraints that JSON Schema cannot express.

## 17. Acceptance requirements

Phase-1 implementation evidence must demonstrate on Node 22 and Node 24:

1. identical graph input produces byte-identical projection output in fresh processes;
2. projection does not mutate graph, run exports, fixtures, or input records;
3. every temporal point is bound to the correct receipt and Snapstate;
4. every projected receipt thread matches the ledger chain;
5. every branch edge matches the RunGraph descriptor;
6. coordinates are safe integers and byte-identical across runtimes;
7. subjective absence is marked `not-modeled`;
8. explicit subjective records have deterministic IDs and signed tension;
9. projection, reference, and source tampering fail;
10. Trustscape scene generation is deterministic and receipt-consistent;
11. time filtering and comparison overlays are deterministic;
12. annotation merge is commutative, associative for valid documents, and conflict-detecting;
13. existing Phase-0 receipt and RunGraph fixtures remain unchanged;
14. the legacy browser remains authoritative.

## 18. Phase boundary

Phase 1 may be implemented and reviewed on a stacked draft PR, but it may not be merged into `main`, tagged as authoritative, or used for browser cut-over while Phase 0 lacks independent sign-off.

Successful internal tests are implementation evidence only. Independent technical review remains required for both the Phase-0 root of trust and the combined Phase-1 system.

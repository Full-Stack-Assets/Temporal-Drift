# Ripple City 4D Projection + Trustscape Lite v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for isolated Phase-1 implementation; not approved for authoritative cut-over  
**Base:** `codex/ripple-trust-kernel-v1@1f7421e7f86ceed7bd550628c34a25475c42df1b`  
**Implementation branch:** `codex/ripple-4d-projection-v1`

## 1. Purpose

Phase 1 adds a deterministic, read-only projection layer over verified Trust Kernel / RunGraph evidence and a separate Trustscape Lite explorer. It does not modify simulation truth, replay semantics, branch identity, or the legacy browser authority.

The projection layer translates verified runs into four inspectable dimensions:

1. **Temporal** — Snapstate sequence, step identity, branch-local order, and normalized time coordinate.
2. **Causal / provenance** — receipt-to-receipt continuity, event-batch commitments, and anomaly references. This is provenance topology, not learned causal inference.
3. **Branching** — RunGraph parent/fork topology, branch depth, fork receipt, and branch-relative coordinates.
4. **Subjective** — explicit local-first annotations supplied by users. No subjective belief is inferred from kernel state. Empty annotation input produces an empty subjective layer.

## 2. Non-negotiable boundaries

- Projection is pure: same verified input + same projection options + same annotation set => byte-identical canonical projection.
- Projection never mutates a run, RunGraph, receipt, Snapstate, event batch, anomaly, or annotation input.
- Projection output is hashable and versioned.
- Labels and annotations never alter kernel or RunGraph integrity hashes.
- Causal visualization must be labeled provenance unless a future causal-model layer supplies independently validated causal edges.
- Trustscape Lite is a separate lab surface. `src/app.js` remains unchanged and the legacy simulator remains visible browser authority.
- No real-world data, calibration, policy recommendation, auto-forking, or municipal claim is introduced.
- No merge into `main`, Phase-0 baseline tag, or authoritative cut-over is authorized by this phase branch.

## 3. Projection contract

### `projectRunGraph(graph, options?)`

Consumes a hydrated RunGraph created by `createRunGraph` or `parseRunGraph`. It verifies the graph before projection. It returns a recursively immutable object:

```js
{
  format: 'ripple-4d-projection',
  schemaVersion: '1.0.0',
  graphId,
  sourceGraphHash,
  options: { temporalSpacing: 1000, branchSpacing: 1000 },
  dimensions: {
    temporal: { nodes: [...] },
    causal: { edges: [...] },
    branching: { nodes: [...], edges: [...] },
    subjective: { annotations: [...] }
  },
  projectionHash
}
```

`projectionHash = SHA256(canonical(projection without projectionHash))`.

### Coordinates

All authoritative coordinates are safe integers.

- `t = snapstate.sequence * temporalSpacing`
- `x = deterministic branch lane * branchSpacing`
- `y = branch depth * branchSpacing`
- `z = deterministic receipt/event ordinal * temporalSpacing`

The renderer may transform these values to floating-point screen coordinates, but the projection contract remains integer-only and reproducible.

Branch lanes are assigned by lexicographically sorting canonical branch IDs. Layout therefore does not depend on object insertion order, labels, viewport dimensions, GPU, browser, or frame timing.

## 4. Temporal nodes

Each Snapstate produces one temporal node containing only evidence-backed fields:

- branch ID
- step ID
- sequence
- state hash
- previous receipt hash
- receipt hash
- event-batch hash
- deterministic coordinates

No model-state metric is invented or summarized by the projector.

## 5. Causal / provenance edges

The v1 causal dimension contains only verified provenance relations:

- receipt-chain edge from receipt `n-1` to receipt `n`;
- fork provenance edge from parent fork receipt to child genesis receipt;
- event-batch commitment edge from receipt to event batch hash when the batch is non-empty.

Every edge includes `semanticClass: 'provenance'`. Phase 1 makes no claim that receipt adjacency proves real-world causal effect.

## 6. Branching dimension

Each graph branch produces a branch node with:

- branch ID
- parent branch ID
- fork step ID
- parent receipt hash
- branch depth
- deterministic lane
- label (presentation only)

The branching edge list mirrors verified RunGraph topology.

## 7. Subjective / annotation dimension

Annotations are local-first adjunct records, not kernel evidence.

Canonical annotation shape:

```js
{
  annotationId,
  authorId,
  targetType: 'branch' | 'snapstate' | 'receipt' | 'anomaly',
  targetId,
  body,
  createdLogicalTime,
  supersedes: null | annotationId
}
```

`annotationId` is content-addressed from all fields except itself. `createdLogicalTime` is an integer supplied by the local collaboration layer; wall-clock timestamps are not required for deterministic fixtures.

Annotations are append-only. Editing creates a new annotation that names `supersedes`.

## 8. Local-first collaboration

Trustscape Lite stores annotations in browser `localStorage` under a versioned graph-scoped key. Import/export is canonical JSON. No server, auth, synchronization service, or network write is introduced in v1.

Multi-user means multiple explicit author IDs can coexist in one local annotation bundle or exchanged export. Concurrent distributed reconciliation is deferred.

## 9. Trustscape Lite

Trustscape Lite is a separate `trustscape.html` surface using WebGL2 when available and a deterministic DOM/table fallback when unavailable.

Minimum interactions:

- deterministic time slider;
- branch visibility toggles;
- compare two branch overlays;
- receipt/provenance thread display;
- anomaly/annotation radar list;
- select node and inspect exact hashes;
- create local annotation;
- export/import annotation bundle.

The page displays a permanent `SHADOW / NON-AUTHORITATIVE VISUALIZATION` banner.

## 10. Test gates

Phase-1 projector acceptance requires:

- projection purity and deep immutability;
- identical projection bytes across fresh processes;
- Node 22/24 identical projection hash and coordinate fixture;
- branch lane reproducibility independent of labels and insertion order;
- every projected receipt thread corresponds to a verified receipt chain;
- every fork provenance edge corresponds to RunGraph parent receipt metadata;
- annotations cannot alter kernel, RunGraph, or base projection hashes;
- malformed annotations fail closed with stable error codes;
- Trustscape fixture references only IDs and hashes present in the projection;
- legacy browser authority regression remains green.

## 11. Deferred work

- learned causal graphs;
- subjective memory inference;
- networked collaboration;
- WebGPU compute kernels;
- city-scale spatial geometry;
- real-data adapters;
- 3D asset streaming;
- optimization or autonomous branch generation;
- browser cut-over.

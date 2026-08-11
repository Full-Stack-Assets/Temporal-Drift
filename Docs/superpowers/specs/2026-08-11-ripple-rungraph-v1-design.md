# Ripple City RunGraph v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for Phase-0 implementation  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Branch:** `codex/ripple-trust-kernel-v1`  
**Implementation boundary:** `CausalCityPrototype/`

## 1. Decision

Phase 0 adopts a hybrid design:

1. an immutable, hashable `RunGraph` aggregate owns branch membership and topology;
2. every graph-level `branchId` is content-addressed from immutable construction and ancestry facts;
3. human-readable labels are separate, NFC-normalized presentation metadata;
4. sibling labels must be unique after normalization, but labels never determine branch identity, authorization, receipt validity, or security posture;
5. the low-level `forkRun` primitive remains available for kernel composition, while public graph construction routes through `forkBranch`.

This closes the gap between locally valid forks and graph-wide branch identity without weakening the original acceptance criterion.

## 2. Purpose

Trust Kernel v1 currently verifies individual runs and fork points. It cannot detect two independently created siblings that reuse the same caller-supplied identifier because `forkRun(parentRun, forkStepId, childBranchId)` sees only one parent run.

RunGraph v1 adds the smallest aggregate capable of:

- content-addressing branch construction;
- owning the full known topology;
- enforcing sibling-label rules;
- proving every stored parent/fork relationship against verified receipts;
- exporting and replaying the graph deterministically;
- producing identical graph identifiers and bytes on Node 22 and Node 24;
- supplying a deterministic topology for later 4D projection without implementing that projection now.

## 3. Non-Goals

RunGraph v1 will not:

- merge branches;
- delete branches;
- rename labels;
- reconcile concurrent graph revisions automatically;
- ingest real-world data;
- calibrate or infer causal models;
- select policies;
- implement Trustscape or the 4D projector;
- cut the browser over to kernel output;
- create a baseline tag or merge the draft PR without independent review.

## 4. Terminology

| Term | Meaning |
|---|---|
| `branchId` | Cryptographic graph-level identity derived from construction and ancestry |
| `label` | Human-readable NFC-normalized display name |
| `graphId` | Stable identity of the branch collection rooted in one imported verified run |
| `graphHash` | SHA-256 commitment to the current complete graph revision |
| `parentReceiptHash` | Exact verified receipt at the fork point |
| `constructionHash` | Hash of the branch-construction template before the final manifest identity fields are inserted |
| `runBranchId` | The `branchId` committed inside the canonical run manifest; it must equal the graph-level `branchId` for every graph member |
| `source root` | The already verified run imported into a new graph before it is replayed under a content-addressed root identity |

## 5. Resolving the Self-Addressing Circularity

A final run manifest contains its `branchId`, so a branch ID cannot be derived from the final manifest-core hash without circularity.

RunGraph therefore hashes a **manifest construction template** that excludes identity fields whose values depend on the hash itself. The template commits to every construction fact that determines the branch semantics:

- graph identity;
- parent graph branch identity;
- verified parent receipt and fork step;
- run ID;
- model ID and version;
- fork Snapstate hash;
- fork PRNG-state hash;
- ordered child input envelopes;
- normalization contract.

The branch identifier is:

```text
branchId = "branch-" + SHA256(canonical(constructionTemplate))
```

The final manifest is then created with that `branchId`. Its ordinary manifest-core hash is stored separately in the branch descriptor and verified against the exported run.

Labels are deliberately excluded from the construction template.

## 6. Graph Identity and Root Import

`createRunGraph(rootRun, label?)` accepts a complete verified run.

The source root is first verified with its pinned adapter. The graph ID is derived from:

- source run ID;
- source manifest branch ID;
- source manifest-core hash;
- source terminal receipt hash;
- raw UTF-8 hash of the canonical exported source run.

The graph root branch ID is then derived from a root construction template containing the graph ID and those source-root commitments.

To ensure `run.manifest.branchId === graph branchId` for every member, the source root is replayed using the same model, initial state, PRNG state, ordered inputs, normalization contract, and run ID, but with the derived root `branchId`. The replayed state and event batches must remain canonically identical to the source root. Only identity-bearing receipts are expected to change.

The source root’s original identity is retained as provenance metadata and is never represented as the graph-level branch ID.

## 7. Canonical RunGraph Shape

```js
{
  format: 'ripple-run-graph',
  schemaVersion: '1.0.0',
  graphId: 'graph-<64 lowercase hex>',
  revision: 0,
  previousGraphHash: null,
  sourceRootRunId: '...',
  sourceRootBranchId: '...',
  sourceRootExportHash: '<64 lowercase hex>',
  sourceRootTerminalReceiptHash: '<64 lowercase hex>',
  rootBranchId: 'branch-<64 lowercase hex>',
  branches: {
    '<branchId>': {
      branchId: '<branchId>',
      label: 'NFC display label',
      parentBranchId: null,
      forkStepId: null,
      parentReceiptHash: null,
      constructionHash: '<64 lowercase hex>',
      manifestCoreHash: '<64 lowercase hex>',
      terminalReceiptHash: '<64 lowercase hex>',
      exportedRunHash: '<64 lowercase hex>'
    }
  },
  runExports: {
    '<branchId>': '<canonical exported run JSON string>'
  },
  graphHash: '<64 lowercase hex>'
}
```

Every public graph value is recursively immutable and contains only canonical kernel values. Runtime adapters and executable run objects are retained in a private `WeakMap`; they are not serialized or included in graph hashes.

## 8. Graph Hashing

`graphHash` is SHA-256 over the canonical graph payload with the `graphHash` field omitted.

Every successful branch addition creates a new graph revision with:

- `revision = previous.revision + 1`;
- `previousGraphHash = previous.graphHash`;
- all previous branch descriptors and exports unchanged;
- exactly one new branch descriptor and export;
- a new `graphHash`.

The previous graph object remains byte-identical and immutable.

## 9. Public API

### 9.1 Create

```js
createRunGraph(rootRun, label?) -> graph
```

The default root label is the source root manifest branch ID.

### 9.2 Fork

```js
forkBranch(graph, {
  parentBranchId,
  forkStepId,
  label,
  inputs?,
}) -> { graph, branch, created }
```

If `inputs` is omitted, the child inherits the parent manifest’s remaining inputs after the fork Snapstate. Explicit inputs must be valid ordered input envelopes.

The child is executed through all declared inputs before it is admitted to the graph. Graph members are therefore complete, exported, replayable runs.

### 9.3 Read

```js
getBranch(graph, branchId) -> run
listChildren(graph, branchId) -> frozen branchId[]
listAncestors(graph, branchId) -> frozen branchId[]
```

Ancestors are returned root-first and exclude the requested branch.

### 9.4 Export and Parse

```js
exportRunGraph(graph) -> canonical JSON string
parseRunGraph(exportedGraph, resolveAdapter) -> graph
```

`resolveAdapter(model)` receives `{ id, version }` and must return the matching adapter. Parsing verifies every exported run and every graph invariant before returning a graph.

### 9.5 Verify

```js
verifyRunGraph(graphOrExport, resolveAdapter?) -> frozen report
```

The report contains:

- `ok`;
- `verifiedBranchCount`;
- `firstMismatch`;
- `errorCode`;
- `expectedHash`;
- `actualHash`;
- `graphId`;
- `graphHash`.

Verification never repairs, truncates, relabels, or accepts inconsistent graph evidence.

## 10. Idempotency

An identical fork construction derives the same `branchId`.

- If the graph already contains that branch and the normalized label is identical, `forkBranch` returns the existing graph and branch with `created: false`.
- If the same construction is requested with a different label, the operation fails with `E_BRANCH_LABEL`; label mutation is not part of v1.
- If a different construction attempts to reuse a sibling label, the operation fails with `E_BRANCH_LABEL`.

## 11. Required Invariants

1. Every graph branch ID is content-derived.
2. Every stored run manifest branch ID equals its graph branch ID.
3. Every non-root branch has exactly one parent descriptor.
4. Every parent branch exists.
5. Every `parentReceiptHash` exists in the parent’s verified ledger at `forkStepId`.
6. The child initial state and PRNG state equal the parent fork Snapstate.
7. The child manifest ancestry names the graph parent branch and exact fork receipt.
8. No cycles exist.
9. Every branch is reachable from the root.
10. The root has no parent or fork metadata.
11. Branch IDs are immutable and never reassigned.
12. Branch contents reproduce their `constructionHash` and content-derived ID.
13. Graph membership is append-only through the public API.
14. Every successful addition creates a new graph hash chained to the prior hash.
15. Identical fork requests are idempotent.
16. Labels are NFC-normalized and unique only among siblings.
17. Labels do not participate in branch-ID derivation or authorization decisions.
18. Every `runExports` entry matches its descriptor’s export, manifest-core, and terminal hashes.
19. The set of branch keys exactly equals the set of run-export keys.
20. Node 22 and Node 24 produce identical graph IDs, branch IDs, graph hashes, and exported bytes for the conformance fixture.

## 12. Error Model

RunGraph adds stable codes:

- `E_GRAPH_SCHEMA` — malformed graph or fork request;
- `E_GRAPH_HASH` — graph or export commitment mismatch;
- `E_GRAPH_BRANCH` — missing, orphaned, or inconsistent branch;
- `E_GRAPH_CYCLE` — cyclic topology;
- `E_GRAPH_ADAPTER` — adapter resolution failure;
- `E_BRANCH_LABEL` — invalid or duplicate normalized sibling label.

Existing kernel codes remain authoritative for run, receipt, replay, fork, PRNG, and canonicalization failures.

## 13. Schema

`schemas/run-graph-v1.schema.json` is a strict JSON Schema 2020-12 document covering the complete exported shape. Runtime verification adds semantic checks that JSON Schema alone cannot express, including:

- graph-hash recomputation;
- branch-ID derivation;
- run verification;
- acyclicity and reachability;
- parent receipt existence;
- sibling label normalization;
- root/child semantic distinctions.

## 14. Test Strategy

### 14.1 Identity

- identical construction derives identical branch IDs;
- changing parent, fork receipt, fork step, state, PRNG, inputs, model, or normalization changes the ID;
- labels do not change branch IDs;
- root and child IDs match literal conformance fixtures.

### 14.2 Graph rules

- duplicate sibling labels fail after NFC normalization;
- equivalent construction is idempotent;
- same construction with a different label fails;
- deep reuse of a display label under another parent is permitted;
- branch keys cannot be overwritten.

### 14.3 Structural integrity

- missing parents fail;
- missing or mismatched fork receipts fail;
- child initial state or PRNG divergence fails;
- cycles and orphans fail;
- root-with-parent and child-without-parent fail;
- run-export/descriptor mismatch fails.

### 14.4 Isolation

- graph creation does not mutate the source root;
- fork creation does not mutate the previous graph or any prior run;
- advancing or discarding a returned branch cannot alter its parent or siblings;
- runtime maps are private and cannot change canonical graph bytes.

### 14.5 Export and replay

- export is canonical and byte-stable;
- parse recreates the same topology and executable runs;
- graph verification checks every receipt chain;
- any topology, label, export, descriptor, or graph-hash tampering fails;
- reordered ordinary object keys do not alter canonical export.

### 14.6 Cross-runtime conformance

A fixed RunGraph fixture is emitted in fresh processes and checked on Node 22 and Node 24. Both runtimes must produce identical:

- `graphId`;
- root branch ID;
- child branch IDs;
- terminal graph hash;
- raw exported bytes hash.

## 15. Compatibility and Migration

- Existing `forkRun(parentRun, forkStepId, childBranchId)` behavior remains supported.
- An additive optional configuration argument may supply graph-owned child inputs and the graph parent identity.
- Existing run and receipt fixtures remain unchanged unless an independently reviewed kernel defect requires a versioned correction.
- RunGraph receives its own conformance fixture version.
- The legacy browser remains authoritative.

## 16. Phase-0 Closure Boundary

RunGraph implementation closes only the branch-identity design gate. Phase 0 still requires independent technical review of the final PR head.

No merge, baseline tag, browser cutover, 4D projector, Trustscape implementation, Phase-2 approximation, or real-data work may occur until:

1. all RunGraph tests and the existing kernel acceptance suite pass on Node 22 and Node 24;
2. the verification report records the final observed evidence;
3. an independent reviewer examines the final version-pinned diff;
4. all Critical and Important review findings are resolved or explicitly accepted;
5. the reviewer confirms corrections;
6. no open review thread contradicts the acceptance criteria.

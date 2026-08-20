# Ripple City RunGraph v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immutable RunGraph aggregate with content-addressed branch identities, sibling-only label uniqueness, canonical graph export, and cross-runtime conformance while preserving the existing Trust Kernel and legacy browser boundaries.

**Architecture:** `src/kernel/run-graph.js` owns graph identity, topology, branch admission, export, parse, and verification. Graph values contain only canonical immutable data; executable runs and pinned adapters live in a private `WeakMap`. The existing `forkRun` remains available and gains one additive options parameter so graph construction can supply content-derived branch IDs, graph-parent ancestry, and explicit child inputs.

**Tech Stack:** ECMAScript modules, Node 22/24, `node:test`, Node `crypto`, strict JSON Schema 2020-12, existing Trust Kernel canonicalization/replay/verification primitives.

## Global Constraints

- Work only on `codex/ripple-trust-kernel-v1`.
- Preserve the verified Bellwether baseline and legacy browser output authority.
- Add no package dependencies.
- Use canonical integer-only kernel values and NFC-normalized strings.
- Derive branch IDs from construction facts; labels never enter branch-ID derivation.
- Keep the draft PR unmerged and do not create a baseline tag.
- Do not begin 4D Projection, Trustscape, Phase-2, or real-data work.
- Verification reports may cite only observed results.

---

### Task 1: Graph identity and invariant tests

**Files:**
- Create: `CausalCityPrototype/tests/kernel/run-graph.test.js`
- Create: `CausalCityPrototype/tests/kernel/helpers/run-graph-fixture.js`

**Interfaces:**
- Consumes: `createRun`, `advanceRun`, `forkRun`, `exportRun`, `verifyRun`, `counterAdapter`, and `counterManifest`.
- Produces test expectations for `createRunGraph`, `forkBranch`, `getBranch`, `listChildren`, `listAncestors`, `exportRunGraph`, `parseRunGraph`, and `verifyRunGraph`.

- [ ] **Step 1: Write the missing-module identity test**

```js
import {
  createRunGraph, forkBranch, getBranch, listChildren, listAncestors,
  exportRunGraph, parseRunGraph, verifyRunGraph,
} from '../../src/kernel/run-graph.js';

test('root and child branch identities are deterministic and labels are non-authoritative', () => {
  const source = completeCounterRun();
  const graph = createRunGraph(source, 'Root');
  const left = forkBranch(graph, { parentBranchId: graph.rootBranchId, forkStepId: 's1', label: 'Plan A' });
  const right = forkBranch(graph, { parentBranchId: graph.rootBranchId, forkStepId: 's1', label: 'Plan B' });
  assert.equal(left.branch.manifest.branchId, right.branch.manifest.branchId);
});
```

Expected initial result: module-not-found failure for `src/kernel/run-graph.js`.

- [ ] **Step 2: Add graph-rule tests**

Cover deterministic root identity, different construction IDs, label exclusion from identity, NFC sibling collisions, idempotent identical forks, deep label reuse, parent/child listing, and root-first ancestry.

- [ ] **Step 3: Add integrity and isolation tests**

Mutate exported graph copies to create missing parents, cycles, orphans, incorrect fork receipts, altered child initial state, mismatched run exports, overwritten branch keys, and invalid graph hashes. Confirm the source run, prior graph, parent run, and sibling run remain byte-identical after every successful fork.

- [ ] **Step 4: Push tests and observe RED in both runtime jobs**

Run through the existing GitHub Actions matrix with `npm run verify`. Record the expected missing-module failures before implementing production code.

---

### Task 2: Additive fork configuration and graph implementation

**Files:**
- Modify: `CausalCityPrototype/src/kernel/branch.js`
- Create: `CausalCityPrototype/src/kernel/run-graph.js`
- Modify: `CausalCityPrototype/src/kernel/index.js`

**Interfaces:**
- `forkRun(parentRun, forkStepId, childBranchId, options?)`
- `options.inputs?: InputEnvelope[]`
- `options.parentBranchId?: string`
- `createRunGraph(rootRun, label?) -> RunGraph`
- `forkBranch(graph, request) -> { graph, branch, created }`
- `getBranch(graph, branchId) -> Run`
- `listChildren(graph, branchId) -> readonly string[]`
- `listAncestors(graph, branchId) -> readonly string[]`
- `exportRunGraph(graph) -> string`
- `parseRunGraph(exported, resolveAdapter) -> RunGraph`
- `verifyRunGraph(graphOrExport, resolveAdapter?) -> VerificationReport`

- [ ] **Step 1: Extend `forkRun` minimally**

Validate `options` as a strict object with only `inputs` and `parentBranchId`. Normalize explicit inputs through `createInputEnvelope`. Use the graph parent identity in ancestry when supplied; otherwise retain existing behavior.

- [ ] **Step 2: Implement graph identity helpers**

Implement NFC label normalization, raw exported-run hashing, graph-ID derivation, root construction, child construction, and `branch-<hash>` derivation. Construction templates must exclude labels, evidence runtime, terminal expectation, and the final branch ID.

- [ ] **Step 3: Implement root import**

Verify the source root, derive graph and root identities, replay a canonical root run with the derived branch ID, and require source/canonical state and event batches to remain equal. Create revision 0 with a private runtime map.

- [ ] **Step 4: Implement branch admission**

Verify the current graph, enforce sibling-label uniqueness, derive the child ID, handle exact idempotency, create and fully advance the child run, verify it, add one descriptor/export, chain `previousGraphHash`, and return a new immutable graph.

- [ ] **Step 5: Implement reads, export, parse, and verification**

Verify exact graph fields, graph hash, branch/export key equality, branch descriptors, every run chain, root semantics, parent receipt existence, child fork state/PRNG equality, ancestry, branch-ID derivation, reachability, acyclicity, sibling labels, and export hashes.

- [ ] **Step 6: Export the additive API**

Add the RunGraph functions to `src/kernel/index.js` without removing any existing export.

- [ ] **Step 7: Run focused and full verification**

Expected focused command:

```text
node --test tests/kernel/run-graph.test.js
```

Expected full command:

```text
npm run verify
```

Both must report zero failures before continuing.

---

### Task 3: Strict RunGraph schema

**Files:**
- Create: `CausalCityPrototype/schemas/run-graph-v1.schema.json`
- Modify: `CausalCityPrototype/tests/kernel/schemas.test.js`

**Interfaces:**
- Schema format: `ripple-run-graph`
- Schema version: `1.0.0`
- Strict top-level and descriptor fields
- Canonical branch/export maps keyed by content-addressed branch IDs

- [ ] **Step 1: Add failing schema tests**

Test a real exported graph against the complete schema. Add negative cases for unknown fields, malformed IDs/hashes, missing branch descriptors, mismatched descriptor shapes, and non-string run exports.

- [ ] **Step 2: Observe RED**

Run:

```text
node --test tests/kernel/schemas.test.js
```

Expected failure: missing `run-graph-v1.schema.json`.

- [ ] **Step 3: Write the strict schema**

Use JSON Schema 2020-12, `additionalProperties: false`, exact required fields, branch-ID property patterns, hash patterns, non-negative revisions, nullable previous hash, strict descriptors, and run-export string values.

- [ ] **Step 4: Verify GREEN and full regression**

Run the focused schema test and `npm run verify`.

---

### Task 4: Cross-process and cross-runtime conformance

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/emit-run-graph.js`
- Create: `CausalCityPrototype/tests/acceptance/run-graph-conformance.test.js`
- Create: `CausalCityPrototype/tests/fixtures/run-graph-hashes-v1.json`
- Modify: `CausalCityPrototype/scripts/acceptance-summary.js`

**Interfaces:**
- Fixture version: `run-graph-v1`
- Emits `graphId`, `rootBranchId`, ordered child IDs, `graphHash`, and raw export SHA-256.

- [ ] **Step 1: Add the fresh-process test**

Launch the emitter four times and require byte-identical output.

- [ ] **Step 2: Add a literal fixture check**

Compare the emitted identifiers and hashes to `run-graph-hashes-v1.json`. The same fixture is executed independently by Node 22 and Node 24 in CI.

- [ ] **Step 3: Add RunGraph values to acceptance summary**

Emit the graph fixture version and exact identifiers/hashes beside the existing run fixtures.

- [ ] **Step 4: Run the full matrix**

Push the complete implementation and require both Node 22 and Node 24 to pass `npm run verify` with identical RunGraph summary values.

---

### Task 5: Evidence report and PR review package

**Files:**
- Modify: `CausalCityPrototype/VERIFICATION_REPORT.md`
- Modify: `CausalCityPrototype/README.md`

**Interfaces:**
- Reports only observed commit SHAs, workflow/job IDs, test counts, fixture hashes, review findings, and remaining gates.

- [ ] **Step 1: Perform an internal source review**

Inspect identity circularity, root replay equivalence, graph-hash coverage, hidden runtime ownership, idempotency, sibling-label rules, cycle/orphan detection, adapter resolution, and whether tests compare independent facts rather than merely calling the same helper twice.

- [ ] **Step 2: Add regression tests before any review fix**

For every actionable issue, add a test, observe failure in CI or a focused run, then apply the smallest production correction.

- [ ] **Step 3: Capture final Node 22/24 evidence**

Record the final PR head, workflow run, both job IDs, per-suite counts, and RunGraph fixture values.

- [ ] **Step 4: Update documentation**

Document the RunGraph API, content-addressed identity, sibling-only labels, idempotency, export/parse flow, and continued browser/Phase-2 guardrails.

- [ ] **Step 5: Update the draft PR**

Keep the PR draft and unmerged. Add the final independent-review package and explicitly state that internal review does not close the independent-review gate.

## Plan Self-Review

- Every approved graph invariant maps to Tasks 1–4.
- The branch-ID circularity is resolved by a construction-template hash.
- The root run is replayed under its derived graph identity, so every stored run branch ID equals its graph branch ID.
- Labels never enter branch-ID derivation.
- Graph export and cross-runtime fixtures are explicit.
- No Phase-1 or Phase-2 work is included.
- Independent review remains a separate closure gate after implementation evidence is final.

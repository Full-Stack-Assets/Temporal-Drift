# Ripple 4D Projection and Trustscape Lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure hashable 4D projector and an isolated deterministic Trustscape Lite viewer downstream of verified Trust Kernel and RunGraph evidence.

**Architecture:** `src/projector/` maps canonical RunGraph exports into a versioned projection without mutation or scientific-causality claims. `src/trustscape/` maps verified projections into deterministic scene artifacts, provides append-only local-first annotations, and optionally renders a scene in an isolated WebGL2 page. All identities, coordinates, filters, fixtures, and reports are canonical safe-integer values.

**Tech Stack:** ECMAScript modules, Node 22/24 built-in test runner, existing Trust Kernel canonicalization/SHA-256 utilities, strict JSON Schema 2020-12, browser WebGL2 with no package dependencies.

## Global Constraints

- Base all work on `codex/ripple-4d-projection-phase1` at Phase-0 head `1f7421e7f86ceed7bd550628c34a25475c42df1b`.
- Use test-first RED/GREEN commits for every production behavior.
- Do not modify `index.html`, `src/app.js`, the legacy simulation, or its visible output path.
- Do not infer scientific causality or fabricate subjective memory.
- Use safe integers only in canonical artifacts.
- Preserve all existing Trust Kernel and RunGraph fixture hashes.
- Do not merge, tag, deploy, or cut over.

---

### Task 1: Projection behavior contract

**Files:**
- Create: `CausalCityPrototype/tests/kernel/projection.test.js`
- Create: `CausalCityPrototype/tests/kernel/helpers/projection-fixture.js`

**Interfaces:**
- Consumes: `createRunGraph`, `forkBranch`, `exportRunGraph`, `completeCounterRun`.
- Produces expected API signatures for Task 2.

- [ ] Write failing tests for `projectRunGraph4D`, `exportProjection`, and `verifyProjection`.
- [ ] Assert graph/input byte preservation before and after projection.
- [ ] Assert exact temporal-point/receipt/Snapstate bindings.
- [ ] Assert receipt `precedes`, event `emits`, and graph `forks` edges.
- [ ] Assert deterministic branch depths and label-independent coordinate rules.
- [ ] Assert `not-modeled` subjective status without explicit records.
- [ ] Assert deterministic subjective record IDs and signed tension.
- [ ] Assert projection hash and source tampering fail.
- [ ] Run `npm run test:kernel`; expect module-not-found or missing-export failures while all prior tests remain green.
- [ ] Commit the RED tranche.

### Task 2: Minimal pure projector

**Files:**
- Create: `CausalCityPrototype/src/projector/projection.js`
- Create: `CausalCityPrototype/src/projector/index.js`

**Interfaces:**
- Produces:
  - `projectRunGraph4D(graph, options?) -> projection`
  - `exportProjection(projection) -> canonical JSON string`
  - `parseProjection(exported) -> frozen projection`
  - `verifyProjection(projection, sourceGraph?) -> frozen report`

- [ ] Implement strict plain-object input validation.
- [ ] Verify/hydrate the source through `exportRunGraph` before projection.
- [ ] Project temporal points and recheck receipt/Snapstate boundaries.
- [ ] Project receipt, event, sequence, emission, and fork-provenance structures.
- [ ] Project RunGraph branch topology with deterministic depth and ordinal.
- [ ] Project explicit subjective records; mark absent branches `not-modeled`.
- [ ] Compute `projectionHash` over the canonical core.
- [ ] Implement fail-closed parse/export/verification.
- [ ] Run `npm run test:kernel`; expect Task-1 tests and all prior tests to pass.
- [ ] Commit the GREEN tranche.

### Task 3: Strict projection schema

**Files:**
- Create: `CausalCityPrototype/schemas/4d-projection-v1.schema.json`
- Modify: `CausalCityPrototype/tests/kernel/schemas.test.js`

**Interfaces:**
- Consumes authoritative output from `projectRunGraph4D`.
- Produces strict JSON Schema 2020-12 validation coverage.

- [ ] Extend schema tests first and run them to observe failure because the schema is absent.
- [ ] Add a strict schema with exact required top-level properties and closed nested objects.
- [ ] Add negative cases for invalid IDs, coordinates, statuses, records, edges, and unknown fields.
- [ ] Run `npm run test:kernel`; expect all schema and projector tests to pass.
- [ ] Commit RED and GREEN evidence separately.

### Task 4: Trustscape deterministic scene

**Files:**
- Create: `CausalCityPrototype/tests/kernel/trustscape.test.js`
- Create: `CausalCityPrototype/src/trustscape/scene.js`
- Create: `CausalCityPrototype/src/trustscape/index.js`

**Interfaces:**
- Produces:
  - `createTrustscapeScene(projection, view?) -> scene`
  - `exportTrustscapeScene(scene) -> canonical JSON string`
  - `verifyTrustscapeScene(scene, projection?) -> frozen report`

- [ ] Write failing tests for default full view, time filtering, branch filtering, and comparison overlays.
- [ ] Assert every thread references projected objects and every comparison is based only on state hashes.
- [ ] Assert scene creation does not mutate the projection.
- [ ] Assert deterministic scene hashes and rejection of invalid view filters.
- [ ] Implement the minimal scene builder and verifier.
- [ ] Run `npm run test:kernel`; expect all tests to pass.
- [ ] Commit RED and GREEN evidence separately.

### Task 5: Local-first annotations

**Files:**
- Create: `CausalCityPrototype/tests/kernel/annotations.test.js`
- Create: `CausalCityPrototype/src/trustscape/annotations.js`

**Interfaces:**
- Produces:
  - `createAnnotationDocument(actorId)`
  - `appendAnnotation(document, operation)`
  - `mergeAnnotationDocuments(documents)`
  - `exportAnnotationDocument(document)`
  - `parseAnnotationDocument(exported)`

- [ ] Write failing tests for monotonic actor clocks, content IDs, append-only edits, canonical export, and merge order independence.
- [ ] Add conflict tests for the same ID with different canonical bytes.
- [ ] Implement immutable operations and deterministic merge.
- [ ] Run `npm run test:kernel`; expect all tests to pass.
- [ ] Commit RED and GREEN evidence separately.

### Task 6: Isolated WebGL2 explorer

**Files:**
- Create: `CausalCityPrototype/trustscape.html`
- Create: `CausalCityPrototype/src/trustscape/renderer.js`
- Create: `CausalCityPrototype/src/trustscape/app.js`
- Create: `CausalCityPrototype/styles/trustscape.css`

**Interfaces:**
- Consumes verified projection JSON and optional annotation documents.
- Produces no kernel, graph, or projection mutations.

- [ ] Build a strict projection-file loader that calls `verifyProjection` before scene construction.
- [ ] Render points and threads through WebGL2 using scene coordinates only.
- [ ] Add sequence, active-branch, and comparison controls that regenerate deterministic scenes.
- [ ] Add localStorage annotation persistence keyed by projection hash.
- [ ] Add annotation import/export and deterministic merge.
- [ ] Display source graph/projection/scene hashes and evidence boundary labels.
- [ ] Confirm `index.html` and `src/app.js` remain unchanged through commit comparison.
- [ ] Run syntax and full verification commands.
- [ ] Commit the isolated viewer.

### Task 7: Cross-process conformance fixture

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/emit-projection.js`
- Create: `CausalCityPrototype/tests/acceptance/projection-conformance.test.js`
- Create: `CausalCityPrototype/tests/fixtures/projection-hashes-v1.json`
- Modify: `CausalCityPrototype/scripts/acceptance-summary.js`

**Interfaces:**
- Produces literal projection and scene identity/hash commitments.

- [ ] Commit a placeholder fixture and failing acceptance test.
- [ ] Run Node 22/24 CI and record the identical actual values emitted by both runtimes.
- [ ] Replace placeholders with those exact observed values.
- [ ] Re-run the complete matrix and require zero failures.
- [ ] Add the fixture values to `acceptance-summary.js`.
- [ ] Commit the pinned conformance fixture.

### Task 8: Verification evidence and stacked draft PR

**Files:**
- Create: `CausalCityPrototype/PHASE1_VERIFICATION_REPORT.md`
- Modify: `CausalCityPrototype/README.md`

**Interfaces:**
- Consumes only actual CI results, commit SHAs, and literal fixture hashes.

- [ ] Record RED/GREEN workflow IDs and final Node versions.
- [ ] Record exact test counts, source hashes, projection hashes, scene hashes, and unchanged Phase-0 fixtures.
- [ ] Document subjective and causal-provenance claim boundaries.
- [ ] Document that the viewer is isolated and legacy output remains authoritative.
- [ ] Open a stacked draft PR targeting `codex/ripple-trust-kernel-v1`.
- [ ] Request independent review of projector purity, coordinate conformance, scene consistency, annotation merge, and claim boundaries.
- [ ] Do not merge, tag, deploy, or cut over.

## Completion gate

Implementation is internally ready for review only when a fresh Node 22/24 workflow passes the complete `npm run verify` command on the final evidence head and the report cites the actual run. Phase 1 remains formally gated by independent review and the Phase-0 root-of-trust sign-off.

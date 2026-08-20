# Ripple City 4D Projection + Trustscape Lite v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, hashable four-dimensional projection of verified RunGraph evidence and a separate non-authoritative WebGL2 Trustscape Lite explorer without changing legacy browser output.

**Architecture:** A pure Node/browser-compatible projection module converts a hydrated verified RunGraph into canonical integer coordinates and provenance edges. A separate annotation module creates content-addressed local-first annotations. Trustscape Lite consumes only a static verified projection fixture plus local annotations; it never imports or mutates the legacy simulation runtime.

**Tech Stack:** Dependency-free ECMAScript modules, Node 22/24 test runner, existing canonical SHA-256 utilities, WebGL2, DOM/localStorage fallback.

## Global Constraints

- Base is `codex/ripple-trust-kernel-v1@1f7421e7f86ceed7bd550628c34a25475c42df1b`.
- Legacy `src/app.js` remains unchanged and authoritative for visible simulation output.
- No `Math.random` in kernel, projector, adapter, or Trustscape deterministic data paths.
- Canonical projection values use safe integers, strings, arrays, objects, booleans, and null only.
- Phase 1 is isolated and non-authoritative; no merge to main or cut-over.

---

### Task 1: Projection core and purity

**Files:**
- Create: `CausalCityPrototype/src/projection/annotations.js`
- Create: `CausalCityPrototype/src/projection/project-4d.js`
- Create: `CausalCityPrototype/tests/kernel/project-4d.test.js`
- Modify: `CausalCityPrototype/src/kernel/index.js`

**Interfaces:**
- Produces: `createAnnotation(fields)`, `normalizeAnnotations(records)`, `projectRunGraph(graph, options)`.
- Consumes: `verifyRunGraph`, `getBranch`, canonical hashing, immutable cloning.

- [ ] Write failing tests proving projection format, integer coordinates, deterministic branch lanes, provenance edges, immutability, and annotation hash separation.
- [ ] Run `node --test tests/kernel/project-4d.test.js`; expect module-not-found failure.
- [ ] Implement minimal annotation and projection modules.
- [ ] Export projector/annotation API additively from `src/kernel/index.js` or a dedicated projection barrel without changing existing names.
- [ ] Run projector test and full `npm run test:kernel`; expect green.

### Task 2: Cross-process projection conformance

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/emit-4d-projection.js`
- Create: `CausalCityPrototype/tests/fixtures/projection-hashes-v1.json`
- Create: `CausalCityPrototype/tests/acceptance/projection-conformance.test.js`
- Modify: `CausalCityPrototype/scripts/acceptance-summary.js`

**Interfaces:**
- Produces literal fixture fields: `projectionHash`, `projectionBytesHash`, `projectionByteLength`, temporal-node count, provenance-edge count, branch-node count, deterministic coordinate sample.

- [ ] Add acceptance test with placeholder fixture values so Node 22/24 deliberately fail while printing actual values.
- [ ] Observe the same actual values on both runtimes.
- [ ] Pin those literal values into `projection-hashes-v1.json`.
- [ ] Re-run complete Node 22/24 matrix and require equality.

### Task 3: Trustscape consistency model

**Files:**
- Create: `CausalCityPrototype/src/trustscape/model.js`
- Create: `CausalCityPrototype/tests/kernel/trustscape-model.test.js`

**Interfaces:**
- Produces: `buildTrustscapeScene(projection, annotations=[])`.
- Output contains deterministic arrays of points, receipt threads, branch edges, and radar items keyed only to projection IDs/hashes.

- [ ] Write failing tests for deterministic scene construction, invalid-reference rejection, annotation isolation, and coordinate preservation.
- [ ] Implement the minimal pure scene builder.
- [ ] Run tests and full kernel suite.

### Task 4: Browser Trustscape Lite surface

**Files:**
- Create: `CausalCityPrototype/trustscape.html`
- Create: `CausalCityPrototype/src/trustscape/app.js`
- Create: `CausalCityPrototype/src/trustscape/renderer-webgl2.js`
- Create: `CausalCityPrototype/src/trustscape/local-annotations.js`
- Create: `CausalCityPrototype/styles/trustscape.css`
- Create: `CausalCityPrototype/data/trustscape-lite-fixture.json`

**Interfaces:**
- Browser consumes only a generated static scene/projection fixture and local annotation records.
- WebGL2 renderer exposes `createTrustscapeRenderer(canvas)` and `render(scene, view)`.
- Local annotation store exposes `loadAnnotations(graphId)`, `appendAnnotation(graphId, fields)`, `exportAnnotations(graphId)`, `importAnnotations(graphId, json)`.

- [ ] Generate a deterministic fixture from the same conformance projection.
- [ ] Implement WebGL2 point/line rendering with deterministic coordinates and no random layout.
- [ ] Implement DOM fallback list for WebGL2 absence.
- [ ] Add time navigation, branch toggles, comparison overlay, radar list, exact-hash inspector, and local annotations.
- [ ] Keep `index.html` and `src/app.js` unchanged.

### Task 5: Browser/static integrity tests

**Files:**
- Create: `CausalCityPrototype/tests/kernel/trustscape-static.test.js`
- Modify: `CausalCityPrototype/scripts/check-randomness.js`
- Modify: `CausalCityPrototype/scripts/check-syntax.js` only if required for new directories.

**Interfaces:**
- Tests inspect static fixture and source files without requiring browser automation.

- [ ] Assert Trustscape fixture graph/projection hashes match conformance fixtures.
- [ ] Assert all scene IDs resolve to projection nodes/edges.
- [ ] Assert no ambient randomness in projection/trustscape deterministic source.
- [ ] Assert legacy `src/app.js` has no kernel/projection/Trustscape import.
- [ ] Run full `npm run verify` on Node 22 and Node 24.

### Task 6: Phase-1 evidence and stacked draft PR

**Files:**
- Create: `CausalCityPrototype/PHASE1_VERIFICATION_REPORT.md`
- Modify: `CausalCityPrototype/README.md`

**Interfaces:**
- Report records only observed workflow IDs, job results, test counts, and literal fixture hashes.

- [ ] Record deliberate RED and final GREEN workflow evidence.
- [ ] Document that causal dimension is provenance only and subjective dimension is explicit annotations only.
- [ ] Open a draft stacked PR from `codex/ripple-4d-projection-v1` into `codex/ripple-trust-kernel-v1`.
- [ ] Keep PR draft and unmerged.

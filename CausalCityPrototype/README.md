# Ripple City

**Change one thing. Watch everything else move.**

Ripple City is a dependency-free browser prototype for an explainable causal-world engine. It models the fictional city of Bellwether from 2026 through 2046 across three deterministic timelines:

- **Steady Course** — Atlas Works remains open.
- **The Shutdown** — the city's largest employer closes without a coordinated recovery plan.
- **The Reinvention** — the employer closes, followed by a university-led training, manufacturing, transit, and riverfront recovery package.

The legacy experience combines an interactive 2D city map, a twenty-year timeline, city metrics, district health, citizen stories, branch comparison, and a causal chain behind every headline event.

## Run locally

No package installation or build step is required.

```powershell
cd CausalCityPrototype
python -m http.server 4173
```

Open:

- `http://localhost:4173/` for the unchanged legacy Bellwether browser experience.
- `http://localhost:4173/trustscape.html` for the separate **Trustscape Lite** Phase-1 lab.

Trustscape Lite displays a permanent **SHADOW / NON-AUTHORITATIVE VISUALIZATION** banner. It is not a cut-over from the legacy browser.

## Verify

Trust Kernel v1 and the isolated projection / approximation work support Node 22 and Node 24. The runtime has no package dependencies.

```powershell
npm run verify
```

The command runs:

- the unchanged 13-test legacy Bellwether suite;
- Trust Kernel and RunGraph tests;
- 4D projector, browser-integrity, and Trustscape consistency tests;
- deterministic Phase-2 sensitivity, branch-ranking, synthetic-memory, and anomaly-review tests;
- fresh-process receipt-chain determinism;
- fresh-process RunGraph identity/exported-byte conformance;
- fresh-process 4D projection hash/coordinate conformance;
- fresh-process Phase-2 approximation conformance;
- the pinned Trustscape browser fixture check;
- the 10,000-seed sweep;
- 1,000 fork-isolation cases;
- 1,000 Bellwether shadow cases;
- schema validation;
- syntax checks;
- the kernel/adapter/projection/Trustscape/approximation ambient-randomness scan.

GitHub Actions repeats the complete command on Node 22 and Node 24.

## Trust Kernel v1

The additive kernel lives in `src/kernel/`; its public exports are in `src/kernel/index.js`. It provides:

- canonical NFC/UTF-8 serialization over integer-only safe values;
- explicit xoshiro128** state with rejection-sampled integer draws;
- recursively immutable Snapstates, manifests, ledgers, receipts, runs, anomaly records, and verification reports;
- SHA-256 receipt chains, deterministic export/replay, and fail-closed tamper verification;
- isolated low-level forks rooted in verified parent receipts;
- append-only anomaly and review records;
- strict v1 schemas in `schemas/`.

The Bellwether wrapper in `src/adapters/bellwether-model.js` runs as a CI shadow path. It executes the legacy model from the same branch, seed, and year inputs, normalizes its output to fixed-point integers, and commits every state/event step to the kernel receipt chain. Any normalized state or event mismatch fails the shadow suite and reports the first differing path.

This is not a browser cutover. `src/app.js` continues to call the legacy `simulateBranch`, `getSnapshot`, and `compareSnapshots` exports. Static regression tests ensure it does not import kernel, projection, Trustscape, or approximation modules.

## RunGraph v1

`src/kernel/run-graph.js` adds graph-level identity and topology over verified runs.

RunGraph v1 provides:

- an immutable aggregate owning every known branch descriptor and canonical run export;
- content-addressed `graphId` and `branchId` values;
- branch identity bound to graph, parent branch, exact parent receipt, fork step, model contract, fork state, PRNG state, ordered child inputs, and normalization contract;
- NFC-normalized human labels excluded from integrity identity;
- sibling-only label uniqueness;
- idempotent repeated fork requests;
- one-parent, acyclic, root-reachable topology verification;
- exact child-state/PRNG binding to the parent fork Snapstate;
- canonical graph export, parse, replay, and verification;
- deterministic graph/exported-byte fixtures shared by Node 22 and Node 24.

The source root is replayed under a content-addressed graph branch identity. Its model states and event batches must remain canonically identical to the verified source run; identity-bearing receipts are expected to change because the branch ID changes.

Human labels are presentation metadata. They do not participate in branch-ID derivation, receipt validity, authorization, or security decisions.

### Graph construction

```js
import {
  createRunGraph,
  forkBranch,
  getBranch,
  listChildren,
  listAncestors,
  exportRunGraph,
  parseRunGraph,
  verifyRunGraph,
} from './src/kernel/index.js';

const graph0 = createRunGraph(verifiedRootRun, 'Root');
const { graph: graph1, branch, created } = forkBranch(graph0, {
  parentBranchId: graph0.rootBranchId,
  forkStepId: 'year-2030',
  label: 'Transit first',
  inputs: alternativeInputs,
});
```

`forkRun` remains a low-level composition primitive. Public graph construction should use `forkBranch`, which owns content-derived identity and graph-wide invariants.

## Phase-1 4D Projection Layer

`src/projection/project-4d.js` is a pure read-only transform over an already verified hydrated RunGraph.

It emits four explicitly bounded dimensions:

1. **Temporal** — Snapstate sequence, step, state hash, receipt hash, event-batch hash, and deterministic integer time coordinate.
2. **Causal / provenance** — verified receipt-chain, fork, and event-commitment relationships only. In v1 this is **provenance**, not learned or validated real-world causal inference.
3. **Branching** — branch identity, parent/fork topology, deterministic lane, and depth.
4. **Subjective** — explicit content-addressed user annotations only. No belief, trust, trauma, sentiment, or resident perception is inferred from kernel state.

For the fixed conformance fixture, branch lanes are assigned from lexicographically sorted canonical branch IDs. Projection coordinates therefore do not depend on labels, viewport dimensions, GPU behavior, insertion order, or frame timing.

```js
import { projectRunGraph, createAnnotation } from './src/kernel/index.js';

const projection = projectRunGraph(verifiedGraph);
const annotation = createAnnotation({
  authorId: 'reviewer-1',
  targetType: 'snapstate',
  targetId: projection.dimensions.temporal.nodes[0].nodeId,
  body: 'Review this state.',
  createdLogicalTime: 0,
  supersedes: null,
});

const annotated = projectRunGraph(verifiedGraph, { annotations: [annotation] });
```

Annotations change the annotated projection hash but preserve `baseProjectionHash`, so human commentary cannot silently alter the underlying evidence commitment.

## Trustscape Lite

Trustscape Lite is a separate lab surface at `trustscape.html`.

It provides:

- WebGL2 rendering with deterministic projected coordinates;
- a DOM/table fallback when WebGL2 is unavailable;
- deterministic time navigation;
- all-branch or two-branch comparison views;
- receipt and fork provenance threads;
- exact hash inspection;
- local-first multi-author annotations;
- annotation import/export;
- a local review radar sourced from explicit annotations.

The browser does **not** run the kernel to regenerate its fixture. It consumes the pinned `data/trustscape-lite-fixture.json`, whose hash is verified in CI and re-verified at browser runtime using Web Crypto SHA-256 and browser-compatible canonical-v1 semantics.

Browser annotation IDs are independently derived in `src/trustscape/browser-integrity.js`; tests require them to equal kernel `createAnnotation()` IDs for the same canonical fields. Imported annotation bundles are re-derived and rejected when IDs or shapes are inconsistent.

Trustscape Lite is evidence visualization, not an authority surface. It cannot mutate runs, receipts, RunGraph topology, projection evidence, or the legacy simulation.

## Phase-2 Approximation Layer

Phase 2 lives in `src/approximation/` and is intentionally **synthetic, deterministic, advisory, and non-authoritative**.

### Sparse sensitivity topography

`sampleSensitivityTopography()` evaluates explicitly supplied, already-declared synthetic branches at explicitly declared safe-integer outcome paths. It produces sampled points, neighboring deltas, and threshold flags.

Every artifact carries:

```text
semanticClass = approximate-sensitivity
```

It does not fit a causal response surface, infer a causal graph, extrapolate outside the supplied branches, or claim real-world effect estimates.

### Existing-branch fitness ranking

`rankBranches()` compares only branches already present in the verified RunGraph. Objective normalization and weighted aggregation use exact BigInt/rational arithmetic, with deterministic branch-ID tie-breaking.

The output is a `synthetic-fitness-table` with `advisoryOnly: true`. The ranking code does not call `forkRun()` or `forkBranch()` and cannot admit a new branch.

### Synthetic Subjective Time

`createMemoryProfile()`, `perceivedValue()`, and `narrativeTension()` provide explicit synthetic short/long memory windows, integer salience, generation weighting, exact rational evidence, and reconstructable objective-versus-perceived gaps.

These are modeling primitives. They are not validated measures of resident trauma, trust, sentiment, beliefs, or psychology, and they ingest no real resident data.

### Human-gated anomaly review

`classifyAnomalyForReview()` and `createAnomalyReviewQueue()` apply explicit thresholds to existing anomaly records. Every result hard-codes:

```text
advisoryOnly = true
humanReviewRequired = true
autoForkAllowed = false
autoCalibrationAllowed = false
```

The approximation layer cannot recalibrate a model, mutate a verified run, alter graph topology, or authorize a policy action.

### Performance observations

```powershell
npm run benchmark:phase2
```

runs an environment-specific synthetic benchmark. Timing results are not integrity commitments, correctness gates, SLAs, or portable performance claims.

See `PHASE2_VERIFICATION_REPORT.md` for exact conformance hashes, RED/GREEN workflow history, observed test counts, and claim limitations.

## Integrity boundaries

The verified layers establish reproducibility and internal consistency of supplied synthetic evidence. They do not establish external authority or scientific validity.

Important boundaries:

- `previousGraphHash` commits each new revision to its predecessor hash, but predecessor contents must still be archived to verify history.
- The source-root export is committed, but the original imported artifact remains external evidence.
- Unsigned whole-evidence replacement remains outside v1; signatures, public anchoring, and decentralized attestations are future work.
- Step IDs are scoped by branch identity; labels and step IDs are not global security identifiers.
- Determinism does not prove forecasting accuracy, causal truth, data quality, fairness, legitimacy, or policy correctness.
- The Phase-1 “Causal” dimension is provenance topology only.
- The Phase-1 “Subjective” dimension is explicit annotation storage only.
- Phase-2 “causal topography” is approximate sensitivity over supplied synthetic samples, not causal identification.
- Phase-2 “Subjective Time” uses explicit synthetic memory profiles, not inferred resident state.
- Automatic branch generation, auto-calibration, and anomaly-born authoritative forks remain disabled.

See:

- `VERIFICATION_REPORT.md` for Phase-0 Trust Kernel / RunGraph evidence and closure gates.
- `PHASE1_VERIFICATION_REPORT.md` for projection / Trustscape evidence.
- `PHASE2_VERIFICATION_REPORT.md` for approximation evidence.

## Gate status

Phase 0 remains **review-frozen** pending an independent version-pinned technical review of draft PR #17. No Phase-0 tag, merge, or authoritative browser cut-over is permitted.

Phase 1 is isolated on `codex/ripple-4d-projection-v1` and stacked draft PR #18.

Phase 2 is isolated on `codex/ripple-phase2-approximations-v1` and stacked draft PR #20. Its tools are synthetic R&D adjuncts only and cannot alter the lower-layer authority model.

Until the relevant reviews close:

- all phase PRs remain draft and unmerged;
- no baseline tag is created;
- `src/app.js` and the legacy Bellwether browser remain authoritative;
- projection, Trustscape, and approximation artifacts remain synthetic and non-authoritative;
- no real-data calibration, policy recommendation, auto-forking, municipal, scientific-validation, or production-readiness claim is made.

## Design boundary

Ripple City is a scenario model, not a forecast. Its outputs are deterministic and internally consistent with the fictional rules in `src/simulation.js`; they do not claim to predict a real city.

The legacy simulation layer remains intentionally separate from the UI:

- `src/city-data.js` — fictional world definitions
- `src/simulation.js` — deterministic yearly transitions
- `src/explanations.js` — causal/provenance traversal in the legacy scenario model
- `src/stories.js` — deterministic citizen narratives
- `src/map-view.js` and `src/ui.js` — legacy presentation
- `src/app.js` — legacy interaction orchestration

The Phase-1 lab is separate:

- `src/projection/` — deterministic verified-evidence projection
- `src/trustscape/model.js` — pure scene model
- `src/trustscape/browser-integrity.js` — browser fixture/annotation integrity
- `src/trustscape/renderer-webgl2.js` — presentation only
- `src/trustscape/local-annotations.js` — local-first adjunct commentary
- `src/trustscape/app.js` — lab interaction orchestration

The Phase-2 synthetic R&D layer is separate:

- `src/approximation/sensitivity-topography.js` — sparse simulated sensitivity only
- `src/approximation/branch-ranking.js` — existing-branch fitness table only
- `src/approximation/subjective-memory.js` — explicit synthetic memory profiles
- `src/approximation/anomaly-review.js` — human-gated advisory classification
- `scripts/phase2-benchmark.js` — non-authoritative performance observation

## Future boundary

Real-world use requires sourced datasets, explicit licenses and provenance, calibrated domain models, independent expert review, uncertainty treatment, privacy/governance controls, and a separate formal design review. None of those claims are inferred from synthetic determinism.

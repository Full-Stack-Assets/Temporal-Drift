# Ripple City

**Change one thing. Watch everything else move.**

Ripple City is a dependency-free browser prototype for an explainable causal-world engine. It models the fictional city of Bellwether from 2026 through 2046 across three deterministic timelines:

- **Steady Course** — Atlas Works remains open.
- **The Shutdown** — the city's largest employer closes without a coordinated recovery plan.
- **The Reinvention** — the employer closes, followed by a university-led training, manufacturing, transit, and riverfront recovery package.

The visible experience combines an interactive 2D city map, a twenty-year timeline, city metrics, district health, citizen stories, branch comparison, and causal-provenance explanations.

## Run locally

No package installation or build step is required for the browser prototype.

```powershell
git fetch origin
git checkout codex/ripple-4d-projection-phase1
cd CausalCityPrototype
python -m http.server 4173
```

Open:

- `http://localhost:4173/` — legacy Ripple City browser authority;
- `http://localhost:4173/trustscape.html` — isolated experimental Trustscape Lite file viewer.

Trustscape Lite is deliberately not linked from or imported by the legacy application. It accepts a canonical projection JSON file and verifies the projection through browser Web Crypto before rendering.

## Verify

Trust Kernel v1 and the additive Phase-1 modules support Node 22 and Node 24. The runtime has no package dependencies.

```powershell
npm run verify
```

The command runs:

- the unchanged 13-test legacy Bellwether suite;
- Trust Kernel and RunGraph tests;
- 4D projector, schema, Trustscape, browser-verifier, annotation, and adversarial-integrity tests;
- fresh-process receipt-chain determinism;
- fresh-process RunGraph identity and exported-byte conformance;
- fresh-process 4D projection, Trustscape scene, and browser-render conformance;
- the 10,000-seed sweep;
- 1,000 low-level fork-isolation cases;
- 1,000 Bellwether shadow-equivalence cases;
- recursive syntax validation;
- recursive ambient-randomness scanning across kernel, adapters, projector, and Trustscape.

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

The Bellwether wrapper in `src/adapters/bellwether-model.js` is a CI shadow path. It executes the legacy model from the same branch, seed, and year inputs, normalizes returned state and event batches to fixed-point integers, and commits them to the Trust Kernel receipt chain.

This is not a browser cut-over. `src/app.js` continues to call the legacy `simulateBranch`, `getSnapshot`, and `compareSnapshots` exports.

## RunGraph v1

`src/kernel/run-graph.js` adds immutable graph membership and topology above verified runs.

RunGraph v1 provides:

- a content-addressed `graphId` rooted in verified source-run commitments;
- content-addressed `branchId` values bound to graph, ancestry, exact parent receipt, fork step, model contract, fork state, PRNG state, ordered inputs, and normalization contract;
- NFC-normalized human labels excluded from branch identity;
- sibling-only label uniqueness;
- idempotent identical fork requests;
- one-parent, acyclic, root-reachable topology verification;
- verification that every child begins from the exact parent Snapstate and PRNG state at its declared fork receipt;
- canonical graph export, parse, replay, and verification;
- deterministic Node 22/24 graph and exported-byte fixtures.

### RunGraph API

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

const exported = exportRunGraph(graph1);
const restored = parseRunGraph(exported, ({ id, version }) => {
  if (id === modelAdapter.id && version === modelAdapter.version) return modelAdapter;
  throw new Error('Unknown model adapter');
});

const report = verifyRunGraph(restored);
```

`forkRun` remains a low-level composition primitive. Public graph construction should use `forkBranch`, which owns graph-level identity and topology.

## 4D Projection Layer

`src/projector/` maps a verified RunGraph into a pure, immutable, hashable projection with four dimensions:

1. **Temporal** — Snapstates bound to exact receipts, state hashes, PRNG-state hashes, branches, steps, and sequences.
2. **Causal provenance** — receipt order, event containment, and fork ancestry. These are provenance links, not scientific causal-effect estimates.
3. **Branching** — deterministic graph depth, canonical branch order, parent receipts, and branch commitments.
4. **Subjective evidence** — only explicitly supplied objective/perceived records. Missing evidence is marked `not-modeled`.

All canonical coordinates and scores are safe integers. The projection uses a fixed coordinate scale of `1000` and commits its complete contents through `projectionHash`.

### Projection API

```js
import {
  projectRunGraph4D,
  exportProjection,
  parseProjection,
  verifyProjection,
} from './src/projector/index.js';

const projection = projectRunGraph4D(verifiedGraph, {
  subjectiveRecords: explicitSubjectiveEvidence,
});

const exportedProjection = exportProjection(projection);
const restoredProjection = parseProjection(exportedProjection);
const projectionReport = verifyProjection(restoredProjection, verifiedGraph);
```

The public verifier recomputes temporal, causal-node, edge, branch-node, and subjective-record identities rather than trusting a valid top-level hash alone.

## Trustscape Lite

Trustscape Lite is an isolated WebGL2 viewer in `trustscape.html`. It renders a verified projection; it does not run or mutate the simulation.

Capabilities:

- browser Web Crypto verification before rendering;
- deterministic time-range navigation;
- deterministic active-branch filtering;
- two-branch state-hash comparison overlays;
- receipt and topology threads;
- explicit subjective-tension radar entries;
- append-only local-first annotations;
- annotation import, export, deterministic merge, and conflict rejection;
- display of graph, projection, and render commitments.

The browser-safe modules import no Node kernel or projector code. Their canonicalization, SHA-256, projection, render-model, and annotation interoperability is checked against the Node implementation in the supported runtime matrix.

The renderer requires WebGL2 and does not fabricate substitute coordinates or ambient randomness when WebGL2 is unavailable.

## Evidence and reports

- Phase-0 Trust Kernel / RunGraph evidence: `VERIFICATION_REPORT.md`
- Phase-1 projector / Trustscape evidence: `PHASE1_VERIFICATION_REPORT.md`
- Phase-0 specifications and plans: `../Docs/superpowers/`
- Phase-1 specification: `../Docs/superpowers/specs/2026-08-11-ripple-4d-projection-trustscape-lite-design.md`
- Phase-1 plan: `../Docs/superpowers/plans/2026-08-11-ripple-4d-projection-trustscape-lite.md`

## Integrity and scientific boundaries

The current implementation proves bounded internal properties of supplied evidence. It does not provide an external authority signature or prove scientific validity.

Important boundaries:

- `previousGraphHash` commits a revision to its predecessor hash, but predecessor content must also be archived for independent verification.
- The source-root export remains a separate evidence artifact.
- A party capable of replacing a complete unsigned evidence set could construct another internally consistent history. Signatures, anchoring, and independent attestations are later work.
- Labels and step IDs are not global security identities.
- Causal-provenance edges do not establish treatment effects or causal truth.
- Explicit subjective records do not establish representative public consensus.
- Determinism does not prove forecasting accuracy, calibration, data quality, fairness, policy legitimacy, or real-world applicability.
- The older Python Worldline / First Synthetic Century line is reference material only until separately repaired and conformed. It is not imported into this trusted JavaScript baseline.

## Review and cut-over boundary

The implementation is split across stacked draft pull requests:

- Phase 0: Trust Kernel and RunGraph;
- Phase 1: 4D Projection and Trustscape Lite.

Both phases are internally green on Node 22 and Node 24. Neither has independent technical sign-off.

Until independent review closes the relevant gates:

- both pull requests remain draft and unmerged;
- no internal baseline tag is created;
- the legacy browser remains authoritative;
- Trustscape remains an isolated experimental file viewer;
- no authoritative cut-over occurs;
- no deployment is claimed;
- no real-data calibration, auto-forking, municipal authority, or production-readiness claim is made.

## Product boundary

Ripple City is a scenario model, not a forecast. Its visible outputs are deterministic and internally consistent with the fictional rules in `src/simulation.js`; they do not claim to predict a real city.

The legacy simulation layer remains separate from presentation:

- `src/city-data.js` — fictional world definitions;
- `src/simulation.js` — yearly deterministic transitions;
- `src/explanations.js` — causal-provenance traversal;
- `src/stories.js` — deterministic citizen narratives;
- `src/map-view.js` and `src/ui.js` — presentation;
- `src/app.js` — legacy interaction orchestration.

Real-world use requires sourced datasets, independently reviewed domain models, explicit uncertainty, model-risk governance, accessibility review, privacy review, and formal authorization.

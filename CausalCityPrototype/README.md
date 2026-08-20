# Ripple City

**Change one thing. Watch everything else move.**

Ripple City is a dependency-free browser prototype for an explainable causal-world engine. It models the fictional city of Bellwether from 2026 through 2046 across three deterministic timelines:

- **Steady Course** — Atlas Works remains open.
- **The Shutdown** — the city's largest employer closes without a coordinated recovery plan.
- **The Reinvention** — the employer closes, followed by a university-led training, manufacturing, transit, and riverfront recovery package.

The experience combines an interactive 2D city map, a twenty-year timeline, city metrics, district health, citizen stories, branch comparison, and a causal chain behind every headline event.

## Run locally or on Shadow

No package installation or build step is required.

```powershell
git fetch origin
git checkout feature/causal-city-browser-prototype
git pull origin feature/causal-city-browser-prototype
cd CausalCityPrototype
python -m http.server 4173
```

Open `http://localhost:4173` in the Shadow browser.

## Verify

Trust Kernel v1 supports the Node 22 and Node 24 LTS lines. The runtime has no package dependencies.

```powershell
npm run verify
```

The command runs:

- the unchanged 13-test legacy Bellwether suite;
- the Trust Kernel and RunGraph suites;
- fresh-process receipt-chain determinism;
- fresh-process RunGraph identity and exported-byte conformance;
- the 10,000-seed sweep;
- 1,000 fork-isolation cases;
- 1,000 Bellwether shadow cases;
- schema validation;
- syntax checks;
- the kernel/adapter ambient-randomness scan.

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

This is not a browser cutover. `src/app.js` continues to call the legacy `simulateBranch`, `getSnapshot`, and `compareSnapshots` exports, and the kernel is not imported into the visible browser runtime.

## RunGraph v1

`src/kernel/run-graph.js` adds the graph-level identity and topology layer required to close the difference between a locally valid fork and a globally coherent branch collection.

RunGraph v1 provides:

- an immutable aggregate owning every known branch descriptor and canonical run export;
- a content-addressed `graphId` rooted in verified source-run commitments;
- content-addressed `branchId` values bound to the graph, parent branch, exact parent receipt, fork step, model contract, fork state, PRNG state, ordered child inputs, and normalization contract;
- NFC-normalized human labels that are deliberately excluded from branch identity;
- sibling-only label uniqueness;
- idempotent repeated fork requests;
- one-parent, acyclic, root-reachable topology verification;
- verification that each child starts from the exact parent Snapstate and PRNG state at its declared fork receipt;
- canonical graph export, parse, replay, and verification;
- deterministic graph and exported-byte fixtures shared by Node 22 and Node 24.

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

const exported = exportRunGraph(graph1);
const restored = parseRunGraph(exported, ({ id, version }) => {
  if (id === modelAdapter.id && version === modelAdapter.version) return modelAdapter;
  throw new Error('Unknown model adapter');
});

const report = verifyRunGraph(restored);
```

If `inputs` is omitted, `forkBranch` inherits the parent run's declared inputs remaining after the fork Snapstate. A successful new branch is fully executed and verified before graph admission.

An identical fork request with the same label is idempotent and returns `created: false`. The same construction with a different label fails because RunGraph v1 does not support label mutation. A different sibling construction cannot reuse the same NFC-normalized label.

### Additive kernel API

```js
import {
  createRun,
  advanceRun,
  forkRun,
  exportRun,
  replayRun,
  verifyRun,
  createRunGraph,
  forkBranch,
  getBranch,
  listChildren,
  listAncestors,
  exportRunGraph,
  parseRunGraph,
  verifyRunGraph,
  recordAnomaly,
  appendAnomalyReview,
} from './src/kernel/index.js';
```

`forkRun` remains a low-level composition primitive. Public graph construction should use `forkBranch`, which owns content-derived identity and graph-wide invariants.

## Integrity boundaries

RunGraph v1 proves internal consistency of the supplied evidence. It does not provide an external authority signature.

Important boundaries:

- `previousGraphHash` commits each new revision to its predecessor hash, but a standalone snapshot cannot prove the predecessor's contents unless that predecessor is also archived.
- The source-root export is committed through an evidence-normalized canonical export hash, but the original source export remains an external evidence artifact.
- Anyone capable of replacing the entire unsigned graph and all associated evidence could calculate a different internally consistent graph. Signatures, public anchoring, and decentralized attestations are later roadmap items, not Phase-0 claims.
- Step IDs are scoped by branch identity; labels and step IDs are not global security identifiers.
- Graph verification does not prove forecasting accuracy, causal truth, data quality, policy legitimacy, or real-world calibration.

See `VERIFICATION_REPORT.md` for observed CI evidence, the exact receipt and RunGraph conformance hashes, RED/GREEN review history, limitations, and remaining closure gates.

## Phase-0 boundary

The RunGraph implementation closes the technical graph-identity design gap, but Phase 0 remains review-frozen until an independent reviewer examines the final version-pinned PR diff and formally disposes of all findings.

Until that review closes:

- the pull request remains draft and unmerged;
- no internal baseline tag is created;
- the legacy browser remains authoritative;
- no 4D Projection or Trustscape implementation begins;
- no real-data, calibration, auto-forking, municipal, or production-readiness claim is made.

## Design boundary

Ripple City is a scenario model, not a forecast. Its outputs are deterministic and internally consistent with the rules in `src/simulation.js`; they do not claim to predict a real city.

The simulation layer is intentionally separate from the UI:

- `src/city-data.js` — world definitions
- `src/simulation.js` — yearly deterministic transitions
- `src/explanations.js` — causal provenance traversal
- `src/stories.js` — deterministic citizen narratives
- `src/map-view.js` and `src/ui.js` — presentation only
- `src/app.js` — interaction orchestration

## Unreal 5.8 bridge direction

The prototype is isolated from the Unreal runtime. Its next bridge should preserve that boundary:

1. Export branch snapshots and causal events as stable JSON contracts.
2. Add an Unreal adapter that translates snapshots into Data Layer, population, signage, mission, audio, and world-consequence commands.
3. Keep simulation ownership outside Blueprint and presentation systems.
4. Validate the adapter on the Shadow machine with Unreal Engine 5.8 builds and playtests.

## Next product iteration

The second product iteration expands the same timeline, provenance, comparison, and uncertainty contracts into a Near-Future Earth scenario laboratory. Real-world use will require sourced datasets, calibrated domain models, expert review, and explicit uncertainty ranges.

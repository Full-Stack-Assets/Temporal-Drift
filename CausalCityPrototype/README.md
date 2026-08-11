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

The command runs the unchanged 13-test legacy suite, the kernel suite, fresh-process determinism, the 10,000-seed sweep, 1,000 fork-isolation cases, 1,000 Bellwether shadow cases, syntax checks, and the kernel/adapter ambient-randomness scan. GitHub Actions repeats the same command on Node 22 and 24.

## Trust Kernel v1

The additive kernel lives in `src/kernel/`; its public exports are in `src/kernel/index.js`. It provides:

- canonical NFC/UTF-8 serialization over integer-only safe values;
- explicit xoshiro128** state with rejection-sampled integer draws;
- recursively immutable snapstates, manifests, ledgers, receipts, branches, anomaly records, and verification reports;
- SHA-256 receipt chains, deterministic export/replay, and fail-closed tamper verification;
- isolated forks rooted in a verified parent receipt;
- append-only anomaly and review records;
- strict v1 schemas in `schemas/`.

The Bellwether wrapper in `src/adapters/bellwether-model.js` runs as a CI shadow path. It executes the legacy model from the same branch, seed, and year inputs, normalizes its output to fixed-point integers, and commits every state/event step to the kernel receipt chain. Any normalized state or event mismatch fails the shadow suite and reports the first differing path.

This is not a browser cutover. `src/app.js` continues to call the legacy `simulateBranch`, `getSnapshot`, and `compareSnapshots` exports, and the kernel is not imported into the visible browser runtime.

### Additive API

```js
import {
  createRun,
  advanceRun,
  forkRun,
  exportRun,
  replayRun,
  verifyRun,
  recordAnomaly,
  appendAnomalyReview,
} from './src/kernel/index.js';
```

See `VERIFICATION_REPORT.md` for observed local evidence and the exact conformance fixture hashes. Node 22/24 cross-runtime status is established by the draft pull request checks, not inferred from a local Node 24 run.

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

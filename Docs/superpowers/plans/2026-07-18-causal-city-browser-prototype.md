# Causal City Browser Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free, static browser prototype in which users close a city's largest employer, simulate three deterministic twenty-year branches, compare outcomes, and inspect causal explanations.

**Architecture:** A pure ES-module simulation layer produces immutable yearly snapshots, provenance-linked events, and deterministic citizen stories. A separate DOM/SVG presentation layer renders the 2D city map, timeline, metrics, comparisons, event feed, and explanation panel without owning simulation truth.

**Tech Stack:** HTML5, CSS3, SVG, JavaScript ES modules, Node.js built-in `node:test`.

## Global Constraints

- Place all product code under `CausalCityPrototype/`; do not modify Unreal runtime code.
- Support years 2026 through 2046 inclusive.
- Implement exactly three branches: `baseline`, `shutdown`, and `reinvention`.
- Use no runtime dependencies, external fonts, external images, API calls, or build step.
- Keep simulation truth out of the DOM layer.
- Treat results as modeled scenarios rather than predictions.
- Respect `prefers-reduced-motion` and support a 320px viewport.

---

## File Structure

- `CausalCityPrototype/index.html` — semantic application shell.
- `CausalCityPrototype/styles.css` — responsive visual system and motion rules.
- `CausalCityPrototype/package.json` — Node test commands and ES-module declaration.
- `CausalCityPrototype/README.md` — run instructions, product scope, and model disclaimer.
- `CausalCityPrototype/src/city-data.js` — immutable branches, districts, citizens, and starting state.
- `CausalCityPrototype/src/random.js` — deterministic PRNG and clamp helpers.
- `CausalCityPrototype/src/simulation.js` — yearly branch simulation and snapshot APIs.
- `CausalCityPrototype/src/explanations.js` — provenance graph lookup and root-cause traversal.
- `CausalCityPrototype/src/stories.js` — deterministic citizen story generation.
- `CausalCityPrototype/src/map-view.js` — SVG district map renderer.
- `CausalCityPrototype/src/ui.js` — DOM rendering helpers.
- `CausalCityPrototype/src/app.js` — interaction state and orchestration.
- `CausalCityPrototype/tests/simulation.test.js` — deterministic and branch behavior tests.
- `CausalCityPrototype/tests/explanations.test.js` — causal traceability tests.
- `CausalCityPrototype/tests/stories.test.js` — story reproducibility tests.

### Task 1: Deterministic utilities and city definitions

**Files:**
- Create: `CausalCityPrototype/package.json`
- Create: `CausalCityPrototype/src/random.js`
- Create: `CausalCityPrototype/src/city-data.js`
- Create: `CausalCityPrototype/tests/simulation.test.js`

**Interfaces:**
- Produces: `createRandom(seed: number): () => number`
- Produces: `clamp(value: number, min: number, max: number): number`
- Produces: `CITY`, `DISTRICTS`, `CITIZENS`, `BRANCHES`, `START_YEAR`, `END_YEAR`, `INITIAL_STATE`

- [ ] Write tests asserting seeded random sequences repeat and definitions contain exactly three branch IDs.
- [ ] Run `node --test tests/simulation.test.js` and verify failure because the modules do not exist.
- [ ] Implement the PRNG, helpers, and frozen definitions.
- [ ] Run `node --test tests/simulation.test.js` and verify the utility tests pass.
- [ ] Commit with `feat(causal-city): add deterministic city definitions`.

### Task 2: Yearly simulation engine

**Files:**
- Create: `CausalCityPrototype/src/simulation.js`
- Modify: `CausalCityPrototype/tests/simulation.test.js`

**Interfaces:**
- Consumes: city definitions and deterministic utilities.
- Produces: `simulateBranch(branchId: string, seed?: number): SimulationResult`
- Produces: `getSnapshot(result: SimulationResult, year: number): CitySnapshot`
- Produces: `compareSnapshots(left: CitySnapshot, right: CitySnapshot): MetricDelta[]`

- [ ] Add failing tests for deep-equal deterministic runs, shutdown damage by 2032, reinvention recovery by 2040, and year clamping.
- [ ] Run the tests and verify failures reference missing simulation exports.
- [ ] Implement annual metric transitions, district transitions, scenario events, provenance links, and derived overall health.
- [ ] Run the tests and verify all simulation tests pass.
- [ ] Refactor repeated metric calculations without changing behavior.
- [ ] Commit with `feat(causal-city): implement deterministic branch simulation`.

### Task 3: Causal explanations

**Files:**
- Create: `CausalCityPrototype/src/explanations.js`
- Create: `CausalCityPrototype/tests/explanations.test.js`

**Interfaces:**
- Consumes: `SimulationResult.events` and snapshot provenance.
- Produces: `buildCausalChain(result, causeId): CausalNode[]`
- Produces: `explainMetric(result, year, metricId): MetricExplanation`

- [ ] Write failing tests requiring the 2032 shutdown employment explanation to terminate at `atlas-closure` and every visible event to have a root cause.
- [ ] Run tests and verify failures because explanation functions are missing.
- [ ] Implement safe graph traversal with cycle protection and missing-evidence fallbacks.
- [ ] Run all tests and verify they pass.
- [ ] Commit with `feat(causal-city): add explainable causal provenance`.

### Task 4: Citizen stories

**Files:**
- Create: `CausalCityPrototype/src/stories.js`
- Create: `CausalCityPrototype/tests/stories.test.js`

**Interfaces:**
- Consumes: branch snapshot, citizens, and seeded random utility.
- Produces: `generateStories(result, year, limit?: number): CitizenStory[]`

- [ ] Write failing tests asserting reproducible stories and branch-sensitive copy.
- [ ] Run tests and verify expected missing-module failure.
- [ ] Implement deterministic templates for workers, owners, students, and planners.
- [ ] Run all tests and verify they pass.
- [ ] Commit with `feat(causal-city): add deterministic citizen stories`.

### Task 5: Accessible application shell and visual system

**Files:**
- Create: `CausalCityPrototype/index.html`
- Create: `CausalCityPrototype/styles.css`
- Create: `CausalCityPrototype/README.md`

**Interfaces:**
- Produces stable DOM IDs consumed by `ui.js` and `app.js`.

- [ ] Create semantic landmarks, labeled controls, empty render regions, and scenario disclaimer.
- [ ] Implement desktop and mobile layouts, focus states, metric cards, timeline styling, map styling, and reduced-motion rules.
- [ ] Document static serving with `python -m http.server 4173` and testing with `npm test`.
- [ ] Validate required IDs with `grep -E` and confirm no external resource URLs exist.
- [ ] Commit with `feat(causal-city): add responsive prototype shell`.

### Task 6: SVG map and DOM renderers

**Files:**
- Create: `CausalCityPrototype/src/map-view.js`
- Create: `CausalCityPrototype/src/ui.js`

**Interfaces:**
- Produces: `createCityMap(container, onDistrictSelect): MapController`
- Produces: `renderMetrics`, `renderEvents`, `renderStories`, `renderComparison`, `renderExplanation`, `renderScenarioState`

- [ ] Implement a stable eight-district SVG map with river, transit line, landmark labels, and accessible district buttons.
- [ ] Implement idempotent DOM renderers that tolerate empty arrays.
- [ ] Add health classes and textual status labels so meaning is not color-only.
- [ ] Run syntax checks with `node --check` on both modules.
- [ ] Commit with `feat(causal-city): render interactive city insights`.

### Task 7: Application orchestration

**Files:**
- Create: `CausalCityPrototype/src/app.js`
- Modify: `CausalCityPrototype/index.html`

**Interfaces:**
- Consumes all simulation and presentation modules.
- Owns only selected branch, selected year, selected metric/event, playback state, and comparison branch.

- [ ] Wire branch selection, primary closure action, timeline slider, play/pause, reset, comparison selection, metric explanations, event explanations, and district selection.
- [ ] Ensure the initial screen explains Atlas Works before simulation begins.
- [ ] Ensure the shutdown action selects the shutdown branch and animates to 2032 unless reduced motion is enabled.
- [ ] Run `node --check src/app.js` and the complete Node test suite.
- [ ] Commit with `feat(causal-city): complete playable employer-shutdown loop`.

### Task 8: Verification and delivery

**Files:**
- Modify only files needed to fix verification failures.

**Interfaces:**
- Produces a static, dependency-free prototype ready for review.

- [ ] Run `npm test` and require all tests to pass.
- [ ] Run `node --check` against every JavaScript module.
- [ ] Start `python -m http.server 4173`, request `index.html` with `curl`, and require HTTP 200.
- [ ] Search for forbidden external URLs and prediction claims; remove any violations.
- [ ] Review the implementation against every acceptance criterion in the design specification.
- [ ] Commit fixes, push the feature branch, and open a draft pull request.

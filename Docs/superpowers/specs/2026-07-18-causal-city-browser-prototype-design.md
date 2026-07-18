# Causal City Browser Prototype — Design Specification

**Date:** 2026-07-18  
**Working product name:** Ripple City  
**Engine family:** Causal Worlds  
**Repository placement:** `CausalCityPrototype/` inside the Temporal Drift repository, isolated from Unreal runtime code.

## 1. Product Intent

Ripple City is a consumer-facing browser experiment that lets a player change one condition in a living fictional city, simulate twenty years, compare alternate timelines, and inspect the chain of causes behind visible outcomes.

The first scenario is deliberately narrow: **Atlas Works, the city's largest employer, closes in 2026**. The prototype must make the resulting layoffs, reduced spending, business closures, tax pressure, migration, cheaper housing, and possible reinvention legible on a single screen.

The product promise is:

> Change one thing. Watch everything else move. Click any outcome to learn why.

The prototype is not a real-world forecasting tool. It produces deterministic, internally consistent scenarios based on visible assumptions.

## 2. Audience and Tone

The initial audience is curious consumers and gamers rather than professional analysts.

The tone is **plausible but playful**:

- Outcomes should feel believable and causally connected.
- The interface should be inviting, cinematic, and fast to understand.
- The product should expose assumptions and uncertainty without becoming a spreadsheet.
- Copy must avoid claiming certainty or predictive authority.

## 3. First-Run Experience

On load, the player sees the fictional mid-sized American city of **Bellwether** in 2026.

Bellwether contains:

- Downtown civic and commercial core
- Atlas Works industrial district
- Riverfront warehouse corridor
- Working-class Northside
- West End residential district
- University quarter
- Harbor and logistics district
- Southgate suburbs

The player is introduced to Atlas Works and presses **Close Atlas Works**. The city advances through 2026–2046. The map, metrics, event feed, and citizen stories update together.

The player can then:

1. Scrub to any year.
2. Toggle among the baseline, shutdown, and reinvention branches.
3. Compare two branches side by side through metric deltas.
4. Select a metric or event and ask **Why?**
5. View a causal chain that traces the outcome back to the shutdown or a later intervention.
6. Reset and replay the deterministic scenario.

## 4. Branches

The prototype contains exactly three authored simulation branches:

### Baseline

Atlas Works remains open. Bellwether grows slowly, with rising housing costs and modest fiscal stability.

### Shutdown

Atlas Works closes in 2026 with no coordinated recovery plan. Bellwether experiences a deep employment shock, business contraction, fiscal stress, out-migration, and uneven recovery.

### Reinvention

Atlas Works closes in 2026. In 2030, the city launches a university-led clean manufacturing and riverfront redevelopment package. The branch initially suffers the same shock, then recovers through training, business formation, migration, and infrastructure investment.

These are scenarios, not probabilities or predictions.

## 5. Core Simulation Model

The model runs in one-year deterministic ticks from 2026 through 2046.

### City metrics

- Population
- Employment rate
- Median household income index
- Local business index
- Municipal fiscal health
- Housing affordability
- Public trust
- Transit quality
- Cultural vitality
- Overall city health

### District metrics

Each district stores:

- Population share
- Employment health
- Commercial health
- Housing pressure
- Public investment
- Overall district health

### Events

Each event has:

- Stable ID
- Year
- Branch
- Title
- Summary
- Category
- Magnitude
- Direct cause IDs
- Affected metric IDs
- Affected district IDs

### Provenance

Every material metric change stores cause IDs. The explanation engine traverses those links backward into an acyclic causal chain. The UI must never invent an explanation separately from simulation provenance.

### Determinism

The same branch, seed, and year must produce identical state, event ordering, stories, and causal paths. A small seeded variation may be used for texture, but it must remain reproducible.

## 6. Architecture

The browser prototype uses dependency-free ES modules so it can run as a static site and remain easy to host.

### Pure simulation layer

- `src/city-data.js`: immutable city, district, citizen, and scenario definitions.
- `src/random.js`: seeded deterministic pseudo-random number generator.
- `src/simulation.js`: yearly state transition engine and branch generation.
- `src/explanations.js`: causal graph traversal and human-readable explanation data.
- `src/stories.js`: deterministic citizen story selection and templating.

The pure layer must not access the DOM.

### Presentation layer

- `src/map-view.js`: SVG district rendering and map updates.
- `src/ui.js`: DOM bindings, metric cards, timeline, event feed, comparison, and explanation panel.
- `src/app.js`: application orchestration and user interaction state.
- `styles.css`: responsive visual system.
- `index.html`: accessible semantic shell.

### Tests

Node's built-in `node:test` validates deterministic output, expected shock/recovery behavior, causal traceability, and story reproducibility.

## 7. Interface Layout

### Header

- Ripple City logo
- Tagline
- Branch selector
- Reset control

### Main map panel

- Responsive SVG city map
- Year label
- Animated district health changes
- Atlas Works landmark
- River and transit overlays
- Map legend

### Scenario rail

- Scenario introduction
- Primary action button
- Timeline slider and play control
- Major event feed

### Insight panel

- City metric cards
- Branch comparison deltas
- Citizen stories
- **Why did this happen?** causal chain panel

On mobile, panels stack in map → timeline → metrics → stories → explanation order.

## 8. Visual Direction

The interface should feel like a polished civic strategy game rather than an enterprise dashboard.

- Dark ink background with warm paper panels
- Electric cyan for active timeline elements
- Amber for warnings and shocks
- Green for recovery
- Rose for severe decline
- Rounded but not cartoonish geometry
- Subtle grid, map texture, and timeline motion
- High-contrast text and keyboard-visible focus states

No external images, fonts, or API calls are required.

## 9. Accessibility

- All controls are keyboard reachable.
- Buttons have explicit labels.
- Metric changes use text and icons in addition to color.
- Motion respects `prefers-reduced-motion`.
- SVG districts expose accessible names.
- Minimum body text size is 15px.
- The experience remains usable at 320px width.

## 10. Error Handling

- Invalid branch IDs fall back to baseline.
- Invalid years clamp to 2026–2046.
- Missing cause IDs render as unavailable evidence rather than breaking the panel.
- The simulation returns immutable snapshots and never mutates source definitions.
- UI rendering functions tolerate empty event and story lists.

## 11. Testing and Acceptance Criteria

The prototype is accepted when:

1. `node --test` passes all simulation tests.
2. The shutdown branch has materially lower employment, business health, and fiscal health than baseline by 2032.
3. The reinvention branch has higher employment and city health than shutdown by 2040 while preserving the initial shock.
4. Re-running the same branch and seed produces deep-equal snapshots.
5. Every headline event shown in the event feed can be traced to at least one root cause.
6. The app runs from a basic static HTTP server with no build step.
7. The interface remains functional on desktop and mobile layouts.
8. The product clearly labels outcomes as modeled scenarios, not predictions.

## 12. Explicitly Deferred

The following are not part of this first implementation:

- User-authored cities or rules
- Real-world data ingestion
- Accounts, cloud saves, or multiplayer
- AI-generated simulation truth
- Full geographic maps
- Real-time agent-by-agent citizens
- Economic calibration for professional decision-making
- Near-Future Earth scenarios

The Near-Future Earth edition is iteration two and should reuse the simulation, provenance, timeline, and comparison contracts established here.

# Ripple Phase-2 Approximations — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for stacked, human-gated approximation implementation  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Branch:** `codex/ripple-phase2-approximations`  
**Required parent:** Phase-1 evidence head `a19fab9284d303d1302354bffc3c60c71e324979`

## 1. Decision

Phase 2 adds five bounded, deterministic approximation capabilities downstream of the verified Trust Kernel, RunGraph, and 4D Projection layers:

1. sparse local topography sampling over explicitly declared integer parameters;
2. bounded deterministic candidate exploration under simple declared fitness objectives;
3. multi-resolution memory-window aggregation and narrative-tension scoring over explicit subjective records;
4. append-only, human-gated anomaly-to-branch-proposal review workflows;
5. deterministic Trustscape chunk planning and canonical work accounting for longer timelines and larger branch collections.

Every output is labeled an approximation. No Phase-2 function may mutate a RunGraph, execute a branch, infer scientific causality, claim calibration, ingest live municipal data, authorize policy, or bypass human review.

## 2. Source and trust boundary

Phase 2 may consume:

- canonical safe-integer parameter objects;
- explicitly versioned deterministic evaluator adapters;
- verified RunGraph and 4D Projection artifacts;
- explicit subjective-memory records;
- content-addressed anomaly records and evidence references;
- explicit human review events.

Phase 2 must not treat the older Python Worldline / First Synthetic Century packages as trusted executable inputs. Those packages remain quarantined reference material because the supplied reviews document unstable process-specific branch seeds, shared mutable branch memories, missing durable replay, shallow canonical immutability, and unseeded stochastic paths.

## 3. Global invariants

1. Canonical artifacts contain only null, booleans, NFC strings, safe integers, arrays, and plain objects.
2. No floating-point value enters a canonical artifact.
3. No `Math.random`, wall-clock time, process ID, filesystem order, network response, or ambient locale affects a canonical result.
4. Evaluator identity and version are committed independently of its function reference.
5. Evaluator results must be deterministic; the framework evaluates declared fixtures twice and rejects differing canonical bytes.
6. Every artifact and sub-record has a content-derived identity.
7. Every top-level artifact has a SHA-256 commitment over its canonical core.
8. Labels and prose never serve as security, identity, or execution authority.
9. Proposal and exploration artifacts carry `reviewRequired: true` and `executionAuthority: 'none'`.
10. Performance timing observations are explicitly noncanonical and excluded from correctness commitments.

## 4. Deterministic evaluator contract

Approximation modules accept a pinned evaluator:

```js
{
  id: 'counter-policy-evaluator',
  version: '1.0.0',
  evaluate(parameters) {
    return {
      count: parameters.jobs + parameters.housing,
      pressure: parameters.jobs * 2 - parameters.housing,
    };
  }
}
```

Requirements:

- `id` and `version` are non-empty NFC strings;
- `evaluate` is pinned by reference at call entry;
- input parameters are recursively immutable;
- output must be a plain object containing exactly the declared metric IDs;
- every output is a safe integer;
- duplicate evaluation of the same parameters must return byte-identical canonical output;
- exceptions and nondeterministic output fail with `E_APPROX_EVALUATOR`.

The evaluator remains an approximation adapter. Its identity does not establish scientific validity or calibration.

## 5. Sparse causal-topography sampler

### 5.1 Purpose

The sampler maps local response surfaces around an explicit baseline without claiming that an axis scientifically causes the measured response. Its output is called **sparse response topography**; `causal-topography` remains a product metaphor and must be qualified as an approximation.

### 5.2 Public API

```js
sampleSparseTopography({
  baseline,
  axes,
  metrics,
  evaluator,
  cliffThreshold,
  pairLimit,
}) -> topography
```

Axis shape:

```js
{
  axisId: 'housingUnits',
  minimum: 0,
  maximum: 5000,
  step: 100
}
```

Threshold shape:

```js
{
  outputNumerator: 4,
  inputDenominator: 1
}
```

A sensitivity is a `cliff-candidate` when:

```text
abs(deltaOutput) * inputDenominator
>=
abs(deltaInput) * outputNumerator
```

The comparison uses `BigInt` internally to avoid overflow; only safe integers are emitted.

### 5.3 Sampling plan

The deterministic sample set contains:

- one baseline sample;
- one negative and one positive sample per axis when within bounds;
- bounded positive-positive pair samples for the first `pairLimit` canonical axis pairs.

Duplicate parameter vectors collapse by canonical hash. Samples are sorted by content ID.

### 5.4 Output

```js
{
  format: 'ripple-sparse-topography',
  schemaVersion: '1.0.0',
  approximation: true,
  evaluator: { id, version },
  baseline,
  axes,
  metrics,
  cliffThreshold,
  samples,
  sensitivities,
  interactions,
  topographyHash
}
```

A sensitivity stores signed integer numerators and denominators rather than a floating-point slope. Pair interactions store the combined metric delta minus the two corresponding single-axis deltas.

### 5.5 Non-claims

The sampler does not establish:

- intervention causality;
- treatment effects;
- global model behavior;
- probability;
- confidence intervals;
- real-world calibration;
- policy benefit or harm.

## 6. Bounded deterministic branch-candidate explorer

### 6.1 Purpose

The explorer generates and ranks parameter proposals. It never calls `forkBranch`, never changes a RunGraph, and never executes an intervention.

### 6.2 Public API

```js
exploreBranchCandidates({
  parentRef,
  seedState,
  axes,
  initialCandidates,
  objectives,
  evaluator,
  populationLimit,
  survivorCount,
  generations,
  proposalLimit,
}) -> exploration
```

Parent reference:

```js
{
  graphId,
  parentBranchId,
  forkStepId,
  parentReceiptHash
}
```

Objective:

```js
{
  metricId: 'employment',
  direction: 'maximize',
  weight: 3
}
```

### 6.3 Evolution rule

For each generation:

1. evaluate and de-duplicate the current population;
2. calculate a safe-integer weighted score;
3. rank by score descending, then candidate ID;
4. retain the first `survivorCount` candidates;
5. use the explicit xoshiro128** state to perturb each survivor axis by `-step`, `0`, or `+step` within declared bounds;
6. force one deterministic non-zero perturbation when a draw produces no change;
7. stop at `populationLimit` or a deterministic attempt ceiling;
8. record every generated candidate, parent candidate, generation, metrics, score, and PRNG terminal state.

The algorithm returns a nondominated Pareto frontier calculated from the declared objective directions.

### 6.4 Output and proposals

```js
{
  format: 'ripple-branch-exploration',
  schemaVersion: '1.0.0',
  approximation: true,
  executionAuthority: 'none',
  reviewRequired: true,
  parentRef,
  evaluator: { id, version },
  seedState,
  terminalPrngState,
  config,
  candidates,
  generations,
  paretoFrontier,
  proposals,
  explorationHash
}
```

Each proposal contains only a content-addressed candidate parameter set and its approximate metrics. Proposal status is always `proposed-for-human-review`.

## 7. Multi-resolution subjective memory

### 7.1 Source record

Phase 2 consumes explicit records only:

```js
{
  perspectiveId,
  branchId,
  sequence,
  stepId,
  metricPath,
  objectiveValue,
  perceivedValue,
  scale,
  sourceRef,
  sourceVersion,
  memoryKind,
  generation,
  inheritedFromPerspectiveId
}
```

`memoryKind` is one of:

- `personal`;
- `cultural`;
- `institutional`.

Inheritance must be explicit. The engine does not invent ancestry, transmission, trauma, trust, or collective consensus.

### 7.2 Narrative tension

```js
scoreNarrativeTension(record) -> scoredRecord
```

The exact signed tension is:

```text
perceivedValue - objectiveValue
```

The score also records absolute magnitude and direction (`positive`, `negative`, or `aligned`). It does not label a belief true or false beyond the explicit numeric gap.

### 7.3 Memory windows

```js
buildMemoryWindows({
  records,
  windows,
  currentSequence,
}) -> memoryArtifact
```

Window shape:

```js
{
  windowId: 'short',
  length: 5
}
```

For an included record:

```text
age = currentSequence - record.sequence
weight = window.length - age
```

The artifact stores `weightedTensionNumerator` and `totalWeight`, not a floating-point average. Records are grouped by perspective, branch, and metric path. Short-, medium-, long-, and multi-generational windows may coexist.

## 8. Human-gated anomaly proposal registry

### 8.1 Purpose

The registry converts an existing anomaly or reviewed observation into a branch **proposal**, not a branch.

### 8.2 Public API

```js
createProposalRegistry({ minimumApprovals })
submitBranchProposal(registry, proposal)
appendProposalReview(registry, review)
decideBranchProposal(registry, decision)
getProposalStatus(registry, proposalId)
exportProposalRegistry(registry)
parseProposalRegistry(exported)
```

### 8.3 Proposal

A proposal commits:

- anomaly or observation ID;
- requester identity;
- parent graph/branch/fork receipt reference;
- hypothesis text;
- canonical proposed parameters;
- evidence references;
- `reviewRequired: true`;
- `executionAuthority: 'none'`.

### 8.4 Reviews and decisions

Review disposition is one of:

- `approve-for-manual-simulation`;
- `reject`;
- `needs-evidence`.

Rules:

- the requester cannot review their own proposal;
- each reviewer may submit one review per proposal;
- a positive final decision requires at least `minimumApprovals` distinct approval reviews;
- any rejection blocks positive decision until a new proposal version is submitted;
- a decision is an append-only event;
- no API executes the proposal or mutates a graph.

Derived status is one of:

- `under-review`;
- `needs-evidence`;
- `rejected`;
- `approved-for-manual-simulation`.

## 9. Trustscape scaling and performance evidence

### 9.1 Canonical work profile

```js
profileProjectionWork(projection) -> workProfile
```

The profile contains deterministic counts and a `workUnitCount` calculated from branches, temporal points, causal nodes, edges, subjective records, and expected scene references.

### 9.2 Deterministic chunk plan

```js
planTrustscapeChunks(projection, {
  maxTemporalPointsPerChunk,
}) -> chunkPlan
```

Temporal points are partitioned by canonical branch ID and contiguous sequence ranges. Every chunk commits:

- branch ID;
- start and end sequence;
- ordered temporal-point IDs;
- ordered receipt hashes;
- first previous-receipt hash;
- terminal receipt hash;
- point count;
- chunk hash.

The plan allows incremental verification and future streaming without discarding receipt-chain boundaries.

### 9.3 Capacity assessment

```js
assessTrustscapeCapacity(workProfile, budget) -> assessment
```

The assessment compares deterministic counts against declared safe-integer budgets and reports whether chunking is required. It is not a runtime benchmark.

### 9.4 Noncanonical timing observations

```js
createTimingObservation({
  operationId,
  runtimeId,
  elapsedMicroseconds,
  workProfileHash
}) -> observation
```

The observation contains `canonical: false`. It is never included in a correctness or conformance hash and cannot change an approximation result.

## 10. Error model

Stable Phase-2 codes:

- `E_APPROX_SCHEMA`
- `E_APPROX_EVALUATOR`
- `E_APPROX_OVERFLOW`
- `E_TOPOGRAPHY_AXIS`
- `E_EXPLORATION_CONFIG`
- `E_MEMORY_WINDOW`
- `E_PROPOSAL_SCHEMA`
- `E_PROPOSAL_REVIEW`
- `E_PROPOSAL_DECISION`
- `E_CHUNK_PLAN`

Existing kernel, projection, and Trustscape error codes remain authoritative for their layers.

## 11. Conformance fixture

The fixed Phase-2 fixture must include:

- one sparse topography result;
- one two-generation bounded exploration;
- one multi-window memory artifact;
- one proposal registry reaching `approved-for-manual-simulation` through two independent reviews;
- one Trustscape chunk plan and work profile.

Four fresh Node processes and both Node 22 and Node 24 must emit identical:

- top-level artifact IDs and hashes;
- sample, candidate, proposal, memory-window, and chunk IDs;
- terminal PRNG state;
- Pareto frontier;
- canonical exported-byte SHA-256;
- deterministic counts.

## 12. Verification and review

Phase-2 acceptance must preserve every Phase-0 and Phase-1 literal fixture. The verification report records observed evidence only.

Independent design review is required before any proposal to:

- cut over the browser;
- ingest real data;
- calibrate automatically;
- auto-fork a RunGraph;
- execute an approved proposal;
- publish municipal conclusions;
- treat topography as causal inference;
- treat explicit subjective records as representative consensus.

## 13. Separation from municipal tracks

The Phase-2 module is generic and synthetic. New Bedford or other municipal adapters must live in separate branches, packages, manifests, and evidence reports. A municipal adapter may consume a reviewed kernel API later; it may not redefine kernel identity, projection semantics, or approximation claims.

## 14. Phase boundary

Phase 2 may be implemented on a stacked draft and internally verified while earlier independent reviews remain pending. It may not be merged, tagged, deployed, or treated as an authoritative baseline until all prerequisite review gates are explicitly closed.

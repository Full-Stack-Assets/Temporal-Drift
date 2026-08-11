# Ripple City Phase 2 Approximation Layer v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for isolated synthetic R&D implementation; non-authoritative  
**Base:** `codex/ripple-4d-projection-v1@56c0f79fb6e7d773945a55be67ed6928a7ba8643`  
**Branch:** `codex/ripple-phase2-approximations-v1`

## 1. Purpose

Phase 2 adds bounded deterministic approximation tools above the verified Trust Kernel, RunGraph, and Phase-1 projector. It is an R&D layer, not a scientific calibration layer.

It implements:

1. sparse **sensitivity topography** over declared synthetic branches;
2. deterministic multi-objective ranking of already-declared branches;
3. configurable synthetic memory windows and narrative-tension scoring;
4. advisory anomaly classification and explicit human-review queues;
5. non-authoritative performance instrumentation.

## 2. Claim boundary

The phrase `causal topography` remains a product metaphor. Phase 2 computes **simulated sensitivity**, not causal identification.

Every topography artifact carries:

```text
semanticClass = "approximate-sensitivity"
```

The branch explorer ranks branches already present in a verified RunGraph. It does not create or admit new graph branches automatically. Automatic forking remains deferred pending a separate design review.

Subjective memory is synthetic state supplied to the approximation module. It is not inferred from real residents, social media, biometric signals, or municipal records.

Anomaly classification is advisory. Every anomaly output includes `humanReviewRequired: true`; no classification can recalibrate a model, mutate a run, fork a branch, or authorize an action.

## 3. Sensitivity topography

### API

```js
sampleSensitivityTopography(graph, {
  samples: [
    { branchId, levers: { housing: 1000, transit: 0 } }
  ],
  outcomes: [
    { id: 'count', path: '/count' }
  ],
  cliffThresholds?: { count: 5000 }
})
```

The module:

- verifies the hydrated RunGraph;
- reads each branch terminal `modelState`;
- resolves explicitly declared safe-integer outcome paths;
- sorts samples deterministically by canonical lever vector and branch ID;
- records outcome values and pairwise deltas between neighboring samples;
- marks a cliff only when the absolute declared outcome delta meets an explicit integer threshold.

It does not infer an unobserved response surface, fit a causal model, or extrapolate beyond supplied branches.

## 4. Branch explorer

### API

```js
rankBranches(graph, {
  branchIds,
  objectives: [
    { id, path, direction: 'maximize' | 'minimize', weight }
  ],
  limit
})
```

Rules:

- graph must verify;
- objectives operate only on safe-integer terminal state values;
- weights are safe integers;
- each objective is normalized only against the declared candidate set using exact integer/rational arithmetic represented as numerator/denominator pairs;
- deterministic lexicographic branch ID breaks exact score ties;
- output records every raw objective value, normalized contribution, aggregate score fraction, and rank;
- ranking never mutates or creates branches.

The v1 output is a fitness table, not a policy recommendation.

## 5. Subjective Time approximation

### Memory profile

```js
{
  profileId,
  shortWindow,
  longWindow,
  observations: [
    { logicalTime, value, salience, generation }
  ]
}
```

All fields are synthetic, explicit, safe integers.

`perceivedValue(profile, now)` computes deterministic weighted aggregates over:

- short-term observations within `shortWindow`;
- long-term observations within `longWindow`;
- generation weighting supplied by the observation.

No hidden randomness or ML inference is used.

### Narrative tension

```text
tension = abs(objectiveValue - perceivedValue)
```

The result records objective, perceived, signed gap, absolute tension, and scale. This is a synthetic diagnostic, not a validated psychological measure.

## 6. Human-gated anomaly review

### API

```js
classifyAnomalyForReview(record, thresholds)
createAnomalyReviewQueue(records, thresholds)
```

Classification may assign deterministic labels such as:

- `informational`
- `watch`
- `warning`
- `critical`

based only on explicit absolute-delta thresholds.

Every result includes:

```text
advisoryOnly = true
humanReviewRequired = true
autoForkAllowed = false
autoCalibrationAllowed = false
```

## 7. Performance instrumentation

A standalone benchmark script measures wall-clock runtime and artifact sizes for declared synthetic fixtures. Performance measurements:

- are never included in receipt, RunGraph, projection, or approximation hashes;
- are labeled environment-specific observations;
- do not form correctness gates unless a future benchmark specification pins hardware/runtime classes.

## 8. Deterministic approximation envelope

Approximation outputs are canonical, recursively immutable, schema-versioned, and SHA-256 committed.

Each artifact records source commitments such as:

- `graphId`
- `sourceGraphHash`
- projection hash when applicable
- approximation format/version
- declared configuration
- result hash

## 9. Acceptance gates

Phase 2 requires:

- same declared graph/config => byte-identical topography and ranking artifacts across fresh processes;
- Node 22/24 exact fixture equality;
- branch ranking never changes RunGraph bytes;
- no generated branch is admitted to RunGraph;
- topography output always says `approximate-sensitivity`;
- memory-window results are deterministic and bounded to supplied observations;
- narrative tension is fully reconstructable from stored integer values;
- anomaly review output always requires human review and forbids auto-fork/calibration;
- ambient-randomness scan includes Phase-2 deterministic modules;
- all Phase-0 and Phase-1 acceptance gates remain green.

## 10. Explicitly deferred

- real-data adapters;
- historical calibration authority;
- learned causal graphs;
- automatic branch generation/admission;
- genetic/evolutionary mutation engines;
- municipal decision support claims;
- autonomous policy action;
- networked Causal Commons;
- production cut-over;
- biometric or BCI inputs;
- formal proof systems and cryptographic external attestations.

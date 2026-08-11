# Ripple City Portable Mesh Contracts & Key Lifecycle v1 — Verification Report

**Evidence date:** 2026-08-11  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Base:** `codex/ripple-verification-mesh-v1@a6ba06de43dcefa8ce84c507e5ef9b918cbaa163`  
**Working branch:** `codex/ripple-mesh-contracts-key-lifecycle-v1`  
**Stacked draft pull request:** `#25`  
**Design and plan head:** `5df9994456fa723b6988984d09cf9dd8f5426e50`  
**Verified hardened implementation head:** `be63592a79fb19352b1a52a0a174344adbb2d720`  
**Conformance fixture:** `key-lifecycle-v1`

## Verdict

The bounded Portable Mesh Contracts & Key Lifecycle v1 implementation passed the complete repository `npm run verify` matrix on Node 22 and Node 24 at the hardened implementation head.

Workflow `31539813015` completed successfully:

- Node 22 job `93939424529` — `success`, runtime `v22.23.1`
- Node 24 job `93939424457` — `success`, runtime `v24.18.0`

The implementation adds strict portable schemas, immutable declared key-history records, historical key-status resolution, and registry-aware attestation admission. It does **not** establish real identity, a certificate authority, production PKI, secure key custody, independent governance, remote verifier networking, post-quantum security, external publication, zero-knowledge proof generation, scientific validity, or approval authority. PR #25 remains draft, unmerged, untagged, and undeployed.

## Observed test and static-gate counts

Each supported runtime reported:

| Gate | Observed result |
|---|---:|
| Legacy Bellwether regression | 13 passed |
| Kernel + RunGraph + projection + approximation + frontier + mesh + key-lifecycle tests | 139 passed |
| Acceptance | 11 passed |
| **Total automated tests** | **163 passed** |
| Fail / skipped / cancelled | **0 / 0 / 0** |
| Syntax scan | 54 JavaScript files passed |
| Ambient-randomness scan | 41 deterministic source files passed |

The inherited acceptance matrix remained active:

- 10,000 deterministic seed expansions and draws;
- 1,000 low-level fork-isolation cases;
- 1,000 Bellwether branch/seed shadow-equivalence cases;
- four fresh processes each for RunGraph, 4D projection, Phase 2, Frontier Foundations, Verification Mesh, and Key Lifecycle fixtures;
- replay, receipt verification, tamper detection, inherited schemas, browser fixture integrity, and Trustscape consistency.

## Implemented bounded capabilities

### Eight strict portable schemas

The tranche adds JSON Schema draft 2020-12 contracts for:

1. `crypto-policy-profile-v1`
2. `verification-attestation-v1`
3. `verification-mesh-policy-v1`
4. `verification-mesh-v1`
5. `external-anchor-request-v1`
6. `external-anchor-receipt-v1`
7. `proof-statement-v1`
8. `verification-key-registry-v1`

Each top-level schema:

- uses `type: object`;
- declares all top-level fields in `required`;
- sets `additionalProperties: false`;
- constrains content-addressed IDs and SHA-256 values;
- fixes authority and overclaim-prevention constants;
- validates nested policy, attestation, and key-event records;
- constrains pass/fail failure-code behavior;
- constrains anchor confirmations when publication is false;
- constrains proof statements to `proofSystem: none`, `proofGenerated: false`, and `proofVerified: false`.

The schemas validate portable structure and local field relationships. Runtime verifiers remain necessary for signatures, complete content-ID recomputation, key fingerprints, registry chain semantics, historical intervals, duplicate detection, and cross-artifact binding.

### Immutable declared key registry

`src/mesh/key-registry.js` implements:

- content-addressed registry identity;
- immutable append-only `register`, `rotate`, and `revoke` events;
- strictly increasing global logical time;
- event sequence and previous-event hash continuity;
- Ed25519 SPKI DER canonicalization;
- public-key fingerprint recomputation;
- global key-fingerprint uniqueness;
- one initial registration per verifier node;
- declared-operator continuity across a node’s lifecycle;
- active-predecessor enforcement for rotation;
- active-subject enforcement for revocation;
- no lifecycle events after node revocation;
- terminal registry commitment verification.

Every registry states:

```text
identityBasis = declared-node-and-operator
identityVerified = false
registryAuthority = none
```

### Half-open historical validity intervals

The runtime resolves deterministic key status at a declared logical time:

- `active`
- `not-yet-active`
- `superseded`
- `revoked`
- `unknown-key`
- `identity-mismatch`

For a rotation at logical time 20, the predecessor is valid before 20 and the replacement is valid at 20. For a revocation at 30, the revoked key is not valid at 30.

This supports historically accurate evaluation without retroactively invalidating attestations that were created while their key was active.

### Registry-aware attestation admission

`src/mesh/key-admission.js` requires:

1. valid Verification Mesh v1 cryptographic verification;
2. exact registry/profile binding;
3. an `active` key for the attestation’s declared node, operator, fingerprint, and own logical verification time;
4. node and operator membership in the mesh policy before the evidence can enter the registry-aware bundle.

Admission artifacts record:

```text
cryptographicSignatureValid = true | false
registryStatus
admitted = true | false
identityVerified = false
approvalAuthority = none
```

The additive registry-aware quorum API:

- retains historically rejected admission evidence;
- excludes rejected attestations from quorum;
- rejects cryptographically invalid attestations;
- rejects out-of-policy node or operator evidence even when it would otherwise be retained as rejected evidence;
- delegates admitted evidence to the existing deterministic Verification Mesh quorum.

## Literal cross-runtime conformance fixture

Fixture: `tests/fixtures/key-lifecycle-hashes-v1.json`

Node 22 and Node 24 independently emitted the same values before they were pinned.

| Field | Exact observed value |
|---|---|
| Portable schema-bundle hash | `3e8d433e225711a64c0625f59281e88bc31b12c2dd983112615f9e06fd6d1f28` |
| Registry ID | `key-registry-acd6377ccf14bd31aba777deb017c1008d3f25c450f4343f0cb5e8cc68c2ab16` |
| Empty registry hash | `ab7766686d0869d043070756f4fc7f29542d303b258c6e13b0269694eb466d92` |
| Register event hash | `7e1479b2139dd6f2e23dc21bf7da69c862d5722253372af80ba63c3c47e0d7f1` |
| Rotate event hash | `e9512114e063443899b492cfa0fa71a4907a25572aff12e92738259d3b259423` |
| Revoke event hash | `695f7d3cb44723162c31884197e3301c2fedb0b76bc940f82446a2e4170874c7` |
| Terminal registry hash | `4cdbfef9f07e87367174b567eec4b18f59403160ba11894be8a7c31824bccb4a` |
| Registry canonical bytes SHA-256 | `3c75c247fd93b996d3aab366018c054826244c75314e5b4e428794e7f1305fc9` |
| Alpha key fingerprint | `e3722af5dc7954772e884436ad58d065a2576fa895de45860b285f57d5f93ffe` |
| Beta key fingerprint | `0b403034aec5dbc3ed7b5643d933e7b51b6dd84b8f2389c061d93dd57e93677d` |
| Alpha-at-15 admission hash | `0b86601d6892c68ae07e6af75190edc74992e208bcf5b960d20f42786b3a7ee5` |
| Alpha-at-20 admission hash | `383a1b819d2fc239303f1574d01eee2425bf69c3dfe1ed489551d471784e5d2d` |
| Beta-at-25 admission hash | `61b7bc013ff6c0d8131d85acf7ce8dbb56f47921331febebf00317f727681839` |
| Beta-at-30 admission hash | `f13b4d73ecbac0d007b501d0774a87d38809d4d077ab64d263b021091d6f0b63` |
| Registry-aware bundle hash | `62bccedd9fce633662f2a0249e440b0868c65a997e12905ed2a32a1402c6a726` |

Exact status vectors:

```text
alpha at [9, 10, 19, 20]
→ [not-yet-active, active, active, superseded]

beta at [19, 20, 29, 30]
→ [not-yet-active, active, active, revoked]
```

Exact admission outcomes:

```text
alpha at 15 → admitted
alpha at 20 → rejected
beta at 25  → admitted
beta at 30  → rejected
```

The registry-aware fixture contains one admitted and one rejected attestation and deterministically reaches `quorum-met`. `identityVerified` remains `false`; `approvalAuthority` remains `none`.

## TDD and adversarial-review history

| Workflow | Purpose | Observed result |
|---|---|---|
| `31538604025` | Initial lifecycle and schema contract | Deliberate RED: registry/admission modules and all eight schemas absent; inherited tests remained green |
| `31539334636` | First implementation and unpinned fixture | Unit and schema tests passed; deliberate RED remained only at literal placeholders; both Node majors emitted matching actual values |
| `31539644380` | Policy-scope adversarial regression | Deliberate RED: out-of-policy node/operator evidence could enter the rejected side of a registry-aware bundle |
| `31539813015` | Hardened implementation and complete conformance | GREEN on Node 22 and Node 24 |

### Finding — registry rejection did not enforce mesh-policy scope

**Severity:** Important  
**Disposition:** Fixed with regression test.

The first registry-aware bundle implementation evaluated key history before enforcing the mesh policy’s allowed node and operator sets. A cryptographically valid attestation from an unauthorized node/operator could therefore enter the bundle as rejected evidence, even though it could not count toward quorum.

This was too permissive: key-history rejection is not a substitute for policy authorization. The admission loop now requires every submitted attestation—whether ultimately admitted or rejected by key history—to use a node and operator explicitly allowed by the mesh policy. Out-of-policy evidence fails with `E_KEY_ADMISSION` before bundle construction.

## Claim boundaries and residual risks

The following limitations remain material:

1. **No independent review has occurred.** Internal TDD and adversarial review do not satisfy the independent-review gate.
2. **Identity remains declared, not verified.** The registry does not prove that node or operator strings correspond to real people or organizations.
3. **No certificate authority or signed registry administration exists.** Any caller able to construct a registry can declare its history.
4. **No production key lifecycle exists.** There is no HSM/KMS custody, secure key generation, encrypted private-key storage, certificate chain, expiration, recovery, compromise process, revocation distribution, or administrator multisignature.
5. **No retroactive compromise semantics exist.** A later revocation does not invalidate earlier attestations; compromise backdating requires a separate governance and threat-model design.
6. **v1 uses a strict global logical clock.** Concurrent registry updates and reconciliation are not implemented.
7. **No lifecycle event is permitted after node revocation.** Recovery or re-enrollment requires a future design.
8. **Portable schemas do not verify cryptography or content commitments.** Passing schema validation is not equivalent to passing runtime verification.
9. **No remote verifier network exists.** All conformance evidence is generated locally from public test-only key material.
10. **No post-quantum signature or zero-knowledge proof exists.** Existing Verification Mesh claim boundaries remain unchanged.
11. **No external publication occurs.** Anchor envelopes remain locally verifiable statement containers only.
12. **No authority is created.** The registry and admission bundle cannot merge, tag, deploy, calibrate, admit a branch, approve policy, or authorize municipal action.
13. **Lower-layer independent review gates remain open.** Phase 0, Phase 1, Phase 2, Frontier Foundations, Verification Mesh, and this tranche remain draft pending independent version-pinned review.

## Status

```text
Portable schemas:                         GREEN INTERNALLY
Declared key registry:                    GREEN INTERNALLY
Historical key admission:                 GREEN INTERNALLY
Registry-aware quorum:                    GREEN INTERNALLY
Node 22 hardened-head matrix:             GREEN
Node 24 hardened-head matrix:             GREEN
Tests per runtime:                        163
Syntax scan:                              54 files
Ambient-randomness scan:                  41 files
Draft PR #25:                             OPEN / DRAFT / UNMERGED
Independent review:                       PENDING
Real identity verification:               NOT IMPLEMENTED
Production key custody / PKI:             NOT IMPLEMENTED
Remote verifier network:                  NOT IMPLEMENTED
Post-quantum signatures:                  NOT IMPLEMENTED
Zero-knowledge proofs:                    NOT IMPLEMENTED
External publication:                     NOT PERFORMED
Approval authority:                       NONE
Deployment or cut-over:                   NOT PERFORMED
```

This tranche may be described as a portable schema and declared key-lifecycle prototype. It must not be represented as a production PKI, certificate authority, independently governed registry, real identity system, compromise-recovery system, externally authenticated network, post-quantum system, independently approved baseline, or source of operational authority.
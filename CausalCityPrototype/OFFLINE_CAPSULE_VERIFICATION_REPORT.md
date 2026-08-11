# Ripple City Portable Verification Capsule & Offline Verifier v1 — Verification Report

**Evidence date:** 2026-08-11  
**Repository:** `Full-Stack-Assets/Temporal-Drift`  
**Base:** `codex/ripple-mesh-contracts-key-lifecycle-v1@43fa43a1992421d4591f5a21ffa70f5e3b79003e`  
**Working branch:** `codex/ripple-offline-verification-capsule-v1`  
**Stacked draft pull request:** `#27`  
**Design head:** `b433bd90b20a802c78de82353fd2f5cf63caf47a`  
**Plan head:** `65b71208071fc1819846253d0edf9a8a3e379011`  
**Verified implementation and evidence-fixture head:** `9c6c926ccbd9262ddf922adc6fd1670ea21d1d51`  
**Conformance fixture:** `offline-verification-capsule-v1`

## Verdict

The bounded Portable Verification Capsule & Offline Verifier v1 implementation passed the complete repository `npm run verify` matrix on the supported Node 22 and Node 24 jobs at head `9c6c926ccbd9262ddf922adc6fd1670ea21d1d51`.

Workflow `31541505574` completed successfully:

- Node 22 job `93944684360` — `success`; observed runtime `v22.23.1`
- Node 24 job `93944684448` — `success`

The implementation creates a canonical self-contained evidence capsule and verifies it from an offline file without network calls, secret keys, or writes. It proves possession and internal consistency of the exact carried bytes, signatures, declared key history, portable schema bundle, policy scope, registry admission, and quorum artifact. It does **not** replay the opaque model, authenticate real identities, establish organizational independence, validate scientific claims, prove external publication, provide post-quantum security, verify a zero-knowledge proof, or grant approval authority. PR #27 remains draft, unmerged, untagged, and undeployed.

## Observed test and static-gate counts

The Node 22 job reported:

| Gate | Observed result |
|---|---:|
| Legacy Bellwether regression | 13 passed |
| Kernel + RunGraph + projection + approximation + frontier + mesh + key-lifecycle + capsule tests | 154 passed |
| Acceptance | 12 passed |
| **Total automated tests** | **179 passed** |
| Fail / skipped / cancelled | **0 / 0 / 0** |
| Syntax scan | 56 JavaScript files passed |
| Ambient-randomness scan | 42 deterministic source files passed |

The Node 24 job completed the same repository verification command successfully.

The complete inherited acceptance matrix remained active:

- 10,000 deterministic seed expansions and draws;
- 1,000 low-level fork-isolation cases;
- 1,000 Bellwether branch/seed shadow-equivalence cases;
- four fresh processes each for RunGraph, 4D projection, Phase 2, Frontier Foundations, Verification Mesh, Key Lifecycle, and Offline Capsule fixtures;
- replay, receipt verification, tamper detection, inherited schema checks, browser fixture integrity, and Trustscape consistency.

## Implemented bounded capabilities

### Exact carried-artifact byte commitment

`src/mesh/offline-capsule.js` requires the carried artifact to be an exact canonical-v1 JSON string. Capsule creation and verification:

1. parse the string as JSON;
2. canonicalize the parsed value;
3. require the resulting string to match the supplied string byte-for-byte;
4. hash its UTF-8 bytes with SHA-256;
5. bind the resulting artifact type, identifier, and hash to the mesh policy and every attestation.

The capsule therefore proves possession of bytes matching the signed commitment. It does not prove that those bytes satisfy a domain-specific schema, replay correctly, or contain truthful or scientifically valid information.

### Self-contained portable schema bundle

The capsule embeds the exact eight-schema portable mesh bundle introduced in Key Lifecycle v1:

1. crypto policy profile;
2. verification attestation;
3. verification mesh policy;
4. verification mesh;
5. external-anchor request;
6. external-anchor receipt;
7. future-proof statement;
8. verification key registry.

Creation requires the exact schema names and canonical order, draft 2020-12 declarations, strict object roots, `additionalProperties: false`, and complete top-level required-property coverage. The bundle is content-addressed through `schemaBundleHash`.

The capsule also has a strict portable schema at `schemas/offline-verification-capsule-v1.schema.json`. Passing that schema remains necessary but not sufficient: a shape-valid capsule with a modified signature still fails runtime verification.

### Complete evidence reconstruction

Before a capsule can be emitted, the implementation independently verifies:

- the crypto policy profile;
- the key registry and its complete event chain;
- the mesh policy;
- each Ed25519 attestation;
- exact artifact and profile binding;
- registry-aware historical key admission;
- mesh-policy node/operator scope;
- the reconstructed registry-aware quorum bundle.

The supplied expected bundle must verify and match the independently reconstructed bundle byte-for-byte. An internally inconsistent evidence set cannot be wrapped in a valid capsule.

### Immutable content identity and verification report

Every valid capsule includes:

- `capsuleHash` over the complete capsule core;
- `capsuleId = offline-capsule-<capsuleHash>`;
- recursively immutable owned data;
- a fixed non-authority claim boundary.

`verifyOfflineVerificationCapsule()` reconstructs the complete capsule from its nested evidence instead of trusting stored result flags. It emits an immutable deterministic report with its own `reportHash`.

The fixed claim boundary is:

```text
artifactBytesVerified = commitment-only
modelReplayPerformed = false
realIdentityVerified = false
organizationalIndependenceVerified = false
scientificValidityEstablished = false
externalPublicationVerified = false
postQuantumSecurityEstablished = false
zeroKnowledgeProofVerified = false
approvalAuthority = none
```

Any alteration or omission invalidates the capsule.

### Canonical export and parse

`exportOfflineVerificationCapsule()` emits canonical-v1 JSON only after complete verification.

`parseOfflineVerificationCapsule()`:

- requires the input text itself to be exact canonical-v1 JSON;
- rejects leading/trailing whitespace, pretty printing, reordered representations, and tampering;
- verifies every nested component and commitment;
- returns a fresh immutable capsule reconstructed from verified evidence.

### Dependency-light offline CLI

`scripts/verify-offline-capsule.js` accepts exactly one file path:

```text
node scripts/verify-offline-capsule.js path/to/capsule.json
```

It:

- reads one UTF-8 file;
- performs canonical parsing and complete capsule verification;
- emits one canonical JSON report to stdout and exits zero only for a valid capsule;
- emits a stable canonical JSON error to stderr and exits nonzero for missing, ambiguous, noncanonical, or tampered input;
- writes no files;
- imports no network modules and performs no network call.

Its output is deterministic for fixed capsule bytes and supported runtime semantics.

## Literal cross-runtime conformance fixture

Fixture: `tests/fixtures/offline-capsule-hashes-v1.json`

Node 22 and Node 24 independently emitted the same values before they were pinned.

| Field | Exact observed value |
|---|---|
| Artifact hash | `a05b5fefbe5473a9fcc81d3736d815a89632ba40db5f0d9263274f571fc2ed35` |
| Artifact byte length | `97` |
| Schema-bundle hash | `74f9d9a7bc5ec3c9dce16cca38dcec7eaeeb8ae52f61988a43af08d487f26985` |
| Key-registry hash | `4c09b6af52c419ebbab8ad22a8a7c7818e36396c80385c6b47cf1117efd416a2` |
| Alpha attestation ID | `attestation-36cf57e8417775c05f9cb13a456afb7bcc65af27a45210120796e5d7563df90f` |
| Beta attestation ID | `attestation-cf551e4699793d8d4552f1cd82960fe4ffbd1313c1041d0213cde753159245aa` |
| Registry-aware bundle hash | `2d4f1885f3e82e80c2a89bcafae592d3bb4b038a9b17f5dbe0f36ada171379f4` |
| Capsule ID | `offline-capsule-edd4b40cd1b981897932a564e501e3a6ccc141bca2a5ddfe198566061c27d998` |
| Capsule hash | `edd4b40cd1b981897932a564e501e3a6ccc141bca2a5ddfe198566061c27d998` |
| Capsule canonical bytes SHA-256 | `f26d37f0ac7fde3d31038df22dca54226bb2b93c3d7d71129f6754fec88e2251` |
| Capsule byte length | `29099` |
| Verification report hash | `3884dca87b951f2d82cae6577ef6150999429b291f5bb4c47226697b13f48347` |
| CLI stdout SHA-256 | `d0c3f41a028e06b6e2beb38ad60bcf7c29ee49150bfa695c4bf5ed58969cde2e` |
| CLI exit code | `0` |

The fixture carries two registered verifier nodes, two valid Ed25519 attestations, and a reconstructed two-operator registry-aware quorum. Its report records:

```text
artifactBytesVerified = true
quorumStatus = quorum-met
identityVerified = false
independentReviewEstablished = false
scientificValidityEstablished = false
approvalAuthority = none
```

The keys are public test-only fixtures and provide no production security.

## TDD and adversarial-review history

| Workflow | Purpose | Observed result |
|---|---|---|
| `31540819347` | Initial capsule contract | Deliberate RED: capsule module, portable schema, and CLI absent; inherited behavior remained intact |
| `31541133574` | First implementation and unpinned fixture | Unit, schema, CLI, canonicalization, and source-gate tests passed; deliberate RED remained only at literal placeholders; Node 22/24 emitted matching actual values |
| `31541505574` | Pinned fixture plus Unicode ownership regression | GREEN on Node 22 and Node 24 |

### Unicode ownership review

The adversarial review added a regression comparing canonically equivalent composed and decomposed strings inside a nested schema title. Both capsule construction paths produced deeply equal immutable capsules containing NFC-owned strings and identical capsule identities.

No production correction was required. The existing immutable ownership layer already normalizes nested strings before storage, eliminating the feared condition in which two unequal in-memory objects could share one canonical content commitment.

### Other adversarial coverage

The automated tranche also rejects:

- noncanonical artifact strings;
- artifact/policy/attestation hash substitution;
- malformed or reordered schema bundles;
- schema strictness weakening;
- invalid signatures;
- tampered key registries;
- stale expected admission-bundle identities;
- stale nested attestation IDs;
- mutated fixed claim boundaries;
- stale capsule hashes or IDs;
- noncanonical exported capsule text;
- hidden, symbolic, accessor-backed, sparse, or unknown input state;
- missing or ambiguous CLI arguments;
- missing, noncanonical, or tampered capsule files.

## Claim boundaries and residual risks

The following limitations remain material:

1. **No independent review has occurred.** Local offline verification and internal adversarial testing do not establish independent approval.
2. **The carried artifact is opaque.** v1 verifies exact bytes and evidence commitments but performs no domain-specific model replay or state-chain verification of the carried object.
3. **No executable code or adapter is bundled.** Reproducibility depends on separate lower-layer code and fixtures.
4. **The CLI trusts its local runtime and verifier source.** There is no reproducible binary, signed distribution, measured boot, secure enclave, or formal proof of the verifier executable.
5. **The portable schema bundle is structurally checked, not executed by a complete standards-certified JSON Schema engine inside the capsule verifier.**
6. **Identity remains declared.** The key registry does not authenticate real people or organizations.
7. **Test private keys are public fixtures.** They provide deterministic conformance only.
8. **No remote verifier network exists.** The capsule can be transferred manually, but no authenticated transport, discovery, or independently operated node is implemented.
9. **No external publication is verified.** External-anchor envelopes remain outside this capsule fixture and do not prove a blockchain or ledger record.
10. **No post-quantum signature or zero-knowledge proof exists.** The inherited claim boundaries remain unchanged.
11. **No archival packaging, compression, detached file signature, media type, or long-term retention format exists.** The capsule is one canonical JSON document.
12. **No authority is created.** A valid capsule cannot merge, tag, deploy, calibrate, admit a branch, approve policy, or authorize municipal action.
13. **Lower-layer review gates remain open.** Phase 0, Phase 1, Phase 2, Frontier Foundations, Verification Mesh, Key Lifecycle, and this tranche remain draft pending independent, version-pinned review.

## Status

```text
Offline capsule construction:               GREEN INTERNALLY
Complete offline verification:              GREEN INTERNALLY
Canonical export / parse:                   GREEN INTERNALLY
Offline CLI:                                GREEN INTERNALLY
Node 22 implementation-head matrix:         GREEN
Node 24 implementation-head matrix:         GREEN
Tests per runtime:                          179
Syntax scan:                                56 files
Ambient-randomness scan:                    42 files
Draft PR #27:                               OPEN / DRAFT / UNMERGED
Independent review:                         PENDING
Model replay inside capsule:                NOT PERFORMED
Real identity verification:                 NOT IMPLEMENTED
Remote verifier operation:                  NOT IMPLEMENTED
External publication:                       NOT VERIFIED
Post-quantum signatures:                    NOT IMPLEMENTED
Zero-knowledge proofs:                      NOT IMPLEMENTED
Approval authority:                         NONE
Deployment or cut-over:                     NOT PERFORMED
```

This tranche may be described as a deterministic self-contained offline evidence verifier. It must not be represented as an independently operated verifier node, a model-replay proof, a real identity system, scientific validation, external anchor proof, post-quantum security, zero-knowledge privacy, production readiness, or a source of operational authority.
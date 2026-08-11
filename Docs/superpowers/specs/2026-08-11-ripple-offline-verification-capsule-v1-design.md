# Ripple City Portable Verification Capsule & Offline Verifier v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for isolated synthetic R&D only  
**Base:** `codex/ripple-mesh-contracts-key-lifecycle-v1@43fa43a1992421d4591f5a21ffa70f5e3b79003e`  
**Branch:** `codex/ripple-offline-verification-capsule-v1`

## 1. Purpose

The current stack can construct and verify signed attestations, declared quorum artifacts, portable schemas, and declared key history. Those objects are still distributed as separate values and are normally verified through repository tests.

This tranche creates one self-contained, canonical **verification capsule** plus a dependency-light offline CLI. A third process can receive the capsule as a file and verify:

- exact artifact-byte possession and SHA-256 commitment;
- canonical JSON encoding of the carried artifact;
- crypto-policy integrity;
- portable schema-bundle integrity;
- key-registry integrity and historical key status;
- Ed25519 attestation signatures;
- mesh-policy scope;
- registry-aware admission and quorum reconstruction;
- capsule content identity and tamper resistance.

It does not replay the model represented by the opaque artifact, authenticate real identities, prove organizational independence, contact remote nodes, publish to an external ledger, create a zero-knowledge proof, or grant approval authority.

## 2. Capsule contents

`createOfflineVerificationCapsule(input)` accepts:

```js
{
  capsuleLabel,
  artifactType,
  artifactId,
  artifactCanonicalJson,
  cryptoProfile,
  schemaBundle,
  keyRegistry,
  meshPolicy,
  attestations,
  expectedRegistryAwareBundle,
}
```

The capsule contains:

```text
format = offline-verification-capsule
schemaVersion = 1.0.0
capsuleLabel
artifactType
artifactId
artifactEncoding = canonical-v1-json-utf8
artifactCanonicalJson
artifactByteLength
artifactHash
cryptoProfile
schemaBundle
schemaBundleHash
keyRegistry
meshPolicy
attestations
expectedRegistryAwareBundle
claimBoundary
capsuleHash
capsuleId
```

The capsule owns immutable copies of every input container.

## 3. Artifact-byte contract

The capsule carries the exact artifact as a UTF-8 canonical-v1 JSON string.

Creation and verification require:

1. valid UTF-8 JavaScript string input;
2. JSON parsing succeeds;
3. parsing and canonical-v1 serialization reproduce the exact original string byte-for-byte;
4. SHA-256 over the UTF-8 bytes equals `artifactHash`;
5. every attestation and the mesh policy bind to the same `artifactType` and `artifactHash`.

This proves possession of bytes matching the signed commitment. It does not prove that the carried object satisfies a model-specific schema, replays correctly, or represents truthful input data.

## 4. Schema bundle

The capsule carries the eight portable schemas introduced by Key Lifecycle v1 as an ordered array:

```js
[
  { name, schema },
  ...
]
```

The names must match the exact expected set and canonical order. Each schema must retain:

- JSON Schema draft 2020-12;
- top-level `type: object`;
- `additionalProperties: false`;
- complete top-level `required` coverage.

`schemaBundleHash` commits the canonical schema bundle. Runtime verification checks the hash and structural strictness. The capsule verifier does not claim to be a general JSON Schema implementation.

## 5. Capsule construction

Creation performs the complete offline verification before emitting a capsule:

1. validate and hash the artifact bytes;
2. verify the crypto profile;
3. validate schema-bundle structure and hash it;
4. verify the key registry;
5. verify the mesh policy;
6. require exact artifact/profile binding;
7. verify every attestation cryptographically;
8. reconstruct registry-aware admission and quorum;
9. require byte-identical equality with `expectedRegistryAwareBundle`;
10. construct a fixed claim-boundary object;
11. derive `capsuleHash` and `capsuleId`.

A capsule cannot be created around an internally inconsistent evidence set.

## 6. Capsule verification

`verifyOfflineVerificationCapsule(capsule)` returns an immutable report:

```text
ok
firstMismatch
capsuleId
capsuleHash
artifactHash
artifactBytesVerified
cryptoProfileVerified
schemaBundleVerified
keyRegistryVerified
attestationCount
cryptographicallyValidAttestationCount
registryAdmittedCount
registryRejectedCount
quorumStatus
identityVerified = false
independentReviewEstablished = false
scientificValidityEstablished = false
approvalAuthority = none
reportHash
```

Verification independently recomputes all content IDs and reruns the complete construction logic. It never repairs malformed input.

## 7. Canonical export and parse

`exportOfflineVerificationCapsule(capsule)` returns canonical-v1 JSON.

`parseOfflineVerificationCapsule(canonicalJson)` requires the input string itself to be canonical-v1. It parses, verifies, and returns an immutable executable capsule. Noncanonical whitespace, key order, Unicode representation, duplicate-key normalization collisions, or tampering fail closed.

## 8. Offline CLI

`scripts/verify-offline-capsule.js` accepts exactly one capsule file path:

```text
node scripts/verify-offline-capsule.js path/to/capsule.json
```

Behavior:

- reads the file as UTF-8;
- requires canonical-v1 capsule JSON;
- runs `parseOfflineVerificationCapsule()` and full verification;
- writes one canonical JSON verification report to stdout;
- exits `0` only when `ok: true`;
- writes a stable JSON error report to stderr and exits nonzero otherwise;
- performs no network calls and writes no files.

The CLI output contains no environment-specific timing values and is deterministic for fixed capsule bytes and runtime-supported semantics.

## 9. Claim boundary

Every capsule contains the exact immutable claim boundary:

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

Any mutation or omission invalidates the capsule.

## 10. Stable errors

Public construction and parsing use stable codes:

- `E_CAPSULE_SCHEMA`
- `E_CAPSULE_ARTIFACT`
- `E_CAPSULE_SCHEMA_BUNDLE`
- `E_CAPSULE_EVIDENCE`
- `E_CAPSULE_CANONICAL`

Stored-artifact verification returns immutable reports where practical.

## 11. Portable capsule schema

Add `offline-verification-capsule-v1.schema.json` with strict top-level and nested shapes. Passing the schema is not equivalent to passing capsule verification.

## 12. Conformance fixture

The fixture builds a small canonical artifact, uses the existing public test keys, registers two verifier nodes, creates two passing attestations, reconstructs a two-node registry-aware quorum, embeds the portable schema bundle, and creates one capsule.

Four fresh processes and Node 22/24 must emit identical:

- artifact hash and byte length;
- schema-bundle hash;
- registry hash;
- attestation IDs;
- registry-aware bundle hash;
- capsule hash and ID;
- capsule canonical-byte SHA-256 and length;
- verification report hash;
- CLI stdout bytes.

Tampered artifact bytes, signatures, registry history, expected bundle, schema bundle, claim boundary, capsule hash, and noncanonical exports must fail.

## 13. Acceptance gates

- capsule creation verifies every component before emission;
- artifact bytes are exact canonical-v1 JSON;
- all attestations bind to the carried artifact and profile;
- schema names and bundle hash are exact;
- registry and registry-aware quorum reconstruct exactly;
- capsule and report IDs are fully recomputed;
- export/parse is byte-stable;
- CLI succeeds for valid input and fails for tampered/noncanonical input;
- no network or filesystem side effects beyond reading the requested file;
- literal fresh-process and Node 22/24 conformance;
- all inherited tests, fixtures, syntax, and randomness gates remain green.

## 14. Deferred work

Separate reviews remain required for model-specific replay adapters, executable code bundling, remote transport, authenticated node discovery, secure distribution, archive compression, detached signatures over capsule files, real identity, certificate authorities, production custody, external ledger publication, post-quantum signatures, zero-knowledge proofs, and operational authority.

## 15. Claim boundary summary

This tranche may be described as a deterministic self-contained offline evidence verifier. It must not be described as an independently operated node, model-replay proof, real identity system, scientific validation, external anchor proof, post-quantum system, zero-knowledge system, or source of approval authority.
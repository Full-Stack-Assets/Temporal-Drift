# Ripple City Verification Mesh & Crypto-Agility Foundations v1 — Design Specification

**Date:** 2026-08-11  
**Status:** Approved for isolated synthetic R&D only  
**Base:** `codex/ripple-frontier-foundations-v1@02ef6e0208d70838c0077195e705abfb245dc058`  
**Branch:** `codex/ripple-verification-mesh-v1`

## 1. Purpose

This tranche implements a bounded, auditable foundation for third-party verification without pretending that envelope construction proves real organizational independence, post-quantum security, public-ledger publication, zero-knowledge privacy, or scientific validity.

It covers currently feasible forms of:

- explicit crypto-policy profiles;
- Ed25519-signed verification attestations over content-addressed artifacts;
- deterministic quorum aggregation from declared verifier operators;
- external-anchor request and receipt envelopes;
- public statement contracts suitable for later zero-knowledge proof systems;
- fresh-process and Node 22/24 conformance fixtures.

The tranche is additive and non-authoritative. It does not change the Trust Kernel, RunGraph, 4D projection, Trustscape, approximation, or frontier artifact semantics.

## 2. Architectural boundary

The Trust Kernel remains the root of deterministic evidence. Verification Mesh v1 consumes already content-addressed artifacts and produces adjunct evidence. It cannot:

- mutate a run, branch, graph, projection, scene, or source artifact;
- create or admit a branch;
- recalibrate a model;
- approve a policy or municipal action;
- prove that a verifier is organizationally independent;
- infer that a valid signature makes the signed claim scientifically true.

The flow is:

```text
Verified content-addressed artifact
→ crypto-policy profile
→ verifier statement
→ deterministic signature envelope
→ local cryptographic verification
→ declared-operator quorum aggregation
→ optional external-anchor envelope
→ optional future-proof public statement
```

## 3. Crypto-policy profile

`createCryptoPolicyProfile(input)` produces an immutable, content-addressed policy describing the algorithms and encodings allowed for this tranche.

The v1 executable profile is deliberately narrow:

```text
hashAlgorithm = sha256
signatureAlgorithm = ed25519
publicKeyEncoding = spki-der-base64url
privateKeyInput = PKCS#8 PEM supplied by caller
signatureEncoding = base64url
postQuantumMode = not-implemented
hybridSignatureRequired = false
```

The profile records that SHA-256 and Ed25519 are the implemented classical algorithms. It does not label them quantum-resistant. Unsupported algorithm names, hidden fields, accessors, symbols, malformed profiles, or attempts to set a post-quantum mode other than `not-implemented` fail closed.

The purpose of the profile is crypto agility at the data-contract level: future versions can introduce new algorithm identifiers without silently changing v1 commitments.

## 4. Signed verification attestations

`createVerificationAttestation(input, privateKeyPem, cryptoProfile)` signs a canonical statement containing:

- artifact type;
- artifact identifier;
- artifact hash;
- verifier node ID;
- declared operator ID;
- verification method and version;
- logical verification time;
- runtime descriptor;
- evidence hash;
- crypto-profile ID;
- result: `pass` or `fail`;
- optional stable failure-code list.

The signed bytes exclude the signature itself and are serialized by canonical-v1. The returned envelope includes:

- statement hash;
- attestation ID;
- public key in SPKI DER base64url;
- public-key fingerprint;
- Ed25519 signature in base64url;
- `independenceStatus: declared-not-proven`;
- `executionAuthority: none`.

`verifyVerificationAttestation()` independently recomputes every content identifier, key fingerprint, profile binding, and signature. Any mutation fails verification.

A cryptographically valid `pass` means only that the holder of the corresponding private key signed the declared statement. It does not establish reviewer competence, independence, data accuracy, causal truth, or approval authority.

## 5. Verification mesh and quorum artifact

`createVerificationMeshPolicy(input)` defines:

- network ID;
- artifact type and hash;
- crypto-profile ID;
- minimum passing attestations;
- minimum distinct declared operators;
- allowed verifier node IDs;
- allowed operator IDs;
- whether distinct key fingerprints are required.

`aggregateVerificationMesh(policy, attestations, cryptoProfile)`:

1. verifies every attestation cryptographically;
2. requires exact artifact and profile binding;
3. rejects duplicate node IDs, duplicate attestation IDs, and—when configured—duplicate key fingerprints;
4. sorts attestations canonically;
5. counts passing attestations and declared operators;
6. emits `quorum-met` or `quorum-not-met`;
7. preserves failing attestations as evidence without counting them toward quorum.

The mesh artifact records:

```text
independenceBasis = declared-operator-identity
independenceVerified = false
approvalAuthority = none
```

The implementation can enforce declared distinctness but cannot prove real-world organizational independence.

## 6. External-anchor envelopes

`createAnchorRequest(input)` produces a content-addressed request that commits:

- source artifact hash;
- crypto-profile ID;
- requested external network identifier;
- anchor commitment hash;
- logical request time;
- metadata hash.

`createAnchorReceipt(request, input)` produces a locally verifiable envelope binding:

- the request ID and anchor commitment;
- external provider ID;
- external record identifier;
- provider evidence hash;
- logical anchor time;
- confirmation count supplied by the caller.

`verifyAnchorReceipt()` verifies internal consistency only. Every receipt states:

```text
externalPublicationPerformed = caller-declared
externalVerificationRequired = true
externalNetworkAuthority = none
```

No blockchain or distributed-ledger API is called in v1. A syntactically and cryptographically valid envelope is not proof that an external record exists; external verification remains a separate responsibility.

## 7. Future zero-knowledge public statements

`createProofStatement(input)` creates a content-addressed public statement contract for one of these bounded statement types:

- `receipt-chain-validity`;
- `terminal-commitment-membership`;
- `manifest-conformance`.

It contains only declared public inputs and a private-witness commitment hash. It explicitly records:

```text
proofSystem = none
proofGenerated = false
proofVerified = false
statementOnly = true
executionAuthority = none
```

`verifyProofStatement()` verifies canonical structure and content addressing. It does not generate or verify a zero-knowledge proof.

## 8. Error handling

All modules fail closed with stable `TrustKernelError` codes:

- `E_CRYPTO_PROFILE_SCHEMA`
- `E_ATTESTATION_SCHEMA`
- `E_ATTESTATION_SIGNATURE`
- `E_MESH_POLICY_SCHEMA`
- `E_MESH_ATTESTATION`
- `E_ANCHOR_SCHEMA`
- `E_PROOF_STATEMENT_SCHEMA`

Public verification functions return immutable reports where appropriate and never repair malformed artifacts.

## 9. Determinism and conformance

The conformance fixture uses a committed test-only Ed25519 key. Because Ed25519 signing is deterministic for fixed message and key material, fresh Node processes must produce byte-identical:

- crypto-profile ID;
- public-key fingerprint;
- attestation IDs, statement hashes, and signatures;
- mesh-policy ID and mesh hash;
- quorum result and canonical attestation order;
- anchor request and receipt hashes;
- proof-statement ID and canonical bytes hash.

The fixture must match on Node 22 and Node 24. The private test key is public test material and must never be used for real attestations.

## 10. Acceptance gates

Verification Mesh & Crypto-Agility Foundations v1 requires:

- exact algorithm/profile validation;
- deterministic Ed25519 signatures from fixed test material;
- signature tamper rejection;
- profile, artifact, operator, key, and node binding;
- deterministic quorum aggregation;
- duplicate-node/key/attestation rejection;
- failing attestations excluded from quorum but retained as evidence;
- anchor envelopes that cannot claim externally verified publication;
- proof statements that cannot claim a proof exists;
- fresh-process literal conformance;
- identical Node 22/24 commitments;
- syntax and ambient-randomness scanners covering every `src/mesh/*.js` module;
- every inherited lower-layer gate remaining green.

## 11. Deferred capabilities

Separate design and threat-model reviews remain required for:

- actual post-quantum signatures or hybrid classical/PQ envelopes;
- public blockchain or distributed-ledger publication;
- zero-knowledge proof generation and verification;
- hardware security modules and key custody;
- certificate chains, revocation, and key rotation;
- remotely operated independent verifier nodes;
- network transport, gossip, consensus, and Byzantine-fault assumptions;
- production identity, authorization, or municipal approval;
- cross-language signature/conformance implementations;
- formal machine-checked proofs.

## 12. Claim boundary

This tranche may be described as a deterministic signed-attestation and declared-quorum prototype. It must not be described as independently approved, decentralized, post-quantum secure, zero-knowledge private, publicly anchored, production ready, or scientifically validated unless those properties are separately implemented and evidenced.
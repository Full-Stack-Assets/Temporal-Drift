# Ripple Verification Federation & Crypto-Agility v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cryptographically attributable verifier attestations, deterministic quorum aggregation, revocation, and external-anchor evidence envelopes over already-committed Ripple artifacts without granting mutation or release authority.

**Architecture:** Add a dependency-free `src/federation/` layer that reuses `canonical-v1`, SHA-256, deep immutability, and stable Trust Kernel errors. Ed25519 signing uses Node built-in `node:crypto`; every public artifact is canonical, immutable, content-addressed, and separately schema-validated. Quorum and anchor logic consume signed or externally supplied evidence but never call simulation mutation, GitHub merge/tag APIs, external networks, or policy execution.

**Tech Stack:** ECMAScript modules; Node 22/24; `node:crypto` Ed25519; existing canonical-v1/SHA-256 primitives; JSON Schema 2020-12; Node test runner; GitHub Actions matrix.

## Global Constraints

- Preserve the exact Frontier Foundations v1 base `02ef6e0208d70838c0077195e705abfb245dc058`.
- No npm dependencies.
- No wall-clock reads, ambient randomness, or unordered identity inputs.
- v1 hash algorithm is `sha256`; v1 implemented signature algorithm is `ed25519` only.
- No post-quantum-security claim, blockchain-finality claim, zero-knowledge claim, scientific-validity claim, municipal-authority claim, merge/tag/cut-over authority, or reviewer-independence claim.
- Every invalid deterministic artifact fails closed with a stable error code.
- All inherited Phase-0/1/2/frontier tests and commitments remain unchanged.
- Every new deterministic source file must be included by syntax and ambient-randomness scanners.

---

### Task 1: Crypto profile and verifier registry

**Files:**
- Create: `CausalCityPrototype/src/federation/crypto-profile.js`
- Create: `CausalCityPrototype/src/federation/verifier-registry.js`
- Test: `CausalCityPrototype/tests/kernel/federation-registry.test.js`

**Interfaces:**
- Consumes: `normalizeCanonicalValue(value)`, `sha256Hex(value)`, `cloneAndFreeze(value)`, `TrustKernelError`.
- Produces: `createCryptoProfile(config)`, `verifyCryptoProfile(profile)`, `createVerifierRegistry(config, profile)`, `verifyVerifierRegistry(registry, profile)`.

- [ ] **Step 1: Write failing tests for a canonical profile and order-independent verifier registry**

```js
const profile = createCryptoProfile({ profileVersion: 'federation-crypto-v1' });
assert.equal(profile.canonicalization, 'canonical-v1');
assert.deepEqual(profile.hashAlgorithms, ['sha256']);
assert.deepEqual(profile.signatureAlgorithms, ['ed25519']);
assert.equal(profile.primarySignatureAlgorithm, 'ed25519');
assert.match(profile.profileHash, /^[a-f0-9]{64}$/u);

const registryA = createVerifierRegistry({
  registryVersion: 'verifier-registry-v1',
  cryptoProfileHash: profile.profileHash,
  verifiers: [VERIFIER_B, VERIFIER_A],
}, profile);
const registryB = createVerifierRegistry({
  registryVersion: 'verifier-registry-v1',
  cryptoProfileHash: profile.profileHash,
  verifiers: [VERIFIER_A, VERIFIER_B],
}, profile);
assert.equal(registryA.registryHash, registryB.registryHash);
assert.deepEqual(registryA, registryB);
```

Also assert duplicate verifier IDs, duplicate key IDs, unknown algorithms, non-positive weights, invalid logical intervals, hidden/symbol/accessor fields, and stale `profileHash`/`registryHash` fail with `E_CRYPTO_PROFILE` or `E_VERIFIER_REGISTRY`.

- [ ] **Step 2: Run the new test and confirm RED because federation modules do not exist**

Run: `cd CausalCityPrototype && node --test tests/kernel/federation-registry.test.js`

Expected: module-not-found failure for `src/federation/crypto-profile.js`.

- [ ] **Step 3: Implement minimal canonical profile and registry functions**

Profile identity template:

```js
const core = {
  profileVersion,
  canonicalization: 'canonical-v1',
  hashAlgorithms: ['sha256'],
  signatureAlgorithms: ['ed25519'],
  primarySignatureAlgorithm: 'ed25519',
  unsupportedFutureAlgorithms: [],
};
return cloneAndFreeze({ ...core, profileHash: sha256Hex(core) });
```

Registry identity template sorts descriptors by canonical `verifierId` then `keyId`, validates SPKI Base64 as non-empty canonical strings, and hashes `{ registryVersion, cryptoProfileHash, verifiers }`.

- [ ] **Step 4: Run the registry tests and full inherited kernel tests**

Run:

```bash
cd CausalCityPrototype
node --test tests/kernel/federation-registry.test.js
npm run test:kernel
```

Expected: new tests pass and inherited kernel tests remain green.

- [ ] **Step 5: Commit**

Commit message: `feat: add crypto profile and verifier registry`

---

### Task 2: Ed25519 attestation signing and verification

**Files:**
- Create: `CausalCityPrototype/src/federation/attestation.js`
- Test: `CausalCityPrototype/tests/kernel/federation-attestation.test.js`
- Create: `CausalCityPrototype/tests/fixtures/federation-ed25519-test-key-v1.json`

**Interfaces:**
- Consumes: `createPrivateKey`, `createPublicKey`, `sign`, `verify` from `node:crypto`; registry/profile verification APIs from Task 1.
- Produces: `createVerificationAttestation(unsignedPayload, privateKeyPem, registry, profile)`, `verifyVerificationAttestation(attestation, registry, profile, revocationLedger = null)`.

- [ ] **Step 1: Add a fixed test-only Ed25519 key fixture and failing signature tests**

The fixture stores a non-production PKCS8 private PEM and SPKI public PEM/Base64 representation exclusively for deterministic conformance tests.

Test payload:

```js
{
  attestationVersion: 'verification-attestation-v1',
  registryHash: registry.registryHash,
  verifierId: 'reviewer-a',
  keyId: 'reviewer-a-ed25519-v1',
  logicalTime: 10,
  subjectType: 'frontier-foundations',
  subjectId: 'frontier-foundations-v1',
  subjectHash: '02ef6e0208d70838c0077195e705abfb245dc058'.padEnd(64, '0').slice(0, 64),
  verificationProcedureId: 'npm-run-verify-v1',
  verificationProcedureHash: 'a'.repeat(64),
  verdict: 'pass',
  findingsHash: null,
  limitationsHash: 'b'.repeat(64),
}
```

Assertions:

```js
const attestation = createVerificationAttestation(payload, PRIVATE_PEM, registry, profile);
assert.equal(attestation.algorithm, 'ed25519');
assert.equal(verifyVerificationAttestation(attestation, registry, profile).ok, true);
assert.equal(createVerificationAttestation(payload, PRIVATE_PEM, registry, profile).signatureBase64, attestation.signatureBase64);
```

Tamper subject hash, procedure hash, verdict, verifier ID, key ID, and signature independently; each must fail.

- [ ] **Step 2: Run and confirm RED because `attestation.js` is absent**

Run: `cd CausalCityPrototype && node --test tests/kernel/federation-attestation.test.js`

- [ ] **Step 3: Implement canonical Ed25519 signing**

Canonical unsigned bytes are exactly `canonicalBytes(unsignedPayload)`. Verify that the private key's derived SPKI public key matches the registry descriptor before signing. The attestation hash commits `{ ...unsignedPayload, algorithm, signatureBase64 }`.

- [ ] **Step 4: Add wrong-key and validity-window tests**

A verifier with `validFromLogicalTime: 5` and `validUntilLogicalTime: 20` must reject attestations at 4 and 21. A private key whose public key does not match `keyId` fails before signing. All errors are stable `TrustKernelError` codes.

- [ ] **Step 5: Run tests and commit**

Run: `cd CausalCityPrototype && node --test tests/kernel/federation-attestation.test.js && npm run test:kernel`

Commit: `feat: add signed verification attestations`

---

### Task 3: Append-only revocation ledger

**Files:**
- Create: `CausalCityPrototype/src/federation/revocation.js`
- Test: `CausalCityPrototype/tests/kernel/federation-revocation.test.js`

**Interfaces:**
- Produces: `createRevocationLedger(registryHash)`, `appendVerifierRevocation(ledger, record)`, `verifyRevocationLedger(ledger)`, `isKeyRevokedAt(ledger, { verifierId, keyId, logicalTime })`.

- [ ] **Step 1: Write failing immutable-chain tests**

```js
let ledger = createRevocationLedger(registry.registryHash);
const before = canonicalString(ledger);
ledger = appendVerifierRevocation(ledger, {
  verifierId: 'reviewer-b',
  keyId: 'reviewer-b-ed25519-v1',
  logicalTime: 30,
  reasonCode: 'key-compromise',
  sourceEvidenceHash: 'c'.repeat(64),
});
assert.equal(canonicalString(createRevocationLedger(registry.registryHash)), before);
assert.equal(isKeyRevokedAt(ledger, { verifierId: 'reviewer-b', keyId: 'reviewer-b-ed25519-v1', logicalTime: 29 }), false);
assert.equal(isKeyRevokedAt(ledger, { verifierId: 'reviewer-b', keyId: 'reviewer-b-ed25519-v1', logicalTime: 30 }), true);
```

Also test non-monotonic logical time, duplicate revocation, registry mismatch, malformed hash, and chain tampering.

- [ ] **Step 2: Run RED**

Run: `cd CausalCityPrototype && node --test tests/kernel/federation-revocation.test.js`

- [ ] **Step 3: Implement content-addressed append-only records**

Each record commits all fields plus `previousRevocationHash`. Ledger verification recomputes every record and link in order.

- [ ] **Step 4: Integrate revocation into attestation verification**

`verifyVerificationAttestation(..., revocationLedger)` rejects an attestation when its key is revoked at or before the attestation logical time with `E_ATTESTATION_REVOKED`.

- [ ] **Step 5: Run tests and commit**

Commit: `feat: add verifier revocation ledger`

---

### Task 4: Deterministic quorum aggregation

**Files:**
- Create: `CausalCityPrototype/src/federation/quorum.js`
- Test: `CausalCityPrototype/tests/kernel/federation-quorum.test.js`

**Interfaces:**
- Produces: `createQuorumPolicy(config)`, `evaluateVerificationQuorum(input)`.

- [ ] **Step 1: Write failing tests for pass, fail, conflict, insufficient quorum, duplicate suppression, role requirements, and order independence**

Example policy:

```js
const policy = createQuorumPolicy({
  policyVersion: 'quorum-policy-v1',
  minimumDistinctVerifiers: 2,
  minimumPassWeight: 2,
  maximumFailWeight: 0,
  allowAbstain: true,
  requiredRoles: ['security-review', 'reproducibility-review'],
});
```

Two valid pass attestations from distinct required roles produce `quorum-pass`. Reordering attestations yields byte-identical output. Repeating the same verifier does not increase distinct count or weight. A valid fail attestation yields `conflicted` when pass and fail evidence coexist and the policy cannot resolve it.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement the aggregator**

Verify each attestation independently, require exact subject tuple equality, count each verifier once, report pass/fail/abstain weights separately, preserve contributing attestation hashes in sorted order, and return an immutable content-addressed result with `executionAuthority: 'none'`.

- [ ] **Step 4: Run tests and commit**

Commit: `feat: add deterministic verification quorum`

---

### Task 5: External-anchor request and receipt envelopes

**Files:**
- Create: `CausalCityPrototype/src/federation/anchor.js`
- Test: `CausalCityPrototype/tests/kernel/federation-anchor.test.js`

**Interfaces:**
- Produces: `createAnchorRequest(config)`, `createAnchorReceipt(config)`, `verifyAnchorReceipt(receipt, request)`.

- [ ] **Step 1: Write failing deterministic linkage tests**

```js
const request = createAnchorRequest({
  subjectType: 'frontier-foundations',
  subjectId: 'frontier-foundations-v1',
  subjectHash: 'd'.repeat(64),
  targetProfile: 'transparency-log-generic-v1',
  nonce: 'explicit-nonce-0001',
});
const receipt = createAnchorReceipt({
  request,
  providerId: 'test-anchor-provider',
  providerReceiptId: 'provider-record-1',
  anchoredHash: request.subjectHash,
  externalLocator: 'test://anchor/provider-record-1',
  observedAt: '2026-08-11T20:00:00Z',
  providerEvidenceHash: 'e'.repeat(64),
});
assert.equal(verifyAnchorReceipt(receipt, request).ok, true);
```

Mismatched request hash, anchored hash, provider evidence, or receipt content ID must fail. Core code must contain no fetch/network call.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement pure envelope functions**

No external I/O. `observedAt` is opaque caller-supplied evidence metadata and is not interpreted as proof of time or finality.

- [ ] **Step 4: Run tests and commit**

Commit: `feat: add external anchor evidence envelopes`

---

### Task 6: Strict JSON Schemas and executable schema tests

**Files:**
- Create: `CausalCityPrototype/schemas/crypto-profile-v1.schema.json`
- Create: `CausalCityPrototype/schemas/verifier-registry-v1.schema.json`
- Create: `CausalCityPrototype/schemas/verification-attestation-v1.schema.json`
- Create: `CausalCityPrototype/schemas/verifier-revocation-ledger-v1.schema.json`
- Create: `CausalCityPrototype/schemas/verification-quorum-v1.schema.json`
- Create: `CausalCityPrototype/schemas/anchor-request-v1.schema.json`
- Create: `CausalCityPrototype/schemas/anchor-receipt-v1.schema.json`
- Modify/Test: `CausalCityPrototype/tests/kernel/schemas.test.js`

- [ ] **Step 1: Extend schema discovery test and confirm RED while schemas are absent**

Require `$schema: 'https://json-schema.org/draft/2020-12/schema'`, strict `additionalProperties: false`, exact ID/hash patterns, bounded safe-integer logical times/weights, exact verdict/disposition enums, and nested verifier/signature structures.

- [ ] **Step 2: Add all seven schemas**

Schemas validate structure only. Cryptographic verification remains in code.

- [ ] **Step 3: Generate real artifacts in `schemas.test.js` and validate them recursively; mutate nested fields and require rejection**

- [ ] **Step 4: Run tests and commit**

Commit: `feat: add verification federation schemas`

---

### Task 7: Source gates and public additive API

**Files:**
- Modify: `CausalCityPrototype/scripts/check-syntax.js`
- Modify: `CausalCityPrototype/scripts/check-randomness.js`
- Create: `CausalCityPrototype/tests/kernel/federation-source-gates.test.js`
- Modify: `CausalCityPrototype/src/kernel/index.js` only if the repository convention requires public re-export; otherwise create `CausalCityPrototype/src/federation/index.js` and keep it isolated.

- [ ] **Step 1: Add a failing scanner-coverage regression test that requires `src/federation/` in both scanners**

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Add `src/federation/` to syntax and randomness roots and create focused federation index exports**

- [ ] **Step 4: Assert federation modules do not import simulation mutation functions (`advanceRun`, `forkRun`, `forkBranch`) or network APIs**

- [ ] **Step 5: Run tests and commit**

Commit: `test: gate verification federation source`

---

### Task 8: Literal cross-runtime federation conformance

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/emit-federation-conformance.js`
- Create: `CausalCityPrototype/tests/fixtures/federation-hashes-v1.json`
- Create: `CausalCityPrototype/tests/acceptance/federation-conformance.test.js`
- Modify: `CausalCityPrototype/scripts/acceptance-summary.js`

**Fixture contents:**

- crypto profile hash;
- verifier registry hash;
- public key IDs;
- canonical signed attestation bytes hash;
- signature Base64 and attestation hash for at least two verifiers;
- revocation-ledger terminal hash;
- pass quorum hash;
- conflict quorum hash;
- anchor-request hash;
- anchor-receipt hash;
- explicit `executionAuthority: none` and no-auto-action flags.

- [ ] **Step 1: Commit placeholder literal fixture and acceptance test**

Use impossible zero hashes/signatures so CI deliberately fails after printing `FEDERATION_CONFORMANCE_ACTUAL=...`.

- [ ] **Step 2: Run the complete Node 22/24 matrix and capture actual outputs independently**

Do not pin values unless both runtime jobs emit identical semantic fields and signature bytes.

- [ ] **Step 3: Replace placeholders with the identical observed values**

- [ ] **Step 4: Rerun complete `npm run verify` on Node 22 and Node 24**

Expected: all inherited tests plus federation conformance pass.

- [ ] **Step 5: Commit**

Commit: `test: pin federation cross-runtime conformance`

---

### Task 9: Verification report and stacked draft PR

**Files:**
- Create: `CausalCityPrototype/FEDERATION_VERIFICATION_REPORT.md`

- [ ] **Step 1: Record exact base/head SHAs, workflow/job IDs, Node versions, test counts, scanner counts, RED/GREEN history, and literal commitments**

- [ ] **Step 2: Record residual risks explicitly**

Include: cryptographic identity is not institutional independence; fixed test keys are non-production; Ed25519 is not a post-quantum claim; quorum policy can be misconfigured; registry governance is external; anchor receipts prove linkage only; lower independent-review gates remain open.

- [ ] **Step 3: Run the full matrix on the report-packaged exact head**

- [ ] **Step 4: Open a draft PR stacked on `codex/ripple-frontier-foundations-v1`, not `main`**

PR must state no merge, tag, deployment, reviewer-independence, municipal-certification, ZK, PQ, blockchain-finality, or autonomous-release claim.

- [ ] **Step 5: Request independent version-pinned review without treating the cryptographic quorum as that review**

Commit: `docs: record federation verification evidence`

---

## Self-review result

- Spec coverage: every section of the design has a corresponding task.
- Placeholder policy: deliberate zero conformance values are explicitly an acceptance-test RED stage, not an unspecified implementation placeholder.
- Type consistency: registry/profile/attestation/revocation/quorum/anchor names and fields are consistent across tasks.
- Scope remains one reviewable subsystem; post-quantum, blockchain adapters, ZK, cross-language ports, and decentralized discovery remain separate future designs.

# Ripple Post-Quantum Migration Profile v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add migration-safe optional ML-DSA-65 evidence to existing Ed25519 federation attestations while preserving honest Node 22/24 capability reporting and all lower-layer guarantees.

**Architecture:** A new isolated `src/pq/` layer treats ML-DSA signatures as optional evidence attached to an already-valid classical attestation. Deterministic evidence parsing/content-addressing works on Node 22 and 24; actual ML-DSA verification occurs only where built-in runtime capability exists. Hybrid evaluation never permits PQ evidence to rescue invalid Ed25519 evidence and never grants release authority.

**Tech Stack:** ECMAScript modules; Node 22.23.1 and Node 24.18.0; built-in `node:crypto`; FIPS-204 ML-DSA-65 evidence profile; existing canonical-v1/SHA-256/immutability/errors/federation APIs; JSON Schema 2020-12; Node test runner; GitHub Actions.

## Global Constraints

- Base exactly on `codex/ripple-verification-federation-v1@dd1ca0d530cf81b02a4cf8c6de04c0b6727e029d`.
- Keep Ed25519 mandatory on Node 22 and Node 24.
- Do not claim Node 22 can cryptographically verify ML-DSA.
- Do not require repeated ML-DSA signing to emit identical bytes; FIPS 204 default signing is hedged/randomized.
- A fixed one-time Node-24-generated ML-DSA test signature may be committed and treated as immutable evidence after generation.
- No npm dependencies.
- No network I/O, GitHub writes, simulation mutation, wall-clock input, or ambient randomness in deterministic `src/pq/` code.
- Key generation and fresh ML-DSA signing may occur only in explicit test/fixture-generation helpers on a capable runtime.
- No global post-quantum-security claim, release authority, municipal authority, blockchain-finality claim, or ZK claim.
- Preserve every inherited Federation/Frontier/Phase-2/Phase-1/Phase-0 acceptance gate.

---

### Task 1: Runtime PQ capability observation

**Files:**
- Create: `CausalCityPrototype/src/pq/capabilities.js`
- Create: `CausalCityPrototype/tests/kernel/pq-capabilities.test.js`

**Interfaces:**
- Consumes: `cloneAndFreeze`, `TrustKernelError`.
- Produces: `detectPqCapabilities(runtimeMajor = Number(process.versions.node.split('.')[0]))`, `createPqCapabilityPolicy(config)`, `verifyPqCapabilityPolicy(policy)`.

- [ ] **Step 1: Write failing capability tests**

Required assertions:

```js
const capabilities = detectPqCapabilities();
assert.equal(capabilities.capabilityVersion, 'pq-capabilities-v1');
assert.equal(capabilities.classical.ed25519, 'supported');
assert.equal(capabilities.claimClass, 'runtime-capability-observation');
assert.equal(capabilities.executionAuthority, 'none');
if (process.versions.node.startsWith('22.')) {
  assert.equal(capabilities.postQuantum.mlDsa, 'unavailable');
  assert.deepEqual(capabilities.postQuantum.mlDsaProfiles, []);
} else {
  assert.equal(capabilities.postQuantum.mlDsa, 'supported');
  assert.deepEqual(capabilities.postQuantum.mlDsaProfiles, ['ml-dsa-44', 'ml-dsa-65', 'ml-dsa-87']);
}
```

Also assert `detectPqCapabilities(22)` and `(24)` are deterministic pure observations, unsupported majors fail with `E_PQ_CAPABILITY`, and policy fields are exact/immutable/content-addressed.

- [ ] **Step 2: Run RED**

Run: `cd CausalCityPrototype && node --test tests/kernel/pq-capabilities.test.js`

Expected: module-not-found for `src/pq/capabilities.js`.

- [ ] **Step 3: Implement minimal capability and policy objects**

Policy v1:

```js
{
  policyVersion: 'pq-migration-policy-v1',
  requiredClassical: 'ed25519',
  optionalPostQuantum: 'ml-dsa-65',
  allowClassicalOnly: true,
  allowPqUnavailable: true,
  requireHybridForRelease: false,
  executionAuthority: 'none',
  policyHash
}
```

- [ ] **Step 4: Run test + inherited kernel tests**

- [ ] **Step 5: Commit** — `feat: add PQ runtime capability profile`

---

### Task 2: Fixed ML-DSA-65 test evidence generation

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/generate-ml-dsa-fixture.js`
- Create: `CausalCityPrototype/tests/kernel/pq-fixture-generation.test.js`
- Create after observed Node 24 generation: `CausalCityPrototype/tests/fixtures/ml-dsa-65-test-evidence-v1.json`

**Interfaces:**
- Test helper uses `generateKeyPairSync('ml-dsa-65')`, `sign(null, payloadBytes, key)` and exports PKCS8/SPKI DER Base64.
- The payload is the exact canonical unsigned Federation v1 attestation payload used for PQ conformance.

- [ ] **Step 1: Write a runtime-conditional test that explicitly proves Node 22 unavailability and Node 24 capability**

Node 22 branch:

```js
assert.throws(() => generateKeyPairSync('ml-dsa-65'), /unsupported|unknown|invalid/i);
```

Node 24 branch:

```js
const { privateKey, publicKey } = generateKeyPairSync('ml-dsa-65');
const sig = sign(null, canonicalBytes(unsigned), privateKey);
assert.equal(verify(null, canonicalBytes(unsigned), publicKey, sig), true);
```

No silent skip.

- [ ] **Step 2: Run full Node 22/24 matrix and confirm expected runtime split**

- [ ] **Step 3: On Node 24 only, use the fixture generator to print one complete test-only key/signature bundle**

The helper must print a single `ML_DSA_FIXTURE_ACTUAL=...` line and deliberately exit non-zero until manually pinned.

- [ ] **Step 4: Capture the Node-24 fixture from CI and create `ml-dsa-65-test-evidence-v1.json`**

Required fields:

```text
fixtureVersion
warning
algorithm = ml-dsa-65
privateKeyPkcs8Base64
publicKeySpkiBase64
publicKeyHash
unsignedPayloadHash
signatureBase64
signatureHash
contextBase64
sourceRuntime = node-24
```

- [ ] **Step 5: Disable generation as an acceptance requirement; retain generator as explicit maintenance tooling only**

- [ ] **Step 6: Commit** — `test: pin Node 24 ML-DSA test evidence`

---

### Task 3: PQ evidence envelope and structural verification

**Files:**
- Create: `CausalCityPrototype/src/pq/evidence.js`
- Create: `CausalCityPrototype/tests/kernel/pq-evidence.test.js`

**Interfaces:**
- Produces: `createPqEvidenceEnvelope(config)`, `verifyPqEvidenceEnvelope(evidence, classicalAttestation)`.

- [ ] **Step 1: Write RED tests for fixed evidence identity**

Both Node majors must create the same evidence envelope from the committed fixture.

Required fields:

```text
pqEvidenceVersion = pq-signature-evidence-v1
algorithm = ml-dsa-65
subjectAttestationHash
unsignedPayloadHash
publicKeySpkiBase64
publicKeyHash
signatureBase64
signatureHash
contextBase64
sourceRuntimeClass = node-24-test-fixture
claimClass = optional-post-quantum-signature-evidence
executionAuthority = none
pqEvidenceHash
```

Tests independently mutate `publicKeyHash`, `signatureHash`, `subjectAttestationHash`, `unsignedPayloadHash`, signature bytes, and unknown fields; all fail with `E_PQ_EVIDENCE`.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement pure structural/content-addressing logic with no crypto capability branch**

- [ ] **Step 4: Run Node 22/24 tests**

- [ ] **Step 5: Commit** — `feat: add portable PQ evidence envelope`

---

### Task 4: Runtime-specific ML-DSA verification

**Files:**
- Create: `CausalCityPrototype/src/pq/ml-dsa.js`
- Create: `CausalCityPrototype/tests/kernel/pq-ml-dsa.test.js`

**Interfaces:**
- Produces: `verifyMlDsaEvidence(evidence, unsignedPayload, runtimeMajor?)`.

- [ ] **Step 1: Write RED tests for explicit Node split**

Node 22 expected result:

```js
{
  disposition: 'pq-unavailable',
  algorithm: 'ml-dsa-65',
  cryptographicVerificationPerformed: false,
  evidenceHash,
  executionAuthority: 'none'
}
```

Node 24 expected result:

```js
{
  disposition: 'pq-verified',
  algorithm: 'ml-dsa-65',
  cryptographicVerificationPerformed: true,
  evidenceHash,
  executionAuthority: 'none'
}
```

Before capability branching, malformed/stale evidence must fail identically.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement Node-24 verification with `createPublicKey` + `verify(null, bytes, key, signature)`**

Node 22 returns unavailable only after structural/hash verification succeeds.

- [ ] **Step 4: Add Node-24 mutation tests for message/signature/key/context**

- [ ] **Step 5: Run full matrix and commit** — `feat: verify ML-DSA evidence on capable runtimes`

---

### Task 5: Hybrid attestation evaluation and migration policy

**Files:**
- Create: `CausalCityPrototype/src/pq/hybrid.js`
- Create: `CausalCityPrototype/tests/kernel/pq-hybrid.test.js`

**Interfaces:**
- Produces: `evaluateHybridAttestation(input)`, `evaluatePqMigrationPolicy(result, policy)`.
- Consumes existing Federation `verifyVerificationAttestation` first.

- [ ] **Step 1: Write RED tests for all hybrid dispositions**

Required dispositions:

```text
hybrid-verified
classical-verified-pq-unavailable
classical-verified-no-pq-evidence
invalid-pq-evidence
```

Classical verification failures must throw and cannot become a hybrid success.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement classical-first hybrid evaluation**

Every result includes:

```text
classicalVerified = true
pqEvidencePresent
pqCryptographicallyVerified
postQuantumSystemSecurityClaim = false
executionAuthority = none
hybridHash
```

- [ ] **Step 4: Implement policy evaluation without authority inflation**

Policy result fields:

```text
compliant
reasonCode
cryptographicDisposition
policyHash
executionAuthority = none
policyResultHash
```

- [ ] **Step 5: Run matrix and commit** — `feat: add hybrid attestation migration evaluation`

---

### Task 6: Strict PQ schemas and source gates

**Files:**
- Create: `CausalCityPrototype/schemas/pq-capabilities-v1.schema.json`
- Create: `CausalCityPrototype/schemas/pq-signature-evidence-v1.schema.json`
- Create: `CausalCityPrototype/schemas/pq-hybrid-result-v1.schema.json`
- Create: `CausalCityPrototype/schemas/pq-migration-policy-v1.schema.json`
- Create: `CausalCityPrototype/schemas/pq-policy-result-v1.schema.json`
- Create: `CausalCityPrototype/tests/kernel/pq-schemas.test.js`
- Create: `CausalCityPrototype/tests/kernel/pq-source-gates.test.js`
- Modify: `CausalCityPrototype/tests/kernel/schemas.test.js`
- Modify: `CausalCityPrototype/scripts/check-syntax.js`
- Modify: `CausalCityPrototype/scripts/check-randomness.js`
- Create: `CausalCityPrototype/src/pq/index.js`

- [ ] **Step 1: Add RED schema-discovery and real-artifact validation tests**

- [ ] **Step 2: Add RED scanner test requiring `src/pq/` in syntax/randomness roots and forbidding simulation/network/time/ambient-randomness APIs**

- [ ] **Step 3: Add five schemas and PQ public API**

- [ ] **Step 4: Extend scanners with `src/pq/`**

- [ ] **Step 5: Validate real capability, evidence, hybrid, policy and policy-result artifacts; reject nested mutation/authority inflation**

- [ ] **Step 6: Run matrix and commit** — `test: gate post-quantum migration artifacts`

---

### Task 7: Cross-runtime PQ migration conformance

**Files:**
- Create: `CausalCityPrototype/tests/kernel/helpers/emit-pq-conformance.js`
- Create: `CausalCityPrototype/tests/fixtures/pq-hashes-v1.json`
- Create: `CausalCityPrototype/tests/acceptance/pq-conformance.test.js`
- Modify: `CausalCityPrototype/scripts/acceptance-summary.js`

- [ ] **Step 1: Commit deliberate placeholder fixture**

The acceptance test spawns fresh processes and emits `PQ_CONFORMANCE_ACTUAL=...`.

Shared fields that must match Node 22/24 exactly:

```text
classicalAttestationHash
pqEvidenceHash
publicKeyHash
signatureHash
unsignedPayloadHash
hybridInputHash
policyHash
```

Expected runtime-specific fields:

```text
Node 22: mlDsaCapability=unavailable, hybridDisposition=classical-verified-pq-unavailable
Node 24: mlDsaCapability=supported, hybridDisposition=hybrid-verified
```

- [ ] **Step 2: Run deliberate RED matrix and capture both runtime outputs**

- [ ] **Step 3: Pin shared literal commitments plus explicit expected runtime-specific values**

Do not require freshly generated ML-DSA signature bytes to match.

- [ ] **Step 4: Rerun full matrix and update acceptance summary**

- [ ] **Step 5: Commit** — `test: pin PQ migration cross-runtime conformance`

---

### Task 8: Verification report and stacked draft PR

**Files:**
- Create: `CausalCityPrototype/PQ_MIGRATION_VERIFICATION_REPORT.md`

- [ ] **Step 1: Record exact standards/runtime boundary**

Document FIPS 204 target, 2026 NIST errata note, Node 22 unavailability, Node 24 support, and hedged/default signing nondeterminism.

- [ ] **Step 2: Record exact TDD/CI evidence**

Include base/head SHAs, workflows/jobs, Node versions, test/scanner counts, fixed test fixture hashes, and runtime-specific dispositions.

- [ ] **Step 3: Record residual risks**

At minimum: test keys only; Node-24-only PQ verification; no HSM/KMS; no full-system PQ claim; no SLH-DSA; no cross-language verifier; FIPS errata/revision drift; classical dependency remains mandatory; no release authority.

- [ ] **Step 4: Run full matrix on report-packaged exact head**

- [ ] **Step 5: Open/update stacked draft PR on `codex/ripple-verification-federation-v1` and request independent version-pinned review**

- [ ] **Step 6: Keep branch unmerged/untagged/undeployed**

Commit: `docs: record PQ migration verification evidence`

---

## Self-review result

- Every design section maps to an implementation task.
- No plan step relies on deterministic ML-DSA signing; only fixed evidence is content-addressed.
- Node 22 absence is tested as a required result, never a silent skip.
- Ed25519 remains mandatory and PQ evidence cannot rescue invalid classical evidence.
- Runtime capability observation is intentionally allowed to differ across Node 22 and Node 24.
- Production key custody, SLH-DSA, portable Node-22 PQ verification, ZK, external anchoring, and authoritative release enforcement remain separate future designs.

import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalString } from '../../src/kernel/canonicalize.js';
import {
  createOfflineVerificationCapsule,
  exportOfflineVerificationCapsule,
  parseOfflineVerificationCapsule,
  verifyOfflineVerificationCapsule,
} from '../../src/mesh/offline-capsule.js';
import { buildOfflineCapsuleInput } from './helpers/offline-capsule-fixture.js';

test('offline capsule is deterministic, immutable, and fully verified before emission', async () => {
  const input = await buildOfflineCapsuleInput();
  const first = createOfflineVerificationCapsule(input);
  const second = createOfflineVerificationCapsule(input);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.schemaBundle));
  assert.ok(Object.isFrozen(first.attestations));
  assert.match(first.capsuleId, /^offline-capsule-[a-f0-9]{64}$/);
  assert.match(first.capsuleHash, /^[a-f0-9]{64}$/);
  assert.match(first.artifactHash, /^[a-f0-9]{64}$/);
  assert.equal(first.artifactByteLength, Buffer.byteLength(input.artifactCanonicalJson, 'utf8'));
  assert.equal(first.artifactEncoding, 'canonical-v1-json-utf8');
  assert.equal(first.expectedRegistryAwareBundle.status, 'quorum-met');
  assert.deepEqual(first.claimBoundary, {
    artifactBytesVerified: 'commitment-only',
    modelReplayPerformed: false,
    realIdentityVerified: false,
    organizationalIndependenceVerified: false,
    scientificValidityEstablished: false,
    externalPublicationVerified: false,
    postQuantumSecurityEstablished: false,
    zeroKnowledgeProofVerified: false,
    approvalAuthority: 'none',
  });

  const report = verifyOfflineVerificationCapsule(first);
  assert.equal(report.ok, true);
  assert.equal(report.firstMismatch, null);
  assert.equal(report.capsuleId, first.capsuleId);
  assert.equal(report.capsuleHash, first.capsuleHash);
  assert.equal(report.artifactBytesVerified, true);
  assert.equal(report.cryptoProfileVerified, true);
  assert.equal(report.schemaBundleVerified, true);
  assert.equal(report.keyRegistryVerified, true);
  assert.equal(report.attestationCount, 2);
  assert.equal(report.cryptographicallyValidAttestationCount, 2);
  assert.equal(report.registryAdmittedCount, 2);
  assert.equal(report.registryRejectedCount, 0);
  assert.equal(report.quorumStatus, 'quorum-met');
  assert.equal(report.identityVerified, false);
  assert.equal(report.independentReviewEstablished, false);
  assert.equal(report.scientificValidityEstablished, false);
  assert.equal(report.approvalAuthority, 'none');
  assert.match(report.reportHash, /^[a-f0-9]{64}$/);
});

test('artifact must be exact canonical-v1 JSON and bind every policy and attestation', async () => {
  const input = await buildOfflineCapsuleInput();
  assert.throws(() => createOfflineVerificationCapsule({
    ...input,
    artifactCanonicalJson: ` ${input.artifactCanonicalJson}`,
  }), { code: 'E_CAPSULE_ARTIFACT' });
  assert.throws(() => createOfflineVerificationCapsule({
    ...input,
    artifactCanonicalJson: input.artifactCanonicalJson.replace('café', 'café'),
  }), { code: 'E_CAPSULE_ARTIFACT' });

  const wrongPolicy = {
    ...input.meshPolicy,
    artifactHash: '0'.repeat(64),
  };
  assert.throws(() => createOfflineVerificationCapsule({ ...input, meshPolicy: wrongPolicy }), { code: 'E_CAPSULE_EVIDENCE' });

  const wrongAttestation = {
    ...input.attestations[0],
    artifactHash: '1'.repeat(64),
  };
  assert.throws(() => createOfflineVerificationCapsule({
    ...input,
    attestations: [wrongAttestation, input.attestations[1]],
  }), { code: 'E_CAPSULE_EVIDENCE' });
});

test('schema bundle requires exact names, order, strict roots, and content commitments', async () => {
  const input = await buildOfflineCapsuleInput();
  assert.throws(() => createOfflineVerificationCapsule({
    ...input,
    schemaBundle: [...input.schemaBundle].reverse(),
  }), { code: 'E_CAPSULE_SCHEMA_BUNDLE' });

  const weak = structuredClone(input.schemaBundle);
  weak[0].schema.additionalProperties = true;
  assert.throws(() => createOfflineVerificationCapsule({ ...input, schemaBundle: weak }), { code: 'E_CAPSULE_SCHEMA_BUNDLE' });

  const missingRequired = structuredClone(input.schemaBundle);
  missingRequired[0].schema.required = missingRequired[0].schema.required.slice(1);
  assert.throws(() => createOfflineVerificationCapsule({ ...input, schemaBundle: missingRequired }), { code: 'E_CAPSULE_SCHEMA_BUNDLE' });
});

test('capsule creation rejects invalid signatures, registries, profiles, and expected bundles', async () => {
  const input = await buildOfflineCapsuleInput();

  const badSignature = structuredClone(input.attestations);
  badSignature[0].signature = `${badSignature[0].signature.slice(0, -1)}${badSignature[0].signature.endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => createOfflineVerificationCapsule({ ...input, attestations: badSignature }), { code: 'E_CAPSULE_EVIDENCE' });

  const badRegistry = structuredClone(input.keyRegistry);
  badRegistry.registryHash = '2'.repeat(64);
  assert.throws(() => createOfflineVerificationCapsule({ ...input, keyRegistry: badRegistry }), { code: 'E_CAPSULE_EVIDENCE' });

  const badProfile = { ...input.cryptoProfile, profileId: `crypto-profile-${'3'.repeat(64)}` };
  assert.throws(() => createOfflineVerificationCapsule({ ...input, cryptoProfile: badProfile }), { code: 'E_CAPSULE_EVIDENCE' });

  const badBundle = { ...input.expectedRegistryAwareBundle, bundleHash: '4'.repeat(64) };
  assert.throws(() => createOfflineVerificationCapsule({ ...input, expectedRegistryAwareBundle: badBundle }), { code: 'E_CAPSULE_EVIDENCE' });
});

test('capsule verification rejects stale nested identities, bytes, claims, hash, and ID', async () => {
  const capsule = createOfflineVerificationCapsule(await buildOfflineCapsuleInput());
  const mutations = [];

  const artifact = structuredClone(capsule);
  artifact.artifactCanonicalJson = artifact.artifactCanonicalJson.replace('1,2,3', '1,2,4');
  mutations.push(artifact);

  const schema = structuredClone(capsule);
  schema.schemaBundle[0].schema.title = 'forged';
  mutations.push(schema);

  const registry = structuredClone(capsule);
  registry.keyRegistry.registryHash = '5'.repeat(64);
  mutations.push(registry);

  const attestation = structuredClone(capsule);
  attestation.attestations[0].attestationId = `attestation-${'6'.repeat(64)}`;
  mutations.push(attestation);

  const bundle = structuredClone(capsule);
  bundle.expectedRegistryAwareBundle.bundleHash = '7'.repeat(64);
  mutations.push(bundle);

  const claim = structuredClone(capsule);
  claim.claimBoundary.modelReplayPerformed = true;
  mutations.push(claim);

  mutations.push({ ...capsule, capsuleHash: '8'.repeat(64) });
  mutations.push({ ...capsule, capsuleId: `offline-capsule-${'9'.repeat(64)}` });

  for (const mutation of mutations) assert.equal(verifyOfflineVerificationCapsule(mutation).ok, false);
});

test('canonical export and parse round-trip exactly and reject noncanonical representations', async () => {
  const capsule = createOfflineVerificationCapsule(await buildOfflineCapsuleInput());
  const exported = exportOfflineVerificationCapsule(capsule);
  assert.equal(exported, canonicalString(capsule));
  const parsed = parseOfflineVerificationCapsule(exported);
  assert.deepEqual(parsed, capsule);
  assert.equal(exportOfflineVerificationCapsule(parsed), exported);

  for (const noncanonical of [
    ` ${exported}`,
    `${exported}\n`,
    JSON.stringify(JSON.parse(exported), null, 2),
  ]) assert.throws(() => parseOfflineVerificationCapsule(noncanonical), { code: 'E_CAPSULE_CANONICAL' });
});

test('capsule input rejects unknown, hidden, symbol, accessor, and ambiguous arrays before reads', async () => {
  const input = await buildOfflineCapsuleInput();
  assert.throws(() => createOfflineVerificationCapsule({ ...input, extra: true }), { code: 'E_CAPSULE_SCHEMA' });

  const hidden = { ...input };
  Object.defineProperty(hidden, 'hidden', { value: true, enumerable: false });
  assert.throws(() => createOfflineVerificationCapsule(hidden), { code: 'E_CAPSULE_SCHEMA' });

  const symbolic = { ...input };
  symbolic[Symbol('x')] = true;
  assert.throws(() => createOfflineVerificationCapsule(symbolic), { code: 'E_CAPSULE_SCHEMA' });

  let getterCalls = 0;
  const accessorSchemas = [];
  Object.defineProperty(accessorSchemas, '0', {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return input.schemaBundle[0];
    },
  });
  accessorSchemas.length = 1;
  assert.throws(() => createOfflineVerificationCapsule({ ...input, schemaBundle: accessorSchemas }), { code: 'E_CAPSULE_SCHEMA_BUNDLE' });
  assert.equal(getterCalls, 0);
});

import { createPublicKey } from 'node:crypto';

import { canonicalString, sha256BytesHex, sha256Hex } from '../kernel/canonicalize.js';
import { cloneAndFreeze } from '../kernel/immutable.js';
import {
  assertExactPlainObject,
  decodeBase64url,
  immutableReport,
  meshFail,
  normalizeHash,
  normalizeNonNegativeInteger,
  normalizeProfileId,
  normalizeText,
  readExactDataArray,
} from './common.js';

const REGISTRY_ID = /^key-registry-[a-f0-9]{64}$/u;
const REASON_CODE = /^KEY_[A-Z0-9_]+$/u;

const REGISTRY_INPUT_KEYS = ['networkId', 'cryptoProfileId', 'registryVersion'];
const REGISTRY_OUTPUT_KEYS = [
  'format',
  'schemaVersion',
  'networkId',
  'cryptoProfileId',
  'registryVersion',
  'registryId',
  'identityBasis',
  'identityVerified',
  'registryAuthority',
  'events',
  'registryHash',
];
const EVENT_KEYS = [
  'format',
  'schemaVersion',
  'registryId',
  'eventType',
  'sequence',
  'logicalTime',
  'verifierNodeId',
  'operatorId',
  'subjectPublicKey',
  'subjectKeyFingerprint',
  'predecessorKeyFingerprint',
  'reasonCode',
  'previousEventHash',
  'eventHash',
];
const REGISTER_KEYS = ['logicalTime', 'verifierNodeId', 'operatorId', 'publicKey', 'reasonCode'];
const ROTATE_KEYS = ['logicalTime', 'verifierNodeId', 'operatorId', 'predecessorKeyFingerprint', 'publicKey', 'reasonCode'];
const REVOKE_KEYS = ['logicalTime', 'verifierNodeId', 'operatorId', 'publicKeyFingerprint', 'reasonCode'];
const QUERY_KEYS = ['verifierNodeId', 'operatorId', 'publicKeyFingerprint', 'atLogicalTime'];

function normalizeReasonCode(value, code, path) {
  const reasonCode = normalizeText(value, code, path);
  if (!REASON_CODE.test(reasonCode)) meshFail(code, `${path} must be a stable KEY_* code`, path);
  return reasonCode;
}

function normalizePublicKey(value, code, path, { allowPem }) {
  if (typeof value !== 'string' || value.length === 0) meshFail(code, `${path} must be public-key text`, path);
  let keyObject;
  try {
    if (allowPem && value.includes('BEGIN PUBLIC KEY')) {
      keyObject = createPublicKey(value);
    } else {
      const der = decodeBase64url(value, code, path);
      keyObject = createPublicKey({ key: der, type: 'spki', format: 'der' });
    }
  } catch {
    meshFail(code, `${path} must encode an Ed25519 SPKI public key`, path);
  }
  if (keyObject.asymmetricKeyType !== 'ed25519') meshFail(code, `${path} must be Ed25519`, path);
  const der = Buffer.from(keyObject.export({ type: 'spki', format: 'der' }));
  return cloneAndFreeze({
    publicKey: der.toString('base64url'),
    fingerprint: sha256BytesHex(der),
  });
}

export function deriveVerificationKeyFingerprint(publicKey) {
  return normalizePublicKey(publicKey, 'E_KEY_REGISTRY_SCHEMA', 'publicKey', { allowPem: true }).fingerprint;
}

function normalizeRegistryInput(input) {
  const code = 'E_KEY_REGISTRY_SCHEMA';
  assertExactPlainObject(input, REGISTRY_INPUT_KEYS, code, 'keyRegistryInput');
  return cloneAndFreeze({
    networkId: normalizeText(input.networkId, code, 'keyRegistryInput.networkId'),
    cryptoProfileId: normalizeProfileId(input.cryptoProfileId, code, 'keyRegistryInput.cryptoProfileId'),
    registryVersion: normalizeText(input.registryVersion, code, 'keyRegistryInput.registryVersion'),
  });
}

function registryIdentityCore(input) {
  return cloneAndFreeze({
    format: 'verification-key-registry-identity',
    schemaVersion: '1.0.0',
    ...input,
  });
}

function registryCore(identity, registryId, events) {
  return cloneAndFreeze({
    format: 'verification-key-registry',
    schemaVersion: '1.0.0',
    ...identity,
    registryId,
    identityBasis: 'declared-node-and-operator',
    identityVerified: false,
    registryAuthority: 'none',
    events,
  });
}

function finalizeRegistry(identity, registryId, events) {
  const frozenEvents = cloneAndFreeze(events);
  const core = registryCore(identity, registryId, frozenEvents);
  return cloneAndFreeze({ ...core, registryHash: sha256Hex(core) });
}

export function createVerificationKeyRegistry(input) {
  const identity = normalizeRegistryInput(input);
  const registryId = `key-registry-${sha256Hex(registryIdentityCore(identity))}`;
  return finalizeRegistry(identity, registryId, []);
}

function normalizeStoredEvent(event, index, registryId) {
  const code = 'E_KEY_REGISTRY_CHAIN';
  assertExactPlainObject(event, EVENT_KEYS, code, `keyRegistry.events.${index}`);
  if (event.format !== 'verification-key-event' || event.schemaVersion !== '1.0.0') meshFail(code, 'event format/version mismatch', `keyRegistry.events.${index}`);
  if (event.registryId !== registryId || !REGISTRY_ID.test(event.registryId)) meshFail(code, 'event registry ID mismatch', `keyRegistry.events.${index}.registryId`);
  const eventType = normalizeText(event.eventType, code, `keyRegistry.events.${index}.eventType`);
  if (!['register', 'rotate', 'revoke'].includes(eventType)) meshFail(code, 'unsupported key event type', `keyRegistry.events.${index}.eventType`);
  const key = normalizePublicKey(event.subjectPublicKey, code, `keyRegistry.events.${index}.subjectPublicKey`, { allowPem: false });
  const subjectKeyFingerprint = normalizeHash(event.subjectKeyFingerprint, code, `keyRegistry.events.${index}.subjectKeyFingerprint`);
  if (key.fingerprint !== subjectKeyFingerprint) meshFail(code, 'stored key fingerprint mismatch', `keyRegistry.events.${index}.subjectKeyFingerprint`);
  let predecessorKeyFingerprint = null;
  if (event.predecessorKeyFingerprint !== null) predecessorKeyFingerprint = normalizeHash(event.predecessorKeyFingerprint, code, `keyRegistry.events.${index}.predecessorKeyFingerprint`);
  let previousEventHash = null;
  if (event.previousEventHash !== null) previousEventHash = normalizeHash(event.previousEventHash, code, `keyRegistry.events.${index}.previousEventHash`);
  const normalized = cloneAndFreeze({
    format: 'verification-key-event',
    schemaVersion: '1.0.0',
    registryId,
    eventType,
    sequence: normalizeNonNegativeInteger(event.sequence, code, `keyRegistry.events.${index}.sequence`),
    logicalTime: normalizeNonNegativeInteger(event.logicalTime, code, `keyRegistry.events.${index}.logicalTime`),
    verifierNodeId: normalizeText(event.verifierNodeId, code, `keyRegistry.events.${index}.verifierNodeId`),
    operatorId: normalizeText(event.operatorId, code, `keyRegistry.events.${index}.operatorId`),
    subjectPublicKey: key.publicKey,
    subjectKeyFingerprint,
    predecessorKeyFingerprint,
    reasonCode: normalizeReasonCode(event.reasonCode, code, `keyRegistry.events.${index}.reasonCode`),
    previousEventHash,
  });
  const expectedHash = sha256Hex(normalized);
  if (event.eventHash !== expectedHash) meshFail(code, 'event content hash mismatch', `keyRegistry.events.${index}.eventHash`);
  return cloneAndFreeze({ ...normalized, eventHash: expectedHash });
}

function analyzeRegistry(registry) {
  const code = 'E_KEY_REGISTRY_CHAIN';
  assertExactPlainObject(registry, REGISTRY_OUTPUT_KEYS, code, 'keyRegistry');
  if (registry.format !== 'verification-key-registry' || registry.schemaVersion !== '1.0.0') meshFail(code, 'registry format/version mismatch', 'keyRegistry');
  if (registry.identityBasis !== 'declared-node-and-operator' || registry.identityVerified !== false || registry.registryAuthority !== 'none') meshFail(code, 'registry claim boundary mismatch', 'keyRegistry');
  const identity = normalizeRegistryInput({
    networkId: registry.networkId,
    cryptoProfileId: registry.cryptoProfileId,
    registryVersion: registry.registryVersion,
  });
  const registryId = `key-registry-${sha256Hex(registryIdentityCore(identity))}`;
  if (registry.registryId !== registryId) meshFail(code, 'registry ID mismatch', 'keyRegistry.registryId');
  const rawEvents = readExactDataArray(registry.events, code, 'keyRegistry.events', true);
  const events = rawEvents.map((event, index) => normalizeStoredEvent(event, index, registryId));

  const nodes = new Map();
  const usedFingerprints = new Set();
  let previousEventHash = null;
  let previousLogicalTime = null;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event.sequence !== index) meshFail(code, 'event sequence discontinuity', `keyRegistry.events.${index}.sequence`);
    if (event.previousEventHash !== previousEventHash) meshFail(code, 'event previous-hash discontinuity', `keyRegistry.events.${index}.previousEventHash`);
    if (previousLogicalTime !== null && event.logicalTime <= previousLogicalTime) meshFail(code, 'event logical time must strictly increase', `keyRegistry.events.${index}.logicalTime`);
    previousLogicalTime = event.logicalTime;
    previousEventHash = event.eventHash;

    const node = nodes.get(event.verifierNodeId);
    if (event.eventType === 'register') {
      if (node) meshFail(code, 'node can be registered only once', `keyRegistry.events.${index}`);
      if (event.predecessorKeyFingerprint !== null) meshFail(code, 'register predecessor must be null', `keyRegistry.events.${index}.predecessorKeyFingerprint`);
      if (usedFingerprints.has(event.subjectKeyFingerprint)) meshFail(code, 'key fingerprint cannot be reused', `keyRegistry.events.${index}.subjectKeyFingerprint`);
      usedFingerprints.add(event.subjectKeyFingerprint);
      nodes.set(event.verifierNodeId, {
        operatorId: event.operatorId,
        state: 'active',
        currentFingerprint: event.subjectKeyFingerprint,
        keys: new Map([[event.subjectKeyFingerprint, {
          publicKey: event.subjectPublicKey,
          activeFromLogical: event.logicalTime,
          inactiveFromLogical: null,
          terminalStatus: null,
          activationEventHash: event.eventHash,
          deactivationEventHash: null,
        }]]),
      });
      continue;
    }

    if (!node) meshFail(code, 'rotate/revoke requires a registered node', `keyRegistry.events.${index}.verifierNodeId`);
    if (node.state !== 'active') meshFail(code, 'no events are allowed after node revocation', `keyRegistry.events.${index}`);
    if (node.operatorId !== event.operatorId) meshFail(code, 'operator continuity violation', `keyRegistry.events.${index}.operatorId`);

    if (event.eventType === 'rotate') {
      if (event.predecessorKeyFingerprint !== node.currentFingerprint) meshFail(code, 'rotation predecessor is not active', `keyRegistry.events.${index}.predecessorKeyFingerprint`);
      if (usedFingerprints.has(event.subjectKeyFingerprint)) meshFail(code, 'replacement key fingerprint cannot be reused', `keyRegistry.events.${index}.subjectKeyFingerprint`);
      const predecessor = node.keys.get(node.currentFingerprint);
      predecessor.inactiveFromLogical = event.logicalTime;
      predecessor.terminalStatus = 'superseded';
      predecessor.deactivationEventHash = event.eventHash;
      usedFingerprints.add(event.subjectKeyFingerprint);
      node.currentFingerprint = event.subjectKeyFingerprint;
      node.keys.set(event.subjectKeyFingerprint, {
        publicKey: event.subjectPublicKey,
        activeFromLogical: event.logicalTime,
        inactiveFromLogical: null,
        terminalStatus: null,
        activationEventHash: event.eventHash,
        deactivationEventHash: null,
      });
      continue;
    }

    if (event.predecessorKeyFingerprint !== null) meshFail(code, 'revoke predecessor must be null', `keyRegistry.events.${index}.predecessorKeyFingerprint`);
    if (event.subjectKeyFingerprint !== node.currentFingerprint) meshFail(code, 'revocation subject is not active', `keyRegistry.events.${index}.subjectKeyFingerprint`);
    const active = node.keys.get(node.currentFingerprint);
    if (event.subjectPublicKey !== active.publicKey) meshFail(code, 'revocation public key does not match active key', `keyRegistry.events.${index}.subjectPublicKey`);
    active.inactiveFromLogical = event.logicalTime;
    active.terminalStatus = 'revoked';
    active.deactivationEventHash = event.eventHash;
    node.state = 'revoked';
  }

  const expected = finalizeRegistry(identity, registryId, events);
  if (canonicalString(expected) !== canonicalString(registry)) meshFail(code, 'terminal registry commitment mismatch', 'keyRegistry.registryHash');
  return { identity, registryId, events, nodes, usedFingerprints, registryHash: expected.registryHash };
}

export function verifyVerificationKeyRegistry(registry) {
  try {
    const analysis = analyzeRegistry(registry);
    return immutableReport({
      ok: true,
      firstMismatch: null,
      registryId: analysis.registryId,
      registryHash: analysis.registryHash,
      eventCount: analysis.events.length,
    });
  } catch {
    return immutableReport({ ok: false, firstMismatch: 'keyRegistry', registryId: null, registryHash: null, eventCount: null });
  }
}

function requireRegistry(registry) {
  if (!verifyVerificationKeyRegistry(registry).ok) meshFail('E_KEY_REGISTRY_CHAIN', 'key registry must verify before append', 'keyRegistry');
  return analyzeRegistry(registry);
}

function normalizeAppendTime(value, registry, code, path) {
  const logicalTime = normalizeNonNegativeInteger(value, code, path);
  const last = registry.events.at(-1);
  if (last && logicalTime <= last.logicalTime) meshFail('E_KEY_REGISTRY_EVENT', 'logical time must strictly increase', path);
  return logicalTime;
}

function makeEvent(registry, input) {
  const previousEventHash = registry.events.length ? registry.events.at(-1).eventHash : null;
  const core = cloneAndFreeze({
    format: 'verification-key-event',
    schemaVersion: '1.0.0',
    registryId: registry.registryId,
    eventType: input.eventType,
    sequence: registry.events.length,
    logicalTime: input.logicalTime,
    verifierNodeId: input.verifierNodeId,
    operatorId: input.operatorId,
    subjectPublicKey: input.subjectPublicKey,
    subjectKeyFingerprint: input.subjectKeyFingerprint,
    predecessorKeyFingerprint: input.predecessorKeyFingerprint,
    reasonCode: input.reasonCode,
    previousEventHash,
  });
  return cloneAndFreeze({ ...core, eventHash: sha256Hex(core) });
}

function appendEvent(registry, event) {
  const identity = {
    networkId: registry.networkId,
    cryptoProfileId: registry.cryptoProfileId,
    registryVersion: registry.registryVersion,
  };
  return finalizeRegistry(identity, registry.registryId, [...registry.events, event]);
}

export function appendKeyRegistration(registry, input) {
  const analysis = requireRegistry(registry);
  const code = 'E_KEY_REGISTRY_SCHEMA';
  assertExactPlainObject(input, REGISTER_KEYS, code, 'keyRegistration');
  const logicalTime = normalizeAppendTime(input.logicalTime, registry, code, 'keyRegistration.logicalTime');
  const verifierNodeId = normalizeText(input.verifierNodeId, code, 'keyRegistration.verifierNodeId');
  const operatorId = normalizeText(input.operatorId, code, 'keyRegistration.operatorId');
  const key = normalizePublicKey(input.publicKey, code, 'keyRegistration.publicKey', { allowPem: true });
  const reasonCode = normalizeReasonCode(input.reasonCode, code, 'keyRegistration.reasonCode');
  if (analysis.nodes.has(verifierNodeId)) meshFail('E_KEY_REGISTRY_EVENT', 'verifier node is already registered', 'keyRegistration.verifierNodeId');
  if (analysis.usedFingerprints.has(key.fingerprint)) meshFail('E_KEY_REGISTRY_EVENT', 'key fingerprint is already used', 'keyRegistration.publicKey');
  return appendEvent(registry, makeEvent(registry, {
    eventType: 'register', logicalTime, verifierNodeId, operatorId,
    subjectPublicKey: key.publicKey, subjectKeyFingerprint: key.fingerprint,
    predecessorKeyFingerprint: null, reasonCode,
  }));
}

export function appendKeyRotation(registry, input) {
  const analysis = requireRegistry(registry);
  const code = 'E_KEY_REGISTRY_SCHEMA';
  assertExactPlainObject(input, ROTATE_KEYS, code, 'keyRotation');
  const logicalTime = normalizeAppendTime(input.logicalTime, registry, code, 'keyRotation.logicalTime');
  const verifierNodeId = normalizeText(input.verifierNodeId, code, 'keyRotation.verifierNodeId');
  const operatorId = normalizeText(input.operatorId, code, 'keyRotation.operatorId');
  const predecessorKeyFingerprint = normalizeHash(input.predecessorKeyFingerprint, code, 'keyRotation.predecessorKeyFingerprint');
  const key = normalizePublicKey(input.publicKey, code, 'keyRotation.publicKey', { allowPem: true });
  const reasonCode = normalizeReasonCode(input.reasonCode, code, 'keyRotation.reasonCode');
  const node = analysis.nodes.get(verifierNodeId);
  if (!node || node.state !== 'active') meshFail('E_KEY_REGISTRY_EVENT', 'rotation requires an active registered node', 'keyRotation.verifierNodeId');
  if (node.operatorId !== operatorId) meshFail('E_KEY_REGISTRY_EVENT', 'rotation operator does not match node history', 'keyRotation.operatorId');
  if (node.currentFingerprint !== predecessorKeyFingerprint) meshFail('E_KEY_REGISTRY_EVENT', 'rotation predecessor is not the active key', 'keyRotation.predecessorKeyFingerprint');
  if (analysis.usedFingerprints.has(key.fingerprint)) meshFail('E_KEY_REGISTRY_EVENT', 'replacement key fingerprint is already used', 'keyRotation.publicKey');
  return appendEvent(registry, makeEvent(registry, {
    eventType: 'rotate', logicalTime, verifierNodeId, operatorId,
    subjectPublicKey: key.publicKey, subjectKeyFingerprint: key.fingerprint,
    predecessorKeyFingerprint, reasonCode,
  }));
}

export function appendKeyRevocation(registry, input) {
  const analysis = requireRegistry(registry);
  const code = 'E_KEY_REGISTRY_SCHEMA';
  assertExactPlainObject(input, REVOKE_KEYS, code, 'keyRevocation');
  const logicalTime = normalizeAppendTime(input.logicalTime, registry, code, 'keyRevocation.logicalTime');
  const verifierNodeId = normalizeText(input.verifierNodeId, code, 'keyRevocation.verifierNodeId');
  const operatorId = normalizeText(input.operatorId, code, 'keyRevocation.operatorId');
  const publicKeyFingerprint = normalizeHash(input.publicKeyFingerprint, code, 'keyRevocation.publicKeyFingerprint');
  const reasonCode = normalizeReasonCode(input.reasonCode, code, 'keyRevocation.reasonCode');
  const node = analysis.nodes.get(verifierNodeId);
  if (!node || node.state !== 'active') meshFail('E_KEY_REGISTRY_EVENT', 'revocation requires an active registered node', 'keyRevocation.verifierNodeId');
  if (node.operatorId !== operatorId) meshFail('E_KEY_REGISTRY_EVENT', 'revocation operator does not match node history', 'keyRevocation.operatorId');
  if (node.currentFingerprint !== publicKeyFingerprint) meshFail('E_KEY_REGISTRY_EVENT', 'revocation key is not active', 'keyRevocation.publicKeyFingerprint');
  const active = node.keys.get(publicKeyFingerprint);
  return appendEvent(registry, makeEvent(registry, {
    eventType: 'revoke', logicalTime, verifierNodeId, operatorId,
    subjectPublicKey: active.publicKey, subjectKeyFingerprint: publicKeyFingerprint,
    predecessorKeyFingerprint: null, reasonCode,
  }));
}

function statusCore(registry, query, status, keyRecord = null) {
  return cloneAndFreeze({
    format: 'verification-key-status',
    schemaVersion: '1.0.0',
    registryId: registry.registryId,
    registryHash: registry.registryHash,
    ...query,
    status,
    activeFromLogical: keyRecord?.activeFromLogical ?? null,
    inactiveFromLogical: keyRecord?.inactiveFromLogical ?? null,
    activationEventHash: keyRecord?.activationEventHash ?? null,
    deactivationEventHash: keyRecord?.deactivationEventHash ?? null,
    identityVerified: false,
    approvalAuthority: 'none',
  });
}

export function resolveVerificationKeyStatus(registry, input) {
  const analysis = requireRegistry(registry);
  const code = 'E_KEY_STATUS_QUERY';
  assertExactPlainObject(input, QUERY_KEYS, code, 'keyStatusQuery');
  const query = cloneAndFreeze({
    verifierNodeId: normalizeText(input.verifierNodeId, code, 'keyStatusQuery.verifierNodeId'),
    operatorId: normalizeText(input.operatorId, code, 'keyStatusQuery.operatorId'),
    publicKeyFingerprint: normalizeHash(input.publicKeyFingerprint, code, 'keyStatusQuery.publicKeyFingerprint'),
    atLogicalTime: normalizeNonNegativeInteger(input.atLogicalTime, code, 'keyStatusQuery.atLogicalTime'),
  });
  const node = analysis.nodes.get(query.verifierNodeId);
  let status = 'unknown-key';
  let keyRecord = null;
  if (node) {
    if (node.operatorId !== query.operatorId) {
      status = 'identity-mismatch';
    } else {
      keyRecord = node.keys.get(query.publicKeyFingerprint) ?? null;
      if (keyRecord) {
        if (query.atLogicalTime < keyRecord.activeFromLogical) status = 'not-yet-active';
        else if (keyRecord.inactiveFromLogical === null || query.atLogicalTime < keyRecord.inactiveFromLogical) status = 'active';
        else status = keyRecord.terminalStatus;
      }
    }
  }
  const core = statusCore(registry, query, status, keyRecord);
  return cloneAndFreeze({ ...core, statusHash: sha256Hex(core) });
}
